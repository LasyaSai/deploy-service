# Decisions- Case B

## Assumptions I made

1. The main goal of the case is to demonstrate production API delivery, not todo-list business complexity - because the repository emphasizes Docker, CI/CD, deployment, health checks, and operational procedures.
2. Render is an acceptable hosting target - because the repo already includes `render.yaml`, Render deploy hook references, and a runbook written around Render operations.
3. GitHub Actions is the source of truth for delivery automation - because the workflow runs linting, tests, Docker image publishing, deployment, and smoke testing.
4. The API can use an in-memory store for this case - because persistence is not required to prove the deployment pipeline and operational model.
5. Public demo links may still be placeholders - because the current README uses generic hosted URL, repository, and video values rather than final project links.

## Trade-offs

| Choice | Alternative | Why I picked this |
|---|---|---|
| TypeScript and Express | FastAPI or NestJS | Express keeps the service small and familiar, while TypeScript adds compile-time checks without a heavy framework. |
| In-memory todo store | Postgres or MongoDB | The case is about deployment readiness, so avoiding a database keeps the implementation focused and fast to review. |
| Render | Fly.io, Railway, or Kubernetes | Render is simple to configure for a Dockerized web service and is already represented in the repo through `render.yaml` and deploy hooks. |
| GHCR | Docker Hub | GHCR integrates directly with GitHub Actions and avoids managing a separate registry credential for this case. |
| Multi-stage Dockerfile | Single-stage Dockerfile | Multi-stage builds keep the runtime image smaller by separating dependency install, TypeScript compilation, and production execution. |
| GitHub Actions deploy hook | Manual Render deploys | CI-driven deployment creates a repeatable path from `main` to production and allows a smoke test after deploy. |
| UptimeRobot health monitoring | Platform logs only | External monitoring catches public availability problems that may not be visible from application logs alone. |
| Winston JSON logs | Plain console logging | Structured logs are easier to search, filter, and forward to a centralized observability platform later. |

## What I de-scoped and why

- Persistent database storage - this would be the first production upgrade, but it is not necessary to demonstrate the API delivery pipeline.
- User authentication and authorization - adding identity would expand the scope beyond the deployment and operations focus of the case.
- Staging and blue/green deployment - these are valuable production controls, but they require extra infrastructure that was not needed for the core case.
- Full observability stack - logs and uptime checks are present, but tracing, metrics dashboards, and error tracking were left for a production hardening pass.
- Domain-specific business logic - the todos resource is intentionally simple so reviewers can focus on engineering practices around release, runtime, and recovery.

## What I'd do differently

- Replace the in-memory map with Postgres, migrations, and integration tests against a test database.
- Add authentication with role-based access control and clear error responses for unauthorized requests.
- Create a staging Render service and require a successful staging smoke test before production deployment.
- Add OpenAPI documentation so consumers can discover and test the API contract more easily.
- Add centralized error tracking, request metrics, and dashboards for latency, status codes, and rate-limit events.
- Pin production deployments to immutable image digests and make rollback a one-command workflow.
