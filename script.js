
// ========== VARIÁVEIS GLOBAIS ==========
let activeWindows = [];
let windowZIndex = 100;

// ========== FUNÇÕES DE TEMPO ==========
function updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}`;
}

// ========== GERENCIAMENTO DE JANELAS ==========
function openWindow(windowId) {
    const window = document.getElementById(windowId);
    window.classList.remove('hidden');
    window.style.zIndex = ++windowZIndex;
    makeWindowDraggable(windowId, `${windowId}-header`);
    
    // Atualiza ícone na barra de tarefas
    const taskbarIcon = document.getElementById(`${windowId.split('-')[0]}-taskbar-icon`);
    if (taskbarIcon) {
        taskbarIcon.classList.remove('hidden');
    }
    
    // Adiciona à lista de janelas ativas
    if (!activeWindows.includes(windowId)) {
        activeWindows.push(windowId);
    }
}

function closeWindow(windowId) {
    document.getElementById(windowId).classList.add('hidden');
    
    // Atualiza ícone na barra de tarefas
    const taskbarIcon = document.getElementById(`${windowId.split('-')[0]}-taskbar-icon`);
    if (taskbarIcon) {
        taskbarIcon.classList.add('hidden');
    }
    
    // Remove da lista de janelas ativas
    activeWindows = activeWindows.filter(id => id !== windowId);
}

function bringToFront(windowId) {
    const window = document.getElementById(windowId);
    window.style.zIndex = ++windowZIndex;
}

// ========== FUNÇÕES ESPECÍFICAS DE APLICATIVOS ==========
function openChromeWindow() {
    openWindow('chrome-window');
    document.getElementById('chrome-search').focus();
}

function openVSCodeWindow() {
    openWindow('vscode-window');
}

function openSpotifyWindow() {
    openWindow('spotify-window');
}

function openExplorerWindow() {
    openWindow('explorer-window');
}

// ========== EDITOR DE TEXTO ==========
function formatText(format) {
    const editor = document.getElementById('editor');
    document.execCommand(format, false, null);
    editor.focus();
}

function saveDocument() {
    const content = document.getElementById('editor').innerHTML;
    localStorage.setItem('documentContent', content);
    
    // Cria um blob com o conteúdo
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Cria um link para download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Documento.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Documento salvo com sucesso!');
}

// ========== ARRASTAR JANELAS ==========
function makeWindowDraggable(windowId, headerId) {
    const window = document.getElementById(windowId);
    const header = document.getElementById(headerId);
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Traz a janela para frente
        bringToFront(windowId);
        
        // Pega a posição do mouse
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Calcula a nova posição
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Define a nova posição
        window.style.top = (window.offsetTop - pos2) + "px";
        window.style.left = (window.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
        // Para o movimento
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    // Configura o relógio
    updateTime();
    setInterval(updateTime, 60000);
    
    // Carrega conteúdo salvo (se existir)
    const savedContent = localStorage.getItem('documentContent');
    if (savedContent) {
        document.getElementById('editor').innerHTML = savedContent;
    }
    
    // Torna as janelas arrastáveis
    const windows = ['word-window', 'explorer-window', 'chrome-window', 'vscode-window', 'spotify-window'];
    windows.forEach(windowId => {
        makeWindowDraggable(windowId, `${windowId}-header`);
    });
    
    // Adiciona evento de clique para os ícones do desktop
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('dblclick', function() {
            const label = this.querySelector('.desktop-icon-label').textContent;
            if (label.includes('Documentos')) {
                openWindow('word-window');
            } else if (label.includes('Este Computador')) {
                openWindow('explorer-window');
            } else if (label.includes('Chrome')) {
                openChromeWindow();
            } else if (label.includes('VS Code')) {
                openVSCodeWindow();
            } else if (label.includes('Spotify')) {
                openSpotifyWindow();
            }
        });
    });
    
    // Adiciona evento de foco para as janelas
    document.querySelectorAll('[id$="-window"]').forEach(window => {
        window.addEventListener('mousedown', function() {
            bringToFront(this.id);
        });
    });
    
    // Adiciona funcionalidade de pesquisa no Chrome
    document.getElementById('chrome-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value;
            if (query.trim() !== '') {
                alert(`Você pesquisou por: ${query}\n\nEm uma implementação real, isso redirecionaria para o Google com os resultados da pesquisa.`);
            }
        }
    });
    
    // Adiciona funcionalidade de minimizar/maximizar/fechar para todas as janelas
    document.querySelectorAll('[id$="-window"] .window-controls button').forEach(button => {
        button.addEventListener('click', function() {
            const windowId = this.closest('[id$="-window"]').id;
            if (this.classList.contains('minimize-btn')) {
                // Implementar minimizar
            } else if (this.classList.contains('maximize-btn')) {
                // Implementar maximizar
            } else if (this.classList.contains('close-btn')) {
                closeWindow(windowId);
            }
        });
    });
});
