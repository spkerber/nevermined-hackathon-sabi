export interface Env {
  VerificationAgent: DurableObjectNamespace;
  JobRegistry: DurableObjectNamespace;
  AuthRegistry: DurableObjectNamespace;
  FRAMES: R2Bucket;
  NVM_API_KEY: string;
  NVM_ENVIRONMENT: string;
  NVM_PLAN_ID: string;
  NVM_AGENT_ID: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** URL of the webapp (e.g. https://sabi.vercel.app). Used for OAuth redirects. */
  AUTH_REDIRECT_URL: string;
  /** Base URL of hackathon registration site (e.g. https://hackathon.example.com). Used for Discovery API proxy. */
  HACKATHON_DISCOVERY_BASE_URL?: string;
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
