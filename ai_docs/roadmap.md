# Mejoras Propuestas (Roadmap)

A continuación se detallan las mejoras planificadas para futuras versiones de la herramienta, con el objetivo de enriquecer la experiencia de usuario, ampliar la funcionalidad y mejorar la calidad técnica del proyecto.

### Versión 1.2: Mejoras de Funcionalidad

*   **Guardar "Presets" de Columnas:**
    *   Desarrollar una función para guardar y cargar selecciones de columnas predefinidas, agilizando el trabajo para tareas repetitivas.
*   **Soporte para Archivos Excel:**
    *   Ampliar la compatibilidad de la herramienta para poder procesar archivos en formato `.xlsx` y `.xls`, además de `.csv`.


### Versión 2.0: Mejoras Técnicas y de Mantenimiento

*   **Modularización del Código Frontend:**
    *   Refactorizar el archivo `script.js` en módulos más pequeños y específicos (UI, API, etc.) para facilitar el mantenimiento y la escalabilidad.
*   **Gestión de Errores Avanzada:**
    *   Mejorar el manejo de errores en el backend para proveer mensajes más específicos y útiles al usuario final.
*   **Contenerización con Docker:**
    *   Crear un `Dockerfile` y la configuración necesaria para empaquetar la aplicación, simplificando el despliegue y asegurando la consistencia del entorno.



# --------------------------------------------------------------------------------------------------------------------------------------------------

# Avances

#### 2025-11-02

*   Se modificó el sistema para que acepte el campo `docNum` sin importar si está en mayúsculas o minúsculas (ej: `docNum`, `DOCNUM`, `DocNum`).
    *   **Backend (`app.py`):**
        *   En la validación inicial del archivo, la comprobación de la existencia de las columnas `email` y `docNum` ahora es *case-insensitive*.
        *   Durante el procesamiento del archivo, todos los nombres de las columnas se convierten a minúsculas. Esto asegura que el sistema pueda encontrar y procesar los campos `email` y `docNum` de manera consistente.
    *   **Frontend (`script.js`):**
        *   La lógica que deshabilita la selección de los campos obligatorios (`email` y `docNum`) en la lista de columnas también se ha hecho *case-insensitive*.

#### 2025-11-02 (Continuación)

*   **Funcionalidad "Seleccionar/Deseleccionar Todos":**
    *   Se implementó un botón que permite a los usuarios seleccionar o deseleccionar todas las columnas con un solo clic, mejorando la usabilidad.
    *   El texto del botón cambia dinámicamente entre "Seleccionar Todos" y "Deseleccionar Todo" según el estado de los checkboxes.
*   **Estado Inicial de las Columnas:**
    *   Se modificó el comportamiento por defecto para que todas las columnas opcionales aparezcan deseleccionadas al cargar un archivo. Los campos obligatorios (`email` y `docNum`) permanecen seleccionados y bloqueados.
*   **Exclusión en "Seleccionar Todos":**
    *   Se ajustó la funcionalidad del botón "Seleccionar Todos" para que ignore y no seleccione las columnas específicas de la plataforma ICOMM (aquellas que comienzan con `icommkt`).
*   **Feedback Visual en Carga de Archivos:**
    *   Se implementó un efecto visual (`dragover`) en la zona de carga de archivos para indicar cuando un archivo está siendo arrastrado sobre ella.
    *   Se añadió lógica JavaScript para manejar los eventos de arrastrar y soltar, permitiendo la carga de archivos mediante esta interacción.
*   **Funcionalidad de Previsualización de Datos:**
    *   Se introdujo un paso intermedio de previsualización antes de la limpieza final. El botón "Limpiar Base" fue reemplazado por "Previsualizar".
    *   Se añadió una nueva sección en la interfaz de usuario para mostrar una tabla con las primeras filas de los datos procesados, permitiendo al usuario verificar la selección de columnas y la limpieza de emails.
    *   Se creó un nuevo endpoint `/api/preview-file` en el backend para generar esta previsualización, asegurando que los datos se muestren con el formato y las columnas correctas.
    *   Se añadió un botón "Volver a Seleccionar" para regresar a la selección de columnas desde la previsualización.
*   **Búsqueda y Filtro de Columnas:**
    *   Se añadió un campo de búsqueda en la sección de selección de columnas, permitiendo a los usuarios filtrar la lista de columnas por nombre.
    *   La funcionalidad de búsqueda es *case-insensitive* y oculta/muestra las columnas dinámicamente.

#### 2025-11-03

*   **Reordenamiento de Columnas**:
    *   Se ha implementado una lógica para reordenar las columnas en el archivo de salida, asegurando que `email` y `docNum` siempre aparezcan como las dos primeras columnas, seguidas por el resto de las columnas seleccionadas.
*   **Previsualización de Datos**:
    *   Se ha añadido una nueva funcionalidad de previsualización que permite al usuario ver las primeras 10 filas de los datos procesados antes de iniciar la limpieza completa. Esto se ha logrado a través de un nuevo endpoint (`/api/preview-file`) y la lógica correspondiente en el backend.

#### 2025-11-03 (Continuación)

*   **Corrección de Error de Codificación de Archivos**:
    *   Se solucionó un error crítico que impedía procesar archivos que no estuvieran en codificación `UTF-8`.
    *   **Backend (`app.py`):
        *   Se modificaron las funciones `get_columns`, `preview_file` y `process_csv_task` para manejar de forma robusta la codificación de los archivos.
        *   El sistema ahora intenta leer los archivos CSV con `UTF-8` y, si detecta un `UnicodeDecodeError`, reintenta automáticamente con la codificación `latin-1`. Esto asegura la compatibilidad con una mayor variedad de archivos, especialmente aquellos que contienen caracteres como la 'Ñ'.

#### 2025-11-03 (Continuación)

*   **Refactorización del Frontend (`script.js`):**
    *   Se ha refactorizado completamente el archivo `static/js/script.js` para mejorar la mantenibilidad y escalabilidad, cumpliendo con el punto 1 de la versión 2.0 del roadmap.
    *   El código se ha organizado en un objeto principal `App` que encapsula diferentes módulos lógicos:
        *   `state`: Para gestionar el estado de la aplicación.
        *   `elements`: Para centralizar la selección de elementos del DOM.
        *   `ui`: Para todas las manipulaciones de la interfaz de usuario.
        *   `api`: Para la comunicación con el backend.
        *   `events` y `handlers`: Para la gestión de eventos.
        *   `dragDrop`: Para la funcionalidad de arrastrar y soltar.
    *   Este cambio no introduce nueva funcionalidad visible para el usuario pero establece una base de código mucho más limpia y robusta para futuras mejoras.


---

