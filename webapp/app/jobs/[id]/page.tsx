"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import {
  getVerificationStatus,
  acceptJob,
  startSession,
  uploadFrame,
  endSession,
  cancelJob,
} from "@/lib/api";

type Phase = "loading" | "preview" | "accepted" | "capturing" | "answering" | "done" | "error";

interface JobData {
  id: string;
  question: string;
  category: string;
  target_lat: number;
  target_lng: number;
  requester_id: string;
  status: string;
  verifier_id: string | null;
}

function getVerifierId(): string {
  if (typeof window === "undefined") return "anon-verifier";
  let id = localStorage.getItem("sabi_verifier_id");
  if (!id) {
    id = `v_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("sabi_verifier_id", id);
  }
  return id;
}

async function createPlaceholderJpegAsync(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d")!;
  const hue = Math.random() * 360;
  const gradient = ctx.createLinearGradient(0, 0, 640, 480);
  gradient.addColorStop(0, `hsl(${hue}, 40%, 25%)`);
  gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 40%, 15%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 640, 480);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "bold 16px monospace";
  const time = new Date().toLocaleTimeString();
  ctx.fillText(`SABI CAPTURE  ${time}`, 20, 30);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(160, 120, 320, 240);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(Math.random() * 600, Math.random() * 440, 40 + Math.random() * 80, 40 + Math.random() * 60);
  }

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
  });
}

export default function VerifierSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [job, setJob] = useState<JobData | null>(null);
  const [error, setError] = useState("");
  const [frameCount, setFrameCount] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [captureLog, setCaptureLog] = useState<string[]>([]);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getVerificationStatus(jobId)
      .then((data) => {
        setJob(data.job);
        if (data.status === "connecting") setPhase("preview");
        else if (data.status === "accepted") setPhase("accepted");
        else if (data.status === "in_progress") {
          setPhase("capturing");
          setFrameCount(data.frameCount ?? 0);
        } else if (data.status === "verified") setPhase("done");
        else setPhase("preview");
      })
      .catch((e) => {
        setError(e.message);
        setPhase("error");
      });
  }, [jobId]);

  useEffect(() => {
    if (phase === "capturing") {
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleAccept = useCallback(async () => {
    try {
      const verifierId = getVerifierId();
      const result = await acceptJob(jobId, verifierId);
      setJob(result);
      setPhase("accepted");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [jobId]);

  const handleStart = useCallback(async () => {
    try {
      await startSession(jobId);
      setPhase("capturing");
      setCapturing(true);
      setCaptureLog((prev) => [...prev, `Session started at ${new Date().toLocaleTimeString()}`]);

      captureIntervalRef.current = setInterval(async () => {
        try {
          const blob = await createPlaceholderJpegAsync();
          const result = await uploadFrame(jobId, blob);
          setFrameCount(result.frameCount);
          setCaptureLog((prev) => [
            ...prev,
            `Frame #${result.frameCount} captured at ${new Date().toLocaleTimeString()}`,
          ]);
        } catch {
          // frame upload failed, keep going
        }
      }, 5000);

      // Upload first frame immediately
      const blob = await createPlaceholderJpegAsync();
      const result = await uploadFrame(jobId, blob);
      setFrameCount(result.frameCount);
      setCaptureLog((prev) => [
        ...prev,
        `Frame #${result.frameCount} captured at ${new Date().toLocaleTimeString()}`,
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [jobId]);

  const handleStopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setCapturing(false);
    setPhase("answering");
    setCaptureLog((prev) => [...prev, `Capture stopped at ${new Date().toLocaleTimeString()}`]);
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      const transcript = captureLog.join("\n");
      await endSession(jobId, answer.trim(), transcript);
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
    }
    setSubmitting(false);
  }, [jobId, answer, captureLog]);

  const handleCancel = useCallback(async () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    try {
      await cancelJob(jobId);
      window.location.href = "/jobs";
    } catch (e) {
      setError((e as Error).message);
    }
  }, [jobId]);

  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          &larr; Jobs
        </Link>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Job info card */}
        {job && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
                  Verification Request
                </p>
                <p className="text-lg font-medium text-zinc-100">{job.question}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5">{job.category}</span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5">
                {job.target_lat.toFixed(4)}°, {job.target_lng.toFixed(4)}°
              </span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5">
                from {job.requester_id}
              </span>
            </div>
          </div>
        )}

        {/* Phase: Preview (before accepting) */}
        {phase === "preview" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                <p className="font-medium text-amber-200">Ready to Accept</p>
              </div>
              <p className="text-sm text-amber-300/70 leading-relaxed">
                By accepting, you commit to physically going to the location and capturing photo evidence.
                You&apos;ll earn credits once the requester reviews your submission.
              </p>
            </div>
            <button
              onClick={handleAccept}
              className="w-full rounded-xl bg-indigo-600 px-4 py-4 text-lg font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Accept This Job
            </button>
            <Link
              href="/jobs"
              className="block text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Back to available jobs
            </Link>
          </div>
        )}

        {/* Phase: Accepted (before starting camera) */}
        {phase === "accepted" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-800/50 bg-indigo-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse" />
                <p className="font-medium text-indigo-200">Job Accepted</p>
              </div>
              <div className="space-y-2 text-sm text-indigo-300/70 leading-relaxed">
                <p>Head to the location and start the verification session when ready.</p>
                <div className="rounded-lg bg-indigo-950/40 p-3 space-y-1">
                  <p className="text-xs text-indigo-400 uppercase tracking-wider font-medium">Instructions</p>
                  <p className="text-indigo-200">
                    1. Go to the location<br />
                    2. Press &quot;Start Session&quot; when you arrive<br />
                    3. Photos will be captured every 5 seconds<br />
                    4. When done, stop capture and submit your answer
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">📷</span> Start Verification Session
            </button>
            <button
              onClick={handleCancel}
              className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-red-400 hover:border-red-800 transition-colors"
            >
              Release Job
            </button>
          </div>
        )}

        {/* Phase: Capturing */}
        {phase === "capturing" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <p className="font-medium text-red-200">Recording</p>
                </div>
                <span className="font-mono text-lg text-zinc-300">{formatTime(elapsedSec)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-900/60 p-3 text-center">
                  <p className="text-3xl font-bold font-mono text-blue-300">{frameCount}</p>
                  <p className="text-xs text-zinc-500 mt-1">photos captured</p>
                </div>
                <div className="rounded-lg bg-zinc-900/60 p-3 text-center">
                  <p className="text-3xl font-bold font-mono text-zinc-300">{formatTime(elapsedSec)}</p>
                  <p className="text-xs text-zinc-500 mt-1">elapsed</p>
                </div>
              </div>

              {capturing && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Auto-capturing every 5 seconds...
                </div>
              )}
            </div>

            {/* Capture log */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Capture Log</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {captureLog.map((entry, i) => (
                  <p key={i} className="text-xs text-zinc-400 font-mono">{entry}</p>
                ))}
              </div>
            </div>

            <button
              onClick={handleStopCapture}
              className="w-full rounded-xl bg-amber-600 px-4 py-4 text-lg font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              Stop Capture &amp; Write Answer
            </button>
          </div>
        )}

        {/* Phase: Answering */}
        {phase === "answering" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
              <p className="text-sm text-zinc-400">Session complete &middot; {frameCount} photos captured</p>
            </div>

            <div className="space-y-3">
              <label htmlFor="answer" className="block text-sm font-medium text-zinc-300">
                Your verified answer
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Describe what you observed..."
                rows={4}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                autoFocus
              />
              <p className="text-xs text-zinc-600">
                Be specific and factual. The requester will see this alongside your photo evidence.
              </p>
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || submitting}
              className="w-full rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Verification"}
            </button>
          </div>
        )}

        {/* Phase: Done */}
        {phase === "done" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-6 text-center space-y-3">
              <div className="text-5xl">✅</div>
              <p className="text-xl font-semibold text-emerald-200">Verification Complete</p>
              <p className="text-sm text-emerald-300/70">
                Your answer and {frameCount} photos have been submitted. The requester will review your evidence.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/jobs"
                className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition-colors text-center"
              >
                Find More Jobs
              </Link>
              <Link
                href={`/verify/${jobId}`}
                className="rounded-xl bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors text-center"
              >
                View as Requester
              </Link>
            </div>
          </div>
        )}

        {/* Phase: Loading */}
        {phase === "loading" && (
          <div className="text-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin mx-auto" />
            <p className="text-sm text-zinc-500 mt-3">Loading job details...</p>
          </div>
        )}
      </div>
    </main>
  );
}
