import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveProcessing
} from "../src/case/eligibility.js";

import {
  validateExternal
} from "../src/external/crossSourceValidator.js";

import {
  ensureEvidenceRequirements,
  receiveEvidence
} from "../src/evidence/evidenceEngine.js";

import {
  calculateReadiness
} from "../src/readiness/readinessEngine.js";

function baseState() {
  return {
    applicationId:
      "APP-10482",
    application: {
      applicant:
        "Jane Smith",
      age: 52,
      faceAmount:
        1000000,
      tobacco: "N"
    },
    applicationValidation: {
      blockers: [],
      warnings: [
        "Applicant is on prescription medication."
      ]
    },
    processing: {},
    externalData: {},
    externalValidations: [],
    evidence: {}
  };
}

test(
  "initial case is PENDING_APPLICATION",
  () => {
    const state =
      baseState();

    state.processing =
      deriveProcessing(
        state.application,
        state.applicationValidation
      );

    assert.equal(
      calculateReadiness(state).status,
      "PENDING_APPLICATION"
    );
  }
);

test(
  "health and consent enable external processing",
  () => {
    const state =
      baseState();

    state.application.healthAnswers = {
      heartCondition: "NO",
      diabetes: "NO",
      hospitalization: "NO",
      prescriptionMedication: "YES",
      nicotineUse: "NO"
    };

    state.application.consentMetadata = {
      accepted: true
    };

    state.processing =
      deriveProcessing(
        state.application,
        state.applicationValidation
      );

    assert.equal(
      state.processing
        .eligibleForExternalProcessing,
      true
    );

    assert.equal(
      calculateReadiness(state).status,
      "PENDING_EXTERNAL_DATA"
    );
  }
);

test(
  "external nicotine indicator creates warning",
  () => {
    const state =
      baseState();

    state.externalData.PRESCRIPTION = {
      status: "RECEIVED",
      attributes: {
        nicotineIndicator: true
      }
    };

    const results =
      validateExternal(
        state.application,
        state.externalData
      );

    assert.equal(
      results.length,
      1
    );

    assert.equal(
      results[0].ruleId,
      "EXTERNAL_TOBACCO_001"
    );
  }
);

test(
  "Jane requires medical exam and APS",
  () => {
    const state =
      baseState();

    state.externalData.PRESCRIPTION = {
      status: "RECEIVED",
      attributes: {}
    };

    const created =
      ensureEvidenceRequirements(
        state,
        "2026-08-27T12:00:00Z"
      );

    assert.deepEqual(
      created
        .map(item => item.type)
        .sort(),
      [
        "APS",
        "MEDICAL_EXAM"
      ]
    );
  }
);

test(
  "evidence requirements are idempotent",
  () => {
    const state =
      baseState();

    state.externalData.PRESCRIPTION = {
      status: "RECEIVED",
      attributes: {}
    };

    ensureEvidenceRequirements(state);

    assert.equal(
      ensureEvidenceRequirements(state)
        .length,
      0
    );
  }
);

test(
  "all evidence with warnings produces READY_WITH_WARNINGS",
  () => {
    const state =
      baseState();

    state.application.healthAnswers = {
      heartCondition: "NO",
      diabetes: "NO",
      hospitalization: "NO",
      prescriptionMedication: "YES",
      nicotineUse: "NO"
    };

    state.application.consentMetadata = {
      accepted: true
    };

    state.processing =
      deriveProcessing(
        state.application,
        state.applicationValidation
      );

    state.externalData.PRESCRIPTION = {
      status: "RECEIVED",
      attributes: {
        nicotineIndicator: true
      }
    };

    state.externalValidations =
      validateExternal(
        state.application,
        state.externalData
      );

    ensureEvidenceRequirements(state);

    receiveEvidence(
      state,
      "MEDICAL_EXAM"
    );

    receiveEvidence(
      state,
      "APS"
    );

    const readiness =
      calculateReadiness(state);

    assert.equal(
      readiness.status,
      "READY_WITH_WARNINGS"
    );

    assert.equal(
      readiness.warnings.length,
      2
    );
  }
);
