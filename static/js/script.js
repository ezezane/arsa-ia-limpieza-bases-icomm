document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const csvFileInput = document.getElementById('csv-file');
    const fileNameDisplay = document.getElementById('file-name');
    const columnsSection = document.getElementById('columns-section');
    const columnsList = document.getElementById('columns-list');
    const processBtn = document.getElementById('process-btn');

    // Modal
    const modal = document.getElementById('notification-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalContent = modal.querySelector('.modal-content');
    const closeModalBtn = modal.querySelector('.close-btn');
    
    let originalFilepath = '';

    function showModal(message, type = 'error') {
        modalMessage.textContent = message;
        modalContent.classList.remove('error', 'success');
        modalContent.classList.add(type);
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    csvFileInput.addEventListener('change', async () => {
        const file = csvFileInput.files[0];

        if (file) {
            fileNameDisplay.textContent = file.name;
        } else {
            fileNameDisplay.textContent = '';
            columnsSection.classList.add('hidden');
            columnsList.innerHTML = '';
            return;
        }

        const formData = new FormData();
        formData.append('csv_file', file);

        // Reset UI for new file
        columnsSection.classList.add('hidden');
        columnsList.innerHTML = '';

        try {
            const response = await fetch('/api/get-columns', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error del servidor');
            }

            originalFilepath = data.filepath;
            displayColumns(data.columns);
            columnsSection.classList.remove('hidden');

        } catch (error) {
            showModal(error.message, 'error');
            uploadForm.reset();
            fileNameDisplay.textContent = '';
        }
    });

    function displayColumns(columns) {
        columns.forEach(column => {
            const item = document.createElement('div');
            item.classList.add('column-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = column;
            checkbox.name = 'columns';
            checkbox.value = column;
            checkbox.checked = true; // Por defecto, todas seleccionadas

            const label = document.createElement('label');
            label.htmlFor = column;
            label.textContent = column;

            // Campos obligatorios no se pueden deseleccionar (case-insensitive)
            if (column.toLowerCase() === 'email' || column.toLowerCase() === 'docnum') {
                checkbox.disabled = true;
            }

            item.appendChild(checkbox);
            item.appendChild(label);
            columnsList.appendChild(item);
        });
    }

    // --- Aquí agregaremos la lógica para el botón de procesar ---

    processBtn.addEventListener('click', async () => {
        const selectedColumns = Array.from(columnsList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        if (selectedColumns.length === 0) {
            showModal('Por favor, seleccioná al menos una columna.', 'error');
            return;
        }

        // Ocultar sección de columnas y mostrar progreso
        columnsSection.classList.add('hidden');
        document.getElementById('progress-section').classList.remove('hidden');
        document.getElementById('download-section').classList.add('hidden');

        // Reset progress bar
        const progressBar = document.getElementById('progress');
        const progressText = document.getElementById('progress-text');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressText.textContent = 'Iniciando...';

        try {
            // 1. Iniciar el procesamiento y obtener el Task ID
            const initialResponse = await fetch('/api/process-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    filepath: originalFilepath,
                    columns: selectedColumns
                })
            });

            const initialData = await initialResponse.json();

            if (!initialResponse.ok) {
                throw new Error(initialData.error || 'Error del servidor al iniciar el proceso.');
            }

            const taskId = initialData.task_id;
            progressText.textContent = 'Preparando el archivo...';

            // 2. Sondear el progreso
            const pollInterval = setInterval(async () => {
                try {
                    const progressResponse = await fetch(`/api/progress/${taskId}`);
                    const progressData = await progressResponse.json();

                    if (progressData.status === 'processing') {
                        const progress = progressData.progress || 0;
                        progressBar.style.width = `${progress}%`;
                        progressBar.textContent = `${progress}%`;
                        progressText.textContent = `Procesando... (${progress}%)`;
                    } else if (progressData.status === 'complete') {
                        clearInterval(pollInterval);
                        progressBar.style.width = `100%`;
                        progressBar.textContent = `100%`;
                        progressText.textContent = '¡Completado!';

                        // Mostrar sección de descarga
                        document.getElementById('progress-section').classList.add('hidden');
                        const downloadSection = document.getElementById('download-section');
                        const downloadLink = document.getElementById('download-link');
                        
                        downloadLink.href = progressData.result;
                        downloadSection.classList.remove('hidden');
                        showModal('¡Tu archivo ha sido procesado con éxito!', 'success');

                    } else if (progressData.status === 'error') {
                        clearInterval(pollInterval);
                        throw new Error(progressData.error || 'Ocurrió un error en el servidor.');
                    }
                } catch (pollError) {
                    clearInterval(pollInterval);
                    throw pollError; // Lanza el error al catch principal
                }
            }, 2000); // Consultar cada 2 segundos

        } catch (error) {
            document.getElementById('progress-section').classList.add('hidden');
            showModal(error.message, 'error');
            columnsSection.classList.remove('hidden');
        }
    });

});
