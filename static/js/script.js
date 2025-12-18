document.addEventListener('DOMContentLoaded', () => {
    const App = {
        // --- STATE MANAGEMENT ---
        state: {
            originalFilepath: '',
            currentOrderedColumns: [],
            draggedItem: null,
            modalTimeout: null,
            needs_docnum_generation: false, // Flag para la nueva funcionalidad

            // --- Estado para Exportación Múltiple ---
            multiExportFile: null, // El objeto File seleccionado
            multiExportFilepath: '', // La ruta temporal del archivo en el servidor
            multiExportUniqueData: {}, // Datos únicos extraídos (bancos, tarjetas, etc.)
            multiExportSelectedItems: { // Items seleccionados por el usuario para exportar
                bancos: [],
                tarjetas: [],
                cobrands: [],
                partners: []
            },

            // --- Estado para CRM ---
            crmFile: null,
            crmFilepath: '',
            crmSelectedColumns: [],
            crmSuggestedColumns: [],
        },

        // --- DOM ELEMENTS ---
        elements: {
            uploadForm: document.getElementById('upload-form'),
            csvFileInput: document.getElementById('csv-file'),
            fileUploadLabel: document.querySelector('.file-upload-label'),
            fileNameDisplay: document.getElementById('file-name'),
            uploadInstructionText: document.getElementById('upload-instruction-text'),
            notificationArea: document.getElementById('notification-area'), // Área para notificaciones
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
            processedCount: document.getElementById('processed-count'), // Para mostrar el total de registros
            arplusCumplePresetBtn: document.getElementById('arplus-cumple-preset-btn'),
            resetBtn: document.getElementById('reset-btn'),

            // --- Elementos para Exportación Múltiple ---
            multiUploadForm: document.getElementById('multi-upload-form'),
            multiCsvFileInput: document.getElementById('multi-csv-file'),
            multiFileUploadLabel: document.getElementById('multi-file-upload-label'), // Nuevo
            multiFileNameDisplay: document.getElementById('multi-file-name'),
            multiUploadBtn: document.getElementById('multi-upload-btn'), // Nuevo
            multiUploadProgressSection: document.getElementById('multi-upload-progress-section'), // Nuevo
            multiUploadProgress: document.getElementById('multi-upload-progress'), // Nuevo
            multiUploadProgressText: document.getElementById('multi-upload-progress-text'), // Nuevo
            multiInitialProcessingProgressSection: document.getElementById('multi-initial-processing-progress-section'),
            multiInitialProcessingProgress: document.getElementById('multi-initial-processing-progress'),
            multiInitialProcessingProgressText: document.getElementById('multi-initial-processing-progress-text'),
            multiNotificationArea: document.getElementById('multi-notification-area'),
            multiSelectionSection: document.getElementById('multi-selection-section'), // Nuevo
            multiCategorySelection: document.getElementById('multi-category-selection'), // Nuevo
            multiItemSelection: document.getElementById('multi-item-selection'), // Nuevo
            multiStartExportBtn: document.getElementById('multi-start-export-btn'), // Nuevo
            multiProcessingProgressSection: document.getElementById('multi-processing-progress-section'), // Nuevo
            multiProcessingProgress: document.getElementById('multi-processing-progress'), // Nuevo
            multiProcessingProgressText: document.getElementById('multi-processing-progress-text'), // Nuevo
            multiDownloadSection: document.getElementById('multi-download-section'),
            multiDownloadLink: document.getElementById('multi-download-link'),

            // --- Elementos para CRM ---
            crmUploadForm: document.getElementById('crm-upload-form'),
            crmCsvFileInput: document.getElementById('crm-csv-file'),
            crmFileUploadLabel: document.getElementById('crm-file-upload-label'),
            crmFileNameDisplay: document.getElementById('crm-file-name'),
            crmUploadBtn: document.getElementById('crm-upload-btn'),
            crmNotificationArea: document.getElementById('crm-notification-area'),
            crmColumnsSection: document.getElementById('crm-columns-section'),
            crmColumnsList: document.getElementById('crm-columns-list'),
            crmPreviewBtn: document.getElementById('crm-preview-btn'),
            crmBackToUploadBtn: document.getElementById('crm-back-to-upload-btn'),
            crmPreviewSection: document.getElementById('crm-preview-section'),
            crmPreviewList: document.getElementById('crm-preview-list'),
            crmStatTotal: document.getElementById('crm-stat-total'),
            crmStatUnique: document.getElementById('crm-stat-unique'),
            crmStatDuplicates: document.getElementById('crm-stat-duplicates'),
            crmStatInvalid: document.getElementById('crm-stat-invalid'),
            crmProcessBtn: document.getElementById('crm-process-btn'),
            crmBackToColumnsBtn: document.getElementById('crm-back-to-columns-btn'),
            crmProgressSection: document.getElementById('crm-progress-section'),
            crmProgress: document.getElementById('crm-progress'),
            crmProgressText: document.getElementById('crm-progress-text'),
            crmDownloadSection: document.getElementById('crm-download-section'),
            crmDownloadLink: document.getElementById('crm-download-link'),
            crmDownloadInvalidLink: document.getElementById('crm-download-invalid-link'),
            crmFinalUnique: document.getElementById('crm-final-unique'),
            crmFinalDuplicates: document.getElementById('crm-final-duplicates'),
            crmFinalInvalid: document.getElementById('crm-final-invalid'),
            crmResetBtn: document.getElementById('crm-reset-btn'),
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
                const { modal, modalContent } = App.elements;
                clearTimeout(App.state.modalTimeout);
                App.elements.modalMessage.textContent = message;
                modalContent.className = 'modal-content';
                modalContent.classList.add(type);
                modal.classList.add('active');

                if (autoHide && (type === 'success' || type === 'info')) {
                    App.state.modalTimeout = setTimeout(() => modal.classList.remove('active'), 1000);
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

            updateMultiExportProgress(progress, text) {
                const { multiProcessingProgress, multiProcessingProgressText } = App.elements;
                multiProcessingProgress.style.width = `${progress}%`;
                multiProcessingProgress.textContent = `${progress}%`;
                multiProcessingProgressText.textContent = text;
            },

            populateMultiExportSelection(uniqueData) {
                const { multiSelectionSection, multiStartExportBtn } = App.elements;
                const selectionContainer = document.getElementById('multi-selection-container');
                selectionContainer.innerHTML = '';
                App.state.multiExportSelectedItems = { bancos: [], tarjetas: [], cobrands: [], partners: [] }; // Reset selections

                const categories = {
                    bancos: 'Bancos',
                    tarjetas: 'Tarjetas',
                    cobrands: 'Cobrands',
                    partners: 'Partners'
                };

                for (const categoryKey in categories) {
                    if (uniqueData[categoryKey] && uniqueData[categoryKey].length > 0) {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('multi-category-container');

                        const categoryHeader = document.createElement('div');
                        categoryHeader.classList.add('multi-category-header');

                        const categoryCheckbox = document.createElement('input');
                        categoryCheckbox.type = 'checkbox';
                        categoryCheckbox.id = `category-${categoryKey}`;
                        categoryCheckbox.value = categoryKey;
                        categoryCheckbox.addEventListener('change', App.handlers.handleMultiCategoryChange);

                        const categoryLabel = document.createElement('label');
                        categoryLabel.htmlFor = `category-${categoryKey}`;
                        categoryLabel.textContent = categories[categoryKey];

                        categoryHeader.appendChild(categoryCheckbox);
                        categoryHeader.appendChild(categoryLabel);
                        categoryDiv.appendChild(categoryHeader);

                        const itemsDiv = document.createElement('div');
                        itemsDiv.id = `items-${categoryKey}`;
                        itemsDiv.classList.add('multi-item-list');

                        uniqueData[categoryKey].forEach(item => {
                            const itemCheckbox = document.createElement('input');
                            itemCheckbox.type = 'checkbox';
                            itemCheckbox.id = `item-${categoryKey}-${item}`;
                            itemCheckbox.value = item;
                            itemCheckbox.dataset.category = categoryKey;
                            itemCheckbox.addEventListener('change', App.handlers.handleMultiItemChange);

                            const itemLabel = document.createElement('label');
                            itemLabel.htmlFor = `item-${categoryKey}-${item}`;
                            itemLabel.textContent = item;

                            const itemDiv = document.createElement('div');
                            itemDiv.classList.add('multi-item-checkbox');
                            itemDiv.appendChild(itemCheckbox);
                            itemDiv.appendChild(itemLabel);
                            itemsDiv.appendChild(itemDiv);
                        });
                        categoryDiv.appendChild(itemsDiv);
                        selectionContainer.appendChild(categoryDiv);
                    }
                }
                multiStartExportBtn.disabled = true; // Initially disabled
            },

            showSection(section) {
                // Hide all sections for main cleaning
                ['columnsSection', 'previewSection', 'reorderSection', 'progressSection', 'downloadSection'].forEach(s => {
                    App.elements[s].classList.add('hidden');
                });
                // Hide all sections for multi-export
                ['multiUploadProgressSection', 'multiSelectionSection', 'multiProcessingProgressSection', 'multiDownloadSection'].forEach(s => {
                    App.elements[s].classList.add('hidden');
                });

                // Show the requested section
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

            async previewFile(filepath, columns, needs_docnum_generation) {
                const response = await fetch('/api/preview-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, columns, needs_docnum_generation }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error en la previsualización.');
                return data;
            },

            async processFile(filepath, columns, needs_docnum_generation) {
                const response = await fetch('/api/process-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, columns, needs_docnum_generation }),
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

            // --- Nuevas funciones para Exportación Múltiple ---
            async multiExportInitialProcess(file, progressCallback) {
                return new Promise((resolve, reject) => {
                    const formData = new FormData();
                    formData.append('csv_file', file);

                    const xhr = new XMLHttpRequest();

                    xhr.open('POST', '/api/multi-export-initial-process', true);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const progress = Math.round((event.loaded / event.total) * 100);
                            if (progressCallback) {
                                progressCallback(progress);
                            }
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                reject(new Error(data.error || 'Error en el procesamiento inicial de exportación múltiple.'));
                            } catch (e) {
                                reject(new Error('Error en el procesamiento inicial de exportación múltiple.'));
                            }
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error('Error de red al intentar procesar el archivo.'));
                    };

                    xhr.send(formData);
                });
            },

            async multiExportProcess(filepath, selectedItems) {
                const response = await fetch('/api/multi-export-process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, selected_items: selectedItems }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al iniciar el proceso de exportación múltiple.');
                return data;
            },

            // --- Funciones API para CRM ---
            async crmGetColumns(file) {
                const formData = new FormData();
                formData.append('csv_file', file);
                const response = await fetch('/api/crm-get-columns', { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al obtener columnas del CRM.');
                return data;
            },

            async crmPreview(filepath, columns) {
                const response = await fetch('/api/crm-preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, columns }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error en la previsualización CRM.');
                return data;
            },

            async crmProcess(filepath, columns) {
                const response = await fetch('/api/crm-process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath, columns }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al iniciar el proceso CRM.');
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
                elements.arplusCumplePresetBtn.addEventListener('click', handlers.handleArplusCumplePreset);
                elements.resetBtn.addEventListener('click', handlers.handleReset);

                // Listeners para Exportación Múltiple
                if (elements.multiCsvFileInput) {
                    elements.multiCsvFileInput.addEventListener('change', handlers.handleMultiExportFileSelect);
                    elements.multiUploadBtn.addEventListener('click', handlers.handleMultiUpload);
                    elements.multiStartExportBtn.addEventListener('click', handlers.handleMultiStartExport);
                }

                // Listener para las pestañas
                const tabsContainer = document.querySelector('.tabs');
                if (tabsContainer) {
                    tabsContainer.addEventListener('click', handlers.handleTabClick);
                }

                // Listeners para CRM
                if (elements.crmCsvFileInput) {
                    elements.crmCsvFileInput.addEventListener('change', handlers.handleCrmFileSelect);
                    elements.crmUploadBtn.addEventListener('click', handlers.handleCrmUpload);
                    elements.crmPreviewBtn.addEventListener('click', handlers.handleCrmPreview);
                    elements.crmBackToUploadBtn.addEventListener('click', handlers.handleCrmBackToUpload);
                    elements.crmBackToColumnsBtn.addEventListener('click', handlers.handleCrmBackToColumns);
                    elements.crmProcessBtn.addEventListener('click', handlers.handleCrmProcess);
                    elements.crmResetBtn.addEventListener('click', handlers.handleCrmReset);
                }
            },
        },

        // --- EVENT HANDLERS ---
        handlers: {
            handleTabClick(event) {
                const target = event.target;
                if (!target.classList.contains('tab-link')) return;

                const tabId = target.dataset.tab;

                // Ocultar todos los contenidos y desactivar todos los links
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelectorAll('.tab-link').forEach(link => {
                    link.classList.remove('active');
                });

                // Mostrar el contenido y activar el link de la pestaña seleccionada
                document.getElementById(tabId).classList.add('active');
                target.classList.add('active');
            },

            handleArplusCumplePreset() {
                const { columnsList } = App.elements;
                const checkboxes = columnsList.querySelectorAll('input[type="checkbox"]');

                // Uncheck all non-mandatory checkboxes
                checkboxes.forEach(cb => {
                    if (!cb.disabled) {
                        cb.checked = false;
                    }
                });

                // Define the preset columns
                const presetColumns = [
                    'PLUS_NRO_SOCIO',
                    'PLUS_SOCIO_CATEGORIA',
                    'PLUS_MILLAS_SALDO',
                    'PLUS_SOCIO_NOMBRE',
                    'PLUS_SOCIO_APELLIDO',
                    'PLUS_SOCIO_CUMPLEANIOS_FECHA',
                    'PLUS_SOCIO_MES_CUMPLEANIO',
                    'PLUS_SOCIO_MES_CUMPLEANIO_CUPON'
                ];

                // Check the preset columns
                presetColumns.forEach(columnName => {
                    const checkbox = document.getElementById(columnName);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });

                // Reorder the columns in the UI
                const mandatoryColumns = Array.from(checkboxes).filter(cb => cb.disabled).map(cb => cb.value);
                const finalOrderedColumns = [...mandatoryColumns, ...presetColumns];

                const columnItems = Array.from(columnsList.children);
                const finalOrderedElements = [];

                // Add mandatory columns first
                mandatoryColumns.forEach(colName => {
                    const item = columnItems.find(el => el.querySelector('input').value === colName);
                    if (item) finalOrderedElements.push(item);
                });

                // Add preset columns in their specified order
                presetColumns.forEach(colName => {
                    const item = columnItems.find(el => el.querySelector('input').value === colName);
                    if (item) finalOrderedElements.push(item);
                });

                // Add the rest of the columns
                columnItems.forEach(item => {
                    if (!finalOrderedElements.includes(item)) {
                        finalOrderedElements.push(item);
                    }
                });

                // Append the reordered elements to the list
                finalOrderedElements.forEach(element => {
                    columnsList.appendChild(element);
                });

                App.ui.showModal('Preset "ARPLUS Cumple" aplicado.', 'success');
            },

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
                elements.notificationArea.classList.add('hidden');
                elements.notificationArea.classList.remove('notification-warning'); // Limpiar clase

                try {
                    const data = await App.api.getColumns(file);
                    state.originalFilepath = data.filepath;
                    state.needs_docnum_generation = data.needs_docnum_generation;

                    if (state.needs_docnum_generation) {
                        elements.notificationArea.textContent = "No se encontró la columna 'docnum'. Se generará extrayendo los datos del campo 'email'. Por favor, revise la previsualización para confirmar el resultado.";
                        elements.notificationArea.classList.add('notification-warning');
                        elements.notificationArea.classList.remove('hidden');
                    }

                    ui.populateColumnsList(data.columns);
                    ui.showSection('columnsSection');
                    ui.showModal('Archivo cargado y columnas obtenidas.', 'success');
                } catch (error) {
                    ui.showModal(error.message, 'error');
                    ui.showSection(null);
                    elements.fileNameDisplay.textContent = '';
                } finally {
                    ui.resetLoading(elements.fileUploadLabel);
                    // Re-acquire the reference to fileNameDisplay as it's recreated by resetLoading
                    App.elements.fileNameDisplay = document.getElementById('file-name');
                }
            },

            handleToggleSelect() {
                const { columnsList, toggleSelectBtn } = App.elements;
                let checkboxes = Array.from(columnsList.querySelectorAll('input[type="checkbox"]:not(:disabled)'))
                    .filter(cb => !cb.id.toLowerCase().startsWith('icommkt'));
                const allSelected = checkboxes.every(cb => cb.checked);
                checkboxes.forEach(cb => cb.checked = !allSelected);
                toggleSelectBtn.textContent = allSelected ? 'Deseleccionar Todo' : 'Seleccionar Todos';
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
                        const data = await api.previewFile(state.originalFilepath, selectedColumns, state.needs_docnum_generation);
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
                    const data = await api.previewFile(state.originalFilepath, finalOrderedColumns, state.needs_docnum_generation);
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
                    const { task_id } = await api.processFile(state.originalFilepath, state.currentOrderedColumns, state.needs_docnum_generation);
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

                                if (progressData.processed_rows !== undefined) {
                                    elements.processedCount.textContent = `Total de registros: ${progressData.processed_rows.toLocaleString('es-AR')}`;
                                } else {
                                    elements.processedCount.textContent = '';
                                }

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

            handleReset() {
                const { elements, ui, state } = App;

                // Resetear el formulario para limpiar el input de archivo
                elements.uploadForm.reset();

                // Limpiar el nombre del archivo mostrado
                elements.fileNameDisplay.textContent = '';

                // Ocultar todas las secciones y mostrar el área de carga
                ui.showSection(null);

                // Limpiar el área de notificación
                elements.notificationArea.classList.add('hidden');
                elements.notificationArea.textContent = '';
                elements.notificationArea.classList.remove('notification-warning');

                // Resetear el estado
                state.originalFilepath = '';
                state.currentOrderedColumns = [];
                state.needs_docnum_generation = false;

                // Mostrar mensaje de éxito
                ui.showModal('El formulario ha sido reseteado.', 'info');
            },

            // --- Handlers para Exportación Múltiple ---
            handleMultiExportFileSelect(event) {
                const file = event.target.files[0];
                const { elements, state } = App;

                state.multiExportFile = file; // Store the file object

                if (file) {
                    elements.multiFileNameDisplay.textContent = file.name;
                    elements.multiUploadBtn.disabled = false; // Enable upload button
                } else {
                    elements.multiFileNameDisplay.textContent = '';
                    elements.multiUploadBtn.disabled = true; // Disable upload button
                }
                // Reset UI for multi-export
                App.ui.showSection(null); // Hide all sections
                elements.multiNotificationArea.classList.add('hidden');
                elements.multiUploadProgressSection.classList.add('hidden');
                elements.multiSelectionSection.classList.add('hidden');
                elements.multiProcessingProgressSection.classList.add('hidden');
                elements.multiDownloadSection.classList.add('hidden');
            },

            async handleMultiUpload() {
                const { elements, ui, api, state } = App;
                const file = state.multiExportFile;

                if (!file) {
                    ui.showModal('Por favor, seleccioná un archivo CSV para subir.', 'error');
                    return;
                }

                ui.setLoading(elements.multiUploadBtn, 'Subiendo...');
                elements.multiUploadProgressSection.classList.remove('hidden');
                elements.multiUploadProgressText.textContent = 'Subiendo archivo...';
                elements.multiUploadProgress.style.width = '0%';
                elements.multiUploadProgress.textContent = '0%';

                try {
                    const data = await api.multiExportInitialProcess(file, (progress) => {
                        elements.multiUploadProgress.style.width = `${progress}%`;
                        elements.multiUploadProgress.textContent = `${progress}%`;
                        elements.multiUploadProgressText.textContent = `Subiendo archivo... (${progress}%)`;
                    });
                    ui.showModal('Archivo subido. Procesando datos iniciales...', 'info');

                    // Show initial processing progress bar
                    elements.multiUploadProgressSection.classList.add('hidden');
                    elements.multiInitialProcessingProgressSection.classList.remove('hidden');
                    elements.multiInitialProcessingProgress.style.width = '0%';
                    elements.multiInitialProcessingProgress.textContent = '0%';
                    elements.multiInitialProcessingProgressText.textContent = 'Procesando archivo...';

                    const pollInterval = setInterval(async () => {
                        try {
                            const progressData = await api.checkProgress(data.task_id);
                            if (progressData.status === 'processing') {
                                const progress = progressData.progress || 0;
                                elements.multiInitialProcessingProgress.style.width = `${progress}%`;
                                elements.multiInitialProcessingProgress.textContent = `${progress}%`;
                                elements.multiInitialProcessingProgressText.textContent = `Procesando archivo... (${progress}%)`;
                            } else if (progressData.status === 'complete') {
                                clearInterval(pollInterval);
                                elements.multiInitialProcessingProgress.style.width = '100%';
                                elements.multiInitialProcessingProgress.textContent = '100%';
                                elements.multiInitialProcessingProgressText.textContent = '¡Procesamiento completado!';

                                state.multiExportFilepath = progressData.result.filepath;
                                state.multiExportUniqueData = progressData.result.unique_data;

                                ui.populateMultiExportSelection(progressData.result.unique_data);
                                ui.showSection('multiSelectionSection');
                                ui.showModal('Datos iniciales procesados con éxito.', 'success');

                                setTimeout(() => {
                                    elements.multiInitialProcessingProgressSection.classList.add('hidden');
                                }, 2000);
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
                    ui.showModal(error.message, 'error');
                    App.ui.showSection(null); // Hide all sections on error
                } finally {
                    ui.resetLoading(elements.multiUploadBtn);
                }
            },

            handleMultiCategoryChange(event) {
                const categoryKey = event.target.value;
                const itemsDiv = document.getElementById(`items-${categoryKey}`);
                const checkboxes = itemsDiv.querySelectorAll('input[type="checkbox"]');

                if (event.target.checked) {
                    itemsDiv.classList.remove('hidden');
                    checkboxes.forEach(cb => {
                        cb.checked = true;
                        if (!App.state.multiExportSelectedItems[categoryKey].includes(cb.value)) {
                            App.state.multiExportSelectedItems[categoryKey].push(cb.value);
                        }
                    });
                } else {
                    checkboxes.forEach(cb => {
                        cb.checked = false;
                    });
                    App.state.multiExportSelectedItems[categoryKey] = [];
                }
                App.handlers.updateMultiExportStartButtonState();
            },

            handleMultiItemChange(event) {
                const itemValue = event.target.value;
                const categoryKey = event.target.dataset.category;

                if (event.target.checked) {
                    App.state.multiExportSelectedItems[categoryKey].push(itemValue);
                } else {
                    App.state.multiExportSelectedItems[categoryKey] = App.state.multiExportSelectedItems[categoryKey].filter(item => item !== itemValue);
                }
                App.handlers.updateMultiExportStartButtonState();
            },

            updateMultiExportStartButtonState() {
                const { multiStartExportBtn } = App.elements;
                const { multiExportSelectedItems } = App.state;
                const hasSelections = Object.values(multiExportSelectedItems).some(arr => arr.length > 0);
                multiStartExportBtn.disabled = !hasSelections;
            },



            async handleMultiStartExport() {
                const { elements, ui, api, state } = App;
                const filepath = state.multiExportFilepath;
                const selectedItems = state.multiExportSelectedItems;

                if (!filepath) {
                    ui.showModal('No se ha subido ningún archivo para procesar.', 'error');
                    return;
                }
                if (Object.values(selectedItems).every(arr => arr.length === 0)) {
                    ui.showModal('Por favor, seleccioná al menos un elemento para exportar.', 'error');
                    return;
                }

                ui.setLoading(elements.multiStartExportBtn, 'Iniciando...');
                ui.showSection('multiProcessingProgressSection');
                ui.updateMultiExportProgress(0, 'Preparando exportación...');

                try {
                    const { task_id } = await api.multiExportProcess(filepath, selectedItems);
                    ui.updateMultiExportProgress(0, 'Procesando archivo...');

                    const pollInterval = setInterval(async () => {
                        try {
                            const progressData = await api.checkProgress(task_id);
                            if (progressData.status === 'processing') {
                                ui.updateMultiExportProgress(progressData.progress, `Procesando... (${progressData.progress}%)`);
                            } else if (progressData.status === 'complete') {
                                clearInterval(pollInterval);
                                ui.updateMultiExportProgress(100, '¡Completado!');
                                elements.multiDownloadLink.href = progressData.result;
                                ui.showSection('multiDownloadSection');
                                ui.showModal('¡Archivos de exportación múltiple generados con éxito!', 'success');
                                ui.resetLoading(elements.multiStartExportBtn);
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
                    ui.showSection('multiSelectionSection'); // Go back to selection on error
                    ui.showModal(error.message, 'error');
                    ui.resetLoading(elements.multiStartExportBtn);
                }
            },

            // --- Handlers para CRM ---
            handleCrmFileSelect(event) {
                const file = event.target.files[0];
                const { elements, state } = App;

                state.crmFile = file;

                if (file) {
                    elements.crmFileNameDisplay.textContent = file.name;
                    elements.crmUploadBtn.disabled = false;
                } else {
                    elements.crmFileNameDisplay.textContent = '';
                    elements.crmUploadBtn.disabled = true;
                }
                // Reset UI for CRM
                elements.crmColumnsSection.classList.add('hidden');
                elements.crmPreviewSection.classList.add('hidden');
                elements.crmProgressSection.classList.add('hidden');
                elements.crmDownloadSection.classList.add('hidden');
                elements.crmNotificationArea.classList.add('hidden');
            },

            async handleCrmUpload() {
                const { elements, ui, api, state } = App;
                const file = state.crmFile;

                if (!file) {
                    ui.showModal('Por favor, seleccioná un archivo CSV para subir.', 'error');
                    return;
                }

                ui.setLoading(elements.crmUploadBtn, 'Cargando...');

                try {
                    const data = await api.crmGetColumns(file);
                    state.crmFilepath = data.filepath;
                    state.crmSuggestedColumns = data.suggested_columns;
                    state.crmSelectedColumns = [...data.suggested_columns]; // Pre-select suggested

                    // Populate columns list
                    App.handlers.populateCrmColumnsList(data.columns, data.suggested_columns);

                    elements.crmColumnsSection.classList.remove('hidden');
                    elements.crmUploadForm.classList.add('hidden');

                    if (data.suggested_columns.length > 0) {
                        ui.showModal(`Se detectaron ${data.suggested_columns.length} columna(s) de email.`, 'success');
                    } else {
                        ui.showModal('No se detectaron columnas de email automáticamente. Por favor, seleccioná las columnas que contienen emails.', 'info', false);
                    }
                } catch (error) {
                    ui.showModal(error.message, 'error');
                } finally {
                    ui.resetLoading(elements.crmUploadBtn);
                }
            },

            populateCrmColumnsList(columns, suggestedColumns) {
                const { crmColumnsList, crmPreviewBtn } = App.elements;
                crmColumnsList.innerHTML = '';

                // Ordenar columnas: sugeridas primero, luego el resto alfabéticamente
                const sortedColumns = [...columns].sort((a, b) => {
                    const aIsSuggested = suggestedColumns.includes(a);
                    const bIsSuggested = suggestedColumns.includes(b);

                    if (aIsSuggested && !bIsSuggested) return -1;
                    if (!aIsSuggested && bIsSuggested) return 1;
                    return a.localeCompare(b);
                });

                sortedColumns.forEach(column => {
                    const item = document.createElement('div');
                    item.classList.add('column-item');

                    const isSuggested = suggestedColumns.includes(column);
                    if (isSuggested) {
                        item.classList.add('suggested');
                    }

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `crm-col-${column}`;
                    checkbox.value = column;
                    checkbox.checked = isSuggested;
                    checkbox.addEventListener('change', App.handlers.handleCrmColumnChange);

                    const label = document.createElement('label');
                    label.htmlFor = `crm-col-${column}`;
                    label.textContent = column;

                    if (isSuggested) {
                        const badge = document.createElement('span');
                        badge.classList.add('badge-suggested');
                        badge.textContent = 'sugerido';
                        label.appendChild(badge);
                    }

                    item.appendChild(checkbox);
                    item.appendChild(label);
                    crmColumnsList.appendChild(item);
                });

                // Update preview button state
                App.handlers.updateCrmPreviewButtonState();
            },

            handleCrmColumnChange(event) {
                const { state } = App;
                const columnValue = event.target.value;

                if (event.target.checked) {
                    if (!state.crmSelectedColumns.includes(columnValue)) {
                        state.crmSelectedColumns.push(columnValue);
                    }
                } else {
                    state.crmSelectedColumns = state.crmSelectedColumns.filter(col => col !== columnValue);
                }
                App.handlers.updateCrmPreviewButtonState();
            },

            updateCrmPreviewButtonState() {
                const { crmPreviewBtn } = App.elements;
                const { crmSelectedColumns } = App.state;
                crmPreviewBtn.disabled = crmSelectedColumns.length === 0;
            },

            async handleCrmPreview() {
                const { elements, ui, api, state } = App;

                if (state.crmSelectedColumns.length === 0) {
                    ui.showModal('Por favor, seleccioná al menos una columna de email.', 'error');
                    return;
                }

                ui.setLoading(elements.crmPreviewBtn, 'Cargando...');

                try {
                    const data = await api.crmPreview(state.crmFilepath, state.crmSelectedColumns);

                    // Update preview list
                    elements.crmPreviewList.innerHTML = '';
                    data.preview.forEach(email => {
                        const li = document.createElement('li');
                        li.textContent = email;
                        elements.crmPreviewList.appendChild(li);
                    });

                    // Update stats
                    elements.crmStatTotal.textContent = data.stats.total_raw.toLocaleString('es-AR');
                    elements.crmStatUnique.textContent = data.stats.total_unique.toLocaleString('es-AR');
                    elements.crmStatDuplicates.textContent = data.stats.duplicates.toLocaleString('es-AR');
                    elements.crmStatInvalid.textContent = data.stats.invalid.toLocaleString('es-AR');

                    elements.crmColumnsSection.classList.add('hidden');
                    elements.crmPreviewSection.classList.remove('hidden');

                    ui.showModal('Previsualización generada.', 'success');
                } catch (error) {
                    ui.showModal(error.message, 'error');
                } finally {
                    ui.resetLoading(elements.crmPreviewBtn);
                }
            },

            handleCrmBackToUpload() {
                const { elements, state } = App;
                elements.crmColumnsSection.classList.add('hidden');
                elements.crmUploadForm.classList.remove('hidden');
                state.crmFilepath = '';
                state.crmSelectedColumns = [];
                state.crmSuggestedColumns = [];
            },

            handleCrmBackToColumns() {
                const { elements } = App;
                elements.crmPreviewSection.classList.add('hidden');
                elements.crmColumnsSection.classList.remove('hidden');
            },

            async handleCrmProcess() {
                const { elements, ui, api, state } = App;

                if (state.crmSelectedColumns.length === 0) {
                    ui.showModal('No hay columnas seleccionadas.', 'error');
                    return;
                }

                ui.setLoading(elements.crmProcessBtn, 'Procesando...');
                elements.crmPreviewSection.classList.add('hidden');
                elements.crmProgressSection.classList.remove('hidden');
                elements.crmProgress.style.width = '0%';
                elements.crmProgress.textContent = '0%';
                elements.crmProgressText.textContent = 'Iniciando...';

                try {
                    const { task_id } = await api.crmProcess(state.crmFilepath, state.crmSelectedColumns);

                    const pollInterval = setInterval(async () => {
                        try {
                            const progressData = await api.checkProgress(task_id);
                            if (progressData.status === 'processing') {
                                elements.crmProgress.style.width = `${progressData.progress}%`;
                                elements.crmProgress.textContent = `${progressData.progress}%`;
                                elements.crmProgressText.textContent = `Procesando... (${progressData.progress}%)`;
                            } else if (progressData.status === 'complete') {
                                clearInterval(pollInterval);
                                elements.crmProgress.style.width = '100%';
                                elements.crmProgress.textContent = '100%';
                                elements.crmProgressText.textContent = '¡Completado!';

                                // Update final stats
                                if (progressData.stats) {
                                    elements.crmFinalUnique.textContent = progressData.stats.total_unique.toLocaleString('es-AR');
                                    elements.crmFinalDuplicates.textContent = progressData.stats.duplicates.toLocaleString('es-AR');
                                    elements.crmFinalInvalid.textContent = progressData.stats.invalid.toLocaleString('es-AR');
                                }

                                elements.crmDownloadLink.href = progressData.result;

                                // Mostrar botón de inválidos si hay
                                if (progressData.invalid_result) {
                                    elements.crmDownloadInvalidLink.href = progressData.invalid_result;
                                    elements.crmDownloadInvalidLink.classList.remove('hidden');
                                } else {
                                    elements.crmDownloadInvalidLink.classList.add('hidden');
                                }

                                elements.crmProgressSection.classList.add('hidden');
                                elements.crmDownloadSection.classList.remove('hidden');
                                ui.showModal('¡Emails consolidados con éxito!', 'success');
                                ui.resetLoading(elements.crmProcessBtn);
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
                    elements.crmProgressSection.classList.add('hidden');
                    elements.crmPreviewSection.classList.remove('hidden');
                    ui.showModal(error.message, 'error');
                    ui.resetLoading(elements.crmProcessBtn);
                }
            },

            handleCrmReset() {
                const { elements, state } = App;

                // Reset form
                elements.crmUploadForm.reset();
                elements.crmUploadForm.classList.remove('hidden');

                // Reset file name
                elements.crmFileNameDisplay.textContent = '';
                elements.crmUploadBtn.disabled = true;

                // Hide all sections
                elements.crmColumnsSection.classList.add('hidden');
                elements.crmPreviewSection.classList.add('hidden');
                elements.crmProgressSection.classList.add('hidden');
                elements.crmDownloadSection.classList.add('hidden');
                elements.crmNotificationArea.classList.add('hidden');

                // Reset state
                state.crmFile = null;
                state.crmFilepath = '';
                state.crmSelectedColumns = [];
                state.crmSuggestedColumns = [];

                App.ui.showModal('Formulario CRM reseteado.', 'info');
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