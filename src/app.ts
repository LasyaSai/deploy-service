import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { logger } from './logger'
import { todoRouter } from './routes/todos'

export const app = express()

// ── Security headers ─────────────────────────────────────────
app.use(helmet())

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
})
app.use(limiter)

// ── Request logging ──────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info('http.request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  })
  next()
})

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  })
})

// ── Readiness (for k8s / Render health checks) ───────────────
app.get('/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready' })
})

// ── Routes ────────────────────────────────────────────────────
app.use('/todos', todoRouter)

// ── 404 ───────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Global error handler ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled.error', { message: err.message, stack: err.stack })
  res.status(500).json({ error: 'Internal server error' })
})
