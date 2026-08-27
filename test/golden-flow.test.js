import test from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryStateRepository
} from "../src/state/InMemoryStateRepository.js";

import {
  CaseProcessor
} from "../src/case/caseProcessor.js";

const initialApplication = {
  applicant: "Jane Smith",
  dateOfBirth: "1974-06-15",
  product: "20_YEAR_TERM",
  faceAmount: 1000000,
  income: 150000,
  tobacco: "N",
  state: "IL",
  consentReceived: false,
  healthQuestionsComplete: false,
  age: 52
};

test(
  "Jane Smith golden flow",
  () => {
    const repository =
      new InMemoryStateRepository();

    const processor =
      new CaseProcessor(
        repository
      );

    let result =
      processor.processCaseProcessed({
        applicationId:
          "APP-10482",
        timestamp:
          "2026-08-27T11:49:39.571Z",
        status:
          "APPLICATION_CREATED_VALIDATED",
        currentApplicationState:
          initialApplication,
        validation: {
          blockers: [],
          warnings: [],
          canProceedToReadiness: true
        }
      });

    assert.equal(
      result.state.readiness.status,
      "PENDING_APPLICATION"
    );

    result =
      processor.processCaseProcessed({
        applicationId:
          "APP-10482",
        timestamp:
          "2026-08-27T11:50:05.595Z",
        status:
          "HEALTH_VALIDATION_WITH_WARNINGS",
        currentApplicationState: {
          ...initialApplication,
          healthAnswers: {
            heartCondition: "NO",
            diabetes: "NO",
            hospitalization: "NO",
            prescriptionMedication: "YES",
            nicotineUse: "NO"
          }
        },
        validation: {
          blockers: [],
          warnings: [
            "Applicant is on prescription medication."
          ],
          canProceedToReadiness: true
        }
      });

    assert.equal(
      result.state.readiness.status,
      "PENDING_APPLICATION"
    );

    result =
      processor.processCaseProcessed({
        applicationId:
          "APP-10482",
        timestamp:
          "2026-08-27T11:50:16.578Z",
        status:
          "READY_FOR_UNDERWRITING_WITH_WARNINGS",
        currentApplicationState: {
          ...initialApplication,
          healthAnswers: {
            heartCondition: "NO",
            diabetes: "NO",
            hospitalization: "NO",
            prescriptionMedication: "YES",
            nicotineUse: "NO"
          },
          consentMetadata: {
            consentType:
              "APPLICATION_AND_DATA_AUTHORIZATION",
            accepted: true,
            acceptedAt:
              "2026-08-27T11:50:16.326Z"
          }
        },
        validation: {
          blockers: [],
          warnings: [
            "Applicant is on prescription medication."
          ],
          canProceedToReadiness: true
        }
      });

    assert.equal(
      result.state.readiness.status,
      "PENDING_EXTERNAL_DATA"
    );

    assert.ok(
      result.prescriptionRequest
    );

    processor.processExternalResponse({
      applicationId:
        "APP-10482",
      source:
        "PRESCRIPTION",
      status:
        "RECEIVED",
      attributes: {
        nicotineIndicator:
          true
      },
      timestamp:
        "2026-08-27T12:00:00Z"
    });

    let state =
      repository.get(
        "APP-10482"
      );

    assert.equal(
      state.readiness.status,
      "PENDING_EVIDENCE"
    );

    assert.deepEqual(
      state.readiness
        .outstandingEvidence
        .sort(),
      [
        "APS",
        "MEDICAL_EXAM"
      ]
    );

    processor.processEvidenceReceived({
      applicationId:
        "APP-10482",
      evidenceType:
        "MEDICAL_EXAM",
      timestamp:
        "2026-08-27T12:01:00Z"
    });

    state =
      repository.get(
        "APP-10482"
      );

    assert.equal(
      state.readiness.status,
      "PENDING_EVIDENCE"
    );

    processor.processEvidenceReceived({
      applicationId:
        "APP-10482",
      evidenceType:
        "APS",
      timestamp:
        "2026-08-27T12:02:00Z"
    });

    state =
      repository.get(
        "APP-10482"
      );

    assert.equal(
      state.readiness.status,
      "READY_WITH_WARNINGS"
    );

    assert.equal(
      state.readiness.warnings.length,
      2
    );
  }
);
