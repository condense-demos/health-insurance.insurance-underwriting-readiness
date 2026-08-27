export function ageCoverageRule(application = {}) {
  if (
    Number(application.age) >= 50 &&
    Number(application.faceAmount) >= 1000000
  ) {
    return [
      {
        type: "MEDICAL_EXAM",
        status: "REQUIRED",
        reason:
          "Age and requested face amount meet configured evidence threshold"
      },
      {
        type: "APS",
        status: "REQUIRED",
        reason:
          "Age and requested face amount meet configured evidence threshold"
      }
    ];
  }

  return [];
}
