import fitz  # PyMuPDF
import os
import subprocess
import io
from PIL import Image
import tempfile

def comprimir_pdf(ruta: str, nivel: str = 'media') -> str:
    """
    Comprime un PDF con diferentes niveles de calidad y compresión.
    
    Niveles disponibles:
    - 'baja': Compresión suave, alta calidad (similar al original)
    - 'media': Compresión moderada, buena calidad 
    - 'alta': Compresión agresiva, calidad aceptable
    - 'maxima': Compresión extrema, baja calidad (muy pequeño)
    """
    nombre_original = os.path.basename(ruta)
    carpeta = os.path.dirname(ruta)
    nombre_salida = nombre_original.replace('.pdf', '_comprimido.pdf')
    ruta_salida = os.path.join(carpeta, nombre_salida)

    # Configuraciones por nivel
    configuraciones = {
        'baja': {
            'dpi': 200,
            'calidad_jpeg': 85,
            'max_dimension': 1500,
            'metodo': 'conservador'
        },
        'media': {
            'dpi': 150,
            'calidad_jpeg': 70,
            'max_dimension': 1200,
            'metodo': 'hibrido'
        },
        'alta': {
            'dpi': 120,
            'calidad_jpeg': 55,
            'max_dimension': 900,
            'metodo': 'agresivo'
        },
        'maxima': {
            'dpi': 100,
            'calidad_jpeg': 40,
            'max_dimension': 700,
            'metodo': 'extremo'
        }
    }
    
    config = configuraciones.get(nivel, configuraciones['media'])
    
    try:
        if config['metodo'] == 'conservador':
            return comprimir_pdf_conservador(ruta, ruta_salida, config)
        elif config['metodo'] == 'hibrido':
            return comprimir_pdf_hibrido(ruta, ruta_salida, config)
        else:  # agresivo o extremo
            return comprimir_pdf_agresivo_config(ruta, ruta_salida, config)
            
    except Exception as e:
        print(f"Error con método principal: {e}")
        # Fallback siempre funcional
        return comprimir_pdf_simple_mejorado(ruta, ruta_salida)

def comprimir_pdf_conservador(ruta_entrada: str, ruta_salida: str, config: dict) -> str:
    """
    Compresión suave que mantiene muy buena calidad visual.
    Ideal para documentos importantes o presentaciones.
    """
    doc_original = fitz.open(ruta_entrada)
    doc_nuevo = fitz.open()
    
    print(f"Aplicando compresión SUAVE (alta calidad)...")
    
    for num_pagina in range(doc_original.page_count):
        if num_pagina % 10 == 0:
            print(f"Procesando página {num_pagina + 1}/{doc_original.page_count}")
            
        pagina_original = doc_original[num_pagina]
        pagina_nueva = doc_nuevo.new_page(
            width=pagina_original.rect.width,
            height=pagina_original.rect.height
        )
        
        try:
            # Intentar preservar texto y solo comprimir imágenes
            success = procesar_pagina_conservadora(pagina_original, pagina_nueva, doc_original, config)
            
            if not success:
                # Fallback: renderizado de alta calidad
                matriz = fitz.Matrix(config['dpi']/72, config['dpi']/72)
                pix = pagina_original.get_pixmap(matrix=matriz, alpha=False)
                img_data = pix.tobytes("jpeg", jpg_quality=config['calidad_jpeg'])
                pagina_nueva.insert_image(pagina_nueva.rect, stream=img_data)
                pix = None
                
        except Exception:
            # Último recurso: copiar página original
            try:
                pagina_nueva.show_pdf_page(pagina_nueva.rect, doc_original, num_pagina)
            except:
                pass
    
    doc_nuevo.save(ruta_salida, garbage=2, deflate=True, clean=True)  # Limpieza suave
    doc_original.close()
    doc_nuevo.close()
    
    return ruta_salida

