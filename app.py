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

# --- Bloque Principal ---

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    if not os.path.exists(app.config['DOWNLOAD_FOLDER']):
        os.makedirs(app.config['DOWNLOAD_FOLDER'])
        
    app.run(debug=True)