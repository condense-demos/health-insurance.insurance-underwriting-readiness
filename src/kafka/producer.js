export class KafkaPublisher {
  constructor(producer, topics) {
    this.producer = producer;
    this.topics = topics;
  }

  async publish(topic, applicationId, value) {
    await this.producer.send({
      topic,
      messages: [
        {
          key: applicationId,
          value: JSON.stringify(value)
        }
      ]
    });
  }

  externalRequest(event) {
    return this.publish(
      this.topics.externalRequests,
      event.applicationId,
      event
    );
  }

  externalResponse(event) {
    return this.publish(
      this.topics.externalResponses,
      event.applicationId,
      event
    );
  }

  evidenceEvent(event) {
    return this.publish(
      this.topics.evidenceEvents,
      event.applicationId,
      event
    );
  }

  readiness(applicationId, projection) {
    return this.publish(
      this.topics.caseReadiness,
      applicationId,
      projection
    );
  }

  timeline(applicationId, event) {
    return this.publish(
      this.topics.timeline,
      applicationId,
      {
        applicationId,
        ...event
      }
    );
  }

  externalCommand(event) {
    return this.publish(
      this.topics.externalCommands,
      event.applicationId,
      event
    );
  }
}
