import type { Env } from "./types";

const NVM_BACKENDS: Record<string, string> = {
  sandbox: "https://api.sandbox.nevermined.app",
  live: "https://api.nevermined.app",
};

export interface X402PaymentRequired {
  x402Version: number;
  resource: { url: string; description?: string };
  accepts: {
    scheme: string;
    network: string;
    planId: string;
    extra?: { agentId?: string; httpVerb?: string };
  }[];
  extensions: Record<string, unknown>;
}

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
  agentRequestId?: string;
}

export interface SettleResult {
  success: boolean;
  errorReason?: string;
  transaction: string;
  network: string;
  creditsRedeemed?: string;
  remainingBalance?: string;
}

function getBackend(env: Env): string {
  return NVM_BACKENDS[env.NVM_ENVIRONMENT] ?? NVM_BACKENDS.sandbox;
}

export function buildPaymentRequired(
  env: Env,
  endpoint: string,
  httpVerb: string,
): X402PaymentRequired {
  return {
    x402Version: 2,
    resource: { url: endpoint },
    accepts: [
      {
        scheme: "nvm:erc4337",
        network: "eip155:84532",
        planId: env.NVM_PLAN_ID,
        extra: {
          agentId: env.NVM_AGENT_ID,
          httpVerb,
        },
      },
    ],
    extensions: {},
  };
}

export function encode402Header(paymentRequired: X402PaymentRequired): string {
  return btoa(JSON.stringify(paymentRequired));
}

export function build402Response(
  paymentRequired: X402PaymentRequired,
  cors: HeadersInit,
): Response {
  return new Response(JSON.stringify({ error: "Payment Required" }), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "payment-required": encode402Header(paymentRequired),
      ...cors,
    },
  });
}

export async function verifyPayment(
  env: Env,
  accessToken: string,
  paymentRequired: X402PaymentRequired,
  credits: bigint = 1n,
): Promise<VerifyResult> {
  const backend = getBackend(env);
  const res = await fetch(`${backend}/api/v1/x402/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentRequired,
      x402AccessToken: accessToken,
      maxAmount: credits.toString(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? `Verify failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<VerifyResult>;
}

export async function getX402AccessToken(
  env: Env,
  buyerAgentId: string,
): Promise<string> {
  const backend = getBackend(env);
  const res = await fetch(`${backend}/api/v1/x402/permissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.NVM_API_KEY}`,
    },
    body: JSON.stringify({
      accepted: {
        scheme: "nvm:erc4337",
        network: "eip155:84532",
        planId: env.NVM_PLAN_ID,
        extra: { agentId: buyerAgentId },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? `Token request failed: HTTP ${res.status}`);
  }

  const data = await res.json() as { accessToken: string };
  return data.accessToken;
}

export async function settlePayment(
  env: Env,
  accessToken: string,
  paymentRequired: X402PaymentRequired,
  credits: bigint = 1n,
): Promise<SettleResult> {
  const backend = getBackend(env);
  const res = await fetch(`${backend}/api/v1/x402/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentRequired,
      x402AccessToken: accessToken,
      maxAmount: credits.toString(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.message ?? `Settle failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<SettleResult>;
}
