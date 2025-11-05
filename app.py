# -*- coding: utf-8 -*-

import os
import zipfile
import io
from flask import Flask, request, render_template, jsonify, send_from_directory, send_file
import pandas as pd

import threading
import uuid
from datetime import datetime

app = Flask(__name__)

# --- Configuración ---
app.config['UPLOAD_FOLDER'] = 'uploads/'
app.config['DOWNLOAD_FOLDER'] = 'downloads/'
app.config['CSV_SEPARATOR'] = ';'
app.config['CHUNK_SIZE'] = 10000
app.config['REQUIRED_COLUMNS'] = ['email', 'docnum']


# --- Gestión de Tareas en Memoria ---
tasks = {}

# --- Funciones Auxiliares de Lógica de Negocio ---

def clean_email(email):
    """Limpia un string de email que pueda contener un nombre."""
    if isinstance(email, str) and '>' in email:
        return email.split('>', 1)[-1]
    return email

def get_csv_encoding(filepath):
    """Detecta la codificación de un archivo CSV (utf-8 o latin-1) de forma eficiente."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)
        return 'utf-8'
    except UnicodeDecodeError:
        return 'latin-1'

def validate_and_get_columns(filepath):
    """
    Valida un archivo CSV y devuelve sus columnas y estado.
    Devuelve: (columnas, error_mensaje, needs_docnum_generation)
    """
    try:
        encoding = get_csv_encoding(filepath)
        df_header = pd.read_csv(filepath, nrows=0, encoding=encoding, sep=app.config['CSV_SEPARATOR'])
    except (pd.errors.ParserError, pd.errors.EmptyDataError):
        return None, f"Hubo un problema al leer el archivo CSV. Verificá que esté bien formado, no esté vacío y que el separador de columnas sea un '{app.config['CSV_SEPARATOR']}'.", False

    columns = df_header.columns.tolist()
    columns_lower = [c.lower() for c in columns]

    if 'email' not in columns_lower:
        return None, "El archivo CSV debe contener la columna 'email'.", False

    needs_docnum_generation = 'docnum' not in columns_lower

    return columns, None, needs_docnum_generation

def process_dataframe_logic(df, needs_docnum_generation):
    """
    Aplica la lógica de negocio principal a un DataFrame (chunk o preview).
    - Genera docnum si es necesario.
    - Limpia el email.
    """
    email_col_name = next((col for col in df.columns if col.lower() == 'email'), None)
    if not email_col_name:
        return df

    if needs_docnum_generation:
        # Extrae docnum de <...> y lo asigna a una nueva columna
        df['docnum'] = df[email_col_name].str.extract(r'<([^>]*)>').fillna('')
        # Limpia la columna de email, eliminando la parte extraída
        df[email_col_name] = df[email_col_name].str.replace(r'\s*<[^>]*>\s*', '', regex=True).str.strip()
    
    # Aplica la limpieza de email estándar para otros casos
    df[email_col_name] = df[email_col_name].apply(clean_email)
    
    return df

def generate_preview_data(filepath, selected_columns, needs_docnum_generation):
    """
    Genera una previsualización de datos de un archivo CSV.
    Devuelve: (preview_data, columnas_actualizadas, error_mensaje)
    """
    try:
        encoding = get_csv_encoding(filepath)
        
        cols_to_read = selected_columns.copy()
        if needs_docnum_generation and 'docnum' in cols_to_read:
            cols_to_read.remove('docnum')

        df_preview = pd.read_csv(filepath, usecols=cols_to_read, nrows=10, encoding=encoding, sep=app.config['CSV_SEPARATOR'])

        df_preview = process_dataframe_logic(df_preview, needs_docnum_generation)

        final_columns = selected_columns.copy()
        if needs_docnum_generation and 'docnum' not in final_columns:
            final_columns.insert(1, 'docnum') # Insertar docnum después de email

        df_preview = df_preview.fillna('')
        
        # Asegurarse de que todas las columnas seleccionadas existan, incluso si están vacías
        for col in final_columns:
            if col not in df_preview.columns:
                df_preview[col] = ''

        return df_preview.to_dict(orient='records'), final_columns, None

    except KeyError:
        return None, None, "Una de las columnas seleccionadas no se encontró en el archivo. Esto puede ocurrir si el CSV tiene una estructura inconsistente."
    except Exception as e:
        return None, None, f"Ocurrió un error al generar la previsualización: {str(e)}"

def reorder_chunk_columns(chunk, selected_columns):
    """
    Reordena las columnas de un chunk del DataFrame.
    'email' y 'docnum' van primero, el resto mantiene el orden de selected_columns.
    """
    ordered_cols = []
    
    if 'email' in chunk.columns:
        ordered_cols.append('email')
    if 'docnum' in chunk.columns:
        ordered_cols.append('docnum')

    for col in selected_columns:
        col_lower = col.lower()
        if col_lower not in ordered_cols and col_lower in chunk.columns:
            ordered_cols.append(col_lower)
            
    return chunk[ordered_cols]

# --- Tarea en Segundo Plano para Procesamiento de CSV ---

def process_csv_task(task_id, filepath, selected_columns, needs_docnum_generation, output_path):
    """La función que se ejecuta en segundo plano para procesar el CSV."""
    try:
        encoding = get_csv_encoding(filepath)
        total_rows = sum(1 for _ in open(filepath, 'r', encoding=encoding)) - 1

        rows_processed = 0
        chunk_size = app.config['CHUNK_SIZE']
        first_chunk = True

        cols_to_read = selected_columns.copy()
        if needs_docnum_generation and 'docnum' in cols_to_read:
            cols_to_read.remove('docnum')

        for chunk in pd.read_csv(filepath, usecols=cols_to_read, chunksize=chunk_size, encoding=encoding, sep=app.config['CSV_SEPARATOR']):
            
            chunk = process_dataframe_logic(chunk, needs_docnum_generation)

            chunk.columns = [col.lower() for col in chunk.columns]

            chunk = reorder_chunk_columns(chunk, selected_columns)
            
            if first_chunk:
                chunk.to_csv(output_path, index=False, mode='w')
                first_chunk = False
            else:
                chunk.to_csv(output_path, index=False, mode='a', header=False)
            
            rows_processed += len(chunk)
            progress = (rows_processed / total_rows) * 100
            tasks[task_id]['progress'] = round(progress)

        tasks[task_id]['status'] = 'complete'
        tasks[task_id]['result'] = f'/downloads/{os.path.basename(output_path)}'
        tasks[task_id]['processed_rows'] = rows_processed

    except FileNotFoundError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "El archivo original fue eliminado o movido durante el procesamiento. Por favor, iniciá el proceso de nuevo."
    except KeyError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "Una de las columnas seleccionadas no se encontró en el archivo. Esto puede ocurrir si el CSV tiene una estructura inconsistente."
    except MemoryError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "El archivo es demasiado grande para ser procesado. Por favor, intentá con un archivo más pequeño."
    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "Ocurrió un error inesperado durante la limpieza del archivo. Por favor, intentá de nuevo."

# --- Rutas de la Aplicación ---

@app.route('/')
def index():
    """Página principal."""
    return render_template('index.html')

@app.route('/api/get-columns', methods=['POST'])
def get_columns():
    """Recibe un archivo CSV, lo valida y devuelve sus cabeceras."""
    if 'csv_file' not in request.files:
        return jsonify({"error": "No se ha subido ningún archivo. Por favor, seleccioná un archivo para continuar."}), 400

    file = request.files['csv_file']

    if file.filename == '':
        return jsonify({"error": "No has seleccionado ningún archivo. Por favor, hacé clic en 'Seleccionar archivo' para elegir uno."}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({"error": "El formato del archivo no es válido. La herramienta solo acepta archivos .csv."}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    try:
        file.save(filepath)
        
        columns, error_message, needs_docnum_generation = validate_and_get_columns(filepath)

        if error_message:
            os.remove(filepath)
            return jsonify({"error": error_message}), 400

        return jsonify({
            "columns": columns, 
            "filepath": filepath,
            "needs_docnum_generation": needs_docnum_generation
        })

    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": "Ocurrió un error inesperado al procesar el archivo. Por favor, intentá de nuevo."}), 500

@app.route('/api/preview-file', methods=['POST'])
def preview_file():
    """Genera y devuelve una previsualización de los datos del archivo."""
    data = request.get_json()
    filepath = data.get('filepath')
    selected_columns = data.get('columns')
    needs_docnum_generation = data.get('needs_docnum_generation', False)

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para la previsualización. Por favor, intentá subir el archivo de nuevo."}), 400

    preview_data, final_columns, error_message = generate_preview_data(filepath, selected_columns, needs_docnum_generation)

    if error_message:
        return jsonify({"error": error_message}), 500

    return jsonify({"preview": preview_data, "columns": final_columns})

@app.route('/api/process-file', methods=['POST'])
def process_file_request():
    """Inicia el proceso de limpieza del archivo en segundo plano."""
    data = request.get_json()
    filepath = data.get('filepath')
    selected_columns = data.get('columns')
    needs_docnum_generation = data.get('needs_docnum_generation', False)

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para iniciar el proceso. Por favor, intentá subir el archivo de nuevo."}), 400

    task_id = str(uuid.uuid4())
    original_filename = os.path.basename(filepath)
    new_filename = f"{os.path.splitext(original_filename)[0]}_limpio.csv"
    output_path = os.path.join(app.config['DOWNLOAD_FOLDER'], new_filename)

    tasks[task_id] = {'status': 'processing', 'progress': 0}

    thread = threading.Thread(target=process_csv_task, args=(task_id, filepath, selected_columns, needs_docnum_generation, output_path))
    thread.start()

    return jsonify({'task_id': task_id})

@app.route('/api/progress/<task_id>')
def get_progress(task_id):
    """Devuelve el progreso de una tarea de procesamiento."""
    task = tasks.get(task_id)
    if not task:
        return jsonify({'status': 'error', 'error': 'Task not found'}), 404
    return jsonify(task)

@app.route('/downloads/<path:filename>')
def download_file(filename):
    """Sirve los archivos procesados para su descarga."""
    return send_from_directory(app.config['DOWNLOAD_FOLDER'], filename, as_attachment=True)


@app.route('/api/multi-export-initial-process', methods=['POST'])
def multi_export_initial_process():
    if 'csv_file' not in request.files:
        return jsonify({"error": "No se ha subido ningún archivo."}), 400

    file = request.files['csv_file']
    if file.filename == '' or not file.filename.endswith('.csv'):
        return jsonify({"error": "Archivo no válido. Por favor, sube un archivo .csv."}), 400

    temp_filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    try:
        file.save(temp_filepath)

        task_id = str(uuid.uuid4())
        tasks[task_id] = {'status': 'processing', 'progress': 0}

        thread = threading.Thread(target=multi_export_initial_process_task, args=(task_id, temp_filepath))
        thread.start()

        return jsonify({'task_id': task_id})

    except Exception as e:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        return jsonify({"error": f"Ocurrió un error inesperado al iniciar el procesamiento: {e}"}), 500

def multi_export_initial_process_task(task_id, temp_filepath):
    try:
        encoding = get_csv_encoding(temp_filepath)
        try:
            df = pd.read_csv(temp_filepath, sep=app.config['CSV_SEPARATOR'], encoding=encoding)
        except UnicodeDecodeError:
            encoding = 'latin-1'
            df = pd.read_csv(temp_filepath, sep=app.config['CSV_SEPARATOR'], encoding=encoding)

        all_banks = set()
        all_cards = set()
        all_cobrands = set()
        all_partners = set()

        total_rows = len(df)
        processed_rows = 0

        for index, row in df.iterrows():
            if 'EMIS_BANCOS' in df.columns and pd.notna(row['EMIS_BANCOS']):
                for item in str(row['EMIS_BANCOS']).split(','):
                    cleaned_item = item.strip()
                    if cleaned_item and cleaned_item != 'OTROS_BANCOS':
                        all_banks.add(cleaned_item)

            if 'EMIS_TARJETAS' in df.columns and pd.notna(row['EMIS_TARJETAS']):
                for item in str(row['EMIS_TARJETAS']).split(','):
                    cleaned_item = item.strip()
                    if cleaned_item and cleaned_item != 'OTRAS_TARJETAS':
                        all_cards.add(cleaned_item)

            if 'PLUS_PARTNER_COBRAND' in df.columns and pd.notna(row['PLUS_PARTNER_COBRAND']):
                for item in str(row['PLUS_PARTNER_COBRAND']).split(','):
                    cleaned_item = item.strip()
                    if cleaned_item:
                        all_cobrands.add(cleaned_item)

            if 'PLUS_PARTNER_EMPRESAS' in df.columns and pd.notna(row['PLUS_PARTNER_EMPRESAS']):
                for item in str(row['PLUS_PARTNER_EMPRESAS']).split(','):
                    cleaned_item = item.strip()
                    if cleaned_item:
                        all_partners.add(cleaned_item)
            
            processed_rows += 1
            progress = (processed_rows / total_rows) * 100
            tasks[task_id]['progress'] = round(progress)

        tasks[task_id]['status'] = 'complete'
        tasks[task_id]['result'] = {
            "filepath": temp_filepath,
            "unique_data": {
                "bancos": sorted(list(all_banks)),
                "tarjetas": sorted(list(all_cards)),
                "cobrands": sorted(list(all_cobrands)),
                "partners": sorted(list(all_partners))
            }
        }

    except UnicodeDecodeError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "Error de codificación: El archivo no pudo ser leído correctamente. Asegúrate de que esté en formato UTF-8 o Latin-1."
    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = f"Ocurrió un error inesperado durante el procesamiento inicial: {e}"


def multi_export_process_task(task_id, filepath, selected_categories_and_items, output_zip_path):
    try:
        # --- Cargar configuración ---
        with open('config/bancos_conocidos.txt', 'r') as f:
            known_banks = set(line.strip() for line in f)
        with open('config/tarjetas_conocidas.txt', 'r') as f:
            known_cards = set(line.strip() for line in f)
        with open('config/arplus_cobrand.txt', 'r') as f:
            known_cobrands = set(line.strip() for line in f)
        with open('config/arplus_partners.txt', 'r') as f:
            known_partners = set(line.strip() for line in f)

        # --- Leer CSV ---
        encoding = get_csv_encoding(filepath)
        try:
            df = pd.read_csv(filepath, sep=app.config['CSV_SEPARATOR'], encoding=encoding)
        except UnicodeDecodeError:
            encoding = 'latin-1'
            df = pd.read_csv(filepath, sep=app.config['CSV_SEPARATOR'], encoding=encoding)

        # Check for required columns
        required_cols = ['email']
        if 'bancos' in selected_categories_and_items:
            required_cols.append('EMIS_BANCOS')
        if 'tarjetas' in selected_categories_and_items:
            required_cols.append('EMIS_TARJETAS')
        if 'cobrands' in selected_categories_and_items:
            required_cols.append('PLUS_PARTNER_COBRAND')
        if 'partners' in selected_categories_and_items:
            required_cols.append('PLUS_PARTNER_EMPRESAS')

        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            tasks[task_id]['status'] = 'error'
            tasks[task_id]['error'] = f"Faltan las siguientes columnas en el archivo CSV: {', '.join(missing_cols)}"
            return

        # --- Procesar datos ---
        data_for_csv = {}
        total_rows = len(df)
        processed_rows = 0

        for _, row in df.iterrows():
            email = row['email']
            if pd.isna(email):
                continue
            
            # Clean the email field
            email = clean_email(email)

            # Procesar bancos
            if 'bancos' in selected_categories_and_items and pd.notna(row.get('EMIS_BANCOS')):
                banks = str(row['EMIS_BANCOS']).split(',')
                for bank in banks:
                    bank = bank.strip()
                    if bank in known_banks and bank in selected_categories_and_items['bancos']:
                        key = f"banco_{bank}"
                        if key not in data_for_csv:
                            data_for_csv[key] = []
                        data_for_csv[key].append(email)
            
            # Procesar tarjetas
            if 'tarjetas' in selected_categories_and_items and pd.notna(row.get('EMIS_TARJETAS')):
                cards = str(row['EMIS_TARJETAS']).split(',')
                for card in cards:
                    card = card.strip()
                    if card in known_cards and card in selected_categories_and_items['tarjetas']:
                        key = f"tarjeta_{card}"
                        if key not in data_for_csv:
                            data_for_csv[key] = []
                        data_for_csv[key].append(email)

            # Procesar cobrands
            if 'cobrands' in selected_categories_and_items and pd.notna(row.get('PLUS_PARTNER_COBRAND')):
                cobrands = str(row['PLUS_PARTNER_COBRAND']).split(',')
                for cobrand in cobrands:
                    cobrand = cobrand.strip()
                    if cobrand in known_cobrands and cobrand in selected_categories_and_items['cobrands']:
                        key = f"cobrand_{cobrand}"
                        if key not in data_for_csv:
                            data_for_csv[key] = []
                        data_for_csv[key].append(email)

            # Procesar partners
            if 'partners' in selected_categories_and_items and pd.notna(row.get('PLUS_PARTNER_EMPRESAS')):
                partners = str(row['PLUS_PARTNER_EMPRESAS']).split(',')
                for partner in partners:
                    partner = partner.strip()
                    if partner in known_partners and partner in selected_categories_and_items['partners']:
                        key = f"partner_{partner}"
                        if key not in data_for_csv:
                            data_for_csv[key] = []
                        data_for_csv[key].append(email)
            
            processed_rows += 1
            tasks[task_id]['progress'] = round((processed_rows / total_rows) * 100)

        # --- Crear ZIP en memoria ---
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name, emails in data_for_csv.items():
                if emails:
                    output = io.StringIO()
                    pd.DataFrame(emails, columns=['email']).to_csv(output, index=False)
                    zf.writestr(f"{name}.csv", output.getvalue())
        
        memory_file.seek(0)
        
        # Save the zip file to disk
        with open(output_zip_path, 'wb') as f:
            f.write(memory_file.getvalue())

        tasks[task_id]['status'] = 'complete'
        tasks[task_id]['result'] = f'/downloads/{os.path.basename(output_zip_path)}'

    except FileNotFoundError as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = f"Faltan archivos de configuración o el archivo CSV original. Detalle: {e}"
    except KeyError as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = f"Una columna esperada no se encontró en el archivo CSV. Detalle: {e}"
    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = f"Ocurrió un error inesperado durante la exportación múltiple: {e}"
    finally:
        # Clean up the temporary CSV file
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/multi-export-process', methods=['POST'])
def multi_export_process_request():
    data = request.get_json()
    filepath = data.get('filepath')
    selected_categories_and_items = data.get('selected_items')

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para iniciar el proceso. Por favor, intentá subir el archivo de nuevo."}), 400
    if not selected_categories_and_items:
        return jsonify({"error": "No se han seleccionado categorías o ítems para exportar."}), 400

    task_id = str(uuid.uuid4())
    zip_filename = f"exportacion_multiple_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    output_zip_path = os.path.join(app.config['DOWNLOAD_FOLDER'], zip_filename)

    tasks[task_id] = {'status': 'processing', 'progress': 0}

    thread = threading.Thread(target=multi_export_process_task, args=(task_id, filepath, selected_categories_and_items, output_zip_path))
    thread.start()

    return jsonify({'task_id': task_id})


# --- Bloque Principal ---

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    if not os.path.exists(app.config['DOWNLOAD_FOLDER']):
        os.makedirs(app.config['DOWNLOAD_FOLDER'])
        
    app.run(debug=True)