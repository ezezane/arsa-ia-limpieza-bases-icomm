document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const csvFileInput = document.getElementById('csv-file');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadInstructionText = document.getElementById('upload-instruction-text');
    const columnsSection = document.getElementById('columns-section');
    const columnsList = document.getElementById('columns-list');
    const previewBtn = document.getElementById('preview-btn');
    const processBtn = document.getElementById('process-btn');
    const toggleSelectBtn = document.getElementById('toggle-select-btn');
    const previewSection = document.getElementById('preview-section');
    const previewTableContainer = document.getElementById('preview-table-container');
    const backToColumnsBtn = document.getElementById('back-to-columns-btn');
    const searchColumnsInput = document.getElementById('search-columns');

    const reorderSection = document.getElementById('reorder-section');
    const reorderColumnsList = document.getElementById('reorder-columns-list');
    const confirmReorderBtn = document.getElementById('confirm-reorder-btn');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');

    // Modal
    const modal = document.getElementById('notification-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalContent = modal.querySelector('.modal-content');
    const closeModalBtn = modal.querySelector('.close-btn');
    
    let modalTimeout;

    function showModal(message, type = 'info', autoHide = true) {
        clearTimeout(modalTimeout); // Clear any existing auto-hide timeout
        modalMessage.textContent = message;
        modalContent.className = 'modal-content'; // Reset classes
        modalContent.classList.add(type); // Add type class for styling (e.g., 'error', 'success')
        modal.classList.add('active'); // Show the modal

        if (autoHide && (type === 'success' || type === 'info')) {
            modalTimeout = setTimeout(() => {
                modal.classList.remove('active');
            }, 3000); // Hide after 3 seconds
        }
    }

    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        clearTimeout(modalTimeout);
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('active');
            clearTimeout(modalTimeout);
        }
    });
    
    let originalFilepath = '';
    let draggedItem = null;
    let currentOrderedColumns = []; // To store the final ordered columns for processing

    function populateReorderList(columns) {
        reorderColumnsList.innerHTML = ''; // Clear previous list

        columns.forEach(column => {
            const item = document.createElement('div');
            item.classList.add('column-item');
            item.id = `reorder-item-${column}`; // Unique ID for reorder list

            const label = document.createElement('label');
            label.textContent = column;

            // Mandatory columns are not draggable in reorder list either
            if (column.toLowerCase() === 'email' || column.toLowerCase() === 'docnum') {
                item.classList.add('fixed-column');
                item.draggable = false;
            } else {
                item.draggable = true;
            }

            item.appendChild(label);
            reorderColumnsList.appendChild(item);
        });
    }

    // Drag and Drop for column reordering (now applies to both lists)
    function setupDragAndDrop(listElement) {
        listElement.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('column-item') && e.target.draggable) {
                draggedItem = e.target;
                setTimeout(() => {
                    e.target.classList.add('dragging');
                }, 0);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.id);
            }
        });

        listElement.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            const target = e.target.closest('.column-item');
            if (target && target !== draggedItem && !target.classList.contains('fixed-column')) {
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                listElement.insertBefore(draggedItem, next && target.nextSibling || target);
            }
        });

        listElement.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
    }

    setupDragAndDrop(columnsList); // Apply to initial selection list
    setupDragAndDrop(reorderColumnsList); // Apply to reorder list

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

    csvFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            fileNameDisplay.textContent = '';
            uploadInstructionText.innerHTML = 'Arrastra y suelta tu archivo .csv o haz clic aquí';
            columnsSection.classList.add('hidden');
            return;
        }

        fileNameDisplay.textContent = file.name;
        uploadInstructionText.innerHTML = '<span class="spinner"></span> Cargando...';
        fileUploadLabel.classList.add('loading');

        const formData = new FormData();
        formData.append('csv_file', file);

        try {
            const response = await fetch('/api/get-columns', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error del servidor al cargar el archivo.');
            }

            originalFilepath = data.filepath;
            columnsList.innerHTML = ''; // Clear previous columns

            const allColumns = data.columns;
            const mandatoryColumns = [];
            const icommktColumns = [];
            const otherColumns = [];

            // Separate columns into categories
            allColumns.forEach(column => {
                if (column.toLowerCase() === 'email' || column.toLowerCase() === 'docnum') {
                    mandatoryColumns.push(column);
                } else if (column.toLowerCase().startsWith('icommkt_')) {
                    icommktColumns.push(column);
                } else {
                    otherColumns.push(column);
                }
            });

            // Sort otherColumns and icommktColumns alphabetically
            otherColumns.sort((a, b) => a.localeCompare(b));
            icommktColumns.sort((a, b) => a.localeCompare(b));

            // Ensure 'email' comes before 'docnum' if both are present
            mandatoryColumns.sort((a, b) => {
                if (a.toLowerCase() === 'email') return -1;
                if (b.toLowerCase() === 'email') return 1;
                return 0;
            });

            // Combine and display columns
            [...mandatoryColumns, ...otherColumns, ...icommktColumns].forEach(column => {
                const item = document.createElement('div');
                item.classList.add('column-item');
                item.draggable = true; // Make columns draggable by default

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = column;
                checkbox.value = column;

                const label = document.createElement('label');
                label.htmlFor = column;
                label.textContent = column;

                // Apply rules based on category
                if (column.toLowerCase() === 'email' || column.toLowerCase() === 'docnum') {
                    checkbox.checked = true;
                    checkbox.disabled = true;
                    item.classList.add('mandatory-column');
                    item.draggable = false; // Mandatory columns are not draggable
                } else if (column.toLowerCase().startsWith('icommkt_')) {
                    item.classList.add('icom-column'); // Add class for red styling
                    checkbox.checked = false; // Unchecked by default
                }

                item.appendChild(checkbox);
                item.appendChild(label);
                columnsList.appendChild(item);
            });

            columnsSection.classList.remove('hidden');
            showModal('Archivo cargado y columnas obtenidas con éxito.', 'success');

        } catch (error) {
            showModal(error.message, 'error');
            columnsSection.classList.add('hidden'); // Hide columns section on error
            fileNameDisplay.textContent = '';
            uploadInstructionText.innerHTML = 'Arrastra y suelta tu archivo .csv o haz clic aquí';
        } finally {
            fileUploadLabel.classList.remove('loading');
            // Always restore the original instruction text in the main label area
            uploadInstructionText.innerHTML = 'Arrastra y suelta tu archivo .csv o haz clic aquí';
            // The fileNameDisplay already holds the file.name if a file was selected.
            // If there was an error or no file, fileNameDisplay should be cleared.
            if (!originalFilepath || !file) {
                fileNameDisplay.textContent = '';
            }
        }
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
        const selectedColumns = Array.from(columnsList.children)
                                .filter(item => item.querySelector('input[type="checkbox"]').checked)
                                .map(item => item.querySelector('input[type="checkbox"]').value);

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

            // Check if there are any optional columns selected
            const mandatoryColumnsLower = ['email', 'docnum'];
            const optionalSelectedColumns = selectedColumns.filter(col => !mandatoryColumnsLower.includes(col.toLowerCase()));

            if (optionalSelectedColumns.length > 0) {
                // If optional columns are selected, go to reorder section
                columnsSection.classList.add('hidden');
                reorderSection.classList.remove('hidden');
                populateReorderList(selectedColumns); // Pass all selected columns to reorder
            } else {
                // If only mandatory or no optional columns, proceed directly to preview
                currentOrderedColumns = selectedColumns; // Store the order
                // Show preview section and hide columns section
                columnsSection.classList.add('hidden');
                previewSection.classList.remove('hidden');
            }

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

    confirmReorderBtn.addEventListener('click', async () => {
        const finalOrderedColumns = Array.from(reorderColumnsList.children).map(item => item.querySelector('label').textContent);

        // --- Spinner Logic ---
        confirmReorderBtn.disabled = true;
        const originalBtnText = confirmReorderBtn.innerHTML;
        confirmReorderBtn.innerHTML = '<span class="spinner"></span> Cargando...';

        try {
            const response = await fetch('/api/preview-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filepath: originalFilepath,
                    columns: finalOrderedColumns // Use the final ordered columns
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error del servidor al generar la previsualización.');
            }

            currentOrderedColumns = finalOrderedColumns; // Store the order
            displayPreview(data.preview, data.columns); // data.columns will be the final ordered columns
            reorderSection.classList.add('hidden');
            previewSection.classList.remove('hidden');

        } catch (error) {
            showModal(error.message, 'error');
        } finally {
            confirmReorderBtn.disabled = false;
            confirmReorderBtn.innerHTML = originalBtnText;
        }
    });

    backToSelectionBtn.addEventListener('click', () => {
        reorderSection.classList.add('hidden');
        columnsSection.classList.remove('hidden');
    });

    processBtn.addEventListener('click', async () => {
        // Use the globally stored ordered columns
        if (currentOrderedColumns.length === 0) {
            showModal('No hay columnas seleccionadas para procesar.', 'error');
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
                    columns: currentOrderedColumns // Use the globally stored ordered columns
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
