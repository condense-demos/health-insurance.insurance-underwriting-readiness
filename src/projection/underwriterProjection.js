export function buildUnderwriterProjection(state) {
  const application = state.application || {};

  return {
    applicationId: state.applicationId,

    applicant: {
      name: application.applicant ?? null,
      dateOfBirth: application.dateOfBirth ?? null,
      age: application.age ?? null,
      state: application.state ?? null
    },

    policy: {
      product: application.product ?? null,
      faceAmount: application.faceAmount ?? null,
      income: application.income ?? null,
      tobacco: application.tobacco ?? null
    },

    health: {
      questionsComplete:
        state.processing?.healthInformationAvailable ?? false,
      answers:
        application.healthAnswers || {}
    },

    consent: {
      received:
        state.processing?.consentAvailable ?? false,
      type:
        application.consentMetadata?.consentType ?? null,
      acceptedAt:
        application.consentMetadata?.acceptedAt ?? null
    },

    applicationValidation:
      state.applicationValidation || {
        blockers: [],
        warnings: []
      },

    processing:
      state.processing,

    externalData:
      Object.entries(state.externalData || {})
        .map(([source, value]) => ({
          source,
          ...value
        })),

    externalValidations:
      state.externalValidations || [],

    evidence:
      Object.values(state.evidence || {}),

    readiness:
      state.readiness,

    timeline:
      [...(state.timeline || [])]
        .reverse(),

    lastUpdated:
      state.lastUpdated
  };
}

export function buildApplicationSummary(state) {
  return {
    applicationId:
      state.applicationId,
    applicant:
      state.application?.applicant ?? null,
    product:
      state.application?.product ?? null,
    faceAmount:
      state.application?.faceAmount ?? null,
    readinessStatus:
      state.readiness?.status || "PENDING_APPLICATION",
    warningCount:
      state.readiness?.warnings?.length || 0,
    outstandingEvidenceCount:
      state.readiness?.outstandingEvidence?.length || 0,
    lastUpdated:
      state.lastUpdated
  };
}
