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
    
    // Réponses génériques par défaut
    const genericResponses = [
        "Je comprends votre question. Pourriez-vous me donner plus de détails ?",
        "C'est une question intéressante. Dans un système réel, je pourrais vous donner une réponse plus détaillée.",
        "Votre question est pertinente. Je serai heureux de vous aider davantage si vous précisez votre demande."
    ];
    
    // Choisir une réponse générique aléatoire
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
}

/**
 * Fonction pour masquer tous les messages sauf ceux pertinents au thread actif
 * Version améliorée pour gérer correctement les branches de conversation
 */
function hideAllMessagesExcept(threadId) {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    const thread = currentConversation.threads[threadId];
    if (!thread) return;
    
    // ÉTAPE 1: Déterminer le chemin complet du thread
    const threadPath = ThreadAPI.getPath(threadId);
    const relevantThreadIds = threadPath.map(t => t.id);
    
    // Obtenir le point de branchement
    const branchingPointMessageId = thread.parentMessageId;
    const parentThreadId = thread.parentId;
    
    // ÉTAPE 2: Masquer tous les messages pour réinitialiser
    document.querySelectorAll('.messages-list > .message').forEach(msg => {
        msg.classList.add('hidden');
        msg.style.display = 'none';
    });
    
    // ÉTAPE 3: Masquer tous les threads appendés existants
    clearAppendedThreads();
    
    // ÉTAPE 4: Si c'est le thread principal, afficher tous ses messages
    if (threadId === currentConversation.mainThreadId) {
        const mainThreadMessages = currentConversation.threads[currentConversation.mainThreadId].messages;
        const mainThreadMessageIds = mainThreadMessages.map(msg => msg.id);
        
        document.querySelectorAll('.messages-list > .message').forEach(msg => {
            const messageId = msg.dataset.messageId;
            if (mainThreadMessageIds.includes(messageId)) {
                msg.classList.remove('hidden');
                msg.style.display = 'flex';
            }
        });
        
        return;
    }
    
    // ÉTAPE 5: Pour les threads non-principaux, nous affichons:
    // a. Tous les messages du thread parent jusqu'au point de branchement (inclus)
    // b. Tous les messages du thread actuel
    
    // Collecter tous les messages pertinents
    const relevantMessageIds = new Set();
    
    // Pour les messages du parent jusqu'au point de branchement
    if (parentThreadId) {
        const parentThread = currentConversation.threads[parentThreadId];
        if (parentThread) {
            let includeMessage = true;
            
            for (const msg of parentThread.messages) {
                relevantMessageIds.add(msg.id);
                
                // Si on atteint le point de branchement, on arrête après ce message
                if (msg.id === branchingPointMessageId) {
                    includeMessage = false;
                    break;
                }
            }
        }
    }
    
    // Ajouter tous les messages du thread actuel
    thread.messages.forEach(msg => {
        relevantMessageIds.add(msg.id);
    });
    
    // Afficher les messages pertinents
    document.querySelectorAll('.messages-list > .message').forEach(msg => {
        const messageId = msg.dataset.messageId;
        if (relevantMessageIds.has(messageId)) {
            msg.classList.remove('hidden');
            msg.style.display = 'flex';
            
            // Style pour les messages du thread actif
            if (threadId !== currentConversation.mainThreadId) {
                const parentThread = currentConversation.threads[parentThreadId];
                const isInParentThread = parentThread && parentThread.messages.some(m => m.id === messageId);
                
                if (!isInParentThread) {
                    msg.classList.add('active-thread-message');
                } else {
                    msg.classList.remove('active-thread-message');
                }
            }
        }
    });
    
    // Mettre à jour les indicateurs visuels
    updateThreadIndicators();
    
    // Ajouter une indication visuelle claire pour montrer où commence la nouvelle branche
    addBranchingSeparator(branchingPointMessageId);
}

function addBranchingSeparator(messageId) {
    // Trouver le message de branchement
    const branchingMessage = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!branchingMessage) return;
    
    // Vérifier si un séparateur existe déjà
    let separator = document.querySelector('.branch-separator');
    if (!separator) {
        separator = document.createElement('div');
        separator.className = 'branch-separator';
        separator.style.margin = '10px 0';
        separator.style.padding = '5px 10px';
        separator.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
        separator.style.borderLeft = '3px solid var(--primary-color)';
        separator.style.borderRadius = '0 4px 4px 0';
        separator.style.fontSize = '12px';
        separator.style.color = 'var(--text-light)';
        separator.innerHTML = '<i class="fas fa-code-branch"></i> Début de la branche alternative';
    }
    
    // Insérer le séparateur après le message de branchement
    branchingMessage.after(separator);
}

