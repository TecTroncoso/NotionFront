// ============================================================
// CONFIGURACIÓN
// ============================================================
// 1. Para desarrollo local usa: "http://localhost:3000/api"
// 2. Para producción en Vercel usa: "https://tu-proyecto.vercel.app/api"
const API_URL = "http://localhost:3000/api"; 

document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO GLOBAL ---
    let pages = [];
    let currentPageId = null;
    // Guardamos el token en localStorage para mantener la sesión abierta
    let token = localStorage.getItem('notion_token');
    let userEmail = localStorage.getItem('notion_user_email');
    
    let saveTimeout = null;
    let draggedBlock = null;
    let activeMenuPageId = null;
    let isLoginMode = true;

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

    // --- SERVICIO DE API (Centraliza las peticiones) ---
    async function apiCall(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        
        // Inyectar el token JWT si existe
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            
            // Si el token expiró o no es válido, cerrar sesión
            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Sesión expirada. Por favor inicia sesión de nuevo.");
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error en la petición');
            
            return data;
        } catch (error) {
            console.error(`API Error en ${endpoint}:`, error);
            throw error;
        }
    }

    // --- AUTENTICACIÓN (Login / Registro) ---
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
            // Llamada real al backend
            const res = await apiCall('/auth', 'POST', { type, email, password });
            
            token = res.token;
            userEmail = res.user.email;
            
            // Guardar sesión en navegador
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
        location.reload(); // Recargar para mostrar login
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

    // --- GESTIÓN DE PÁGINAS (CRUD con Base de Datos) ---

    // 1. Cargar todas las páginas (GET)
    async function loadPages() {
        try {
            const data = await apiCall('/pages'); 
            pages = data;

            if (pages.length === 0) {
                // Si el usuario es nuevo y no tiene páginas, crear una vacía
                await createPage();
            } else {
                // Seleccionar la última visitada o la primera
                if (!currentPageId) currentPageId = pages[0].id;
                renderUI();
            }
        } catch (err) {
            console.error("Error cargando páginas:", err);
        }
    }

    // 2. Crear nueva página (POST)
    async function createPage() {
        const emptyBlock = `<div class="block-wrapper group flex items-start gap-1 relative pl-2">
            <div class="block-controls opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-gray-500">
                <button class="drag-btn p-0.5 hover:bg-gray-700 rounded cursor-grab" draggable="true">⋮⋮</button>
                <button class="add-btn p-0.5 hover:bg-gray-700 rounded">+</button>
            </div>
            <div class="editable-block flex-grow text-gray-300" contenteditable="true"></div>
        </div>`;

        try {
            const res = await apiCall('/pages', 'POST', { 
                title: '', 
                icon: '📄', 
                content: emptyBlock 
            });

            // Añadir a la lista local y seleccionar
            const newPage = { id: res.id, title: '', icon: '📄', content: emptyBlock };
            pages.unshift(newPage);
            currentPageId = res.id;
            renderUI();
        } catch (err) {
            console.error("Error creando página:", err);
        }
    }

    // 3. Guardar cambios (PUT)
    async function saveCurrentPage() {
        els.saveStatus.textContent = "Guardando...";
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;

        // Actualizar estado local
        currentPage.title = els.pageTitle.innerText;
        currentPage.content = els.editor.innerHTML;

        try {
            // Enviar a la base de datos
            await apiCall(`/pages?id=${currentPageId}`, 'PUT', { 
                title: currentPage.title, 
                content: currentPage.content 
            });
            
            els.saveStatus.textContent = "Guardado";
            renderSidebarList(); // Actualizar título en la barra lateral
        } catch (err) {
            els.saveStatus.textContent = "Error al guardar";
            console.error(err);
        }
    }

    // 4. Borrar página (DELETE)
    async function deletePage(id) {
        if(pages.length <= 1) return alert("No puedes borrar la última página");
        if(!confirm("¿Borrar página permanentemente?")) return;

        try {
            await apiCall(`/pages?id=${id}`, 'DELETE');
            
            // Actualizar UI
            pages = pages.filter(p => p.id !== id);
            if(currentPageId === id) currentPageId = pages[0].id;
            renderUI();
        } catch(err) { 
            alert("Error al borrar la página");
        }
    }

    // Debounce: Esperar a que el usuario deje de escribir para guardar
    const debounceSave = () => {
        clearTimeout(saveTimeout);
        els.saveStatus.textContent = "Cambios sin guardar...";
        saveTimeout = setTimeout(saveCurrentPage, 1000); // 1 segundo de espera
    };

    // --- RENDERIZADO DE UI ---
    function renderUI() {
        const page = pages.find(p => p.id === currentPageId);
        if (!page) return;

        // Solo actualizamos el contenido si hemos cambiado de página
        // para no interrumpir al usuario si está escribiendo
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

    // --- LÓGICA DEL EDITOR (Bloques) ---
    function createNewBlock() {
        return `<div class="block-wrapper group flex items-start gap-1 relative pl-2">
            <div class="block-controls opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-gray-500">
                <button class="drag-btn p-0.5 hover:bg-gray-700 rounded cursor-grab" draggable="true">⋮⋮</button>
                <button class="add-btn p-0.5 hover:bg-gray-700 rounded">+</button>
            </div>
            <div class="editable-block flex-grow text-gray-300" contenteditable="true"></div>
        </div>`;
    }

    // Manejo de teclas en el editor
    els.editor.addEventListener('keydown', (e) => {
        // ENTER: Crear nuevo bloque
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const currentWrapper = window.getSelection().anchorNode.parentElement.closest('.block-wrapper');
            if (currentWrapper) {
                currentWrapper.insertAdjacentHTML('afterend', createNewBlock());
                const nextBlock = currentWrapper.nextElementSibling.querySelector('.editable-block');
                if(nextBlock) nextBlock.focus();
                debounceSave();
            }
        }
        // BACKSPACE: Borrar bloque vacío
        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            const node = sel.anchorNode;
            if(!node) return;
            const el = node.nodeType === 1 ? node : node.parentElement;
            
            if (el.classList.contains('editable-block') && el.innerText.trim() === '' && els.editor.children.length > 1) {
                e.preventDefault();
                const wrapper = el.closest('.block-wrapper');
                const prev = wrapper.previousElementSibling;
                if (prev) {
                    const prevEdit = prev.querySelector('.editable-block');
                    prevEdit.focus();
                    // Mover cursor al final del texto anterior
                    const range = document.createRange();
                    range.selectNodeContents(prevEdit);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    
                    wrapper.remove();
                    debounceSave();
                }
            }
        }
    });

    // Detectar cambios para guardar
    els.editor.addEventListener('input', debounceSave);
    els.pageTitle.addEventListener('input', () => {
        els.breadcrumb.textContent = els.pageTitle.innerText || "Sin título";
        debounceSave();
    });

    // --- DRAG & DROP (Arrastrar bloques) ---
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

    // --- INTERFAZ (Sidebar y Menús) ---
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

    // Menú contextual (los 3 puntitos)
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

    // Si ya existe token, omitimos login
    if (token) {
        els.modal.classList.add('opacity-0', 'pointer-events-none');
        initAppData();
    } else {
        els.modal.classList.remove('opacity-0', 'pointer-events-none');
    }

});
