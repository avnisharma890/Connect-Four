const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "connect4-server",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

async function initProducer() {
  await producer.connect();
}

async function emitEvent(event) {
  await producer.send({
    topic: "game-events",
    messages: [{ value: JSON.stringify(event) }],
  });
}

module.exports = { initProducer, emitEvent };
