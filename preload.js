const { contextBridge, ipcRenderer } = require('electron');

const api = {
  onStatus: (callback) => ipcRenderer.on('status', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, val) => callback(val)),
  openLogs: () => {
    ipcRenderer.send('open-logs-window');
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  }
};

// Expose to window
try {
  contextBridge.exposeInMainWorld('brickcode', api);
} catch (e) {
  window.brickcode = api;
}

// Global window event listeners and keyboard shortcut
window.addEventListener('DOMContentLoaded', () => {
  // Global shortcut: Ctrl+Shift+L or Alt+L
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') ||
        (e.altKey && e.key.toLowerCase() === 'l')) {
      e.preventDefault();
      ipcRenderer.send('open-logs-window');
    }
  });

  // Custom DOM event fallback
  window.addEventListener('open-logs-request', () => {
    ipcRenderer.send('open-logs-window');
  });

  window.addEventListener('open-external-request', (e) => {
    if (e.detail) ipcRenderer.send('open-external', e.detail);
  });
});
