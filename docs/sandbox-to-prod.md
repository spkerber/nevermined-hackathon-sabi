# Sandbox to Production

Path from basic sandbox testing to a live in-production transaction (without VisionClaw integration).

## 1. Sandbox (5-minute flow)

1. **Get API key (sandbox)**  
   [Nevermined App](https://nevermined.app) → API Keys → create key → use `sandbox:...`.

2. **Set env** (`.env` or Doppler):
   - `NVM_API_KEY=sandbox:...`
   - `NVM_ENVIRONMENT=sandbox`
   - `BUILDER_ADDRESS=<your Base Sepolia wallet>`

3. **Register seller agent and plan**  
   ```bash
   npm run register-agent
   ```  
   Add printed `NVM_AGENT_ID` and `NVM_PLAN_ID` to `.env` or Doppler.

4. **Run seller**  
   ```bash
   npm run seller
   ```

5. **Test without payment** (expect 402):
   ```bash
   curl -X POST http://localhost:3000/query \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello"}'
   ```
   Expected response:
   ```json
   {
     "error": "Payment Required",
     "message": "Purchase a plan to access this API. Send payment-signature header with x402 access token.",
     "plans": [{"planId": "did:nv:...", "agentId": "did:nv:..."}]
   }
   ```

6. **Purchase a plan and get an access token** (as subscriber). Set `NVM_API_KEY` to your subscriber key, and `NVM_PLAN_ID` / `NVM_AGENT_ID` from step 3. Then either run the buyer script (step 8) or use the curl in step 7 with the token. In code:
   ```ts
   const payments = Payments.getInstance({ nvmApiKey: subscriberKey, environment: 'sandbox' })
   await payments.plans.orderPlan(PLAN_ID)
   const balance = await payments.plans.getPlanBalance(PLAN_ID)
   const { accessToken } = await payments.x402.getX402AccessToken(PLAN_ID, AGENT_ID)
   // Use header: payment-signature: <accessToken>
   ```

7. **Query with payment** (replace `${accessToken}` with the token from step 6):
   ```bash
   curl -X POST http://localhost:3000/query \
     -H "Content-Type: application/json" \
     -H "payment-signature: ${accessToken}" \
     -d '{"prompt": "Hello"}'
   ```
   Expected response:
   ```json
   {
     "result": { "message": "...", "question": "Hello", "status": "connecting" },
     "creditsRemaining": "Check Nevermined App or getPlanBalance"
   }
   ```

8. **Or use the buyer script** (order + get token + call seller in one go):  
   Use the same or a second Nevermined API key (subscriber). Set `NVM_PLAN_ID`, `NVM_AGENT_ID`, `SELLER_URL=http://localhost:3000`:
   ```bash
   npm run buyer:order-and-call "Your verification question"
   ```

9. **Optional:** Order the plan in Nevermined App ([permissions](https://nevermined.app/permissions/global-permissions)) with test USDC on Base Sepolia, then use the buyer script with the same plan/agent IDs.

## 2. Production checklist

- **Nevermined**
  - Create a **production** API key in Nevermined App.
  - Register the production agent/plan (or reuse and point endpoint to prod URL). Use production environment and mainnet USDC if required.
  - Set `NVM_ENVIRONMENT=live` and production `NVM_API_KEY`, `NVM_AGENT_ID`, `NVM_PLAN_ID` in Doppler (prod config).

- **Doppler**
  - Use a separate Doppler config (e.g. `production`) for prod secrets.
  - Never log or expose `NVM_API_KEY`, `BUILDER_ADDRESS`, or any keys.

- **Seller API**
  - Deploy seller to your host (e.g. AWS, Cloudflare Workers). Set `APP_URL` to the public base URL.
  - If you re-register the agent, set `endpoints` to `APP_URL/query` so the catalog shows the correct URL.

- **Transaction**
  - Buyer uses production plan/agent and prod seller URL.
  - Ensure buyer has ordered the plan and has credits; then call `POST <APP_URL>/query` with `payment-signature: <x402 token>`.

## 3. What’s out of scope (this branch)

- **VisionClaw / Ray-Ban Meta:** No integration with Ben’s VisionClaw or verifier flow; this is payment-only (seller + buyer agents, sandbox → prod).
- **Full Sabi backend:** No Durable Objects, matching, or artifact delivery yet; seller is a stub that validates payment and settles one credit per request.

## References

- [5-Minute Setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup)
- [Nevermined App – Permissions](https://nevermined.app/permissions/global-permissions)
- [Doppler – nevermined-hackathon-sabi](https://dashboard.doppler.com/workplace/37ee0f06177aa6997f55/projects/nevermined-hackathon-sabi)

**What’s next (Nevermined docs):** [Express integration](https://nevermined.ai/docs/integrate/add-to-your-agent/express), [FastAPI integration](https://nevermined.ai/docs/integrate/add-to-your-agent/fastapi), [Payment patterns](https://nevermined.ai/docs/integrate/patterns/validate-requests), [x402 protocol](https://nevermined.ai/docs/development-guide/nevermined-x402).
