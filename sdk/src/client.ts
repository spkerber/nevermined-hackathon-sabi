import { EventEmitter } from "events";
import { resolveConfig } from "./config.js";
import { ApiError, PaymentRequiredError } from "./errors.js";
import type {
  SabiConfig,
  PlatformConfig,
  CreateVerificationParams,
  CreateVerificationResult,
  AgentState,
  Artifact,
  JobListEntry,
} from "./types.js";

export class JobWatcher extends EventEmitter {
  private ws: WebSocket | null = null;
  private closed = false;

  /** @internal */
  _start(url: string) {
    // Use native WebSocket (Node 22+, browsers) or ws package
    const WS = typeof globalThis.WebSocket !== "undefined"
      ? globalThis.WebSocket
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : (require("ws") as typeof WebSocket);

    this.ws = new WS(url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        this.emit("state", data);
      } catch {
        // Ignore unparseable messages
      }
    };

    this.ws.onerror = (event) => {
      this.emit("error", new Error("WebSocket error: " + String(event)));
    };

    this.ws.onclose = () => {
      this.closed = true;
      this.emit("close");
    };
  }

  close() {
    if (this.ws && !this.closed) {
      this.ws.close();
      this.closed = true;
    }
  }
}

export class SabiClient {
  private config: SabiConfig;
  private platformConfig: PlatformConfig | null = null;

  constructor(options?: Partial<SabiConfig>) {
    this.config = resolveConfig(options);
  }

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/$/, "");
  }

  private get authHeaders(): Record<string, string> {
    return this.config.apiKey
      ? { Authorization: `Bearer ${this.config.apiKey}` }
      : {};
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = { ...this.authHeaders, ...init?.headers };
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, string>;
      throw new ApiError(res.status, body.error ?? `Request failed`);
    }

    return res.json() as Promise<T>;
  }

  async getPlatformConfig(): Promise<PlatformConfig> {
    if (this.platformConfig) return this.platformConfig;
    this.platformConfig = await this.request<PlatformConfig>("/api/config");
    return this.platformConfig;
  }

  async signup(nvmApiKey: string): Promise<{ apiKey: string; userId: string }> {
    return this.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nvmApiKey }),
    });
  }

  async createVerification(
    params: CreateVerificationParams,
  ): Promise<CreateVerificationResult> {
    // Payment is resolved server-side from the stored NVM key
    return this.request("/api/verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  }

  async getStatus(jobId: string): Promise<AgentState> {
    return this.request<AgentState>(`/api/verifications/${jobId}`);
  }

  async listJobs(filter?: {
    requesterId?: string;
    verifierId?: string;
  }): Promise<JobListEntry[]> {
    const params = new URLSearchParams();
    if (filter?.requesterId) params.set("requesterId", filter.requesterId);
    if (filter?.verifierId) params.set("verifierId", filter.verifierId);
    const qs = params.toString();
    const data = await this.request<{ jobs: JobListEntry[] }>(
      `/api/verifications${qs ? `?${qs}` : ""}`,
    );
    return data.jobs;
  }

  async getArtifact(jobId: string): Promise<Artifact> {
    return this.request<Artifact>(`/api/verifications/${jobId}/artifact`);
  }

  getFrameUrl(r2Key: string): string {
    return `${this.baseUrl}/api/frames/${r2Key}`;
  }

  watchJob(jobId: string): JobWatcher {
    const watcher = new JobWatcher();
    const wsBase = this.baseUrl.replace(/^http/, "ws");
    const qs = this.config.apiKey ? `?apiKey=${encodeURIComponent(this.config.apiKey)}` : "";
    watcher._start(`${wsBase}/agents/verification-agent/${jobId}${qs}`);
    return watcher;
  }
}
