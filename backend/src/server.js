require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGIN =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    credentials: true,
  },
});

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use("/leaderboard", require("./routes/leaderboard"));


const Game = require("./game/Game");
const { saveFinishedGame } = require("./services/gameService");
const { initProducer } = require("./kafka/producer");
const analytics = require("./services/analyticsService");

// Kafka producer is initialized once at server startup
initProducer();

/**
 * MATCHMAKING STATE
 * waitingPlayer holds a single player waiting for PvP
 * waitingTimeout triggers bot fallback after 10s
 */
let waitingPlayer = null;
let waitingTimeout = null;

/**
 * IN-MEMORY AUTHORITATIVE STATE
 * These maps are the backbone of identity & reconnection
 */
const games = new Map();              // gameId -> Game instance
const socketToGame = new Map();       // socket.id -> gameId
const socketToUsername = new Map();   // socket.id -> username (display only)
const socketToPlayerId = new Map();   // socket.id -> playerId (identity)
const playerSymbols = new Map();      // socket.id -> "X" | "O"

/**
 * DISCONNECT GRACE TIMERS
 * key = `${gameId}:${playerId}`
 * Ensures per-player reconnect windows
 */
const disconnectTimers = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  /**
   * JOIN
   * Handles matchmaking for PvP or bot fallback
   */
  socket.on("join", ({ username, playerId }) => {
    // Bind ephemeral socket to stable identity
    socketToUsername.set(socket.id, username);
    socketToPlayerId.set(socket.id, playerId);

    // If no one is waiting, place player in lobby
    if (!waitingPlayer) {
      waitingPlayer = { socket, username, playerId };
      const waitingSocketId = socket.id;

      // Bot fallback after 10 seconds
      waitingTimeout = setTimeout(() => {
        // Guard against race conditions
        if (!waitingPlayer || waitingPlayer.socket.id !== waitingSocketId) {
          return;
        }

        const gameId = uuidv4();

        // Player vs Bot game
        const game = new Game(
          { username, playerId },
          { username: "BOT", playerId: "BOT" }
        );

        games.set(gameId, game);
        analytics.gameStarted(gameId, [game.players.X, game.players.O]);

        socketToGame.set(socket.id, gameId);
        playerSymbols.set(socket.id, "X");

        socket.join(gameId);
        socket.emit("gameStart", {
          symbol: "X",
          state: game.getState(),
          gameId,
        });

        waitingPlayer = null;
        waitingTimeout = null;
      }, 10000);

      return;
    }

    /**
     * PAIR WITH WAITING PLAYER (PvP)
     */
    clearTimeout(waitingTimeout);

    const p1 = waitingPlayer;
    const p2 = { socket, username, playerId };

    const gameId = uuidv4();
    const game = new Game(
      { username: p1.username, playerId: p1.playerId },
      { username: p2.username, playerId: p2.playerId }
    );

    games.set(gameId, game);
    analytics.gameStarted(gameId, [game.players.X, game.players.O]);

    socketToGame.set(p1.socket.id, gameId);
    socketToGame.set(p2.socket.id, gameId);

    playerSymbols.set(p1.socket.id, "X");
    playerSymbols.set(p2.socket.id, "O");

    p1.socket.join(gameId);
    p2.socket.join(gameId);

    p1.socket.emit("gameStart", {
      symbol: "X",
      state: game.getState(),
      gameId,
    });

    p2.socket.emit("gameStart", {
      symbol: "O",
      state: game.getState(),
      gameId,
    });

    waitingPlayer = null;
    waitingTimeout = null;
  });

  /**
   * GAMEPLAY
   * Validates moves, updates state, emits updates
   */
  socket.on("makeMove", async ({ column }) => {
    const gameId = socketToGame.get(socket.id);
    const symbol = playerSymbols.get(socket.id);
    const game = games.get(gameId);

    if (!game || !symbol) return;

    try {
      // Authoritative game mutation
      const state = game.makeMove(symbol, column);

      // Emit analytics AFTER successful mutation
      analytics.moveMade(gameId, symbol, column);

      // Persist and cleanup on game end
      if (state.status === "FINISHED") {
        if (!games.has(gameId)) return;

        analytics.gameFinished(gameId, state.winner, game.startedAt);
        
        try {
          await saveFinishedGame(gameId, game);
        } catch (err) {
          console.error("Failed to persist finished game:", err.message);
        }

        games.delete(gameId);

        waitingPlayer = null;
        if (waitingTimeout) {
          clearTimeout(waitingTimeout);
          waitingTimeout = null;
        }
      }

      // Broadcast updated state to both players
      io.to(gameId).emit("gameState", state);
      io.to(gameId).emit("gameOver", {
        winner: state.winner,
      });
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  /**
   * DISCONNECT
   * Starts a 30s grace period for reconnection
   */
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // If a waiting player disconnects, cancel lobby state
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
      waitingPlayer = null;

      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
        waitingTimeout = null;
      }

      console.log("Waiting player disconnected — lobby reset");
    }

    const gameId = socketToGame.get(socket.id);
    const username = socketToUsername.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);

    // Cleanup socket-scoped state
    socketToGame.delete(socket.id);
    socketToUsername.delete(socket.id);
    socketToPlayerId.delete(socket.id);
    playerSymbols.delete(socket.id);

    if (!gameId || !playerId) return;

    const game = games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;

    const key = `${gameId}:${playerId}`;

    // Forfeit if player fails to reconnect in 30s
    const timeout = setTimeout(async () => {
      if (!games.has(gameId)) return;

      game.status = "FINISHED";

      const winner =
        game.players.X.playerId === playerId
          ? game.players.O.username
          : game.players.X.username;

      game.winner = winner;
      
      io.to(gameId).emit("gameState", game.getState());
      if (!game.winner || !game.winner.displayName) {
        return;
      }
      await saveFinishedGame(gameId, game);
      games.delete(gameId);

      disconnectTimers.delete(key);
    }, 30000);

    disconnectTimers.set(key, timeout);
  });

  /**
   * REJOIN
   * Reattaches a socket to an ACTIVE game using (gameId + playerId)
   */
  socket.on("rejoin", ({ gameId, username, playerId }) => {
    const game = games.get(gameId);

    if (!game || game.status !== "ACTIVE") {
      socket.emit("rejoinFailed");
      return;
    }

    if (
      game.players.X.playerId !== playerId &&
      game.players.O.playerId !== playerId
    ) {
      socket.emit("rejoinFailed");
      return;
    }

    const key = `${gameId}:${playerId}`;
    const timer = disconnectTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(key);
    }

    socket.join(gameId);

    socketToGame.set(socket.id, gameId);
    socketToUsername.set(socket.id, username);
    socketToPlayerId.set(socket.id, playerId);

    const symbol =
      game.players.X.playerId === playerId ? "X" : "O";

    playerSymbols.set(socket.id, symbol);

    socket.emit("gameStart", {
      symbol,
      state: game.getState(),
      gameId,
    });
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});