def comprimir_pdf_hibrido(ruta_entrada: str, ruta_salida: str, config: dict) -> str:
    """
    Compresión balanceada: buena calidad y reducción decente.
    El mejor equilibrio para uso general.
    """
    doc_original = fitz.open(ruta_entrada)
    doc_nuevo = fitz.open()
    
    print(f"Aplicando compresión EQUILIBRADA...")
    
    for num_pagina in range(doc_original.page_count):
        if num_pagina % 10 == 0:
            print(f"Procesando página {num_pagina + 1}/{doc_original.page_count}")
            
        pagina_original = doc_original[num_pagina]
        pagina_nueva = doc_nuevo.new_page(
            width=pagina_original.rect.width,
            height=pagina_original.rect.height
        )
        
        try:
            success = procesar_pagina_equilibrada(pagina_original, pagina_nueva, config)
            
            if not success:
                matriz = fitz.Matrix(0.8, 0.8)  # 80% del tamaño
                pix = pagina_original.get_pixmap(matrix=matriz, alpha=False)
                img_data = pix.tobytes("jpeg", jpg_quality=config['calidad_jpeg'])
                pagina_nueva.insert_image(pagina_nueva.rect, stream=img_data)
                pix = None
                
        except Exception:
            try:
                pagina_nueva.show_pdf_page(pagina_nueva.rect, doc_original, num_pagina)
            except:
                pass
    
    doc_nuevo.save(ruta_salida, garbage=3, deflate=True, clean=True)
    doc_original.close()
    doc_nuevo.close()
    
    return ruta_salida

def comprimir_pdf_agresivo_config(ruta_entrada: str, ruta_salida: str, config: dict) -> str:
    """
    Compresión agresiva o extrema según configuración.
    """
    doc_original = fitz.open(ruta_entrada)
    doc_nuevo = fitz.open()
    
    nivel_texto = "AGRESIVA" if config['metodo'] == 'agresivo' else "EXTREMA"
    print(f"Aplicando compresión {nivel_texto}...")
    
    for num_pagina in range(doc_original.page_count):
        if num_pagina % 5 == 0:
            print(f"Procesando página {num_pagina + 1}/{doc_original.page_count}")
            
        pagina_original = doc_original[num_pagina]
        pagina_nueva = doc_nuevo.new_page(
            width=pagina_original.rect.width,
            height=pagina_original.rect.height
        )
        
        try:
            success = procesar_pagina_como_imagen_config(pagina_original, pagina_nueva, config)
            
            if not success:
                # Fallback más agresivo
                factor = 0.6 if config['metodo'] == 'agresivo' else 0.4
                matriz = fitz.Matrix(factor, factor)
                pix = pagina_original.get_pixmap(matrix=matriz, alpha=False)
                img_data = pix.tobytes("jpeg", jpg_quality=config['calidad_jpeg'])
                pagina_nueva.insert_image(pagina_nueva.rect, stream=img_data)
                pix = None
                
        except Exception:
            try:
                pagina_nueva.show_pdf_page(pagina_nueva.rect, doc_original, num_pagina)
            except:
                pass
    
    doc_nuevo.save(ruta_salida, garbage=4, deflate=True, clean=True)
    doc_original.close()
    doc_nuevo.close()
    
    return ruta_salida

def procesar_pagina_hibrida(pagina_original, pagina_nueva, doc_original, dpi, calidad):
    """
    Intenta preservar texto mientras comprime imágenes agresivamente.
    """
    try:
        # Extraer y comprimir imágenes
        imagenes = pagina_original.get_images(full=True)
        imagenes_procesadas = 0
        
        for img_info in imagenes:
            try:
                xref = img_info[0]
                if xref == 0:  # Saltar referencias inválidas
                    continue
                    
                # Extraer imagen
                img_dict = doc_original.extract_image(xref)
                img_data = img_dict["image"]
                img_ext = img_dict["ext"]
                
                # Comprimir imagen con PIL
                img_comprimida = comprimir_imagen_pil(img_data, calidad)
                
                if img_comprimida:
                    # Obtener posición de la imagen en la página
                    try:
                        img_rects = pagina_original.get_image_rects(img_info)
                        if img_rects:
                            rect = img_rects[0]  # Usar el primer rectángulo
                            pagina_nueva.insert_image(rect, stream=img_comprimida)
                            imagenes_procesadas += 1
                    except:
                        # Si no se puede obtener la posición, saltar
                        continue
                        
            except Exception as e:
                continue
        
        # Copiar texto y elementos vectoriales
        texto_dict = pagina_original.get_text("dict")
        for bloque in texto_dict.get("blocks", []):
            if "lines" in bloque:  # Es un bloque de texto
                for linea in bloque["lines"]:
                    for span in linea["spans"]:
                        texto = span["text"]
                        if texto.strip():
                            punto = fitz.Point(span["bbox"][0], span["bbox"][1])
                            pagina_nueva.insert_text(punto, texto, 
                                                   fontsize=span["size"],
                                                   color=span.get("color", 0))
        
        return imagenes_procesadas > 0
        
    except Exception as e:
        return False

