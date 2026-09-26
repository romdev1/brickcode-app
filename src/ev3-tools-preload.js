const { contextBridge, ipcRenderer } = require('electron');

const api = {
  getPorts: () => ipcRenderer.invoke('ev3-get-ports'),
  playTone: (portName) => ipcRenderer.invoke('ev3-play-tone', portName),
  readBattery: (portName) => ipcRenderer.invoke('ev3-read-battery', portName),
  openLogs: () => ipcRenderer.send('open-logs-window'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  closeWindow: () => ipcRenderer.send('close-ev3-tools')
};

try {
  contextBridge.exposeInMainWorld('ev3tools', api);
} catch (e) {
  window.ev3tools = api;
}
