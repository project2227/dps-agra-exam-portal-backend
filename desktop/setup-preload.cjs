'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld(
  'plinthSetup',
  Object.freeze({
    site: (url) => ipcRenderer.invoke('plinth:setup-site', String(url)),
  }),
);
