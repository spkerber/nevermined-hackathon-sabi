import { authHeaders } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://sabi-backend.ben-imadali.workers.dev";

async function handleResponse(res: Response) {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
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

