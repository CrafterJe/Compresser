const { execFile } = require('child_process');
const path = require('path');

module.exports = function () {
  const comprimirBtn = document.getElementById('comprimirBtn');
  const archivoInput = document.getElementById('pdfInput');
  const nivelCompresion = document.getElementById('nivelCompresion');
  const resultado = document.getElementById('resultado');
  const modoRadios = document.querySelectorAll('input[name="modo"]');

  // Modo de carga: uno o varios
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
      });
    });
  }

  if (comprimirBtn && archivoInput && nivelCompresion) {
    comprimirBtn.addEventListener('click', () => {
      const archivos = archivoInput.files;
      const nivel = nivelCompresion.value;

      resultado.innerHTML = "";

      if (!archivos.length) {
        resultado.textContent = "⚠️ Por favor selecciona al menos un archivo PDF.";
        return;
      }

      for (let i = 0; i < archivos.length; i++) {
        const rutaArchivo = archivos[i].path;

        execFile(
          'python',
          ['compress.py', '--tipo', 'pdf', '--ruta', rutaArchivo, '--nivel', nivel],
          { cwd: path.resolve(__dirname, '../../../') },
          (error, stdout, stderr) => {
            if (error) {
              resultado.innerHTML += `<p style="color:red">❌ Error al comprimir ${archivos[i].name}</p>`;
              console.error(stderr);
            } else {
              resultado.innerHTML += `<p style="color:green">✅ Comprimido: ${archivos[i].name}</p>`;
              console.log(stdout);
            }
          }
        );
      }
    });
  }
};
