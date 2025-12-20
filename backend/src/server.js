const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const Game = require("./game/Game");
const { saveFinishedGame } = require("./services/gameService");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors({
  origin: "http://localhost:5173",
}));
app.use(express.json());
app.use("/leaderboard", require("./routes/leaderboard"));

const reconnectingSockets = new Set();
const reconnectTimers = new Map(); // gameId -> timeout

let waitingPlayer = null;
let waitingTimeout = null;

const games = new Map();          // gameId -> Game
const socketToGame = new Map();   // socket.id -> gameId
const playerSymbols = new Map();  // socket.id -> "X" | "O"

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join", ({ username }) => {
      if (reconnectingSockets.has(socket.id)) {
        return;  // BLOCK matchmaking if reconnect is in progress
    }

    console.log("User joined:", username);

    // WAITING
    if (!waitingPlayer) {
      waitingPlayer = { socket, username };
      const waitingSocketId = socket.id;

      waitingTimeout = setTimeout(() => {
        // race-condition guard
        if (
          !waitingPlayer ||
          waitingPlayer.socket.id !== waitingSocketId
        ) {
          return;
        }

        console.log("No opponent found. Starting BOT game.");

        const gameId = uuidv4();
        const game = new Game(username, "BOT");

        games.set(gameId, game);
        socketToGame.set(waitingSocketId, gameId);
        playerSymbols.set(waitingSocketId, "X");

        socket.join(gameId);

        socket.emit("gameStart", {
          symbol: "X",
          state: game.getState(),
        });

        waitingPlayer = null;
        waitingTimeout = null;
      }, 10000);

      return;
    }

    // PAIR WITH PLAYER
    clearTimeout(waitingTimeout);

    const p1 = waitingPlayer;
    const p2 = { socket, username };

    const gameId = uuidv4();
    const game = new Game(p1.username, p2.username);

    games.set(gameId, game);

    socketToGame.set(p1.socket.id, gameId);
    socketToGame.set(p2.socket.id, gameId);

    playerSymbols.set(p1.socket.id, "X");
    playerSymbols.set(p2.socket.id, "O");

    p1.socket.join(gameId);
    p2.socket.join(gameId);

    p1.socket.emit("gameStart", {
      symbol: "X",
      state: game.getState(),
    });

    p2.socket.emit("gameStart", {
      symbol: "O",
      state: game.getState(),
    });

    waitingPlayer = null;
    waitingTimeout = null;
  });

  // GAMEPLAY
  socket.on("makeMove", async ({ column }) => {
    const gameId = socketToGame.get(socket.id);
    const symbol = playerSymbols.get(socket.id);
    const game = games.get(gameId);

    if (!game || !symbol) return;

    try {
      const state = game.makeMove(symbol, column);

      // 1. Broadcast updated state to the room
      io.to(gameId).emit("gameState", state);

      // 2. Persist & cleanup if game finished
      if (state.status === "FINISHED") {
        await saveFinishedGame(gameId, game);
        games.delete(gameId);
      }

    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    const gameId = socketToGame.get(socket.id);
    const symbol = playerSymbols.get(socket.id);
    const game = games.get(gameId);

    socketToGame.delete(socket.id);
    playerSymbols.delete(socket.id);

    // If player was waiting in lobby
    if (waitingPlayer?.socket.id === socket.id) {
      clearTimeout(waitingTimeout);
      waitingPlayer = null;
      waitingTimeout = null;
      return;
    }

    if (!game || !symbol) return;

    // Mark player as disconnected
    game.disconnected[symbol] = true;

    // Start 30s reconnect timer
    const timeout = setTimeout(() => {
      console.log("Reconnect window expired");

      game.status = "FINISHED";
      const winnerSymbol = symbol === "X" ? "O" : "X";
      game.winner = game.players[winnerSymbol];

      io.to(gameId).emit("gameOver", {
        winner: game.winner,
        reason: "forfeit",
      });

      games.delete(gameId);
      reconnectTimers.delete(gameId);
    }, 30000);

    reconnectTimers.set(gameId, timeout);
  });

  // REJOIN
  socket.on("rejoin", ({ gameId, username }) => {
    reconnectingSockets.add(socket.id);

    const game = games.get(gameId);
    if (!game) {
      socket.emit("rejoinFailed");
      reconnectingSockets.delete(socket.id);
      return;
    }

    let symbol = null;
    if (game.players.X === username) symbol = "X";
    if (game.players.O === username) symbol = "O";
    if (!symbol) {
      socket.emit("rejoinFailed");
      reconnectingSockets.delete(socket.id);
      return;
    }

    // cancel forfeit timer
    const timer = reconnectTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      reconnectTimers.delete(gameId);
    }

    socketToGame.set(socket.id, gameId);
    playerSymbols.set(socket.id, symbol);
    game.disconnected[symbol] = false;

    socket.join(gameId);

    socket.emit("gameStart", {
      symbol,
      state: game.getState(),
      gameId,
    });

    reconnectingSockets.delete(socket.id);

    console.log("Player rejoined:", username);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
