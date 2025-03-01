/**
 * server.js - Serveur simplifié qui renvoie un nombre aléatoire
 */

// Imports des dépendances
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des middlewares
app.use(cors()); // Permet les requêtes cross-origin
app.use(bodyParser.json()); // Parse le corps des requêtes en JSON
app.use(express.static(path.join(__dirname, '../'))); // Sert les fichiers statiques du dossier parent

// Endpoint principal pour le chat - renvoie un nombre aléatoire entre 1 et 100
app.post('/api/chat', (req, res) => {
    // Générer un nombre aléatoire entre 1 et 100
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    
    // Renvoyer le nombre comme réponse
    res.json({ response: `${randomNumber}` });
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Le serveur renvoie un nombre aléatoire entre 1 et 100 pour chaque message.`);
});