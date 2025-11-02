# PROMPOT OIGINAL
quiero desarrollar un sistema para poder usarlo de forma interna en la empresa para poder ordenar las bases de datos que me otorga la plataforma de email marketing que usamos (ICOMM).

el problema que tenemos es que cuando descargamos una base que creamos (segmentos), se descarga con todos los campos de la base, que no necesariamente siempre los necesitamos, y además se agregan campos propios de la herramienta, con información adicional de cada cliente, pero que no solemos usar cuando descargamos las bases.

en muchas ocasiones nos pasada descargar un segmento de la base principal que tiene 70 campos y por ahí solamente necesitamos 2/5 campos, además de los 2 obligatorios (más adelante aclarados).

tengo la idea de desarrollar un pequeño programa, en el cual yo pueda elegir el CSV que descargue de la plataforma, el sistema primero lea la cabecera, me liste todas las columnas, con la posibilidad de tildar o no cada campo en función de lo que necesite, y los que no son elegidos se descartan en el nuevo archivo, solamente tengo que poder elegir los campos opcionales, los obligatorios no.

los campos obligatorios son: email, docNum

el campo email es obligatorio, pero también debe ser transformado ya que trae un formato que no necesitamos, un ejemplo: "<123456>test@test.com", cuando todos los valores que están dentro de <> no los necesitamos, y necesitaríamos en este ejemplo que sea "test@test.com".

visualmente se me ocurre un html muy sencillo, para poder seleccionar el CSV, que se listen las columnas, elegir con un checkbox que sí y que quedaría (solo campos opcionales), luego de confirmar todo y empezar con el proceso de limpieza, que se vea una barra de progreso, se avise cuando terminó de procesar y de el nuevo CSV procesado para poder descargarlo.

---

# REGLA MANDATORIA

**NUNCA** debo intentar ejecutar el servidor (`app.py`). El usuario es el único responsable de iniciar el servidor.

---

# Resumen del Proyecto

## Objetivo
Desarrollar una herramienta web interna para limpiar y filtrar archivos CSV exportados de la plataforma de email marketing ICOMM, optimizando las bases de datos para su uso posterior.

## Funcionalidades Principales
1.  **Carga de Archivo:** El usuario podrá subir un archivo CSV desde su computadora.
2.  **Selección de Columnas:** La aplicación leerá las cabeceras del CSV y mostrará una lista de todas las columnas. El usuario podrá seleccionar las columnas que desea conservar.
3.  **Columnas Obligatorias:** Los campos `email` y `docNum` serán incluidos siempre en el archivo final.
4.  **Limpieza de Datos:** El campo `email` se procesará automáticamente para eliminar cualquier información extra, transformando valores como `"<123456>test@test.com"` a `test@test.com`. El campo `docNum` se mantendrá sin cambios.
5.  **Procesamiento y Progreso:** Se mostrará una barra de progreso mientras el sistema procesa el archivo.
6.  **Descarga:** Una vez finalizado el proceso, el usuario recibirá una notificación y podrá descargar el nuevo archivo CSV limpio. El archivo de salida se nombrará con el formato `[nombre_original]_limpio.csv`.

## Manejo de Errores
*   El sistema solo aceptará la subida de archivos con extensión `.csv`.
*   Si un archivo subido no es un CSV válido o no contiene las columnas `email` y `docNum`, se mostrará un mensaje de error claro al usuario.

## Stack Tecnológico
*   **Frontend:** HTML5, CSS3, JavaScript (sin frameworks).
*   **Backend:** Python, utilizando la librería **Pandas** para la manipulación eficiente de grandes volúmenes de datos.

---

### Avances

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

---

# Mejoras Propuestas (Roadmap)

A continuación se detallan las mejoras planificadas para futuras versiones de la herramienta, con el objetivo de enriquecer la experiencia de usuario, ampliar la funcionalidad y mejorar la calidad técnica del proyecto.

### Versión 1.1: Mejoras de Experiencia de Usuario (UX)

*   **Feedback Visual en Carga de Archivos:**
    *   Implementar un cambio de estilo en la zona de "arrastrar y soltar" cuando un archivo se arrastra sobre ella para dar una confirmación visual.
*   **Previsualización de Datos:**
    *   Mostrar una tabla con las primeras filas del archivo procesado (antes de la descarga) para que el usuario pueda verificar que la selección y limpieza de columnas es la correcta.
*   **Búsqueda y Filtro de Columnas:**
    *   Añadir una barra de búsqueda en la sección de selección de columnas para filtrar rápidamente la lista, especialmente útil para archivos con una gran cantidad de campos.

### Versión 1.2: Mejoras de Funcionalidad

*   **Guardar "Presets" de Columnas:**
    *   Desarrollar una función para guardar y cargar selecciones de columnas predefinidas, agilizando el trabajo para tareas repetitivas.
*   **Soporte para Archivos Excel:**
    *   Ampliar la compatibilidad de la herramienta para poder procesar archivos en formato `.xlsx` y `.xls`, además de `.csv`.
*   **Reordenamiento de Columnas:**
    *   Permitir al usuario reordenar las columnas mediante "arrastrar y soltar" (drag and drop) para definir la estructura del archivo de salida.

### Versión 2.0: Mejoras Técnicas y de Mantenimiento

*   **Modularización del Código Frontend:**
    *   Refactorizar el archivo `script.js` en módulos más pequeños y específicos (UI, API, etc.) para facilitar el mantenimiento y la escalabilidad.
*   **Gestión de Errores Avanzada:**
    *   Mejorar el manejo de errores en el backend para proveer mensajes más específicos y útiles al usuario final.
*   **Contenerización con Docker:**
    *   Crear un `Dockerfile` y la configuración necesaria para empaquetar la aplicación, simplificando el despliegue y asegurando la consistencia del entorno.
