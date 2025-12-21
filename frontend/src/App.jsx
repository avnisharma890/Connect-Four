import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import Board from "./Board";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";

// Single persistent socket connection
const socket = io("http://localhost:3000");

export default function App() {
  /**
   * UI STATE
   */
  const [board, setBoard] = useState(
    Array.from({ length: 6 }, () => Array(7).fill(null))
  );
  const [status, setStatus] = useState("WAITING");
  const [currentTurn, setCurrentTurn] = useState(null);
  const [mySymbol, setMySymbol] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  /**
   * STABLE PLAYER ID
   * Generated once and reused across refreshes
   */
  const storedPlayerId = sessionStorage.getItem("playerId");
  const playerId = storedPlayerId ?? uuidv4();

  if (!storedPlayerId) {
    sessionStorage.setItem("playerId", playerId);
  }

  /**
   * HANDLE MOVE
   * Client never sends symbol, only intent
   */
  function handleColumnClick(col) {
    if (currentTurn !== mySymbol) return;
    socket.emit("makeMove", { column: col });
  }

  /**
   * SOCKET LIFECYCLE
   * Handles join, rejoin, gameplay updates
   */
  useEffect(() => {
    // Game created OR successfully rejoined
    socket.on("gameStart", ({ symbol, state, gameId }) => {
      setMySymbol(symbol);
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
      setGameId(gameId);

      // Persist reconnect metadata
      sessionStorage.setItem(
        "reconnect",
        JSON.stringify({
          gameId,
          username: "player",
          playerId,
        })
      );
    });

    // Fired on every valid move
    socket.on("gameState", (state) => {
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
    });

    // Server rejected reconnect attempt
    socket.on("rejoinFailed", () => {
      sessionStorage.removeItem("reconnect");
      socket.emit("join", {
        username: "player",
        playerId,
      });
    });

    socket.on("error", (msg) => {
      alert(msg);
    });

    /**
     * INITIAL CONNECTION LOGIC
     * Attempt rejoin first, fallback to join
     */
    const saved = sessionStorage.getItem("reconnect");

    if (saved) {
      const { gameId, username, playerId } = JSON.parse(saved);
      socket.emit("rejoin", { gameId, username, playerId });
    } else {
      socket.emit("join", {
        username: "player",
        playerId,
      });
    }

    return () => {
      socket.off("gameStart");
      socket.off("gameState");
      socket.off("rejoinFailed");
      socket.off("error");
    };
  }, [playerId]);

  /**
   * LEADERBOARD FETCH
   * Read-only, not real-time
   */
  useEffect(() => {
    fetch("http://localhost:3000/leaderboard")
      .then((res) => res.json())
      .then((data) => setLeaderboard(data))
      .catch((err) => {
        console.error("Failed to fetch leaderboard", err);
      });
  }, []);

  return (
    <div className="app">
      <h1>4 in a Row</h1>

      <div className="info">
        <p>Status: {status}</p>
        <p>Your Symbol: {mySymbol ?? "-"}</p>
        <p>Turn: {currentTurn ?? "-"}</p>
      </div>

      <Board board={board} onColumnClick={handleColumnClick} />

      <div className="leaderboard">
        <h2>Leaderboard</h2>

        {leaderboard.length === 0 ? (
          <p>No games played yet</p>
        ) : (
          <ol>
            {leaderboard.map((entry, index) => (
              <li key={index}>
                {entry.player} — {entry.wins} wins
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}