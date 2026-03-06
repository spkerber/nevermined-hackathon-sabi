export interface Env {
  VerificationAgent: DurableObjectNamespace;
  JobRegistry: DurableObjectNamespace;
  FRAMES: R2Bucket;
  NVM_API_KEY: string;
  NVM_ENVIRONMENT: string;
  NVM_PLAN_ID: string;
  NVM_AGENT_ID: string;
}

export type JobStatus = "connecting" | "accepted" | "in_progress" | "verified" | "cancelled";

export interface VerificationJob {
  id: string;
  question: string;
  category: string;
  target_lat: number;
  target_lng: number;
  requester_id: string;
  status: JobStatus;
  verifier_id: string | null;
  answer: string | null;
  transcript: string | null;
  payment_tx: string | null;
  created_at: number;
  updated_at: number;
}

export interface FrameMeta {
  r2Key: string;
  timestamp: number;
}

export interface AgentState {
  status: JobStatus;
  job: VerificationJob | null;
  frames: FrameMeta[];
}

export interface Artifact {
  question: string;
  answer: string;
  transcript: string | null;
  frames: { url: string; timestamp: number }[];
}