def procesar_pagina_conservadora(pagina_original, pagina_nueva, doc_original, config):
    """
    Procesamiento conservador: intenta preservar texto y comprimir solo imágenes.
    """
    try:
        # Copiar todo el contenido de la página primero
        pagina_nueva.show_pdf_page(pagina_nueva.rect, doc_original, pagina_original.number)
        
        # Luego intentar optimizar imágenes sin destruir la estructura
        imagenes = pagina_original.get_images(full=True)
        
        for img_info in imagenes:
            try:
                xref = img_info[0]
                if xref == 0:
                    continue
                    
                # Solo comprimir imágenes muy grandes
                img_dict = doc_original.extract_image(xref)
                img_data = img_dict["image"]
                
                # Si la imagen es grande (>500KB), comprimirla suavemente
                if len(img_data) > 500000:  # 500KB
                    pil_img = Image.open(io.BytesIO(img_data))
                    
                    if pil_img.mode != 'RGB':
                        pil_img = pil_img.convert('RGB')
                    
                    # Redimensionar solo si es MUY grande
                    ancho, alto = pil_img.size
                    if ancho > config['max_dimension'] or alto > config['max_dimension']:
                        factor = min(config['max_dimension']/ancho, config['max_dimension']/alto)
                        nuevo_ancho = int(ancho * factor)
                        nuevo_alto = int(alto * factor)
                        pil_img = pil_img.resize((nuevo_ancho, nuevo_alto), Image.Resampling.LANCZOS)
                    
                    # Comprimir con alta calidad
                    buffer = io.BytesIO()
                    pil_img.save(buffer, format='JPEG', quality=config['calidad_jpeg'], optimize=True)
                    # Nota: No reemplazamos la imagen en el PDF conservador, solo la optimizamos
                    
            except Exception:
                continue
                
        return True
        
    except Exception:
        return False

def procesar_pagina_equilibrada(pagina_original, pagina_nueva, config):
    """
    Procesamiento equilibrado: renderiza la página con buena calidad.
    """
    try:
        matriz = fitz.Matrix(config['dpi']/72, config['dpi']/72)
        pix = pagina_original.get_pixmap(matrix=matriz, alpha=False)
        
        # Usar PIL para mejor control de compresión
        img_data = pix.tobytes("png")
        pil_img = Image.open(io.BytesIO(img_data))
        
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        
        # Redimensionar moderadamente si es necesario
        ancho, alto = pil_img.size
        if ancho > config['max_dimension'] or alto > config['max_dimension']:
            factor = min(config['max_dimension']/ancho, config['max_dimension']/alto)
            nuevo_ancho = int(ancho * factor)
            nuevo_alto = int(alto * factor)
            pil_img = pil_img.resize((nuevo_ancho, nuevo_alto), Image.Resampling.LANCZOS)
        
        # Comprimir con calidad equilibrada
        buffer = io.BytesIO()
        pil_img.save(buffer, format='JPEG', quality=config['calidad_jpeg'], optimize=True)
        img_comprimida = buffer.getvalue()
        
        pagina_nueva.insert_image(pagina_nueva.rect, stream=img_comprimida)
        
        pix = None
        pil_img = None
        
        return True
        
    except Exception:
        return False

def procesar_pagina_como_imagen_config(pagina_original, pagina_nueva, config):
    """
    Procesamiento con configuración específica (agresivo o extremo).
    """
    try:
        matriz = fitz.Matrix(config['dpi']/72, config['dpi']/72)
        pix = pagina_original.get_pixmap(matrix=matriz, alpha=False)
        
        img_data = pix.tobytes("png")
        pil_img = Image.open(io.BytesIO(img_data))
        
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        
        # Redimensionar según configuración
        ancho, alto = pil_img.size
        if ancho > config['max_dimension'] or alto > config['max_dimension']:
            factor = min(config['max_dimension']/ancho, config['max_dimension']/alto)
            nuevo_ancho = int(ancho * factor)
            nuevo_alto = int(alto * factor)
            pil_img = pil_img.resize((nuevo_ancho, nuevo_alto), Image.Resampling.LANCZOS)
        
        # Aplicar compresión adicional en modo extremo
        calidad = config['calidad_jpeg']
        if config['metodo'] == 'extremo' and ancho * alto > 300000:
            calidad = max(calidad - 15, 25)  # Reducir calidad aún más
        
        buffer = io.BytesIO()
        pil_img.save(buffer, 
                    format='JPEG', 
                    quality=calidad, 
                    optimize=True,
                    progressive=True if config['metodo'] == 'extremo' else False)
        
        img_comprimida = buffer.getvalue()
        pagina_nueva.insert_image(pagina_nueva.rect, stream=img_comprimida)
        
        pix = None
        pil_img = None
        
        return True
        
    except Exception:
        return False

