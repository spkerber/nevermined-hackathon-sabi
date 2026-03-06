/**
 * Hackathon Discovery API client.
 * Query the marketplace programmatically — discover sellers & buyers at runtime.
 * Backend proxies to GET {HACKATHON_DISCOVERY_BASE_URL}/hackathon/register/api/discover
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://sabi-backend.ben-imadali.workers.dev";

export type DiscoverSide = "sell" | "buy";

export interface DiscoverParams {
  /** "sell" = sellers, "buy" = buyers */
  side: DiscoverSide;
  /** Optional category filter (e.g. "analytics", "AI/ML") */
  category?: string;
}

/**
 * Discover agents in the hackathon marketplace.
 * Calls backend /api/discover which proxies to the hackathon Discovery API.
 */
export async function discoverMarketplace(params: DiscoverParams): Promise<unknown> {
  const search = new URLSearchParams();
  search.set("side", params.side);
  if (params.category) search.set("category", params.category);
  const res = await fetch(`${API_BASE}/api/discover?${search.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Discovery failed: ${res.status}`);
  }
  return res.json();
}

/** Build discover URL for direct use (e.g. link to marketplace). */
export function getDiscoverUrl(params: DiscoverParams): string {
  const search = new URLSearchParams();
  search.set("side", params.side);
  if (params.category) search.set("category", params.category);
  return `${API_BASE}/api/discover?${search.toString()}`;
}
