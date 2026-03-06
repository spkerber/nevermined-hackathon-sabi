// Set env before any test file imports the app (which loads middleware/payments).
process.env.NVM_API_KEY = process.env.NVM_API_KEY ?? 'sandbox:test'
process.env.NVM_PLAN_ID = process.env.NVM_PLAN_ID ?? 'test-plan-id'
process.env.NVM_AGENT_ID = process.env.NVM_AGENT_ID ?? 'test-agent-id'
