'use strict';
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  desktopCapturer,
  screen,
  nativeImage,
  dialog,
} = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs'),
  path = require('node:path');
const {
  tenantSite,
  permitted,
  captureAllowed,
  badgeText,
} = require('./security.cjs');
const { focusedWindow } = require('./sensor.cjs');
const config = require('./build-config.json');
let main,
  badge,
  tray,
  site,
  quitting = false,
  state = { screen: false, webcam: false, connected: false },
  name = 'Plinth Workplace',
  sensorTimer;
const trusted = (event) =>
  !!main &&
  event.sender === main.webContents &&
  site &&
  permitted(event.senderFrame.url, site);
async function permit(endpoint = 'capture-permit') {
  if (!site || !main) return { allowed: false };
  try {
    const response = await main.webContents.session.fetch(
      site.home + '/api/workplace/' + endpoint,
      { credentials: 'include', redirect: 'error' },
    );
    return response.ok ? await response.json() : { allowed: false };
  } catch {
    return { allowed: false };
  }
}
function updateBadge() {
  if (state.screen) {
    if (!badge || badge.isDestroyed()) {
      const bounds = screen.getPrimaryDisplay().workArea;
      badge = new BrowserWindow({
        width: 390,
        height: 72,
        x: bounds.x + bounds.width - 410,
        y: bounds.y + 20,
        frame: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
          preload: path.join(__dirname, 'badge-preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      badge.setAlwaysOnTop(true, 'screen-saver');
      badge.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      badge.on('close', (event) => {
        if (state.screen && !quitting) event.preventDefault();
      });
      badge.on('hide', () => {
        if (state.screen && !quitting) badge.showInactive();
      });
      badge.loadFile('badge.html');
      badge.webContents.once('did-finish-load', () =>
        badge.webContents.send('plinth:badge-state', {
          text: badgeText(state),
          name,
        }),
      );
    }
    badge.showInactive();
    badge.webContents.send('plinth:badge-state', {
      text: badgeText(state),
      name,
    });
  } else if (badge && !badge.isDestroyed()) {
    badge.destroy();
    badge = null;
  }
  const status = state.screen
    ? 'Sharing'
    : state.connected
      ? 'Paused'
      : 'Offline';
  tray?.setToolTip(name + ' · ' + status);
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: name + ' · ' + status, enabled: false },
      {
        label: 'Open workspace',
        click: () => {
          main.show();
          main.focus();
        },
      },
      {
        label: 'Pause sharing',
        enabled: state.screen,
        click: () => main.webContents.send('plinth:pause'),
      },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}
async function openSite(value) {
  site = tenantSite(value, app.isPackaged ? config : undefined);
  fs.writeFileSync(
    path.join(app.getPath('userData'), 'site.json'),
    JSON.stringify({ url: site.home }),
    { mode: 0o600 },
  );
  main?.destroy();
  main = new BrowserWindow({
    width: 1160,
    height: 820,
    minWidth: 360,
    minHeight: 560,
    webPreferences: {
      partition: site.partition,
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });
  main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  main.webContents.on('will-navigate', (event, url) => {
    if (!permitted(url, site)) event.preventDefault();
  });
  main.webContents.on('will-frame-navigate', (event) => {
    if (
      !permitted(event.url, site) &&
      !event.url.startsWith('blob:' + site.origin + '/')
    )
      event.preventDefault();
  });
  main.webContents.on('render-process-gone', () => {
    state = { screen: false, webcam: false, connected: false };
    updateBadge();
  });
  main.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      main.hide();
    }
  });
  const session = main.webContents.session;
  session.setPermissionCheckHandler(
    (contents, permission, origin) =>
      contents === main.webContents &&
      permitted(contents.getURL(), site) &&
      permission === 'display-capture',
  );
  session.setPermissionRequestHandler(
    async (contents, permission, callback, details) => {
      const valid =
        contents === main.webContents && permitted(contents.getURL(), site);
      if (
        !valid ||
        permission !== 'media' ||
        !state.screen ||
        details.mediaTypes?.length !== 1 ||
        details.mediaTypes[0] !== 'video' ||
        !(await permit()).allowed
      )
        return callback(false);
      const choice = await dialog.showMessageBox(main, {
        type: 'question',
        buttons: ['Keep webcam off', 'Turn webcam on'],
        defaultId: 0,
        cancelId: 0,
        message: 'Share your webcam with your team manager?',
        detail:
          'Webcam sharing is optional. Turn it off from the web page at any time.',
      });
      callback(choice.response === 1);
    },
  );
  session.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        const p = await permit(),
          resume = await permit('desktop-permit');
        if (
          !request.frame ||
          request.frame !== request.frame.top ||
          !request.videoRequested ||
          request.audioRequested ||
          !captureAllowed({
            site,
            url: request.frame.url,
            userGesture: request.userGesture,
            resumeAllowed: resume.allowed,
            permit: p,
          })
        )
          return callback({});
        name = p.name || name;
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        const primary = screen.getPrimaryDisplay();
        const source =
          sources.find((s) => s.display_id === String(primary.id)) ||
          sources[0];
        if (!source) return callback({});
        callback({ video: source });
        state.screen = true;
        state.webcam = false;
        updateBadge();
      } catch {
        callback({});
      }
    },
    { useSystemPicker: false },
  );
  await main.loadURL(site.home + '/sharing');
  try {
    const response = await session.fetch(site.home + '/api/site/public');
    const value = await response.json();
    name = value.tenant?.name || name;
    main.setTitle(name + ' · Plinth');
    if (value.tenant?.logoUrl) {
      const image = await session.fetch(
        site.origin + value.tenant.logoUrl.replace('/192', '/32'),
      );
      if (image.ok) {
        const icon = nativeImage.createFromBuffer(
          Buffer.from(await image.arrayBuffer()),
        );
        tray?.setImage(icon);
        main.setIcon(icon);
      }
    }
  } catch {}
  updateBadge();
}
ipcMain.handle('plinth:setup-site', async (event, url) => {
  if (
    !main ||
    event.sender !== main.webContents ||
    event.senderFrame.url !==
      new URL('file://' + path.join(__dirname, 'setup.html')).href
  )
    throw Error('Setup is unavailable.');
  return openSite(url);
});
ipcMain.on('plinth:sharing-state', (event, value) => {
  if (!trusted(event)) return;
  state = {
    screen: value?.screen === true,
    webcam: value?.screen === true && value?.webcam === true,
    connected: value?.connected === true,
  };
  updateBadge();
});
ipcMain.on('plinth:badge-pause', (event) => {
  if (badge && event.sender === badge.webContents)
    main.webContents.send('plinth:pause');
});
app.whenReady().then(async () => {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABa0lEQVRYhe2XwU7CQBCGiadCUsOdC4WLB2dJ9GEEDnrS1/BJfABPIjLTePAgu8SDylMIpj4DSc1QlFbQraW75cAmc+vu/+3M7Hb/UmnrRni5BxK7oOgOFE5B0UwoCrMEz43WwD4M/Q6v/ac2yEEDJI6zCuoDX1njd3GFH+bEF1mRGIjHe29d2semxWPxkigHSOxaFI9iRO04wMA6gMTbbwCh6N02AEicLDOwwVHLDKBoFs+AdoLjONooVyqh26iHtfPT8PChp10zd4B4VI9aWgijABy1i7NiAdymZw5ArPnm4Poq2ROuW2wG9k1mwNn2HqgeF3AKynwPNL35zo3fAyLFnB2A2JVApWxCSPE7zrsJE79jUDjNo6v/BSDpLQ7Qtw0gFN0sAYZ+xz4AniSe5WwarIlLel5xSRC5osB87TFoPfn1hPjXYMfCpsHkzlddUenH4HKMqM3vdn46b2xOJU6EpN685jpzWsT4BP09JbyYMYEnAAAAAElFTkSuQmCC',
  );
  tray = new Tray(icon);
  tray.on('double-click', () => {
    main.show();
    main.focus();
  });
  app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(app.getPath('userData'), 'site.json'), 'utf8'),
    );
    await openSite(config.url);
  } catch {
    main = new BrowserWindow({
      width: 720,
      height: 660,
      webPreferences: {
        preload: path.join(__dirname, 'setup-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    await main.loadFile('setup.html');
  }
  sensorTimer = setInterval(async () => {
    if (!state.screen || !main || main.isDestroyed()) return;
    try {
      if (!(await permit('desktop-permit')).allowed) {
        main.webContents.send('plinth:pause');
        return;
      }
      const value = await focusedWindow();
      if (value && state.screen)
        main.webContents.send('plinth:active-window', value);
    } catch {}
  }, 15000);
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.on('error', () => {});
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
  updateBadge();
});
app.on('before-quit', () => {
  quitting = true;
  clearInterval(sensorTimer);
  state.screen = false;
  badge?.destroy();
});
app.on('window-all-closed', () => {
  if (quitting) app.quit();
});
app.on('activate', () => main?.show());
