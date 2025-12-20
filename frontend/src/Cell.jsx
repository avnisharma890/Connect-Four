export default function Cell({ value, onClick }) {
  return (
    <div
      className={`cell ${value ? value.toLowerCase() : ""}`}
      onClick={onClick}
    />
  );
}
