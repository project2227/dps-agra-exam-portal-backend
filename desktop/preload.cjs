'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const listen = (name, fn) => {
  const callback = (_, v) => fn(v);
  ipcRenderer.on(name, callback);
  return () => ipcRenderer.removeListener(name, callback);
};
contextBridge.exposeInMainWorld(
  'plinthDesktop',
  Object.freeze({
    sharingState: (v) =>
      ipcRenderer.send('plinth:sharing-state', {
        screen: v?.screen === true,
        webcam: v?.webcam === true,
        connected: v?.connected === true,
      }),
    onActiveWindow: (fn) => listen('plinth:active-window', fn),
    onPause: (fn) => listen('plinth:pause', fn),
  }),
);
