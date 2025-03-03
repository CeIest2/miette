/**
 * mock-backend.js - Simulation d'un backend pour les réponses de l'IA
 * Dans un vrai projet, ce fichier serait remplacé par des appels API vers un backend réel
 */

// Fonction pour obtenir une réponse du "backend"
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
        console.error("Erreur lors de la communication avec le serveur:", error);
        return "Désolé, une erreur est survenue lors du traitement de votre message.";
    }
}

// Générer une réponse simulée
function generateMockResponse(userMessage) {
    return new Promise((resolve) => {
        
            // Votre logique de mock existante
            const message = userMessage.toLowerCase();
            
            // Réponses pour différents types de questions
            if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
                resolve("Bonjour ! Comment puis-je vous aider aujourd'hui ?");
                return;
            }
            
            // Autres conditions...
            
            // Réponses génériques par défaut
            const genericResponses = [
                "Je comprends votre question. Pourriez-vous me donner plus de détails pour que je puisse vous fournir une réponse plus précise ?",
                "C'est une question intéressante. Dans un système réel, je pourrais vous donner une réponse plus détaillée.",
                "Je suis désolé, je ne peux pas répondre à cette question avec précision dans cette version de démonstration.",
                "Votre question est pertinente. Si j'étais connecté à un modèle de langage complet, je pourrais vous fournir une réponse détaillée.",
                "Je note votre intérêt pour ce sujet. Dans une version complète, je pourrais analyser cette question en profondeur."
            ];
            
            // Choisir une réponse générique aléatoire
            resolve(genericResponses[Math.floor(Math.random() * genericResponses.length)]);
        } // Délai simulé de 1 seconde
    )}


// Fonction pour générer une réponse dynamique basée sur le modèle sélectionné
function getModelSpecificResponse(userMessage) {
    // Dans une application réelle, différents modèles auraient différentes capacités
    // Cette fonction simule ces différences
    
    const model = appState.currentModel;
    
    if (model === 'Assistant Pro') {
        // Le modèle Pro est supposé être plus technique et détaillé
        return getAdvancedResponse(userMessage);
    } else {
        // Le modèle Standard est plus simple et concis
        return getStandardResponse(userMessage);
    }
}

// Simuler une réponse du modèle standard
function getStandardResponse(userMessage) {
    // Générer une réponse simple
    return generateMockResponse(userMessage);
}

// Simuler une réponse du modèle avancé
function getAdvancedResponse(userMessage) {
    // Obtenir d'abord la réponse standard
    const standardResponse = generateMockResponse(userMessage);
    
    // Ajouter des détails supplémentaires pour simuler une réponse plus élaborée
    const additionalDetails = [
        "\n\nPour approfondir ce sujet, voici quelques points supplémentaires à considérer :",
        "\n\nSi vous souhaitez aller plus loin, voici quelques ressources qui pourraient vous intéresser :",
        "\n\nD'un point de vue technique, il est important de noter que :",
        "\n\nPour compléter cette information, il faut également tenir compte de :"
    ];
    
    // Sélectionner un détail aléatoire
    const detail = additionalDetails[Math.floor(Math.random() * additionalDetails.length)];
    
    // Ajouter quelques points factices
    const points = [
        "\n- Point 1 : Explication technique supplémentaire",
        "\n- Point 2 : Référence à des études ou des recherches dans ce domaine",
        "\n- Point 3 : Considérations pratiques ou cas d'utilisation",
    ];
    
    // Assembler la réponse complète
    return standardResponse + detail + points.join('');
}