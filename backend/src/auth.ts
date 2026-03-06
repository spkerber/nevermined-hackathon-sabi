import type { Env } from "./types";
import type { AuthRegistry } from "./auth-registry";

export interface AuthUser {
  id: string;
  email: string;
}

// --- Password hashing (PBKDF2 via Web Crypto) ---

const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  const saltHex = bufToHex(salt);
  const hashHex = bufToHex(new Uint8Array(derived));
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = hexToBuf(saltHex);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return bufToHex(new Uint8Array(derived)) === hashHex;
}

export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `sabi_sk_${bufToHex(bytes)}`;
}

// --- Auth middleware ---

export function getAuthRegistry(env: Env): DurableObjectStub<AuthRegistry> {
  const id = env.AuthRegistry.idFromName("global");
  return env.AuthRegistry.get(id) as DurableObjectStub<AuthRegistry>;
}

export async function authenticateRequest(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer sabi_sk_")) return null;

  const apiKey = authHeader.slice(7); // "Bearer ".length
  const registry = getAuthRegistry(env);
  return registry.getAccountByApiKey(apiKey);
}

// --- Hex utils ---

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
