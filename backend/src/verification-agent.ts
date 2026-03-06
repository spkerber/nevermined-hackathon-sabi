import { Agent, type Connection, callable } from "agents";
import type { Env, AgentState, VerificationJob, Artifact } from "./types";

export class VerificationAgent extends Agent<Env, AgentState> {
  initialState: AgentState = {
    status: "connecting",
    job: null,
    frames: [],
  };

  private toWireState(state: AgentState) {
    return {
      status: state.status,
      job: state.job,
      frameCount: state.frames.length,
    };
  }

  async onConnect(connection: Connection) {
    connection.send(JSON.stringify({ type: "state", data: this.toWireState(this.state) }));
  }

  onStateChanged(state: AgentState) {
    this.broadcast(JSON.stringify({ type: "state", data: this.toWireState(state) }));
  }

  @callable()
  async createJob(params: {
    id: string;
    question: string;
    category?: string;
    targetLat: number;
    targetLng: number;
    requesterId: string;
    paymentTx?: string;
  }) {
    const now = Date.now();
    const job: VerificationJob = {
      id: params.id,
      question: params.question,
      category: params.category ?? "general",
      target_lat: params.targetLat,
      target_lng: params.targetLng,
      requester_id: params.requesterId,
      status: "connecting",
      verifier_id: null,
      answer: null,
      transcript: null,
      payment_tx: params.paymentTx ?? null,
      created_at: now,
      updated_at: now,
    };

    this.setState({ status: "connecting", job, frames: [] });
    return job;
  }

  @callable()
  async getStatus() {
    return {
      status: this.state.status,
      job: this.state.job,
      frameCount: this.state.frames.length,
    };
  }

  @callable()
  async acceptJob(verifierId: string) {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "connecting")
      throw new Error(`Cannot accept job in status: ${job.status}`);

    const updated: VerificationJob = {
      ...job,
      status: "accepted",
      verifier_id: verifierId,
      updated_at: Date.now(),
    };
    this.setState({ ...this.state, status: "accepted", job: updated });
    return updated;
  }

  @callable()
  async archiveJob() {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "connecting")
      throw new Error(`Cannot archive job in status: ${job.status}`);

    const updated: VerificationJob = {
      ...job,
      status: "cancelled",
      updated_at: Date.now(),
    };
    this.setState({ ...this.state, status: "cancelled", job: updated });
    return updated;
  }

  @callable()
  async cancelJob() {
    const job = this.state.job;
    if (!job) throw new Error("No job found");

    const updated: VerificationJob = {
      ...job,
      status: "connecting",
      verifier_id: null,
      updated_at: Date.now(),
    };
    this.setState({ status: "connecting", job: updated, frames: [] });
    return updated;
  }

  @callable()
  async startSession() {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "accepted")
      throw new Error(`Cannot start session in status: ${job.status}`);

    const updated: VerificationJob = {
      ...job,
      status: "in_progress",
      updated_at: Date.now(),
    };
    this.setState({ ...this.state, status: "in_progress", job: updated });
    return { status: "in_progress", instructions: job.question };
  }

  @callable()
  async addFrame(r2Key: string, timestamp: number) {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "in_progress")
      throw new Error(`Cannot add frame in status: ${job.status}`);

    const frames = [...this.state.frames, { r2Key, timestamp }];
    this.setState({ ...this.state, frames });
    return { frameCount: frames.length };
  }

  @callable()
  async endSession(answer: string, transcript?: string) {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "in_progress")
      throw new Error(`Cannot end session in status: ${job.status}`);

    const updated: VerificationJob = {
      ...job,
      status: "verified",
      answer,
      transcript: transcript ?? null,
      updated_at: Date.now(),
    };
    this.setState({ ...this.state, status: "verified", job: updated });
    return updated;
  }

  @callable()
  async getArtifact(): Promise<Artifact> {
    const job = this.state.job;
    if (!job) throw new Error("No job found");
    if (job.status !== "verified") throw new Error("Artifact not ready yet");
    if (!job.answer) throw new Error("No answer recorded");

    return {
      question: job.question,
      answer: job.answer,
      transcript: job.transcript,
      frames: this.state.frames.map((f) => ({
        url: `/api/frames/${f.r2Key}`,
        timestamp: f.timestamp,
      })),
    };
  }
}
