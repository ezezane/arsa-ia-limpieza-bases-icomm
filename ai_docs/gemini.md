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
4.  **Limpieza de Datos:** El campo `email` se procesará automáticamente para eliminar cualquier información extra, transformando valores como `"<123456>test@test.com"` a `test@test.com`.
5.  **Generación Automática de `docnum`:** Si la columna `docnum` no existe, se genera automáticamente a partir del contenido entre `<` y `>` en la columna `email`.
6.  **Exportación Múltiple por Segmento:** Permite subir un archivo y generar múltiples CSV segmentados por categorías como bancos, tarjetas, cobrands y partners.
7.  **Procesamiento y Progreso:** Se mostrará una barra de progreso mientras el sistema procesa el archivo.
8.  **Descarga:** Una vez finalizado el proceso, el usuario recibirá una notificación y podrá descargar el nuevo archivo CSV limpio o un archivo ZIP en el caso de la exportación múltiple.

## Manejo de Errores
*   El sistema solo aceptará la subida de archivos con extensión `.csv`.
*   Si un archivo subido no es un CSV válido o no contiene las columnas requeridas, se mostrará un mensaje de error claro al usuario.

## Stack Tecnológico
*   **Frontend:** HTML5, CSS3, JavaScript (sin frameworks).
*   **Backend:** Python (Flask), utilizando la librería **Pandas** para la manipulación eficiente de grandes volúmenes de datos.

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

## Feature: Exportación Múltiple por Segmento

### 1. Objetivo
Crear una nueva funcionalidad que permita al usuario subir una base de datos y generar múltiples archivos CSV, cada uno segmentado por un criterio específico (banco, tarjeta, etc.). El objetivo es crear audiencias personalizadas para plataformas de publicidad.

### 2. Lógica de Negocio
1.  **Entrada:** El usuario sube un archivo CSV que debe contener la columna `email` y al menos una de las siguientes columnas de segmentación: `EMIS_BANCOS`, `EMIS_TARJETAS`, `PLUS_PARTNER_COBRAND`, `PLUS_PARTNER_EMPRESAS`.
2.  **Configuración:** El sistema se basa en archivos de configuración para identificar los valores "conocidos" para cada categoría:
    -   `config/bancos_conocidos.txt`
    -   `config/tarjetas_conocidas.txt`
    -   `config/arplus_cobrand.txt`
    -   `config/arplus_partners.txt`
3.  **Procesamiento:**
    -   El sistema lee el CSV subido en segundo plano.
    -   Para cada fila, analiza las columnas de segmentación. Los valores en estas columnas pueden estar separados por comas (ej: "BBVA,MACRO,GALICIA").
    -   Para cada valor individual, verifica si existe en los archivos de configuración correspondientes.
    -   Si un valor existe, el `email` de esa fila se añade a una lista para ese segmento específico (ej: lista para "BBVA").
    -   Un mismo email puede pertenecer a múltiples listas.
    -   **Corrección Implementada:** Se solucionó un error inicial donde solo se guardaba el último email encontrado para cada segmento. La lógica ahora agrega correctamente todos los emails a la lista correspondiente.
4.  **Salida:**
    -   Se genera un archivo CSV por cada segmento seleccionado por el usuario que tenga al menos un email asociado.
    -   Cada CSV contiene únicamente una columna: `email`.
    -   Todos los archivos CSV generados se empaquetan en un único archivo `.zip` con el formato `exportacion_multiple_[timestamp].zip`.

