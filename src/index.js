import { config } from "./config.js";
import {
  createKafkaClient
} from "./kafka/kafkaClient.js";
import {
  InMemoryStateRepository
} from "./state/InMemoryStateRepository.js";
import {
  CaseProcessor
} from "./case/caseProcessor.js";
import {
  KafkaPublisher
} from "./kafka/producer.js";
import {
  EventRouter
} from "./kafka/eventRouter.js";
import {
  startConsumer
} from "./kafka/consumer.js";
import {
  createServer
} from "./api/server.js";
import {
  logger
} from "./utils/logger.js";

const repository =
  new InMemoryStateRepository();

const processor =
  new CaseProcessor(
    repository
  );

const kafka =
  createKafkaClient(
    config.kafka
  );

const producer =
  kafka.producer();

const consumer =
  kafka.consumer({
    groupId:
      config.kafka.consumerGroup
  });

await producer.connect();

const publisher =
  new KafkaPublisher(
    producer,
    config.topics
  );

const router =
  new EventRouter({
    processor,
    repository,
    publisher,
    topics:
      config.topics,
    demoNicotineIndicator:
      config.demoNicotineIndicator
  });

const server =
  await createServer({
    repository,
    publisher,
    corsOrigin:
      config.corsOrigin
  });

await server.listen({
  port:
    config.port,
  host:
    "0.0.0.0"
});

logger.info(
  {
    port:
      config.port
  },
  "HTTP API started"
);

startConsumer(
  consumer,
  [
    config.topics.caseProcessed,
    config.topics.externalResponses,
    config.topics.evidenceEvents,
    config.topics.externalCommands
  ],
  router
).catch(error => {
  logger.error(
    {
      error:
        error.message
    },
    "Kafka consumer stopped unexpectedly"
  );

  process.exitCode = 1;
});

async function shutdown(signal) {
  logger.info(
    { signal },
    "Shutting down"
  );

  try {
    await consumer.disconnect();
  } catch {}

  try {
    await producer.disconnect();
  } catch {}

  try {
    await server.close();
  } catch {}

  process.exit(0);
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);
