const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs'); // Agregado para verificar archivos

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
app.setPath('userData', path.join(app.getPath('temp'), 'CompresorElectronApp'));

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
  ventanaPrincipal.webContents.openDevTools();
}
// ===== HANDLERS IPC COMPLETOS =====

// Handler para dialogs
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

// Handler para verificar directorios
ipcMain.handle('directory-exists', async (event, dirPath) => {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
});

// Handler para información del usuario
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

// ===== HANDLER PARA OBTENER RUTAS DE PYTHON =====
ipcMain.handle('get-python-paths', async () => {
  try {
    console.log('🔍 Buscando Python embebido...');
    
    const isDev = !app.isPackaged;
    const appPath = app.getAppPath();
    const executableDir = path.dirname(app.getPath('exe'));
    
    console.log('📍 Información de rutas:');
    console.log('  - isDev:', isDev);
    console.log('  - appPath:', appPath);
    console.log('  - executableDir:', executableDir);
    console.log('  - process.cwd():', process.cwd());
    console.log('  - __dirname:', __dirname);
    
    const possiblePaths = [];
    
    if (isDev) {
      possiblePaths.push(
        path.join(process.cwd(), 'python'),
        path.join(appPath, 'python'),
        path.join(appPath, '..', 'python'),
        path.join(__dirname, '..', 'python'),
        path.join(__dirname, 'python'),
        path.join(process.cwd(), '..', 'python'),
        path.resolve(process.cwd(), 'python')
      );
    } else {
      possiblePaths.push(
        path.join(executableDir, 'python'),
        path.join(executableDir, 'resources', 'python'),
        path.join(executableDir, 'resources', 'app', 'python'),
        ...(process.resourcesPath ? [
          path.join(process.resourcesPath, 'python'),
          path.join(process.resourcesPath, '..', 'python')
        ] : []),
        path.join(appPath, 'python'),
        path.join(appPath, '..', 'python'),
        path.join(path.dirname(executableDir), 'python'),
        path.join(executableDir, '..', 'python')
      );
    }
    
    console.log('🔎 Rutas a revisar:');
    possiblePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    
    for (const basePath of possiblePaths) {
      const pythonExe = path.join(basePath, 'python.exe');
      const scriptPath = path.join(basePath, 'compress.py');
      
      console.log(`🔍 Verificando: ${pythonExe}`);
      
      if (fs.existsSync(pythonExe) && fs.existsSync(scriptPath)) {
        console.log('✅ Python encontrado en:', basePath);
        
        try {
          const stats = fs.statSync(pythonExe);
          if (stats.isFile()) {
            return {
              pythonExe: pythonExe,
              script: scriptPath,
              basePath: basePath,
              found: true,
              isDev: isDev
            };
          }
        } catch (statError) {
          console.log(`⚠️ Error verificando ejecutable: ${statError.message}`);
          continue;
        }
      } else {
        if (!fs.existsSync(pythonExe)) {
          console.log(`❌ No encontrado: ${pythonExe}`);
        }
        if (!fs.existsSync(scriptPath)) {
          console.log(`❌ No encontrado: ${scriptPath}`);
        }
      }
    }
    
    console.log('❌ Python no encontrado en ninguna ubicación');
    
    return {
      pythonExe: '',
      script: '',
      basePath: '',
      found: false,
      debug: {
        isDev,
        appPath,
        executableDir,
        cwd: process.cwd(),
        searchedPaths: possiblePaths,
        resourcesPath: process.resourcesPath || 'N/A',
        __dirname: __dirname
      }
    };
    
  } catch (error) {
    console.error('❌ Error buscando Python:', error);
    return {
      pythonExe: '',
      script: '',
      basePath: '',
      found: false,
      error: error.message
    };
  }
});

// Handler para debug
ipcMain.handle('debug-paths', async () => {
  return {
    isDev: !app.isPackaged,
    appPath: app.getAppPath(),
    executableDir: path.dirname(app.getPath('exe')),
    cwd: process.cwd(),
    resourcesPath: process.resourcesPath,
    __dirname: __dirname,
    argv: process.argv,
    execPath: process.execPath
  };
});

