import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import Board from "./Board";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";

/**
 * Socket is created ONCE for the app lifetime
 */
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
   * SESSION IDENTITY (per-tab)
   */
  const storedPlayerId = sessionStorage.getItem("playerId");
  const playerId = storedPlayerId ?? uuidv4();

  if (!storedPlayerId) {
    sessionStorage.setItem("playerId", playerId);
  }

  /**
   * USERNAME (asked once per tab)
   */
  const storedUsername = sessionStorage.getItem("username") || "guest";
  const [username, setUsername] = useState(storedUsername || "");

  /**
   * MOVE HANDLER
   */
  function handleColumnClick(col) {
    if (currentTurn !== mySymbol) return;
    socket.emit("makeMove", { column: col });
  }

  /**
   * SOCKET LIFECYCLE
   * Runs once, emits only after identity exists
   */
  useEffect(() => {
    // Game created OR successfully rejoined
    socket.on("gameStart", ({ symbol, state, gameId }) => {
      setMySymbol(symbol);
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
      setGameId(gameId);

      sessionStorage.setItem(
        "reconnect",
        JSON.stringify({ gameId, username, playerId })
      );
    });

    // Fired on every valid move
    socket.on("gameState", (state) => {
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
    });

    // Reconnect rejected → fresh join
    socket.on("rejoinFailed", () => {
      sessionStorage.removeItem("reconnect");
      socket.emit("join", { username, playerId });
    });

    socket.on("error", (msg) => alert(msg));

    return () => {
      socket.off("gameStart");
      socket.off("gameState");
      socket.off("rejoinFailed");
      socket.off("error");
    };
  }, [username, playerId]);

  /**
   * JOIN / REJOIN — ONLY when username exists
   */
  useEffect(() => {
    if (!username) return;

    const saved = sessionStorage.getItem("reconnect");

    if (saved) {
      const { gameId } = JSON.parse(saved);
      socket.emit("rejoin", { gameId, username, playerId });
    } else {
      socket.emit("join", { username, playerId });
    }
  }, [username, playerId]);

  /**
   * LEADERBOARD
   */
  useEffect(() => {
    fetch("http://localhost:3000/leaderboard")
      .then((res) => res.json())
      .then(setLeaderboard)
      .catch(() => {});
  }, []);

  /**
   * USERNAME PROMPT (shown ONCE)
   */
  if (!username) {
    return (
      <div className="app">
        <h1>4 in a Row</h1>
        <input
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          onClick={() => {
            sessionStorage.setItem("username", username);
          }}
        >
          Start
        </button>
      </div>
    );
  }

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
            {leaderboard.map((e, i) => (
              <li key={i}>
                {e.player} — {e.wins} wins
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