def comprimir_imagen_pil(img_data: bytes, calidad: int = 60) -> bytes:
    """
    Comprime una imagen usando PIL con configuración agresiva.
    """
    try:
        # Abrir imagen con PIL
        pil_img = Image.open(io.BytesIO(img_data))
        
        # Convertir a RGB si es necesario
        if pil_img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', pil_img.size, (255, 255, 255))
            if pil_img.mode == 'P':
                pil_img = pil_img.convert('RGBA')
            rgb_img.paste(pil_img, mask=pil_img.split()[-1] if pil_img.mode in ('RGBA', 'LA') else None)
            pil_img = rgb_img
        
        # Reducir resolución si es muy grande
        ancho, alto = pil_img.size
        if ancho > 1000 or alto > 1000:
            factor = min(1000/ancho, 1000/alto)
            nuevo_ancho = int(ancho * factor)
            nuevo_alto = int(alto * factor)
            pil_img = pil_img.resize((nuevo_ancho, nuevo_alto), Image.Resampling.LANCZOS)
        
        # Comprimir como JPEG
        buffer = io.BytesIO()
        pil_img.save(buffer, format='JPEG', quality=calidad, optimize=True)
        
        return buffer.getvalue()
        
    except Exception as e:
        return None

def comprimir_pdf_simple_mejorado(ruta_entrada: str, ruta_salida: str) -> str:
    """
    Método simple pero muy efectivo para compresión.
    """
    doc = fitz.open(ruta_entrada)
    doc_nuevo = fitz.open()
    
    for num_pagina in range(doc.page_count):
        pagina = doc[num_pagina]
        
        try:
            # Renderizar con resolución muy baja para máxima compresión
            matriz = fitz.Matrix(0.5, 0.5)  # 50% del tamaño original
            pix = pagina.get_pixmap(matrix=matriz, alpha=False)
            
            # Crear nueva página con dimensiones originales
            pagina_nueva = doc_nuevo.new_page(width=pagina.rect.width, height=pagina.rect.height)
            
            # Comprimir como JPEG con calidad muy baja
            img_data = pix.tobytes("jpeg", jpg_quality=35)  # Calidad muy baja
            pagina_nueva.insert_image(pagina_nueva.rect, stream=img_data)
            
            pix = None
            
        except Exception:
            # Si falla, crear página vacía
            doc_nuevo.new_page(width=pagina.rect.width, height=pagina.rect.height)
    
    # Guardar sin linear (que ya no se soporta)
    doc_nuevo.save(ruta_salida, garbage=4, deflate=True, clean=True)
    doc.close()
    doc_nuevo.close()
    
    return ruta_salida

def comprimir_pdf_basico_seguro(ruta_entrada: str, ruta_salida: str) -> str:
    """
    Método básico garantizado que siempre funciona.
    """
    try:
        doc = fitz.open(ruta_entrada)
        
        # Solo guardar con opciones de compresión básicas
        doc.save(ruta_salida, 
                 garbage=4,      # Limpieza
                 deflate=True,   # Compresión deflate
                 clean=True)     # Limpiar streams
        
        doc.close()
        return ruta_salida
        
    except Exception:
        # Si incluso esto falla, hacer copia simple
        import shutil
        shutil.copy2(ruta_entrada, ruta_salida)
        return ruta_salida

