function collectWarnings(state) {
  const applicationWarnings =
    Array.isArray(state.applicationValidation?.warnings)
      ? state.applicationValidation.warnings
      : [];

  const externalWarnings =
    (state.externalValidations || [])
      .filter(item => item.severity === "WARNING")
      .map(item => item.reason);

  return [...new Set([
    ...applicationWarnings,
    ...externalWarnings
  ])];
}

export function calculateReadiness(state) {
  const blockers =
    Array.isArray(state.applicationValidation?.blockers)
      ? state.applicationValidation.blockers
      : [];

  const warnings = collectWarnings(state);

  if (blockers.length > 0) {
    return {
      status: "NOT_READY",
      blockers,
      warnings,
      outstandingEvidence: []
    };
  }

  if (
    !state.processing?.healthInformationAvailable ||
    !state.processing?.consentAvailable
  ) {
    return {
      status: "PENDING_APPLICATION",
      blockers: [],
      warnings,
      outstandingEvidence: []
    };
  }

  if (state.externalData?.PRESCRIPTION?.status !== "RECEIVED") {
    return {
      status: "PENDING_EXTERNAL_DATA",
      blockers: [],
      warnings,
      outstandingEvidence: []
    };
  }

  const outstandingEvidence =
    Object.values(state.evidence || {})
      .filter(item => item.status === "REQUIRED")
      .map(item => item.type);

  if (outstandingEvidence.length > 0) {
    return {
      status: "PENDING_EVIDENCE",
      blockers: [],
      warnings,
      outstandingEvidence
    };
  }

  return {
    status:
      warnings.length > 0
        ? "READY_WITH_WARNINGS"
        : "READY",
    blockers: [],
    warnings,
    outstandingEvidence: []
  };
}
