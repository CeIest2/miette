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
    // Convertir le message en minuscules pour faciliter la comparaison
    const message = userMessage.toLowerCase();
    
    // Réponses pour différents types de questions
    if (message.includes('bonjour') || message.includes('salut') || message.includes('hello')) {
        return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
    }
    
    if (message.includes('merci')) {
        return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.";
    }
    
    if (message.includes('au revoir') || message.includes('bye')) {
        return "Au revoir ! Passez une excellente journée.";
    }
    
    if (message.includes('ton nom') || message.includes('qui es-tu') || message.includes('qui êtes-vous')) {
        return "Je suis un assistant IA conçu pour vous aider à répondre à vos questions et à discuter avec vous.";
    }
    
    if (message.includes('comment') && (message.includes('ça va') || message.includes('tu vas') || message.includes('allez'))) {
        return "Je n'ai pas de sentiments, mais je suis prêt à vous aider ! Comment puis-je vous être utile aujourd'hui ?";
    }
    
    if (message.includes('date') || message.includes('heure') || message.includes('jour')) {
        const now = new Date();
        return `Nous sommes le ${now.toLocaleDateString('fr-FR')} et il est ${now.toLocaleTimeString('fr-FR')}.`;
    }
    
    // Météo
    if (message.includes('météo') || message.includes('temps') && message.includes('fait')) {
        return "Je ne peux pas accéder aux données météorologiques en temps réel. Je vous suggère de consulter un service météo comme Météo-France ou une application météo.";
    }
    
    // Actualités
    if (message.includes('actualité') || message.includes('nouvelle') || message.includes('info')) {
        return "Je n'ai pas accès aux actualités en temps réel. Pour obtenir les dernières nouvelles, je vous recommande de consulter un site d'information fiable.";
    }
    
    // Blague
    if (message.includes('blague') || message.includes('histoire drôle')) {
        const blagues = [
            "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau !",
            "Qu'est-ce qui est jaune et qui attend ? Jonathan.",
            "Un homme entre dans un café. Plouf !",
            "Que dit un escargot qui rencontre une limace ? 'Tiens, tu as oublié ta carapace !'",
            "Pourquoi les informaticiens confondent-ils Halloween et Noël ? Parce qu'Oct 31 = Dec 25 (blague de programmation)."
        ];
        return "Voici une blague : " + blagues[Math.floor(Math.random() * blagues.length)];
    }
    
    // Recette
    if (message.includes('recette') || message.includes('cuisine') || message.includes('comment faire')) {
        return "Pour obtenir des recettes détaillées, je vous recommande de consulter des sites spécialisés en cuisine. Vous pouvez préciser quel type de plat vous souhaitez préparer, et je pourrai vous donner quelques conseils généraux.";
    }
    
    // Comment fonctionne l'IA
    if ((message.includes('comment') && message.includes('fonctionne')) && (message.includes('ia') || message.includes('intelligence artificielle'))) {
        return "Les assistants IA comme moi fonctionnent grâce à des modèles de langage entraînés sur de grandes quantités de textes. Nous analysons les patterns dans le langage pour générer des réponses cohérentes. Pour plus de détails techniques, je vous recommande de consulter des ressources dédiées à l'apprentissage automatique et au traitement du langage naturel.";
    }
    
    // Réponse pour les questions mathématiques simples
    if (message.includes('+') || message.includes('-') || message.includes('*') || message.includes('/')) {
        try {
            // Extraire l'expression mathématique et la calculer
            // AVERTISSEMENT : eval() est utilisé ici pour simplifier, mais n'est généralement pas recommandé
            // pour des raisons de sécurité. Dans un environnement de production, utilisez une bibliothèque
            // de calcul mathématique sécurisée ou une méthode plus sûre.
            const regex = /(\d+[\+\-\*\/]\d+)/g;
            const matches = message.match(regex);
            
            if (matches && matches.length > 0) {
                const expression = matches[0];
                // eslint-disable-next-line no-eval
                const result = eval(expression);
                return `Le résultat de ${expression} est ${result}.`;
            }
        } catch (error) {
            console.error("Erreur lors du calcul:", error);
        }
    }
    
    // Réponses génériques pour les questions diverses
    const genericResponses = [
        "Je comprends votre question. Pourriez-vous me donner plus de détails pour que je puisse vous fournir une réponse plus précise ?",
        "C'est une question intéressante. Dans un système réel, je pourrais vous donner une réponse plus détaillée.",
        "Je suis désolé, je ne peux pas répondre à cette question avec précision dans cette version de démonstration. Dans un environnement réel, je serais connecté à une base de connaissances plus étendue.",
        "Votre question est pertinente. Si j'étais connecté à un modèle de langage complet, je pourrais vous fournir une réponse détaillée.",
        "Je note votre intérêt pour ce sujet. Dans une version complète, je pourrais analyser cette question en profondeur et vous donner une réponse plus élaborée.",
        "Je vous remercie pour votre question. Cette démo simule un assistant IA, mais n'est pas connectée à un véritable modèle de langage capable de générer des réponses détaillées sur ce sujet spécifique."
    ];
    
    // Choisir une réponse générique aléatoire
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
}

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