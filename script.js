// ========== CONSTANTES GLOBAIS ==========
const API_BASE_URL = 'http://localhost:3000';
const DEFAULT_ICON = 'img/pasta.png';
const DEFAULT_SHORTCUTS = ['Documentos', 'Este Computador', 'Chrome', 'VS Code', 'Spotify', 'Lixeira', 'Pasta'];

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let authToken = null;
let zIndexCounter = 100; // Contador para z-index de janelas

// ========== FUNÇÕES UTILITÁRIAS ==========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========
async function registerUser(username, password) {
    try {
        if (!username || !password) {
            throw new Error('Nome de usuário e senha são obrigatórios');
        }
        
        if (password.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }

        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao registrar');
        }
        
        const data = await response.json();
        showNotification('Registro realizado com sucesso!', 'success');
        return data;
    } catch (error) {
        console.error('Erro no registro:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro no login');
        }
        
        const data = await response.json();
        authToken = data.token;
        
        // Decodificar o token para obter informações do usuário
        const decoded = jwt_decode(authToken);
        currentUser = {
            id: decoded.id,
            username: decoded.username
        };
        
        showNotification(`Bem-vindo, ${currentUser.username}!`, 'success');
        return currentUser;
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

async function validateToken() {
    if (!authToken) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/validate-token`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
}

function logoutUser() {
    currentUser = null;
    authToken = null;
    showNotification('Você foi desconectado', 'info');
    showAuthModal();
    clearDesktopShortcuts();
}

// ========== FUNÇÕES DE GERENCIAMENTO DE ATALHOS ==========
async function getShortcuts() {
    try {
        const response = await fetch(`${API_BASE_URL}/shortcuts`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar atalhos');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar atalhos:', error);
        showNotification('Erro ao carregar atalhos', 'error');
        throw error;
    }
}

async function saveShortcut(shortcut) {
    try {
        // Validação básica
        if (!shortcut.name) {
            throw new Error('O atalho precisa ter um nome');
        }

        const method = shortcut.id ? 'PUT' : 'POST';
        const url = shortcut.id ? `${API_BASE_URL}/shortcuts/${shortcut.id}` : `${API_BASE_URL}/shortcuts`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(shortcut)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao salvar atalho');
        }
        
        const savedShortcut = await response.json();
        showNotification(`Atalho "${savedShortcut.name}" salvo com sucesso`, 'success');
        return savedShortcut;
    } catch (error) {
        console.error('Erro ao salvar atalho:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

async function deleteShortcut(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/shortcuts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao deletar atalho');
        }
        
        showNotification('Atalho removido com sucesso', 'success');
        return await response.json();
    } catch (error) {
        console.error('Erro ao deletar atalho:', error);
        showNotification('Erro ao remover atalho', 'error');
        throw error;
    }
}

// ========== FUNÇÕES DE INTERFACE DO USUÁRIO ==========
function showAuthModal() {
    // Remove modal existente se houver
    const existingModal = document.getElementById('auth-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Login / Registrar</h2>
                <button class="close-modal">&times;</button>
            </div>
            
            <div class="auth-tabs">
                <button id="login-tab" class="auth-tab active">Login</button>
                <button id="register-tab" class="auth-tab">Registrar</button>
            </div>
            
            <div id="login-form" class="auth-form active">
                <div class="form-group">
                    <label for="login-username">Usuário</label>
                    <input id="login-username" type="text" placeholder="Digite seu usuário">
                </div>
                <div class="form-group">
                    <label for="login-password">Senha</label>
                    <input id="login-password" type="password" placeholder="Digite sua senha">
                </div>
                <button id="login-submit" class="auth-button">Entrar</button>
                <div class="auth-footer">
                    <a href="#" id="forgot-password">Esqueceu a senha?</a>
                </div>
            </div>
            
            <div id="register-form" class="auth-form">
                <div class="form-group">
                    <label for="register-username">Usuário</label>
                    <input id="register-username" type="text" placeholder="Digite um nome de usuário">
                </div>
                <div class="form-group">
                    <label for="register-password">Senha</label>
                    <input id="register-password" type="password" placeholder="Digite uma senha (mínimo 6 caracteres)">
                </div>
                <div class="form-group">
                    <label for="register-confirm-password">Confirmar Senha</label>
                    <input id="register-confirm-password" type="password" placeholder="Confirme sua senha">
                </div>
                <button id="register-submit" class="auth-button">Registrar</button>
            </div>
            
            <div id="auth-message" class="auth-message"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar no X ou fora do conteúdo
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Event listeners para abas
    document.getElementById('login-tab').addEventListener('click', () => {
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('register-tab').classList.remove('active');
    });
    
    document.getElementById('register-tab').addEventListener('click', () => {
        document.getElementById('register-form').classList.add('active');
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('login-tab').classList.remove('active');
    });
    
    // Event listener para login
    document.getElementById('login-submit').addEventListener('click', async () => {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        if (!username || !password) {
            showAuthMessage('Preencha todos os campos', 'error');
            return;
        }
        
        try {
            await loginUser(username, password);
            showAuthMessage('Login realizado com sucesso!', 'success');
            
            // Carregar atalhos do usuário
            await loadUserShortcuts();
            
            // Fechar modal após 1 segundo
            setTimeout(() => {
                modal.remove();
                updateUIAfterLogin();
            }, 1000);
        } catch (error) {
            showAuthMessage(error.message, 'error');
        }
    });
    
    // Event listener para registro
    document.getElementById('register-submit').addEventListener('click', async () => {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value.trim();
        const confirmPassword = document.getElementById('register-confirm-password').value.trim();
        
        if (!username || !password || !confirmPassword) {
            showAuthMessage('Preencha todos os campos', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showAuthMessage('As senhas não coincidem', 'error');
            return;
        }
        
        if (password.length < 6) {
            showAuthMessage('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }
        
        try {
            await registerUser(username, password);
            showAuthMessage('Registro realizado com sucesso! Faça login.', 'success');
            
            // Mudar para a aba de login e preencher usuário
            document.getElementById('login-tab').click();
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').focus();
        } catch (error) {
            showAuthMessage(error.message, 'error');
        }
    });
    
    // Event listener para esqueci a senha
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });
}

function showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h2>Recuperar Senha</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="form-group">
                <label for="recovery-email">E-mail ou Usuário</label>
                <input id="recovery-email" type="text" placeholder="Digite seu e-mail ou usuário">
            </div>
            <button id="recovery-submit" class="auth-button">Enviar Link de Recuperação</button>
            <div id="recovery-message" class="auth-message"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Event listener para envio
    document.getElementById('recovery-submit').addEventListener('click', async () => {
        const emailOrUsername = document.getElementById('recovery-email').value.trim();
        
        if (!emailOrUsername) {
            document.getElementById('recovery-message').textContent = 'Digite seu e-mail ou usuário';
            document.getElementById('recovery-message').className = 'auth-message error';
            return;
        }
        
        // Simulação de envio (implementar chamada real à API)
        document.getElementById('recovery-message').textContent = 'Link de recuperação enviado para seu e-mail (simulação)';
        document.getElementById('recovery-message').className = 'auth-message success';
        
        setTimeout(() => modal.remove(), 3000);
    });
}

function showAuthMessage(message, type = 'info') {
    const messageElement = document.getElementById('auth-message');
    messageElement.textContent = message;
    messageElement.className = `auth-message ${type}`;
}

function updateUIAfterLogin() {
    // Atualizar barra de usuário
    const userBar = document.getElementById('user-bar');
    if (userBar) {
        userBar.innerHTML = `
            <span>Bem-vindo, ${currentUser.username}</span>
            <button id="logout-button">Sair</button>
            <button id="new-shortcut-button">Novo Atalho</button>
        `;
        
        document.getElementById('logout-button').addEventListener('click', logoutUser);
        document.getElementById('new-shortcut-button').addEventListener('click', showNewShortcutModal);
    }
    
    // Mostrar área de trabalho
    document.querySelector('.desktop').classList.remove('hidden');
}

function clearDesktopShortcuts() {
    const desktopIcons = document.querySelector('.desktop-icons-left');
    
    // Remove apenas os atalhos do usuário (não os padrões)
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        const label = icon.querySelector('.desktop-icon-label').textContent;
        if (!DEFAULT_SHORTCUTS.includes(label)) {
            icon.remove();
        }
    });
}

async function loadUserShortcuts() {
    if (!currentUser) return;
    
    try {
        const shortcuts = await getShortcuts();
        
        // Limpar atalhos existentes (exceto os padrões)
        clearDesktopShortcuts();
        
        // Adicionar atalhos do usuário
        shortcuts.forEach(shortcut => {
            addShortcutToDesktop(shortcut);
        });
    } catch (error) {
        console.error('Erro ao carregar atalhos:', error);
        showNotification('Erro ao carregar atalhos', 'error');
    }
}

function showNewShortcutModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Criar Novo Atalho</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="form-group">
                <label for="shortcut-name">Nome do Atalho</label>
                <input id="shortcut-name" type="text" placeholder="Digite o nome do atalho">
            </div>
            <div class="form-group">
                <label for="shortcut-icon">Ícone</label>
                <select id="shortcut-icon">
                    <option value="img/pasta.png">Pasta</option>
                    <option value="img/chrome.png">Chrome</option>
                    <option value="img/vscode.png">VS Code</option>
                    <option value="img/spotify.png">Spotify</option>
                    <option value="img/document.png">Documento</option>
                </select>
            </div>
            <div class="form-group">
                <label for="shortcut-action">Ação</label>
                <select id="shortcut-action">
                    <option value="open-window">Abrir Janela</option>
                    <option value="open-url">Abrir URL</option>
                    <option value="open-app">Abrir Aplicativo</option>
                </select>
            </div>
            <div id="action-params" class="form-group hidden">
                <!-- Parâmetros dinâmicos serão inseridos aqui -->
            </div>
            <button id="create-shortcut-button" class="auth-button">Criar Atalho</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Mostrar/ocultar parâmetros dinâmicos baseados na ação selecionada
    document.getElementById('shortcut-action').addEventListener('change', (e) => {
        const actionParams = document.getElementById('action-params');
        actionParams.innerHTML = '';
        actionParams.classList.remove('hidden');
        
        switch (e.target.value) {
            case 'open-window':
                actionParams.innerHTML = `
                    <label for="window-type">Tipo de Janela</label>
                    <select id="window-type">
                        <option value="chrome">Chrome</option>
                        <option value="vscode">VS Code</option>
                        <option value="spotify">Spotify</option>
                        <option value="explorer">Explorador de Arquivos</option>
                    </select>
                `;
                break;
            case 'open-url':
                actionParams.innerHTML = `
                    <label for="url">URL</label>
                    <input id="url" type="text" placeholder="https://exemplo.com">
                `;
                break;
            case 'open-app':
                actionParams.innerHTML = `
                    <label for="app-path">Caminho do Aplicativo</label>
                    <input id="app-path" type="text" placeholder="C:\Programas\MeuApp.exe">
                `;
                break;
        }
    });
    
    // Criar atalho
    document.getElementById('create-shortcut-button').addEventListener('click', async () => {
        const name = document.getElementById('shortcut-name').value.trim();
        const icon = document.getElementById('shortcut-icon').value;
        const action = document.getElementById('shortcut-action').value;
        
        if (!name) {
            showNotification('Digite um nome para o atalho', 'error');
            return;
        }
        
        let actionParams = {};
        switch (action) {
            case 'open-window':
                actionParams.windowType = document.getElementById('window-type').value;
                break;
            case 'open-url':
                actionParams.url = document.getElementById('url').value.trim();
                if (!actionParams.url) {
                    showNotification('Digite uma URL válida', 'error');
                    return;
                }
                break;
            case 'open-app':
                actionParams.appPath = document.getElementById('app-path').value.trim();
                if (!actionParams.appPath) {
                    showNotification('Digite um caminho válido', 'error');
                    return;
                }
                break;
        }
        
        try {
            const newShortcut = {
                name,
                icon,
                action,
                actionParams: JSON.stringify(actionParams),
                position_x: 100,
                position_y: 100
            };
            
            const savedShortcut = await saveShortcut(newShortcut);
            addShortcutToDesktop(savedShortcut);
            modal.remove();
        } catch (error) {
            console.error('Erro ao criar atalho:', error);
        }
    });
}

function addShortcutToDesktop(shortcut) {
    const desktopIcons = document.querySelector('.desktop-icons-left');
    
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.dataset.shortcutId = shortcut.id;
    icon.style.position = 'absolute';
    icon.style.left = `${shortcut.position_x || 0}px`;
    icon.style.top = `${shortcut.position_y || 0}px`;
    
    icon.innerHTML = `
        <div class="desktop-icon-container">
            <img src="${shortcut.icon || DEFAULT_ICON}" alt="${shortcut.name}" class="desktop-icon-img">
        </div>
        <span class="desktop-icon-label">${shortcut.name}</span>
    `;
    
    // Tornar o ícone arrastável
    makeIconDraggable(icon, shortcut.id);
    
    // Adicionar evento de clique
    icon.addEventListener('dblclick', () => {
        handleShortcutAction(shortcut);
    });
    
    // Adicionar menu de contexto
    icon.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showShortcutContextMenu(e, shortcut);
    });
    
    desktopIcons.appendChild(icon);
}

function handleShortcutAction(shortcut) {
    try {
        const actionParams = shortcut.actionParams ? JSON.parse(shortcut.actionParams) : {};
        
        switch (shortcut.action) {
            case 'open-window':
                openWindow(`${actionParams.windowType}-window`);
                break;
            case 'open-url':
                window.open(actionParams.url, '_blank');
                break;
            case 'open-app':
                // Simulação - em um ambiente real, isso seria integrado com Electron ou similar
                showNotification(`Abrindo aplicativo: ${actionParams.appPath}`, 'info');
                break;
            default:
                // Comportamento padrão para atalhos sem ação definida
                openWindow('explorer-window');
        }
    } catch (error) {
        console.error('Erro ao executar ação do atalho:', error);
        showNotification('Erro ao executar atalho', 'error');
    }
}

function showShortcutContextMenu(e, shortcut) {
    // Remove qualquer menu de contexto existente
    const existingMenu = document.getElementById('shortcut-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'shortcut-context-menu';
    menu.className = 'context-menu';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    
    menu.innerHTML = `
        <ul>
            <li id="open-shortcut">Abrir</li>
            <li id="rename-shortcut">Renomear</li>
            <li id="change-icon-shortcut">Alterar Ícone</li>
            <li class="separator"></li>
            <li id="delete-shortcut">Excluir</li>
            <li id="properties-shortcut">Propriedades</li>
        </ul>
    `;
    
    document.body.appendChild(menu);
    
    // Fechar menu ao clicar em qualquer lugar
    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };
    
    document.addEventListener('click', closeMenu, { once: true });
    
    // Eventos do menu
    document.getElementById('open-shortcut').addEventListener('click', () => {
        handleShortcutAction(shortcut);
    });
    
    document.getElementById('rename-shortcut').addEventListener('click', () => {
        showRenameShortcutModal(shortcut);
    });
    
    document.getElementById('change-icon-shortcut').addEventListener('click', () => {
        showChangeIconModal(shortcut);
    });
    
    document.getElementById('delete-shortcut').addEventListener('click', async () => {
        try {
            await deleteShortcut(shortcut.id);
            const icon = document.querySelector(`.desktop-icon[data-shortcut-id="${shortcut.id}"]`);
            if (icon) icon.remove();
        } catch (error) {
            console.error('Erro ao deletar atalho:', error);
        }
    });
    
    document.getElementById('properties-shortcut').addEventListener('click', () => {
        showShortcutProperties(shortcut);
    });
}

function showRenameShortcutModal(shortcut) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h2>Renomear Atalho</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="form-group">
                <label for="new-shortcut-name">Novo Nome</label>
                <input id="new-shortcut-name" type="text" value="${shortcut.name}">
            </div>
            <button id="rename-shortcut-button" class="auth-button">Salvar</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Renomear atalho
    document.getElementById('rename-shortcut-button').addEventListener('click', async () => {
        const newName = document.getElementById('new-shortcut-name').value.trim();
        
        if (!newName) {
            showNotification('Digite um novo nome', 'error');
            return;
        }
        
        try {
            const updatedShortcut = await saveShortcut({
                ...shortcut,
                name: newName
            });
            
            // Atualizar ícone na área de trabalho
            const icon = document.querySelector(`.desktop-icon[data-shortcut-id="${shortcut.id}"]`);
            if (icon) {
                icon.querySelector('.desktop-icon-label').textContent = newName;
            }
            
            modal.remove();
        } catch (error) {
            console.error('Erro ao renomear atalho:', error);
        }
    });
}

function showChangeIconModal(shortcut) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h2>Alterar Ícone</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="icon-grid">
                <div class="icon-option" data-icon="img/pasta.png">
                    <img src="img/pasta.png" alt="Pasta">
                    <span>Pasta</span>
                </div>
                <div class="icon-option" data-icon="img/chrome.png">
                    <img src="img/chrome.png" alt="Chrome">
                    <span>Chrome</span>
                </div>
                <div class="icon-option" data-icon="img/vscode.png">
                    <img src="img/vscode.png" alt="VS Code">
                    <span>VS Code</span>
                </div>
                <div class="icon-option" data-icon="img/spotify.png">
                    <img src="img/spotify.png" alt="Spotify">
                    <span>Spotify</span>
                </div>
                <div class="icon-option" data-icon="img/document.png">
                    <img src="img/document.png" alt="Documento">
                    <span>Documento</span>
                </div>
                <div class="icon-option" data-icon="img/computer.png">
                    <img src="img/computer.png" alt="Computador">
                    <span>Computador</span>
                </div>
            </div>
            <button id="change-icon-button" class="auth-button">Salvar</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Selecionar ícone
    let selectedIcon = shortcut.icon || DEFAULT_ICON;
    modal.querySelectorAll('.icon-option').forEach(option => {
        if (option.dataset.icon === selectedIcon) {
            option.classList.add('selected');
        }
        
        option.addEventListener('click', () => {
            modal.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedIcon = option.dataset.icon;
        });
    });
    
    // Salvar alteração
    document.getElementById('change-icon-button').addEventListener('click', async () => {
        try {
            const updatedShortcut = await saveShortcut({
                ...shortcut,
                icon: selectedIcon
            });
            
            // Atualizar ícone na área de trabalho
            const icon = document.querySelector(`.desktop-icon[data-shortcut-id="${shortcut.id}"]`);
            if (icon) {
                icon.querySelector('img').src = selectedIcon;
            }
            
            modal.remove();
        } catch (error) {
            console.error('Erro ao alterar ícone:', error);
        }
    });
}

function showShortcutProperties(shortcut) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const actionParams = shortcut.actionParams ? JSON.parse(shortcut.actionParams) : {};
    let actionDescription = '';
    
    switch (shortcut.action) {
        case 'open-window':
            actionDescription = `Abrir janela: ${actionParams.windowType || 'Nenhum'}`;
            break;
        case 'open-url':
            actionDescription = `Abrir URL: ${actionParams.url || 'Nenhuma'}`;
            break;
        case 'open-app':
            actionDescription = `Abrir aplicativo: ${actionParams.appPath || 'Nenhum'}`;
            break;
        default:
            actionDescription = 'Nenhuma ação específica';
    }
    
    modal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h2>Propriedades de ${shortcut.name}</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="properties-content">
                <div class="property-row">
                    <span class="property-label">Nome:</span>
                    <span class="property-value">${shortcut.name}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Tipo:</span>
                    <span class="property-value">Atalho</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Localização:</span>
                    <span class="property-value">Área de Trabalho</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Ação:</span>
                    <span class="property-value">${actionDescription}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Posição:</span>
                    <span class="property-value">X: ${shortcut.position_x || 0}, Y: ${shortcut.position_y || 0}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Criado em:</span>
                    <span class="property-value">${new Date(shortcut.createdAt).toLocaleString()}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Modificado em:</span>
                    <span class="property-value">${new Date(shortcut.updatedAt).toLocaleString()}</span>
                </div>
            </div>
            <div class="properties-footer">
                <button id="close-properties" class="auth-button">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.getElementById('close-properties').addEventListener('click', () => modal.remove());
}

// ========== FUNÇÕES DE ARRASTAR E MOVER ELEMENTOS ==========
function makeIconDraggable(iconElement, shortcutId) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    
    iconElement.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e.preventDefault();
        
        // Verifica se é um clique com o botão direito (para menu de contexto)
        if (e.button === 2) return;
        
        isDragging = true;
        
        // Pega a posição do mouse
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    const debouncedSavePosition = debounce(async (left, top) => {
        try {
            await saveShortcut({
                id: shortcutId,
                position_x: left,
                position_y: top
            });
        } catch (error) {
            console.error('Erro ao salvar posição:', error);
        }
    }, 500);
    
    function elementDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        // Calcula a nova posição
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Define a nova posição
        const newLeft = iconElement.offsetLeft - pos1;
        const newTop = iconElement.offsetTop - pos2;
        
        iconElement.style.left = `${newLeft}px`;
        iconElement.style.top = `${newTop}px`;
        
        // Salva a posição (com debounce para evitar muitas chamadas)
        debouncedSavePosition(newLeft, newTop);
    }
    
    function closeDragElement() {
        if (!isDragging) return;
        
        // Para o movimento
        document.onmouseup = null;
        document.onmousemove = null;
        isDragging = false;
    }
}

function makeDraggable(windowId) {
    const windowElement = document.getElementById(windowId);
    const header = document.getElementById(`${windowId}-header`);
    
    if (!header) return;
    
    header.onmousedown = function(e) {
        e.preventDefault();
        
        // Trazer para frente ao clicar
        bringToFront(windowElement);
        
        const startX = e.clientX;
        const startY = e.clientY;
        
        // Obter posição atual corretamente
        const currentLeft = parseInt(windowElement.style.left) || 0;
        const currentTop = parseInt(windowElement.style.top) || 0;
        
        function moveWindow(e) {
            // Calcular nova posição
            const newLeft = currentLeft + e.clientX - startX;
            const newTop = currentTop + e.clientY - startY;
            
            // Aplicar nova posição
            windowElement.style.left = `${newLeft}px`;
            windowElement.style.top = `${newTop}px`;
        }
        
        function stopMoving() {
            document.removeEventListener('mousemove', moveWindow);
            document.removeEventListener('mouseup', stopMoving);
            
            // Salvar posição no localStorage
            localStorage.setItem(`window-${windowId}-position`, JSON.stringify({
                left: windowElement.style.left,
                top: windowElement.style.top
            }));
        }
        
        document.addEventListener('mousemove', moveWindow);
        document.addEventListener('mouseup', stopMoving);
    };
}

function bringToFront(element) {
    if (!element) return;
    
    zIndexCounter++;
    element.style.zIndex = zIndexCounter;
}

// ========== FUNÇÕES DE MANIPULAÇÃO DE JANELAS ==========
function openWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (!windowElement) return;
    
    windowElement.classList.remove('hidden');
    
    // Atualizar ícone na barra de tarefas
    const taskbarIcon = document.getElementById(`${windowId.split('-')[0]}-taskbar-icon`);
    if (taskbarIcon) {
        taskbarIcon.classList.remove('hidden');
    }
    
    // Restaurar posição salva ou definir posição padrão
    const savedPosition = JSON.parse(localStorage.getItem(`window-${windowId}-position`));
    if (savedPosition) {
        windowElement.style.left = savedPosition.left || '25%';
        windowElement.style.top = savedPosition.top || '16px';
    } else {
        // Posição padrão centralizada
        const windowWidth = windowElement.offsetWidth;
        const windowHeight = windowElement.offsetHeight;
        const left = (window.innerWidth - windowWidth) / 2;
        const top = (window.innerHeight - windowHeight) / 3;
        
        windowElement.style.left = `${left}px`;
        windowElement.style.top = `${top}px`;
    }
    
    // Trazer para frente
    bringToFront(windowElement);
}

function closeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (!windowElement) return;
    
    windowElement.classList.add('hidden');
    
    // Atualizar ícone na barra de tarefas
    const taskbarIcon = document.getElementById(`${windowId.split('-')[0]}-taskbar-icon`);
    if (taskbarIcon) {
        taskbarIcon.classList.add('hidden');
    }
}

function minimizeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (!windowElement) return;
    
    windowElement.classList.add('minimized');
    
    // Você pode adicionar lógica para mostrar o ícone na barra de tarefas como minimizado
}

function restoreWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (!windowElement) return;
    
    windowElement.classList.remove('minimized');
    bringToFront(windowElement);
}

// ========== FUNÇÕES DE TEMPO E DATA ==========
function updateTime() {
    const now = new Date();
    const options = { 
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    };
    const timeString = now.toLocaleTimeString('pt-BR', options);
    
    // Atualizar no relógio da barra de tarefas
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
    
    // Atualizar também na tela de login se existir
    if (document.getElementById('login-time')) {
        document.getElementById('login-time').textContent = timeString;
    }
    
    // Atualizar data
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateString = now.toLocaleDateString('pt-BR', dateOptions);
    
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

// ========== INICIALIZAÇÃO DA APLICAÇÃO ==========
document.addEventListener('DOMContentLoaded', async function() {
    // Adicionar estilos dinamicamente
    addDynamicStyles();
    
    // Verificar se há um token válido no localStorage
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
        authToken = savedToken;
        const isValid = await validateToken();
        
        if (isValid) {
            try {
                const decoded = jwt_decode(authToken);
                currentUser = {
                    id: decoded.id,
                    username: decoded.username
                };
                
                await loadUserShortcuts();
                updateUIAfterLogin();
            } catch (error) {
                console.error('Erro ao carregar sessão:', error);
                localStorage.removeItem('authToken');
                showAuthModal();
            }
        } else {
            localStorage.removeItem('authToken');
            showAuthModal();
        }
    } else {
        showAuthModal();
    }
    
    // Atualizar a hora imediatamente e a cada minuto
    updateTime();
    setInterval(updateTime, 60000);
    
    // Aplicar arrastável a todas as janelas
    ['chrome-window', 'vscode-window', 'spotify-window', 'word-window', 'explorer-window'].forEach(makeDraggable);
    
    // Configurar eventos de janelas
    setupWindowControls();
});

function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos para o modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        
        .modal-content {
            background: #f3f3f3;
            padding: 20px;
            border-radius: 8px;
            width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .modal-content.small {
            width: 300px;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #333;
        }
        
        .close-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        
        /* Estilos para abas de autenticação */
        .auth-tabs {
            display: flex;
            margin-bottom: 16px;
            border-bottom: 1px solid #ddd;
        }
        
        .auth-tab {
            padding: 8px 16px;
            background: #e5e5e5;
            color: #333;
            border: none;
            border-radius: 4px 4px 0 0;
            cursor: pointer;
            margin-right: 4px;
        }
        
        .auth-tab.active {
            background: #0078d7;
            color: white;
        }
        
        /* Estilos para formulários */
        .auth-form {
            display: none;
        }
        
        .auth-form.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 12px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: bold;
            color: #333;
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        
        .auth-button {
            padding: 8px 16px;
            background: #0078d7;
            color: white;
            border: none;
            border-radius: 4px;
            width: 100%;
            cursor: pointer;
            font-weight: bold;
        }
        
        .auth-button:hover {
            background: #106ebe;
        }
        
        .auth-footer {
            margin-top: 12px;
            text-align: center;
        }
        
        .auth-footer a {
            color: #0078d7;
            text-decoration: none;
        }
        
        .auth-footer a:hover {
            text-decoration: underline;
        }
        
        /* Mensagens de autenticação */
        .auth-message {
            margin-top: 12px;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
        }
        
        .auth-message.success {
            background-color: #dff6dd;
            color: #107c10;
        }
        
        .auth-message.error {
            background-color: #fde7e9;
            color: #d83b01;
        }
        
        /* Notificações */
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slide-in 0.3s ease-out;
        }
        
        .notification.notification-success {
            background-color: #107c10;
        }
        
        .notification.notification-error {
            background-color: #d83b01;
        }
        
        .notification.notification-info {
            background-color: #0078d7;
        }
        
        .notification.fade-out {
            animation: fade-out 0.5s ease-out forwards;
        }
        
        @keyframes slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fade-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        /* Menu de contexto */
        .context-menu {
            position: absolute;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            z-index: 1000;
            min-width: 150px;
        }
        
        .context-menu ul {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .context-menu li {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        
        .context-menu li:hover {
            background-color: #f5f5f5;
        }
        
        .context-menu .separator {
            height: 1px;
            background-color: #eee;
            padding: 0;
            margin: 4px 0;
        }
        
        /* Grade de ícones */
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .icon-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .icon-option:hover {
            background-color: #f0f0f0;
        }
        
        .icon-option.selected {
            background-color: #e1f0ff;
        }
        
        .icon-option img {
            width: 32px;
            height: 32px;
            margin-bottom: 4px;
        }
        
        .icon-option span {
            font-size: 0.8rem;
            text-align: center;
        }
        
        /* Propriedades do atalho */
        .properties-content {
            margin-bottom: 16px;
        }
        
        .property-row {
            display: flex;
            margin-bottom: 8px;
        }
        
        .property-label {
            font-weight: bold;
            width: 120px;
            color: #555;
        }
        
        .property-value {
            flex: 1;
        }
        
        .properties-footer {
            display: flex;
            justify-content: flex-end;
        }
        
        /* Classes utilitárias */
        .hidden {
            display: none !important;
        }
    `;
    
    document.head.appendChild(style);
}

