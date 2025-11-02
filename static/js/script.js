document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const csvFileInput = document.getElementById('csv-file');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    const fileNameDisplay = document.getElementById('file-name');
    const columnsSection = document.getElementById('columns-section');
    const columnsList = document.getElementById('columns-list');
    const previewBtn = document.getElementById('preview-btn');
    const processBtn = document.getElementById('process-btn');
    const toggleSelectBtn = document.getElementById('toggle-select-btn');
    const previewSection = document.getElementById('preview-section');
    const previewTableContainer = document.getElementById('preview-table-container');
    const backToColumnsBtn = document.getElementById('back-to-columns-btn');
    const searchColumnsInput = document.getElementById('search-columns');

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

    // Cerrar modal con la tecla Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // --- Drag & Drop Feedback ---
    const preventDefaults = e => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Prevent browser from opening file if dropped outside the dropzone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults);
    });

    // Add visual feedback to the dropzone
    fileUploadLabel.addEventListener('dragenter', () => {
        fileUploadLabel.classList.add('dragover');
    });
    
    // We must prevent the default behavior on dragover to allow a drop.
    fileUploadLabel.addEventListener('dragover', preventDefaults);

    fileUploadLabel.addEventListener('dragleave', () => {
        fileUploadLabel.classList.remove('dragover');
    });

    fileUploadLabel.addEventListener('drop', (e) => {
        fileUploadLabel.classList.remove('dragover');
        csvFileInput.files = e.dataTransfer.files;
        csvFileInput.dispatchEvent(new Event('change'));
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
        // Limpiar la lista antes de agregar nuevas columnas
        columnsList.innerHTML = '';

        const emailCols = columns.filter(c => c.toLowerCase() === 'email');
        const docnumCols = columns.filter(c => c.toLowerCase() === 'docnum');
        const icomCols = columns.filter(c => c.toLowerCase().startsWith('icommkt')).sort();
        const otherCols = columns.filter(c => 
            c.toLowerCase() !== 'email' && 
            c.toLowerCase() !== 'docnum' && 
            !c.toLowerCase().startsWith('icommkt')
        ).sort();

        const sortedColumns = [...emailCols, ...docnumCols, ...otherCols, ...icomCols];

        sortedColumns.forEach(column => {
            const item = document.createElement('div');
            item.classList.add('column-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = column;
            checkbox.name = 'columns';
            checkbox.value = column;
            checkbox.checked = false; // Por defecto, ninguna seleccionada

            const label = document.createElement('label');
            label.htmlFor = column;
            label.textContent = column;

            // Comportamiento especial para columnas iComMkt
            if (column.toLowerCase().startsWith('icommkt')) {
                checkbox.checked = false;
                label.classList.add('icom-column');
            }

            // Campos obligatorios no se pueden deseleccionar (case-insensitive)
            if (column.toLowerCase() === 'email' || column.toLowerCase() === 'docnum') {
                checkbox.disabled = true;
                checkbox.checked = true; // Asegurarse de que siempre esté chequeado
            }

            item.appendChild(checkbox);
            item.appendChild(label);
            columnsList.appendChild(item);
        });
    }

    toggleSelectBtn.addEventListener('click', () => {
        let checkboxes = columnsList.querySelectorAll('input[type="checkbox"]:not(:disabled)');
        
        // Filter out checkboxes that start with 'icommkt' (case-insensitive)
        checkboxes = Array.from(checkboxes).filter(cb => !cb.id.toLowerCase().startsWith('icommkt'));

        const allSelected = checkboxes.every(checkbox => checkbox.checked);

        checkboxes.forEach(checkbox => {
            checkbox.checked = !allSelected;
        });

        toggleSelectBtn.textContent = allSelected ? 'Seleccionar Todos' : 'Deseleccionar Todo';
    });

    searchColumnsInput.addEventListener('input', () => {
        const searchTerm = searchColumnsInput.value.toLowerCase();
        const columnItems = columnsList.querySelectorAll('.column-item');

        columnItems.forEach(item => {
            const label = item.querySelector('label');
            const columnName = label.textContent.toLowerCase();

            if (columnName.includes(searchTerm)) {
                item.style.display = 'flex'; // Show the item
            } else {
                item.style.display = 'none'; // Hide the item
            }
        });
    });

    function displayPreview(previewData, columns) {
        previewTableContainer.innerHTML = ''; // Clear previous preview

        if (!previewData || previewData.length === 0) {
            previewTableContainer.innerHTML = '<p>No hay datos para previsualizar.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table header
        const headerRow = document.createElement('tr');
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create table body
        previewData.forEach(rowData => {
            const tr = document.createElement('tr');
            columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = rowData[column];
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        previewTableContainer.appendChild(table);
    }

    previewBtn.addEventListener('click', async () => {
        const selectedColumns = Array.from(columnsList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        if (selectedColumns.length === 0) {
            showModal('Por favor, seleccioná al menos una columna.', 'error');
            return;
        }

        // --- Spinner Logic ---
        previewBtn.disabled = true;
        const originalBtnText = previewBtn.innerHTML;
        previewBtn.innerHTML = '<span class="spinner"></span> Cargando...';

        try {
            const response = await fetch('/api/preview-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filepath: originalFilepath,
                    columns: selectedColumns
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error del servidor al generar la previsualización.');
            }

            // Generate and display the preview table
            displayPreview(data.preview, data.columns);

            // Show preview section and hide columns section
            columnsSection.classList.add('hidden');
            previewSection.classList.remove('hidden');

        } catch (error) {
            showModal(error.message, 'error');
        } finally {
            // Restore button
            previewBtn.disabled = false;
            previewBtn.innerHTML = originalBtnText;
        }
    });

    backToColumnsBtn.addEventListener('click', () => {
        previewSection.classList.add('hidden');
        columnsSection.classList.remove('hidden');
        previewTableContainer.innerHTML = ''; // Clear the table
    });

    processBtn.addEventListener('click', async () => {
        const selectedColumns = Array.from(columnsList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        if (selectedColumns.length === 0) {
            showModal('Por favor, seleccioná al menos una columna.', 'error');
            return;
        }

        // --- Inicio: Lógica del Spinner ---
        processBtn.disabled = true;
        const originalBtnText = processBtn.innerHTML;
        processBtn.innerHTML = '<span class="spinner"></span> Procesando...';
        // --- Fin: Lógica del Spinner ---

        // Ocultar sección de preview y mostrar progreso
        previewSection.classList.add('hidden');
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

                        // Restaurar botón
                        processBtn.disabled = false;
                        processBtn.innerHTML = originalBtnText;

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
            previewSection.classList.remove('hidden'); // Show preview section again on error

            // Restaurar botón
            processBtn.disabled = false;
            processBtn.innerHTML = originalBtnText;
        }
    });

});
