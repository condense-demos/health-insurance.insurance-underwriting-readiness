# insurance-underwriting-readiness

Lightweight Node.js service for the Condense life-insurance demo.

The service consumes processed application state and determines whether the case is ready to enter underwriting. It does **not** make underwriting decisions such as APPROVED or DECLINED.

## Responsibilities

- maintain current underwriting case state
- derive whether application health information and consent are actually available
- request/simulate prescription data
- compare prescription data with applicant-provided tobacco data
- determine evidence requirements
- track evidence receipt
- calculate readiness
- expose an underwriter-friendly REST projection for a future Vercel dashboard
- publish `insurance.case.readiness` on material state changes

## Compatibility with the current upstream service

The current `insurance-application-processing` output can contain:

- `healthQuestionsComplete=false` even after health answers are present
- `consentReceived=false` even after accepted consent metadata is present
- `validation.canProceedToReadiness=true` before the case is actually ready

This service therefore derives downstream eligibility from actual state:

```text
healthInformationAvailable =
  healthAnswers has all expected health fields

consentAvailable =
  consentMetadata.accepted === true

hasBlockingValidation =
  validation.blockers.length > 0

eligibleForExternalProcessing =
  healthInformationAvailable
  && consentAvailable
  && !hasBlockingValidation
```

## Kafka

Consumes:

- `insurance.case.processed`
- `insurance.external.responses`
- `insurance.evidence.events`
- `insurance.demo.external.commands`

Publishes:

- `insurance.external.requests`
- `insurance.external.responses`
- `insurance.evidence.events`
- `insurance.case.readiness`
- `insurance.timeline`

Kafka key: `applicationId`.

## Readiness statuses

- `NOT_READY`
- `PENDING_APPLICATION`
- `PENDING_EXTERNAL_DATA`
- `PENDING_EVIDENCE`
- `READY_WITH_WARNINGS`
- `READY`

## REST API

- `GET /health`
- `GET /applications`
- `GET /application/:applicationId`
- `GET /application/:applicationId/readiness`
- `GET /application/:applicationId/evidence`
- `GET /application/:applicationId/timeline`
- `POST /application/:applicationId/demo/prescription-response`
- `POST /application/:applicationId/evidence/:type/received`

The future Vercel Underwriter Dashboard can use these APIs directly.

## Golden Jane Smith flow

1. `APPLICATION_CREATED` processed case → `PENDING_APPLICATION`
2. Health answers available → `PENDING_APPLICATION`
3. Accepted consent metadata available → `PENDING_EXTERNAL_DATA`
4. Prescription response arrives → `MEDICAL_EXAM` + `APS` required → `PENDING_EVIDENCE`
5. Medical exam received → `PENDING_EVIDENCE`
6. APS received → `READY_WITH_WARNINGS`

## Run

```bash
cp .env.example .env
npm install
npm start
```

## Test

```bash
npm test
```
