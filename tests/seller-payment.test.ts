/**
 * Integration test: POST /query without payment-signature returns 402 and a plans array.
 * Mocks @nevermined-io/payments so the app loads without real credentials.
 */

import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

vi.mock('@nevermined-io/payments', () => ({
  Payments: {
    getInstance: () => ({
      facilitator: {
        verifyPermissions: vi.fn().mockResolvedValue({ isValid: true }),
        settlePermissions: vi.fn().mockResolvedValue(undefined),
      },
    }),
  },
  buildPaymentRequired: (planId: string, opts: { agentId?: string }) => ({
    planId,
    agentId: opts?.agentId ?? process.env.NVM_AGENT_ID,
  }),
}))

const { app } = await import('../src/seller/app.js')

describe('POST /query', () => {
  it('returns 402 and plans array when payment-signature is missing', async () => {
    const res = await request(app)
      .post('/query')
      .set('Content-Type', 'application/json')
      .send({ prompt: 'Hello' })

    expect(res.status).toBe(402)
    expect(res.body).toHaveProperty('error', 'Payment Required')
    expect(Array.isArray(res.body.plans)).toBe(true)
    expect(res.body.plans.length).toBeGreaterThan(0)
    expect(res.body.plans[0]).toHaveProperty('planId')
    expect(res.body.plans[0]).toHaveProperty('agentId')
  })
})
