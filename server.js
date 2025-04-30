const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Connexion à la base de données SQLite
const db = new sqlite3.Database('./database.sqlite');

// Création des tables si elles n'existent pas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    board TEXT,
    turn TEXT,
    winner TEXT,
    status TEXT
  )`);
});

// Créer une partie
app.post('/api/game', (req, res) => {
  const gameId = uuidv4();
  const initialBoard = JSON.stringify(Array(15).fill().map(() => Array(15).fill(null)));
  db.run(`INSERT INTO games (id, board, turn, winner, status) VALUES (?, ?, ?, ?, ?)`,
    [gameId, initialBoard, 'X', null, 'ongoing'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ gameId });
    }
  );
});

// Récupérer l'état de la partie
app.get('/api/state/:id', (req, res) => {
  db.get(`SELECT * FROM games WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Game not found' });
    res.json(row);
  });
});

// Route pour visualiser les parties enregistrées
app.get('/api/games', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM games ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération des parties :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
