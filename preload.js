// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApps: () => ipcRenderer.invoke('get-apps'),
  uninstallApp: (id) => ipcRenderer.invoke('uninstall-app', id),
  upgradeApp: (id) => ipcRenderer.invoke('upgrade-app', id),
  startUpgrade: (id) => ipcRenderer.invoke('start-upgrade', id),
  startUninstall: (id) => ipcRenderer.invoke('start-uninstall', id),
  searchPackages: (query) => ipcRenderer.invoke('search-packages', query),
  installPackage: (pkg) => ipcRenderer.invoke('install-package', pkg),
  cancelOperation: (opId) => ipcRenderer.invoke('cancel-operation', opId),
  onOperationUpdate: (callback) => ipcRenderer.on('operation-update', (_event, payload) => callback(payload)),
  onOperationLog: (callback) => ipcRenderer.on('operation-log', (_event, payload) => callback(payload)),
  windowControl: (action) => ipcRenderer.send('window-control', action)
});
