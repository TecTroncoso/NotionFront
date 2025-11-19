// ============================================================
// CONFIGURACIÓN - CAMBIA ESTO CUANDO TENGAS TU VERCEL
// ============================================================
// Por defecto para desarrollo local, usa localhost.
// Para producción: "https://mi-proyecto.vercel.app/api"
const API_URL = "https://notion-back.vercel.app/api"; 

document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO ---
    let pages = [];
    let currentPageId = null;
    let token = localStorage.getItem('notion_token');
    let userEmail = localStorage.getItem('notion_user_email');
    let saveTimeout = null;
    let draggedBlock = null;
    let activeMenuPageId = null;
    let isLoginMode = true;

    // --- ELEMENTOS DOM ---
    const els = {
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

    // --- API SERVICE ---
    async function apiCall(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error desconocido');
            return data;
        } catch (error) {
            if (error.message === "Token inválido" || error.message === "No autorizado") {
                logout();
            }
            throw error;
        }
    }

    // --- AUTHENTICATION ---
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
        
        try {
            // En un entorno real descomenta la llamada a la API
            // const res = await apiCall('/auth', 'POST', { type, email, password });
            
            // --- SIMULACIÓN PARA QUE EL FRONTEND FUNCIONE SIN BACKEND AÚN ---
            // BORRA ESTE BLOQUE 'MOCK' CUANDO TENGAS EL BACKEND
            await new Promise(r => setTimeout(r, 1000)); // Fake delay
            const res = { 
                token: "fake-jwt-token-" + Date.now(), 
                user: { email: email } 
            };
            console.warn("⚠️ MODO SIMULACIÓN: Conecta el backend para guardar datos reales.");
            // ----------------------------------------------------------------

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
            // const data = await apiCall('/pages'); // Backend real
            
            // --- SIMULACIÓN LOCAL ---
            const localData = localStorage.getItem('mock_pages');
            const data = localData ? JSON.parse(localData) : [];
            // -----------------------

            pages = data;
            if (pages.length === 0) await createPage();
            else {
                // Recuperar última página visitada o la primera
                currentPageId = pages[0].id;
                renderUI();
            }
        } catch (err) {
            console.error("Error cargando páginas", err);
        }
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
            // const res = await apiCall('/pages', 'POST', { title: '', icon: '📄', content: emptyBlock }); // Backend
            
            // --- SIMULACIÓN ---
            const res = { id: Date.now() };
            const newPage = { id: res.id, title: '', icon: '📄', content: emptyBlock };
            pages.unshift(newPage);
            localStorage.setItem('mock_pages', JSON.stringify(pages));
            // ------------------

            currentPageId = res.id;
            renderUI();
        } catch (err) {
            console.error(err);
        }
    }

    async function saveCurrentPage() {
        els.saveStatus.textContent = "Guardando...";
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;

        currentPage.title = els.pageTitle.innerText;
        currentPage.content = els.editor.innerHTML;

        try {
            // await apiCall(`/pages?id=${currentPageId}`, 'PUT', { 
            //     title: currentPage.title, 
            //     content: currentPage.content 
            // });
            
            // --- SIMULACIÓN ---
            localStorage.setItem('mock_pages', JSON.stringify(pages));
            // ------------------
            
            els.saveStatus.textContent = "Guardado";
            renderSidebarList(); // Actualizar título en sidebar
        } catch (err) {
            els.saveStatus.textContent = "Error al guardar";
        }
    }

    async function deletePage(id) {
        if(pages.length <= 1) return alert("No puedes borrar la última página");
        if(!confirm("¿Borrar página permanentemente?")) return;

        try {
            // await apiCall(`/pages?id=${id}`, 'DELETE');
            
            // --- SIMULACIÓN ---
            pages = pages.filter(p => p.id !== id);
            localStorage.setItem('mock_pages', JSON.stringify(pages));
            // ------------------

            if(currentPageId === id) currentPageId = pages[0].id;
            renderUI();
        } catch(err) { alert("Error borrando"); }
    }

    const debounceSave = () => {
        clearTimeout(saveTimeout);
        els.saveStatus.textContent = "Cambios sin guardar...";
        saveTimeout = setTimeout(saveCurrentPage, 1000);
    };

    // --- RENDER UI ---
    function renderUI() {
        const page = pages.find(p => p.id === currentPageId);
        if (!page) return;

        // Evitar re-renderizar el editor si ya estamos en la página (para no perder foco)
        if (els.pageTitle.dataset.id != page.id) {
            els.pageTitle.innerText = page.title; // Usar innerText para contenteditable
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
                    // En móvil cerrar sidebar
                    document.body.classList.remove('sidebar-open');
                }
            };
            els.pagesList.appendChild(li);
        });
        els.userDisplay.textContent = userEmail || "Usuario";
    }

    // --- EDITOR INTERACTIONS (Blocks) ---
    function createNewBlock() {
        return `<div class="block-wrapper group flex items-start gap-1 relative pl-2">
            <div class="block-controls opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-gray-500">
                <button class="drag-btn p-0.5 hover:bg-gray-700 rounded cursor-grab" draggable="true">⋮⋮</button>
                <button class="add-btn p-0.5 hover:bg-gray-700 rounded">+</button>
            </div>
            <div class="editable-block flex-grow text-gray-300" contenteditable="true"></div>
        </div>`;
    }

    els.editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const currentWrapper = window.getSelection().anchorNode.parentElement.closest('.block-wrapper');
            if (currentWrapper) {
                currentWrapper.insertAdjacentHTML('afterend', createNewBlock());
                const nextBlock = currentWrapper.nextElementSibling.querySelector('.editable-block');
                nextBlock.focus();
                debounceSave();
            }
        }
        // Backspace para borrar bloque vacío
        if (e.key === 'Backspace') {
            const currentBlock = window.getSelection().anchorNode.parentElement;
            if (currentBlock.classList.contains('editable-block') && currentBlock.innerText === '' && els.editor.children.length > 1) {
                e.preventDefault();
                const wrapper = currentBlock.closest('.block-wrapper');
                const prev = wrapper.previousElementSibling;
                if (prev) {
                    prev.querySelector('.editable-block').focus();
                    wrapper.remove();
                    debounceSave();
                }
            }
        }
    });

    els.editor.addEventListener('input', debounceSave);
    els.pageTitle.addEventListener('input', () => {
        els.breadcrumb.textContent = els.pageTitle.innerText || "Sin título";
        debounceSave();
    });

    // --- DRAG & DROP ---
    els.editor.addEventListener('dragstart', e => {
        if(e.target.classList.contains('drag-btn')) {
            draggedBlock = e.target.closest('.block-wrapper');
            e.dataTransfer.effectAllowed = 'move';
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
            // Insertar antes o después según la posición del ratón podría mejorarse, aquí insertamos antes
            target.parentNode.insertBefore(draggedBlock, target);
            debounceSave();
        }
    });
    els.editor.addEventListener('dragend', () => {
        if(draggedBlock) draggedBlock.classList.remove('dragging');
        document.querySelectorAll('.drop-indicator').forEach(el => el.classList.remove('drop-indicator'));
        draggedBlock = null;
    });

    // --- SIDEBAR ACTIONS ---
    document.getElementById('sidebar-collapse-button').onclick = () => {
        els.mainContainer.classList.add('sidebar-collapsed');
        document.getElementById('sidebar-expand-button').classList.remove('hidden');
    };
    document.getElementById('sidebar-expand-button').onclick = () => {
        els.mainContainer.classList.remove('sidebar-collapsed');
        document.getElementById('sidebar-expand-button').classList.add('hidden');
    };
    document.getElementById('hamburger-button').onclick = () => {
        document.body.classList.toggle('sidebar-open');
    };
    document.getElementById('create-page-button').onclick = createPage;
    document.getElementById('logout-btn').onclick = logout;

    // --- MENU CONTEXTUAL ---
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
            els.menu.classList.add('hidden');
        }
    });
    
    els.menu.querySelector('[data-action="delete"]').onclick = () => {
        if(activeMenuPageId) deletePage(activeMenuPageId);
    };

    // --- INIT ---
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
