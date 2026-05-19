# Architecture Notes

SafeOutputs AI is intentionally small, but it follows the same engineering concerns expected from a production automated output checking platform.

## Core Services

- **Review API:** FastAPI service exposing output assessment and review history endpoints.
- **Checking engine:** Deterministic checks with an adapter-shaped boundary for future AI classifiers.
- **Submission store:** In-memory for the prototype; production would use DynamoDB or PostgreSQL depending on query and audit needs.
- **Audit events:** Every assessment should produce immutable events for governance, traceability, and operational monitoring.
- **Reviewer UI:** React TypeScript application for submitting candidates and reviewing decisions.

## AWS Mapping

- **API Gateway + ECS/Fargate or Lambda:** Public API entry point and backend compute.
- **S3:** Stores submitted artefacts, preview extracts, model evidence, and reviewer decisions.
- **DynamoDB/PostgreSQL:** Stores assessment metadata and decision history.
- **EventBridge + SQS:** Decouples assessment events, notifications, audit processing, and downstream reporting.
- **IAM/KMS:** Enforces least privilege access and encryption boundaries.
- **CloudWatch/X-Ray:** Provides logs, metrics, traces, and alarms.

## Security Principles

- Default-deny export decisions when direct identifiers are detected.
- Keep a complete audit trail for every automated decision and reviewer action.
- Separate researcher-facing submission flows from reviewer and administrator permissions.
- Encrypt stored files and decision evidence.
- Prefer explainable automated checks before introducing opaque model decisions.

## AI Extension Point

The current engine is rule-based so the prototype is deterministic and testable. A production build could add an AI classifier behind the same assessment interface, combining:

- text classification for identifiers and sensitive context,
- table profiling for small cell and linkage risk,
- image/document extraction,
- reviewer feedback loops,
- model evaluation and drift monitoring.

