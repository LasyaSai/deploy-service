# prod-api — Zero-to-Deploy

A production-hardened Node/Express REST API with a full CI/CD pipeline: lint → test → Docker build → GHCR push → Render deploy → uptime monitoring.

[![CI/CD](https://github.com/<org>/<repo>/actions/workflows/deploy.yml/badge.svg)](https://github.com/<org>/<repo>/actions/workflows/deploy.yml)

**Live URL:** `https://your-service.onrender.com`

---

## Quick Start

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # run tests with coverage
docker build -t prod-api . && docker run -p 3000:3000 prod-api
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (used by Render + UptimeRobot) |
| GET | `/ready` | Readiness probe |
| GET | `/todos` | List all todos |
| POST | `/todos` | Create todo `{"title": "..."}` |
| GET | `/todos/:id` | Get single todo |
| PATCH | `/todos/:id` | Update todo |
| DELETE | `/todos/:id` | Delete todo |

---

## Architecture Decisions

### Why Node/Express over FastAPI?

This repo documents the containerization and CI/CD pipeline — not the business logic. Node/Express is chosen because:
- The team already knows it (zero onboarding friction)
- Cold start on Render free tier is faster than Python
- TypeScript gives the type safety of Python's type hints with the same ecosystem

### Why GHCR over Docker Hub?

GHCR is free for public repos and uses `GITHUB_TOKEN` — no separate credential management. The token is scoped to the repo and auto-rotated.

### Why Render over Fly.io?

Render's free tier keeps the service dormant after inactivity (which is acceptable for internal tools). Fly.io's free tier has tighter memory limits that cause OOM on Node cold starts. Both are upgraded identically for real traffic.

### Multi-stage Dockerfile

Three stages: `deps` (npm ci) → `builder` (tsc compile) → `runner` (prod deps + compiled output only).
Result: ~160MB final image vs ~800MB naive single-stage.

---

## CI/CD Pipeline

```
push to main
    ↓
lint (ESLint, zero warnings)
    ↓
test (Jest, coverage ≥ 70%)
    ↓
docker build (multi-stage, Buildx cache)
    ↓
push to ghcr.io (sha tag + latest)
    ↓
trigger Render deploy hook
    ↓
smoke test GET /health → 200
```

See `.github/workflows/deploy.yml` for the full pipeline.
See `RUNBOOK.md` for operational procedures.

---

## Setup

### Required GitHub Secrets

| Secret | Value |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | From Render dashboard → prod-api → Settings → Deploy Hook |

### Required GitHub Variables

| Variable | Value |
|---|---|
| `RENDER_SERVICE_URL` | Your live Render URL |

### UptimeRobot

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Monitor: `GET https://your-service.onrender.com/health` every 5 minutes
