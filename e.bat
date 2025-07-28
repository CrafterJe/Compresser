@echo off
setlocal

:: Ruta base del proyecto
set "BASE=C:\Users\rauli\OneDrive\Escritorio\Importante\CompresorElectronApp"

:: Descargar Python embebido si no existe
if not exist "%BASE%\python\python.exe" (
    echo 🔽 Descargando Python embebido...
    powershell -Command "Invoke-WebRequest https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip -OutFile %BASE%\python.zip"
    powershell -Command "Expand-Archive %BASE%\python.zip -DestinationPath %BASE%\python"
    del "%BASE%\python.zip"
)

:: Crear carpeta para paquetes si no existe
if not exist "%BASE%\python\Lib\site-packages" (
    mkdir "%BASE%\python\Lib\site-packages"
)

:: Instalar PyMuPDF en carpeta embebida
echo 📦 Instalando PyMuPDF...
pip install --no-user PyMuPDF -t "%BASE%\python\Lib\site-packages"

:: Activar import site
echo ✅ Configurando entorno embebido...
powershell -Command "(Get-Content '%BASE%\python\python311._pth') -replace '^#?import site', 'import site' | Set-Content '%BASE%\python\python311._pth'"
powershell -Command "Add-Content '%BASE%\python\python311._pth' 'Lib\site-packages'"

echo 🎉 Listo. Ejecuta tu app Electron y prueba compresión PDF.

pause
