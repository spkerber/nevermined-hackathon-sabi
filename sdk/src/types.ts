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

export interface Artifact {
  question: string;
  answer: string;
  transcript: string | null;
  frames: { url: string; timestamp: number }[];
}

export interface AgentState {
  status: JobStatus;
  job: VerificationJob | null;
  frames: FrameMeta[];
}

export interface PlatformConfig {
  apiBaseUrl: string;
  nvmEnvironment: string;
  nvmPlanId: string;
  nvmAgentId: string;
}

export interface SabiConfig {
  apiUrl: string;
  apiKey?: string;
  nvmApiKey?: string;
}

export interface CreateVerificationParams {
  question: string;
  targetLat: number;
  targetLng: number;
  category?: string;
  requesterId?: string;
  payout?: number;
}

export interface CreateVerificationResult {
  job: VerificationJob;
  websocketUrl: string;
  payment: {
    transaction: string;
    creditsRedeemed: string;
    remainingBalance: string;
  };
}

export interface JobListEntry {
  id: string;
  question: string;
  category: string;
  targetLat: number;
  targetLng: number;
  status: JobStatus;
  payout: number;
  requesterId: string;
  verifierId?: string;
  createdAt: number;
}
