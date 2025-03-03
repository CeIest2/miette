/**
 * ui.js - Manipulation de l'interface utilisateur
 * Contient des fonctions utilitaires pour gérer l'interface
 */

// Créer un élément HTML avec des classes et des attributs
function createElement(tag, classes = [], attributes = {}) {
    const element = document.createElement(tag);
    
    // Ajouter les classes
    if (Array.isArray(classes)) {
        classes.forEach(className => element.classList.add(className));
    } else if (typeof classes === 'string') {
        element.className = classes;
    }
    
    // Ajouter les attributs
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    
    return element;
}

// Montrer ou cacher un élément
function toggleElementVisibility(selector, show) {
    const element = document.querySelector(selector);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

// Ajouter une notification temporaire
function showNotification(message, type = 'info', duration = 3000) {
    // Vérifier si le conteneur de notification existe déjà
    let notificationContainer = document.querySelector('.notification-container');
    
    // Créer le conteneur s'il n'existe pas
    if (!notificationContainer) {
        notificationContainer = createElement('div', 'notification-container');
        document.body.appendChild(notificationContainer);
        
        // Styles du conteneur
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
    }
    
    // Créer la notification
    const notification = createElement('div', ['notification', `notification-${type}`]);
    notification.textContent = message;
    
    // Styles de la notification
    notification.style.backgroundColor = type === 'info' ? '#10a37f' : 
                                         type === 'error' ? '#e53e3e' : 
                                         type === 'warning' ? '#dd6b20' : '#10a37f';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '6px';
    notification.style.marginBottom = '10px';
    notification.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Ajouter la notification au conteneur
    notificationContainer.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Supprimer la notification après la durée spécifiée
    setTimeout(() => {
        // Animation de sortie
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        // Supprimer l'élément après l'animation
        setTimeout(() => {
            notification.remove();
            
            // Supprimer le conteneur s'il est vide
            if (notificationContainer.children.length === 0) {
                notificationContainer.remove();
            }
        }, 300);
    }, duration);
    
    return notification;
}

// Créer un bouton d'action contextuelle pour un message
function createMessageActionButton(icon, tooltip, onClick) {
    const button = createElement('button', 'message-action-btn', {
        'title': tooltip,
        'aria-label': tooltip
    });
    
    button.innerHTML = `<i class="fas fa-${icon}"></i>`;
    
    // Styles du bouton
    button.style.backgroundColor = 'transparent';
    button.style.border = 'none';
    button.style.color = 'var(--text-light)';
    button.style.cursor = 'pointer';
    button.style.padding = '4px 8px';
    button.style.transition = 'color 0.2s';
    
    // Événements
    button.addEventListener('click', onClick);
    button.addEventListener('mouseover', () => {
        button.style.color = 'var(--text-color)';
    });
    button.addEventListener('mouseout', () => {
        button.style.color = 'var(--text-light)';
    });
    
    return button;
}

// Ajouter des boutons d'action aux messages
function addMessageActions() {
    const messages = document.querySelectorAll('.message');
    
    messages.forEach((message) => {
        // Vérifier si les actions sont déjà ajoutées
        if (message.querySelector('.message-actions')) return;
        
        // Créer le conteneur d'actions
        const actionsContainer = createElement('div', 'message-actions');
        
        // Styles du conteneur
        actionsContainer.style.display = 'none';
        actionsContainer.style.marginTop = '10px';
        actionsContainer.style.textAlign = 'right';
        
        // Bouton de copie
        const copyButton = createMessageActionButton('copy', 'Copier', () => {
            const content = message.querySelector('.message-content').textContent;
            navigator.clipboard.writeText(content)
                .then(() => showNotification('Texte copié !', 'info'))
                .catch(err => showNotification('Échec de la copie', 'error'));
        });
        
        // Ajouter les boutons au conteneur
        actionsContainer.appendChild(copyButton);
        
        // Ajouter le conteneur au message
        message.querySelector('.message-content').appendChild(actionsContainer);
        
        // Afficher les actions au survol
        message.addEventListener('mouseover', () => {
            actionsContainer.style.display = 'block';
        });
        
        // Cacher les actions quand la souris quitte le message
        message.addEventListener('mouseout', () => {
            actionsContainer.style.display = 'none';
        });
    });
}

// Observer les nouveaux messages et leur ajouter des actions
function observeNewMessages() {
    const messagesContainer = document.querySelector('.messages-list');
    
    // Configuration de l'observateur
    const config = { childList: true };
    
    // Fonction appelée à chaque mutation
    const callback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Si de nouveaux nœuds ont été ajoutés
                if (mutation.addedNodes.length) {
                    addMessageActions();
                }
            }
        }
    };
    
    // Créer et lancer l'observateur
    const observer = new MutationObserver(callback);
    observer.observe(messagesContainer, config);
}

// Initialiser les fonctionnalités d'interface au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Observer les nouveaux messages
    observeNewMessages();
    
    // Autres initialisations d'interface...
});



