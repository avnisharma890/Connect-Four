import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import Board from "./Board";
import "./styles.css";

const socket = io("http://localhost:3000");

export default function App() {
  const [board, setBoard] = useState(
    Array.from({ length: 6 }, () => Array(7).fill(null))
  );
  const [status, setStatus] = useState("WAITING");
  const [currentTurn, setCurrentTurn] = useState(null);
  const [mySymbol, setMySymbol] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  function handleColumnClick(col) {
    if (currentTurn !== mySymbol) return;
    socket.emit("makeMove", { column: col });
  }

  useEffect(() => {
    socket.on("gameStart", ({ symbol, state, gameId }) => {
      setMySymbol(symbol);
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
      setGameId(gameId);

      sessionStorage.setItem("wasInGame", "true");
      localStorage.setItem(
        "reconnect",
        JSON.stringify({ gameId, username: "player" })
      );
    });

    socket.on("gameState", (state) => {
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
    });

    socket.on("rejoinFailed", () => {
      sessionStorage.removeItem("wasInGame");
      localStorage.removeItem("reconnect");
      socket.emit("join", { username: "player" });
    });

    socket.on("error", (msg) => {
      alert(msg);
    });

    const saved = localStorage.getItem("reconnect");
    const wasInGame = sessionStorage.getItem("wasInGame");

    if (saved && wasInGame === "true") {
      const { gameId, username } = JSON.parse(saved);
      socket.emit("rejoin", { gameId, username });
    } else {
      socket.emit("join", { username: "player" });
    }

    return () => {
      socket.off("gameStart");
      socket.off("gameState");
      socket.off("rejoinFailed");
      socket.off("error");
    };
  }, []);

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