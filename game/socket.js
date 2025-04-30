// socket.js
const { Server } = require('socket.io');
const GomokuGame = require('./engine'); // On importe la logique du jeu

const activeGames = new Map(); // { roomId: { game: GomokuGame, players: [socket1, socket2], lastMoveAt: Date } }

module.exports = function (server, pool) {
  const io = new Server(server, {
    cors: {
      origin: '*',
    }
  });

  io.on('connection', (socket) => {
    console.log(`Utilisateur connecté : ${socket.id}`);

    socket.on('joinGame', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} rejoint la salle ${roomId}`);

      if (!activeGames.has(roomId)) {
        activeGames.set(roomId, {
          game: new GomokuGame(),
          players: [],
          lastMoveAt: new Date()
        });
      }

      const gameData = activeGames.get(roomId);
      if (gameData.players.length < 2) {
        gameData.players.push(socket);
        socket.emit('playerSymbol', gameData.players.length === 1 ? 'X' : 'O');
      }

      io.to(roomId).emit('updateBoard', {
        board: gameData.game.getBoard(),
        currentPlayer: gameData.game.getCurrentPlayer(),
        winner: gameData.game.getWinner()
      });
    });

    socket.on('playMove', ({ roomId, row, col }) => {
      const gameData = activeGames.get(roomId);
      if (!gameData || gameData.game.getWinner()) return;

      const game = gameData.game;
      const moved = game.makeMove(row, col);
      gameData.lastMoveAt = new Date();

      if (moved) {
        const winner = game.getWinner();
        io.to(roomId).emit('updateBoard', {
          board: game.getBoard(),
          currentPlayer: game.getCurrentPlayer(),
          winner: winner
        });

        // Sauvegarde en DB si partie terminée
        if (winner) {
          pool.query(
            'INSERT INTO matches (room_id, winner, played_at) VALUES ($1, $2, NOW())',
            [roomId, winner === 'draw' ? null : winner],
            (err) => {
              if (err) console.error('Erreur DB:', err);
            }
          );
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté : ${socket.id}`);
      for (const [roomId, data] of activeGames.entries()) {
        data.players = data.players.filter(p => p.id !== socket.id);
        if (data.players.length === 0) {
          activeGames.delete(roomId); // on supprime la salle vide
        }
      }
    });
  });
};
