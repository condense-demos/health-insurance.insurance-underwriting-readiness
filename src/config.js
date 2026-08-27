function csv(value = "") {
  return value.split(",").map(v => v.trim()).filter(Boolean);
}

export const config = {
  port: Number(process.env.portNumber || 8080),
  corsOrigin: process.env.CORS_ORIGIN || "*",

  demoNicotineIndicator:
    String(process.env.DEMO_NICOTINE_INDICATOR || "true").toLowerCase() === "true",

  kafka: {
    brokers: csv(process.env.KAFKA_BROKERS || "localhost:9092"),
    username: process.env.KAFKA_USERNAME || "",
    password: process.env.KAFKA_PASSWORD || "",
    securityProtocol: process.env.KAFKA_SECURITY_PROTOCOL || "PLAINTEXT",
    saslMechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
    consumerGroup:
      process.env.CONSUMER_GROUP || "insurance-underwriting-readiness-v1"
  },

  topics: {
    caseProcessed:
      process.env.CASE_PROCESSED_TOPIC || "insurance.case.processed",
    externalCommands:
      process.env.EXTERNAL_COMMANDS_TOPIC || "insurance.demo.external.commands",
    externalResponses:
      process.env.EXTERNAL_RESPONSES_TOPIC || "insurance.external.responses",
    evidenceEvents:
      process.env.EVIDENCE_EVENTS_TOPIC || "insurance.evidence.events",

    externalRequests:
      process.env.EXTERNAL_REQUESTS_TOPIC || "insurance.external.requests",
    caseReadiness:
      process.env.CASE_READINESS_TOPIC || "insurance.case.readiness",
    timeline:
      process.env.TIMELINE_TOPIC || "insurance.timeline"
  }
};
