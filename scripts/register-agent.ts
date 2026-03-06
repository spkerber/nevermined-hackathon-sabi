/**
 * Register the Sabi seller agent and a payment plan in Nevermined (sandbox).
 * Run once to get NVM_AGENT_ID and NVM_PLAN_ID; then set them in .env or Doppler.
 *
 * Prerequisites:
 * - NVM_API_KEY (sandbox:...)
 * - BUILDER_ADDRESS (your wallet for receiving payments)
 *
 * Ref: https://nevermined.ai/docs/integrate/quickstart/5-minute-setup
 */

import { Payments } from '@nevermined-io/payments'

const USDC_ADDRESS =
  process.env.NVM_USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

async function main() {
  const apiKey = process.env.NVM_API_KEY
  const builderAddress = process.env.BUILDER_ADDRESS
  const environment = (process.env.NVM_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live'

  if (!apiKey) {
    console.error('Missing NVM_API_KEY. Set it in .env or Doppler.')
    process.exit(1)
  }
  if (!builderAddress) {
    console.error('Missing BUILDER_ADDRESS (wallet address that receives plan payments).')
    console.error('  • Nevermined App: Sign in → Settings → Payment Settings — use the payout address shown or set there.')
    console.error('  • Or use any EVM wallet address (e.g. MetaMask on Base Sepolia for sandbox). Add it to .env or Doppler as BUILDER_ADDRESS=0x...')
    process.exit(1)
  }

  const payments = Payments.getInstance({
    nvmApiKey: apiKey,
    environment,
  })

  const { agentId, planId } = await payments.agents.registerAgentAndPlan(
    {
      name: 'Sabi Visual Verification',
      description:
        'On-demand, geolocated verification with photo evidence and human-attested answer. Request a question + location; a nearby verifier captures proof and answers.',
      tags: ['verification', 'visual', 'payments', 'sabi'],
      dateCreated: new Date(),
    },
    {
      endpoints: [{ POST: process.env.APP_URL ? `${process.env.APP_URL}/query` : 'https://your-sabi-api.com/query' }],
      agentDefinitionUrl: process.env.APP_URL ? `${process.env.APP_URL}/` : 'https://your-sabi-api.com/',
    },
    {
      name: 'Starter Plan',
      description: '5 USDC per verification (1 credit per request)',
      dateCreated: new Date(),
    },
    payments.plans.getERC20PriceConfig(
      5_000_000n, // 5 USDC (6 decimals)
      USDC_ADDRESS.startsWith('0x') ? (USDC_ADDRESS as `0x${string}`) : (`0x${USDC_ADDRESS}` as `0x${string}`),
      builderAddress as `0x${string}`,
    ),
    payments.plans.getFixedCreditsConfig(100n, 1n),
  )

  console.log('Registered!')
  console.log(`Agent ID: ${agentId}`)
  console.log(`Plan ID:  ${planId}`)
  console.log('\nAdd to .env or Doppler:')
  console.log(`NVM_AGENT_ID=${agentId}`)
  console.log(`NVM_PLAN_ID=${planId}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
