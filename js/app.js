/**
 * app.js - Point d'entrée principal de l'application
 * Initialise l'application et gère les interactions globales
 */

// État global de l'application
const appState = {
    conversations: [], // Liste des conversations
    currentConversationId: null, // ID de la conversation actuelle
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
    const newConversation = {
        id: generateUniqueId(),
        title: 'Nouvelle conversation',
        messages: [],
        createdAt: new Date().toISOString()
    };
    
    appState.conversations.push(newConversation);
    appState.currentConversationId = newConversation.id;
    
    // Mettre à jour la liste des conversations dans l'interface
    updateConversationsList();
    
    // Effacer la zone de messages
    clearMessages();
    
    // Sauvegarder dans le localStorage
    saveToLocalStorage();
    
    return newConversation;
}

// Changer de conversation
function switchToConversation(conversationId) {
    appState.currentConversationId = conversationId;
    
    // Mettre à jour l'interface utilisateur
    clearMessages();
    
    // Obtenir la conversation actuelle
    const currentConversation = getCurrentConversation();
    
    // Charger les messages de la conversation
    if (currentConversation && currentConversation.messages.length > 0) {
        currentConversation.messages.forEach(message => {
            addMessageToUI(message.role, message.content);
        });
        
        // Cacher l'écran de bienvenue
        document.querySelector('.welcome-screen').style.display = 'none';
    } else {
        // Afficher l'écran de bienvenue
        document.querySelector('.welcome-screen').style.display = 'flex';
    }
    
    // Mettre à jour la liste des conversations (pour mettre en évidence la conversation active)
    updateConversationsList();
    
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
        currentModel: appState.currentModel
    }));
}

// Charger l'état depuis le localStorage
function loadFromLocalStorage() {
    const savedState = localStorage.getItem('chatApp');
    
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        appState.conversations = parsedState.conversations || [];
        appState.currentConversationId = parsedState.currentConversationId;
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