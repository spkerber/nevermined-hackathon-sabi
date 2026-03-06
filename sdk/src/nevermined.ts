import { PaymentFailedError } from "./errors.js";

const NVM_BACKENDS: Record<string, string> = {
  sandbox: "https://api.sandbox.nevermined.app",
  live: "https://api.nevermined.app",
};

export function getNvmBackendUrl(environment: string): string {
  return NVM_BACKENDS[environment] ?? NVM_BACKENDS.sandbox;
}

export async function getX402AccessToken(
  nvmApiKey: string,
  environment: string,
  planId: string,
  agentId: string,
): Promise<string> {
  const backend = getNvmBackendUrl(environment);
  const res = await fetch(`${backend}/api/v1/x402/permissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${nvmApiKey}`,
    },
    body: JSON.stringify({
      accepted: {
        scheme: "nvm:erc4337",
        network: "eip155:84532",
        planId,
        extra: { agentId },
      },
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, string>;
    throw new PaymentFailedError(
      err.message ?? `Token request failed: HTTP ${res.status}`,
    );
  }

  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}
