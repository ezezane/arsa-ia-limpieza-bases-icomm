# -*- coding: utf-8 -*-

import os
from flask import Flask, request, render_template, jsonify, send_from_directory
import pandas as pd

import threading
import uuid

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
    Valida un archivo CSV y devuelve sus columnas.
    Verifica codificación, estructura y columnas obligatorias.
    Devuelve: (columnas, error_mensaje)
    """
    try:
        encoding = get_csv_encoding(filepath)
        df_header = pd.read_csv(filepath, nrows=0, encoding=encoding, sep=app.config['CSV_SEPARATOR'])
    except (pd.errors.ParserError, pd.errors.EmptyDataError):
        return None, f"Hubo un problema al leer el archivo CSV. Verificá que esté bien formado, no esté vacío y que el separador de columnas sea un '{app.config['CSV_SEPARATOR']}'."

    columns = df_header.columns.tolist()
    columns_lower = [c.lower() for c in columns]

    missing_cols = [col for col in app.config['REQUIRED_COLUMNS'] if col not in columns_lower]
    if missing_cols:
        return None, f"El archivo CSV debe contener las columnas: {', '.join(missing_cols)}. No se distingue entre mayúsculas y minúsculas."

    return columns, None

def generate_preview_data(filepath, selected_columns):
    """
    Genera una previsualización de datos de un archivo CSV.
    Devuelve: (preview_data, error_mensaje)
    """
    try:
        encoding = get_csv_encoding(filepath)
        df_preview = pd.read_csv(filepath, usecols=selected_columns, nrows=10, encoding=encoding, sep=app.config['CSV_SEPARATOR'])

        df_preview = df_preview[selected_columns]

        email_col_name = next((col for col in selected_columns if col.lower() == 'email'), None)

        if email_col_name:
            df_preview[email_col_name] = df_preview[email_col_name].apply(clean_email)

        df_preview = df_preview.fillna('')
        
        return df_preview.to_dict(orient='records'), None

    except KeyError:
        return None, "Una de las columnas seleccionadas no se encontró en el archivo. Esto puede ocurrir si el CSV tiene una estructura inconsistente."
    except Exception:
        return None, "Ocurrió un error al generar la previsualización. Verificá que las columnas seleccionadas sean correctas."

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

def process_csv_task(task_id, filepath, selected_columns, output_path):
    """La función que se ejecuta en segundo plano para procesar el CSV."""
    try:
        encoding = get_csv_encoding(filepath)
        total_rows = sum(1 for _ in open(filepath, 'r', encoding=encoding)) - 1

        rows_processed = 0
        chunk_size = app.config['CHUNK_SIZE']
        first_chunk = True

        for chunk in pd.read_csv(filepath, usecols=selected_columns, chunksize=chunk_size, encoding=encoding, sep=app.config['CSV_SEPARATOR']):
            
            chunk.columns = [col.lower() for col in chunk.columns]

            if 'email' in chunk.columns:
                chunk['email'] = chunk['email'].apply(clean_email)

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
        
        columns, error_message = validate_and_get_columns(filepath)

        if error_message:
            os.remove(filepath)
            return jsonify({"error": error_message}), 400

        return jsonify({"columns": columns, "filepath": filepath})

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

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para la previsualización. Por favor, intentá subir el archivo de nuevo."}), 400

    preview_data, error_message = generate_preview_data(filepath, selected_columns)

    if error_message:
        return jsonify({"error": error_message}), 500

    return jsonify({"preview": preview_data, "columns": selected_columns})

@app.route('/api/process-file', methods=['POST'])
def process_file_request():
    """Inicia el proceso de limpieza del archivo en segundo plano."""
    data = request.get_json()
    filepath = data.get('filepath')
    selected_columns = data.get('columns')

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para iniciar el proceso. Por favor, intentá subir el archivo de nuevo."}), 400

    task_id = str(uuid.uuid4())
    original_filename = os.path.basename(filepath)
    new_filename = f"{os.path.splitext(original_filename)[0]}_limpio.csv"
    output_path = os.path.join(app.config['DOWNLOAD_FOLDER'], new_filename)

    tasks[task_id] = {'status': 'processing', 'progress': 0}

    thread = threading.Thread(target=process_csv_task, args=(task_id, filepath, selected_columns, output_path))
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

# --- Bloque Principal ---

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    if not os.path.exists(app.config['DOWNLOAD_FOLDER']):
        os.makedirs(app.config['DOWNLOAD_FOLDER'])
        
    app.run(debug=True)