/**
 * Fonction pour mettre à jour les indicateurs de thread sur tous les messages
 * Cette fonction ajoute des indicateurs visuels pour montrer les branches disponibles
 */
function updateThreadIndicators() {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    // D'abord, supprimer tous les indicateurs existants
    document.querySelectorAll('.thread-indicator-list').forEach(el => el.remove());
    
    // Récupérer tous les messages de l'assistant
    document.querySelectorAll('.assistant-message').forEach(msgElement => {
        const messageId = msgElement.dataset.messageId;
        if (!messageId) return;
        
        // Trouver les threads qui ont ce message comme point de départ
        const relatedThreads = Object.values(currentConversation.threads).filter(
            thread => thread.parentMessageId === messageId
        );
        
        if (relatedThreads.length > 0) {
            // Créer le conteneur pour les indicateurs de thread
            const indicatorList = document.createElement('div');
            indicatorList.className = 'thread-indicator-list';
            indicatorList.style.display = 'flex';
            indicatorList.style.gap = '5px';
            indicatorList.style.marginTop = '8px';
            
            // Ajouter un indicateur pour chaque thread
            relatedThreads.forEach(thread => {
                const indicator = document.createElement('div');
                indicator.className = 'thread-indicator-item';
                indicator.style.position = 'relative';
                indicator.dataset.threadId = thread.id;
                
                // Styles de base pour l'indicateur
                indicator.style.width = '10px';
                indicator.style.height = '10px';
                indicator.style.borderRadius = '2px';
                indicator.style.backgroundColor = thread.id === appState.currentThreadId ? 
                    'var(--primary-color)' : 'var(--border-color)';
                indicator.style.cursor = 'pointer';
                indicator.style.transition = 'all 0.2s ease';
                
                // Ajouter un tooltip
                const threadPreview = thread.messages.length > 0 ? 
                    truncateText(thread.messages[0].content, 50) : 'Branche alternative';
                
                indicator.title = `Branche: ${threadPreview}`;
                
                // Ajouter l'événement pour basculer vers ce thread
                indicator.addEventListener('click', () => {
                    switchToThread(thread.id);
                });
                
                // Effet au survol
                indicator.addEventListener('mouseover', () => {
                    indicator.style.transform = 'scale(1.2)';
                    indicator.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
                });
                
                indicator.addEventListener('mouseout', () => {
                    indicator.style.transform = 'scale(1)';
                    indicator.style.boxShadow = 'none';
                });
                
                indicatorList.appendChild(indicator);
            });
            
            // Ajouter la liste d'indicateurs à la fin du message
            const messageContent = msgElement.querySelector('.message-content');
            if (messageContent) {
                messageContent.appendChild(indicatorList);
            }
        }
    });
}

// Mise à jour de la fonction pour supprimer les threads appendés
function clearAppendedThreads() {
    const appendedThreads = document.querySelectorAll('.appended-thread');
    
    // Si aucun thread n'est trouvé, sortir directement
    if (appendedThreads.length === 0) return;
    
    // Pour chaque thread trouvé
    appendedThreads.forEach(thread => {
        // Animation de sortie
        thread.classList.add('thread-fading-out');
        
        // Suppression après l'animation
        setTimeout(() => {
            thread.remove();
        }, 300);
    });
}

