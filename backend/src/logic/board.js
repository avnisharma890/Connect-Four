const ROWS = 6;
const COLS = 7;

// Directions to check for a win
// → ↓ ↘ ↗
const directions = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↗
];

function createBoard() {
  return Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null)
  );
}

function dropDisc(board, col, player) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      board[row][col] = player;
      return { row, col };
    }
  }
  return null;
}

function countDirection(board, row, col, dr, dc, player) {
  // count how many player disks are present consecutively in the same direction
  let count = 0;
  let r = row + dr;
  let c = col + dc;

  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }

  return count;
}

function checkWin(board, row, col, player) {
  for (const [dr, dc] of directions) {
    const total =
      1 +
      countDirection(board, row, col, dr, dc, player) +
      countDirection(board, row, col, -dr, -dc, player);

    if (total >= 4) return true;
  }
  return false;
}

function isDraw(board) {
  return board[0].every(cell => cell !== null);
}

function cloneBoard(board) {
  return board.map(row => [...row]);
}

module.exports = {
  createBoard,
  dropDisc,
  checkWin,
  isDraw,
  cloneBoard,
};
