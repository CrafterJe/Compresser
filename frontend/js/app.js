window.addEventListener('DOMContentLoaded', () => {
  const ruta = window.location.pathname;

  if (ruta.includes('vista_pdf.html')) {
    require('../js/handlers/pdfHandler.js')();
  }

  // if (ruta.includes('vista_jpeg.html')) {
  //   require('./handlers/jpegHandler.js')();
  // }
});
