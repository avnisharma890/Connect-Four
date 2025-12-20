const pool = require("../db");

async function saveFinishedGame(gameId, game) {
  await pool.query(
    `
    INSERT INTO games (
      id,
      player_x,
      player_o,
      winner,
      status,
      started_at,
      finished_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [
      gameId,
      game.players.X,
      game.players.O,
      game.winner,
      game.status,
      game.startedAt,
    ]
  );
}

module.exports = { saveFinishedGame };