// ===== HANDLER PARA COMPRESIÓN PDF =====
ipcMain.handle('compress-pdf', async (event, options) => {
  const { spawn } = require('child_process');
  const os = require('os');
  
  try {
    console.log('🐍 Iniciando compresión PDF con opciones:', options);
    
    const { inputPath, nivel, pythonInfo, tipo } = options;
    
    if (!pythonInfo || !pythonInfo.found) {
      console.error('❌ Python no encontrado en pythonInfo');
      return {
        success: false,
        error: 'Python embebido no encontrado'
      };
    }
    
    // Validaciones
    if (!fs.existsSync(pythonInfo.pythonExe)) {
      return {
        success: false,
        error: `Python executable no encontrado: ${pythonInfo.pythonExe}`
      };
    }
    
    if (!fs.existsSync(pythonInfo.script)) {
      return {
        success: false,
        error: `Script Python no encontrado: ${pythonInfo.script}`
      };
    }
    
    if (!fs.existsSync(inputPath)) {
      return {
        success: false,
        error: `Archivo de entrada no encontrado: ${inputPath}`
      };
    }
    
        console.log('📄 Ejecutando compresión:');
    console.log('  - Input:', inputPath);
    console.log('  - Nivel:', nivel);
    console.log('  - Python:', pythonInfo.pythonExe);
    console.log('  - Script:', pythonInfo.script);

    const args = [
      pythonInfo.script,
      '--tipo', tipo,
      '--ruta', inputPath,
      '--nivel', nivel
    ];


    const spawnOptions = {
      cwd: pythonInfo.basePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    };
    
    return new Promise((resolve) => {
      let pythonProcess;
      
      try {
        pythonProcess = spawn(pythonInfo.pythonExe, args, spawnOptions);
        console.log('✅ Proceso Python iniciado con PID:', pythonProcess.pid);
      } catch (spawnError) {
        console.error('❌ Error al crear proceso Python:', spawnError);
        resolve({
          success: false,
          error: `Error al crear proceso Python: ${spawnError.message}`
        });
        return;
      }
      
      let stdout = '';
      let stderr = '';
      let hasResolved = false;
      
      const resolveOnce = (result) => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(result);
        }
      };
      
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('🐍 Python stdout:', output.trim());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.log('🐍 Python stderr:', output.trim());
      });
      
            pythonProcess.on('close', (code) => {
        console.log(`🐍 Python proceso terminado con código: ${code}`);
        
        if (code === 0) {
          // extrae la ruta de salida del stdout
          const match = stdout.trim().match(/:\s*(.+\.pdf)$/i);
          const generated = match && match[1];
          if (generated && fs.existsSync(generated)) {
            resolveOnce({
              success:   true,
              outputPath: generated,
              stdout, stderr
            });
          } else {
            resolveOnce({
              success: false,
              error:   'No pude extraer la ruta de salida del script',
              stdout, stderr
            });
          }
        } else {
          resolveOnce({
            success: false,
            error:   `Python terminó con código de error ${code}`,
            stdout, stderr
          });
        }
      });

      
      pythonProcess.on('error', (error) => {
        console.error('❌ Error ejecutando Python:', error);
        resolveOnce({
          success: false,
          error: `Error ejecutando Python: ${error.message}`,
          details: error
        });
      });
      
      setTimeout(() => {
        if (!hasResolved && pythonProcess && !pythonProcess.killed) {
          pythonProcess.kill();
          resolveOnce({
            success: false,
            error: 'Timeout: El proceso tardó demasiado'
          });
        }
      }, 60000);
    });
    
  } catch (error) {
    console.error('❌ Error general en compress-pdf handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler de test
ipcMain.handle('test-python', async () => {
  try {
    console.log('🧪 Ejecutando test de Python...');
    
    // Obtener información de Python usando el handler existente
    const pythonInfo = await new Promise((resolve) => {
      const handler = ipcMain.listeners('get-python-paths')[0];
      if (handler) {
        handler({}).then(resolve).catch(() => resolve({ found: false }));
      } else {
        resolve({ found: false });
      }
    });
    
    if (!pythonInfo.found) {
      return { success: false, error: 'Python no encontrado' };
    }
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const testProcess = spawn(pythonInfo.pythonExe, ['--version'], {
        cwd: pythonInfo.basePath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          exitCode: code
        });
      });
      
      testProcess.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
      
      setTimeout(() => {
        testProcess.kill();
        resolve({ success: false, error: 'Test timeout' });
      }, 10000);
    });
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});
// Eventos de la aplicación
app.whenReady().then(() => {
  console.log('🔧 Handlers IPC registrados:');
  console.log(ipcMain.eventNames());

  setTimeout(() => {
    console.log('🔧 Handlers después de 2 segundos:');
    console.log(ipcMain.eventNames());
  }, 2000);

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
  
  // Log adicional para debug de Python
  console.log('🐍 Información de empaquetado:');
  console.log('  - app.isPackaged:', app.isPackaged);
  console.log('  - app.getAppPath():', app.getAppPath());
  console.log('  - process.resourcesPath:', process.resourcesPath || 'N/A');
});