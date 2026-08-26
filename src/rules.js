/**
 * Represents the current status of a case.
 * @typedef {'OPEN' | 'CLOSED' | 'PENDING' | 'WARNING'} CaseStatus
 */

/**
 * Represents a processed case event.
 * @typedef {object} CaseProcessedEvent
 * @property {string} caseId - The unique identifier for the case.
 * @property {number} timestamp - The timestamp when the case was processed.
 * @property {string} status - The new status of the case.
 */

/**
 * Represents a return prescription data event.
 * @typedef {object} ReturnPrescriptionDataEvent
 * @property {string} caseId - The unique identifier for the case.
 * @property {number} timestamp - The timestamp when the prescription data was returned.
 * @property {string} prescriptionId - The unique identifier for the prescription.
 * @property {number} returnCount - The number of times this prescription has been returned.
 */

/**
 * Manages the state of cases and applies rules based on incoming events.
 */
class RuleEngine {
  constructor() {
    /**
     * Stores the current status of each case.
     * @type {Map<string, CaseStatus>}
     */
    this.caseStatuses = new Map();
  }

  /**
   * Processes an incoming event and applies relevant rules.
   * @param {object} event - The event to process.
   * @param {string} event.eventType - The type of the event (e.g., 'CASE_PROCESSED', 'RETURN_PRESCRIPTION_DATA').
   * @param {object} event.data - The data associated with the event.
   * @returns {{caseUpdate?: object, warning?: object}} - An object containing potential case update and warning events.
   */
  processEvent(event) {
    const { eventType, data } = event;
    let caseUpdate = null;
    let warning = null;

    switch (eventType) {
      case 'CASE_PROCESSED':
        caseUpdate = this.handleCaseProcessed(data);
        break;
      case 'RETURN_PRESCRIPTION_DATA':
        warning = this.handleReturnPrescriptionData(data);
        break;
      default:
        console.log(`Unknown event type: ${eventType}`);
    }
    return { caseUpdate, warning };
  }

  /**
   * Handles a CASE_PROCESSED event.
   * @param {CaseProcessedEvent} data - The data from the CASE_PROCESSED event.
   * @returns {object} - The case update event to be produced.
   */
  handleCaseProcessed(data) {
    const { caseId, status } = data;
    this.caseStatuses.set(caseId, status);
    console.log(`Case ${caseId} status updated to ${status}`);
    return { caseId, newStatus: status, timestamp: Date.now() };
  }

  /**
   * Handles a RETURN_PRESCRIPTION_DATA event.
   * @param {ReturnPrescriptionDataEvent} data - The data from the RETURN_PRESCRIPTION_DATA event.
   * @returns {object | null} - A warning event if the return count is high, otherwise null.
   */
  handleReturnPrescriptionData(data) {
    const { caseId, prescriptionId, returnCount } = data;

    if (returnCount > 2) {
      const warningMessage = `Warning: Prescription ${prescriptionId} for Case ${caseId} has been returned ${returnCount} times.`;
      console.warn(warningMessage);
      return { caseId, prescriptionId, returnCount, warningMessage, timestamp: Date.now() };
    }
    return null;
  }

  /**
   * Retrieves the current status of a case.
   * @param {string} caseId - The unique identifier for the case.
   * @returns {CaseStatus | undefined} - The status of the case, or undefined if not found.
   */
  getCaseStatus(caseId) {
    return this.caseStatuses.get(caseId);
  }
}

module.exports = { RuleEngine };
