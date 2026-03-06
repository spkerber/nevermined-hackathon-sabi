/**
 * Sabi seller agent — minimal HTTP API protected by Nevermined x402.
 * Payment validation runs at the very beginning of request handling (before any
 * processing) and can be complemented by other auth logic. Ref: Nevermined
 * 5-minute setup.
 */

import express from 'express'
import { requirePayment, settlePayment } from './middleware/payments.js'

const app = express()
app.use(express.json())

// Payment validation first; no request processing before it
app.post(
  '/query',
  requirePayment,
  async (req, res) => {
    try {
      const body = req.body as { prompt?: string; question?: string }
      const question = body?.question ?? body?.prompt ?? 'No question provided'

      // Placeholder: real implementation will create verification job, match verifier, etc.
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
      console.error('Handler error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`Sabi seller agent listening on http://localhost:${port}`)
  console.log('POST /query with payment-signature header (x402 token)')
})
