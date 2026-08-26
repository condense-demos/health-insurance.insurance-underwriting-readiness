# Kafka Node.js Event Processing Application

This application is a Node.js-based Kafka consumer designed to process incoming events, apply business rules, and produce output events. It's built to run on the Condense platform.

## Project Structure

- `package.json`: Defines project metadata and dependencies.
- `Dockerfile`: Specifies how to build the Docker image for the application.
- `.gitignore`: Specifies files and directories to be ignored by Git.
- `env_variables.json`: Defines environment variables for the Condense platform.
- `src/main.js`: The main application file, responsible for Kafka consumer setup and event processing.
- `src/rules.js`: Contains the core business logic for evaluating events and determining actions.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

Environment variables are used for configuration. These are defined in `env_variables.json` for the Condense platform. Locally, you can create a `.env` file (not tracked by Git) based on the variables defined in `env_variables.json`.

Example `.env` file:

```
KAFKA_BROKERS=localhost:9092
KAFKA_INPUT_TOPIC=input-topic
KAFKA_OUTPUT_TOPIC_CASE_UPDATES=case-updates-topic
KAFKA_OUTPUT_TOPIC_WARNINGS=warnings-topic
KAFKA_GROUP_ID=my-nodejs-consumer-group
HEALTH_CHECK_PORT=8080
```

## Running the Application

### Locally

```bash
npm start
```

### With Docker

1.  **Build the Docker image:**
    ```bash
    docker build -t kafka-nodejs-app .
    ```

2.  **Run the Docker container:**
    ```bash
    docker run -p 8080:8080 \ 
               -e KAFKA_BROKERS="your_kafka_brokers" \ 
               -e KAFKA_INPUT_TOPIC="your_input_topic" \ 
               -e KAFKA_OUTPUT_TOPIC_CASE_UPDATES="your_case_updates_topic" \ 
               -e KAFKA_OUTPUT_TOPIC_WARNINGS="your_warnings_topic" \ 
               -e KAFKA_GROUP_ID="your_group_id" \ 
               -e HEALTH_CHECK_PORT=8080 \ 
               kafka-nodejs-app
    ```

## Health Check

The application exposes a simple health check endpoint at `/health` on the configured `HEALTH_CHECK_PORT`.

To check the health:

```bash
curl http://localhost:8080/health
```

## Testing

To run tests:

```bash
npm test
```
