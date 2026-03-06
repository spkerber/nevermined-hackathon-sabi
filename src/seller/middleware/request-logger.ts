/**
 * Structured request logging: requestId, method, path, statusCode, durationMs.
 * Does not log headers, tokens, or body (no payment-signature or PII).
 */

import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

declare global {
  namespace Express {
    interface Request {
      id?: string
      startTime?: number
    }
  }
}

export function requestId(req: Request, _res: Response, next: NextFunction): void {
  req.id = randomUUID()
  req.startTime = Date.now()
  next()
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const durationMs = req.startTime != null ? Date.now() - req.startTime : undefined
    const log = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      ...(durationMs != null && { durationMs }),
    }
    console.log(JSON.stringify(log))
  })
  next()
}
