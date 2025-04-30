// engine.js – logique du jeu Gomoku

const BOARD_SIZE = 15;

class GomokuGame {
  constructor() {
    this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    this.currentPlayer = 'X'; // ou 'O'
    this.winner = null;
    this.moveCount = 0;
  }

  makeMove(row, col) {
    if (this.board[row][col] || this.winner) {
      return false;
    }

    this.board[row][col] = this.currentPlayer;
    this.moveCount++;

    if (this.checkWinner(row, col)) {
      this.winner = this.currentPlayer;
    } else if (this.moveCount === BOARD_SIZE * BOARD_SIZE) {
      this.winner = 'draw';
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return true;
  }

  checkWinner(row, col) {
    return (
      this.countConsecutive(row, col, 1, 0) + this.countConsecutive(row, col, -1, 0) > 4 ||
      this.countConsecutive(row, col, 0, 1) + this.countConsecutive(row, col, 0, -1) > 4 ||
      this.countConsecutive(row, col, 1, 1) + this.countConsecutive(row, col, -1, -1) > 4 ||
      this.countConsecutive(row, col, 1, -1) + this.countConsecutive(row, col, -1, 1) > 4
    );
  }

  countConsecutive(row, col, deltaRow, deltaCol) {
    const player = this.currentPlayer;
    let count = 0;
    let r = row + deltaRow;
    let c = col + deltaCol;

    while (
      r >= 0 &&
      r < BOARD_SIZE &&
      c >= 0 &&
      c < BOARD_SIZE &&
      this.board[r][c] === player
    ) {
      count++;
      r += deltaRow;
      c += deltaCol;
    }

    return count;
  }

  getBoard() {
    return this.board;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getWinner() {
    return this.winner;
  }
}

module.exports = GomokuGame;
