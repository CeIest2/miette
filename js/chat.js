/**
 * chat.js - Gestion des messages et interactions du chat
 * Version modifiée pour utiliser le serveur
 */

// Envoyer un message
function sendMessage(message) {
    // Cacher l'écran de bienvenue s'il est visible
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
    }
    
    // Générer un ID unique pour ce message
    const messageId = generateUniqueId();
    
    // Ajouter le message utilisateur à l'interface et à la conversation
    addMessageToUI('user', message, messageId);
    addMessageToThread('user', message, messageId);
    
    // Faire défiler jusqu'au bas de la zone de messages
    scrollToBottom();
    
    // Afficher l'indicateur de chargement
    showLoadingIndicator();
    
    // Générer une réponse DIRECTEMENT, sans appel externe
    const response = generateDirectResponse(message);
    
    // Cacher l'indicateur de chargement après un court délai pour l'UI
    setTimeout(() => {
        hideLoadingIndicator();
        
        // Générer un ID unique pour la réponse
        const responseId = generateUniqueId();
        
        // Ajouter la réponse de l'assistant à l'interface et à la conversation
        addMessageToUI('assistant', response, responseId);
        addMessageToThread('assistant', response, responseId);
        
        // Mettre à jour le titre de la conversation si c'est le premier échange
        updateConversationTitle(message);
        
        // Mettre à jour la liste des conversations dans la barre latérale
        updateConversationsList();
        
        // Faire défiler jusqu'au bas de la zone de messages
        scrollToBottom();
    }, 10); // Délai minimal juste pour l'effet visuel
}

function generateDirectResponse(userMessage) {
    // Convertir le message en minuscules pour faciliter la comparaison
    const message = userMessage.toLowerCase();
    
    // Réponses pour différents types de questions
    if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
        return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
    }
    
    if (message.includes('merci')) {
        return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.";
    }
    
    // Autres conditions existantes de votre code...
    
    // Réponses génériques par défaut
    const genericResponses = [
        "Je comprends votre question. Pourriez-vous me donner plus de détails ?",
        "C'est une question intéressante. Dans un système réel, je pourrais vous donner une réponse plus détaillée.",
        "Votre question est pertinente. Je serai heureux de vous aider davantage si vous précisez votre demande."
    ];
    
    // Choisir une réponse générique aléatoire
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
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

// Ajouter un message au thread courant
function addMessageToThread(role, content, messageId) {
    const currentThread = getCurrentThread();
    
    if (currentThread) {
        currentThread.messages.push({
            id: messageId,
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        // Sauvegarder dans le localStorage
        saveToLocalStorage();
    }
}

// Ajouter un message à l'interface utilisateur (modifié pour les threads)
function addMessageToUI(role, content, messageId) {
    const messagesContainer = document.querySelector('.messages-list');
    
    // Vérifier si le message existe déjà pour éviter les doublons
    if (document.querySelector(`.message[data-message-id="${messageId}"]`)) {
        console.log(`Message ${messageId} déjà affiché, éviter le doublon`);
        return;
    }
    
    // Créer l'élément principal du message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}-message`;
    messageElement.dataset.messageId = messageId;
    
    // Créer l'avatar
    const avatarElement = document.createElement('div');
    avatarElement.className = `message-avatar ${role}-avatar`;
    
    // Définir l'icône de l'avatar
    if (role === 'user') {
        avatarElement.innerHTML = '<i class="fas fa-user"></i>';
    } else {
        avatarElement.innerHTML = '<i class="fas fa-robot"></i>';
    }
    
    // Créer le conteneur de contenu
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content markdown';
    
    // Formater le contenu du message (avec Markdown)
    contentElement.innerHTML = formatMessageContent(content);
    
    // Si c'est un message de l'assistant, ajouter le bouton pour créer un nouveau thread
    if (role === 'assistant') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const newThreadBtn = document.createElement('button');
        newThreadBtn.className = 'new-thread-btn';
        newThreadBtn.innerHTML = '<i class="fas fa-code-branch"></i> Nouveau fil';
        newThreadBtn.addEventListener('click', () => {
            // Créer un nouveau thread à partir de ce message
            const newThreadId = createNewThread(messageId);
            
            // Si la création a réussi, ajouter un visuel pour ce thread
            if (newThreadId) {
                addThreadTagToMessage(messageId, newThreadId);
            }
        });
        
        actionsDiv.appendChild(newThreadBtn);
        contentElement.appendChild(actionsDiv);
    }
    
    // Si des threads existent pour ce message, ajouter la liste des threads
    const currentConversation = getCurrentConversation();
    if (currentConversation && role === 'assistant') {
        // Chercher des threads qui ont ce message comme parent
        let threadsFromThisMessage = [];
        
        // Vérifier si la structure threads existe
        if (currentConversation.threads) {
            // Parcourir tous les threads de la conversation
            Object.values(currentConversation.threads).forEach(thread => {
                if (thread.parentMessageId === messageId) {
                    threadsFromThisMessage.push(thread);
                }
            });
        }
        
        if (threadsFromThisMessage.length > 0) {
            const threadListElement = document.createElement('div');
            threadListElement.className = 'thread-list';
            
            // Ajouter un tag pour chaque thread
            threadsFromThisMessage.forEach(thread => {
                const threadTag = document.createElement('span');
                threadTag.className = 'thread-tag';
                if (thread.id === appState.currentThreadId) {
                    threadTag.classList.add('active');
                }
                threadTag.textContent = thread.title || `Thread ${thread.id.slice(0, 4)}`;
                threadTag.dataset.threadId = thread.id;
                
                // Ajouter l'événement pour basculer vers ce thread
                threadTag.addEventListener('click', () => {
                    switchToThread(thread.id);
                });
                
                threadListElement.appendChild(threadTag);
            });
            
            contentElement.appendChild(threadListElement);
        }
    }
    
    // Assembler le message
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);
    
    // Ajouter le message à la liste
    messagesContainer.appendChild(messageElement);
    
    // Déboguer
    console.log(`Message ajouté: ${role} (ID: ${messageId})`);
}

