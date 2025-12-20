const express = require("express");
const { getLeaderboard } = require("../services/leaderboardService");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

module.exports = router;