### 3. Interfaz de Usuario y Experiencia (UX)
-   Se añadió una pestaña "Exportación Múltiple" en la interfaz.
-   El flujo de usuario consta de varios pasos:
    1.  **Subida:** El usuario selecciona un archivo CSV. Una barra de progreso muestra el estado de la subida.
    2.  **Procesamiento Inicial:** Una segunda barra de progreso muestra el análisis del archivo en el servidor para extraer las categorías y los ítems únicos.
    3.  **Selección:** La interfaz muestra dinámicamente las categorías encontradas (Bancos, Tarjetas, etc.) con sus respectivos ítems. El usuario puede seleccionar ítems individuales o categorías completas.
    4.  **Exportación Final:** Al iniciar la exportación, una tercera barra de progreso muestra el estado de la generación de los archivos CSV y el empaquetado del ZIP.
    5.  **Descarga:** Se proporciona un enlace para descargar el archivo `.zip` final.

### 4. Impacto en el Código
-   **`process_large_csv.py`**:
    -   Script independiente para pre-procesar y generar los archivos de configuración.
-   **`app.py`**:
    -   Se crearon las rutas `/api/multi-export-initial-process` y `/api/multi-export-process` para manejar el flujo en segundo plano con un `task_id`.
    -   Se implementó la lógica de lectura de configs, procesamiento del CSV, y generación del ZIP.
-   **`templates/index.html`**:
    -   Se añadió la estructura HTML para la nueva pestaña y las distintas secciones del proceso.
-   **`static/js/script.js`**:
    -   Se implementó la lógica para manejar el flujo de varios pasos, las barras de progreso (usando `XMLHttpRequest` y `polling`), y la UI de selección dinámica.
-   **Nuevos Archivos de Configuración**:
    -   `config/bancos_conocidos.txt`
    -   `config/tarjetas_conocidas.txt`
    -   `config/arplus_cobrand.txt`
    -   `config/arplus_partners.txt`


# PROMPT para pestaña CRM

necesito agregar una nueva funcionalidad al desarrollo que ya tenemos.

necesito sumar una nueva pestaña que se llame CRM.

en esta pestaña trabajaremos las bases que nos comparte el equipo de CRM, que vienen muy desordenadas, y para el tipo de trabajo que hacemos con esas bases, las necesitamos más simplificadas.

normalmente nos comparten una base con varias columnas, de las cuales las últimas sulen ser 3 de email, te dejo un ejemplo en la carpeta @modelo base crm.csv con datos simulados por privacidad.

de todos los datos que me llegan solo necesito los que dicen email, en este caso: MAIL, MAIL2, Ar_Email.

como estos los tengo que subir a una plataforma de email marketing, necesito:
* un correo por línea
* eliminar duplicados
* limpiar datos sucios en el correo si hay

también tengo casos que, dentro de una celda tengo 2 mails juntos separados por punto y coma, guiones, barras (/), etc, en ese caso necesito que si son mails distintos se guarde uno por línea.

te cuento como lo hago yo manualmente para ver si te sirve mi proceso...

primero abro el archivo en excel, selecciono todas las columnas que NO son email y las elimino, luego lo que hago es copiar todo el contenido de la segunda columna y lo pego al final de la primera, y lo mismo con la tercera columna, pero todo el contenido al final de la primera columna, quedando todo junto en uno solo.

luego ordeno alfabéticamente por email, y me quito los duplicados.

luego en excel selecciono separar por punto y coma, los nuevos correos los agrego nuevamente al final todas las veces que sea necesario, hasta que queden todos los correos separados por línea, vuelvo a ordenar y elimino duplicados nuevamente.

esto lo repito todas las veces que sea necesario según la cantidad de columnas que tenga el archivo y los tipos de separadores (coma, punto y coma, guiones, barras, etc).

esto lo hago manualmente, y me toma bastante tiempo, por eso necesito que me ayudes a automatizarlo.

---

## 🤖 Análisis y Consultas - Gemini (18/12/2025)

### ✅ Entendí correctamente

1. **Nueva pestaña "CRM"** en la interfaz existente
2. **Objetivo**: Consolidar múltiples columnas de email en una sola lista limpia
3. **Proceso automatizado**:
   - Detectar columnas que contengan emails (MAIL, MAIL2, Ar_Email, etc.)
   - Unificar todos los emails en una sola columna
   - Separar emails que estén juntos en una celda (separadores: `;`, `-`, `/`, `,`, etc.)
   - Eliminar duplicados
   - Limpiar datos sucios
   - Resultado: un CSV con una sola columna `email`, un correo por línea

