const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function createVerification(params: {
  question: string;
  targetLat: number;
  targetLng: number;
  requesterId?: string;
}) {
  const res = await fetch(`${API_BASE}/api/verifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getVerificationStatus(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getArtifact(jobId: string) {
  const res = await fetch(`${API_BASE}/api/verifications/${jobId}/artifact`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
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
