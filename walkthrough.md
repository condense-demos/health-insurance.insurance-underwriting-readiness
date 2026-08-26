# Project Walkthrough: Case Processing Integration Test

This document outlines the implementation details for the case processing integration test, which simulates a complex event-driven flow to determine the readiness status of a case.

## 1. Project Structure

The project is organized into the following key directories and files:

```
/home/condense/workspace/
├── src/
│   ├── main.py
│   └── rules.py
├── tests/
│   └── integration_test.py
├── Dockerfile
├── requirements.txt
├── README.md
└── env_variables.json
```

## 2. Core Logic (`src/rules.py`)

This file encapsulates the business rules and state management for a `Case`.

*   **`CaseStatus` Enum**: Defines the possible readiness states for a case: `PENDING_EXTERNAL_DATA`, `PENDING_EVIDENCE`, `READY_WITH_WARNINGS`.
*   **`WarningCode` Enum**: Defines specific warning types, such as `FINANCIAL_001` and `EXTERNAL_TOBACCO_001`.
*   **`Case` Class**: Represents the state of a single case, including its `case_id`, `status`, `warnings`, and a `data` dictionary to store all relevant attributes. It includes methods to `update_data` and `evaluate_status`.
*   **`evaluate_status` Method**: This is the heart of the business logic. It applies rules based on the `Case`'s data to determine its current `status` and `warnings`.
    *   **CASE_PROCESSED**: Checks for `FINANCIAL_001 WARNING` in validation. If present, adds `FINANCIAL_001` to warnings.
    *   **RETURN_PRESCRIPTION_DATA**: If `nicotineIndicator` is true, adds `EXTERNAL_TOBACCO_001` warning and sets `MEDICAL_EXAM_REQUIRED` and `APS_REQUIRED` flags to true. The status transitions to `PENDING_EVIDENCE`.
    *   **MEDICAL_EXAM / APS Received**: Updates the `MEDICAL_EXAM_RECEIVED` and `APS_RECEIVED` flags. The status remains `PENDING_EVIDENCE` until both required items are received. Once both are received and if there are warnings, the status becomes `READY_WITH_WARNINGS`.
*   **`process_case_event` Function**: A central dispatcher that takes a `Case` object, an `event_type`, and `event_data` to apply updates and re-evaluate the case status.

## 3. Application Entry Point (`src/main.py`)

This file demonstrates how the core logic might be integrated into a streaming application.

*   **Kafka Configuration**: Environment variables (`KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_INPUT_TOPIC`, `KAFKA_OUTPUT_TOPIC`, `KAFKA_CONSUMER_GROUP_ID`) are used for Kafka client setup, following best practices for Condense platform deployments.
*   **`case_store`**: An in-memory dictionary is used to simulate a persistent store for `Case` objects. In a production environment, this would be replaced with a database or a more robust state store.
*   **`process_message` Function**: This function acts as the main message handler. It deserializes incoming Kafka messages, retrieves or initializes a `Case` object, calls `process_case_event` from `src/rules.py`, and returns the updated case state.
*   **`start_kafka_consumer` Function**: Sets up a `KafkaConsumer` to listen to the input topic and a `KafkaProducer` to send results to the output topic. It continuously polls for messages and processes them.
*   **Main Execution Block**: The `if __name__ == "__main__"` block provides a starting point for the application, although in a Condense deployment, the platform manages the lifecycle.

## 4. Integration Test (`tests/integration_test.py`)

This file contains a `pytest` integration test that verifies the end-to-end flow described in the problem statement.

*   **`clear_case_store` Fixture**: Ensures that the `case_store` is cleared before each test run, providing a clean slate for testing.
*   **`test_integration_flow` Function**: This comprehensive test function simulates the sequence of events:
    *   **A. `CASE_PROCESSED`**: Verifies initial state (`PENDING_EXTERNAL_DATA`) and `FINANCIAL_001` warning.
    *   **B. `RETURN_PRESCRIPTION_DATA`**: Checks for `PENDING_EVIDENCE` status, `EXTERNAL_TOBACCO_001` warning, and the setting of `MEDICAL_EXAM_REQUIRED` and `APS_REQUIRED` flags.
    *   **C. `MEDICAL_EXAM_RECEIVED`**: Confirms the status remains `PENDING_EVIDENCE` as APS is still pending.
    *   **D. `APS_RECEIVED`**: Asserts the final state is `READY_WITH_WARNINGS` with both expected warnings present.

## 5. Environment Configuration (`env_variables.json`)

This file defines the schema for environment variables that the Condense platform will inject into the application at runtime. It includes necessary Kafka connection details and topic names.

## 6. Build and Run

*   **`Dockerfile`**: Provides instructions to build a Docker image for the application, installing dependencies from `requirements.txt` and setting up the entry point.
*   **`requirements.txt`**: Lists all Python packages required by the project. This ensures a reproducible build environment.

This setup provides a robust and testable foundation for building event-driven microservices on the Condense platform, with clear separation of concerns between business logic, application orchestration, and infrastructure details.
