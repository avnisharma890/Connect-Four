const pool = require("../db");

async function getLeaderboard(limit = 10) {
  const { rows } = await pool.query(
    `
        SELECT winner AS player, COUNT(*) AS wins
        FROM games
        WHERE winner IS NOT NULL
        GROUP BY winner
        ORDER BY wins DESC
        LIMIT $1
    `,
    [limit]
  );

  return rows;
}

module.exports = { getLeaderboard };
