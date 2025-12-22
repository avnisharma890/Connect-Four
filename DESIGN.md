# GAME DESIGN

## User (Session)

Represents a connected client.

### User

* username
* socketId
* status (connected / disconnected)

Users are identified by socketId
User state is ephemeral and exists only during a connection
The server never trusts the client for identity or turns

---

## Lobby (Matchmaking)

The lobby is a temporary waiting state.

### Lobby

* waitingPlayer
* timer (10 seconds)

**Purpose:**

* Holds a single waiting user
* If a second user joins within 10 seconds → PvP game starts
* Otherwise → user is paired with a competitive bot

**Key detail:**
A guard ensures the timer only starts a bot game if the same user is still waiting (race-condition safe)

---

## Game (Authoritative State)

Represents a single Connect Four match.

### Game

* id
* board (7x6 grid)
* players (X / O)
* currentTurn
* status (ACTIVE / FINISHED)

Game logic lives entirely on the server

**The server validates:**

* turn order
* valid moves
* win / draw conditions

The bot is treated as a regular player from the game’s perspective

---

## Room-Based Isolation

Each game is mapped to a Socket.IO room.

### Room (gameId)

* exactly two participants (player vs player OR player vs bot)

**Why rooms are used:**

* Prevent state leakage across games
* Ensure game updates are scoped to the correct players
* Allow multiple games to run concurrently

A socket belongs to exactly one game room at any time.

---

## Game Lifecycle

User → Lobby → Game → Finished

**Flow:**

* User connects and emits join
* User enters the lobby
* Matchmaking occurs (PvP or bot fallback)
* Game runs until win or draw
* Game ends and becomes eligible for persistence / analytics

---

## Socket Events

### Client → Server

* join        // request matchmaking
* move        // send column index
* disconnect  // client disconnect
* rejoin      // (planned) reconnect to existing game

### Server → Client

* gameStart   // assigns symbol and sends initial state
* gameState   // broadcasts updated state to the room
* gameOver    // (planned) signals game completion
* error       // invalid move or rule violation

**Design rules:**

* Clients never send symbols or game state
* The server assigns identity and enforces rules
* All emissions are room-scoped

---

## In-Memory State

The backend maintains the following mappings:

* socket.id → gameId
* socket.id → playerSymbol
* gameId    → Game instance

**Rationale:**

* Live game state is short-lived and session-scoped
* In-memory access is required for real-time performance
* Databases are intentionally avoided for ephemeral state

---

## Kafka Analytics

Kafka is used to model a real-world analytics pipeline.

### Producer (Game Server)

Emits JSON events such as:

* game started
* move made
* game finished

### Consumer (Analytics Service)

* Subscribes to topics
* Logs or persists events

**Computes metrics such as:**

* average game duration
* most frequent winners
* games per time window

Kafka ensures analytics are decoupled from gameplay and do not impact latency.

---

## Design Principles Followed

* Server-authoritative logic
* Room-based isolation
* Event-driven communication
* Minimal shared state
* Race-condition safe matchmaking
* Clear separation of concerns

---

## Schema

games
* id (UUID)
* player_x (TEXT)
* player_o (TEXT)
* winner (TEXT | NULL)
* status (FINISHED)
* started_at
* finished_at

---

## Future Extensions

* Horizontal scaling with shared state

---

## Appendix — README Extracted Notes

The following details were originally included in `README.md` and have been moved here for reference and deeper documentation.

### High-Level Architecture (summary)

**Backend**

- Node.js + Express
- Socket.IO for real-time gameplay
- In-memory state for active games
- PostgreSQL for completed games & leaderboard
- Kafka for analytics events

**Frontend**

- React (Vite)
- Minimal UI (logic-first, styling secondary)
- Real-time updates via WebSockets

### Matchmaking

- Players join and enter a lobby (waiting state)
- If another player joins within 10 seconds → PvP game starts
- Otherwise → paired with a competitive bot
- The lobby is race-condition safe and resets if a waiting player disconnects

### Competitive Bot

The bot is not random and prioritizes:

1. Blocking an opponent’s immediate winning move
2. Creating its own winning opportunities
3. Valid fallback moves if no tactical move exists

From the game engine’s perspective, the bot is treated as a regular player.

### Reconnection

- Each game has a stable `gameId`
- Players have 30 seconds to reconnect before the game is forfeited
- Rejoining within the timeout restores the exact game state

### Leaderboard

- Tracks number of wins per player
- Derived from persisted game data
- Exposed via REST endpoint for frontend consumption

### Kafka Analytics

- Events produced: `GAME_STARTED`, `MOVE_MADE`, `GAME_FINISHED`
- Consumer computes metrics such as average game duration and most frequent winners
- Analytics are decoupled and do not impact gameplay latency

### Project Structure (reference)

```
backend/
  src/
    game/      # Core game engine
    logic/     # Board + bot logic
    routes/    # REST endpoints (leaderboard)
    services/  # DB & analytics services
    kafka/     # Producer / Consumer
    db/        # PostgreSQL pool
  server.js    # Main server entry
Dockerfile
docker-compose.yml

frontend/
  src/
    App.jsx
    Board.jsx
    index.html
```

---