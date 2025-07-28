// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function crearVentanaPrincipal() {
  const ventana = new BrowserWindow({
    width: 850,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'frontend', 'js', 'app.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  ventana.loadFile(path.join(__dirname, 'frontend', 'views', 'home.html'));
}

app.whenReady().then(() => {
  crearVentanaPrincipal();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentanaPrincipal();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
