const EXPECTED_HEALTH_FIELDS = [
  "heartCondition",
  "diabetes",
  "hospitalization",
  "prescriptionMedication",
  "nicotineUse"
];

export function deriveProcessing(application = {}, validation = {}) {
  const answers = application.healthAnswers;

  const healthInformationAvailable =
    answers &&
    typeof answers === "object" &&
    EXPECTED_HEALTH_FIELDS.every(field =>
      Object.prototype.hasOwnProperty.call(answers, field)
    );

  const consentAvailable =
    application.consentMetadata?.accepted === true;

  const blockers = Array.isArray(validation.blockers)
    ? validation.blockers
    : [];

  const hasBlockingValidation = blockers.length > 0;

  return {
    healthInformationAvailable: Boolean(healthInformationAvailable),
    consentAvailable,
    hasBlockingValidation,
    eligibleForExternalProcessing:
      Boolean(healthInformationAvailable) &&
      consentAvailable &&
      !hasBlockingValidation
  };
}
