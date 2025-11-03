document.addEventListener('DOMContentLoaded', () => {
    const App = {
        // --- STATE MANAGEMENT ---
        state: {
            originalFilepath: '',
            currentOrderedColumns: [],
            draggedItem: null,
            modalTimeout: null,
        },

        // --- DOM ELEMENTS ---
        elements: {
            uploadForm: document.getElementById('upload-form'),
            csvFileInput: document.getElementById('csv-file'),
            fileUploadLabel: document.querySelector('.file-upload-label'),
            fileNameDisplay: document.getElementById('file-name'),
            uploadInstructionText: document.getElementById('upload-instruction-text'),
            columnsSection: document.getElementById('columns-section'),
            columnsList: document.getElementById('columns-list'),
            previewBtn: document.getElementById('preview-btn'),
            processBtn: document.getElementById('process-btn'),
            toggleSelectBtn: document.getElementById('toggle-select-btn'),
            previewSection: document.getElementById('preview-section'),
            previewTableContainer: document.getElementById('preview-table-container'),
            backToColumnsBtn: document.getElementById('back-to-columns-btn'),
            searchColumnsInput: document.getElementById('search-columns'),
            reorderSection: document.getElementById('reorder-section'),
            reorderColumnsList: document.getElementById('reorder-columns-list'),
            confirmReorderBtn: document.getElementById('confirm-reorder-btn'),
            backToSelectionBtn: document.getElementById('back-to-selection-btn'),
            modal: document.getElementById('notification-modal'),
            modalMessage: document.getElementById('modal-message'),
            modalContent: document.getElementById('notification-modal').querySelector('.modal-content'),
            closeModalBtn: document.getElementById('notification-modal').querySelector('.close-btn'),
            progressSection: document.getElementById('progress-section'),
            progressBar: document.getElementById('progress'),
            progressText: document.getElementById('progress-text'),
            downloadSection: document.getElementById('download-section'),
            downloadLink: document.getElementById('download-link'),
        },

        // --- INITIALIZATION ---
        init() {
            this.events.init();
            this.dragDrop.init(this.elements.columnsList);
            this.dragDrop.init(this.elements.reorderColumnsList);
        },

        // --- UI MODULE ---
        ui: {
            showModal(message, type = 'info', autoHide = true) {
                const { modal, modalContent, closeModalBtn } = App.elements;
                clearTimeout(App.state.modalTimeout);
                App.elements.modalMessage.textContent = message;
                modalContent.className = 'modal-content';
                modalContent.classList.add(type);
                modal.classList.add('active');

                if (autoHide && (type === 'success' || type === 'info')) {
                    App.state.modalTimeout = setTimeout(() => modal.classList.remove('active'), 3000);
                }
            },

            hideModal() {
                App.elements.modal.classList.remove('active');
                clearTimeout(App.state.modalTimeout);
            },

            setLoading(element, text) {
                element.disabled = true;
                element.dataset.originalText = element.innerHTML;
                element.innerHTML = `<span class="spinner"></span> ${text}`;
            },

            resetLoading(element) {
                element.disabled = false;
                element.innerHTML = element.dataset.originalText || '';
            },

            populateColumnsList(columns) {
                const { columnsList } = App.elements;
                columnsList.innerHTML = '';

                const mandatoryColumns = [];
                const icommktColumns = [];
                const otherColumns = [];

                columns.forEach(column => {
                    if (['email', 'docnum'].includes(column.toLowerCase())) {
                        mandatoryColumns.push(column);
                    } else if (column.toLowerCase().startsWith('icommkt_')) {
                        icommktColumns.push(column);
                    } else {
                        otherColumns.push(column);
                    }
                });

                otherColumns.sort((a, b) => a.localeCompare(b));
                icommktColumns.sort((a, b) => a.localeCompare(b));
                mandatoryColumns.sort((a, b) => (a.toLowerCase() === 'email' ? -1 : 1));

                const sortedColumns = [...mandatoryColumns, ...otherColumns, ...icommktColumns];

                sortedColumns.forEach(column => {
                    const item = document.createElement('div');
                    item.classList.add('column-item');
                    item.draggable = !['email', 'docnum'].includes(column.toLowerCase());

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = column;
                    checkbox.value = column;

                    const label = document.createElement('label');
                    label.htmlFor = column;
                    label.textContent = column;

                    if (['email', 'docnum'].includes(column.toLowerCase())) {
                        checkbox.checked = true;
                        checkbox.disabled = true;
                        item.classList.add('mandatory-column');
                    } else if (column.toLowerCase().startsWith('icommkt_')) {
                        item.classList.add('icom-column');
                    }

                    item.appendChild(checkbox);
                    item.appendChild(label);
                    columnsList.appendChild(item);
                });
            },

            populateReorderList(columns) {
                const { reorderColumnsList } = App.elements;
                reorderColumnsList.innerHTML = '';
                columns.forEach(column => {
                    const item = document.createElement('div');
                    item.classList.add('column-item');
                    item.id = `reorder-item-${column}`;
                    const label = document.createElement('label');
                    label.textContent = column;

                    if (['email', 'docnum'].includes(column.toLowerCase())) {
                        item.classList.add('fixed-column');
                        item.draggable = false;
                    } else {
                        item.draggable = true;
                    }
                    item.appendChild(label);
                    reorderColumnsList.appendChild(item);
                });
            },

            displayPreview(previewData, columns) {
                const { previewTableContainer } = App.elements;
                previewTableContainer.innerHTML = '';
                if (!previewData || previewData.length === 0) {
                    previewTableContainer.innerHTML = '<p>No hay datos para previsualizar.</p>';
                    return;
                }
                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const tbody = document.createElement('tbody');
                const headerRow = document.createElement('tr');
                columns.forEach(column => {
                    const th = document.createElement('th');
                    th.textContent = column;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
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
            },

            updateProgress(progress, text) {
                const { progressBar, progressText } = App.elements;
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${progress}%`;
                progressText.textContent = text;
            },

            showSection(section) {
                ['columnsSection', 'previewSection', 'reorderSection', 'progressSection', 'downloadSection'].forEach(s => {
                    App.elements[s].classList.add('hidden');
                });
                if (section) {
                    App.elements[section].classList.remove('hidden');
                }
            },
        },

        // --- API MODULE ---
        api: {
            async getColumns(file) {
                const formData = new FormData();
                formData.append('csv_file', file);
                const response = await fetch('/api/get-columns', { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error del servidor.');
                return data;
            },

            async previewFile(filepath, columns) {
                const response = await fetch('/api/preview-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, columns }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error en la previsualización.');
                return data;
            },

            async processFile(filepath, columns) {
                const response = await fetch('/api/process-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, columns }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al iniciar el proceso.');
                return data;
            },

            async checkProgress(taskId) {
                const response = await fetch(`/api/progress/${taskId}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al verificar el progreso.');
                return data;
            },
        },

        // --- EVENT HANDLING ---
        events: {
            init() {
                const { elements, handlers } = App;
                elements.csvFileInput.addEventListener('change', handlers.handleFileSelect);
                elements.toggleSelectBtn.addEventListener('click', handlers.handleToggleSelect);
                elements.searchColumnsInput.addEventListener('input', handlers.handleSearch);
                elements.previewBtn.addEventListener('click', handlers.handlePreview);
                elements.confirmReorderBtn.addEventListener('click', handlers.handleConfirmReorder);
                elements.processBtn.addEventListener('click', handlers.handleProcess);
                elements.backToColumnsBtn.addEventListener('click', () => App.ui.showSection('columnsSection'));
                elements.backToSelectionBtn.addEventListener('click', () => App.ui.showSection('columnsSection'));
                elements.closeModalBtn.addEventListener('click', App.ui.hideModal);
                window.addEventListener('click', (e) => e.target === elements.modal && App.ui.hideModal());
            },
        },

        // --- EVENT HANDLERS ---
        handlers: {
            async handleFileSelect(event) {
                const file = event.target.files[0];
                const { elements, ui, state } = App;
                if (!file) {
                    elements.fileNameDisplay.textContent = '';
                    ui.showSection(null);
                    return;
                }
                elements.fileNameDisplay.textContent = file.name;
                ui.setLoading(elements.fileUploadLabel, 'Cargando...');

                try {
                    const data = await App.api.getColumns(file);
                    state.originalFilepath = data.filepath;
                    ui.populateColumnsList(data.columns);
                    ui.showSection('columnsSection');
                    ui.showModal('Archivo cargado y columnas obtenidas.', 'success');
                } catch (error) {
                    ui.showModal(error.message, 'error');
                    ui.showSection(null);
                    elements.fileNameDisplay.textContent = '';
                } finally {
                    ui.resetLoading(elements.fileUploadLabel);
                }
            },

            handleToggleSelect() {
                const { columnsList, toggleSelectBtn } = App.elements;
                let checkboxes = Array.from(columnsList.querySelectorAll('input[type="checkbox"]:not(:disabled)'))
                                      .filter(cb => !cb.id.toLowerCase().startsWith('icommkt'));
                const allSelected = checkboxes.every(cb => cb.checked);
                checkboxes.forEach(cb => cb.checked = !allSelected);
                toggleSelectBtn.textContent = allSelected ? 'Seleccionar Todos' : 'Deseleccionar Todo';
            },

            handleSearch(event) {
                const searchTerm = event.target.value.toLowerCase();
                App.elements.columnsList.querySelectorAll('.column-item').forEach(item => {
                    const columnName = item.querySelector('label').textContent.toLowerCase();
                    item.style.display = columnName.includes(searchTerm) ? 'flex' : 'none';
                });
            },

            async handlePreview() {
                const { elements, ui, state, api } = App;
                const selectedColumns = Array.from(elements.columnsList.querySelectorAll('input:checked')).map(cb => cb.value);
                if (selectedColumns.length === 0) {
                    ui.showModal('Por favor, seleccioná al menos una columna.', 'error');
                    return;
                }
                ui.setLoading(elements.previewBtn, 'Cargando...');
                try {
                    const optionalSelected = selectedColumns.filter(c => !['email', 'docnum'].includes(c.toLowerCase()));
                    if (optionalSelected.length > 0) {
                        ui.populateReorderList(selectedColumns);
                        ui.showSection('reorderSection');
                    } else {
                        const data = await api.previewFile(state.originalFilepath, selectedColumns);
                        state.currentOrderedColumns = data.columns;
                        ui.displayPreview(data.preview, data.columns);
                        ui.showSection('previewSection');
                    }
                } catch (error) {
                    ui.showModal(error.message, 'error');
                } finally {
                    ui.resetLoading(elements.previewBtn);
                }
            },

            async handleConfirmReorder() {
                const { elements, ui, state, api } = App;
                const finalOrderedColumns = Array.from(elements.reorderColumnsList.children).map(item => item.querySelector('label').textContent);
                ui.setLoading(elements.confirmReorderBtn, 'Cargando...');
                try {
                    const data = await api.previewFile(state.originalFilepath, finalOrderedColumns);
                    state.currentOrderedColumns = data.columns;
                    ui.displayPreview(data.preview, data.columns);
                    ui.showSection('previewSection');
                } catch (error) {
                    ui.showModal(error.message, 'error');
                } finally {
                    ui.resetLoading(elements.confirmReorderBtn);
                }
            },

            async handleProcess() {
                const { elements, ui, state, api } = App;
                if (state.currentOrderedColumns.length === 0) {
                    ui.showModal('No hay columnas para procesar.', 'error');
                    return;
                }
                ui.setLoading(elements.processBtn, 'Procesando...');
                ui.showSection('progressSection');
                ui.updateProgress(0, 'Iniciando...');

                try {
                    const { task_id } = await api.processFile(state.originalFilepath, state.currentOrderedColumns);
                    ui.updateProgress(0, 'Preparando el archivo...');

                    const pollInterval = setInterval(async () => {
                        try {
                            const progressData = await api.checkProgress(task_id);
                            if (progressData.status === 'processing') {
                                ui.updateProgress(progressData.progress, `Procesando... (${progressData.progress}%)`);
                            } else if (progressData.status === 'complete') {
                                clearInterval(pollInterval);
                                ui.updateProgress(100, '¡Completado!');
                                elements.downloadLink.href = progressData.result;
                                ui.showSection('downloadSection');
                                ui.showModal('¡Archivo procesado con éxito!', 'success');
                                ui.resetLoading(elements.processBtn);
                            } else if (progressData.status === 'error') {
                                clearInterval(pollInterval);
                                throw new Error(progressData.error);
                            }
                        } catch (pollError) {
                            clearInterval(pollInterval);
                            throw pollError;
                        }
                    }, 2000);
                } catch (error) {
                    ui.showSection('previewSection');
                    ui.showModal(error.message, 'error');
                    ui.resetLoading(elements.processBtn);
                }
            },
        },

        // --- DRAG & DROP MODULE ---
        dragDrop: {
            init(listElement) {
                listElement.addEventListener('dragstart', this.handleDragStart);
                listElement.addEventListener('dragover', this.handleDragOver);
                listElement.addEventListener('dragend', this.handleDragEnd);
            },
            handleDragStart(e) {
                if (e.target.classList.contains('column-item') && e.target.draggable) {
                    App.state.draggedItem = e.target;
                    setTimeout(() => e.target.classList.add('dragging'), 0);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', e.target.id);
                }
            },
            handleDragOver(e) {
                e.preventDefault();
                const listElement = e.currentTarget;
                const target = e.target.closest('.column-item');
                if (target && target !== App.state.draggedItem && !target.classList.contains('fixed-column')) {
                    const rect = target.getBoundingClientRect();
                    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                    listElement.insertBefore(App.state.draggedItem, next && target.nextSibling || target);
                }
            },
            handleDragEnd() {
                if (App.state.draggedItem) {
                    App.state.draggedItem.classList.remove('dragging');
                    App.state.draggedItem = null;
                }
            },
        },
    };

    App.init();
});