function setupWindowControls() {
    // Configurar botões de controle de janela
    document.querySelectorAll('.window-control').forEach(control => {
        const windowId = control.closest('.window').id;
        
        control.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'minimize':
                    minimizeWindow(windowId);
                    break;
                case 'maximize':
                    // Implementar maximizar
                    break;
                case 'close':
                    closeWindow(windowId);
                    break;
            }
        });
    });
    
    // Configurar redimensionamento de janelas (simplificado)
    document.querySelectorAll('.window-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', initResize);
    });
}

function initResize(e) {
    e.preventDefault();
    
    const windowElement = e.target.closest('.window');
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(windowElement.style.width || windowElement.offsetWidth);
    const startHeight = parseInt(windowElement.style.height || windowElement.offsetHeight);
    
    function doResize(e) {
        const newWidth = startWidth + e.clientX - startX;
        const newHeight = startHeight + e.clientY - startY;
        
        windowElement.style.width = `${newWidth}px`;
        windowElement.style.height = `${newHeight}px`;
    }
    
    function stopResize() {
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        
        // Salvar tamanho da janela
        localStorage.setItem(`window-${windowElement.id}-size`, JSON.stringify({
            width: windowElement.style.width,
            height: windowElement.style.height
        }));
    }
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
}
// ========== FUNÇÕES PARA ABRIR APLICATIVOS ==========
function openChromeWindow() {
    openWindow('chrome-window');
    document.getElementById('chrome-taskbar-icon').classList.remove('hidden');
}

