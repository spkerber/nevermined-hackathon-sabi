"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getWebSocketUrl, getFrameUrl, getArtifact, archiveVerification } from "@/lib/api";
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
  frames: { url: string; timestamp: number }[];
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; description: string }> = {
  connecting: {
    label: "Connecting",
    color: "bg-amber-500",
    description: "Finding a nearby verifier...",
  },
  accepted: {
    label: "Accepted",
    color: "bg-indigo-500",
    description: "A verifier has accepted your job and is heading to the location.",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500",
    description: "Verification session active. Photos are being captured.",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-500",
    description: "Verification complete! Review the evidence below.",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-zinc-500",
    description: "This verification was cancelled.",
  },
};

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [state, setState] = useState<AgentState | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
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
  }, [jobId]);

  // Fetch artifact when status becomes "verified"
  useEffect(() => {
    if (state?.status === "verified" && !artifact) {
      getArtifact(jobId).then(setArtifact).catch(console.error);
    }
  }, [state?.status, jobId, artifact]);

  const statusConfig = state ? STATUS_CONFIG[state.status] : null;

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
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          &larr; Back
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
          <p className="text-sm text-zinc-500 font-mono">{jobId}</p>
        </div>

        {/* Question */}
        {state?.job && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400 mb-1">Question</p>
            <p className="text-lg">{state.job.question}</p>
          </div>
        )}

        {/* Status */}
        {statusConfig && (
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${statusConfig.color} animate-pulse`} />
            <div>
              <p className="font-medium">{statusConfig.label}</p>
              <p className="text-sm text-zinc-400">{statusConfig.description}</p>
            </div>
          </div>
        )}

        {/* Status pipeline */}
        {state && (
          <div className="flex items-center gap-2">
            {(state.status === "cancelled"
              ? (["cancelled"] as JobStatus[])
              : (["connecting", "accepted", "in_progress", "verified"] as JobStatus[])
            ).map((s, i) => {
              const isActive = state.status === s;
              const pipeline = ["connecting", "accepted", "in_progress", "verified"] as JobStatus[];
              const isPast = pipeline.indexOf(state.status) > i;
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-6 ${isPast || isActive ? "bg-zinc-500" : "bg-zinc-800"}`} />}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-mono ${
                      isActive
                        ? `${STATUS_CONFIG[s].color} text-white`
                        : isPast
                          ? "bg-zinc-700 text-zinc-300"
                          : "bg-zinc-900 text-zinc-600 border border-zinc-800"
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
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full px-4 py-3 rounded-lg border border-red-800 bg-red-950/30 text-red-400 hover:bg-red-950/50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {cancelling ? "Cancelling..." : "Cancel Verification"}
          </button>
        )}

        {/* Live frame count during session */}
        {state?.status === "in_progress" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Photos captured</p>
            <p className="text-3xl font-bold font-mono">{state.frameCount}</p>
          </div>
        )}

        {/* Artifact review */}
        {artifact && (
          <div className="space-y-4">
            {/* Answer */}
            <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4">
              <p className="text-sm text-emerald-400 mb-1">Verified Answer</p>
              <p className="text-lg">{artifact.answer}</p>
            </div>

            {/* Photo step-through */}
            {artifact.frames.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Photo evidence ({frameIndex + 1} of {artifact.frames.length})
                </p>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFrameUrl(artifact.frames[frameIndex].url)}
                    alt={`Frame ${frameIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={prevFrame}
                    disabled={frameIndex === 0}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    &larr; Prev
                  </button>
                  <p className="text-xs text-zinc-500 font-mono">
                    {new Date(artifact.frames[frameIndex].timestamp).toLocaleTimeString()}
                  </p>
                  <button
                    onClick={nextFrame}
                    disabled={frameIndex === artifact.frames.length - 1}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connection indicator */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-red-500"}`} />
          {wsConnected ? "Live" : "Disconnected"}
        </div>
      </div>
    </main>
  );
}
