const pool = require("../db");

async function saveFinishedGame(gameId, game) {
  await pool.query(
    `
    INSERT INTO games (
      id,
      player_x,
      player_o,
      winner_player_id,
      winner_display_name,
      status,
      started_at,
      finished_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)

    `,
    [
      gameId,
      game.players.X.username,
      game.players.O.username,
      game.winner.playerId,
      game.winner.displayName,
      game.status,
      new Date(game.startedAt),
      new Date()
    ]
  );
}

module.exports = { saveFinishedGame };
