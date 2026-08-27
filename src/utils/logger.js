function log(level, context, message) {
  console.log(JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    service: "insurance-underwriting-readiness",
    ...context,
    message
  }));
}

export const logger = {
  info: (context = {}, message = "") => log("INFO", context, message),
  warn: (context = {}, message = "") => log("WARN", context, message),
  error: (context = {}, message = "") => log("ERROR", context, message)
};
