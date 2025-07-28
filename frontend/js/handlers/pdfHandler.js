const path = require('path');
const fs = require('fs');
const os = require('os');

// Mapear nombres de carpetas según el idioma
const folderNames = {
  en: { downloads: 'Downloads', desktop: 'Desktop' },
  es: { downloads: 'Descargas', desktop: 'Escritorio' }
};

// Detectar idioma del sistema
const systemLanguage = os.platform() === 'win32' ? 'en' : 'es';
const localizedFolders = folderNames[systemLanguage] || folderNames.en;

module.exports = function () {
  const comprimirBtn = document.getElementById('comprimirBtn');
  const archivoInput = document.getElementById('pdfInput');
  const nivelCompresion = document.getElementById('nivelCompresion');
  const resultado = document.getElementById('resultado');
  const modoRadios = document.querySelectorAll('input[name="modo"]');
  const loading = document.getElementById('loading');
  const success = document.getElementById('success');

  // Carpeta donde se guardarán los archivos comprimidos
  let carpetaDestino = path.join(os.homedir(), localizedFolders.downloads);
  
  // Variable para controlar el estado del selector
  let selectorConfigurado = false;
  let dialogMethod = null;

  // Crear interfaz para seleccionar carpeta de destino
  const contenedorCarpeta = document.createElement('div');
  contenedorCarpeta.style.cssText = `
    margin: 15px 0;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #f9f9f9;
  `;
  
  const labelCarpeta = document.createElement('label');
  labelCarpeta.innerHTML = '<strong>Guardar archivos comprimidos en:</strong>';
  
  let btnCarpeta = document.createElement('button');
  btnCarpeta.textContent = `📁 ${carpetaDestino}`;
  btnCarpeta.className = 'btn-carpeta';
  btnCarpeta.type = 'button';
  btnCarpeta.style.cssText = `
    background-color: #2196F3;
    color: white;
    border: none;
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    width: 100%;
    text-align: left;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;

  contenedorCarpeta.appendChild(labelCarpeta);
  contenedorCarpeta.appendChild(document.createElement('br'));
  contenedorCarpeta.appendChild(btnCarpeta);

  if (nivelCompresion && nivelCompresion.parentNode) {
    nivelCompresion.parentNode.insertBefore(contenedorCarpeta, nivelCompresion.nextSibling);
  }

  // FUNCIÓN PARA CONFIGURAR EL SELECTOR
  async function configurarSelector() {
    if (selectorConfigurado) {
      console.log('🛑 Selector ya configurado, saltando...');
      return;
    }

    console.log('🔧 Configurando selector de carpetas...');

    // Verificar si tenemos acceso a electronAPI
    if (window.electronAPI && window.electronAPI.showOpenDialog) {
      // MÉTODO IPC MODERNO
      btnCarpeta.onclick = async function() {
        try {
          btnCarpeta.disabled = true;
          console.log('📂 Abriendo dialog via IPC...');
          
          const result = await window.electronAPI.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Seleccionar carpeta de destino',
            defaultPath: carpetaDestino
          });
          
          if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            carpetaDestino = result.filePaths[0];
            btnCarpeta.textContent = `📁 ${carpetaDestino}`;
            console.log('✅ Carpeta seleccionada via IPC:', carpetaDestino);
          }
        } catch (error) {
          console.error('❌ Error con IPC:', error);
          resultado.innerHTML += `<p style="color:red">❌ Error: ${error.message}</p>`;
        } finally {
          btnCarpeta.disabled = false;
        }
      };
      
      dialogMethod = 'electronAPI';
      selectorConfigurado = true;
      console.log('✅ Configurado con electronAPI');
      return;
    }

    // MÉTODO IPC TRADICIONAL
    if (await intentarIPC()) {
      dialogMethod = 'ipc';
      selectorConfigurado = true;
      console.log('✅ Configurado con IPC');
      return;
    }

    // MÉTODO REMOTE
    if (await intentarRemote()) {
      dialogMethod = 'remote';
      selectorConfigurado = true;
      console.log('✅ Configurado con Remote');
      return;
    }

    // MÉTODO WEB (FALLBACK)
    configurarSelectorWeb();
    dialogMethod = 'web';
    selectorConfigurado = true;
    console.log('✅ Configurado con Web (limitado)');
  }

  // MÉTODO IPC TRADICIONAL
  async function intentarIPC() {
    try {
      if (!window.require) return false;
      
      const electron = window.require('electron');
      if (!electron.ipcRenderer) return false;

      const { ipcRenderer } = electron;
      
      console.log('🔧 IPC disponible, configurando...');

      btnCarpeta.onclick = async function() {
        try {
          btnCarpeta.disabled = true;
          console.log('📂 Abriendo dialog via IPC...');
          
          const result = await ipcRenderer.invoke('show-open-dialog', {
            properties: ['openDirectory'],
            title: 'Seleccionar carpeta de destino',
            defaultPath: carpetaDestino
          });
          
          if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            carpetaDestino = result.filePaths[0];
            btnCarpeta.textContent = `📁 ${carpetaDestino}`;
            console.log('✅ Carpeta seleccionada via IPC:', carpetaDestino);
          }
        } catch (error) {
          console.error('❌ Error con IPC:', error);
          resultado.innerHTML += `<p style="color:red">❌ Error: ${error.message}</p>`;
        } finally {
          btnCarpeta.disabled = false;
        }
      };

      return true;
    } catch (error) {
      console.log('❌ IPC no disponible:', error.message);
      return false;
    }
  }

  // MÉTODO REMOTE
  async function intentarRemote() {
    try {
      if (!window.require) return false;
      
      let dialog = null;
      const electron = window.require('electron');
      
      try {
        dialog = window.require('@electron/remote').dialog;
        console.log('🔧 @electron/remote disponible');
      } catch (e) {
        if (electron.remote) {
          dialog = electron.remote.dialog;
          console.log('🔧 Remote tradicional disponible');
        }
      }

      if (!dialog || !dialog.showOpenDialog) return false;

      btnCarpeta.onclick = async function() {
        try {
          btnCarpeta.disabled = true;
          console.log('📂 Abriendo dialog remote...');
          
          const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Seleccionar carpeta de destino',
            defaultPath: carpetaDestino
          });
          
          if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            carpetaDestino = result.filePaths[0];
            btnCarpeta.textContent = `📁 ${carpetaDestino}`;
            console.log('✅ Carpeta seleccionada con remote:', carpetaDestino);
          }
        } catch (error) {
          console.error('❌ Error con remote:', error);
          resultado.innerHTML += `<p style="color:red">❌ Error: ${error.message}</p>`;
        } finally {
          btnCarpeta.disabled = false;
        }
      };

      return true;
    } catch (error) {
      console.log('❌ Remote no disponible:', error.message);
      return false;
    }
  }

  // MÉTODO WEB (FALLBACK)
  function configurarSelectorWeb() {
    btnCarpeta.onclick = function() {
      const folderInput = document.createElement('input');
      folderInput.type = 'file';
      folderInput.webkitdirectory = true;
      folderInput.multiple = true;
      folderInput.style.display = 'none';
      
      folderInput.onchange = function(e) {
        if (e.target.files.length > 0) {
          const primerArchivo = e.target.files[0];
          
          if (primerArchivo.path) {
            const rutaCarpeta = path.dirname(primerArchivo.path);
            carpetaDestino = rutaCarpeta;
            btnCarpeta.textContent = `📁 ${rutaCarpeta}`;
            console.log('✅ Ruta completa:', rutaCarpeta);
          } else {
            const rutaRelativa = primerArchivo.webkitRelativePath;
            if (rutaRelativa) {
              const nombreCarpeta = rutaRelativa.split('/')[0];
              
              const posiblesRutas = [
                path.join(os.homedir(), 'OneDrive', 'Desktop', nombreCarpeta),
                path.join(os.homedir(), 'OneDrive', 'Escritorio', nombreCarpeta),
                path.join(os.homedir(), 'Desktop', nombreCarpeta),
                path.join(os.homedir(), 'Escritorio', nombreCarpeta)
              ];
              
              let rutaEncontrada = false;
              for (const rutaPosible of posiblesRutas) {
                if (fs.existsSync(rutaPosible)) {
                  carpetaDestino = rutaPosible;
                  btnCarpeta.textContent = `📁 ${rutaPosible}`;
                  console.log('✅ Ruta encontrada:', rutaPosible);
                  rutaEncontrada = true;
                  break;
                }
              }
              
              if (!rutaEncontrada) {
                carpetaDestino = path.join(os.homedir(), localizedFolders.downloads);
                btnCarpeta.textContent = `📁 ${carpetaDestino} (fallback)`;
                resultado.innerHTML += `<p style="color:orange">⚠️ Usando Downloads como destino</p>`;
              }
            }
          }
        }
        
        document.body.removeChild(folderInput);
      };
      
      document.body.appendChild(folderInput);
      folderInput.click();
    };
  }

  // Botones rápidos
  const btnDownloads = document.createElement('button');
  btnDownloads.textContent = '⬇️ Usar ' + localizedFolders.downloads;
  btnDownloads.type = 'button';
  btnDownloads.style.cssText = `
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 6px 10px;
    margin: 5px 5px 5px 0;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  `;
  
  btnDownloads.onclick = function() {
    carpetaDestino = path.join(os.homedir(), localizedFolders.downloads);
    btnCarpeta.textContent = `📁 ${carpetaDestino}`;
    console.log('📁 Cambiado a Downloads:', carpetaDestino);
  };

  const btnEscritorio = document.createElement('button');
  btnEscritorio.textContent = '🖥️ Usar ' + localizedFolders.desktop;
  btnEscritorio.type = 'button';
  btnEscritorio.style.cssText = btnDownloads.style.cssText.replace('#4CAF50', '#FF9800');
  
  btnEscritorio.onclick = function() {
    carpetaDestino = path.join(os.homedir(), localizedFolders.desktop);
    btnCarpeta.textContent = `📁 ${carpetaDestino}`;
    console.log('🖥️ Cambiado a Desktop:', carpetaDestino);
  };

  contenedorCarpeta.appendChild(btnDownloads);
  contenedorCarpeta.appendChild(btnEscritorio);

  // INICIALIZAR EL SELECTOR
  configurarSelector().catch(error => {
    console.error('❌ Error configurando selector:', error);
    configurarSelectorWeb();
    dialogMethod = 'web';
    selectorConfigurado = true;
  });

  // Cambiar entre subir uno o varios archivos
  if (modoRadios.length > 0 && archivoInput) {
    modoRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.value === 'varios') {
          archivoInput.setAttribute('multiple', true);
        } else {
          archivoInput.removeAttribute('multiple');
        }

        archivoInput.value = "";
        resultado.innerHTML = "";
        success.style.display = "none";
      });
    });
  }

  // Función para validar carpeta de destino
  async function validarCarpetaDestino() {
    return new Promise((resolve) => {
      fs.access(carpetaDestino, fs.constants.W_OK, (err) => {
        if (err) {
          console.error('❌ Carpeta no accesible:', carpetaDestino);
          carpetaDestino = path.join(os.homedir(), localizedFolders.downloads);
          btnCarpeta.textContent = `📁 ${carpetaDestino} (fallback)`;
          resultado.innerHTML += `<p style="color:orange">⚠️ Usando Downloads como alternativa</p>`;
        }
        resolve(carpetaDestino);
      });
    });
  }

  // Función para guardar archivo temporal
  async function guardarArchivoTemporal(file) {
    const tempDir = os.tmpdir();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const tempPath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const buffer = Buffer.from(e.target.result);
        fs.writeFile(tempPath, buffer, (err) => {
          if (err) reject(err);
          else resolve({ tempPath, originalName: file.name });
        });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Función para verificar Python - VERSIÓN CORREGIDA
  async function verificarPython() {
    try {
      // Usar electronAPI si está disponible
      if (window.electronAPI && window.electronAPI.getPythonPaths) {
        console.log('🔧 Usando electronAPI para verificar Python...');
        const pythonInfo = await window.electronAPI.getPythonPaths();
        console.log('🐍 Información de Python:', pythonInfo);

        if (!pythonInfo.found) {
          console.log('❌ Python no encontrado via electronAPI');
          mostrarErrorPython(pythonInfo);
          return null;
        }

        console.log('✅ Python encontrado via electronAPI:', pythonInfo.basePath);
        //resultado.innerHTML += `<p style="color:green; font-weight:bold;">✅ Python embebido encontrado en: ${pythonInfo.basePath}</p>`;
        return pythonInfo;
      }

      // Fallback manual para buscar Python
      console.log('🔧 Buscando Python manualmente...');
      const pythonInfo = await buscarPythonManual();
      
      if (!pythonInfo) {
        console.log('❌ Python no encontrado manualmente');
        mostrarErrorPythonManual();
        return null;
      }

      console.log('✅ Python encontrado manualmente:', pythonInfo.basePath);
      //resultado.innerHTML += `<p style="color:green; font-weight:bold;">✅ Python embebido encontrado en: ${pythonInfo.basePath}</p>`;
      return pythonInfo;

    } catch (error) {
      console.error('❌ Error verificando Python:', error);
      resultado.innerHTML += `<p style="color:red">❌ Error verificando Python: ${error.message}</p>`;
      return null;
    }
  }

  // Función para buscar Python manualmente
  async function buscarPythonManual() {
    const possiblePaths = [
      // Rutas relativas a la aplicación
      path.join(process.cwd(), 'python'),
      path.join(process.cwd(), 'resources', 'python'),
      path.join(__dirname, 'python'),
      path.join(__dirname, '..', 'python'),
      path.join(__dirname, '..', '..', 'python'),
      
      // Rutas en la carpeta de recursos
      path.join(process.resourcesPath || '', 'python'),
      path.join(process.resourcesPath || '', 'app', 'python'),
    ];

    for (const basePath of possiblePaths) {
      const pythonExe = path.join(basePath, 'python.exe');
      const script = path.join(basePath, 'compress.py');

      console.log(`🔍 Verificando: ${pythonExe}`);

      if (fs.existsSync(pythonExe) && fs.existsSync(script)) {
        return { basePath, pythonExe, script, found: true };
      }
    }

    return null;
  }

  // Función para mostrar error de Python (electronAPI)
  function mostrarErrorPython(pythonInfo) {
    if (pythonInfo.debug) {
      resultado.innerHTML += `
        <div style="color:red; margin:10px 0; padding:15px; border:1px solid red; border-radius:5px; background-color:#ffeaea;">
          <h4 style="margin-top:0;">❌ Python embebido no encontrado</h4>
          <p><strong>Rutas buscadas:</strong></p>
          <ul style="font-size:12px; margin:5px 0; max-height:150px; overflow-y:auto;">
            ${pythonInfo.debug.searchedPaths.map(p => `<li style="margin:2px 0; font-family:monospace;">${p}</li>`).join('')}
          </ul>
          <p><strong>Información del sistema:</strong></p>
          <ul style="font-size:12px; font-family:monospace;">
            <li><strong>Modo:</strong> ${pythonInfo.debug.isDev ? 'Desarrollo' : 'Producción'}</li>
            <li><strong>App Path:</strong> ${pythonInfo.debug.appPath}</li>
            <li><strong>Executable Dir:</strong> ${pythonInfo.debug.executableDir}</li>
          </ul>
          <p style="margin-top:10px;"><strong>💡 Solución:</strong> Asegúrate de que la carpeta 'python' con 'python.exe' y 'compress.py' esté en la ubicación correcta.</p>
        </div>
      `;
    }
  }

  // Función para mostrar error manual
  function mostrarErrorPythonManual() {
    resultado.innerHTML += `
      <div style="color:red; margin:10px 0; padding:15px; border:1px solid red; border-radius:5px; background-color:#ffeaea;">
        <h4 style="margin-top:0;">❌ Python embebido no encontrado</h4>
        <p>No se pudo encontrar Python embebido en las ubicaciones estándar.</p>
        <p><strong>💡 Solución:</strong></p>
        <ul>
          <li>Asegúrate de que la carpeta 'python' esté en la raíz del proyecto</li>
          <li>Verifica que contiene 'python.exe' y 'compress.py'</li>
          <li>Revisa que tienes los permisos correctos</li>
        </ul>
      </div>
    `;
  }

  // Función principal de compresión - VERSIÓN CORREGIDA
  if (comprimirBtn && archivoInput && nivelCompresion) {
    comprimirBtn.addEventListener('click', async () => {
      const archivos = archivoInput.files;
      const nivel = nivelCompresion.value;

      resultado.innerHTML = "";
      success.style.display = "none";

      if (!archivos.length) {
        resultado.textContent = "⚠️ Por favor selecciona al menos un archivo PDF.";
        return;
      }

      // Verificar Python antes de procesar
      const pythonInfo = await verificarPython();
      if (!pythonInfo) {
        return;
      }

      await validarCarpetaDestino();

      loading.style.display = "block";
      comprimirBtn.disabled = true;

      let completados = 0;
      let exitosos = 0;

      console.log(`🚀 Procesando ${archivos.length} archivos, guardando en: ${carpetaDestino}`);

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        
        try {
          console.log(`📄 [${i+1}/${archivos.length}] Procesando:`, archivo.name);
          
          const { tempPath, originalName } = await guardarArchivoTemporal(archivo);

          // USAR IPC PARA EJECUTAR PYTHON EN EL PROCESO PRINCIPAL
          if (window.electronAPI && window.electronAPI.compressPDF) {
            // Método moderno con electronAPI
            console.log('🔧 Usando electronAPI.compressPDF...');
            
            try {
              const result = await window.electronAPI.compressPDF({
                tipo: 'pdf',
                inputPath: tempPath,
                nivel: nivel,
                pythonInfo: pythonInfo
              });

              completados++;

              // Limpiar archivo temporal
              fs.unlink(tempPath, (unlinkErr) => {
                if (unlinkErr) console.log('⚠️ Error eliminando archivo temporal:', unlinkErr.message);
              });

              if (result.success) {
                // Mover archivo comprimido a destino final
                const nombreBase = originalName.replace(/\.pdf$/i, '');
                const nombreFinal = `${nombreBase}_comprimido.pdf`;
                const destinoFinal = path.join(carpetaDestino, nombreFinal);

                fs.copyFile(result.outputPath, destinoFinal, (copyErr) => {
                  if (copyErr) {
                    console.error(`❌ Error copiando archivo: ${copyErr.message}`);
                    resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error al guardar - ${copyErr.message}</p>`;
                  } else {
                    exitosos++;
                    resultado.innerHTML += `<p style="color:green">✅ ${archivo.name} → ${nombreFinal}</p>`;
                    console.log(`✅ Archivo guardado: ${destinoFinal}`);
                    
                    // Limpiar archivo temporal de Python
                    fs.unlink(result.outputPath, (unlinkErr) => {
                      if (unlinkErr) console.log('⚠️ Error eliminando archivo temporal de Python:', unlinkErr.message);
                    });
                  }

                  // Verificar si terminamos
                  if (completados === archivos.length) {
                    finalizarProcesamiento();
                  }
                });
              } else {
                console.error(`❌ Error en compresión: ${result.error}`);
                resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: ${result.error}</p>`;
                if (result.stderr) {
  resultado.innerHTML += `
    <pre style="background:#f4f4f4; color:#333; padding:10px; border:1px solid #ccc; max-height:200px; overflow:auto;">
${result.stderr}
    </pre>
  `;
}

                if (completados === archivos.length) {
                  finalizarProcesamiento();
                }
              }

            } catch (apiError) {
              completados++;
              console.error('❌ Error usando electronAPI:', apiError);
              resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error de API - ${apiError.message}</p>`;
              
              // Limpiar archivo temporal
              fs.unlink(tempPath, () => {});

              if (completados === archivos.length) {
                finalizarProcesamiento();
              }
            }

          } else {
            // Fallback: Intentar con IPC tradicional
            console.log('🔧 Fallback: Intentando IPC tradicional...');
            
            if (window.require) {
              const { ipcRenderer } = window.require('electron');
              
              if (ipcRenderer) {
                try {
                  const result = await ipcRenderer.invoke('compress-pdf', {
                    inputPath: tempPath,
                    nivel: nivel,
                    pythonInfo: pythonInfo
                  });

                  // Procesar resultado igual que arriba
                  completados++;
                  
                  // Limpiar archivo temporal
                  fs.unlink(tempPath, () => {});

                  if (result.success) {
                    const nombreBase = originalName.replace(/\.pdf$/i, '');
                    const nombreFinal = `${nombreBase}_comprimido.pdf`;
                    const destinoFinal = path.join(carpetaDestino, nombreFinal);

                    fs.copyFile(result.outputPath, destinoFinal, (copyErr) => {
                      if (!copyErr) {
                        exitosos++;
                        resultado.innerHTML += `<p style="color:green">✅ ${archivo.name} → ${nombreFinal}</p>`;
                        fs.unlink(result.outputPath, () => {});
                      } else {
                        resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error al guardar</p>`;
                      }

                      if (completados === archivos.length) {
                        finalizarProcesamiento();
                      }
                    });
                  } else {
                    resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: ${result.error}</p>`;
                    
                    if (completados === archivos.length) {
                      finalizarProcesamiento();
                    }
                  }

                } catch (ipcError) {
                  completados++;
                  console.error('❌ Error con IPC tradicional:', ipcError);
                  resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error IPC - ${ipcError.message}</p>`;
                  
                  fs.unlink(tempPath, () => {});

                  if (completados === archivos.length) {
                    finalizarProcesamiento();
                  }
                }
              } else {
                throw new Error('IPC no disponible');
              }
            } else {
              throw new Error('Require no disponible');
            }
          }

        } catch (error) {
          completados++;
          console.error('❌ Error en procesamiento general:', error);
          resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error de procesamiento - ${error.message}</p>`;
          
          if (completados === archivos.length) {
            finalizarProcesamiento();
          }
        }
      }

      // Función para finalizar el procesamiento
      function finalizarProcesamiento() {
        loading.style.display = "none";
        comprimirBtn.disabled = false;
        
        if (exitosos > 0) {
          success.style.display = "block";
          resultado.innerHTML += `<p style="color:blue; font-weight:bold; margin-top:15px;">📊 Resumen: ${exitosos}/${archivos.length} archivos procesados exitosamente</p>`;
          console.log(`📊 Procesamiento completado: ${exitosos}/${archivos.length} archivos`);
        } else {
          resultado.innerHTML += `<p style="color:red; font-weight:bold; margin-top:15px;">❌ No se pudo procesar ningún archivo</p>`;
        }
      }
    });
  }

  // Función de debug para la consola
  window.debugPythonInfo = async function() {
    console.log('🔍 EJECUTANDO DEBUG DE PYTHON...');
    
    try {
      if (window.electronAPI && window.electronAPI.debugPaths) {
        const debugInfo = await window.electronAPI.debugPaths();
        const pythonInfo = await window.electronAPI.getPythonPaths();
        
        console.log('🖥️ INFORMACIÓN DEL SISTEMA:');
        console.table(debugInfo);
        
        console.log('🐍 INFORMACIÓN DE PYTHON:');
        console.log(pythonInfo);
        
        return { debugInfo, pythonInfo };
      } else {
        console.log('⚠️ electronAPI no disponible, ejecutando debug manual...');
        const pythonInfo = await buscarPythonManual();
        
        console.log('🐍 INFORMACIÓN DE PYTHON (MANUAL):');
        console.log(pythonInfo);
        
        return { pythonInfo };
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando debug:', error);
      return { error: error.message };
    }
  };
};