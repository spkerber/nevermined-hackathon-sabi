/**
 * x402 payment validation middleware for the Sabi seller agent.
 * Verifies payment-signature header, then settles (burns credits) after handler runs.
 *
 * Ref: https://nevermined.ai/docs/integrate/quickstart/5-minute-setup
 */

import type { Request, Response, NextFunction } from 'express'
import { Payments, buildPaymentRequired } from '@nevermined-io/payments'

const payments = Payments.getInstance({
  nvmApiKey: process.env.NVM_API_KEY!,
  environment: (process.env.NVM_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live',
})

const PLAN_ID = process.env.NVM_PLAN_ID!
const AGENT_ID = process.env.NVM_AGENT_ID!

const CREDITS_PER_REQUEST = 1n

export function requirePayment(req: Request, res: Response, next: NextFunction): void {
  if (!PLAN_ID || !AGENT_ID) {
    res.status(502).json({ error: 'Payment not configured (missing NVM_PLAN_ID or NVM_AGENT_ID)' })
    return
  }

  const paymentRequired = buildPaymentRequired(PLAN_ID, {
    endpoint: req.url,
    agentId: AGENT_ID,
    httpVerb: req.method,
  })

  const x402Token = req.headers['payment-signature'] as string | undefined

  if (!x402Token) {
    const paymentRequiredBase64 = Buffer.from(JSON.stringify(paymentRequired)).toString('base64')
    res
      .status(402)
      .setHeader('payment-required', paymentRequiredBase64)
      .json({
        error: 'Payment Required',
        message: 'Purchase a plan to access this API. Send payment-signature header with x402 access token.',
        plans: [{ planId: PLAN_ID, agentId: AGENT_ID }],
      })
    return
  }

  payments.facilitator
    .verifyPermissions({
      paymentRequired,
      x402AccessToken: x402Token,
      maxAmount: CREDITS_PER_REQUEST,
    })
    .then((verification) => {
      if (!verification.isValid) {
        res.status(402).json({ error: verification.invalidReason ?? 'Invalid payment' })
        return
      }
      ;(req as Request & { _x402: { paymentRequired: typeof paymentRequired; token: string } })._x402 = {
        paymentRequired,
        token: x402Token,
      }
      next()
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'unknown'
      console.log(JSON.stringify({ requestId: (req as Request & { id?: string }).id, error: 'Payment verify failed', message }))
      res.status(502).json({ error: 'Payment verification failed' })
    })
}

/**
 * Call after your handler has successfully processed the request.
 * Burns 1 credit for this request.
 */
export async function settlePayment(req: Request & { _x402?: { paymentRequired: object; token: string } }): Promise<void> {
  const x402 = req._x402
  if (!x402) return

  await payments.facilitator.settlePermissions({
    paymentRequired: x402.paymentRequired as Parameters<typeof payments.facilitator.settlePermissions>[0]['paymentRequired'],
    x402AccessToken: x402.token,
    maxAmount: CREDITS_PER_REQUEST,
  })
}
