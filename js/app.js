// App State
let appState = {
    notes: [],
    tasks: [],
    inventory: {
        copperGears: 0,
        brassTubes: 0,
        goldRivets: 0
    },
    pressure: 0
};

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const boilerFill = document.getElementById('boiler-fill');
const pressureValue = document.getElementById('pressure-value');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    // Simular carga inicial
    setTimeout(() => {
        loadingOverlay.classList.add('hide');
    }, 1500);
    
    // Cargar datos guardados
    loadData();
    
    // Inicializar fecha y hora
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Actualizar UI
    updateUI();
    
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', registration);
            updateOnlineStatus();
            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
        } catch (error) {
            console.error('Error al registrar SW:', error);
        }
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Navegación
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.getAttribute('data-view');
            switchView(viewName);
            
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Modales
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.modal-close');
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(modal => modal.classList.remove('active'));
        });
    });
    
    // Nueva nota
    document.getElementById('new-note-btn')?.addEventListener('click', () => {
        document.getElementById('note-modal').classList.add('active');
        document.getElementById('modal-title').textContent = 'Nueva Anotación';
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
    });
    
    // Guardar nota
    document.getElementById('save-note')?.addEventListener('click', () => {
        const title = document.getElementById('note-title').value;
        const content = document.getElementById('note-content').value;
        
        if (title && content) {
            addNote(title, content);
            document.getElementById('note-modal').classList.remove('active');
            updateUI();
            saveData();
        }
    });
    
    // Nueva tarea
    document.getElementById('new-task-btn')?.addEventListener('click', () => {
        document.getElementById('task-modal').classList.add('active');
        document.getElementById('task-title').value = '';
    });
    
    // Guardar tarea
    document.getElementById('save-task')?.addEventListener('click', () => {
        const title = document.getElementById('task-title').value;
        const priority = document.getElementById('task-priority').value;
        
        if (title) {
            addTask(title, priority);
            document.getElementById('task-modal').classList.remove('active');
            updateUI();
            saveData();
        }
    });
    
    // Fabricar engranaje (minijuego)
    document.getElementById('craft-item')?.addEventListener('click', () => {
        if (appState.inventory.copperGears >= 3) {
            appState.inventory.copperGears -= 3;
            appState.inventory.goldRivets++;
            updateInventoryUI();
            saveData();
            playSound('craft');
        } else {
            alert('Necesitas 3 engranajes de cobre para fabricar 1 remache dorado');
        }
    });
}

// Funciones principales
function addNote(title, content) {
    const newNote = {
        id: Date.now(),
        title: title,
        content: content,
        date: new Date().toISOString(),
        type: 'note'
    };
    appState.notes.unshift(newNote);
    updatePressure();
}

function addTask(title, priority) {
    const newTask = {
        id: Date.now(),
        title: title,
        priority: priority,
        completed: false,
        date: new Date().toISOString()
    };
    appState.tasks.unshift(newTask);
    updatePressure();
}

function toggleTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        updatePressure();
        updateUI();
        saveData();
    }
}

function deleteNote(noteId) {
    appState.notes = appState.notes.filter(n => n.id !== noteId);
    updatePressure();
    updateUI();
    saveData();
}

function deleteTask(taskId) {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    updatePressure();
    updateUI();
    saveData();
}

function updatePressure() {
    // Calcular presión basada en tareas completadas y notas
    const totalTasks = appState.tasks.length;
    const completedTasks = appState.tasks.filter(t => t.completed).length;
    const totalNotes = appState.notes.length;
    
    let pressure = 0;
    if (totalTasks > 0) {
        pressure = (completedTasks / totalTasks) * 70;
    }
    pressure += Math.min(totalNotes * 5, 30);
    
    appState.pressure = Math.min(pressure, 100);
    
    // Actualizar UI de la caldera
    boilerFill.style.width = `${appState.pressure}%`;
    pressureValue.textContent = `${Math.round(appState.pressure)}%`;
    
    // Bonus: si presión al 100%, agregar recurso
    if (appState.pressure === 100 && !appState.bonusGiven) {
        appState.inventory.copperGears++;
        appState.bonusGiven = true;
        updateInventoryUI();
        setTimeout(() => {
            appState.bonusGiven = false;
        }, 5000);
    }
}

