"use client";

const NVM_BACKENDS: Record<string, string> = {
  sandbox: "https://api.sandbox.nevermined.app",
  live: "https://api.nevermined.app",
};

const NVM_APPS: Record<string, string> = {
  sandbox: "https://sandbox.nevermined.app",
  live: "https://nevermined.app",
};

const NVM_API_KEY_STORAGE = "sabi_nvm_api_key";

export function getStoredApiKey(): string | null {
  return localStorage.getItem(NVM_API_KEY_STORAGE);
}

export function storeApiKey(key: string) {
  localStorage.setItem(NVM_API_KEY_STORAGE, key);
}

export function clearApiKey() {
  localStorage.removeItem(NVM_API_KEY_STORAGE);
}

export function getNvmAppUrl(environment: string): string {
  return NVM_APPS[environment] ?? NVM_APPS.sandbox;
}

export async function getX402AccessToken(
  nvmApiKey: string,
  environment: string,
  planId: string,
  agentId: string,
): Promise<string> {
  const backend = NVM_BACKENDS[environment] ?? NVM_BACKENDS.sandbox;
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
    const err = await res.json().catch(() => ({ message: "Token request failed" }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.accessToken;
}
