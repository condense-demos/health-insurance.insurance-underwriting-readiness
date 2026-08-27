import {
  Kafka,
  logLevel
} from "kafkajs";

export function createKafkaClient(kafkaConfig) {
  const protocol =
    String(kafkaConfig.securityProtocol || "")
      .toUpperCase();

  const ssl =
    ![
      "PLAINTEXT",
      "SASL_PLAINTEXT"
    ].includes(protocol);

  const sasl =
    kafkaConfig.username
      ? {
          mechanism:
            kafkaConfig.saslMechanism,
          username:
            kafkaConfig.username,
          password:
            kafkaConfig.password
        }
      : undefined;

  return new Kafka({
    clientId:
      "insurance-underwriting-readiness",
    brokers:
      kafkaConfig.brokers,
    ssl,
    sasl,
    logLevel:
      logLevel.NOTHING
  });
}
