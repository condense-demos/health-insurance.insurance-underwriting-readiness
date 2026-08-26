const { Kafka } = require('kafkajs');
const express = require('express');
const { RuleEngine } = require('./rules');
require('dotenv').config();

// --- Configuration from Environment Variables ---
const KAFKA_BROKERS = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : [];
const KAFKA_INPUT_TOPIC = process.env.KAFKA_INPUT_TOPIC;
const KAFKA_OUTPUT_TOPIC_CASE_UPDATES = process.env.KAFKA_OUTPUT_TOPIC_CASE_UPDATES;
const KAFKA_OUTPUT_TOPIC_WARNINGS = process.env.KAFKA_OUTPUT_TOPIC_WARNINGS;
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'nodejs-kafka-consumer-group';
const HEALTH_CHECK_PORT = process.env.HEALTH_CHECK_PORT || 8080;

// --- Input Validation ---
if (KAFKA_BROKERS.length === 0) {
  console.error('KAFKA_BROKERS environment variable is not set.');
  process.exit(1);
}
if (!KAFKA_INPUT_TOPIC) {
  console.error('KAFKA_INPUT_TOPIC environment variable is not set.');
  process.exit(1);
}
if (!KAFKA_OUTPUT_TOPIC_CASE_UPDATES) {
  console.error('KAFKA_OUTPUT_TOPIC_CASE_UPDATES environment variable is not set.');
  process.exit(1);
}
if (!KAFKA_OUTPUT_TOPIC_WARNINGS) {
  console.error('KAFKA_OUTPUT_TOPIC_WARNINGS environment variable is not set.');
  process.exit(1);
}

// --- Kafka Setup ---
const kafka = new Kafka({
  clientId: 'nodejs-event-processor',
  brokers: KAFKA_BROKERS,
  retry: { 
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
const producer = kafka.producer({
  maxInFlightRequests: 100,
  idempotent: true,
  transactionTimeout: 60000
});

const ruleEngine = new RuleEngine();

let isConsumerReady = false;
let isProducerReady = false;

// --- Health Check Server ---
const app = express();
app.get('/health', (req, res) => {
  if (isConsumerReady && isProducerReady) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Service Unavailable');
  }
});

const healthServer = app.listen(HEALTH_CHECK_PORT, () => {
  console.log(`Health check server listening on port ${HEALTH_CHECK_PORT}`);
});

// --- Graceful Shutdown ---
const shutdown = async () => {
  console.log('Shutting down application...');
  await consumer.disconnect();
  await producer.disconnect();
  healthServer.close(() => {
    console.log('Health check server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// --- Kafka Consumer and Producer Logic ---
const run = async () => {
  try {
    await producer.connect();
    isProducerReady = true;
    console.log('Kafka Producer connected.');

    await consumer.connect();
    isConsumerReady = true;
    console.log('Kafka Consumer connected.');

    await consumer.subscribe({ topic: KAFKA_INPUT_TOPIC, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`Received message: ${JSON.stringify(event)} from topic ${topic}, partition ${partition}`);

          const { caseUpdate, warning } = ruleEngine.processEvent(event);

          const messagesToProduce = [];

          if (caseUpdate) {
            messagesToProduce.push({
              topic: KAFKA_OUTPUT_TOPIC_CASE_UPDATES,
              messages: [{ value: JSON.stringify(caseUpdate) }],
            });
          }
          if (warning) {
            messagesToProduce.push({
              topic: KAFKA_OUTPUT_TOPIC_WARNINGS,
              messages: [{ value: JSON.stringify(warning) }],
            });
          }

          if (messagesToProduce.length > 0) {
            await producer.sendBatch({
              topicMessages: messagesToProduce,
              ACKS: -1
            });
            console.log(`Produced messages: ${JSON.stringify(messagesToProduce)}`);
          }
        } catch (error) {
          console.error(`Error processing message: ${error.message}`, error);
          // Implement Dead Letter Topic (DLT) mechanism here if required
        }
      },
    });
  } catch (error) {
    console.error(`Failed to start Kafka application: ${error.message}`, error);
    process.exit(1);
  }
};

run().catch(console.error);
