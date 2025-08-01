# 🗜️ Compresor de Archivos - App de Escritorio

Aplicación de escritorio desarrollada con **Electron + Python**, que permite comprimir diferentes tipos de archivos como:

- 📄 PDF
- 🖼️ JPEG y PNG
- 📝 DOCX
- 📊 PPTX

## 🚀 Tecnologías usadas

- [Electron.js](https://www.electronjs.org/)
- [Node.js](https://nodejs.org/)
- Python 3.x
- Pillow, PyMuPDF, Zipfile, etc.

## 📁 Estructura del proyecto (MVC)

```plaintext
CompresorElectronApp/
├── frontend/
│   ├── views/        → Vistas HTML
│   ├── css/          → Estilos
│   ├── js/           → app.js + handlers/
├── backend/
│   ├── models/       → Lógica de compresión por tipo
│   ├── controllers/  → Redirección lógica
│   ├── utils/        → Funciones auxiliares
├── compress.py       → Punto de entrada Python
├── main.js           → Entrada Electron
├── dist/             → App empaquetada
