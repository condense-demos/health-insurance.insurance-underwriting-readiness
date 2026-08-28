import { randomUUID } from "node:crypto";
import {
  buildUnderwriterProjection
} from "../projection/underwriterProjection.js";

function stableProjection(projection) {
  const clone =
    structuredClone(projection);

  delete clone.lastUpdated;

  if (clone.readiness) {
    delete clone.readiness.lastUpdated;
  }

  return JSON.stringify(clone);
}

export class EventRouter {
  constructor({
    processor,
    repository,
    publisher,
    topics,
    demoNicotineIndicator
  }) {
    this.processor = processor;
    this.repository = repository;
    this.publisher = publisher;
    this.topics = topics;
    this.demoNicotineIndicator =
      demoNicotineIndicator;

    this.processedIds = new Set();
    this.maxProcessedIds = 5000;

    this.lastProjectionHash =
      new Map();
  }

  isDuplicate(eventId) {
    return Boolean(
      eventId &&
      this.processedIds.has(eventId)
    );
  }

  remember(eventId) {
    if (!eventId) return;

    this.processedIds.add(eventId);

    if (
      this.processedIds.size >
      this.maxProcessedIds
    ) {
      const first =
        this.processedIds
          .values()
          .next()
          .value;

      this.processedIds.delete(first);
    }
  }

  async publishNewTimeline(
    state,
    previousLength
  ) {
    const additions =
      (state.timeline || [])
        .slice(previousLength);

    for (const event of additions) {
      await this.publisher.timeline(
        state.applicationId,
        event
      );
    }
  }

  async publishProjectionIfChanged(state) {
    const projection =
      buildUnderwriterProjection(state);

    const hash =
      stableProjection(projection);

    if (
      this.lastProjectionHash.get(
        state.applicationId
      ) === hash
    ) {
      return false;
    }

    await this.publisher.readiness(
      state.applicationId,
      projection
    );

    this.lastProjectionHash.set(
      state.applicationId,
      hash
    );

    return true;
  }

  async handleCaseProcessed(event) {
    const before =
      this.repository.get(
        event.applicationId
      );

    const previousTimelineLength =
      before?.timeline?.length || 0;

    const result =
      this.processor
        .processCaseProcessed(event);

    if (result.prescriptionRequest) {
      await this.publisher.externalRequest(
        result.prescriptionRequest
      );
    }

    await this.publishNewTimeline(
      result.state,
      previousTimelineLength
    );

    if (result.materialChange) {
      await this.publishProjectionIfChanged(
        result.state
      );
    }

    return result;
  }

  async handleExternalResponse(event) {
    const before =
      this.repository.get(
        event.applicationId
      );

    const previousTimelineLength =
      before?.timeline?.length || 0;

    const result =
      this.processor
        .processExternalResponse(event);

    if (
      result.ignored ||
      !result.state
    ) {
      return result;
    }

    for (
      const evidence
      of result.evidenceCreated || []
    ) {
      await this.publisher.evidenceEvent({
        eventId: randomUUID(),
        applicationId:
          event.applicationId,
        eventType:
          "EVIDENCE_REQUIREMENT_CREATED",
        evidenceType:
          evidence.type,
        status:
          evidence.status,
        reason:
          evidence.reason,
        timestamp:
          evidence.createdAt
      });
    }

    await this.publishNewTimeline(
      result.state,
      previousTimelineLength
    );

    if (result.materialChange) {
      await this.publishProjectionIfChanged(
        result.state
      );
    }

    return result;
  }

  async handleEvidenceEvent(event) {
    if (
      event.eventType !==
      "EVIDENCE_RECEIVED"
    ) {
      return {
        ignored: true,
        reason:
          "NON_RECEIPT_EVIDENCE_EVENT"
      };
    }

    const before =
      this.repository.get(
        event.applicationId
      );

    const previousTimelineLength =
      before?.timeline?.length || 0;

    const result =
      this.processor
        .processEvidenceReceived(event);

    if (
      result.ignored ||
      !result.state
    ) {
      return result;
    }

    await this.publishNewTimeline(
      result.state,
      previousTimelineLength
    );

    if (result.materialChange) {
      await this.publishProjectionIfChanged(
        result.state
      );
    }

    return result;
  }

  async handleExternalCommand(event) {
    if (
      event.command !==
      "RETURN_PRESCRIPTION_DATA"
    ) {
      return {
        ignored: true,
        reason: "UNKNOWN_COMMAND"
      };
    }

    if (
      !this.repository.exists(
        event.applicationId
      )
    ) {
      return {
        ignored: true,
        reason: "UNKNOWN_APPLICATION"
      };
    }

    const response = {
      eventId: randomUUID(),
      applicationId:
        event.applicationId,
      source: "PRESCRIPTION",
      status: "RECEIVED",
      attributes: {
        nicotineIndicator:
          this.demoNicotineIndicator,
        activeMedications: [
          {
            name: "Varenicline",
            category: "Smoking cessation",
            lastFilled: "2026-07-18"
          }
        ],
        prescriptionCountLast12Months: 6,
        providerMatchConfidence: 0.97,
        sourceRecordDate: "2026-08-20"
      },
      timestamp:
        new Date().toISOString()
    };

    await this.publisher.externalResponse(
      response
    );

    return {
      simulatedResponse: response
    };
  }

  async route(topic, event) {
    if (!event?.applicationId) {
      return {
        ignored: true,
        reason: "MISSING_APPLICATION_ID"
      };
    }

    if (this.isDuplicate(event.eventId)) {
      return {
        ignored: true,
        reason: "DUPLICATE_EVENT"
      };
    }

    let result;

    if (topic === this.topics.caseProcessed) {
      result =
        await this.handleCaseProcessed(
          event
        );
    } else if (
      topic === this.topics.externalResponses
    ) {
      result =
        await this.handleExternalResponse(
          event
        );
    } else if (
      topic === this.topics.evidenceEvents
    ) {
      result =
        await this.handleEvidenceEvent(
          event
        );
    } else if (
      topic === this.topics.externalCommands
    ) {
      result =
        await this.handleExternalCommand(
          event
        );
    } else {
      result = {
        ignored: true,
        reason: "UNKNOWN_TOPIC"
      };
    }

    this.remember(event.eventId);

    return result;
  }
}
