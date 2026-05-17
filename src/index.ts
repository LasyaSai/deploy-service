import 'dotenv/config'
import { app } from './app'
import { logger } from './logger'

const PORT = parseInt(process.env.PORT || '3000', 10)

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('server.started', { port: PORT, env: process.env.NODE_ENV || 'development' })
})

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info('server.shutdown', { signal })
  server.close(() => {
    logger.info('server.closed')
    process.exit(0)
  })
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason })
  process.exit(1)
})
