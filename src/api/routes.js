import { randomUUID } from "node:crypto";
import {
  buildApplicationSummary,
  buildUnderwriterProjection
} from "../projection/underwriterProjection.js";

const ALLOWED_EVIDENCE =
  new Set([
    "MEDICAL_EXAM",
    "APS"
  ]);

export function registerRoutes(
  app,
  {
    repository,
    publisher
  }
) {
  app.get(
    "/health",
    async () => ({
      status: "UP"
    })
  );

  app.get(
    "/applications",
    async () =>
      repository
        .all()
        .map(buildApplicationSummary)
        .sort(
          (a, b) =>
            String(b.lastUpdated || "")
              .localeCompare(
                String(a.lastUpdated || "")
              )
        )
  );

  app.get(
    "/application/:applicationId",
    async (request, reply) => {
      const state =
        repository.get(
          request.params.applicationId
        );

      if (!state) {
        return reply
          .code(404)
          .send({
            error:
              "Application not found"
          });
      }

      return buildUnderwriterProjection(
        state
      );
    }
  );

  app.get(
    "/application/:applicationId/readiness",
    async (request, reply) => {
      const state =
        repository.get(
          request.params.applicationId
        );

      if (!state) {
        return reply
          .code(404)
          .send({
            error:
              "Application not found"
          });
      }

      return state.readiness;
    }
  );

  app.get(
    "/application/:applicationId/evidence",
    async (request, reply) => {
      const state =
        repository.get(
          request.params.applicationId
        );

      if (!state) {
        return reply
          .code(404)
          .send({
            error:
              "Application not found"
          });
      }

      return Object.values(
        state.evidence || {}
      );
    }
  );

  app.get(
    "/application/:applicationId/timeline",
    async (request, reply) => {
      const state =
        repository.get(
          request.params.applicationId
        );

      if (!state) {
        return reply
          .code(404)
          .send({
            error:
              "Application not found"
          });
      }

      return [
        ...(state.timeline || [])
      ].reverse();
    }
  );

  app.post(
    "/application/:applicationId/demo/prescription-response",
    async (request, reply) => {
      const applicationId =
        request.params.applicationId;

      if (
        !repository.exists(
          applicationId
        )
      ) {
        return reply
          .code(404)
          .send({
            error:
              "Application not found"
          });
      }

      const command = {
        eventId: randomUUID(),
        applicationId,
        command:
          "RETURN_PRESCRIPTION_DATA",
        timestamp:
          new Date().toISOString()
      };

      await publisher.externalCommand(
        command
      );

      return reply
        .code(202)
        .send({
          accepted: true,
          command
        });
    }
  );

  app.post(
    "/application/:applicationId/evidence/:type/received",
    async (request, reply) => {
      const applicationId =
        request.params.applicationId;

      const evidenceType =
        String(
          request.params.type || ""
        ).toUpperCase();

      if (
        !repository.exists(
          applicationId
        )
      ) {
        return reply
          .code(404)
          .send({
            error:
              "Application not found"
          });
      }

      if (
        !ALLOWED_EVIDENCE.has(
          evidenceType
        )
      ) {
        return reply
          .code(400)
          .send({
            error:
              "Unsupported evidence type"
          });
      }

      const event = {
        eventId: randomUUID(),
        applicationId,
        eventType:
          "EVIDENCE_RECEIVED",
        evidenceType,
        status: "RECEIVED",
        timestamp:
          new Date().toISOString()
      };

      await publisher.evidenceEvent(
        event
      );

      return reply
        .code(202)
        .send({
          accepted: true,
          event
        });
    }
  );
}
