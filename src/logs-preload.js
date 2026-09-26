const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('logsApi', {
  getInitialLogs: () => ipcRenderer.invoke('get-initial-logs'),
  onLogEntry: (callback) => ipcRenderer.on('log-entry', (_, entry) => callback(entry)),
  clearLogs: () => ipcRenderer.send('clear-logs'),
  openLogFile: () => ipcRenderer.send('open-log-file'),
  openLogsFolder: () => ipcRenderer.send('open-logs-folder')
});
