/**
 * app.js - Point d'entrée principal de l'application
 * Initialise l'application et gère les interactions globales
 */

// État global de l'application
const appState = {
    conversations: [], // Liste des conversations
    currentConversationId: null, // ID de la conversation actuelle
    currentThreadId: null, // ID du thread actuel
    isModelSelectorOpen: false, // État du sélecteur de modèle
    currentModel: 'Assistant Standard', // Modèle actuel
    isMobile: window.innerWidth < 768, // Détection des appareils mobiles
    isSidebarOpen: false // État de la barre latérale sur mobile
};

// Initialisation de l'application
function initApp() {
    console.log('Initialisation de l\'application...');
    
    // Vérifier s'il y a des conversations enregistrées dans le localStorage
    loadFromLocalStorage();
    
    // Créer une nouvelle conversation si aucune n'existe
    if (appState.conversations.length === 0) {
        createNewConversation();
    } else {
        // Charger la dernière conversation
        const lastConversation = appState.conversations[appState.conversations.length - 1];
        switchToConversation(lastConversation.id);
    }
    
    // Ajouter les écouteurs d'événements
    setupEventListeners();
    
    // Mettre à jour l'interface utilisateur
    updateUI();
    
    console.log('Application initialisée avec succès');
}

// Création d'une nouvelle conversation
function createNewConversation() {
    const mainThreadId = generateUniqueId();
    
    const newConversation = {
        id: generateUniqueId(),
        title: 'Nouvelle conversation',
        threads: {
            // Thread principal
            [mainThreadId]: {
                id: mainThreadId,
                parentId: null, // Le thread principal n'a pas de parent
                messages: [],
                childThreads: [] // Liste des IDs des threads enfants
            }
        },
        mainThreadId: mainThreadId, // Référence au thread principal
        createdAt: new Date().toISOString()
    };
    
    appState.conversations.push(newConversation);
    appState.currentConversationId = newConversation.id;
    appState.currentThreadId = mainThreadId;
    
    // Mettre à jour la liste des conversations dans l'interface
    updateConversationsList();
    
    // Effacer la zone de messages
    clearMessages();
    
    // Sauvegarder dans le localStorage
    saveToLocalStorage();
    
    return newConversation;
}

// Fonction pour créer un nouveau thread
function createNewThread(parentMessageId) {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    const parentThread = getThreadById(appState.currentThreadId);
    if (!parentThread) return;
    
    // Créer le nouveau thread
    const newThreadId = generateUniqueId();
    
    // Ajouter le thread à la conversation
    currentConversation.threads[newThreadId] = {
        id: newThreadId,
        parentId: appState.currentThreadId, // Le parent est le thread actuel
        parentMessageId: parentMessageId, // ID du message auquel ce thread répond
        messages: [],
        childThreads: [],
        title: `Thread ${newThreadId.slice(0, 4)}`
    };
    
    // Ajouter le thread enfant au thread parent
    parentThread.childThreads.push(newThreadId);
    
    // Définir comme thread actuel
    appState.currentThreadId = newThreadId;
    
    // Masquer les messages non pertinents
    hideAllMessagesExcept(newThreadId);
    
    // Mettre à jour l'interface
    updateUI();
    
    // Sauvegarder dans le localStorage
    saveToLocalStorage();
    
    return newThreadId;
}

// Obtenir le thread actuel
function getCurrentThread() {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return null;
    
    return currentConversation.threads[appState.currentThreadId];
}

// Obtenir un thread par son ID
function getThreadById(threadId) {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return null;
    
    return currentConversation.threads[threadId];
}


// Afficher les messages d'un thread spécifique
function appendThreadMessages(threadId) {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    const thread = currentConversation.threads[threadId];
    if (!thread) return;
    
    // Nettoyer les anciens messages de thread appendés
    clearAppendedThreads();
    
    // Créer un conteneur pour ce thread
    const threadContainer = document.createElement('div');
    threadContainer.className = 'appended-thread';
    threadContainer.dataset.threadId = threadId;
    
    // Ajouter un séparateur/indicateur pour montrer où commence le thread
    const threadHeader = document.createElement('div');
    threadHeader.className = 'thread-header';
    
    // Si le thread a un parent, afficher le message parent en tant que référence
    if (thread.parentId && thread.parentMessageId) {
        const parentThread = currentConversation.threads[thread.parentId];
        const parentMessage = parentThread.messages.find(msg => msg.id === thread.parentMessageId);
        
        if (parentMessage) {
            threadHeader.innerHTML = `
                <div class="thread-indicator">
                    <div class="thread-path">
                        <span class="reference-label">Suite du message: </span>
                        <span class="parent-message-preview">${truncateText(parentMessage.content, 40)}</span>
                    </div>
                    <button class="close-thread-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Ajouter un écouteur d'événement pour fermer le thread
            threadHeader.querySelector('.close-thread-btn').addEventListener('click', () => {
                // Revenir au thread parent et afficher ses messages
                appState.currentThreadId = thread.parentId;
                hideAllMessagesExcept(thread.parentId);
                updateActiveThreadTags(thread.parentId);
            });
        }
    }
    
    threadContainer.appendChild(threadHeader);
    
    // Créer un conteneur pour les messages du thread
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'thread-messages';
    
    // Ajouter les messages du thread
    thread.messages.forEach(message => {
        // Créer l'élément de message
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}-message thread-message`;
        messageElement.dataset.messageId = message.id;
        
        // Créer l'avatar
        const avatarElement = document.createElement('div');
        avatarElement.className = `message-avatar ${message.role}-avatar`;
        
        // Définir l'icône de l'avatar
        avatarElement.innerHTML = message.role === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        // Créer le conteneur de contenu
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content markdown';
        contentElement.innerHTML = formatMessageContent(message.content);
        
        // Assembler le message
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);
        
        messagesContainer.appendChild(messageElement);
    });
    
    threadContainer.appendChild(messagesContainer);
    
    // Ajouter le thread à la fin de la liste des messages
    document.querySelector('.messages-list').appendChild(threadContainer);
    
    // Ajouter des styles pour distinguer visuellement les messages du thread
    addThreadStyles();
    
    // Faire défiler jusqu'au début du thread
    threadHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Changer de conversation
