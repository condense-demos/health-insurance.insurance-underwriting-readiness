function isNonSmoker(value) {
  if (value === false) return true;

  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return [
    "N",
    "NO",
    "NON_SMOKER",
    "NON-SMOKER"
  ].includes(normalized);
}

export function validateExternal(application, externalData) {
  const validations = [];
  const prescription = externalData?.PRESCRIPTION;

  if (
    prescription?.status === "RECEIVED" &&
    prescription.attributes?.nicotineIndicator === true &&
    isNonSmoker(application?.tobacco)
  ) {
    validations.push({
      ruleId: "EXTERNAL_TOBACCO_001",
      result: "WARNING",
      severity: "WARNING",
      reason:
        "Application indicates non-smoker but prescription data contains a nicotine-related indicator",
      recommendedAction: "UNDERWRITER_REVIEW"
    });
  }

  return validations;
}
