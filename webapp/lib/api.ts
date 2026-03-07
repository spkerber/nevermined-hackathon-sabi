import { authHeaders } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://sabi-backend.ben-imadali.workers.dev";

export class PaymentRequiredError extends Error {
  public paymentInfo?: Record<string, unknown>;

  constructor(paymentRequired: string) {
    super("Payment Required");
    this.name = "PaymentRequiredError";
    if (paymentRequired) {
      try {
        this.paymentInfo = JSON.parse(atob(paymentRequired));
      } catch {
        // ignore decode errors
      }
    }
  }
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (res.status === 402) {
    const paymentRequired = res.headers.get("payment-required") ?? "";
    throw new PaymentRequiredError(paymentRequired);
  }
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ userId: string; email: string }>;
}

export async function createVerification(params: {
  question: string;
  targetLat: number;
  targetLng: number;
  accessToken?: string;
}) {
  const { accessToken, ...body } = params;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  if (accessToken) {
    headers["payment-signature"] = accessToken;
  }
  const res = await fetch(`${API_BASE}/api/verifications`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function listMyVerifications(requesterId: string) {
  const res = await fetch(
    `${API_BASE}/api/verifications?requesterId=${encodeURIComponent(requesterId)}`,
    { headers: authHeaders() },
  );
  return handleResponse(res) as Promise<{
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
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getArtifact(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/artifact`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export function getFrameUrl(pathOrUrl: string) {
  // Backend may return full URL; use as-is. Otherwise prepend API_BASE for relative paths.
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("//")) {
    return pathOrUrl;
  }
  return `${API_BASE}${pathOrUrl}`;
}

export async function archiveVerification(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse(res);
}

export function getWebSocketUrl(jobId: string) {
  const wsBase = API_BASE.replace(/^http/, "ws");
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("sabi_api_key") : null;
  const qs = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : "";
  return `${wsBase}/agents/verification-agent/${jobId}${qs}`;
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json() as Promise<{
    apiBaseUrl: string;
    nvmEnvironment: string;
    nvmPlanId: string;
  }>;
}

// ── Verifier endpoints ──

export async function listAvailableJobs() {
  const res = await fetch(`${API_BASE}/api/verifications`, {
    headers: authHeaders(),
  });
  return handleResponse(res) as Promise<{
    jobs: {
      id: string;
      question: string;
      category: string;
      status: string;
      payout: number;
      targetLat: number;
      targetLng: number;
      requesterId: string;
      createdAt: number;
    }[];
  }>;
}

export async function acceptJob(jobId: string, verifierId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ verifierId }),
  });
  return handleResponse(res);
}

export async function startSession(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse(res);
}

export async function uploadFrame(jobId: string, imageBlob: Blob) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/frames`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", ...authHeaders() },
    body: imageBlob,
  });
  return handleResponse(res) as Promise<{ frameCount: number }>;
}

export async function endSession(jobId: string, answer: string, transcript?: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ answer, transcript }),
  });
  return handleResponse(res);
}

export async function cancelJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse(res);
}

export async function seedDemoJobs() {
  const res = await fetch(`${API_BASE}/api/seed`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res) as Promise<{ count: number }>;
}