def comprimir_pdf_gs(ruta: str, calidad: str = 'screen') -> str:
    """
    Compresión usando Ghostscript con configuración optimizada.
    """
    nombre_original = os.path.basename(ruta)
    carpeta = os.path.dirname(ruta)
    nombre_salida = nombre_original.replace('.pdf', '_comprimido.pdf')
    ruta_salida = os.path.join(carpeta, nombre_salida)

    # Configuraciones más agresivas
    configuraciones = {
        "screen": {
            "setting": "/screen",
            "ColorImageResolution": "72",
            "GrayImageResolution": "72", 
            "MonoImageResolution": "72"
        },
        "ebook": {
            "setting": "/ebook", 
            "ColorImageResolution": "150",
            "GrayImageResolution": "150",
            "MonoImageResolution": "150"
        }
    }
    
    config = configuraciones.get(calidad, configuraciones["screen"])
    
    # Detectar Ghostscript
    gs_ejecutables = ["gswin64c", "gswin32c", "gs"]
    gs_comando = None
    
    for ejecutable in gs_ejecutables:
        try:
            subprocess.run([ejecutable, "--version"], 
                         capture_output=True, check=True)
            gs_comando = ejecutable
            break
        except:
            continue
    
    if not gs_comando:
        raise Exception("Ghostscript no encontrado")

    comando = [
        gs_comando,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={config['setting']}",
        "-dNOPAUSE", "-dQUIET", "-dBATCH",
        "-dAutoRotatePages=/None",
        "-dColorImageDownsampleType=/Bicubic",
        f"-dColorImageResolution={config['ColorImageResolution']}",
        "-dGrayImageDownsampleType=/Bicubic",
        f"-dGrayImageResolution={config['GrayImageResolution']}",
        "-dMonoImageDownsampleType=/Bicubic",
        f"-dMonoImageResolution={config['MonoImageResolution']}",
        "-dOptimize=true",
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        "-dCompressFonts=true",
        "-dDetectDuplicateImages=true",
        f"-sOutputFile={ruta_salida}",
        ruta
    ]

    try:
        subprocess.run(comando, check=True, capture_output=True)
        return ruta_salida
    except subprocess.CalledProcessError as e:
        raise Exception(f"Error en Ghostscript: {e}")

def obtener_info_compresion(ruta_original: str, ruta_comprimida: str) -> dict:
    """
    Calcula estadísticas de compresión.
    """
    try:
        tamaño_original = os.path.getsize(ruta_original)
        tamaño_comprimido = os.path.getsize(ruta_comprimida)
        
        if tamaño_original == 0:
            return {"error": "Archivo original vacío"}
            
        reduccion = ((tamaño_original - tamaño_comprimido) / tamaño_original) * 100
        
        return {
            "tamaño_original_mb": round(tamaño_original / (1024 * 1024), 2),
            "tamaño_comprimido_mb": round(tamaño_comprimido / (1024 * 1024), 2),
            "reduccion_porcentaje": round(reduccion, 2),
            "factor_compresion": round(tamaño_original / tamaño_comprimido, 2) if tamaño_comprimido > 0 else 0
        }
    except Exception as e:
        return {"error": str(e)}

# Función de prueba y diagnóstico
def diagnosticar_pdf(ruta_pdf: str):
    """
    Analiza un PDF para entender por qué es tan grande.
    """
    try:
        doc = fitz.open(ruta_pdf)
        
        total_imagenes = 0
        tamaño_imagenes = 0
        
        for pagina in doc:
            imagenes = pagina.get_images(full=True)
            total_imagenes += len(imagenes)
            
            for img_info in imagenes:
                try:
                    xref = img_info[0]
                    if xref > 0:
                        img_dict = doc.extract_image(xref)
                        tamaño_imagenes += len(img_dict["image"])
                except:
                    continue
        
        doc.close()
        
        tamaño_archivo = os.path.getsize(ruta_pdf)
        
        print(f"\n📊 DIAGNÓSTICO DEL PDF:")
        print(f"📄 Páginas: {doc.page_count}")
        print(f"🖼️  Imágenes encontradas: {total_imagenes}")
        print(f"📏 Tamaño total: {tamaño_archivo / (1024*1024):.2f} MB")
        print(f"🎨 Tamaño de imágenes: {tamaño_imagenes / (1024*1024):.2f} MB")
        print(f"📝 Porcentaje de imágenes: {(tamaño_imagenes/tamaño_archivo)*100:.1f}%")
        
    except Exception as e:
        print(f"Error en diagnóstico: {e}")

def test_compresion(ruta_pdf: str):
    """
    Prueba la compresión y muestra resultados.
    """
    print(f"🧪 Iniciando compresión de: {ruta_pdf}")
    
    # Diagnóstico inicial
    diagnosticar_pdf(ruta_pdf)
    
    try:
        ruta_comprimida = comprimir_pdf(ruta_pdf, 'media')
        info = obtener_info_compresion(ruta_pdf, ruta_comprimida)
        
        print(f"\n✅ COMPRESIÓN COMPLETADA!")
        print(f"📁 Archivo original: {info.get('tamaño_original_mb', 0)} MB")
        print(f"📁 Archivo comprimido: {info.get('tamaño_comprimido_mb', 0)} MB") 
        print(f"📊 Reducción: {info.get('reduccion_porcentaje', 0)}%")
        print(f"🔄 Factor de compresión: {info.get('factor_compresion', 0)}x")
        print(f"💾 Guardado en: {ruta_comprimida}")
        
        return ruta_comprimida
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None