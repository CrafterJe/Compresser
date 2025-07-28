import os
from backend.models import pdf_model

def comprimir(tipo: str, ruta: str, nivel: str = 'media') -> str:
    print(f"Ruta recibida: {ruta}")
    if not os.path.exists(ruta):
        return f"El archivo no existe: {ruta}"

    tipo = tipo.lower()
    nivel = nivel.lower()

    try:
        if tipo == 'pdf':
            # Validar niveles disponibles
            if nivel not in ['baja', 'media', 'alta', 'maxima']:
                return f"Nivel de compresión no soportado: {nivel}. Use: baja, media, alta, maxima"

            salida = pdf_model.comprimir_pdf(ruta, nivel)
            return f"PDF comprimido correctamente: {salida}"

        else:
            return f"Tipo de archivo no soportado: {tipo}"

    except Exception as e:
        return f"Error al comprimir archivo: {str(e)}"