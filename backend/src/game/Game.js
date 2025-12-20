const { getBotMove } = require("../logic/bot");

const {
  createBoard,
  dropDisc,
  checkWin,
  isDraw,
} = require("../logic/board");

class Game {
  constructor(playerX, playerO) {
    this.startedAt = new Date();
    this.board = createBoard();
    this.players = {
      X: playerX,
      O: playerO,
    };
    this.currentTurn = "X";
    this.status = "ACTIVE";
    this.winner = null;
    this.disconnected = {
      X: false,
      O: false,
    };
  }

  makeMove(symbol, column) {
    if (this.status !== "ACTIVE") {
      throw new Error("Game is over");
    }

    if (symbol !== this.currentTurn) {
      throw new Error("Not your turn");
    }

    const move = dropDisc(this.board, column, symbol);
    if (!move) {
      throw new Error("Column full");
    }

    if (checkWin(this.board, move.row, move.col, symbol)) {
      this.status = "FINISHED";
      this.winner = this.players[symbol];
    } else if (isDraw(this.board)) {
      this.status = "FINISHED";
    } else {
      // TURN MUST CHANGE
      this.currentTurn = symbol === "X" ? "O" : "X";
    }

    // BOT auto-play AFTER turn switch
    if (
      this.status === "ACTIVE" &&
      this.players[this.currentTurn] === "BOT"
    ) {
      const botSymbol = this.currentTurn;
      const playerSymbol = botSymbol === "X" ? "O" : "X";

      const botCol = getBotMove(
        this.board,
        botSymbol,
        playerSymbol
      );

      if (botCol !== null) {
        return this.makeMove(botSymbol, botCol);
      }
    }

    return this.getState();
  }


  getState() {
    return {
      board: this.board,
      currentTurn: this.currentTurn,
      status: this.status,
      winner: this.winner,
    };
  }
}

module.exports = Game;