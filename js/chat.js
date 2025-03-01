/**
 * chat.js - Gestion des messages et interactions du chat
 * Version modifiée pour utiliser le serveur
 */

// Envoyer un message
function sendMessage(message) {
    // Cacher l'écran de bienvenue s'il est visible
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
    }
    
    // Ajouter le message utilisateur à l'interface et à la conversation
    addMessageToUI('user', message);
    addMessageToConversation('user', message);
    
    // Faire défiler jusqu'au bas de la zone de messages
    scrollToBottom();
    
    // Afficher l'indicateur de chargement
    showLoadingIndicator();
    
    // Envoyer la requête au serveur
    getResponseFromBackend(message)
        .then(response => {
            // Cacher l'indicateur de chargement
            hideLoadingIndicator();
            
            // Ajouter la réponse de l'assistant à l'interface et à la conversation
            addMessageToUI('assistant', response);
            addMessageToConversation('assistant', response);
            
            // Mettre à jour le titre de la conversation si c'est le premier échange
            updateConversationTitle(message);
            
            // Mettre à jour la liste des conversations dans la barre latérale
            updateConversationsList();
            
            // Faire défiler jusqu'au bas de la zone de messages
            scrollToBottom();
        })
        .catch(error => {
            // Cacher l'indicateur de chargement
            hideLoadingIndicator();
            
            // Afficher un message d'erreur
            addMessageToUI('assistant', "Désolé, une erreur est survenue lors de la communication avec le serveur.");
            addMessageToConversation('assistant', "Désolé, une erreur est survenue lors de la communication avec le serveur.");
            
            console.error("Erreur lors de la communication avec le serveur:", error);
        });
}

// Fonction qui communique avec le serveur backend
async function getResponseFromBackend(userMessage) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: userMessage, 
                model: appState.currentModel 
            })
        });
        
        if (!response.ok) {
            throw new Error('Erreur de communication avec le serveur');
        }
        
        const data = await response.json();
        return data.response;
    } catch (error) {
        throw error;
    }
}

// Ajouter un message à la conversation courante (en mémoire)
function addMessageToConversation(role, content) {
    const currentConversation = getCurrentConversation();
    
    if (currentConversation) {
        currentConversation.messages.push({
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        // Sauvegarder dans le localStorage
        saveToLocalStorage();
    }
}

// Ajouter un message à l'interface utilisateur
function addMessageToUI(role, content) {
    const messagesContainer = document.querySelector('.messages-list');
    
    // Créer l'élément de message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}-message`;
    
    // Créer l'avatar
    const avatarElement = document.createElement('div');
    avatarElement.className = `message-avatar ${role}-avatar`;
    
    // Définir l'icône de l'avatar
    if (role === 'user') {
        avatarElement.innerHTML = '<i class="fas fa-user"></i>';
    } else {
        avatarElement.innerHTML = '<i class="fas fa-robot"></i>';
    }
    
    // Créer le contenu du message
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content markdown';
    
    // Formater le contenu (avec Markdown)
    contentElement.innerHTML = formatMessageContent(content);
    
    // Assembler les éléments
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);
    
    // Ajouter le message à la liste
    messagesContainer.appendChild(messageElement);
}

// Le reste du fichier reste identique...
// (fonctions formatMessageContent, showLoadingIndicator, hideLoadingIndicator, etc.)

// Formater le contenu d'un message (avec support Markdown simplifié)
function formatMessageContent(content) {
    // Cette fonction pourrait utiliser une bibliothèque comme marked.js
    // pour une véritable conversion Markdown. Voici une implémentation simplifiée.
    
    let formattedContent = content;
    
    // Convertir les retours à la ligne
    formattedContent = formattedContent.replace(/\n/g, '<br>');
    
    // Convertir les blocs de code
    formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Convertir le code en ligne
    formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convertir les titres
    formattedContent = formattedContent.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    formattedContent = formattedContent.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    formattedContent = formattedContent.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    
    // Convertir les listes
    formattedContent = formattedContent.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    formattedContent = formattedContent.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
    
    // Convertir les paragraphes
    formattedContent = formattedContent.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');
    formattedContent = formattedContent.replace(/<\/ul><ul>/g, '');
    
    // Convertir le texte en gras
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convertir le texte en italique
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return formattedContent;
}

// Afficher l'indicateur de chargement
function showLoadingIndicator() {
    const messagesContainer = document.querySelector('.messages-list');
    
    // Créer l'élément de message
    const loadingElement = document.createElement('div');
    loadingElement.className = 'message assistant-message loading';
    
    // Créer l'avatar
    const avatarElement = document.createElement('div');
    avatarElement.className = 'message-avatar assistant-avatar';
    avatarElement.innerHTML = '<i class="fas fa-robot"></i>';
    
    // Créer l'indicateur de chargement
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    
    // Assembler les éléments
    loadingElement.appendChild(avatarElement);
    loadingElement.appendChild(loadingIndicator);
    
    // Ajouter l'indicateur à la liste
    messagesContainer.appendChild(loadingElement);
    
    // Faire défiler jusqu'au bas de la zone de messages
    scrollToBottom();
}

// Cacher l'indicateur de chargement
function hideLoadingIndicator() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Faire défiler jusqu'au bas de la zone de messages
function scrollToBottom() {
    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Effacer tous les messages affichés
function clearMessages() {
    const messagesContainer = document.querySelector('.messages-list');
    messagesContainer.innerHTML = '';
}

// Mettre à jour le titre de la conversation en fonction du premier message
function updateConversationTitle(message) {
    const currentConversation = getCurrentConversation();
    
    // Ne mettre à jour que si c'est le premier message de la conversation
    if (currentConversation && currentConversation.messages.length === 2) {
        // Utiliser les 30 premiers caractères du message comme titre
        let title = message.substring(0, 30).trim();
        if (message.length > 30) title += '...';
        
        currentConversation.title = title;
        
        // Mettre à jour la liste des conversations
        updateConversationsList();
        
        // Sauvegarder dans le localStorage
        saveToLocalStorage();
    }
}

// Mettre à jour la liste des conversations dans la barre latérale
function updateConversationsList() {
    const conversationsList = document.querySelector('.conversations-list');
    conversationsList.innerHTML = '';
    
    // Trier les conversations par date (la plus récente en premier)
    const sortedConversations = [...appState.conversations].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Ajouter chaque conversation à la liste
    sortedConversations.forEach(conversation => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        
        // Marquer la conversation active
        if (conversation.id === appState.currentConversationId) {
            conversationItem.classList.add('active');
        }
        
        // Créer l'icône et le titre de la conversation
        conversationItem.innerHTML = `
            <i class="fas fa-comment-alt"></i>
            <span>${conversation.title}</span>
        `;
        
        // Créer le bouton de suppression
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-conversation-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Supprimer cette conversation';
        
        // Ajouter l'écouteur d'événement pour la suppression
        deleteButton.addEventListener('click', (e) => deleteConversation(conversation.id, e));
        
        // Ajouter le bouton à l'élément de conversation
        conversationItem.appendChild(deleteButton);
        
        // Ajouter l'écouteur d'événement pour changer de conversation
        conversationItem.addEventListener('click', () => {
            switchToConversation(conversation.id);
        });
        
        conversationsList.appendChild(conversationItem);
    });
}