const { Kafka } = require("kafkajs");

// Kafka client for analytics consumption
const kafka = new Kafka({
  clientId: "connect4-analytics",
  brokers: ["localhost:9092"],
});


// Consumer group for analytics
const consumer = kafka.consumer({ groupId: "analytics-group" });


// In-memory analytics state
let totalDuration = 0;
let finishedGames = 0;

const winnerCounts = new Map();   // winner -> wins
const gamesPerHour = new Map();   // YYYY-MM-DDTHH -> count

(async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "game-events" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      
      // Parse Kafka event
      const event = JSON.parse(message.value.toString());
      console.log("Analytics event:", event);

      
      // Handle GAME_FINISHED events
      if (event.type === "GAME_FINISHED") {
        // ---- Average game duration ----
        totalDuration += event.durationMs;
        finishedGames++;

        const avgDuration = totalDuration / finishedGames;
        console.log("Average game duration (ms):", avgDuration);

        // ---- Most frequent winners ----
        const winnerKey =
          typeof event.winner === "object"
            ? event.winner.displayName
            : event.winner;

        winnerCounts.set(
          winnerKey,
          (winnerCounts.get(winnerKey) || 0) + 1
        );

        console.log(
          "Winner counts:",
          Array.from(winnerCounts.entries())
        );

        // ---- Games per hour ----
        const hourKey = new Date(event.timestamp)
          .toISOString()
          .slice(0, 13); // YYYY-MM-DDTHH

        gamesPerHour.set(
          hourKey,
          (gamesPerHour.get(hourKey) || 0) + 1
        );

        console.log(
          "Games per hour:",
          Array.from(gamesPerHour.entries())
        );
      }
    },
  });
})();