function createThreadVisualizer() {
    // Vérifier si le visualiseur existe déjà
    let visualizer = document.querySelector('.thread-visualizer');
    
    if (!visualizer) {
        visualizer = createElement('div', 'thread-visualizer');
        
        // Styles pour le visualiseur
        visualizer.style.position = 'fixed';
        visualizer.style.bottom = '20px';
        visualizer.style.right = '20px';
        visualizer.style.backgroundColor = 'var(--chat-bg)';
        visualizer.style.borderRadius = '6px';
        visualizer.style.boxShadow = '0 2px 10px var(--shadow-color)';
        visualizer.style.padding = '10px';
        visualizer.style.zIndex = '100';
        visualizer.style.maxWidth = '300px';
        visualizer.style.display = 'none'; // Caché par défaut
        
        // Bouton pour ouvrir/fermer
        const toggleButton = createElement('button', 'toggle-visualizer-btn');
        toggleButton.innerHTML = '<i class="fas fa-sitemap"></i>';
        toggleButton.style.position = 'fixed';
        toggleButton.style.bottom = '20px';
        toggleButton.style.right = '20px';
        toggleButton.style.width = '40px';
        toggleButton.style.height = '40px';
        toggleButton.style.borderRadius = '50%';
        toggleButton.style.backgroundColor = 'var(--primary-color)';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        toggleButton.style.zIndex = '101';
        toggleButton.style.display = 'flex';
        toggleButton.style.justifyContent = 'center';
        toggleButton.style.alignItems = 'center';
        
        // Ajouter l'événement pour ouvrir/fermer
        toggleButton.addEventListener('click', () => {
            if (visualizer.style.display === 'none') {
                visualizer.style.display = 'block';
                updateThreadVisualizer();
            } else {
                visualizer.style.display = 'none';
            }
        });
        
        document.body.appendChild(toggleButton);
        document.body.appendChild(visualizer);
    }
    
    return visualizer;
}

// Mettre à jour le visualiseur avec l'arborescence actuelle
function updateThreadVisualizer() {
    const visualizer = document.querySelector('.thread-visualizer');
    if (!visualizer) return;
    
    // Vider le visualiseur
    visualizer.innerHTML = '';
    
    // Ajouter le titre
    const title = createElement('h3', 'visualizer-title');
    title.textContent = 'Structure des fils de discussion';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '14px';
    visualizer.appendChild(title);
    
    // Obtenir la conversation courante
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return;
    
    // Créer l'arborescence
    const treeContainer = createElement('div', 'thread-tree');
    
    // Commencer par le thread principal
    const mainThreadId = currentConversation.mainThreadId;
    const threadNode = createThreadNode(mainThreadId, 0);
    treeContainer.appendChild(threadNode);
    
    visualizer.appendChild(treeContainer);
}

// Créer un nœud pour représenter un thread dans l'arborescence
function createThreadNode(threadId, level) {
    const currentConversation = getCurrentConversation();
    if (!currentConversation) return null;
    
    const thread = currentConversation.threads[threadId];
    if (!thread) return null;
    
    // Créer le conteneur pour ce nœud
    const nodeContainer = createElement('div', 'thread-node-container');
    nodeContainer.style.paddingLeft = `${level * 20}px`;
    nodeContainer.style.marginBottom = '5px';
    
    // Créer le nœud
    const node = createElement('div', 'thread-node');
    node.style.display = 'flex';
    node.style.alignItems = 'center';
    node.style.padding = '5px';
    node.style.borderRadius = '4px';
    node.style.cursor = 'pointer';
    node.style.backgroundColor = threadId === appState.currentThreadId ? 
                              'rgba(16, 163, 127, 0.2)' : 'transparent';
    
    // Label du thread
    const label = createElement('span', 'thread-label');
    label.textContent = thread.title || `Thread ${thread.id.slice(0, 4)}`;
    label.style.fontSize = '13px';
    
    // Ajouter l'événement pour basculer vers ce thread
    node.addEventListener('click', () => {
        switchToThread(threadId);
        updateThreadVisualizer();
    });
    
    node.appendChild(label);
    nodeContainer.appendChild(node);
    
    // Ajouter les threads enfants de manière récursive
    if (thread.childThreads && thread.childThreads.length > 0) {
        const childrenContainer = createElement('div', 'thread-children');
        
        thread.childThreads.forEach(childId => {
            const childNode = createThreadNode(childId, level + 1);
            if (childNode) {
                childrenContainer.appendChild(childNode);
            }
        });
        
        nodeContainer.appendChild(childrenContainer);
    }
    
    return nodeContainer;
}

// Observer les changements de threads et mettre à jour le visualiseur
function setupThreadObserver() {
    // Créer le visualiseur s'il n'existe pas
    createThreadVisualizer();
    
    // Configuration de l'observateur - surveiller les changements dans les messages
    const messagesContainer = document.querySelector('.messages-list');
    const config = { childList: true, subtree: true };
    
    // Fonction appelée à chaque mutation
    const callback = function(mutationsList, observer) {
        // Si le visualiseur est visible, le mettre à jour
        const visualizer = document.querySelector('.thread-visualizer');
        if (visualizer && visualizer.style.display !== 'none') {
            updateThreadVisualizer();
        }
    };
    
    // Créer et lancer l'observateur
    const observer = new MutationObserver(callback);
    observer.observe(messagesContainer, config);
}

// Initialiser les fonctionnalités d'interface pour les threads au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser le visualiseur de threads
    setupThreadObserver();
});