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

function opponentCanWinNext(board, playerSymbol) {
  const validColumns = getValidColumns(board);

  for (const col of validColumns) {
    const copy = cloneBoard(board);
    const move = dropDisc(copy, col, playerSymbol);
    if (move && checkWin(copy, move.row, move.col, playerSymbol)) {
      return true;
    }
  }
  return false;
}

function getBotMove(board, botSymbol, playerSymbol) {
  const validColumns = getValidColumns(board);

  // 1. Win immediately if possible
  for (const col of validColumns) {
    const copy = cloneBoard(board);
    const move = dropDisc(copy, col, botSymbol);
    if (move && checkWin(copy, move.row, move.col, botSymbol)) {
      return col;
    }
  }

  // 2. Block player's immediate win
  for (const col of validColumns) {
    const copy = cloneBoard(board);
    const move = dropDisc(copy, col, playerSymbol);
    if (move && checkWin(copy, move.row, move.col, playerSymbol)) {
      return col;
    }
  }

  // 3. Avoid moves that allow opponent to win next turn
  for (const col of validColumns) {
    const copy = cloneBoard(board);
    dropDisc(copy, col, botSymbol);

    if (!opponentCanWinNext(copy, playerSymbol)) {
      return col;
    }
  }

  // 4. Prefer center if safe
  if (validColumns.includes(3)) {
    return 3;
  }

  // 5. Fallback
  return validColumns[0] ?? null;
}

module.exports = { getBotMove };