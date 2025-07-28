const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// HABILITAR REMOTE MODULE SI NO ESTÁ HABILITADO
if (typeof require !== 'undefined') {
  try {
    // Intentar habilitar remote si existe
    if (require('electron').remote) {
      console.log('Remote module ya disponible');
    } else {
      // Para versiones nuevas de Electron, usar @electron/remote
      require('@electron/remote/main').initialize();
    }
  } catch (e) {
    console.log('Remote module no disponible:', e.message);
  }
}

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
  let dialogMethod = null; // 'ipc', 'remote', 'web'

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

  // Insertar después del selector de nivel de compresión
  if (nivelCompresion && nivelCompresion.parentNode) {
    nivelCompresion.parentNode.insertBefore(contenedorCarpeta, nivelCompresion.nextSibling);
  }

  // FUNCIÓN PARA CONFIGURAR EL SELECTOR UNA SOLA VEZ
  async function configurarSelector() {
    if (selectorConfigurado) {
      console.log('🛑 Selector ya configurado, saltando...');
      return;
    }

    console.log('🔧 Configurando selector de carpetas...');

    // MÉTODO 1: IPC (moderno y seguro)
    if (await intentarIPC()) {
      dialogMethod = 'ipc';
      selectorConfigurado = true;
      console.log('✅ Configurado con IPC');
      return;
    }

    // MÉTODO 2: Remote (tradicional)
    if (await intentarRemote()) {
      dialogMethod = 'remote';
      selectorConfigurado = true;
      console.log('✅ Configurado con Remote');
      return;
    }

    // MÉTODO 3: Web (fallback)
    configurarSelectorWeb();
    dialogMethod = 'web';
    selectorConfigurado = true;
    console.log('✅ Configurado con Web (limitado)');
  }

  // MÉTODO IPC
  async function intentarIPC() {
    try {
      if (!window.require) return false;
      
      const electron = window.require('electron');
      if (!electron.ipcRenderer) return false;

      const { ipcRenderer } = electron;
      
      // SOLO verificar que ipcRenderer existe, NO hacer prueba que abra dialog
      console.log('🔧 IPC disponible, configurando...');

      // Configurar el event listener UNA SOLA VEZ
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
          } else {
            console.log('🚫 Selección cancelada');
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
      
      // Intentar @electron/remote
      try {
        dialog = window.require('@electron/remote').dialog;
        console.log('🔧 @electron/remote disponible');
      } catch (e) {
        // Intentar remote tradicional
        if (electron.remote) {
          dialog = electron.remote.dialog;
          console.log('🔧 Remote tradicional disponible');
        }
      }

      // SOLO verificar que dialog existe, NO hacer prueba
      if (!dialog || !dialog.showOpenDialog) return false;

      // Configurar el event listener UNA SOLA VEZ
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

  // MÉTODO WEB (FALLBACK MEJORADO)
  function configurarSelectorWeb() {
    btnCarpeta.onclick = function() {
      // Crear input file una sola vez por click
      const folderInput = document.createElement('input');
      folderInput.type = 'file';
      folderInput.webkitdirectory = true;
      folderInput.multiple = true;
      folderInput.style.display = 'none';
      
      folderInput.onchange = function(e) {
        if (e.target.files.length > 0) {
          const primerArchivo = e.target.files[0];
          
          // Obtener ruta completa si está disponible (Electron)
          if (primerArchivo.path) {
            const rutaCarpeta = path.dirname(primerArchivo.path);
            carpetaDestino = rutaCarpeta;
            btnCarpeta.textContent = `📁 ${rutaCarpeta}`;
            console.log('✅ Ruta completa:', rutaCarpeta);
          } else {
            // Fallback: buscar rutas comunes
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
        
        // Remover el input
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

  // Función principal de compresión
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

          execFile(
            'python',
            ['compress.py', '--tipo', 'pdf', '--ruta', tempPath, '--nivel', nivel],
            { cwd: path.resolve(__dirname, '../../../') },
            (error, stdout, stderr) => {
              completados++;

              // Limpiar archivo temporal
              fs.unlink(tempPath, () => {});

              if (error) {
                resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: ${stderr || error.message}</p>`;
              } else {
                const match = stdout.match(/PDF comprimido correctamente:\s*(.*\.pdf)/i);
                if (match) {
                  const rutaComprimido = match[1].trim();

                  setTimeout(() => {
                    fs.access(rutaComprimido, fs.constants.R_OK, (err) => {
                      if (err) {
                        resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Archivo no encontrado</p>`;
                        return;
                      }

                      // GENERAR NOMBRE FINAL LIMPIO
                      const nombreBase = originalName.replace(/\.pdf$/i, '');
                      const nombreFinal = `${nombreBase}_comprimido.pdf`;
                      const destinoFinal = path.join(carpetaDestino, nombreFinal);
                      
                      fs.copyFile(rutaComprimido, destinoFinal, (copyErr) => {
                        if (copyErr) {
                          resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error al guardar</p>`;
                        } else {
                          exitosos++;
                          resultado.innerHTML += `<p style="color:green">✅ ${archivo.name} → ${nombreFinal}</p>`;
                          
                          // Limpiar archivo temporal comprimido
                          fs.unlink(rutaComprimido, () => {});
                        }
                      });
                    });
                  }, 1000);
                }
              }

              if (completados === archivos.length) {
                loading.style.display = "none";
                comprimirBtn.disabled = false;
                
                if (exitosos > 0) {
                  success.style.display = "block";
                  resultado.innerHTML += `<p style="color:blue"><strong>📊 ${exitosos}/${archivos.length} archivos procesados</strong></p>`;
                }
              }
            }
          );
        } catch (error) {
          completados++;
          resultado.innerHTML += `<p style="color:red">❌ ${archivo.name}: Error de procesamiento</p>`;
          
          if (completados === archivos.length) {
            loading.style.display = "none";
            comprimirBtn.disabled = false;
          }
        }
      }
    });
  }
};