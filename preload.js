const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('brickcode', {
  onStatus: (callback) => ipcRenderer.on('status', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, val) => callback(val))
});
