'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld(
  'plinthBadge',
  Object.freeze({
    pause: () => ipcRenderer.send('plinth:badge-pause'),
    onState: (fn) => ipcRenderer.on('plinth:badge-state', (_, v) => fn(v)),
  }),
);
