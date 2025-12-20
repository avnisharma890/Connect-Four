const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const Game = require("./game/Game");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let waitingPlayer = null;
let waitingTimeout = null;

const games = new Map();          // gameId -> Game
const socketToGame = new Map();   // socket.id -> gameId
const playerSymbols = new Map();  // socket.id -> "X" | "O"

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join", ({ username }) => {
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
  socket.on("makeMove", ({ column }) => {
    const gameId = socketToGame.get(socket.id);
    const symbol = playerSymbols.get(socket.id);
    const game = games.get(gameId);

    if (!game || !symbol) return;

    try {
      const state = game.makeMove(symbol, column);
      io.to(gameId).emit("gameState", state);
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    socketToGame.delete(socket.id);
    playerSymbols.delete(socket.id);

    if (waitingPlayer?.socket.id === socket.id) {
      clearTimeout(waitingTimeout);
      waitingPlayer = null;
      waitingTimeout = null;
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
