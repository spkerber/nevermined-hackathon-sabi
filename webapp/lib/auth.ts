"use client";

const API_KEY_STORAGE = "sabi_api_key";
const USER_STORAGE = "sabi_user";

export interface AuthState {
  apiKey: string;
  userId: string;
  email: string;
}

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  const userRaw = localStorage.getItem(USER_STORAGE);
  if (!apiKey || !userRaw) return null;
  try {
    const user = JSON.parse(userRaw);
    return { apiKey, userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

export function setAuth(apiKey: string, userId: string, email: string) {
  localStorage.setItem(API_KEY_STORAGE, apiKey);
  localStorage.setItem(USER_STORAGE, JSON.stringify({ userId, email }));
}

export function clearAuth() {
  localStorage.removeItem(API_KEY_STORAGE);
  localStorage.removeItem(USER_STORAGE);
  // Also clear legacy keys
  localStorage.removeItem("sabi_requester_id");
  localStorage.removeItem("sabi_nvm_api_key");
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE);
}

export function authHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}
