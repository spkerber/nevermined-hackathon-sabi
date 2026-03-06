import { Agent, type Connection, callable } from "agents";
import type { Env, AgentState, VerificationJob, Frame, Artifact, JobStatus } from "./types";

export class VerificationAgent extends Agent<Env, AgentState> {
  initialState: AgentState = {
    status: "connecting",
    job: null,
    frameCount: 0,
  };

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        target_lat REAL NOT NULL,
        target_lng REAL NOT NULL,
        requester_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'connecting',
        verifier_id TEXT,
        answer TEXT,
        transcript TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS frames (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `;

    // Restore state from SQL if this agent is resuming
    const jobs = [...this.sql<VerificationJob>`SELECT * FROM jobs LIMIT 1`];
    if (jobs.length > 0) {
      const job = jobs[0];
      const frames = [...this.sql<{ cnt: number }>`SELECT COUNT(*) as cnt FROM frames WHERE job_id = ${job.id}`];
      this.setState({
        status: job.status as JobStatus,
        job,
        frameCount: frames[0]?.cnt ?? 0,
      });
    }
  }

  async onConnect(connection: Connection) {
    connection.send(JSON.stringify({ type: "state", data: this.state }));
  }

  onStateChanged(state: AgentState) {
    this.broadcast(JSON.stringify({ type: "state", data: state }));
  }

  @callable()
  async createJob(params: {
    id: string; question: string; category?: string; targetLat: number; targetLng: number; requesterId: string;
  }) {
    const now = Date.now();
    const category = params.category ?? "general";
    this.sql`
      INSERT INTO jobs (id, question, category, target_lat, target_lng, requester_id, status, created_at, updated_at)
      VALUES (${params.id}, ${params.question}, ${category}, ${params.targetLat}, ${params.targetLng}, ${params.requesterId}, 'connecting', ${now}, ${now})
    `;

    const job: VerificationJob = {
      id: params.id,
      question: params.question,
      category,
      target_lat: params.targetLat,
      target_lng: params.targetLng,
      requester_id: params.requesterId,
      status: "connecting",
      verifier_id: null,
      answer: null,
      transcript: null,
      created_at: now,
      updated_at: now,
    };

    this.setState({ status: "connecting", job, frameCount: 0 });
    return job;
  }

  @callable()
  async getStatus() {
    return this.state;
  }

  @callable()
  async acceptJob(verifierId: string) {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "connecting") throw new Error(`Cannot accept job in status: ${job.status}`);

    const now = Date.now();
    this.sql`UPDATE jobs SET status = 'accepted', verifier_id = ${verifierId}, updated_at = ${now} WHERE id = ${job.id}`;

    const updated: VerificationJob = { ...job, status: "accepted", verifier_id: verifierId, updated_at: now };
    this.setState({ ...this.state, status: "accepted", job: updated });
    return updated;
  }

  @callable()
  async archiveJob() {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "connecting") throw new Error(`Cannot archive job in status: ${job.status}`);

    const now = Date.now();
    this.sql`UPDATE jobs SET status = 'cancelled', updated_at = ${now} WHERE id = ${job.id}`;

    const updated: VerificationJob = { ...job, status: "cancelled", updated_at: now };
    this.setState({ ...this.state, status: "cancelled", job: updated });
    return updated;
  }

  @callable()
  async cancelJob() {
    const job = this.state.job;
    if (!job) throw new Error("No job found");

    const now = Date.now();
    this.sql`UPDATE jobs SET status = 'connecting', verifier_id = NULL, updated_at = ${now} WHERE id = ${job.id}`;
    this.sql`DELETE FROM frames WHERE job_id = ${job.id}`;

    const updated: VerificationJob = { ...job, status: "connecting", verifier_id: null, updated_at: now };
    this.setState({ status: "connecting", job: updated, frameCount: 0 });
    return updated;
  }

  @callable()
  async startSession() {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "accepted") throw new Error(`Cannot start session in status: ${job.status}`);

    const now = Date.now();
    this.sql`UPDATE jobs SET status = 'in_progress', updated_at = ${now} WHERE id = ${job.id}`;

    const updated: VerificationJob = { ...job, status: "in_progress", updated_at: now };
    this.setState({ ...this.state, status: "in_progress", job: updated });
    return { status: "in_progress", instructions: job.question };
  }

  @callable()
  async addFrame(r2Key: string, timestamp: number) {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "in_progress") throw new Error(`Cannot add frame in status: ${job.status}`);

    const frameId = crypto.randomUUID();
    this.sql`INSERT INTO frames (id, job_id, r2_key, timestamp) VALUES (${frameId}, ${job.id}, ${r2Key}, ${timestamp})`;

    this.setState({ ...this.state, frameCount: this.state.frameCount + 1 });
    return { frameId, frameCount: this.state.frameCount };
  }

  @callable()
  async endSession(answer: string, transcript?: string) {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "in_progress") throw new Error(`Cannot end session in status: ${job.status}`);

    const now = Date.now();
    const tx = transcript ?? null;
    this.sql`UPDATE jobs SET status = 'verified', answer = ${answer}, transcript = ${tx}, updated_at = ${now} WHERE id = ${job.id}`;

    const updated: VerificationJob = { ...job, status: "verified", answer, transcript: tx, updated_at: now };
    this.setState({ ...this.state, status: "verified", job: updated });
    return updated;
  }

  @callable()
  async getArtifact(): Promise<Artifact> {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "verified") throw new Error("Artifact not ready yet");
    if (!job.answer) throw new Error("No answer recorded");

    const frames = [...this.sql<Frame>`SELECT * FROM frames WHERE job_id = ${job.id} ORDER BY timestamp ASC`];

    return {
      question: job.question,
      answer: job.answer,
      transcript: job.transcript,
      frames: frames.map((f) => ({
        url: `/api/frames/${f.r2_key}`,
        timestamp: f.timestamp,
      })),
    };
  }
}
