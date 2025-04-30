require('dotenv').config();
const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const initSocket = require('./socket');

const app = express();
const server = http.createServer(app);

// Connexion PostgreSQL via .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // utile pour Railway
  }
});

// Middleware optionnel pour test HTTP
app.get('/', (req, res) => {
  res.send('Serveur en ligne 🚀');
});

// Initialiser le WebSocket
initSocket(server, pool);

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});
