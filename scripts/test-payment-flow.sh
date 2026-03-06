#!/usr/bin/env bash
# Steps 5–8: Test without payment (402), then buyer order + token + call seller.
# Prereq: Seller running (npm run seller) with NVM_* and .env or Doppler.
# Env for buyer: NVM_API_KEY (subscriber), NVM_PLAN_ID, NVM_AGENT_ID, SELLER_URL (default http://localhost:3000)

set -e
SELLER_URL="${SELLER_URL:-http://localhost:3000}"
BASE="${SELLER_URL%/}"

echo "=== Step 5: Request without payment (expect 402) ==="
curl -s -X POST "$BASE/query" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}' \
  -w "\nHTTP status: %{http_code}\n" || true
echo ""

echo "=== Steps 6–8: Order plan, get token, call seller ==="
npm run buyer:order-and-call -- "Hello"
