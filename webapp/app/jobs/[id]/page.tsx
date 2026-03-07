"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getVerificationStatus,
  acceptJob,
  startSession,
  uploadFrame,
  endSession,
  cancelJob,
} from "@/lib/api";
import { getAuth } from "@/lib/auth";

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

async function createPlaceholderJpeg(): Promise<Blob> {
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
  ctx.fillText(`SABI CAPTURE  ${new Date().toLocaleTimeString()}`, 20, 30);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(160, 120, 320, 240);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
  });
}

export default function VerifierSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const router = useRouter();
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
    const auth = getAuth();
    if (!auth) { router.replace("/login"); return; }
  }, [router]);

  useEffect(() => {
    getVerificationStatus(jobId)
      .then((data: { job: JobData; status: string; frameCount?: number }) => {
        setJob(data.job);
        if (data.status === "connecting") setPhase("preview");
        else if (data.status === "accepted") setPhase("accepted");
        else if (data.status === "in_progress") {
          setPhase("capturing");
          setFrameCount(data.frameCount ?? 0);
        } else if (data.status === "verified") setPhase("done");
        else setPhase("preview");
      })
      .catch((e: Error) => {
        setError(e.message);
        setPhase("error");
      });
  }, [jobId]);

  useEffect(() => {
    if (phase === "capturing") {
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleAccept = useCallback(async () => {
    try {
      const auth = getAuth();
      const verifierId = auth?.userId ?? `v_${crypto.randomUUID().slice(0, 8)}`;
      const result = await acceptJob(jobId, verifierId);
      setJob(result);
      setPhase("accepted");
    } catch (e) { setError((e as Error).message); }
  }, [jobId]);

  const handleStart = useCallback(async () => {
    try {
      await startSession(jobId);
      setPhase("capturing");
      setCapturing(true);
      setCaptureLog((prev) => [...prev, `Session started at ${new Date().toLocaleTimeString()}`]);
      captureIntervalRef.current = setInterval(async () => {
        try {
          const blob = await createPlaceholderJpeg();
          const result = await uploadFrame(jobId, blob);
          setFrameCount(result.frameCount);
          setCaptureLog((prev) => [...prev, `Frame #${result.frameCount} captured at ${new Date().toLocaleTimeString()}`]);
        } catch { /* keep going */ }
      }, 5000);
      const blob = await createPlaceholderJpeg();
      const result = await uploadFrame(jobId, blob);
      setFrameCount(result.frameCount);
      setCaptureLog((prev) => [...prev, `Frame #${result.frameCount} captured at ${new Date().toLocaleTimeString()}`]);
    } catch (e) { setError((e as Error).message); }
  }, [jobId]);

  const handleStopCapture = useCallback(() => {
    if (captureIntervalRef.current) { clearInterval(captureIntervalRef.current); captureIntervalRef.current = null; }
    setCapturing(false);
    setPhase("answering");
    setCaptureLog((prev) => [...prev, `Capture stopped at ${new Date().toLocaleTimeString()}`]);
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      await endSession(jobId, answer.trim(), captureLog.join("\n"));
      setPhase("done");
    } catch (e) { setError((e as Error).message); }
    setSubmitting(false);
  }, [jobId, answer, captureLog]);

  const handleCancel = useCallback(async () => {
    if (captureIntervalRef.current) { clearInterval(captureIntervalRef.current); captureIntervalRef.current = null; }
    try { await cancelJob(jobId); window.location.href = "/jobs"; }
    catch (e) { setError((e as Error).message); }
  }, [jobId]);

  useEffect(() => {
    return () => { if (captureIntervalRef.current) clearInterval(captureIntervalRef.current); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center p-6" role="main">
      <div className="w-full max-w-lg space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-sabi-muted hover:text-sabi-text text-sm transition-colors">
          &larr; Jobs
        </Link>

        {error && (
          <div className="rounded border border-sabi-error/50 bg-sabi-error/10 px-4 py-3">
            <p className="text-sm text-sabi-error">{error}</p>
          </div>
        )}

        {job && (
          <div className="rounded border border-sabi-border bg-sabi-surface p-5 space-y-3">
            <p className="text-xs text-sabi-muted uppercase tracking-wider font-medium">Verification Request</p>
            <p className="text-lg font-medium text-sabi-text">{job.question}</p>
            <div className="flex flex-wrap gap-2 text-xs text-sabi-muted">
              <span className="rounded bg-sabi-border px-2.5 py-0.5">{job.category}</span>
              <span className="rounded bg-sabi-border px-2.5 py-0.5">from {job.requester_id}</span>
            </div>
          </div>
        )}

        {phase === "preview" && (
          <div className="space-y-4">
            <div className="rounded border border-sabi-warning/40 bg-sabi-warning/10 p-5 space-y-3">
              <p className="font-medium text-sabi-text">Ready to Accept</p>
              <p className="text-sm text-sabi-muted">
                By accepting, you commit to going to the location and capturing photo evidence.
              </p>
            </div>
            <button type="button" onClick={handleAccept} className="w-full rounded bg-sabi-accent px-4 py-4 text-lg font-semibold text-sabi-bg hover:bg-sabi-accent-hover transition-colors">
              Accept This Job
            </button>
          </div>
        )}

        {phase === "accepted" && (
          <div className="space-y-4">
            <div className="rounded border border-sabi-accent/40 bg-sabi-accent/10 p-5 space-y-4">
              <p className="font-medium text-sabi-text">Job Accepted</p>
              <div className="rounded bg-sabi-surface p-3 text-sm text-sabi-muted space-y-1">
                <p className="text-xs text-sabi-accent uppercase tracking-wider font-medium">Instructions</p>
                <p>1. Go to the location</p>
                <p>2. Press &quot;Start Session&quot; when you arrive</p>
                <p>3. Photos captured every 5 seconds</p>
                <p>4. Stop capture and submit your answer</p>
              </div>
            </div>
            <button type="button" onClick={handleStart} className="w-full rounded bg-sabi-success px-4 py-4 text-lg font-semibold text-sabi-bg hover:opacity-90 transition-colors">
              Start Verification Session
            </button>
            <button type="button" onClick={handleCancel} className="w-full rounded border border-sabi-border px-4 py-2 text-sm text-sabi-muted hover:text-sabi-error hover:border-sabi-error/50 transition-colors">
              Release Job
            </button>
          </div>
        )}

        {phase === "capturing" && (
          <div className="space-y-4">
            <div className="rounded border border-sabi-error/40 bg-sabi-error/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sabi-error opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-sabi-error" /></span>
                  <p className="font-medium text-sabi-text">Recording</p>
                </div>
                <span className="font-mono text-lg text-sabi-text">{formatTime(elapsedSec)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded bg-sabi-surface p-3 text-center">
                  <p className="text-3xl font-bold font-mono text-sabi-inprogress">{frameCount}</p>
                  <p className="text-xs text-sabi-muted mt-1">photos</p>
                </div>
                <div className="rounded bg-sabi-surface p-3 text-center">
                  <p className="text-3xl font-bold font-mono text-sabi-text">{formatTime(elapsedSec)}</p>
                  <p className="text-xs text-sabi-muted mt-1">elapsed</p>
                </div>
              </div>
              {capturing && <p className="text-xs text-sabi-inprogress">Auto-capturing every 5 seconds...</p>}
            </div>
            <div className="rounded border border-sabi-border bg-sabi-surface p-4">
              <p className="text-xs text-sabi-muted uppercase tracking-wider font-medium mb-2">Capture Log</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {captureLog.map((entry, i) => <p key={i} className="text-xs text-sabi-muted font-mono">{entry}</p>)}
              </div>
            </div>
            <button type="button" onClick={handleStopCapture} className="w-full rounded bg-sabi-warning px-4 py-4 text-lg font-semibold text-sabi-bg hover:opacity-90 transition-colors">
              Stop Capture &amp; Write Answer
            </button>
          </div>
        )}

        {phase === "answering" && (
          <div className="space-y-4">
            <div className="rounded border border-sabi-border bg-sabi-surface p-5">
              <p className="text-sm text-sabi-muted">Session complete &middot; {frameCount} photos captured</p>
            </div>
            <div className="space-y-3">
              <label htmlFor="answer" className="block text-sm font-medium text-sabi-text">Your verified answer</label>
              <textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Describe what you observed..." rows={4} autoFocus
                className="w-full rounded border border-sabi-border bg-sabi-surface px-4 py-3 text-sabi-text placeholder:text-sabi-muted focus:outline-none focus:ring-2 focus:ring-sabi-focus focus:border-transparent resize-none" />
              <p className="text-xs text-sabi-muted">Be specific and factual. The requester will see this alongside your photo evidence.</p>
            </div>
            <button type="button" onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting}
              className="w-full rounded bg-sabi-success px-4 py-4 text-lg font-semibold text-sabi-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? "Submitting..." : "Submit Verification"}
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4">
            <div className="rounded border border-sabi-success/40 bg-sabi-success/10 p-6 text-center space-y-3">
              <p className="text-xl font-semibold text-sabi-text">Verification Complete</p>
              <p className="text-sm text-sabi-muted">Your answer and {frameCount} photos have been submitted.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/jobs" className="rounded border border-sabi-border px-4 py-3 text-sm font-medium text-sabi-text hover:bg-sabi-surface transition-colors text-center">
                Find More Jobs
              </Link>
              <Link href={`/verify/${jobId}`} className="rounded bg-sabi-surface border border-sabi-border px-4 py-3 text-sm font-medium text-sabi-text hover:bg-sabi-border transition-colors text-center">
                View as Requester
              </Link>
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div className="text-center py-12" aria-busy="true">
            <p className="text-sm text-sabi-muted">Loading job details...</p>
          </div>
        )}
      </div>
    </main>
  );
}
