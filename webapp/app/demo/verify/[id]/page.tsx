"use client";

import { useState, use } from "react";
import Link from "next/link";

const MOCK_ARTIFACTS: Record<string, { question: string; answer: string; transcript: string | null; frames: { url: string; timestamp: number }[] }> = {
  "demo-1": {
    question: "Is the AWS vending machine Out of Order right now?",
    answer: "Yes, the vending machine is currently out of order. There's a sign on it that says 'Temporarily Out of Service' and the display is dark.",
    transcript: null,
    frames: [
      { url: "https://placehold.co/800x450/1e293b/64748b?text=Frame+1", timestamp: Date.now() - 300000 },
      { url: "https://placehold.co/800x450/1e293b/64748b?text=Frame+2", timestamp: Date.now() - 295000 },
      { url: "https://placehold.co/800x450/1e293b/64748b?text=Frame+3", timestamp: Date.now() - 290000 },
    ],
  },
  "demo-2": {
    question: "Is the coffee shop on 5th Ave currently open?",
    answer: "Verification in progress...",
    transcript: null,
    frames: [],
  },
  "demo-3": {
    question: "How many Fantas are in the vending machine?",
    answer: "Connecting to verifier...",
    transcript: null,
    frames: [],
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
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

export default function DemoVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const artifact = MOCK_ARTIFACTS[jobId];
  const [frameIndex, setFrameIndex] = useState(0);

  const status = jobId === "demo-1" ? "verified" : jobId === "demo-2" ? "in_progress" : "connecting";
  const statusConfig = STATUS_CONFIG[status];
  const frameCount = jobId === "demo-2" ? 12 : 0;

  const prevFrame = () => setFrameIndex((i) => Math.max(0, i - 1));
  const nextFrame = () => {
    if (!artifact) return;
    setFrameIndex((i) => Math.min(artifact.frames.length - 1, i + 1));
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6" role="main" aria-label="Demo verification">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/demo" className="text-sabi-muted hover:text-sabi-text text-sm transition-colors">
            &larr; Back
          </Link>
          <span className="text-xs text-sabi-warning bg-sabi-warning/20 px-2 py-1 rounded" aria-label="Demo mode">Demo mode</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-sabi-text">Verification</h1>
          <p className="text-sm text-sabi-muted font-mono">{jobId}</p>
        </div>

        {/* Question */}
        <div className="rounded border border-sabi-border bg-sabi-surface p-4">
          <p className="text-sm text-sabi-muted mb-1">Question</p>
          <p className="text-lg text-sabi-text">{artifact?.question ?? "Loading..."}</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${statusConfig.color} animate-pulse`} aria-hidden />
          <div>
            <p className="font-medium text-sabi-text">{statusConfig.label}</p>
            <p className="text-sm text-sabi-muted">{statusConfig.description}</p>
          </div>
        </div>

        {/* Status pipeline (demo never shows cancelled) */}
        <div className="flex items-center gap-2" role="status" aria-label={`Status: ${status}`}>
          {(["connecting", "accepted", "in_progress", "verified"] as const).map(
            (s, i) => {
              const pipeline = ["connecting", "accepted", "in_progress", "verified"] as const;
              const isActive = status === s;
              const isPast = pipeline.indexOf(status) > i;
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
            }
          )}
        </div>

        {/* Live frame count during session */}
        {status === "in_progress" && (
          <div className="rounded border border-sabi-border bg-sabi-surface p-4">
            <p className="text-sm text-sabi-muted">Photos captured</p>
            <p className="text-3xl font-bold font-mono text-sabi-text">{frameCount}</p>
          </div>
        )}

        {/* Artifact review */}
        {artifact && artifact.frames.length > 0 && (
          <div className="space-y-4">
            <div className="rounded border border-sabi-success/40 bg-sabi-success/10 p-4">
              <p className="text-sm text-sabi-success mb-1">Verified Answer</p>
              <p className="text-lg text-sabi-text">{artifact.answer}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-sabi-muted">
                Photo evidence ({frameIndex + 1} of {artifact.frames.length})
              </p>
              <div className="relative aspect-video rounded overflow-hidden bg-sabi-surface border border-sabi-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artifact.frames[frameIndex].url}
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
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-sabi-muted" role="status">
          <span className="h-2 w-2 rounded-full bg-sabi-success" aria-hidden />
          Live
        </div>
      </div>
    </main>
  );
}
