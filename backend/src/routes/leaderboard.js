const express = require("express");
const { getLeaderboard } = require("../services/leaderboardService");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await getLeaderboard();
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(200).json([]);
  }
});

module.exports = router;
