const { RuleEngine } = require('../src/rules');

describe('RuleEngine', () => {
  let ruleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  // Test case 1: handleCaseProcessed updates case status correctly
  test('should update case status for CASE_PROCESSED event', () => {
    const event = {
      eventType: 'CASE_PROCESSED',
      data: { caseId: 'case123', timestamp: Date.now(), status: 'CLOSED' }
    };
    const { caseUpdate } = ruleEngine.processEvent(event);

    expect(ruleEngine.getCaseStatus('case123')).toBe('CLOSED');
    expect(caseUpdate).toMatchObject({
      caseId: 'case123',
      newStatus: 'CLOSED'
    });
    expect(typeof caseUpdate.timestamp).toBe('number');
  });

  // Test case 2: handleReturnPrescriptionData generates warning for high return count
  test('should generate a warning for RETURN_PRESCRIPTION_DATA with high return count', () => {
    const event = {
      eventType: 'RETURN_PRESCRIPTION_DATA',
      data: { caseId: 'case123', timestamp: Date.now(), prescriptionId: 'RX456', returnCount: 3 }
    };
    const { warning } = ruleEngine.processEvent(event);

    expect(warning).toMatchObject({
      caseId: 'case123',
      prescriptionId: 'RX456',
      returnCount: 3,
      warningMessage: expect.stringContaining('returned 3 times')
    });
    expect(typeof warning.timestamp).toBe('number');
  });

  // Test case 3: handleReturnPrescriptionData does not generate warning for low return count
  test('should not generate a warning for RETURN_PRESCRIPTION_DATA with low return count', () => {
    const event = {
      eventType: 'RETURN_PRESCRIPTION_DATA',
      data: { caseId: 'case123', timestamp: Date.now(), prescriptionId: 'RX456', returnCount: 1 }
    };
    const { warning } = ruleEngine.processEvent(event);

    expect(warning).toBeNull();
  });

  // Test case 4: getCaseStatus returns correct status
  test('should return the correct case status', () => {
    ruleEngine.caseStatuses.set('case789', 'PENDING');
    expect(ruleEngine.getCaseStatus('case789')).toBe('PENDING');
  });

  // Test case 5: getCaseStatus returns undefined for non-existent case
  test('should return undefined for a non-existent case', () => {
    expect(ruleEngine.getCaseStatus('nonExistentCase')).toBeUndefined();
  });

  // Test case 6: processing an unknown event type
  test('should log a message for an unknown event type and return null for updates/warnings', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const event = {
      eventType: 'UNKNOWN_EVENT',
      data: { id: 'someId' }
    };
    const { caseUpdate, warning } = ruleEngine.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('Unknown event type: UNKNOWN_EVENT');
    expect(caseUpdate).toBeNull();
    expect(warning).toBeNull();
    consoleSpy.mockRestore();
  });

  // Test case 7: multiple events update the same case
  test('should correctly update status for multiple events on the same case', () => {
    ruleEngine.processEvent({
      eventType: 'CASE_PROCESSED',
      data: { caseId: 'case001', timestamp: Date.now(), status: 'OPEN' }
    });
    expect(ruleEngine.getCaseStatus('case001')).toBe('OPEN');

    ruleEngine.processEvent({
      eventType: 'CASE_PROCESSED',
      data: { caseId: 'case001', timestamp: Date.now(), status: 'PENDING' }
    });
    expect(ruleEngine.getCaseStatus('case001')).toBe('PENDING');
  });

});
