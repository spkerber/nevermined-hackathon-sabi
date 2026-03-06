/**
 * Express app for the Sabi seller agent (used by server.ts and tests).
 */

import express from 'express'
import { requestId, requestLogger } from './middleware/request-logger.js'
import { requirePayment, settlePayment } from './middleware/payments.js'

const app = express()
app.use(express.json())
app.use(requestId)
app.use(requestLogger)

app.post(
  '/query',
  requirePayment,
  async (req, res) => {
    try {
      const body = req.body as { prompt?: string; question?: string }
      const question = body?.question ?? body?.prompt ?? 'No question provided'

      const result = {
        message: 'Verification request accepted (seller stub). Full flow: match verifier → session → artifact.',
        question,
        status: 'connecting',
      }

      await settlePayment(req)
      res.json({
        result,
        creditsRemaining: 'Check Nevermined App or getPlanBalance',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      console.log(JSON.stringify({ requestId: req.id, error: 'Handler error', message }))
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

export { app }
