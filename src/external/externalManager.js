import { randomUUID } from "node:crypto";

export function ensurePrescriptionRequest(
  state,
  timestamp = new Date().toISOString()
) {
  state.externalData ||= {};

  if (!state.processing?.eligibleForExternalProcessing) {
    return { created: false };
  }

  const existing = state.externalData.PRESCRIPTION;

  if (existing?.status === "REQUESTED" || existing?.status === "RECEIVED") {
    return { created: false };
  }

  const requestId = randomUUID();

  state.externalData.PRESCRIPTION = {
    status: "REQUESTED",
    requestId,
    attributes: {},
    requestedAt: timestamp,
    receivedAt: null
  };

  return {
    created: true,
    request: {
      eventId: randomUUID(),
      eventType: "EXTERNAL_DATA_REQUESTED",
      applicationId: state.applicationId,
      requestId,
      source: "PRESCRIPTION",
      timestamp
    }
  };
}

export function applyPrescriptionResponse(state, event) {
  state.externalData ||= {};

  const current = state.externalData.PRESCRIPTION;
  const nextAttributes = event.attributes || {};

  if (
    current?.status === "RECEIVED" &&
    JSON.stringify(current.attributes || {}) === JSON.stringify(nextAttributes)
  ) {
    return false;
  }

  state.externalData.PRESCRIPTION = {
    status: "RECEIVED",
    requestId: current?.requestId || event.requestId || null,
    attributes: nextAttributes,
    requestedAt: current?.requestedAt || null,
    receivedAt: event.timestamp || new Date().toISOString()
  };

  return true;
}
