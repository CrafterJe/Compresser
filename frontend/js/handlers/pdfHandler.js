const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mapear nombres de carpetas según el idioma (simplificado)
const folderNames = {
  en: { downloads: 'Downloads', desktop: 'Desktop' },
  es: { downloads: 'Descargas', desktop: 'Escritorio' }
};

// Detectar idioma del sistema (aproximación basada en la plataforma)
const systemLanguage = os.platform() === 'win32' ? 'en' : 'es'; // Simplificación: Windows usa inglés, otros (como Linux/macOS) pueden usar español
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
  let carpetaDestino = path.join(os.homedir(), localizedFolders.downloads); // Por defecto: Descargas o Downloads

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
  
  const btnCarpeta = document.createElement('button');
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

  // Función para seleccionar carpeta
  let folderInput = null; // Variable para rastrear el input actual
  btnCarpeta.addEventListener('click', () => {
    // Eliminar el input anterior si existe
    if (folderInput) {
      document.body.removeChild(folderInput);
    }

    folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.webkitdirectory = true;
    folderInput.style.display = 'none';
    
    folderInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        // Obtener la carpeta seleccionada
        const primerArchivo = e.target.files[0];
        const rutaRelativa = primerArchivo.webkitRelativePath || '';

        if (rutaRelativa) {
          const partesRuta = rutaRelativa.split('/');
          partesRuta.pop(); // Quitar el nombre del archivo
          const carpetaRelativa = partesRuta.join('/');

          // Usar la carpeta seleccionada como destino absoluto
          carpetaDestino = path.join(os.homedir(), carpetaRelativa || ''); // Si no hay ruta relativa, usa el directorio raíz
          btnCarpeta.textContent = `📁 ${carpetaDestino}`;

          console.log('Nueva carpeta de destino:', carpetaDestino);
        }
      }
      document.body.removeChild(folderInput);
      folderInput = null; // Limpiar la referencia
    });
    
    document.body.appendChild(folderInput);
    folderInput.click();
  });

  // Botón rápido para Downloads/Descargas
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
  
  btnDownloads.addEventListener('click', () => {
    carpetaDestino = path.join(os.homedir(), localizedFolders.downloads);
    btnCarpeta.textContent = `📁 ${carpetaDestino}`;
  });

  // Botón rápido para Desktop/Escritorio
  const btnEscritorio = document.createElement('button');
  btnEscritorio.textContent = '🖥️ Usar ' + localizedFolders.desktop;
  btnEscritorio.type = 'button';
  btnEscritorio.style.cssText = btnDownloads.style.cssText.replace('#4CAF50', '#FF9800');
  
  btnEscritorio.addEventListener('click', () => {
    carpetaDestino = path.join(os.homedir(), localizedFolders.desktop);
    btnCarpeta.textContent = `📁 ${carpetaDestino}`;
  });

  contenedorCarpeta.appendChild(btnDownloads);
  contenedorCarpeta.appendChild(btnEscritorio);

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
          else resolve(tempPath);
        });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function obtenerCarpetaOriginal(file) {
    // Usar la carpeta seleccionada por el usuario
    return carpetaDestino;
  }

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

      loading.style.display = "block";
      comprimirBtn.disabled = true;

      let completados = 0;

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        
        try {
          console.log("🧾 Archivo recibido:", archivo.name);
          
          // Crear archivo temporal
          const rutaArchivo = await guardarArchivoTemporal(archivo);
          console.log("📂 Ruta temporal creada:", rutaArchivo);

          execFile(
            'python',
            ['compress.py', '--tipo', 'pdf', '--ruta', rutaArchivo, '--nivel', nivel],
            { cwd: path.resolve(__dirname, '../../../') },
            (error, stdout, stderr) => {
              completados++;

              // Limpiar archivo temporal
              fs.unlink(rutaArchivo, (err) => {
                if (err) console.warn('No se pudo eliminar archivo temporal:', err);
              });

              if (error) {
                resultado.innerHTML += `<p style="color:red">❌ Error al comprimir ${archivo.name}</p>`;
                console.error(stderr || error.message);
              } else {
                console.log(stdout);
              
                const match = stdout.match(/PDF comprimido correctamente:\s*(.*\.pdf)/i);
                if (match) {
                  const rutaComprimido = match[1].trim();
                  const nombreFinal = path.basename(rutaComprimido);
                  const destinoFinal = path.join(carpetaDestino, nombreFinal);
                
                  // Copiar a carpeta destino
                  fs.copyFile(rutaComprimido, destinoFinal, (err) => {
                    if (err) {
                      resultado.innerHTML += `<p style="color:red">❌ Error al mover ${archivo.name} a carpeta destino</p>`;
                      console.error(err);
                    } else {
                      resultado.innerHTML += `<p style="color:green">✅ ${archivo.name} guardado en: ${destinoFinal}</p>`;
                      console.log("📁 Copiado a:", destinoFinal);
                    }
                  });
                } else {
                  resultado.innerHTML += `<p style="color:red">❌ No se detectó la salida del PDF comprimido</p>`;
                }
              }
              

              if (completados === archivos.length) {
                loading.style.display = "none";
                success.style.display = "block";
                comprimirBtn.disabled = false;
              }
            }
          );
        } catch (error) {
          completados++;
          console.error('Error creando archivo temporal:', error);
          resultado.innerHTML += `<p style="color:red">❌ Error al procesar ${archivo.name}</p>`;
          
          if (completados === archivos.length) {
            loading.style.display = "none";
            comprimirBtn.disabled = false;
          }
        }
      }
    });
  }
};