/**
 * Buyer agent: order a plan (if needed), get x402 access token, call seller endpoint.
 * Use NVM_API_KEY for the buyer (subscriber). To buy from another team's agent, set
 * NVM_PLAN_ID, NVM_AGENT_ID, SELLER_URL (and optionally SELLER_ENDPOINT_PATH, default /query).
 *
 * Usage:
 *   NVM_PLAN_ID=... NVM_AGENT_ID=... SELLER_URL=... npx tsx scripts/buyer-order-and-call.ts [prompt]
 *   SELLER_ENDPOINT_PATH=/service   # if seller uses a path other than /query
 *   BUYER_SAVE_RESPONSE_TO=1        # optional: stash response under tmp/purchased/
 * Or use Doppler: doppler run -- npm run buyer:order-and-call "prompt"
 *
 * Ref: https://nevermined.ai/docs/integrate/quickstart/5-minute-setup
 */

import { Payments } from '@nevermined-io/payments'
import { writeFile, mkdir } from 'fs/promises'
import { dirname, resolve, sep } from 'path'

const PLAN_ID = process.env.NVM_PLAN_ID!
const AGENT_ID = process.env.NVM_AGENT_ID!
const SELLER_URL = (process.env.SELLER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
/** Endpoint path on seller (default /query). Use e.g. /service for agents that use a different path. */
const SELLER_ENDPOINT_PATH = process.env.SELLER_ENDPOINT_PATH ?? '/query'
const SAVE_RESPONSE_TO =
  process.env.BUYER_SAVE_RESPONSE_TO === '1' || process.env.BUYER_SAVE_RESPONSE_TO === 'yes' || process.env.BUYER_SAVE_RESPONSE_TO === 'true'
    ? `tmp/purchased/response-${Date.now()}.json`
    : process.env.BUYER_SAVE_RESPONSE_TO

/** Allowed base directory for stashing responses; avoids path traversal. */
const PURCHASED_DIR = resolve(process.cwd(), 'tmp', 'purchased')

function resolveSavePath(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const resolved = resolve(process.cwd(), trimmed)
  const allowedBase = resolve(PURCHASED_DIR)
  if (resolved !== allowedBase && !resolved.startsWith(allowedBase + sep)) {
    console.error('BUYER_SAVE_RESPONSE_TO must be inside tmp/purchased/ (path traversal not allowed). Got:', trimmed)
    return null
  }
  return resolved
}

async function main() {
  if (!process.env.NVM_API_KEY) {
    console.error('Set NVM_API_KEY (buyer/subscriber key from Nevermined App)')
    process.exit(1)
  }
  if (!PLAN_ID || !AGENT_ID) {
    console.error('Set NVM_PLAN_ID and NVM_AGENT_ID (from seller registration or other team)')
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
  const path = SELLER_ENDPOINT_PATH.startsWith('/') ? SELLER_ENDPOINT_PATH : `/${SELLER_ENDPOINT_PATH}`
  const endpoint = `${SELLER_URL}${path}`
  const res = await fetch(endpoint, {
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

  if (SAVE_RESPONSE_TO) {
    const outPath = resolveSavePath(SAVE_RESPONSE_TO)
    if (outPath) {
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, JSON.stringify({ ok: res.ok, status: res.status, body: data }, null, 2))
      console.log('Saved response to', outPath)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
