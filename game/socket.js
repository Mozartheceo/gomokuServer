const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

module.exports = (server, pool) => {
  const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // autorise ton client local
    methods: ["GET", "POST"]
  }
});


  const games = new Map();

  io.on('connection', (socket) => {
    console.log(`Nouvelle connexion : ${socket.id}`);

    socket.on('createGame', ({ userId }) => {
      const gameId = uuidv4();
      games.set(gameId, {
        id: gameId,
        players: [userId],
        board: Array(15).fill(null).map(() => Array(15).fill(null)),
        turn: userId,
        moves: [],
        winner: null,
        abandoned: false
      });
      socket.join(gameId);
      socket.emit('gameCreated', { gameId });
    });

    socket.on('joinGame', ({ gameId, userId }) => {
      const game = games.get(gameId);
      if (game && game.players.length === 1) {
        game.players.push(userId);
        socket.join(gameId);
        io.to(gameId).emit('startGame', { gameId, players: game.players });
      } else {
        socket.emit('error', { message: 'Impossible de rejoindre cette partie.' });
      }
    });

    socket.on('playMove', ({ gameId, userId, x, y }) => {
      const game = games.get(gameId);
      if (!game || game.winner || game.board[x][y]) return;

      if (game.turn !== userId) return;

      game.board[x][y] = userId;
      game.moves.push({ x, y, userId });
      game.turn = game.players.find(p => p !== userId);

      io.to(gameId).emit('movePlayed', { x, y, userId });

      if (checkWinner(game.board, x, y, userId)) {
        game.winner = userId;
        saveResult(pool, game);
        io.to(gameId).emit('gameOver', { winner: userId });
      }
    });

    socket.on('abandon', ({ gameId, userId }) => {
      const game = games.get(gameId);
      if (game && !game.winner) {
        const winner = game.players.find(p => p !== userId);
        game.winner = winner;
        game.abandoned = true;
        saveResult(pool, game);
        io.to(gameId).emit('gameOver', { winner, forfeit: true });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Déconnexion : ${socket.id}`);
    });
  });

  const checkWinner = (board, x, y, playerId) => {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dx, dy] of directions) {
      let count = 1;
      for (let dir of [-1, 1]) {
        let nx = x, ny = y;
        while (true) {
          nx += dx * dir;
          ny += dy * dir;
          if (board[nx]?.[ny] === playerId) {
            count++;
          } else {
            break;
          }
        }
      }
      if (count >= 5) return true;
    }
    return false;
  };

  const saveResult = async (pool, game) => {
    try {
      await pool.query(
        `INSERT INTO games (id, player1, player2, winner, moves, abandoned, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          game.id,
          game.players[0] || null,
          game.players[1] || null,
          game.winner,
          JSON.stringify(game.moves),
          game.abandoned
        ]
      );
      console.log('✅ Résultat enregistré en base de données.');
    } catch (err) {
      console.error('❌ Erreur enregistrement en BDD :', err.message);
    }
  };
};
