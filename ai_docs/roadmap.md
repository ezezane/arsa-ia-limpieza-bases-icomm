# Roadmap y Avances del Proyecto

Este documento sirve como una hoja de ruta para el desarrollo de la herramienta de limpieza de bases de datos. Aquí se detallan tanto las mejoras planificadas a futuro como un registro cronológico de los avances y cambios implementados en el proyecto.

# Mejoras Propuestas (Roadmap)

A continuación se detallan las mejoras planificadas para futuras versiones de la herramienta, con el objetivo de enriquecer la experiencia de usuario, ampliar la funcionalidad y mejorar la calidad técnica del proyecto.

### Versión 1.2: Mejoras de Funcionalidad

*   **Guardar "Presets" de Columnas:**
    *   Desarrollar una función para guardar y cargar selecciones de columnas predefinidas, agilizando el trabajo para tareas repetitivas.
*   **Soporte para Archivos Excel:**
    *   Ampliar la compatibilidad de la herramienta para poder procesar archivos en formato `.xlsx` y `.xls`, además de `.csv`.


### Versión 2.0: Mejoras Técnicas y de Mantenimiento

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
        *   Se modificaron las funciones `get_csv_encoding` para evitar la duplicación de código en la detección de la codificación de archivos.
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

#### 2025-11-03 (Continuación)

*   **Gestión de Errores Avanzada en el Backend (`app.py`)**:
    *   Se ha implementado el manejo de errores avanzado en el backend, abordando ahora sí el primer punto de la V2.0 del roadmap.
    *   El sistema ahora captura excepciones específicas como `FileNotFoundError`, `KeyError`, `MemoryError`, y errores de parseo de pandas.
    *   En lugar de errores genéricos, se muestran mensajes claros al usuario para guiarlo en la solución del problema (ej: "El archivo es demasiado grande", "Hubo un problema al leer el archivo CSV").
    *   Esto incrementa la robustez y mejora significativamente la experiencia de usuario.

#### 2025-11-03 (Continuación)

*   **Refactorización Integral del Backend (`app.py`)**:
    *   Se ha realizado una refactorización profunda del archivo `app.py` para mejorar la mantenibilidad, escalabilidad y legibilidad del código.
    *   **Centralización de la lógica de lectura de archivos:** Se creó la función `get_csv_encoding` para evitar la duplicación de código en la detección de la codificación de archivos.
    *   **Separación de la lógica de negocio:** Se extrajo la lógica de negocio de las rutas de la API a funciones auxiliares (`validate_and_get_columns`, `generate_preview_data`, `reorder_chunk_columns`), haciendo el código más modular y fácil de probar.
    *   **Gestión de la configuración:** Se centralizaron las variables de configuración (separador de CSV, tamaño de chunk, etc.) en el objeto `app.config` de Flask para una gestión más sencilla.

#### 2025-11-03 (Continuación)

*   **Feature: Generación Automática de `docnum`**:
    *   Se ha implementado una nueva funcionalidad para procesar archivos CSV que no contienen la columna `docnum`.
    *   **Backend (`app.py`):**
        *   El sistema ahora detecta automáticamente la ausencia de la columna `docnum` y activa un modo de generación.
        *   Se extrae el `docnum` del contenido que se encuentra entre los caracteres `<` y `>` en la columna `email`.
        *   Se creó una lógica de procesamiento (`process_dataframe_logic`) para manejar de forma centralizada la limpieza de datos en ambos casos (con y sin `docnum` inicial).
    *   **Frontend (`script.js`):**
        *   La interfaz ahora muestra una notificación al usuario cuando se activa el modo de generación de `docnum`.
        *   Se ajustó la comunicación con el backend para gestionar el nuevo flujo de trabajo.
    *   Esta funcionalidad aumenta la flexibilidad de la herramienta, permitiendo procesar bases de datos de "actividad" que antes eran incompatibles.

#### 2025-11-03 (Continuación)

