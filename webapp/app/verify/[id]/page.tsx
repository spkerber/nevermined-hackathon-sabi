"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getWebSocketUrl, getFrameUrl, getArtifact, archiveVerification } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import Link from "next/link";

type JobStatus = "connecting" | "accepted" | "in_progress" | "verified" | "cancelled";

interface AgentState {
  status: JobStatus;
  job: {
    id: string;
    question: string;
    verifier_id: string | null;
    answer: string | null;
  } | null;
  frameCount: number;
}

interface Artifact {
  question: string;
  answer: string;
  transcript: string | null;
  frames: { url: string; timestamp: number }[];
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; description: string }> = {
  connecting: {
    label: "Connecting",
    color: "bg-sabi-warning",
    description: "Finding a nearby verifier...",
  },
  accepted: {
    label: "Accepted",
    color: "bg-sabi-accent",
    description: "A verifier has accepted your job and is heading to the location.",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-sabi-inprogress",
    description: "Verification session active. Photos are being captured.",
  },
  verified: {
    label: "Verified",
    color: "bg-sabi-success",
    description: "Verification complete! Review the evidence below.",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-sabi-muted",
    description: "This verification was cancelled.",
  },
};

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: jobId } = use(params);
  const [state, setState] = useState<AgentState | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Redirect to login if not authenticated (so viewUrl works: user logs in with API key, returns here)
  const auth = getAuth();
  useEffect(() => {
    if (!auth) {
      router.replace(`/login?redirect=${encodeURIComponent(`/verify/${jobId}`)}`);
    }
  }, [auth, router, jobId]);

  // WebSocket connection for real-time updates (only when authenticated)
  useEffect(() => {
    if (!auth) return;
    const wsUrl = getWebSocketUrl(jobId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "state") {
        setState(msg.data);
      }
    };

    return () => ws.close();
  }, [auth, jobId]);

  // Fetch artifact when status becomes "verified"
  useEffect(() => {
    if (!auth) return;
    if (state?.status === "verified" && !artifact) {
      getArtifact(jobId).then(setArtifact).catch(console.error);
    }
  }, [auth, state?.status, jobId, artifact]);

  const statusConfig = state ? STATUS_CONFIG[state.status] : null;

  if (!auth) {
    return (
      <main className="flex min-h-screen items-center justify-center" role="main" aria-live="polite">
        <p className="text-sabi-muted">Redirecting to login...</p>
      </main>
    );
  }

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await archiveVerification(jobId);
    } catch (e) {
      console.error("Failed to cancel:", e);
    }
    setCancelling(false);
  }, [jobId]);

  const prevFrame = useCallback(() => {
    setFrameIndex((i) => Math.max(0, i - 1));
  }, []);

  const nextFrame = useCallback(() => {
    if (!artifact) return;
    setFrameIndex((i) => Math.min(artifact.frames.length - 1, i + 1));
  }, [artifact]);

  return (
    <main className="flex min-h-screen flex-col items-center p-6" role="main" aria-label="Verification status">
      <div className="w-full max-w-2xl space-y-6">
        <Link href="/" className="text-sabi-muted hover:text-sabi-text text-sm transition-colors">
          &larr; Back
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-sabi-text">Verification</h1>
          <p className="text-sm text-sabi-muted font-mono" aria-label={`Job ID: ${jobId}`}>{jobId}</p>
        </div>

        {/* Question */}
        {state?.job && (
          <div className="rounded border border-sabi-border bg-sabi-surface p-4">
            <p className="text-sm text-sabi-muted mb-1">Question</p>
            <p className="text-lg text-sabi-text">{state.job.question}</p>
          </div>
        )}

        {/* Status — live region for screen readers */}
        {statusConfig && (
          <div className="flex items-center gap-3" aria-live="polite" aria-atomic="true">
            <span className={`h-3 w-3 rounded-full ${statusConfig.color} animate-pulse`} aria-hidden />
            <div>
              <p className="font-medium text-sabi-text">{statusConfig.label}</p>
              <p className="text-sm text-sabi-muted">{statusConfig.description}</p>
            </div>
          </div>
        )}

        {/* Status pipeline */}
        {state && (
          <div className="flex items-center gap-2" role="status" aria-label={`Status: ${state.status}`}>
            {(state.status === "cancelled"
              ? (["cancelled"] as JobStatus[])
              : (["connecting", "accepted", "in_progress", "verified"] as JobStatus[])
            ).map((s, i) => {
              const isActive = state.status === s;
              const pipeline = ["connecting", "accepted", "in_progress", "verified"] as JobStatus[];
              const isPast = pipeline.indexOf(state.status) > i;
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-6 ${isPast || isActive ? "bg-sabi-muted" : "bg-sabi-border"}`} />}
                  <div
                    className={`px-3 py-1 rounded text-xs font-mono ${
                      isActive
                        ? `${STATUS_CONFIG[s].color} text-sabi-bg`
                        : isPast
                          ? "bg-sabi-surface text-sabi-muted"
                          : "bg-sabi-bg text-sabi-muted border border-sabi-border"
                    }`}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel button for requester (only when waiting for verifier) */}
        {state?.status === "connecting" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            aria-busy={cancelling}
            className="w-full px-4 py-3 rounded border border-sabi-error/50 bg-sabi-error/10 text-sabi-error hover:bg-sabi-error/20 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {cancelling ? "Cancelling..." : "Cancel Verification"}
          </button>
        )}

        {/* Live frame count during session */}
        {state?.status === "in_progress" && (
          <div className="rounded border border-sabi-border bg-sabi-surface p-4" aria-live="polite">
            <p className="text-sm text-sabi-muted">Photos captured</p>
            <p className="text-3xl font-bold font-mono text-sabi-text">{state.frameCount}</p>
          </div>
        )}

        {/* Artifact review */}
        {artifact && (
          <div className="space-y-4">
            {/* Answer */}
            <div className="rounded border border-sabi-success/40 bg-sabi-success/10 p-4">
              <p className="text-sm text-sabi-success mb-1">Verified Answer</p>
              <p className="text-lg text-sabi-text">{artifact.answer}</p>
            </div>

            {/* Transcript */}
            {artifact.transcript && (
              <div className="rounded border border-sabi-border bg-sabi-surface p-4">
                <p className="text-sm text-sabi-muted mb-2">Conversation Transcript</p>
                <pre className="text-sm text-sabi-text whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {artifact.transcript}
                </pre>
              </div>
            )}

            {/* Photo step-through */}
            {artifact.frames.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-sabi-muted" id="photo-label">
                  Photo evidence ({frameIndex + 1} of {artifact.frames.length})
                </p>
                <div className="relative aspect-video rounded overflow-hidden bg-sabi-surface border border-sabi-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFrameUrl(artifact.frames[frameIndex].url)}
                    alt={`Frame ${frameIndex + 1} of ${artifact.frames.length}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={prevFrame}
                    disabled={frameIndex === 0}
                    aria-label="Previous photo"
                    className="px-4 py-2 rounded bg-sabi-surface text-sabi-text hover:bg-sabi-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-sabi-border"
                  >
                    &larr; Prev
                  </button>
                  <p className="text-xs text-sabi-muted font-mono">
                    {new Date(artifact.frames[frameIndex].timestamp).toLocaleTimeString()}
                  </p>
                  <button
                    type="button"
                    onClick={nextFrame}
                    disabled={frameIndex === artifact.frames.length - 1}
                    aria-label="Next photo"
                    className="px-4 py-2 rounded bg-sabi-surface text-sabi-text hover:bg-sabi-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-sabi-border"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connection indicator */}
        <div className="flex items-center gap-2 text-xs text-sabi-muted" role="status" aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-sabi-success" : "bg-sabi-error"}`} aria-hidden />
          {wsConnected ? "Live" : "Disconnected"}
        </div>
      </div>
    </main>
  );
}
