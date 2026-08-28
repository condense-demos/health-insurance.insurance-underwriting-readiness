import { ageCoverageRule } from "./rules/ageCoverage.js";

export function ensureEvidenceRequirements(
  state,
  timestamp = new Date().toISOString()
) {
  if (state.externalData?.PRESCRIPTION?.status !== "RECEIVED") {
    return [];
  }

  state.evidence ||= {};
  const created = [];

  for (const requirement of ageCoverageRule(state.application)) {
    if (state.evidence[requirement.type]) continue;

    const item = {
      ...requirement,
      createdAt: timestamp,
      receivedAt: null,
      details: null
    };

    state.evidence[requirement.type] = item;
    created.push(item);
  }

  return created;
}

export function receiveEvidence(
  state,
  evidenceType,
  timestamp = new Date().toISOString(),
  details = {}
) {
  const item = state.evidence?.[evidenceType];

  if (!item) {
    return { changed: false, reason: "UNKNOWN_EVIDENCE" };
  }

  if (item.status === "RECEIVED") {
    return { changed: false, reason: "ALREADY_RECEIVED" };
  }

  item.status = "RECEIVED";
  item.receivedAt = timestamp;
  item.details = details && typeof details === "object" ? details : {};

  return { changed: true, item };
}
