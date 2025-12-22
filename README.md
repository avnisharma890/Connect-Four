# 🎯 4 in a Row (Connect Four) — Real-Time Multiplayer Game

A real-time, backend-driven implementation of **4 in a Row (Connect Four)** with:

- Player vs Player matchmaking
- Competitive bot fallback
- Server-authoritative game logic
- WebSocket-based real-time updates
- Persistent game history & leaderboard
- Kafka-based analytics pipeline

This project was built as a **backend engineering assignment**, with focus on correctness, architecture, and real-world system design.

---

## 🧠 Architecture & Design

Detailed design and architecture notes (game engine, matchmaking, bot strategy, analytics pipeline, persistence, and scalability considerations) have been moved to `DESIGN.md`. See that file for in-depth documentation.

---

## 🕹 Game Rules

- Board size: **7 × 6**
- Players alternate turns dropping discs into columns
- Discs fall to the lowest available cell
- First player to connect **4 discs** (horizontal, vertical, or diagonal) wins
- Full board with no winner → draw

---

## 🚀 Running the Project

### Prerequisites

- Node.js
- Docker & Docker Compose

### Backend

```bash
cd backend
npm install
docker compose up -d
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


Frontend runs on http://localhost:5173
Backend runs on http://localhost:3000

---

## 🔮 Future Improvements

- Proper user authentication
- Persistent user profiles
- Secure username ownership
- Spectator mode
- Horizontal scaling with shared state
- Production deployment (Dockerized services)

---

## 👤 Author

Built by Avni Sharma