function addThreadTagToMessage(messageId, threadId) {
    // Trouver le message
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) {
        console.error(`Message avec ID ${messageId} introuvable`);
        return;
    }
    
    // Trouver ou créer la liste des threads
    let threadList = messageElement.querySelector('.thread-list');
    if (!threadList) {
        threadList = document.createElement('div');
        threadList.className = 'thread-list';
        messageElement.querySelector('.message-content').appendChild(threadList);
    }
    
    // Créer le tag
    const threadTag = document.createElement('span');
    threadTag.className = 'thread-tag active'; // Active car c'est le thread nouvellement créé
    
    // Obtenir les informations du thread
    const currentConversation = getCurrentConversation();
    const thread = currentConversation.threads[threadId];
    
    threadTag.textContent = thread ? (thread.title || `Thread ${threadId.slice(0, 4)}`) : `Thread ${threadId.slice(0, 4)}`;
    threadTag.dataset.threadId = threadId;
    
    // Ajouter l'événement pour basculer vers ce thread
    threadTag.addEventListener('click', () => {
        switchToThread(threadId);
    });
    
    // Ajouter à la liste
    threadList.appendChild(threadTag);
}

// Ajouter une référence visuelle au message parent
function addThreadReferenceToUI(parentMessage, parentThreadId) {
    const messagesContainer = document.querySelector('.messages-list');
    
    // Créer l'élément de référence
    const referenceElement = document.createElement('div');
    referenceElement.className = 'thread-indicator';
    
    // Ajouter l'indicateur de chemin
    const pathElement = document.createElement('div');
    pathElement.className = 'thread-path';
    pathElement.innerHTML = `
        <span>En réponse à: </span>
        <span class="parent-message-preview">${truncateText(parentMessage.content, 40)}</span>
    `;
    
    // Ajouter un bouton pour revenir au thread parent
    const backButton = document.createElement('button');
    backButton.className = 'back-to-parent-btn';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Revenir';
    backButton.addEventListener('click', () => {
        switchToThread(parentThreadId);
    });
    
    referenceElement.appendChild(pathElement);
    referenceElement.appendChild(backButton);
    
    // Insérer la référence au début de la liste de messages
    messagesContainer.prepend(referenceElement);
}

// Ajouter un tag visuel pour un thread créé à partir d'un message
function addThreadTagToMessage(messageId) {
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    // Vérifier si une liste de threads existe déjà
    let threadList = messageElement.querySelector('.thread-list');
    if (!threadList) {
        threadList = document.createElement('div');
        threadList.className = 'thread-list';
        messageElement.querySelector('.message-content').appendChild(threadList);
    }
    
    // Obtenir le thread nouvellement créé
    const currentThread = getCurrentThread();
    if (!currentThread) return;
    
    // Créer le tag
    const threadTag = document.createElement('span');
    threadTag.className = 'thread-tag active'; // Active car c'est le thread courant
    threadTag.textContent = currentThread.title || `Thread ${currentThread.id.slice(0, 4)}`;
    threadTag.dataset.threadId = currentThread.id;
    
    // Ajouter l'événement pour basculer vers ce thread
    threadTag.addEventListener('click', () => {
        switchToThread(currentThread.id);
    });
    
    // Ajouter à la liste
    threadList.appendChild(threadTag);
}

// Mettre à jour l'indicateur de thread actif
function updateThreadIndicator() {
    // Supprimer l'indicateur existant s'il y en a un
    const existingIndicator = document.querySelector('.thread-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Obtenir le thread actuel
    const currentThread = getCurrentThread();
    if (!currentThread || !currentThread.parentId) return; // Ne rien faire pour le thread principal
    
    // Obtenir le message parent
    const currentConversation = getCurrentConversation();
    const parentThread = currentConversation.threads[currentThread.parentId];
    const parentMessage = parentThread.messages.find(msg => msg.id === currentThread.parentMessageId);
    
    if (parentMessage) {
        // Ajouter la référence
        addThreadReferenceToUI(parentMessage, currentThread.parentId);
    }
    
    // Mettre à jour les tags de thread pour indiquer lequel est actif
    document.querySelectorAll('.thread-tag').forEach(tag => {
        if (tag.dataset.threadId === currentThread.id) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
}

// Fonction utilitaire pour tronquer du texte
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}



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