*   **Mejoras de UX en Feedback al Usuario**:
    *   **Conteo de Registros Procesados:** Al finalizar la limpieza, la sección de descarga ahora muestra el número total de registros que se procesaron, dando al usuario una confirmación cuantitativa del trabajo realizado.
    *   **Mensaje de Advertencia Destacado:** Se mejoró el estilo visual del mensaje que notifica la generación automática de `docnum`. Ahora se muestra con un color de fondo y texto de advertencia para asegurar que el usuario note la acción automática que está tomando el sistema.

#### 2025-11-04

*   **Mejora en la Generación de Archivos de Configuración para Exportación Múltiple (`process_large_csv.py`)**:
    *   Se ha refactorizado el script `process_large_csv.py` para asegurar que los archivos de configuración (`bancos_conocidos.txt`, `tarjetas_conocidas.txt`, `arplus_cobrand.txt`, `arplus_partners.txt`) contengan únicamente valores únicos por línea, eliminando duplicados y entradas no deseadas (como "OTROS_BANCOS" o "OTRAS_TARJETAS").
    *   Se ha extendido la funcionalidad para extraer y procesar valores únicos de las columnas `PLUS_PARTNER_COBRAND` y `PLUS_PARTNER_EMPRESAS`, guardándolos en `config/arplus_cobrand.txt` y `config/arplus_partners.txt` respectivamente.
    *   Esto sienta las bases para la implementación robusta de la funcionalidad de "Exportación Múltiple por Segmento".

#### 2025-11-04 (Continuación)

*   **Mejoras en la Interfaz de Exportación Múltiple**:
    *   Se ha mejorado la visualización de las categorías y los ítems en la sección de exportación múltiple. Ahora los ítems se muestran indentados debajo de su categoría correspondiente, mejorando la claridad visual.
    *   Se ha añadido la funcionalidad de seleccionar/deseleccionar todos los ítems de una categoría al marcar/desmarcar el checkbox de la categoría.
    *   Se ha corregido un error que hacía que los ítems de una categoría desaparecieran al desmarcar la categoría. Ahora los ítems permanecen visibles, pero deseleccionados.

*   **Doble Barra de Progreso en Exportación Múltiple**:
    *   Se ha implementado una segunda barra de progreso en la funcionalidad de exportación múltiple para proporcionar un feedback más claro al usuario.
    *   La primera barra de progreso muestra el estado de la subida del archivo.
    *   La segunda barra de progreso muestra el estado del procesamiento inicial del archivo en el servidor.

*   **Documentación del Repositorio (`ai_docs`)**:
    *   Se ha formalizado la documentación interna del proyecto en la carpeta `ai_docs`.
    *   **`roadmap.md`**: Se añadió un encabezado y una descripción para clarificar su doble propósito: servir como hoja de ruta de desarrollo y como registro cronológico de avances.


### 2025-11-04: Mejoras en la Interfaz de Exportación Múltiple

*   **Respuesta de Gemini:**
    *   **Frontend (`script.js`):**
        *   Se reemplazó `fetch` con `XMLHttpRequest` para implementar una barra de progreso de subida de archivos funcional.
        *   Se añadió una segunda barra de progreso para el procesamiento inicial del archivo en el servidor, utilizando un sistema de sondeo (`polling`) con `task_id`.
        *   Se rediseñó la sección de selección de categorías para mostrar una estructura jerárquica con ítems indentados.
        *   Se implementó la lógica para seleccionar/deseleccionar todos los ítems de una categoría.
        *   Se corrigió un error que ocultaba los ítems al desmarcar una categoría.
    *   **Backend (`app.py`):**
        *   Se modificó el endpoint de exportación múltiple para que se ejecute en segundo plano y devuelva un `task_id`.
        *   Se creó una nueva función de tarea en segundo plano para procesar el archivo inicial y actualizar el progreso.
        *   Se corrigió un error de sintaxis (`SyntaxError`) introducido durante la refactorización.
        *   Se mejoró la lógica de actualización del progreso para que sea más granular (basada en filas en lugar de columnas).
    *   **CSS (`style.css`):
        *   Se añadieron estilos para la indentación y el espaciado de las categorías y los ítems.

---
