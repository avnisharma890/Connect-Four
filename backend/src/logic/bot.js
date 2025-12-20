const {
  cloneBoard,
  dropDisc,
  checkWin,
} = require("./board");

const COLS = 7;

function getValidColumns(board) {
  const valid = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) {
      valid.push(col);
    }
  }
  return valid;
}

function getBotMove(board, botSymbol, playerSymbol) {
  const validColumns = getValidColumns(board);

  // Try to win
  for (const col of validColumns) {
    const copy = cloneBoard(board);
    const move = dropDisc(copy, col, botSymbol);
    if (move && checkWin(copy, move.row, move.col, botSymbol)) {
      return col;
    }
  }

  // Block player win
  for (const col of validColumns) {
    const copy = cloneBoard(board);
    const move = dropDisc(copy, col, playerSymbol);
    if (move && checkWin(copy, move.row, move.col, playerSymbol)) {
      return col;
    }
  }

  // Prefer center
  if (validColumns.includes(3)) {
    return 3;
  }

  // Fallback: first valid column
  return validColumns[0] ?? null;
}

module.exports = { getBotMove };