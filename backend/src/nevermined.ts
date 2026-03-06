import {
  Payments,
  buildPaymentRequired,
  type X402PaymentRequired,
  type VerifyPermissionsResult,
  type SettlePermissionsResult,
  type EnvironmentName,
} from "@nevermined-io/payments";
import type { Env } from "./types";

let paymentsInstance: Payments | null = null;

export function getPayments(env: Env): Payments {
  if (!paymentsInstance) {
    paymentsInstance = Payments.getInstance({
      nvmApiKey: env.NVM_API_KEY,
      environment: env.NVM_ENVIRONMENT as EnvironmentName,
    });
  }
  return paymentsInstance;
}

export function getPaymentRequired(env: Env, endpoint: string, httpVerb: string): X402PaymentRequired {
  return buildPaymentRequired(env.NVM_PLAN_ID, {
    endpoint,
    agentId: env.NVM_AGENT_ID,
    httpVerb,
  });
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
): Promise<VerifyPermissionsResult> {
  const payments = getPayments(env);
  return payments.facilitator.verifyPermissions({
    paymentRequired,
    x402AccessToken: accessToken,
    maxAmount: credits,
  });
}

export async function settlePayment(
  env: Env,
  accessToken: string,
  paymentRequired: X402PaymentRequired,
  credits: bigint = 1n,
): Promise<SettlePermissionsResult> {
  const payments = getPayments(env);
  return payments.facilitator.settlePermissions({
    paymentRequired,
    x402AccessToken: accessToken,
    maxAmount: credits,
  });
}
