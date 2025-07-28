const { ipcRenderer } = require('electron');

// Como contextIsolation está en false, podemos usar window directamente
window.electronAPI = {
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  getSystemPath: (pathName) => ipcRenderer.invoke('get-system-path', pathName),
  directoryExists: (dirPath) => ipcRenderer.invoke('directory-exists', dirPath),
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),
  getPythonPaths: () => ipcRenderer.invoke('get-python-paths'),
  debugPaths: () => ipcRenderer.invoke('debug-paths'),
  
  // ✅ AGREGADO: Handler para compresión PDF
  compressPDF: (options) => ipcRenderer.invoke('compress-pdf', options),
  
  // ✅ AGREGADO: Test de Python
  testPython: () => ipcRenderer.invoke('test-python')
};

// También exponer require para compatibilidad
window.nodeRequire = require;

// Función de debug global para la consola
window.debugPython = async function() {
  const debugInfo = await window.electronAPI.debugPaths();
  const pythonInfo = await window.electronAPI.getPythonPaths();
  
  console.log('🔍 INFORMACIÓN DE DEBUG:');
  console.table(debugInfo);
  console.log('🐍 INFORMACIÓN DE PYTHON:');
  console.log(pythonInfo);
  
  return { debugInfo, pythonInfo };
};

console.log('🔧 Preload script cargado correctamente (sin contextBridge)');