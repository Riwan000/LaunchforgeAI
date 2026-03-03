"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    product_description: "",
    target_market: "",
    pricing: "",
    launch_stage: "MVP" as "MVP" | "Beta" | "Pre-launch",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/dashboard?runId=${data.run_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start pipeline");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">LaunchForge AI</h1>
          <p className="text-purple-200">AI-powered GTM strategy in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-purple-200 font-medium mb-2">Product Description *</label>
            <textarea
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400 h-28 resize-none"
              placeholder="Describe your product or service in detail..."
              value={form.product_description}
              onChange={e => setForm(f => ({ ...f, product_description: e.target.value }))}
              required
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-purple-200 font-medium mb-2">Target Market</label>
            <input
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="e.g. B2B SaaS companies with 50-500 employees"
              value={form.target_market}
              onChange={e => setForm(f => ({ ...f, target_market: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-purple-200 font-medium mb-2">Pricing</label>
              <input
                className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="e.g. $99/mo, Freemium"
                value={form.pricing}
                onChange={e => setForm(f => ({ ...f, pricing: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-purple-200 font-medium mb-2">Launch Stage</label>
              <select
                className="w-full rounded-xl bg-slate-800 border border-white/20 text-white p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.launch_stage}
                onChange={e => setForm(f => ({ ...f, launch_stage: e.target.value as "MVP" | "Beta" | "Pre-launch" }))}
              >
                <option value="MVP">MVP</option>
                <option value="Beta">Beta</option>
                <option value="Pre-launch">Pre-launch</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg shadow-lg"
          >
            {loading ? "Starting pipeline..." : "Generate GTM Strategy"}
          </button>
        </form>
      </div>
    </main>
  );
}
