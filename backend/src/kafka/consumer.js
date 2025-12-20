const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "connect4-analytics",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

(async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "game-events" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log("Analytics event:", event);
    },
  });
})();
