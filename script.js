// ============================================================
// CONFIGURACIÓN
// ============================================================
// 1. Para desarrollo local usa: "http://localhost:3000/api"
// 2. Para producción en Vercel usa: "https://tu-proyecto.vercel.app/api"
const API_URL = "https://notion-back.vercel.app/api"; 

document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO GLOBAL ---
    let pages = [];
    let currentPageId = null;
    let token = localStorage.getItem('notion_token');
    let userEmail = localStorage.getItem('notion_user_email');
    
    let saveTimeout = null;
    let draggedBlock = null;
    let activeMenuPageId = null;
    let isLoginMode = true;

    // Estado del Slash Menu
    const slashMenu = document.getElementById('slash-menu');
    const slashFilterInput = document.getElementById('slash-filter-input');
    let slashMenuIndex = 0;
    let slashMenuOpen = false;
    let currentBlockForSlash = null;

    // --- ELEMENTOS DEL DOM ---
    const els = {
        // Auth
        modal: document.getElementById('auth-modal'),
        authForm: document.getElementById('auth-form'),
        emailInput: document.getElementById('email-input'),
        passInput: document.getElementById('password-input'),
        authTitle: document.getElementById('auth-title'),
        authBtn: document.getElementById('auth-submit-btn'),
        btnText: document.getElementById('btn-text'),
        spinner: document.getElementById('loading-spinner'),
        authError: document.getElementById('auth-error'),
        authToggle: document.getElementById('auth-toggle-btn'),
        authToggleText: document.getElementById('auth-toggle-text'),
        
        // App Principal
        mainContainer: document.getElementById('main-container'),
        sidebar: document.getElementById('sidebar'),
        pagesList: document.getElementById('pages-list'),
        pageTitle: document.getElementById('page-title'),
        editor: document.getElementById('page-content-editor'),
        breadcrumb: document.getElementById('breadcrumb-title'),
        userDisplay: document.getElementById('user-email-display'),
        saveStatus: document.getElementById('save-status'),
        menu: document.getElementById('page-options-menu')
    };

    // --- SERVICIO DE API ---
    async function apiCall(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Sesión expirada.");
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error en la petición');
            return data;
        } catch (error) {
            console.error(`API Error en ${endpoint}:`, error);
            throw error;
        }
    }

    // --- AUTENTICACIÓN ---
    function toggleAuthMode() {
        isLoginMode = !isLoginMode;
        els.authTitle.textContent = isLoginMode ? "Iniciar Sesión" : "Crear Cuenta";
        els.btnText.textContent = isLoginMode ? "Entrar" : "Registrarse";
        els.authToggleText.textContent = isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?";
        els.authToggle.textContent = isLoginMode ? "Regístrate" : "Inicia sesión";
        els.authError.classList.add('hidden');
    }

    async function handleAuth(e) {
        e.preventDefault();
        const email = els.emailInput.value;
        const password = els.passInput.value;
        const type = isLoginMode ? 'login' : 'register';

        setLoading(true);
        els.authError.classList.add('hidden');
        
        try {
            const res = await apiCall('/auth', 'POST', { type, email, password });
            token = res.token;
            userEmail = res.user.email;
            localStorage.setItem('notion_token', token);
            localStorage.setItem('notion_user_email', userEmail);
            els.modal.classList.add('opacity-0', 'pointer-events-none');
            initAppData();
        } catch (err) {
            els.authError.textContent = err.message;
            els.authError.classList.remove('hidden');
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        token = null;
        userEmail = null;
        localStorage.removeItem('notion_token');
        localStorage.removeItem('notion_user_email');
        location.reload();
    }

    function setLoading(state) {
        if (state) {
            els.spinner.classList.remove('hidden');
            els.authBtn.disabled = true;
            els.authBtn.classList.add('opacity-70');
        } else {
            els.spinner.classList.add('hidden');
            els.authBtn.disabled = false;
            els.authBtn.classList.remove('opacity-70');
        }
    }

    // --- GESTIÓN DE PÁGINAS ---
    async function loadPages() {
        try {
            const data = await apiCall('/pages'); 
            pages = data;
            if (pages.length === 0) await createPage();
            else {
                if (!currentPageId) currentPageId = pages[0].id;
                renderUI();
            }
        } catch (err) { console.error(err); }
    }

    async function createPage() {
        const emptyBlock = `<div class="block-wrapper group flex items-start gap-1 relative pl-2">
            <div class="block-controls opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-gray-500">
                <button class="drag-btn p-0.5 hover:bg-gray-700 rounded cursor-grab" draggable="true">⋮⋮</button>
                <button class="add-btn p-0.5 hover:bg-gray-700 rounded">+</button>
            </div>
            <div class="editable-block flex-grow text-gray-300" contenteditable="true"></div>
        </div>`;

        try {
            const res = await apiCall('/pages', 'POST', { title: '', icon: '📄', content: emptyBlock });
            const newPage = { id: res.id, title: '', icon: '📄', content: emptyBlock };
            pages.unshift(newPage);
            currentPageId = res.id;
            renderUI();
        } catch (err) { console.error(err); }
    }

    async function saveCurrentPage() {
        els.saveStatus.textContent = "Guardando...";
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        currentPage.title = els.pageTitle.innerText;
        currentPage.content = els.editor.innerHTML;
    
        try {
            await apiCall(`/pages?id=${currentPageId}`, 'PUT', { 
                title: currentPage.title, 
                content: currentPage.content 
            });
            els.saveStatus.textContent = "Guardado";
            renderSidebarList(); 
        } catch (err) {
            els.saveStatus.textContent = "Error";
        }
    }

    async function deletePage(id) {
        if(pages.length <= 1) return alert("No puedes borrar la última página");
        if(!confirm("¿Borrar página permanentemente?")) return;
        try {
            await apiCall(`/pages?id=${id}`, 'DELETE');
            pages = pages.filter(p => p.id !== id);
            if(currentPageId === id) currentPageId = pages[0].id;
            renderUI();
        } catch(err) { alert("Error al borrar"); }
    }

    const debounceSave = () => {
        clearTimeout(saveTimeout);
        els.saveStatus.textContent = "Cambios sin guardar...";
        saveTimeout = setTimeout(saveCurrentPage, 1000);
    };

    // --- RENDERIZADO UI ---
    function renderUI() {
        const page = pages.find(p => p.id === currentPageId);
        if (!page) return;
        if (Number(els.pageTitle.dataset.id) !== page.id) {
            els.pageTitle.innerText = page.title; 
            els.pageTitle.dataset.id = page.id;
            els.editor.innerHTML = page.content;
            els.breadcrumb.textContent = page.title || "Sin título";
        }
        renderSidebarList();
    }

    function renderSidebarList() {
        els.pagesList.innerHTML = '';
        pages.forEach(page => {
            const isActive = page.id === currentPageId;
            const li = document.createElement('li');
            li.className = `group flex items-center justify-between gap-2 px-2 py-1 rounded cursor-pointer text-sm transition-colors ${isActive ? 'bg-[#2f2f2f] text-white font-medium' : 'text-gray-400 hover:bg-[#262626]'}`;
            li.innerHTML = `
                <div class="flex items-center gap-2 truncate flex-1 pointer-events-none">
                    <span class="opacity-70">${page.icon}</span>
                    <span class="truncate">${page.title || "Sin título"}</span>
                </div>
                <button class="options-btn opacity-0 group-hover:opacity-100 hover:bg-gray-600 p-0.5 rounded text-gray-400" data-id="${page.id}">•••</button>
            `;
            li.onclick = (e) => {
                if(!e.target.closest('.options-btn')) {
                    currentPageId = page.id;
                    renderUI();
                    document.body.classList.remove('sidebar-open');
                }
            };
            els.pagesList.appendChild(li);
        });
        els.userDisplay.textContent = userEmail || "Usuario";
    }

    // --- SLASH MENU LOGIC (MENÚ ESTILO NOTION) ---
    
    // 1. Abrir menú posicionado bajo el bloque
    function openSlashMenu() {
        if (!currentBlockForSlash) return;

        // Obtener coordenadas del BLOQUE completo
        const rect = currentBlockForSlash.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 5; 
        const left = rect.left + window.scrollX;

        slashMenu.style.top = `${top}px`;
        slashMenu.style.left = `${left}px`;
        
        slashMenu.classList.remove('hidden');
        slashMenuOpen = true;
        slashMenuIndex = 0;
        slashFilterInput.value = ""; 
        updateSlashSelection();
    }

    // 2. Cerrar menú
    function closeSlashMenu() {
        slashMenu.classList.add('hidden');
        slashMenuOpen = false;
        // No limpiamos currentBlockForSlash aquí para poder usarlo al ejecutar comandos
    }

    // 3. Filtrar opciones
    function filterMenu(query) {
        const items = slashMenu.querySelectorAll('.slash-item');
        let hasVisible = false;
        let firstVisibleIndex = -1;

        items.forEach((item, index) => {
            const text = item.innerText.toLowerCase();
            const command = item.dataset.command;
            if (text.includes(query.toLowerCase()) || command.includes(query.toLowerCase())) {
                item.classList.remove('hidden');
                hasVisible = true;
                if (firstVisibleIndex === -1) firstVisibleIndex = index;
            } else {
                item.classList.add('hidden');
            }
        });

        if (hasVisible) {
            slashMenuIndex = firstVisibleIndex;
            updateSlashSelection();
        }
    }

    // 4. Actualizar visualmente la selección
    function updateSlashSelection() {
        const items = slashMenu.querySelectorAll('.slash-item:not(.hidden)');
        items.forEach(item => item.classList.remove('selected'));
        
        if (items.length > 0) {
            if (slashMenuIndex >= items.length) slashMenuIndex = 0;
            if (slashMenuIndex < 0) slashMenuIndex = items.length - 1;
            
            const selectedItem = items[slashMenuIndex];
            selectedItem.classList.add('selected');
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    // 5. Ejecutar transformación del bloque
    function executeSlashCommand(command) {
        if (!currentBlockForSlash) return;

        // Limpiar texto (/comando) y resetear clases
        currentBlockForSlash.innerText = ""; 
        currentBlockForSlash.className = "editable-block flex-grow text-gray-300 outline-none";

        if (command === 'h1') {
            currentBlockForSlash.classList.add('text-4xl', 'font-bold', 'mt-6', 'mb-2');
            currentBlockForSlash.setAttribute('placeholder', 'Encabezado 1');
        } else if (command === 'h2') {
            currentBlockForSlash.classList.add('text-2xl', 'font-semibold', 'mt-4', 'mb-2');
            currentBlockForSlash.setAttribute('placeholder', 'Encabezado 2');
        } else if (command === 'h3') {
            currentBlockForSlash.classList.add('text-xl', 'font-semibold', 'mt-2', 'mb-1');
            currentBlockForSlash.setAttribute('placeholder', 'Encabezado 3');
        } else if (command === 'bullet') {
            currentBlockForSlash.classList.add('list-item', 'ml-5', 'list-disc');
        } else if (command === 'number') {
            currentBlockForSlash.classList.add('list-item', 'ml-5', 'list-decimal');
        }
        
        currentBlockForSlash.focus();
        closeSlashMenu();
        debounceSave();
    }

    // --- LÓGICA DEL EDITOR Y EVENT LISTENERS ---

    // Detectar "/" al escribir
    els.editor.addEventListener('keyup', (e) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        
        const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
        const block = node.closest('.editable-block');

        if (!block) return;

        // Si empieza por "/", activar lógica
        if (block.innerText.startsWith('/')) {
            currentBlockForSlash = block;
            
            if (!slashMenuOpen) {
                openSlashMenu();
            }

            // Filtrar menú con lo que se escriba después de "/"
            const query = block.innerText.substring(1); 
            slashFilterInput.value = query;
            filterMenu(query);
        } else {
            if (slashMenuOpen) closeSlashMenu();
        }
    });

    // Navegación dentro del menú con teclado
    document.addEventListener('keydown', (e) => {
        if (slashMenuOpen) {
            const visibleItems = slashMenu.querySelectorAll('.slash-item:not(.hidden)');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                slashMenuIndex++;
                updateSlashSelection();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                slashMenuIndex--;
                updateSlashSelection();
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (visibleItems.length > 0 && visibleItems[slashMenuIndex]) {
                    executeSlashCommand(visibleItems[slashMenuIndex].dataset.command);
                }
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSlashMenu();
                return;
            }
        }

        // --- LÓGICA ESTÁNDAR DEL EDITOR (cuando menú cerrado) ---
        if (!e.target.closest('.editable-block')) return;

        // ENTER: Crear nuevo bloque
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const currentWrapper = e.target.closest('.block-wrapper');
            if (currentWrapper) {
                const newBlockHTML = `<div class="block-wrapper group flex items-start gap-1 relative pl-2">
                    <div class="block-controls opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-gray-500">
                        <button class="drag-btn p-0.5 hover:bg-gray-700 rounded cursor-grab" draggable="true">⋮⋮</button>
                        <button class="add-btn p-0.5 hover:bg-gray-700 rounded">+</button>
                    </div>
                    <div class="editable-block flex-grow text-gray-300" contenteditable="true"></div>
                </div>`;
                currentWrapper.insertAdjacentHTML('afterend', newBlockHTML);
                const nextBlock = currentWrapper.nextElementSibling.querySelector('.editable-block');
                if(nextBlock) nextBlock.focus();
                debounceSave();
            }
        }
        // BACKSPACE: Borrar bloque vacío
        if (e.key === 'Backspace') {
            const el = e.target;
            if (el.innerText.trim() === '' && els.editor.children.length > 1) {
                e.preventDefault();
                const wrapper = el.closest('.block-wrapper');
                const prev = wrapper.previousElementSibling;
                if (prev) {
                    const prevEdit = prev.querySelector('.editable-block');
                    prevEdit.focus();
                    // Mover cursor al final del anterior
                    const range = document.createRange();
                    range.selectNodeContents(prevEdit);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    
                    wrapper.remove();
                    debounceSave();
                }
            }
        }
    });

    // Clics para el Slash Menu
    document.addEventListener('click', (e) => {
        if (slashMenuOpen && !e.target.closest('#slash-menu') && !e.target.closest('.editable-block')) {
            closeSlashMenu();
        }
    });

    // Evento clic items del menú
    slashMenu.querySelectorAll('.slash-item').forEach(item => {
        item.addEventListener('click', () => {
            executeSlashCommand(item.dataset.command);
        });
    });

    // Detectar cambios para autoguardado
    els.editor.addEventListener('input', debounceSave);
    els.pageTitle.addEventListener('input', () => {
        els.breadcrumb.textContent = els.pageTitle.innerText || "Sin título";
        debounceSave();
    });

    // --- DRAG & DROP ---
    els.editor.addEventListener('dragstart', e => {
        if(e.target.closest('.drag-btn')) {
            draggedBlock = e.target.closest('.block-wrapper');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            setTimeout(() => draggedBlock.classList.add('dragging'), 0);
        }
    });
    els.editor.addEventListener('dragover', e => {
        e.preventDefault();
        const target = e.target.closest('.block-wrapper');
        if(target && target !== draggedBlock) {
            document.querySelectorAll('.drop-indicator').forEach(el => el.classList.remove('drop-indicator'));
            target.classList.add('drop-indicator');
        }
    });
    els.editor.addEventListener('drop', e => {
        e.preventDefault();
        const target = e.target.closest('.block-wrapper');
        if(target && draggedBlock) {
            target.classList.remove('drop-indicator');
            target.parentNode.insertBefore(draggedBlock, target);
            debounceSave();
        }
    });
    els.editor.addEventListener('dragend', () => {
        if(draggedBlock) draggedBlock.classList.remove('dragging');
        document.querySelectorAll('.drop-indicator').forEach(el => el.classList.remove('drop-indicator'));
        draggedBlock = null;
    });

    // --- INTERFAZ GENERAL ---
    const collapseBtn = document.getElementById('sidebar-collapse-button');
    if(collapseBtn) collapseBtn.onclick = () => {
        els.mainContainer.classList.add('sidebar-collapsed');
        document.getElementById('sidebar-expand-button').classList.remove('hidden');
    };
    
    const expandBtn = document.getElementById('sidebar-expand-button');
    if(expandBtn) expandBtn.onclick = () => {
        els.mainContainer.classList.remove('sidebar-collapsed');
        document.getElementById('sidebar-expand-button').classList.add('hidden');
    };

    const hamBtn = document.getElementById('hamburger-button');
    if(hamBtn) hamBtn.onclick = () => document.body.classList.toggle('sidebar-open');

    document.getElementById('create-page-button').onclick = createPage;
    document.getElementById('logout-btn').onclick = logout;

    // Menú de opciones de página
    document.addEventListener('click', e => {
        const btn = e.target.closest('.options-btn');
        if (btn) {
            e.stopPropagation();
            activeMenuPageId = Number(btn.dataset.id);
            const rect = btn.getBoundingClientRect();
            els.menu.style.top = `${rect.bottom + 5}px`;
            els.menu.style.left = `${rect.left}px`;
            els.menu.classList.remove('hidden');
        } else {
            if(els.menu) els.menu.classList.add('hidden');
        }
    });
    
    const delBtn = els.menu.querySelector('[data-action="delete"]');
    if(delBtn) delBtn.onclick = () => {
        if(activeMenuPageId) deletePage(activeMenuPageId);
    };

    // --- INICIALIZACIÓN ---
    function initAppData() {
        loadPages();
    }

    els.authForm.addEventListener('submit', handleAuth);
    els.authToggle.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });

    if (token) {
        els.modal.classList.add('opacity-0', 'pointer-events-none');
        initAppData();
    } else {
        els.modal.classList.remove('opacity-0', 'pointer-events-none');
    }

});
