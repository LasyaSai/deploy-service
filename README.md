# Case B: Production API DevOps

![CI/CD](https://github.com/LasyaSai/deploy-service/actions/workflows/deploy.yml/badge.svg)

**Live demo:** <https://deploy-service-n1e5.onrender.com/health>
**Repo:** <https://github.com/LasyaSai/deploy-service>

## What this is

This is a production-ready TypeScript/Express REST API that demonstrates how a small service can be built, containerized, tested, and deployed through a complete CI/CD pipeline. It is intended for teams or reviewers who want to evaluate practical API delivery work: health checks, Docker packaging, GitHub Actions automation, Render deployment, smoke testing, and basic operational runbooks.

The API exposes a simple todos resource so the focus stays on production delivery discipline rather than complex business logic. It includes security headers, request rate limiting, structured JSON logging, automated tests with coverage, and deployment documentation.

## How to run locally

1. `git clone https://github.com/LasyaSai/deploy-service`
2. `npm install`
3. `npm run dev`
4. Open http://localhost:3000

Useful local checks:

```bash
npm run lint
npm test
npm run build
docker build -t prod-api .
docker run -p 3000:3000 prod-api
```

Core endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health check for deployment and uptime monitoring. |
| GET | `/ready` | Readiness probe for platform-level availability checks. |
| GET | `/todos` | List todos from the in-memory store. |
| POST | `/todos` | Create a todo using `{"title": "..."}`. |
| GET | `/todos/:id` | Fetch one todo by id. |
| PATCH | `/todos/:id` | Update a todo title or completion state. |
| DELETE | `/todos/:id` | Delete a todo. |

## Stack

- Node.js 20 and Express: lightweight HTTP API runtime with broad platform support.
- TypeScript: adds type safety while keeping the implementation simple and easy to review.
- Jest and Supertest: verify health, readiness, CRUD behavior, validation, and 404 handling.
- ESLint: enforces consistent TypeScript code quality in local development and CI.
- Helmet and express-rate-limit: provide baseline HTTP hardening and request throttling.
- Winston: emits structured JSON logs suitable for Render logs and future log aggregation.
- Docker multi-stage build: produces a smaller production image with only compiled output and production dependencies.
- GitHub Actions: runs linting, tests, Docker image publishing to GHCR, Render deployment, and post-deploy smoke checks.
- Render: hosts the Dockerized API with `/health` configured as the platform health check.
- UptimeRobot: monitors the deployed `/health` endpoint on a recurring interval.

## What's NOT done

The todos are stored in memory, so data is lost when the process restarts. This was intentionally de-scoped because the case is focused on production API packaging, deployment, observability, and rollback procedures rather than persistence.

Authentication and authorization are not implemented. They were left out to keep the API surface small and make the CI/CD and operations work easier to inspect.

There is no real staging environment or blue/green deployment setup. The runbook describes how those would be added, but the current implementation keeps hosting cost and platform complexity low.

The live demo, repository URL, and demo video values above are placeholders until the final hosted service, public repository, and recording are published.

## In production, I would also add

- A managed Postgres database with migrations, connection pooling, and persistent todo storage.
- Authentication, authorization, and audit logging for any user-specific or sensitive operations.
- Centralized error tracking and log search through a service such as Sentry, Datadog, Logtail, or OpenTelemetry-compatible tooling.
- A staging environment with promotion gates before production deploys.
- More complete deployment controls, including image digest pinning, automated rollback, and blue/green or canary releases.
