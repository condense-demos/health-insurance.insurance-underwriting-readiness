import { deriveProcessing } from "./eligibility.js";
import {
  ensurePrescriptionRequest,
  applyPrescriptionResponse
} from "../external/externalManager.js";
import { validateExternal } from "../external/crossSourceValidator.js";
import {
  ensureEvidenceRequirements,
  receiveEvidence
} from "../evidence/evidenceEngine.js";
import { calculateReadiness } from "../readiness/readinessEngine.js";
import { addTimeline } from "../timeline/timelineManager.js";

function createState(applicationId) {
  return {
    applicationId,
    application: {},
    applicationValidation: {
      blockers: [],
      warnings: []
    },
    processing: {
      healthInformationAvailable: false,
      consentAvailable: false,
      hasBlockingValidation: false,
      eligibleForExternalProcessing: false
    },
    externalData: {},
    externalValidations: [],
    evidence: {},
    readiness: {
      status: "PENDING_APPLICATION",
      blockers: [],
      warnings: [],
      outstandingEvidence: [],
      lastUpdated: null
    },
    timeline: [],
    lastUpdated: null
  };
}

function comparableReadiness(readiness) {
  return {
    status: readiness?.status,
    blockers: readiness?.blockers || [],
    warnings: readiness?.warnings || [],
    outstandingEvidence: readiness?.outstandingEvidence || []
  };
}

function refreshReadiness(state, timestamp) {
  const oldReadiness = comparableReadiness(state.readiness);
  const next = calculateReadiness(state);
  const changed =
    JSON.stringify(oldReadiness) !== JSON.stringify(next);

  const previousStatus = state.readiness?.status;

  state.readiness = {
    ...next,
    lastUpdated: timestamp
  };

  if (changed) {
    addTimeline(
      state,
      "READINESS_UPDATED",
      previousStatus
        ? `Status changed from ${previousStatus} to ${next.status}`
        : `Initial readiness status: ${next.status}`,
      timestamp
    );
  }

  return changed;
}

export class CaseProcessor {
  constructor(repository) {
    this.repository = repository;
  }

  processCaseProcessed(event) {
    const timestamp =
      event.timestamp || new Date().toISOString();

    const state =
      this.repository.get(event.applicationId) ||
      createState(event.applicationId);

    const previousProcessing = state.processing;

    state.application = {
      ...(event.currentApplicationState || {})
    };

    state.applicationValidation = {
      blockers: event.validation?.blockers || [],
      warnings: event.validation?.warnings || []
    };

    state.processing =
      deriveProcessing(
        state.application,
        state.applicationValidation
      );

    state.lastUpdated = timestamp;

    addTimeline(
      state,
      "APPLICATION_RECEIVED",
      `Processed application state received: ${event.status || "UNKNOWN"}`,
      timestamp
    );

    if (
      state.processing.healthInformationAvailable &&
      !previousProcessing?.healthInformationAvailable
    ) {
      addTimeline(
        state,
        "HEALTH_INFORMATION_AVAILABLE",
        "Health information is available",
        timestamp
      );
    }

    if (
      state.processing.consentAvailable &&
      !previousProcessing?.consentAvailable
    ) {
      addTimeline(
        state,
        "CONSENT_AVAILABLE",
        "Applicant consent is available",
        timestamp
      );
    }

    const prescriptionRequest =
      ensurePrescriptionRequest(state, timestamp);

    if (prescriptionRequest.created) {
      addTimeline(
        state,
        "EXTERNAL_DATA_REQUESTED",
        "Prescription data requested",
        timestamp
      );
    }

    const readinessChanged =
      refreshReadiness(state, timestamp);

    this.repository.save(
      state.applicationId,
      state
    );

    return {
      state,
      prescriptionRequest:
        prescriptionRequest.request || null,
      readinessChanged,
      materialChange: true
    };
  }

  processExternalResponse(event) {
    const state =
      this.repository.get(event.applicationId);

    if (!state) {
      return {
        ignored: true,
        reason: "UNKNOWN_APPLICATION"
      };
    }

    const timestamp =
      event.timestamp || new Date().toISOString();

    const changed =
      applyPrescriptionResponse(state, event);

    if (!changed) {
      return {
        state,
        materialChange: false,
        reason: "UNCHANGED_EXTERNAL_RESPONSE"
      };
    }

    addTimeline(
      state,
      "EXTERNAL_DATA_RECEIVED",
      "Prescription data received",
      timestamp
    );

    state.externalValidations =
      validateExternal(
        state.application,
        state.externalData
      );

    if (
      state.externalValidations.some(
        item => item.severity === "WARNING"
      )
    ) {
      addTimeline(
        state,
        "EXTERNAL_VALIDATION_WARNING",
        "External-data validation warning created",
        timestamp
      );
    }

    const evidenceCreated =
      ensureEvidenceRequirements(
        state,
        timestamp
      );

    for (const evidence of evidenceCreated) {
      addTimeline(
        state,
        "EVIDENCE_REQUIREMENT_CREATED",
        `${evidence.type} required`,
        timestamp
      );
    }

    const readinessChanged =
      refreshReadiness(state, timestamp);

    state.lastUpdated = timestamp;

    this.repository.save(
      state.applicationId,
      state
    );

    return {
      state,
      evidenceCreated,
      readinessChanged,
      materialChange: true
    };
  }

  processEvidenceReceived(event) {
    const state =
      this.repository.get(event.applicationId);

    if (!state) {
      return {
        ignored: true,
        reason: "UNKNOWN_APPLICATION"
      };
    }

    const timestamp =
      event.timestamp || new Date().toISOString();

    const result =
      receiveEvidence(
        state,
        event.evidenceType,
        timestamp,
        event.details || event.payload || {}
      );

    if (!result.changed) {
      return {
        state,
        materialChange: false,
        reason: result.reason
      };
    }

    addTimeline(
      state,
      "EVIDENCE_RECEIVED",
      `${event.evidenceType} received`,
      timestamp
    );

    const readinessChanged =
      refreshReadiness(state, timestamp);

    state.lastUpdated = timestamp;

    this.repository.save(
      state.applicationId,
      state
    );

    return {
      state,
      readinessChanged,
      materialChange: true
    };
  }
}
