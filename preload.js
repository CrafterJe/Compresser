const { ipcRenderer } = require('electron');

// Como contextIsolation está en false, podemos usar window directamente
window.electronAPI = {
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  getSystemPath: (pathName) => ipcRenderer.invoke('get-system-path', pathName),
  directoryExists: (dirPath) => ipcRenderer.invoke('directory-exists', dirPath),
  getUserInfo: () => ipcRenderer.invoke('get-user-info')
};

// También exponer require para compatibilidad
window.nodeRequire = require;

console.log('🔧 Preload script cargado correctamente (sin contextBridge)');