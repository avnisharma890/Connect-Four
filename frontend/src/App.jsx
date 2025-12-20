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
  const [mySymbol, setMySymbol] = useState(null); // 🔑 NEW

  function handleColumnClick(col) {
  // Block clicks if it's not your turn
    if (currentTurn !== mySymbol) return;

    socket.emit("makeMove", { column: col });
  }

  useEffect(() => {
    socket.emit("join", { username: "player" });

    // Fired once when game is created
    socket.on("gameStart", ({ symbol, state }) => {
      setMySymbol(symbol);
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
    });

    // Fired on every move
    socket.on("gameState", (state) => {
      setBoard(state.board);
      setStatus(state.status);
      setCurrentTurn(state.currentTurn);
    });

    socket.on("error", (msg) => {
      alert(msg);
    });

    socket.on("gameStart", ({ symbol, state }) => {
    console.log("GAME START", symbol, state);
    setMySymbol(symbol);
    setBoard(state.board);
    setStatus(state.status);
    setCurrentTurn(state.currentTurn);
  });

    return () => {
      socket.off("gameStart");
      socket.off("gameState");
      socket.off("error");
    };
  }, []);

  return (
    <div className="app">
      <h1>4 in a Row</h1>

      <div className="info">
        <p>Status: {status}</p>
        <p>Your Symbol: {mySymbol ?? "-"}</p>
        <p>Turn: {currentTurn ?? "-"}</p>
      </div>

      {board && (
        <Board board={board} onColumnClick={handleColumnClick} />
      )}
    </div>
  );
}