function switchToConversation(conversationId) {
    appState.currentConversationId = conversationId;
    
    // Obtenir la conversation actuelle
    const currentConversation = getCurrentConversation();
    
    // Définir le thread principal comme thread actuel
    if (currentConversation && currentConversation.mainThreadId) {
        appState.currentThreadId = currentConversation.mainThreadId;
    }
    
    // Mettre à jour l'interface utilisateur
    clearMessages();
    
    // Charger les messages du thread principal
    const mainThread = getCurrentThread();
    if (mainThread && mainThread.messages.length > 0) {
        mainThread.messages.forEach(message => {
            addMessageToUI(message.role, message.content, message.id);
        });
        
        // Cacher l'écran de bienvenue
        document.querySelector('.welcome-screen').style.display = 'none';
    } else {
        // Afficher l'écran de bienvenue
        document.querySelector('.welcome-screen').style.display = 'flex';
    }
    
    // Mettre à jour la liste des conversations (pour mettre en évidence la conversation active)
    updateConversationsList();
    
    // Mettre à jour le visualiseur de threads si disponible
    if (typeof updateThreadVisualizer === 'function') {
        updateThreadVisualizer();
    }
    
    // Fermer la barre latérale sur mobile après avoir changé de conversation
    if (appState.isMobile && appState.isSidebarOpen) {
        toggleSidebar();
    }
}

// Obtenir la conversation actuelle
function getCurrentConversation() {
    return appState.conversations.find(conv => conv.id === appState.currentConversationId);
}

// Générer un ID unique pour les conversations
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Bouton Nouvelle conversation
    document.querySelector('.new-chat-btn').addEventListener('click', () => {
        createNewConversation();
    });
    
    // Formulaire de message
    document.getElementById('message-form').addEventListener('submit', handleMessageSubmit);
    
    // Redimensionnement automatique du textarea
    const textarea = document.getElementById('user-input');
    textarea.addEventListener('input', autoResizeTextarea);
    
    // Sélecteur de modèle
    document.querySelector('.current-model').addEventListener('click', () => {
        toggleModelSelector();
    });
    
    // Options du sélecteur de modèle
    document.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', (e) => {
            selectModel(e.currentTarget.querySelector('span').textContent);
        });
    });
    
    // Clic en dehors du sélecteur de modèle pour le fermer
    document.addEventListener('click', (e) => {
        if (appState.isModelSelectorOpen && 
            !e.target.closest('.model-selector') && 
            !e.target.closest('.current-model')) {
            toggleModelSelector();
        }
    });
    
    // Écouteur pour fermer la barre latérale sur mobile lors d'un clic sur l'overlay
    document.addEventListener('click', (e) => {
        if (appState.isMobile && 
            appState.isSidebarOpen && 
            e.target.classList.contains('overlay')) {
            toggleSidebar();
        }
    });
    
    // Écouteur pour le redimensionnement de la fenêtre
    window.addEventListener('resize', handleResize);
}

// Gestion du redimensionnement de la fenêtre
function handleResize() {
    const isMobile = window.innerWidth < 768;
    
    // Mettre à jour l'état si nécessaire
    if (isMobile !== appState.isMobile) {
        appState.isMobile = isMobile;
        
        // Si on passe de mobile à desktop, s'assurer que la barre latérale est visible
        if (!isMobile && !appState.isSidebarOpen) {
            document.querySelector('.sidebar').classList.remove('open');
            document.querySelector('.overlay').classList.remove('open');
            appState.isSidebarOpen = false;
        }
    }
}

// Basculer l'affichage de la barre latérale sur mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    if (appState.isSidebarOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
    
    appState.isSidebarOpen = !appState.isSidebarOpen;
}

// Basculer l'affichage du sélecteur de modèle
function toggleModelSelector() {
    const modelSelector = document.querySelector('.model-selector');
    
    if (appState.isModelSelectorOpen) {
        modelSelector.style.display = 'none';
    } else {
        modelSelector.style.display = 'block';
    }
    
    appState.isModelSelectorOpen = !appState.isModelSelectorOpen;
}

