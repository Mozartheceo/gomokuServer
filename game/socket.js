// socket.js - Gère les sockets pour Gomoku avec enregistrement dans PostgreSQL
const { Server } = require('socket.io');

function setupSocket(server, pool) {
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  const games = {}; // mémorise l'état des parties en mémoire

  io.on('connection', (socket) => {
    console.log(`✅ Nouveau client connecté : ${socket.id}`);

    socket.on('joinGame', ({ gameId, player }) => {
      socket.join(gameId);
      if (!games[gameId]) {
        games[gameId] = {
          moves: [],
          players: {},
          currentTurn: 'x',
        };
      }
      games[gameId].players[player] = socket.id;
      io.to(gameId).emit('gameUpdate', games[gameId]);
    });

    socket.on('playMove', ({ gameId, x, y, player }) => {
      const game = games[gameId];
      if (!game || game.currentTurn !== player) return;

      game.moves.push({ x, y, player });
      game.currentTurn = player === 'x' ? 'o' : 'x';
      io.to(gameId).emit('movePlayed', { x, y, player });
    });

    socket.on('endGame', async ({ gameId, winner }) => {
      const game = games[gameId];
      if (!game) return;

      const player_x = Object.keys(game.players)[0] || 'unknown';
      const player_o = Object.keys(game.players)[1] || 'unknown';
      const moves = game.moves;

      try {
        await pool.query(
          'INSERT INTO games (player_x, player_o, winner, moves) VALUES ($1, $2, $3, $4)',
          [player_x, player_o, winner, JSON.stringify(moves)]
        );
        console.log(`✅ Partie ${gameId} enregistrée en base de données.`);
      } catch (err) {
        console.error('❌ Erreur lors de l’enregistrement en base :', err);
      }

      delete games[gameId];
      io.to(gameId).emit('gameEnded', { winner });
    });
  });
}

module.exports = setupSocket;
