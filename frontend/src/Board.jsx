import Cell from "./Cell";

export default function Board({ board, onColumnClick }) {
  return (
    <div className="board">
      {board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <Cell
            key={`${rowIdx}-${colIdx}`}
            value={cell}
            onClick={() => onColumnClick(colIdx)}
          />
        ))
      )}
    </div>
  );
}
