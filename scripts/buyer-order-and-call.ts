/**
 * Buyer agent: order a plan (if needed), get x402 access token, call seller /query.
 * Use NVM_API_KEY for the buyer (subscriber); seller runs with its own key.
 *
 * Usage:
 *   PLAN_ID=did:nv:... AGENT_ID=did:nv:... SELLER_URL=http://localhost:3000 npx tsx scripts/buyer-order-and-call.ts
 * Or use Doppler: doppler run -- npx tsx scripts/buyer-order-and-call.ts
 *
 * Ref: https://nevermined.ai/docs/integrate/quickstart/5-minute-setup
 */

import { Payments } from '@nevermined-io/payments'

const PLAN_ID = process.env.NVM_PLAN_ID!
const AGENT_ID = process.env.NVM_AGENT_ID!
const SELLER_URL = (process.env.SELLER_URL ?? 'http://localhost:3000').replace(/\/$/, '')

async function main() {
  if (!process.env.NVM_API_KEY) {
    console.error('Set NVM_API_KEY (buyer/subscriber key from Nevermined App)')
    process.exit(1)
  }
  if (!PLAN_ID || !AGENT_ID) {
    console.error('Set NVM_PLAN_ID and NVM_AGENT_ID (from seller registration)')
    process.exit(1)
  }

  const payments = Payments.getInstance({
    nvmApiKey: process.env.NVM_API_KEY,
    environment: (process.env.NVM_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live',
  })

  // Order the plan (idempotent if already ordered)
  await payments.plans.orderPlan(PLAN_ID)
  const balance = await payments.plans.getPlanBalance(PLAN_ID)
  console.log('Plan balance:', balance)

  const { accessToken } = await payments.x402.getX402AccessToken(PLAN_ID, AGENT_ID)

  const question = process.argv[2] ?? 'Are the vending machines working in the AWS Loft?'
  const res = await fetch(`${SELLER_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'payment-signature': accessToken,
    },
    body: JSON.stringify({ question }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Seller responded:', res.status, data)
    process.exit(1)
  }
  console.log('Seller response:', data)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
