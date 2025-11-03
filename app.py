# -*- coding: utf-8 -*-

import os
from flask import Flask, request, render_template, jsonify, send_from_directory
import pandas as pd
# Añadiremos pandas más adelante
# import pandas as pd

import threading
import uuid

app = Flask(__name__)

# Configuración de carpetas
UPLOAD_FOLDER = 'uploads/'
DOWNLOAD_FOLDER = 'downloads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DOWNLOAD_FOLDER'] = DOWNLOAD_FOLDER

# --- Task Management ---
tasks = {}

def clean_email(email):
    if isinstance(email, str) and '>' in email:
        return email.split('>', 1)[-1]
    return email

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

# --- Rutas de la API ---

@app.route('/api/get-columns', methods=['POST'])
def get_columns():
    """
    Recibe un archivo CSV, extrae las cabeceras y las devuelve.
    """
    if 'csv_file' not in request.files:
        return jsonify({"error": "No se ha subido ningún archivo. Por favor, seleccioná un archivo para continuar."}), 400

    file = request.files['csv_file']

    if file.filename == '':
        return jsonify({"error": "No has seleccionado ningún archivo. Por favor, hacé clic en 'Seleccionar archivo' para elegir uno."}), 400

    if file and file.filename.endswith('.csv'):
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        try:
            file.save(filepath)

            try:
                # Intenta leer con UTF-8
                df_header = pd.read_csv(filepath, nrows=0, encoding='utf-8', sep=';')
            except UnicodeDecodeError:
                # Si falla, intenta con latin-1
                df_header = pd.read_csv(filepath, nrows=0, encoding='latin-1', sep=';')
            except (pd.errors.ParserError, pd.errors.EmptyDataError):
                os.remove(filepath)
                return jsonify({"error": "Hubo un problema al leer el archivo CSV. Por favor, verificá que el archivo esté bien formado, que no esté vacío y que el separador de columnas sea un punto y coma (;)."}), 400

            columns = df_header.columns.tolist()

            columns_lower = [c.lower() for c in columns]
            
            if 'email' not in columns_lower or 'docnum' not in columns_lower:
                os.remove(filepath)
                return jsonify({"error": "El archivo CSV debe contener las columnas 'email' y 'docnum'. No se distingue entre mayúsculas y minúsculas."}), 400

            return jsonify({"columns": columns, "filepath": filepath})

        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "Ocurrió un error inesperado al procesar el archivo. Por favor, intentá de nuevo. Si el problema persiste, contactá a soporte."}), 500
    else:
        return jsonify({"error": "El formato del archivo no es válido. La herramienta solo acepta archivos .csv."}), 400


