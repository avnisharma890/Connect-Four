const { Kafka } = require("kafkajs");

const ENABLE_KAFKA = process.env.ENABLE_KAFKA === "true";

let producer = null;

if (ENABLE_KAFKA) {
  const kafka = new Kafka({
    clientId: "connect4-server",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  });

  producer = kafka.producer();
}

async function initProducer() {
  if (!ENABLE_KAFKA) {
    console.log("Kafka disabled — skipping producer init");
    return;
  }

  await producer.connect();
}

async function emitEvent(event) {
  if (!ENABLE_KAFKA) return;

  await producer.send({
    topic: "game-events",
    messages: [{ value: JSON.stringify(event) }],
  });
}

module.exports = { initProducer, emitEvent };