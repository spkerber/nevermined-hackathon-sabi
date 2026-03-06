import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";

export interface JobEntry {
  id: string;
  question: string;
  category: string;
  targetLat: number;
  targetLng: number;
  status: string;
  payout: number;
  requesterId: string;
  verifierId?: string;
  createdAt: number;
}

export class JobRegistry extends DurableObject<Env> {
  private jobs: Map<string, JobEntry> = new Map();
  private initialized = false;

  private async ensureLoaded() {
    if (this.initialized) return;
    const stored = await this.ctx.storage.get<Record<string, JobEntry>>("jobs");
    if (stored) {
      this.jobs = new Map(Object.entries(stored));
    }
    this.initialized = true;
  }

  private async save() {
    await this.ctx.storage.put("jobs", Object.fromEntries(this.jobs));
  }

  async addJob(entry: JobEntry) {
    await this.ensureLoaded();
    this.jobs.set(entry.id, entry);
    await this.save();
  }

  async updateJob(id: string, updates: Partial<JobEntry>) {
    await this.ensureLoaded();
    const existing = this.jobs.get(id);
    if (existing) {
      this.jobs.set(id, { ...existing, ...updates });
      await this.save();
    }
  }

  async removeJob(id: string) {
    await this.ensureLoaded();
    this.jobs.delete(id);
    await this.save();
  }

  async listJobs(filter?: { requesterId?: string; verifierId?: string }): Promise<JobEntry[]> {
    await this.ensureLoaded();
    const all = Array.from(this.jobs.values());

    if (filter?.requesterId) {
      return all
        .filter((j) => j.requesterId === filter.requesterId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    if (filter?.verifierId) {
      return all
        .filter((j) => j.verifierId === filter.verifierId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    // Default: available jobs only
    return all.filter((j) => j.status === "connecting");
  }
}
