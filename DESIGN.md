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

## Future Extensions

* Reconnect within 30 seconds using gameId
* Persistent storage for completed games
* Leaderboard service
* Horizontal scaling with shared state
