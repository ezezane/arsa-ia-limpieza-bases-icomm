'''
Este script procesa un archivo CSV grande para extraer valores únicos de columnas específicas.

Funcionalidad:
1.  Lee el archivo `2244_1_BD_S_Clientes_País_ARGENTINA_20251103202111.csv` de la carpeta `examples`.
2.  Procesa el archivo en fragmentos (chunks) para manejar eficientemente archivos grandes sin agotar la memoria.
3.  Extrae los valores únicos de las columnas `EMIS_BANCOS` y `EMIS_TARJETAS`.
4.  Guarda los valores únicos en los archivos `config/bancos_conocidos.txt` y `config/tarjetas_conocidas.txt`.

Para ejecutarlo:
1.  Asegúrate de tener la librería `pandas` instalada (`pip install pandas`).
2.  Ejecuta el script desde la terminal en la raíz de tu proyecto: `python process_large_csv.py`
'''

import pandas as pd
import os

# --- Configuración de Rutas ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXAMPLES_DIR = os.path.join(BASE_DIR, 'examples')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')

# --- Parámetros de Configuración ---
# Nombre del archivo a procesar
CSV_FILENAME = '2244_1_BD_S_Clientes_País_ARGENTINA_20251103202111.csv'

# Delimitador del CSV. Comúnmente es ',' o ';'.
# Se cambia a ';' debido a un error de tokenización.
DELIMITER = ';'

# Columnas a procesar
COLUMNA_BANCOS = 'EMIS_BANCOS'
COLUMNA_TARJETAS = 'EMIS_TARJETAS'
COLUMNA_COBRAND = 'PLUS_PARTNER_COBRAND'
COLUMNA_PARTNERS = 'PLUS_PARTNER_EMPRESAS'

# Tamaño del fragmento para la lectura (en número de filas)
CHUNK_SIZE = 100000

# --- Rutas de Archivos ---
csv_filepath = os.path.join(EXAMPLES_DIR, CSV_FILENAME)
bancos_output_path = os.path.join(CONFIG_DIR, 'bancos_conocidos.txt')
tarjetas_output_path = os.path.join(CONFIG_DIR, 'tarjetas_conocidas.txt')
cobrand_output_path = os.path.join(CONFIG_DIR, 'arplus_cobrand.txt')
partners_output_path = os.path.join(CONFIG_DIR, 'arplus_partners.txt')

