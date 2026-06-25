# RUNBOOK.md — prod-api Operational Guide

---

## Service Overview

| Property | Value |
|---|---|
| Service name | `prod-api` |
| Runtime | Node 20 / Express |
| Host | Render.com (free tier) |
| Registry | `ghcr.io/<org>/prod-api` |
| Health endpoint | `GET /health` |
| Readiness endpoint | `GET /ready` |
| Uptime monitor | UptimeRobot (5-min interval) |
| Structured logs | JSON via Winston → Render log stream |

---

## Deploy a New Version

### Normal path (CI handles it)

1. Push to `main`.
2. GitHub Actions runs: **lint → test → docker build → push to GHCR → trigger Render deploy hook**.
3. Render pulls the `latest` image and performs a zero-downtime rolling replacement.
4. CI smoke-tests `GET /health` and fails the workflow if it returns non-200.

### Manual deploy (bypass CI)

```bash
# Trigger Render deploy hook directly
curl -X POST "$RENDER_DEPLOY_HOOK_URL"
```

Or via Render dashboard: **Dashboard → prod-api → Manual Deploy → Deploy latest commit**.

---

## Rollback Procedure

### Option A — Re-run a previous successful GitHub Actions run

1. Go to `https://github.com/<org>/<repo>/actions`.
2. Find the last **green** `CI/CD Pipeline` run.
3. Click **Re-run all jobs**.
4. This re-pushes that commit's image as `latest` and re-triggers Render.

### Option B — Pin a specific image tag

Every push produces a `sha-<COMMIT_SHA>` tag alongside `latest`. To roll back to a known-good SHA:

```bash
# 1. Find the image digest of the last good deployment in Render logs
# 2. Retag it as latest
docker pull ghcr.io/<org>/prod-api:sha-<GOOD_SHA>
docker tag  ghcr.io/<org>/prod-api:sha-<GOOD_SHA> ghcr.io/<org>/prod-api:latest
docker push ghcr.io/<org>/prod-api:latest

# 3. Trigger Render deploy
curl -X POST "$RENDER_DEPLOY_HOOK_URL"
```

### Option B — Git tag rollback

```bash
git tag rollback-$(date +%Y%m%d-%H%M) <GOOD_COMMIT_SHA>
git push origin <GOOD_COMMIT_SHA>:main --force-with-lease
# CI pipeline fires automatically
```

---

## Incident Playbook

### Step 1 — Confirm the outage

- Check UptimeRobot alert: note the **exact timestamp** of the first failure
- Hit `GET /health` manually from your machine:
  ```bash
  curl -s https://your-service.onrender.com/health
  ```

### Step 2 — Check Render logs

```bash
# Via Render dashboard → prod-api → Logs
# Filter by the timestamp from UptimeRobot

# Look for:
# - OOM: {"level":"error","message":"JavaScript heap out of memory"}
# - Crash loop: repeated "server.started" within seconds
```

### Step 3 — Diagnose by symptom

| Symptom | Likely cause | Action |
|---|---|---|
| Container exits with code 137 | OOM kill | Upgrade plan or reduce concurrency; rollback if new code caused regression |
| Container exits with code 1 | Uncaught exception / bad env var | Check `unhandledRejection` / `uncaughtException` log entries |
| `/health` 200 but app behaves wrong | Logic regression | Rollback to last known-good SHA |
| Render shows "Service unavailable" | Platform issue | Check [render.statuspage.io](https://render.statuspage.io) |
| Slow responses, no crash | Backpressure / rate limit | Check `express-rate-limit` rejections; scale horizontal |

### Step 4 — Remediate

- **OOM:** Rollback + set `NODE_OPTIONS=--max-old-space-size=256` in Render env vars.
- **Crash loop:** Rollback immediately, then debug in staging.
- **Platform issue:** Wait + communicate ETA to stakeholders via Slack.

### Step 5 — Post-mortem

Write a short (5-bullet) post-mortem within 24h:
- Timeline
- Root cause
- Impact
- Fix applied
- Follow-up actions

---

## Observability

### Structured Log Fields

Every log line is JSON with these fields:

```json
{
  "level": "info",
  "message": "http.request",
  "service": "prod-api",
  "version": "abc1234",
  "env": "production",
  "method": "GET",
  "path": "/todos",
  "status": 200,
  "durationMs": 12,
  "timestamp": "2025-05-14T03:12:00.000Z"
}
```

### Key log queries (Render log search)

```
# All errors
level:error

# Slow requests (>500ms)
durationMs:>500

# 5xx responses
status:>=500

# OOM signals
heap out of memory
```

### UptimeRobot Setup

1. Create free account at [uptimerobot.com](https://uptimerobot.com)
2. **New Monitor → HTTP(S)**
3. URL: `https://your-service.onrender.com/health`
4. Interval: **5 minutes**
5. Alert contacts: email + Slack webhook

---

## Secrets Management

All secrets are stored in **Render's encrypted environment variable store** — never in `.env` files committed to the repo.

| Secret | Where set |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | GitHub repo → Settings → Secrets |
| `GITHUB_TOKEN` | Auto-injected by GitHub Actions |
| Any DB credentials | Render dashboard → Environment |

**Rule:** If it's sensitive, it lives in the platform secret store. PRs that add `.env` files or hardcode credentials will be rejected at code review.

---

## Cost Estimate at 100x Traffic

Current baseline (free tier): ~100 req/day → **10,000 req/day at 100x**.

| Component | Current cost | At 100x | Optimization |
|---|---|---|---|
| Render (compute) | $0 (free) | ~$7/mo (Starter) | Already cheap; upgrade to Starter for always-on |
| GHCR storage | $0 | $0 | Images < 500MB each; prune old tags monthly |
| Logging | $0 (stdout) | $0 | Add Logtail free tier if query volume grows |

**First optimization I'd make:** Switch from in-memory todo store to Postgres (Neon or Supabase free tier). At 100x, the in-memory store becomes a liability — a pod restart wipes all data. The schema change is 30 lines of Drizzle/Prisma + a connection pool (pg-pool, max: 10 connections).

---

## Blue/Green Deploy Strategy (Stretch Goal)

Render's free tier doesn't natively support blue/green, but it can be simulated:

1. Deploy new image to a **second Render service** (`prod-api-green`).
2. Run smoke tests against the green URL.
3. Update the **Cloudflare DNS CNAME** (or load balancer rule) to point `api.campus.io` at green.
4. Keep blue alive for 10 minutes as instant fallback.
5. Tear down blue.

With Cloudflare, the DNS TTL of 60s means the switch takes under 2 minutes with zero downtime.
