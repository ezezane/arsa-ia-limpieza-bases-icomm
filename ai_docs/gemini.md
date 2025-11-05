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

## Feature: Generación Automática de `docnum` para Bases de Actividad

### 1. Objetivo

Dar soporte a los archivos CSV de "actividad" que no contienen la columna `docnum`, pero que tienen esta información anidada dentro del campo `email`.

### 2. Lógica de Negocio

Cuando un archivo CSV es subido, el sistema debe:

-   **Detectar automáticamente** si el archivo contiene la columna `email` pero carece de la columna `docnum`.
-   Si este es el caso, **no debe fallar la validación**. En su lugar, debe activar un flujo de procesamiento especial.

El flujo especial consiste en:

1.  **Crear una nueva columna `docnum`** en los datos.
2.  Para cada fila, **analizar el campo `email`**:
    -   Extraer el contenido que se encuentre entre los caracteres `<` y `>`.
    -   Asignar el valor extraído al campo `docnum` de esa fila.
    -   Si no se encuentra contenido entre `<` y `>`, el campo `docnum` debe quedar vacío.
3.  **Limpiar el campo `email`**: Después de la extracción, el campo `email` también debe ser limpiado para que contenga solo la dirección de correo (si aplica), manteniendo la consistencia con la función `clean_email` existente.

### 3. Interfaz de Usuario y Experiencia (UX)

Para mantener la simplicidad de la interfaz, no se añadirá un switch o botón manual. El proceso será automático, pero se notificará al usuario:

-   **Notificación en el Frontend:** Cuando se detecte la ausencia de `docnum`, la interfaz mostrará un mensaje informativo al usuario.
    -   *Ejemplo de mensaje:* "No se encontró la columna 'docnum'. Se generará extrayendo los datos del campo 'email'. Por favor, revise la previsualización para confirmar el resultado."
-   **Verificación en Previsualización:** El usuario podrá ver la nueva columna `docnum` y los datos extraídos en la tabla de previsualización. Este paso es crucial para que el usuario valide que la extracción automática fue correcta antes de procesar el archivo completo.

### 4. Impacto en el Código

-   **`app.py`**:
    -   `validate_and_get_columns`: Modificar para que no falle si `docnum` está ausente, y en su lugar, devuelva un indicador de que se necesita generar el `docnum`.
    -   `generate_preview_data`: Añadir la lógica para crear el `docnum` y mostrarlo en la previsualización.
    -   `process_csv_task`: Añadir la misma lógica de creación de `docnum` durante el procesamiento final por chunks.
-   **`script.js`**:
    -   Añadir la lógica para recibir el indicador desde el backend y mostrar el mensaje de notificación al usuario.

---

## Feature: Exportación Múltiple por Segmento (Bancos y Tarjetas)

### 1. Objetivo
Crear una nueva funcionalidad que permita al usuario subir una base de datos y generar múltiples archivos CSV, cada uno segmentado por un banco o tarjeta de crédito específico. El objetivo es crear audiencias personalizadas para plataformas de publicidad.

### 2. Lógica de Negocio
1.  **Entrada:** El usuario sube un archivo CSV que debe contener las columnas `email`, `EMIS_BANCOS` y `EMIS_TARJETAS`.
2.  **Configuración:** El sistema se basará en dos archivos de configuración para identificar los bancos y tarjetas "conocidos":
    -   `config/bancos_conocidos.txt`
    -   `config/tarjetas_conocidas.txt`
    Cada archivo contendrá una lista de nombres válidos, uno por línea.
3.  **Procesamiento:**
    -   El sistema leerá el CSV subido.
    -   Para cada fila, analizará las columnas `EMIS_BANCOS` y `EMIS_TARJETAS`.
    -   Los valores en estas columnas están separados por comas (ej: "BBVA,MACRO,GALICIA"). El sistema dividirá estas cadenas en valores individuales.
    -   Para cada valor individual (banco o tarjeta), verificará si existe en los archivos de configuración.
    -   Si un valor existe (ej: "BBVA" está en `bancos_conocidos.txt`), el `email` de esa fila se añadirá a una lista para "BBVA".
    -   Los valores que no estén en los archivos de configuración (incluyendo "OTROS_BANCOS", "OTRAS_TARJETAS") serán ignorados y no se generará un archivo para ellos.
    -   Un mismo email puede pertenecer a múltiples listas si el cliente tiene varios bancos/tarjetas.
4.  **Salida:**
    -   Se generará un archivo CSV por cada banco y tarjeta "conocido" que tenga al menos un email asociado.
    -   Cada CSV contendrá únicamente una columna: `email`.
    -   Todos los archivos CSV generados se empaquetarán en un único archivo `.zip` para facilitar la descarga. El nombre del archivo será, por ejemplo, `exportacion_multiple_[timestamp].zip`.

### 3. Interfaz de Usuario y Experiencia (UX)
-   Se añadirá una nueva sección o pestaña en `index.html` titulada "Exportación Múltiple".
-   Esta sección tendrá su propio formulario con un campo para subir el archivo y un botón de "Procesar".
-   La interfaz mostrará notificaciones de estado (subiendo, procesando, completado) y proporcionará el enlace de descarga para el archivo `.zip` final.

### 4. Impacto en el Código
-   **`process_large_csv.py`**:
    -   Script independiente para pre-procesar grandes archivos CSV y generar los archivos de configuración (`bancos_conocidos.txt`, `tarjetas_conocidas.txt`, `arplus_cobrand.txt`, `arplus_partners.txt`) con valores únicos y limpios.
-   **`app.py`**:
    -   Crear una nueva ruta (`/multi-export`) que manejará la lógica de esta funcionalidad.
    -   Implementar la lectura de los archivos de configuración.
    -   Implementar la lógica de procesamiento del CSV, la distribución de emails y la generación de los archivos CSV en memoria.
    -   Añadir la funcionalidad para crear el archivo `.zip` y enviarlo al cliente.
-   **`templates/index.html`**:
    -   Añadir el nuevo bloque de HTML para el formulario de "Exportación Múltiple".
-   **`static/js/script.js`**:
    -   Añadir un nuevo `event listener` para el formulario de exportación múltiple que gestione la petición AJAX y la respuesta.
-   **Nuevos Archivos**:
    -   `config/bancos_conocidos.txt`
    -   `config/tarjetas_conocidas.txt`
    -   `config/arplus_cobrand.txt`
    -   `config/arplus_partners.txt`
