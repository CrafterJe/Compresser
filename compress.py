import argparse
import sys
import fitz
from backend.controllers import compress_controller
print("[debug] Python ejecutado:", sys.executable)
print("[debug] Versión PyMuPDF:", fitz.__doc__)
def main():
    parser = argparse.ArgumentParser(description="Compresor de archivos")
    parser.add_argument('--tipo', required=True, help='Tipo de archivo: pdf, jpeg, png, docx, pptx')
    parser.add_argument('--ruta', required=True, help='Ruta del archivo a comprimir')
    parser.add_argument('--nivel', required=False, default='seguro', help='Nivel de compresión (seguro o maximo)')

    args = parser.parse_args()

    resultado = compress_controller.comprimir(
        tipo=args.tipo,
        ruta=args.ruta,
        nivel=args.nivel
    )

    print(resultado)

if __name__ == "__main__":
    main()