def process_csv():
    '''
    Procesa el archivo CSV en fragmentos para extraer valores únicos.
    '''
    if not os.path.exists(csv_filepath):
        print(f"Error: El archivo {CSV_FILENAME} no se encuentra en la carpeta 'examples'.")
        return

    print(f"Iniciando el procesamiento de {CSV_FILENAME} con el delimitador '{DELIMITER}'...")

    bancos_unicos = set()
    tarjetas_unicas = set()
    cobrand_unicos = set()
    partners_unicos = set()

    try:
        with pd.read_csv(
            csv_filepath, 
            chunksize=CHUNK_SIZE, 
            sep=DELIMITER, 
            low_memory=False, 
            encoding='latin-1',
            on_bad_lines='warn'  # Reporta líneas con formato incorrecto
        ) as reader:
            for i, chunk in enumerate(reader):
                print(f"Procesando fragmento {i + 1}...")

                if COLUMNA_BANCOS in chunk.columns:
                    bancos_unicos.update(chunk[COLUMNA_BANCOS].dropna().unique())
                else:
                    print(f"Advertencia: La columna '{COLUMNA_BANCOS}' no se encontró en el fragmento {i + 1}.")

                if COLUMNA_TARJETAS in chunk.columns:
                    tarjetas_unicas.update(chunk[COLUMNA_TARJETAS].dropna().unique())
                else:
                    print(f"Advertencia: La columna '{COLUMNA_TARJETAS}' no se encontró en el fragmento {i + 1}.")

                if COLUMNA_COBRAND in chunk.columns:
                    cobrand_unicos.update(chunk[COLUMNA_COBRAND].dropna().unique())
                else:
                    print(f"Advertencia: La columna '{COLUMNA_COBRAND}' no se encontró en el fragmento {i + 1}.")

                if COLUMNA_PARTNERS in chunk.columns:
                    partners_unicos.update(chunk[COLUMNA_PARTNERS].dropna().unique())
                else:
                    print(f"Advertencia: La columna '{COLUMNA_PARTNERS}' no se encontró en el fragmento {i + 1}.")

        print("Procesamiento de fragmentos completado.")

        # --- Limpieza y extracción de bancos/tarjetas individuales únicos ---
        final_bancos_unicos = set()
        for banco_str in bancos_unicos:
            if isinstance(banco_str, str):
                individual_bancos = [b.strip() for b in banco_str.split(',')]
                for b in individual_bancos:
                    if b and b != 'OTROS_BANCOS': # Asegura que no esté vacío y no sea 'OTROS_BANCOS'
                        final_bancos_unicos.add(b)

        final_tarjetas_unicas = set()
        for tarjeta_str in tarjetas_unicas:
            if isinstance(tarjeta_str, str):
                individual_tarjetas = [t.strip() for t in tarjeta_str.split(',')]
                for t in individual_tarjetas:
                    if t and t != 'OTRAS_TARJETAS': # Asegura que no esté vacío y no sea 'OTRAS_TARJETAS'
                        final_tarjetas_unicas.add(t)

        final_cobrand_unicos = set()
        for cobrand_str in cobrand_unicos:
            if isinstance(cobrand_str, str):
                individual_cobrands = [c.strip() for c in cobrand_str.split(',')]
                for c in individual_cobrands:
                    if c: # Asegura que no esté vacío
                        final_cobrand_unicos.add(c)

        final_partners_unicos = set()
        for partner_str in partners_unicos:
            if isinstance(partner_str, str):
                individual_partners = [p.strip() for p in partner_str.split(',')]
                for p in individual_partners:
                    if p: # Asegura que no esté vacío
                        final_partners_unicos.add(p)

        # --- Escritura de resultados ---
        print(f"Escribiendo {len(final_bancos_unicos)} bancos únicos en {bancos_output_path}...")
        with open(bancos_output_path, 'w', encoding='utf-8') as f:
            for banco in sorted(list(final_bancos_unicos)):
                f.write(f"{banco}\n")

        print(f"Escribiendo {len(final_tarjetas_unicas)} tarjetas únicas en {tarjetas_output_path}...")
        with open(tarjetas_output_path, 'w', encoding='utf-8') as f:
            for tarjeta in sorted(list(final_tarjetas_unicas)):
                f.write(f"{tarjeta}\n")

        print(f"Escribiendo {len(final_cobrand_unicos)} cobrands únicos en {cobrand_output_path}...")
        with open(cobrand_output_path, 'w', encoding='utf-8') as f:
            for cobrand in sorted(list(final_cobrand_unicos)):
                f.write(f"{cobrand}\n")

        print(f"Escribiendo {len(final_partners_unicos)} partners únicos en {partners_output_path}...")
        with open(partners_output_path, 'w', encoding='utf-8') as f:
            for partner in sorted(list(final_partners_unicos)):
                f.write(f"{partner}\n")

        print("\n¡Proceso completado con éxito!")

    except pd.errors.ParserError as e:
        print(f"\nError Crítico de Parseo: No se pudo procesar el archivo.")
        print(f"Detalle: {e}")
        print("\nPosibles Soluciones:")
        print(f"1. Verifica que el delimitador sea realmente '{DELIMITER}' abriendo el archivo con un editor de texto.")
        print("2. Si es otro, modifica la variable 'DELIMITER' en el script.")
        print("3. El archivo puede tener líneas corruptas que necesitan ser corregidas manualmente.")
    except Exception as e:
        print(f"Ocurrió un error inesperado durante el procesamiento: {e}")

if __name__ == "__main__":
    process_csv()
