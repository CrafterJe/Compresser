const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

// Inicializar remote module para compatibilidad
let remoteMain;
try {
  remoteMain = require('@electron/remote/main');
  remoteMain.initialize();
  console.log('✅ @electron/remote inicializado');
} catch (error) {
  console.log('⚠️ @electron/remote no disponible:', error.message);
  console.log('💡 Instala con: npm install @electron/remote');
}

let ventanaPrincipal;

function crearVentanaPrincipal() {
  ventanaPrincipal = new BrowserWindow({
    width: 850,
    height: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      // Preload script habilitado
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Habilitar remote module para esta ventana
  if (remoteMain) {
    try {
      remoteMain.enable(ventanaPrincipal.webContents);
      console.log('✅ Remote module habilitado para la ventana');
    } catch (error) {
      console.log('⚠️ Error habilitando remote:', error.message);
    }
  }

  ventanaPrincipal.loadFile(path.join(__dirname, 'frontend', 'views', 'home.html'));
  
  // Opcional: Abrir DevTools en desarrollo
  // ventanaPrincipal.webContents.openDevTools();
}

// HANDLERS IPC PARA DIALOGS (método moderno y seguro)
ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    console.log('📂 Abriendo dialog con opciones:', options);
    const result = await dialog.showOpenDialog(ventanaPrincipal, {
      title: 'Seleccionar carpeta de destino',
      properties: ['openDirectory'],
      ...options
    });
    
    console.log('📂 Resultado del dialog:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en show-open-dialog:', error);
    return { 
      canceled: true, 
      error: error.message,
      filePaths: []
    };
  }
});

// Handler para obtener rutas del sistema
ipcMain.handle('get-system-path', async (event, pathName) => {
  try {
    const { homedir } = require('os');
    const systemPaths = {
      home: homedir(),
      downloads: path.join(homedir(), 'Downloads'),
      desktop: path.join(homedir(), 'Desktop'),
      documents: path.join(homedir(), 'Documents'),
      // Rutas específicas de Windows
      downloadsEs: path.join(homedir(), 'Descargas'),
      desktopEs: path.join(homedir(), 'Escritorio'),
      oneDriveDesktop: path.join(homedir(), 'OneDrive', 'Desktop'),
      oneDriveDesktopEs: path.join(homedir(), 'OneDrive', 'Escritorio')
    };
    
    return systemPaths[pathName] || systemPaths.downloads;
  } catch (error) {
    console.error('Error obteniendo ruta del sistema:', error);
    return require('os').homedir();
  }
});

// Handler para verificar si un directorio existe
ipcMain.handle('directory-exists', async (event, dirPath) => {
  try {
    const fs = require('fs');
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
});

// Handler para obtener información del usuario
ipcMain.handle('get-user-info', async () => {
  try {
    const os = require('os');
    return {
      username: os.userInfo().username,
      homedir: os.homedir(),
      platform: os.platform(),
      arch: os.arch()
    };
  } catch (error) {
    console.error('Error obteniendo info del usuario:', error);
    return { username: 'unknown', homedir: '', platform: 'unknown' };
  }
});

// Eventos de la aplicación
app.whenReady().then(() => {
  crearVentanaPrincipal();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentanaPrincipal();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

// Log de inicio
app.on('ready', () => {
  console.log('🚀 Aplicación iniciada correctamente');
  console.log('📁 Directorio de trabajo:', __dirname);
  console.log('🖥️ Plataforma:', process.platform);
  console.log('⚡ Versión de Electron:', process.versions.electron);
  console.log('🟢 Versión de Node:', process.versions.node);
});