// Sélectionner un modèle
function selectModel(modelName) {
    appState.currentModel = modelName;
    document.querySelector('.model-name').textContent = modelName;
    
    // Mettre à jour les options du sélecteur
    document.querySelectorAll('.model-option').forEach(option => {
        if (option.querySelector('span').textContent === modelName) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Fermer le sélecteur de modèle
    toggleModelSelector();
}

// Ajuster automatiquement la hauteur du textarea
function autoResizeTextarea() {
    const textarea = document.getElementById('user-input');
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    
    // Activer ou désactiver le bouton d'envoi
    const sendButton = document.querySelector('.send-btn');
    if (textarea.value.trim()) {
        sendButton.disabled = false;
    } else {
        sendButton.disabled = true;
    }
}

// Gérer l'envoi de message
function handleMessageSubmit(event) {
    event.preventDefault();
    
    const textarea = document.getElementById('user-input');
    const userMessage = textarea.value.trim();
    
    if (!userMessage) return;
    
    // Envoyer le message
    sendMessage(userMessage);
    
    // Réinitialiser le textarea
    textarea.value = '';
    textarea.style.height = 'auto';
    textarea.focus();
    
    // Désactiver le bouton d'envoi
    document.querySelector('.send-btn').disabled = true;
}

// Sauvegarder l'état dans le localStorage
function saveToLocalStorage() {
    localStorage.setItem('chatApp', JSON.stringify({
        conversations: appState.conversations,
        currentConversationId: appState.currentConversationId,
        currentThreadId: appState.currentThreadId, // Ajouter le thread actuel
        currentModel: appState.currentModel
    }));
}

// Charger l'état depuis le localStorage
function loadFromLocalStorage() {
    const savedState = localStorage.getItem('chatApp');
    
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Vérifier si les conversations ont déjà la structure de threads
        const conversations = parsedState.conversations || [];
        
        // Mettre à jour les conversations pour qu'elles aient la structure de threads si nécessaire
        appState.conversations = conversations.map(conv => {
            if (!conv.threads) {
                // Convertir l'ancienne structure vers la nouvelle
                const mainThreadId = generateUniqueId();
                return {
                    ...conv,
                    threads: {
                        [mainThreadId]: {
                            id: mainThreadId,
                            parentId: null,
                            messages: conv.messages || [],
                            childThreads: []
                        }
                    },
                    mainThreadId: mainThreadId
                };
            }
            return conv;
        });
        
        appState.currentConversationId = parsedState.currentConversationId;
        appState.currentThreadId = parsedState.currentThreadId;
        
        // Si pas de thread actif, utiliser le thread principal de la conversation active
        if (!appState.currentThreadId && appState.currentConversationId) {
            const currentConv = appState.conversations.find(c => c.id === appState.currentConversationId);
            if (currentConv && currentConv.mainThreadId) {
                appState.currentThreadId = currentConv.mainThreadId;
            }
        }
        
        appState.currentModel = parsedState.currentModel || 'Assistant Standard';
        
        // Mettre à jour le modèle affiché
        document.querySelector('.model-name').textContent = appState.currentModel;
    }
}

// Mettre à jour l'interface utilisateur
function updateUI() {
    // Mettre à jour la liste des conversations
    updateConversationsList();
    
    // Mettre à jour le modèle affiché
    document.querySelector('.model-name').textContent = appState.currentModel;
    
    // Ajouter les éléments spécifiques au mobile si nécessaire
    if (appState.isMobile && !document.querySelector('.menu-toggle')) {
        // Ajouter le bouton de menu
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.querySelector('.chat-area').prepend(menuToggle);
        
        // Ajouter l'overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);
        
        // Ajouter l'écouteur d'événement
        menuToggle.addEventListener('click', toggleSidebar);
    }
}

// Initialiser l'application au chargement de la page
document.addEventListener('DOMContentLoaded', initApp);


function deleteConversation(conversationId, event) {
    // Empêcher la propagation de l'événement pour éviter de sélectionner la conversation
    event.stopPropagation();
    
    // Demander confirmation avant de supprimer
    if (confirm("Êtes-vous sûr de vouloir supprimer cette conversation ?")) {
        // Trouver l'index de la conversation à supprimer
        const conversationIndex = appState.conversations.findIndex(conv => conv.id === conversationId);
        
        if (conversationIndex !== -1) {
            // Supprimer la conversation
            appState.conversations.splice(conversationIndex, 1);
            
            // Si c'était la conversation active, basculer vers une autre
            if (conversationId === appState.currentConversationId) {
                if (appState.conversations.length > 0) {
                    // Basculer vers la première conversation disponible
                    switchToConversation(appState.conversations[0].id);
                } else {
                    // S'il n'y a plus de conversations, en créer une nouvelle
                    createNewConversation();
                }
            }
            
            // Mettre à jour la liste des conversations
            updateConversationsList();
            
            // Sauvegarder dans le localStorage
            saveToLocalStorage();
        }
    }
}