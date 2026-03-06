"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVerification } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await createVerification({
        question: question.trim(),
        targetLat: 37.7749,
        targetLng: -122.4194,
        requesterId: "demo-requester",
      });
      router.push(`/verify/${result.job.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Sabi</h1>
          <p className="text-zinc-400 text-lg">
            Get verified, photo-evidenced answers to real-world questions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-zinc-300 mb-2">
              What do you need verified?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. "How many Fantas are left in the vending machine at 123 Main St?"'
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Submitting..." : "Request Verification — $5"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          A nearby verifier with Ray-Ban Metas will go check and send you photo evidence + a vocal answer.
        </p>
      </div>
    </main>
  );
}