def process_csv_task(task_id, filepath, selected_columns, output_path):
    """La función que se ejecuta en segundo plano para procesar el CSV."""
    try:
        # --- Detección de codificación y conteo de filas ---
        encoding = 'utf-8'
        try:
            # Intenta contar las filas con UTF-8
            total_rows = sum(1 for _ in open(filepath, 'r', encoding='utf-8')) - 1
        except UnicodeDecodeError:
            # Si falla, cambia a latin-1 y vuelve a contar
            encoding = 'latin-1'
            total_rows = sum(1 for _ in open(filepath, 'r', encoding='latin-1')) - 1

        rows_processed = 0
        chunk_size = 10000
        first_chunk = True

        # --- Procesamiento por chunks con la codificación detectada ---
        for chunk in pd.read_csv(filepath, usecols=selected_columns, chunksize=chunk_size, encoding=encoding, sep=';'):
            
            # Normalizamos los nombres de las columnas a minúsculas
            chunk.columns = [col.lower() for col in chunk.columns]

            # Ahora podemos acceder a 'email' de forma segura
            if 'email' in chunk.columns:
                chunk['email'] = chunk['email'].apply(clean_email)

            # Reorder columns to ensure 'email' and 'docnum' are always first and second
            ordered_cols = []
            email_col_name = None
            docnum_col_name = None

            # Find the actual case of 'email' and 'docnum' in the chunk
            for col in chunk.columns:
                if col.lower() == 'email':
                    email_col_name = col
                elif col.lower() == 'docnum':
                    docnum_col_name = col
            
            # Add email and docnum to the ordered list if they exist
            if email_col_name:
                ordered_cols.append(email_col_name)
            if docnum_col_name:
                ordered_cols.append(docnum_col_name)

            # Add other columns from selected_columns, maintaining their order
            # and ensuring no duplicates with email/docnum
            for col in selected_columns:
                if col.lower() != 'email' and col.lower() != 'docnum':
                    # Find the actual case of the column in the chunk
                    actual_col_name = next((c for c in chunk.columns if c.lower() == col.lower()), None)
                    if actual_col_name and actual_col_name not in ordered_cols:
                        ordered_cols.append(actual_col_name)

            # Reindex the DataFrame with the desired column order
            chunk = chunk[ordered_cols]
            
            if first_chunk:
                chunk.to_csv(output_path, index=False, mode='w')
                first_chunk = False
            else:
                chunk.to_csv(output_path, index=False, mode='a', header=False)
            
            rows_processed += len(chunk)
            progress = (rows_processed / total_rows) * 100
            tasks[task_id]['progress'] = round(progress)

        download_url = f'/downloads/{os.path.basename(output_path)}'
        tasks[task_id]['status'] = 'complete'
        tasks[task_id]['result'] = download_url

    except FileNotFoundError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "El archivo original fue eliminado o movido durante el procesamiento. Por favor, iniciá el proceso de nuevo."
    except KeyError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "Una de las columnas seleccionadas no se encontró en el archivo. Esto puede ocurrir si el CSV tiene una estructura inconsistente. Por favor, revisá el archivo."
    except MemoryError:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "El archivo es demasiado grande para ser procesado en este momento. Por favor, intentá con un archivo más pequeño o dividilo en varias partes."
    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = "Ocurrió un error inesperado durante la limpieza del archivo. Por favor, intentá de nuevo."

@app.route('/api/preview-file', methods=['POST'])
def preview_file():
    data = request.get_json()
    filepath = data.get('filepath')
    selected_columns = data.get('columns')

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para la previsualización. Por favor, intentá subir el archivo de nuevo."}), 400

    try:
        try:
            # Intenta leer con UTF-8
            df_preview = pd.read_csv(filepath, usecols=selected_columns, nrows=10, encoding='utf-8', sep=';')
        except UnicodeDecodeError:
            # Si falla, intenta con latin-1
            df_preview = pd.read_csv(filepath, usecols=selected_columns, nrows=10, encoding='latin-1', sep=';')

        # Reindex the DataFrame with the new column order as provided by the frontend
        df_preview = df_preview[selected_columns]

        email_col_name = None
        for col in selected_columns:
            if col.lower() == 'email':
                email_col_name = col
                break

        # Apply clean_email function if email column exists
        if email_col_name:
            df_preview[email_col_name] = df_preview[email_col_name].apply(clean_email)



        # Ensure all NaN values are converted to empty strings for valid JSON serialization and front-end compatibility
        df_preview = df_preview.fillna('')
        


        preview_data = df_preview.to_dict(orient='records')


        return jsonify({"preview": preview_data, "columns": selected_columns})

    except KeyError:
        return jsonify({"error": "Una de las columnas seleccionadas no se encontró en el archivo. Esto puede ocurrir si el CSV tiene una estructura inconsistente. Por favor, revisá el archivo."}), 400
    except Exception as e:
        return jsonify({"error": "Ocurrió un error al generar la previsualización. Verificá que las columnas seleccionadas sean correctas e intentá de nuevo."}), 500

@app.route('/api/process-file', methods=['POST'])
def process_file_request():
    data = request.get_json()
    filepath = data.get('filepath')
    selected_columns = data.get('columns')

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "No se pudo encontrar el archivo original para la previsualización. Por favor, intentá subir el archivo de nuevo."}), 400

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
    task = tasks.get(task_id)
    if not task:
        return jsonify({'status': 'error', 'error': 'Task not found'}), 404
    return jsonify(task)

# ... (existing download_file route and main block)

@app.route('/downloads/<path:filename>')
def download_file(filename):
    """Sirve los archivos procesados para su descarga."""
    return send_from_directory(app.config['DOWNLOAD_FOLDER'], filename, as_attachment=True)




if __name__ == '__main__':
    # Crearemos las carpetas si no existen
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    if not os.path.exists(DOWNLOAD_FOLDER):
        os.makedirs(DOWNLOAD_FOLDER)
        
    app.run(debug=True)