# Agent permissions (x402)

For AI agents and buyers calling the Sabi API with Nevermined payment, add these plans to your **Nevermined App → API Configuration → Protected API Endpoints** so the backend accepts x402 tokens for these plans.

## Accepted plans

| Plan | Currency | Plan ID (DID) | Network |
|------|----------|---------------|---------|
| **test4test USDC** | USDC | `15862071005348587127783678656838286399971918534471913019449683689764138649556` | Base Sepolia (eip155:84532) |
| **test4test USD** | USD (fiat) | `39744595462135391286954931386343268405511793046947996933639278887278714014891` | Base Sepolia (eip155:84532) |

Use `did:nv:` prefix when needed: `did:nv:15862071005348587127783678656838286399971918534471913019449683689764138649556`.

## For agents / buyers

1. **Order a plan** in [Nevermined App](https://nevermined.app) (test4test USDC or test4test USD).
2. **Get an x402 token** using your `NVM_API_KEY` and the plan ID above.
3. **Call Sabi** with `payment-signature: <x402-token>` header on `POST /api/verifications` (and other paid endpoints).

## Nevermined App configuration

In your agent’s **API Configuration** → **Protected API Endpoints**, ensure these plans are listed as accepted for:

- `POST https://sabi-backend.ben-imadali.workers.dev/api/verifications`
- `GET https://sabi-backend.ben-imadali.workers.dev/api/verifications/:id/artifact`

See [doppler-and-env.md](doppler-and-env.md#nevermined-app--api-configuration) for base URL setup.
