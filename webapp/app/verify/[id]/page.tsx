"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { getWebSocketUrl, getFrameUrl, getArtifact, archiveVerification, getVerificationStatus } from "@/lib/api";
import Link from "next/link";

type JobStatus = "connecting" | "accepted" | "in_progress" | "verified" | "cancelled";

interface AgentState {
  status: JobStatus;
  job: {
    id: string;
    question: string;
    category?: string;
    verifier_id: string | null;
    answer: string | null;
    transcript: string | null;
    created_at?: number;
    updated_at?: number;
  } | null;
  frameCount: number;
}

interface Artifact {
  question: string;
  answer: string;
  transcript: string | null;
  frames: { url: string; timestamp: number }[];
}

const PIPELINE: JobStatus[] = ["connecting", "accepted", "in_progress", "verified"];

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bgColor: string; description: string; icon: string }> = {
  connecting: {
    label: "Finding Verifier",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10 border-amber-800/40",
    description: "Broadcasting your request to nearby verifiers. Someone will pick it up shortly.",
    icon: "🔍",
  },
  accepted: {
    label: "Verifier En Route",
    color: "bg-indigo-500",
    bgColor: "bg-indigo-500/10 border-indigo-800/40",
    description: "A verifier has accepted your request and is heading to the location.",
    icon: "🚶",
  },
  in_progress: {
    label: "Capturing Evidence",
    color: "bg-blue-500",
    bgColor: "bg-blue-500/10 border-blue-800/40",
    description: "The verifier is on-site capturing photos through their Ray-Ban Metas.",
    icon: "📷",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-800/40",
    description: "Verification complete. Review the photo evidence and answer below.",
    icon: "✅",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-zinc-500",
    bgColor: "bg-zinc-500/10 border-zinc-800/40",
    description: "This verification was cancelled.",
    icon: "✕",
  },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [state, setState] = useState<AgentState | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const prevFrameCountRef = useRef(0);
  const [flashFrame, setFlashFrame] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFlash = useCallback(() => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashFrame(true);
    flashTimeoutRef.current = setTimeout(() => setFlashFrame(false), 600);
  }, []);

  // Initial fetch for state (in case WS hasn't connected yet)
  useEffect(() => {
    let cancelled = false;
    getVerificationStatus(jobId)
      .then((data) => { if (!cancelled) setState(data); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [jobId]);

  // WebSocket for real-time updates
  useEffect(() => {
    const wsUrl = getWebSocketUrl(jobId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "state") {
        const newState = msg.data as AgentState;
        if (newState.frameCount > prevFrameCountRef.current) {
          prevFrameCountRef.current = newState.frameCount;
          triggerFlash();
        }
        setState(newState);
      }
    };

    return () => ws.close();
  }, [jobId, triggerFlash]);

  // Fetch artifact on verified
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

  const prevFrame = useCallback(() => setFrameIndex((i) => Math.max(0, i - 1)), []);
  const nextFrame = useCallback(() => {
    if (!artifact) return;
    setFrameIndex((i) => Math.min(artifact.frames.length - 1, i + 1));
  }, [artifact]);

  const pipelineIndex = state ? PIPELINE.indexOf(state.status) : -1;

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          &larr; My Verifications
        </Link>

        {/* Question card */}
        {state?.job && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Question</p>
            <p className="text-xl font-medium leading-snug">{state.job.question}</p>
            {state.job.created_at && (
              <p className="text-xs text-zinc-600 mt-2">
                Submitted {timeAgo(state.job.created_at)}
              </p>
            )}
          </div>
        )}

        {/* Status banner */}
        {statusConfig && state && (
          <div className={`rounded-xl border p-5 ${statusConfig.bgColor}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{statusConfig.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-zinc-100">{statusConfig.label}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{statusConfig.description}</p>
              </div>
              {["connecting", "accepted", "in_progress"].includes(state.status) && (
                <span className={`h-3 w-3 rounded-full ${statusConfig.color} animate-pulse`} />
              )}
            </div>
          </div>
        )}

        {/* Pipeline */}
        {state && state.status !== "cancelled" && (
          <div className="flex items-center gap-1">
            {PIPELINE.map((s, i) => {
              const isActive = state.status === s;
              const isPast = pipelineIndex > i;
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-1 flex-1">
                  {i > 0 && (
                    <div className={`h-px flex-1 ${isPast || isActive ? "bg-zinc-600" : "bg-zinc-800"}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      isActive
                        ? `${cfg.color} text-white`
                        : isPast
                          ? "bg-zinc-700 text-zinc-300"
                          : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                    }`}
                  >
                    {isPast ? "✓" : cfg.icon} {s === "in_progress" ? "capturing" : s}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Verifier info */}
        {state?.job?.verifier_id && state.status !== "connecting" && (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400">
              {state.job.verifier_id.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Verifier {state.job.verifier_id}</p>
              <p className="text-xs text-zinc-500">
                {state.status === "accepted"
                  ? "Heading to location..."
                  : state.status === "in_progress"
                    ? "On-site, capturing evidence"
                    : state.status === "verified"
                      ? "Verification submitted"
                      : ""}
              </p>
            </div>
          </div>
        )}

        {/* Cancel */}
        {state?.status === "connecting" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full px-4 py-3 rounded-xl border border-red-800/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {cancelling ? "Cancelling..." : "Cancel Verification"}
          </button>
        )}

        {/* Live frame counter during session */}
        {state?.status === "in_progress" && (
          <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors ${flashFrame ? "border-blue-600/50 bg-blue-950/10" : ""}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Photos Captured</p>
                <p className="text-4xl font-bold font-mono text-blue-300 mt-1">{state.frameCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Capturing every</p>
                <p className="text-lg font-mono text-zinc-300">5s</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: `${Math.min(100, state.frameCount * 10)}%` }} />
            </div>
          </div>
        )}

        {/* Artifact (from API or from WS state) */}
        {(artifact || (state?.status === "verified" && state?.job?.answer)) && (
          <div className="space-y-4">
            {/* Answer */}
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5">
              <p className="text-xs text-emerald-400 uppercase tracking-wider font-medium mb-2">Verified Answer</p>
              <p className="text-lg text-zinc-100 leading-relaxed">{artifact?.answer ?? state?.job?.answer}</p>
            </div>

            {/* Transcript */}
            {(artifact?.transcript ?? state?.job?.transcript) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Session Log</p>
                <pre className="text-sm text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {artifact?.transcript ?? state?.job?.transcript}
                </pre>
              </div>
            )}

            {/* Frame count (when artifact frames aren't available) */}
            {!artifact?.frames?.length && state?.frameCount ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Photo Evidence</p>
                <p className="text-2xl font-bold font-mono text-zinc-300">{state.frameCount} photos</p>
                <p className="text-xs text-zinc-600 mt-1">Captured during verification session</p>
              </div>
            ) : null}

            {/* Photo evidence */}
            {artifact?.frames && artifact.frames.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                    Photo Evidence
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {frameIndex + 1} / {artifact.frames.length}
                  </p>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFrameUrl(artifact.frames[frameIndex].url)}
                    alt={`Evidence frame ${frameIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-xs text-zinc-300 font-mono">
                      {formatTime(artifact.frames[frameIndex].timestamp)}
                    </p>
                  </div>
                </div>

                {/* Thumbnail strip */}
                {artifact.frames.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {artifact.frames.map((frame, i) => (
                      <button
                        key={i}
                        onClick={() => setFrameIndex(i)}
                        className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          i === frameIndex ? "border-indigo-500 opacity-100" : "border-zinc-800 opacity-50 hover:opacity-75"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getFrameUrl(frame.url)}
                          alt={`Thumb ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={prevFrame}
                    disabled={frameIndex === 0}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    &larr; Prev
                  </button>
                  <button
                    onClick={nextFrame}
                    disabled={frameIndex === artifact.frames.length - 1}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connection indicator */}
        <div className="flex items-center justify-between text-xs text-zinc-600 pt-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-red-500"}`} />
            {wsConnected ? "Live updates" : "Reconnecting..."}
          </div>
          <span className="font-mono">{jobId.slice(0, 8)}...</span>
        </div>
      </div>
    </main>
  );
}