### ❓ Consultas antes de desarrollar

Por favor respondé debajo de cada pregunta para que quede documentado:

#### 1. Detección automática vs. selección manual de columnas
¿Preferís que el sistema detecte automáticamente las columnas de email (buscando patrones como "mail", "email", "correo" en el nombre), o que te muestre todas las columnas y vos selecciones cuáles son las de email?

**Tu respuesta:** 
Me gustaría que el sistema detecte automáticamente las columnas de email, pero que sea una sugerencia, que me muestre todas las columnas y que yo pueda seleccionar las que considero que son de email.

---

#### 2. Validación de formato de email
¿Querés que el sistema valide que cada email tenga un formato válido (ejemplo: `algo@dominio.com`) y descarte los que no cumplan? ¿O preferís conservar todo y revisar después?

**Tu respuesta:** 
Prefiero que conservemos todo, y que de última instancia el rechazo lo haga el proveedor de la plataforma de email marketing.
Sí lo vamos a contar en las estadísticas de registros inválidos.

---

#### 3. Separadores de emails en una celda
Mencionaste punto y coma, guiones, barras. ¿Hay algún otro separador que uses frecuentemente? Te listo los que voy a implementar:
- Punto y coma (`;`)
- Coma (`,`)
- Barra (`/`)
- Guión (`-`)
- Pipe (`|`)
- Espacio (` `)

¿Falta alguno? ¿Sobra alguno (ejemplo: el guión podría ser problemático porque hay emails con guiones válidos como `juan-perez@email.com`)?

**Tu respuesta:** 
Esas opciones está bien. El tema del guión, es solo válido si está entre espacios, ej: "test@test.com - test2@test.com".

---

#### 4. Manejo de celdas vacías o con datos inválidos
Si una celda tiene texto pero no es un email válido (ejemplo: "NO TIENE", "N/A", "-", etc.), ¿qué hacemos?
- **Opción A:** Descartarlo automáticamente
- **Opción B:** Mostrarlo en una lista aparte de "registros inválidos" para que revises

**Tu respuesta:** 
Es similar a la pregunta 2. Si no tiene @, se elimina el registro. Sí lo contamos en las estadísticas de registros inválidos.

---

#### 5. Previsualización
¿Querés ver una previsualización antes de procesar (como en las otras pestañas), mostrando:
- Cantidad de emails únicos encontrados
- Cantidad de duplicados eliminados
- Cantidad de emails separados de celdas múltiples
- Primeros 10 emails como muestra

**Tu respuesta:** 
Sí, me gustaría ver una previsualización antes de procesar de 10 ejemplos, y las estadísticas al final.
---

#### 6. Nombre del archivo de salida
¿Qué formato preferís para el archivo de salida?
- **Opción A:** `[nombre_original]_emails_limpios.csv`
- **Opción B:** `crm_emails_[fecha].csv`
- **Opción C:** Otro (especificá)

**Tu respuesta:** 
opción A, formato csv siempre.
---

### 💡 Propuesta técnica inicial

Una vez que me confirmes las respuestas, el desarrollo incluiría:

1. **Nueva pestaña en `index.html`** con diseño consistente con las existentes
2. **Nueva ruta en `app.py`**: `/api/crm-process`
3. **Lógica de procesamiento**:
   - Leer CSV con pandas
   - Identificar columnas de email
   - Unificar todas las columnas en una serie
   - Aplicar split por múltiples separadores
   - Limpiar espacios, convertir a minúsculas (opcional)
   - Eliminar duplicados y ordenar
   - Exportar CSV final
4. **Frontend en `script.js`** con barra de progreso y descarga

### ⏳ Tiempo estimado de desarrollo
Aproximadamente 2-3 horas una vez aprobado el diseño.