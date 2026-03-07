"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth, setAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://sabi-backend.ben-imadali.workers.dev";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [mode, setMode] = useState<"login" | "signup" | "apikey">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    if (getAuth()) router.replace(redirectTo);
  }, [router, redirectTo]);

  async function handleApiKeyLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        setError("Invalid API key");
        return;
      }
      const data = await res.json();
      setAuth(apiKey.trim(), data.userId, data.email ?? "agent@sabi.local");
      router.replace(redirectTo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Authentication failed");
        return;
      }

      setAuth(data.apiKey, data.userId, data.email);
      router.replace(redirectTo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6" role="main" aria-label="Sign in">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-sabi-text">Sabi</h1>
          <p className="text-sabi-muted">
            {mode === "apikey" ? "Sign in with your API key" : mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* API key login (for agent users / buyers) */}
        {mode === "apikey" && (
          <form onSubmit={handleApiKeyLogin} className="space-y-4" aria-label="API key sign in">
            <div>
              <label htmlFor="apikey" className="block text-sm font-medium text-sabi-text mb-1">
                API key
              </label>
              <input
                id="apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                autoComplete="off"
                aria-describedby="apikey-hint"
                className="w-full rounded border border-sabi-border bg-sabi-surface px-4 py-3 text-sabi-text placeholder:text-sabi-muted font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sabi-focus focus:border-transparent"
                placeholder="sabi_sk_..."
              />
              <p id="apikey-hint" className="text-xs text-sabi-muted mt-1">
                Paste the API key from your agent or signup response.
              </p>
            </div>
            {error && <p className="text-sabi-error text-sm" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded bg-sabi-accent px-4 py-3 font-medium text-sabi-bg hover:bg-sabi-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Sign in"}
            </button>
          </form>
        )}

        {/* Email/password form */}
        {mode !== "apikey" && (
        <form onSubmit={handleSubmit} className="space-y-4" aria-label={mode === "signup" ? "Create account" : "Sign in"}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-sabi-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded border border-sabi-border bg-sabi-surface px-4 py-3 text-sabi-text placeholder:text-sabi-muted focus:outline-none focus:ring-2 focus:ring-sabi-focus focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-sabi-text mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded border border-sabi-border bg-sabi-surface px-4 py-3 text-sabi-text placeholder:text-sabi-muted focus:outline-none focus:ring-2 focus:ring-sabi-focus focus:border-transparent"
              placeholder={mode === "signup" ? "Min 8 characters" : ""}
            />
          </div>

          {error && <p className="text-sabi-error text-sm" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded bg-sabi-accent px-4 py-3 font-medium text-sabi-bg hover:bg-sabi-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        )}

        <p className="text-center text-sm text-sabi-muted">
          <a href="/demo" className="text-sabi-accent hover:text-sabi-accent-hover block mb-3 underline underline-offset-2">
            View demo (no login)
          </a>
          {mode === "apikey" ? (
            <>
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-sabi-accent hover:text-sabi-accent-hover">
                Sign in with email
              </button>
              {" · "}
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="text-sabi-accent hover:text-sabi-accent-hover">
                Sign up
              </button>
            </>
          ) : mode === "login" ? (
            <>
              <button type="button" onClick={() => { setMode("apikey"); setError(""); }} className="text-sabi-accent hover:text-sabi-accent-hover">
                Sign in with API key
              </button>
              {" · "}
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="text-sabi-accent hover:text-sabi-accent-hover">
                Sign up
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setMode("apikey"); setError(""); }} className="text-sabi-accent hover:text-sabi-accent-hover">
                Sign in with API key
              </button>
              {" · "}
              Already have an account?{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-sabi-accent hover:text-sabi-accent-hover">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-6" role="main">
        <p className="text-sabi-muted">Loading...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
