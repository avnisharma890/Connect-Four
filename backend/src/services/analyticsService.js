const { emitEvent } = require("../kafka/producer");

function gameStarted(gameId, players) {
  emitEvent({
    type: "GAME_STARTED",
    gameId,
    players,
    timestamp: Date.now(),
  });
}

function moveMade(gameId, player, column) {
  emitEvent({
    type: "MOVE_MADE",
    gameId,
    player,
    column,
    timestamp: Date.now(),
  });
}

function gameFinished(gameId, winner, startedAt) {
  emitEvent({
    type: "GAME_FINISHED",
    gameId,
    winner,
    durationMs: Date.now() - startedAt,
    timestamp: Date.now(),
  });
}

module.exports = { gameStarted, moveMade, gameFinished };