// Mise à jour de la fonction pour mettre à jour des tags de thread actifs
function updateActiveThreadTags(activeThreadId) {
    document.querySelectorAll('.thread-tag').forEach(tag => {
        if (tag.dataset.threadId === activeThreadId) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
    
    // Mettre également à jour les indicateurs visuels
    document.querySelectorAll('.thread-indicator-item').forEach(indicator => {
        if (indicator.dataset.threadId === activeThreadId) {
            indicator.style.backgroundColor = 'var(--primary-color)';
        } else {
            indicator.style.backgroundColor = 'var(--border-color)';
        }
    });
}

// Ajout des styles CSS pour les threads
function addThreadStyles() {
    // Vérifier si les styles existent déjà
    if (!document.getElementById('thread-append-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'thread-append-styles';
        styleElement.textContent = `
            .appended-thread {
                margin-top: 20px;
                border-left: 3px solid var(--primary-color);
                padding-left: 15px;
                position: relative;
                margin-bottom: 30px;
                background-color: rgba(16, 163, 127, 0.03);
                border-radius: 0 8px 8px 0;
                animation: thread-fade-in 0.3s forwards;
            }
            
            @keyframes thread-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes thread-fade-out {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }
            
            .thread-fading-out {
                animation: thread-fade-out 0.3s forwards;
            }
            
            .thread-header {
                margin-bottom: 15px;
            }
            
            .thread-indicator {
                background-color: rgba(16, 163, 127, 0.1);
                border-radius: 8px 8px 0 0;
                padding: 10px 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(16, 163, 127, 0.2);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .close-thread-btn {
                background-color: transparent;
                border: none;
                cursor: pointer;
                color: var(--text-light);
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .close-thread-btn:hover {
                background-color: rgba(0, 0, 0, 0.1);
                transform: scale(1.1);
            }
            
            .thread-message {
                opacity: 0.95;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            
            .active-thread-message {
                border-left: 3px solid var(--primary-color);
                padding-left: 10px;
                background-color: rgba(16, 163, 127, 0.05);
            }
            
            .thread-indicator-list {
                display: flex;
                gap: 5px;
                margin-top: 8px;
                padding: 3px 0;
            }
            
            .thread-indicator-item {
                width: 10px;
                height: 10px;
                border-radius: 2px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .thread-indicator-item:hover {
                transform: scale(1.2);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }
        `;
        document.head.appendChild(styleElement);
    }
}

/**
 * Fonction mise à jour pour basculer vers un thread
 * Cette fonction gère correctement l'affichage des messages lors du changement de thread
 */
function switchToThread(threadId) {
    const currentConversation = getCurrentConversation();
    if (!currentConversation || !currentConversation.threads[threadId]) return;
    
    // Définir le thread actuel
    appState.currentThreadId = threadId;
    
    // Masquer tous les messages non pertinents pour ce thread
    hideAllMessagesExcept(threadId);
    
    // Mettre à jour les tags de thread pour indiquer lequel est actif
    updateActiveThreadTags(threadId);
    
    // Sauvegarder l'état
    saveToLocalStorage();
    
    // Faire défiler jusqu'au dernier message visible
    scrollToLastVisibleMessage();
}

/**
 * Fonction pour faire défiler jusqu'au dernier message visible
 */
function scrollToLastVisibleMessage() {
    const visibleMessages = Array.from(document.querySelectorAll('.message:not(.hidden)'));
    if (visibleMessages.length > 0) {
        const lastMessage = visibleMessages[visibleMessages.length - 1];
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Fonction pour gérer la création d'un nouveau thread à partir d'un message assistant
function handleCreateThreadButtonClick(userMessageId, assistantMessageId) {
    // Vérifier si le message d'assistant existe
    if (!assistantMessageId) {
        console.warn("Pas de réponse de l'assistant pour créer un thread");
        if (typeof showNotification === 'function') {
            showNotification("Vous devez d'abord obtenir une réponse de l'assistant", "warning");
        }
        return;
    }
    
    // Créer un nouveau thread à partir du message de l'assistant
    const newThreadId = createNewThread(assistantMessageId);
    
    // Si la création a réussi
    if (newThreadId) {
        // Obtenir la conversation et le thread
        const currentConversation = getCurrentConversation();
        const newThread = currentConversation.threads[newThreadId];
        
        // Masquer les messages non pertinents
        hideAllMessagesExcept(newThreadId);
        
        // Mettre à jour l'interface
        updateActiveThreadTags(newThreadId);
        
        // Informer l'utilisateur
        if (typeof showNotification === 'function') {
            showNotification("Nouvelle branche de conversation créée", "info");
        }
    }
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
        // Basculer vers ce thread
        switchToThread(threadId);
    });
    
    // Ajouter à la liste
    threadList.appendChild(threadTag);
    
    // Mettre à jour les indicateurs de thread
    updateThreadIndicators();
}

// Variables pour suivre l'état du mode de création de thread
let threadCreationMode = false;
let selectedMessageId = null;
let threadParentContent = null;

// Fonction pour activer le mode de création de thread
function activateThreadCreationMode(messageId) {
    // Mémoriser le message sélectionné
    selectedMessageId = messageId;
    
    // Obtenir le contenu du message
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    const messageContent = messageElement.querySelector('.message-content');
    if (!messageContent) return;
    
    // Enregistrer le contenu pour la référence
    threadParentContent = messageContent.textContent.trim();
    
    // Masquer tous les messages existants
    document.querySelectorAll('.messages-list > .message').forEach(msg => {
        msg.classList.add('hidden');
        msg.style.display = 'none';
    });
    
    // Masquer les threads appendés
    clearAppendedThreads();
    
    // Masquer la liste des messages actuels
    const messagesList = document.querySelector('.messages-list');
    messagesList.classList.add('thread-fade-out');
    
    setTimeout(() => {
        // Cacher la liste des messages et l'écran de bienvenue
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        
        // Créer et afficher le conteneur de mode de création de thread
        createThreadCreationUI();
        
        // Mettre à jour l'état
        threadCreationMode = true;
    }, 300);
}

function createThreadCreationUI() {
    // Vérifier si le conteneur existe déjà
    let threadCreationContainer = document.querySelector('.thread-creation-mode');
    
    if (!threadCreationContainer) {
        // Créer le conteneur
        threadCreationContainer = document.createElement('div');
        threadCreationContainer.className = 'thread-creation-mode thread-fade-in';
        
        // Ajouter au conteneur principal
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.appendChild(threadCreationContainer);
    } else {
        // Réinitialiser et rendre visible
        threadCreationContainer.innerHTML = '';
        threadCreationContainer.style.display = 'block';
        threadCreationContainer.className = 'thread-creation-mode thread-fade-in';
    }
    
    // Créer la référence au message parent
    const threadReference = document.createElement('div');
    threadReference.className = 'thread-reference';
    threadReference.textContent = threadParentContent ? truncateText(threadParentContent, 60) : 'Message de référence';
    threadReference.title = 'Cliquer pour revenir à la conversation principale';
    threadReference.addEventListener('click', cancelThreadCreation);
    
    // Créer la zone de saisie du nouveau message
    const inputArea = document.createElement('div');
    inputArea.className = 'new-thread-input-area';
    inputArea.style.display = 'block';
    
    // Créer le formulaire pour la saisie
    const form = document.createElement('form');
    form.className = 'new-thread-form';
    form.addEventListener('submit', handleNewThreadSubmit);
    
    // Conteneur d'input
    const inputContainer = document.createElement('div');
    inputContainer.className = 'new-thread-input-container';
    
    // Textarea pour le message
    const textarea = document.createElement('textarea');
    textarea.className = 'new-thread-input';
    textarea.placeholder = 'Écrivez votre réponse alternative...';
    textarea.id = 'new-thread-input';
    textarea.addEventListener('input', autoResizeThreadTextarea);
    
    // Bouton d'envoi
    const sendButton = document.createElement('button');
    sendButton.className = 'new-thread-send-btn';
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    sendButton.type = 'submit';
    sendButton.disabled = true;

    // Bouton d'annulation
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-thread-btn';
    cancelButton.innerHTML = '<i class="fas fa-times"></i> Annuler';
    cancelButton.type = 'button';
    cancelButton.addEventListener('click', cancelThreadCreation);

    // Assembler les éléments
    inputContainer.appendChild(textarea);
    inputContainer.appendChild(sendButton);
    form.appendChild(inputContainer);
    form.appendChild(cancelButton);
    inputArea.appendChild(form);

    // Ajouter les éléments au conteneur
    threadCreationContainer.appendChild(threadReference);
    threadCreationContainer.appendChild(inputArea);

    // Focus sur le textarea
    setTimeout(() => {
        textarea.focus();
    }, 10);
}

function autoResizeThreadTextarea() {
    const textarea = document.getElementById('new-thread-input');
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // Activer ou désactiver le bouton d'envoi
    const sendButton = document.querySelector('.new-thread-send-btn');
    if (textarea.value.trim()) {
        sendButton.disabled = false;
    } else {
        sendButton.disabled = true;
    }
}

// Fonction pour quitter le mode de création de thread
function exitThreadCreationMode() {
    // Masquer le conteneur de création de thread
    const threadCreationContainer = document.querySelector('.thread-creation-mode');
    if (threadCreationContainer) {
        threadCreationContainer.classList.remove('thread-fade-in');
        threadCreationContainer.style.opacity = '0';
        threadCreationContainer.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            threadCreationContainer.style.display = 'none';
        }, 300);
    }

    // Afficher à nouveau les messages pertinents au thread actuel
    hideAllMessagesExcept(appState.currentThreadId);

    // Afficher à nouveau la liste des messages
    const messagesList = document.querySelector('.messages-list');
    messagesList.style.display = 'block';

    setTimeout(() => {
        messagesList.classList.remove('thread-fade-out');
    }, 10);

    // Réinitialiser les variables
    threadCreationMode = false;
    selectedMessageId = null;
    threadParentContent = null;
}

function cancelThreadCreation() {
    exitThreadCreationMode();
}

// Gérer la soumission du nouveau thread
function handleNewThreadSubmit(event) {
    event.preventDefault();

    const textarea = document.getElementById('new-thread-input');
    const userMessage = textarea.value.trim();

    if (!userMessage || !selectedMessageId) return;

    // Créer un nouveau thread à partir du message sélectionné
    const newThreadId = createNewThread(selectedMessageId);
    if (!newThreadId) {
        showNotification("Erreur lors de la création du fil de discussion", "error");
        return;
    }

    // Masquer les messages non pertinents
    hideAllMessagesExcept(newThreadId);

    // Passer à ce nouveau thread
    appState.currentThreadId = newThreadId;
    updateActiveThreadTags(newThreadId);

    // Envoyer le message utilisateur dans ce thread
    sendThreadMessage(userMessage, newThreadId);

    // Revenir à l'affichage normal
    exitThreadCreationMode();
}

// Fonction pour envoyer un message dans un thread spécifique
function sendThreadMessage(message, threadId) {
    // Obtenir le thread
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;

    const thread = currentConversation.threads[threadId];
    if (!thread) return;

    // Générer un ID pour le message
    const messageId = generateUniqueId();

    // Ajouter le message utilisateur
    thread.messages.push({
        id: messageId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });

    // Afficher les messages du thread
    hideAllMessagesExcept(threadId);

    // Faire défiler vers le bas
    scrollToBottom();

    // Simuler une réponse de l'assistant
    showLoadingIndicator();

    setTimeout(() => {
        hideLoadingIndicator();
        
        // Générer un ID pour la réponse
        const responseId = generateUniqueId();
        
        // Générer une réponse (utilisez votre fonction existante)
        const response = generateDirectResponse(message);
        
        // Ajouter la réponse au thread
        thread.messages.push({
            id: responseId,
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        // Mettre à jour l'affichage du thread
        hideAllMessagesExcept(threadId);
        
        // Sauvegarder dans le localStorage
        saveToLocalStorage();
        
        // Faire défiler vers le bas
        scrollToBottom();
        
        // Mettre à jour les indicateurs de thread
        updateThreadIndicators();
    }, 80);
}

// Ajouter un message à l'interface utilisateur
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

    // Définir l'icône de l'avatar en fonction du rôle
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

    // Ajouter le bouton de création de thread uniquement pour les messages utilisateur
    if (role === 'user') {
        const createThreadBtn = document.createElement('button');
        createThreadBtn.className = 'create-thread-btn';
        createThreadBtn.innerHTML = '<i class="fas fa-plus"></i>';
        createThreadBtn.title = "Créer un nouveau fil de discussion";
        
        // Attacher le gestionnaire d'événement avec notre nouvelle logique
        createThreadBtn.addEventListener('click', () => {
            // Pour chaque message utilisateur, on veut créer un thread à partir du message de l'assistant qui suit
            let nextAssistantMessage = messageElement.nextElementSibling;
            while (nextAssistantMessage && !nextAssistantMessage.classList.contains('assistant-message')) {
                nextAssistantMessage = nextAssistantMessage.nextElementSibling;
            }
            
            if (nextAssistantMessage) {
                const assistantMessageId = nextAssistantMessage.dataset.messageId;
                
                // Utiliser notre fonction mise à jour pour gérer la création du thread
                handleCreateThreadButtonClick(messageId, assistantMessageId);
            } else {
                // Si pas de message assistant suivant, afficher une notification
                if (typeof showNotification === 'function') {
                    showNotification("Vous devez d'abord obtenir une réponse de l'assistant", "warning");
                } else {
                    console.warn("Pas de réponse de l'assistant pour créer un thread");
                }
            }
        });
        
        messageElement.appendChild(createThreadBtn);
    }

    // Assembler le message
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);

    // Ajouter le message à la liste
    messagesContainer.appendChild(messageElement);

    // Mettre à jour les indicateurs de thread après l'ajout du message
    if (role === 'assistant') {
        // Attendre un peu que le DOM soit mis à jour
        setTimeout(() => {
            updateThreadIndicators();
        }, 50);
    }
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

// Mettre à jour le titre de la conversation en fonction du premier message
function updateConversationTitle(message) {
    const currentConversation = getCurrentConversation();

    // Ne mettre à jour que si c'est le premier message de la conversation
    if (currentConversation && currentConversation.threads) {
        const mainThread = currentConversation.threads[currentConversation.mainThreadId];
        if (mainThread && mainThread.messages.length === 2) {
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

// Fonction utilitaire pour tronquer du texte
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}