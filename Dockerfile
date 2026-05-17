# ─────────────────────────────────────────────────────
# Stage 1 — Dependencies
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Only copy manifests first — layer cache hit on unchanged deps
COPY package*.json ./
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────────────
# Stage 2 — Build
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────
# Stage 3 — Production image
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production deps fresh (smallest possible image)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Tini handles signal forwarding + zombie reaping
RUN apk add --no-cache tini

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    chown -R appuser:nodejs /app

USER appuser

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