function openVSCodeWindow() {
    openWindow('vscode-window');
    document.getElementById('vscode-taskbar-icon').classList.remove('hidden');
}

function openSpotifyWindow() {
    openWindow('spotify-window');
    document.getElementById('spotify-taskbar-icon').classList.remove('hidden');
}

function openExplorerWindow() {
    openWindow('explorer-window');
}

function openWordWindow() {
    openWindow('word-window');
}

// Função genérica para abrir qualquer janela
function openWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (!windowElement) return;
    
    windowElement.classList.remove('hidden');
    bringToFront(windowElement);
    
    // Posicionamento padrão se não estiver definido
    if (!windowElement.style.left || !windowElement.style.top) {
        const windowWidth = windowElement.offsetWidth;
        const windowHeight = windowElement.offsetHeight;
        const left = (window.innerWidth - windowWidth) / 2;
        const top = (window.innerHeight - windowHeight) / 3;
        
        windowElement.style.left = `${left}px`;
        windowElement.style.top = `${top}px`;
    }
}
function closeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (!windowElement) return;
    
    windowElement.classList.add('hidden');
    
    // Esconder o ícone na barra de tarefas
    const taskbarIcon = document.getElementById(`${windowId.split('-')[0]}-taskbar-icon`);
    if (taskbarIcon) {
        taskbarIcon.classList.add('hidden');
    }
}
function bringToFront(element) {
    if (!element) return;
    
    zIndexCounter++;
    element.style.zIndex = zIndexCounter;
}
document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos de clique para os ícones do desktop
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        const appId = icon.dataset.id;
        if (appId) {
            icon.addEventListener('dblclick', () => {
                switch(appId) {
                    case 'chrome':
                        openChromeWindow();
                        break;
                    case 'vscode':
                        openVSCodeWindow();
                        break;
                    case 'spotify':
                        openSpotifyWindow();
                        break;
                }
            });
        }
    });
    
    // Configurar eventos para os ícones da barra de tarefas
    document.getElementById('chrome-taskbar-icon').addEventListener('click', openChromeWindow);
    document.getElementById('vscode-taskbar-icon').addEventListener('click', openVSCodeWindow);
    document.getElementById('spotify-taskbar-icon').addEventListener('click', openSpotifyWindow);
    
    // Atualizar a hora
    updateTime();
    setInterval(updateTime, 60000);
    
    // Tornar as janelas arrastáveis
    makeDraggable('chrome-window');
    makeDraggable('vscode-window');
    makeDraggable('spotify-window');
    makeDraggable('word-window');
    makeDraggable('explorer-window');
});
function makeDraggable(windowId) {
    const windowElement = document.getElementById(windowId);
    const header = document.getElementById(`${windowId}-header`);
    
    if (!header) return;
    
    header.onmousedown = function(e) {
        e.preventDefault();
        bringToFront(windowElement);
        
        const startX = e.clientX;
        const startY = e.clientY;
        const currentLeft = parseInt(windowElement.style.left) || 0;
        const currentTop = parseInt(windowElement.style.top) || 0;
        
        function moveWindow(e) {
            const newLeft = currentLeft + e.clientX - startX;
            const newTop = currentTop + e.clientY - startY;
            windowElement.style.left = `${newLeft}px`;
            windowElement.style.top = `${newTop}px`;
        }
        
        function stopMoving() {
            document.removeEventListener('mousemove', moveWindow);
            document.removeEventListener('mouseup', stopMoving);
        }
        
        document.addEventListener('mousemove', moveWindow);
        document.addEventListener('mouseup', stopMoving);
    };
}
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}
