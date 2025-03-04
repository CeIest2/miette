// API de threads
const ThreadAPI = {
    // Créer un nouveau thread
    create: function(parentThreadId, parentMessageId, title = null) {
        const currentConversation = getCurrentConversation();
        if (!currentConversation) return null;
        
        const parentThread = currentConversation.threads[parentThreadId];
        if (!parentThread) return null;
        
        // Générer un ID pour le nouveau thread
        const newThreadId = generateUniqueId();
        
        // Créer le thread
        currentConversation.threads[newThreadId] = {
            id: newThreadId,
            parentId: parentThreadId,
            parentMessageId: parentMessageId,
            messages: [],
            childThreads: [],
            title: title || `Thread ${newThreadId.slice(0, 4)}`
        };
        
        // Ajouter à la liste des threads enfants du parent
        parentThread.childThreads.push(newThreadId);
        
        // Masquer les messages non pertinents pour ce nouveau thread
        if (typeof hideAllMessagesExcept === 'function') {
            hideAllMessagesExcept(newThreadId);
        }
        
        // Sauvegarder
        saveToLocalStorage();
        
        return newThreadId;
    },
    
    // Obtenir un thread par ID
    get: function(threadId) {
        const currentConversation = getCurrentConversation();
        if (!currentConversation) return null;
        
        return currentConversation.threads[threadId] || null;
    },
    
    // Obtenir tous les threads d'une conversation
    getAll: function() {
        const currentConversation = getCurrentConversation();
        if (!currentConversation) return [];
        
        return Object.values(currentConversation.threads);
    },
    
    // Obtenir les threads enfants d'un thread
    getChildren: function(threadId) {
        const thread = this.get(threadId);
        if (!thread) return [];
        
        const currentConversation = getCurrentConversation();
        return thread.childThreads.map(id => currentConversation.threads[id]);
    },
    
    // Obtenir le chemin du thread principal jusqu'au thread spécifié
    getPath: function(threadId) {
        const path = [];
        let currentId = threadId;
        const currentConversation = getCurrentConversation();
        
        while (currentId) {
            const thread = currentConversation.threads[currentId];
            if (!thread) break;
            
            path.unshift(thread);
            currentId = thread.parentId;
        }
        
        return path;
    },
    
    // Obtenir le chemin complet d'un thread avec tous les IDs de messages pertinents
    getFullPath: function(threadId) {
        const path = this.getPath(threadId);
        
        // Récupérer tous les IDs de messages pertinents dans ce chemin
        const relevantMessageIds = new Set();
        
        path.forEach(thread => {
            if (thread.parentMessageId) {
                relevantMessageIds.add(thread.parentMessageId);
            }
            
            // Ajouter les IDs de tous les messages du thread
            thread.messages.forEach(msg => {
                relevantMessageIds.add(msg.id);
            });
        });
        
        return Array.from(relevantMessageIds);
    },
    
    // Activer un thread (le rendre courant)
    activate: function(threadId) {
        const thread = this.get(threadId);
        if (!thread) return false;
        
        // Définir le thread actuel
        appState.currentThreadId = threadId;
        
        // Masquer tous les messages non pertinents
        if (typeof hideAllMessagesExcept === 'function') {
            hideAllMessagesExcept(threadId);
        } else {
            // Implémentation de secours si la fonction n'est pas disponible
            console.warn("Fonction hideAllMessagesExcept non disponible");
            
            // Logique de base pour le thread principal
            const currentConversation = getCurrentConversation();
            if (threadId === currentConversation.mainThreadId) {
                // Afficher tous les messages du thread principal
                document.querySelectorAll('.messages-list > .message').forEach(msg => {
                    msg.classList.remove('hidden');
                    msg.style.display = 'flex';
                });
                
                // Masquer les threads appendés
                document.querySelectorAll('.appended-thread').forEach(thread => {
                    thread.remove();
                });
            }
        }
        
        // Afficher les messages du thread
        if (typeof appendThreadMessages === 'function') {
            appendThreadMessages(threadId);
        } else {
            // Si la fonction n'est pas disponible, utiliser displayThreadMessages
            displayThreadMessages(threadId);
        }
        
        // Mettre à jour l'indication visuelle du thread actif
        if (typeof updateActiveThreadTags === 'function') {
            updateActiveThreadTags(threadId);
        }
        
        // Mettre à jour le visualiseur
        if (typeof updateThreadVisualizer === 'function') {
            updateThreadVisualizer();
        }
        
        // Sauvegarder l'état
        saveToLocalStorage();
        
        return true;
    },
    
    // Renommer un thread
    rename: function(threadId, newTitle) {
        const thread = this.get(threadId);
        if (!thread) return false;
        
        thread.title = newTitle;
        saveToLocalStorage();
        
        // Mettre à jour l'interface si nécessaire
        const threadTags = document.querySelectorAll(`.thread-tag[data-thread-id="${threadId}"]`);
        threadTags.forEach(tag => {
            tag.textContent = newTitle;
        });
        
        return true;
    },
    
    // Supprimer un thread et tous ses enfants
    delete: function(threadId) {
        const currentConversation = getCurrentConversation();
        if (!currentConversation) return false;
        
        // Ne pas supprimer le thread principal
        if (threadId === currentConversation.mainThreadId) return false;
        
        const thread = currentConversation.threads[threadId];
        if (!thread) return false;
        
        // Supprimer récursivement tous les threads enfants
        this._deleteChildrenRecursive(threadId);
        
        // Retirer des threads enfants du parent
        if (thread.parentId) {
            const parentThread = currentConversation.threads[thread.parentId];
            if (parentThread) {
                const index = parentThread.childThreads.indexOf(threadId);
                if (index !== -1) {
                    parentThread.childThreads.splice(index, 1);
                }
            }
        }
        
        // Supprimer le thread
        delete currentConversation.threads[threadId];
        
        // Si c'était le thread actif, revenir au parent ou au thread principal
        if (appState.currentThreadId === threadId) {
            if (thread.parentId) {
                this.activate(thread.parentId);
            } else {
                this.activate(currentConversation.mainThreadId);
            }
        }
        
        // Nettoyer l'interface utilisateur
        if (typeof clearAppendedThreads === 'function') {
            clearAppendedThreads();
        }
        document.querySelectorAll(`.thread-tag[data-thread-id="${threadId}"]`).forEach(tag => {
            tag.remove();
        });
        
        saveToLocalStorage();
        return true;
    },
    
    // Méthode récursive privée pour supprimer les enfants
    _deleteChildrenRecursive: function(threadId) {
        const thread = this.get(threadId);
        if (!thread) return;
        
        const currentConversation = getCurrentConversation();
        
        // Pour chaque thread enfant, supprimer récursivement
        const childrenIds = [...thread.childThreads]; // Copier le tableau pour éviter les problèmes lors de la suppression
        childrenIds.forEach(childId => {
            this._deleteChildrenRecursive(childId);
            delete currentConversation.threads[childId];
        });
        
        // Vider la liste des enfants
        thread.childThreads = [];
    },
    
    // Ajouter un message à un thread
    addMessage: function(threadId, role, content) {
        const thread = this.get(threadId);
        if (!thread) return null;
        
        const messageId = generateUniqueId();
        
        thread.messages.push({
            id: messageId,
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        saveToLocalStorage();
        return messageId;
    }
};

// Exposer l'API pour qu'elle soit accessible globalement
window.ThreadAPI = ThreadAPI;