const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serialPicker', {
  onPorts: (callback) => ipcRenderer.on('ports-list', (_, ports) => callback(ports)),
  selectPort: (portId) => ipcRenderer.send('serial-port-selected', portId),
  cancel: () => ipcRenderer.send('serial-port-cancelled'),
  refreshPorts: () => ipcRenderer.send('refresh-serial-ports')
});