function updateUI() {
    // Actualizar notas recientes en dashboard
    const recentNotesContainer = document.getElementById('recent-notes');
    if (recentNotesContainer) {
        const recentNotes = appState.notes.slice(0, 3);
        if (recentNotes.length === 0) {
            recentNotesContainer.innerHTML = '<p class="empty-message">Aún no hay notas. Tira de la palanca para comenzar.</p>';
        } else {
            recentNotesContainer.innerHTML = recentNotes.map(note => `
                <div class="note-card">
                    <div>
                        <div class="note-title">${escapeHtml(note.title)}</div>
                        <div class="note-date">${new Date(note.date).toLocaleDateString()}</div>
                    </div>
                    <button class="delete-btn" data-id="${note.id}" data-type="note">×</button>
                </div>
            `).join('');
        }
    }
    
    // Actualizar estadísticas
    document.getElementById('today-notes').textContent = appState.notes.length;
    document.getElementById('completed-tasks').textContent = appState.tasks.filter(t => t.completed).length;
    document.getElementById('streak-days').textContent = Math.floor(Math.random() * 30); // Simulado
    
    // Actualizar lista de notas
    const notesContainer = document.getElementById('notes-container');
    if (notesContainer) {
        if (appState.notes.length === 0) {
            notesContainer.innerHTML = '<p class="empty-message">No hay notas. Crea una nueva para comenzar tu bitácora.</p>';
        } else {
            notesContainer.innerHTML = appState.notes.map(note => `
                <div class="note-card">
                    <div>
                        <div class="note-title">${escapeHtml(note.title)}</div>
                        <div class="note-content-preview">${escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}</div>
                        <div class="note-date">${new Date(note.date).toLocaleString()}</div>
                    </div>
                    <button class="delete-btn" data-id="${note.id}" data-type="note">×</button>
                </div>
            `).join('');
        }
    }
    
    // Actualizar lista de tareas
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
        if (appState.tasks.length === 0) {
            tasksContainer.innerHTML = '<p class="empty-message">No hay tareas. Agrega inventos pendientes.</p>';
        } else {
            tasksContainer.innerHTML = appState.tasks.map(task => `
                <div class="task-card" style="border-left: 4px solid ${task.priority === 'high' ? '#ff4444' : task.priority === 'medium' ? '#D4AF37' : '#4CAF50'}">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="task-checkbox">
                        <div>
                            <div class="task-title" style="${task.completed ? 'text-decoration: line-through; opacity: 0.7' : ''}">${escapeHtml(task.title)}</div>
                            <div class="note-date">${new Date(task.date).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <button class="delete-btn" data-id="${task.id}" data-type="task">×</button>
                </div>
            `).join('');
        }
        
        // Agregar event listeners a checkboxes
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = parseInt(e.target.getAttribute('data-id'));
                toggleTask(taskId);
            });
        });
    }
    
    // Agregar event listeners a botones de eliminar
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.getAttribute('data-id'));
            const type = btn.getAttribute('data-type');
            if (type === 'note') {
                deleteNote(id);
            } else if (type === 'task') {
                deleteTask(id);
            }
        });
    });
}

function updateInventoryUI() {
    document.getElementById('copper-gears').textContent = appState.inventory.copperGears;
    document.getElementById('brass-tubes').textContent = appState.inventory.brassTubes;
    document.getElementById('gold-rivets').textContent = appState.inventory.goldRivets;
}

function switchView(viewName) {
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('es-ES');
    
    document.getElementById('current-date').textContent = dateStr;
    document.getElementById('current-time').textContent = timeStr;
}

function updateOnlineStatus() {
    const statusDot = document.getElementById('online-status');
    const statusText = document.getElementById('status-text');
    
    if (navigator.onLine) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Conectado a la red de vapor';
    } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Modo offline - Los datos se guardarán localmente';
    }
}

// Almacenamiento
function saveData() {
    const dataToSave = {
        notes: appState.notes,
        tasks: appState.tasks,
        inventory: appState.inventory,
        pressure: appState.pressure
    };
    localStorage.setItem('steampunkDiary', JSON.stringify(dataToSave));
    
    // Calcular y mostrar uso de almacenamiento
    const size = new Blob([JSON.stringify(dataToSave)]).size;
    const sizeInMB = (size / (1024 * 1024)).toFixed(2);
    document.getElementById('storage-used').textContent = sizeInMB;
}

function loadData() {
    const savedData = localStorage.getItem('steampunkDiary');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        appState.notes = parsed.notes || [];
        appState.tasks = parsed.tasks || [];
        appState.inventory = parsed.inventory || { copperGears: 0, brassTubes: 0, goldRivets: 0 };
        appState.pressure = parsed.pressure || 0;
    } else {
        // Datos de ejemplo para demostración
        appState.notes = [
            {
                id: Date.now(),
                title: 'Primer diseño del motor de vapor',
                content: 'He ideado un nuevo sistema de engranajes que podría aumentar la eficiencia en un 47%. Debo probarlo mañana.',
                date: new Date().toISOString(),
                type: 'note'
            }
        ];
        appState.tasks = [
            {
                id: Date.now() + 1,
                title: 'Calibrar el regulador de presión',
                priority: 'high',
                completed: false,
                date: new Date().toISOString()
            }
        ];
        appState.inventory = { copperGears: 5, brassTubes: 3, goldRivets: 1 };
    }
    updateInventoryUI();
    updatePressure();
}

function playSound(type) {
    // Placeholder para sonidos (implementar con Web Audio API después)
    console.log(`🔊 Sonido: ${type}`);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
