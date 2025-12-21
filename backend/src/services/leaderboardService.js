const pool = require("../db");

async function getLeaderboard() {
  const result = await pool.query(`
    SELECT
      winner_display_name AS player,
      COUNT(*) AS wins
    FROM games
    GROUP BY winner_display_name
    ORDER BY wins DESC
  `);

  return result.rows;
}

module.exports = { getLeaderboard };