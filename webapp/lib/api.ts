const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class PaymentRequiredError extends Error {
  constructor(public paymentRequired: string) {
    super("Payment Required");
    this.name = "PaymentRequiredError";
  }
}

async function handleResponse(res: Response) {
  if (res.status === 402) {
    const paymentRequired = res.headers.get("payment-required") ?? "";
    throw new PaymentRequiredError(paymentRequired);
  }
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function createVerification(
  params: {
    question: string;
    targetLat: number;
    targetLng: number;
    requesterId?: string;
  },
  paymentSignature: string,
) {
  const res = await fetch(`${API_BASE}/api/verifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "payment-signature": paymentSignature,
    },
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function listMyVerifications(requesterId: string) {
  const res = await fetch(
    `${API_BASE}/api/verifications?requesterId=${encodeURIComponent(requesterId)}`
  );
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json() as Promise<{
    jobs: {
      id: string;
      question: string;
      category: string;
      status: string;
      payout: number;
      createdAt?: number;
    }[];
  }>;
}

export async function getVerificationStatus(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getArtifact(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/artifact`);
  return handleResponse(res);
}

export function getFrameUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function archiveVerification(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export function getWebSocketUrl(jobId: string) {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return `${wsBase}/agents/verification-agent/${jobId}`;
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json() as Promise<{
    apiBaseUrl: string;
    nvmEnvironment: string;
    nvmPlanId: string;
    nvmAgentId: string;
  }>;
}
