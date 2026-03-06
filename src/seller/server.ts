/**
 * Sabi seller agent — minimal HTTP API protected by Nevermined x402.
 * Payment validation runs at the very beginning of request handling (before any
 * processing) and can be complemented by other auth logic. Ref: Nevermined
 * 5-minute setup.
 */

import { app } from './app.js'

const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`Sabi seller agent listening on http://localhost:${port}`)
  console.log('POST /query with payment-signature header (x402 token)')
})
