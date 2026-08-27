import { logger } from "../utils/logger.js";

export async function startConsumer(
  consumer,
  topics,
  router
) {
  await consumer.connect();

  for (const topic of topics) {
    await consumer.subscribe({
      topic,
      fromBeginning: false
    });
  }

  await consumer.run({
    autoCommit: false,

    eachMessage: async ({
      topic,
      partition,
      message
    }) => {
      let event;

      try {
        event = JSON.parse(
          message.value?.toString() || ""
        );
      } catch {
        logger.error(
          { topic, partition },
          "Malformed Kafka message; skipped"
        );
        return;
      }

      if (!event?.applicationId) {
        logger.warn(
          { topic, partition },
          "Kafka message missing applicationId; skipped"
        );
        return;
      }

      try {
        const result =
          await router.route(
            topic,
            event
          );

        logger.info(
          {
            topic,
            partition,
            applicationId:
              event.applicationId,
            eventId:
              event.eventId,
            eventType:
              event.eventType,
            result:
              result?.reason ||
              "PROCESSED"
          },
          "Kafka event handled"
        );

        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset:
              String(
                BigInt(message.offset) + 1n
              )
          }
        ]);
      } catch (error) {
        logger.error(
          {
            topic,
            partition,
            applicationId:
              event.applicationId,
            eventId:
              event.eventId,
            error:
              error.message
          },
          "Kafka processing failed; offset not committed"
        );
      }
    }
  });
}
