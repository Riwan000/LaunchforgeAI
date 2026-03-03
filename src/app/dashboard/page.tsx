"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface ICPProfile {
  role: string; company_size: string; industry: string; goals: string[];
  age_range: string; income_range: string; geography: string;
  online_behavior: string[]; device_preference: string;
  buying_trigger_moment: string; budget_range: string; alternative_products: string[];
}

interface TimelinePhase {
  name: string; days: string; activities: string[]; channels: string[];
  kpis: Record<string, string>; kpi_justification: Record<string, string>;
  budget_assumption: string; estimated_cac: string;
  channel_cadence: Record<string, string>; channel_phase_logic: Record<string, string>;
  buying_trigger_alignment: string[]; launch_day_plays?: string[];
}

interface PipelineResult {
  run_id: string;
  positioning: {
    positioning_statement: string; value_proposition: string;
    taglines: string[]; differentiation: string[];
    messaging_pillars: string[]; category: string;
  };
  icp: {
    primary_icp: ICPProfile; secondary_icp: ICPProfile;
    pain_points: string[]; buying_triggers: string[];
    channels: string[]; willingness_to_pay: string; objections: string[];
  };
  timeline: { phases: TimelinePhase[] };
  content: {
    linkedin_posts: string[]; twitter_threads: string[];
    short_form_video_scripts: string[]; influencer_brief: string;
    email_sequence: string[]; launch_countdown_emails: string[];
    landing_page_headlines: string[]; ad_variations: string[];
    product_demo_script: string; ctas: string[];
  };
  validation: {
    validation_score: number; tier: "PASS" | "WARN" | "BLOCK";
    flags: string[]; recommendations: string[];
    agent_scores: Record<string, number>;
  };
  gtm_audit?: {
    specificity_score: number; kpi_realism_score: number;
    channel_differentiation_score: number; positioning_icp_cohesion_score: number;
    overall_audit_score: number; audit_verdict: "STRONG" | "ACCEPTABLE" | "WEAK";
    specificity_notes: string[]; kpi_realism_notes: string[];
    channel_notes: string[]; cohesion_notes: string[];
    strategic_recommendations: string[];
  };
}

interface PipelineStatus {
  status: string;
  agents: Record<string, { status: string; attempt_count: number }>;
  error?: string;
}

const TIER_STYLES = {
  PASS: "bg-green-500/20 text-green-300 border-green-500/50",
  WARN: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  BLOCK: "bg-red-500/20 text-red-300 border-red-500/50",
};
const TIER_ICONS = { PASS: "✅", WARN: "⚠️", BLOCK: "🚫" };

const VERDICT_STYLES = {
  STRONG: "bg-green-500/20 text-green-300 border-green-500/50",
  ACCEPTABLE: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  WEAK: "bg-red-500/20 text-red-300 border-red-500/50",
};
const VERDICT_ICONS = { STRONG: "🏆", ACCEPTABLE: "👍", WEAK: "🔧" };

const AGENT_LABELS: Record<string, string> = {
  "agent1-positioning": "Positioning",
  "agent2-icp": "ICP",
  "agent3a-draftTimeline": "Draft Timeline",
  "agent3b-enrichedTimeline": "Enriched Timeline",
  "agent4-content": "Content",
  "agent5-validation": "Validation",
  "agent6-gtm-audit": "GTM Audit",
};

const TOTAL_AGENTS = 7;

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: "bg-green-400", RUNNING: "bg-yellow-400 animate-pulse",
    RETRY: "bg-orange-400 animate-pulse", FAILED: "bg-red-400",
    FAILED_FINAL: "bg-red-600", PENDING: "bg-gray-400",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] ?? "bg-gray-400"} mr-2 flex-shrink-0`} />;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-purple-200">{label}</span>
        <span className="text-white font-bold">{score}/100</span>
      </div>
      <div className="bg-white/10 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`text-xs px-2 py-1 rounded-lg border transition-colors flex-shrink-0 ${
        copied
          ? "bg-green-500/30 border-green-500/50 text-green-300"
          : "bg-white/5 border-white/20 text-purple-300 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Collapsible({ title, children, defaultOpen = false, copyText }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; copyText?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-purple-300 font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {copyText && open && (
            <span onClick={e => e.stopPropagation()}>
              <CopyButton text={copyText} />
            </span>
          )}
          <span className="text-purple-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && <div className="px-4 pb-4 text-sm text-white">{children}</div>}
    </div>
  );
}

function PipelineProgressBar({ agents }: { agents: Record<string, { status: string; attempt_count: number }> }) {
  const done = Object.values(agents).filter(a => a.status === "SUCCESS").length;
  const pct = Math.round((done / TOTAL_AGENTS) * 100);
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-purple-300 mb-1">
        <span>Overall Progress</span>
        <span>{pct}% — {done}/{TOTAL_AGENTS} agents complete</span>
      </div>
      <div className="bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DashboardContent() {
  const params = useSearchParams();
  const runId = params.get("runId");
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const handleShareUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  };

  const poll = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/pipeline/${runId}/status`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json() as PipelineStatus;
      setStatus(data);
      if (data.status === "COMPLETED") {
        const rRes = await fetch(`/api/pipeline/${runId}/result`);
        if (rRes.ok) {
          const rData = await rRes.json() as PipelineResult;
          setResult(rData);
        }
      } else if (data.status === "FAILED") {
        const failedAgent = Object.entries(data.agents ?? {}).find(([, a]) => a.status === "FAILED_FINAL");
        const agentLabel = failedAgent ? ` (${AGENT_LABELS[failedAgent[0]] ?? failedAgent[0]} agent)` : "";
        setError((data.error ?? "Pipeline failed") + agentLabel);
      }
    } catch {
      setError("Failed to fetch pipeline status. Check your connection.");
    }
  }, [runId]);

  useEffect(() => {
    poll();
    const interval = setInterval(() => { if (result || error || notFound) return; poll(); }, 3000);
    return () => clearInterval(interval);
  }, [poll, result, error, notFound]);

  if (!runId || notFound) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 text-center max-w-md">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Run Not Found</h2>
          <p className="text-purple-300 mb-6">
            {!runId ? "No run ID was specified in the URL." : `Run "${runId}" doesn't exist or has expired.`}
          </p>
          <a href="/" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-block">
            Start New Run
          </a>
        </div>
      </main>
    );
  }

  const tabs = ["Positioning", "ICP", "Timeline", "Content", "Validation", "GTM Audit"];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">LaunchForge AI</h1>
            <p className="text-purple-300 text-xs mt-1 font-mono truncate">Run: {runId}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleShareUrl}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                urlCopied
                  ? "bg-green-500/20 border-green-500/50 text-green-300"
                  : "bg-white/10 border-white/20 text-purple-200 hover:bg-white/20"
              }`}
            >
              {urlCopied ? "✓ Link Copied" : "🔗 Share Run"}
            </button>
            {result && (
              <a
                href={`/api/pipeline/${runId}/pdf`}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
              >
                ⬇ Export PDF
              </a>
            )}
          </div>
        </div>

        {!result && !error && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-6 border border-white/20">
            <h2 className="text-white font-semibold mb-4">Pipeline Progress</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(status?.agents ?? {}).map(([id, agent]) => (
                <div key={id} className="bg-white/5 rounded-xl p-3 flex items-center">
                  <StatusDot status={agent.status} />
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{AGENT_LABELS[id] ?? id}</div>
                    <div className="text-purple-300 text-xs">
                      {agent.status}{agent.attempt_count > 1 ? ` (×${agent.attempt_count})` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PipelineProgressBar agents={status?.agents ?? {}} />
            <p className="mt-3 text-purple-300 text-xs animate-pulse">Running agents… typically 90–120 seconds</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-2xl p-5 mb-6">
            <div className="font-bold mb-1">⚠️ Pipeline Failed</div>
            <div className="text-sm">{error}</div>
            <a href="/" className="inline-block mt-3 text-xs underline text-red-300 hover:text-white">
              ← Start a new run
            </a>
          </div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className={`rounded-2xl p-4 border ${TIER_STYLES[result.validation.tier]} flex items-center gap-4`}>
                <div className="text-4xl font-bold">{result.validation.validation_score}</div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <span>{TIER_ICONS[result.validation.tier]}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${TIER_STYLES[result.validation.tier]}`}>
                      {result.validation.tier}
                    </span>
                    <span>Validation</span>
                  </div>
                  <div className="text-sm opacity-80 mt-0.5">
                    {result.validation.tier === "PASS" ? "High quality GTM package." : result.validation.tier === "WARN" ? "Good with areas to improve." : "Needs significant work before launch."}
                  </div>
                </div>
              </div>
              {result.gtm_audit && (
                <div className={`rounded-2xl p-4 border ${VERDICT_STYLES[result.gtm_audit.audit_verdict]} flex items-center gap-4`}>
                  <div className="text-4xl font-bold">{result.gtm_audit.overall_audit_score}</div>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-lg">
                      <span>{VERDICT_ICONS[result.gtm_audit.audit_verdict]}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${VERDICT_STYLES[result.gtm_audit.audit_verdict]}`}>
                        {result.gtm_audit.audit_verdict}
                      </span>
                      <span>GTM Audit</span>
                    </div>
                    <div className="text-sm opacity-80 mt-0.5">Strategic depth &amp; cohesion</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {tabs.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className={`px-3 md:px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors text-sm ${
                    activeTab === i ? "bg-purple-600 text-white" : "bg-white/10 text-purple-200 hover:bg-white/20"
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              {activeTab === 0 && (
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-bold text-purple-300">Positioning Strategy</h2>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-purple-300 text-sm font-medium">Positioning Statement</div>
                      <CopyButton text={result.positioning.positioning_statement} />
                    </div>
                    <div className="text-lg">{result.positioning.positioning_statement}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-purple-300 text-sm font-medium">Value Proposition</div>
                      <CopyButton text={result.positioning.value_proposition} />
                    </div>
                    <div>{result.positioning.value_proposition}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-purple-300 text-sm font-medium">Taglines</div>
                        <CopyButton text={result.positioning.taglines.join("\n")} />
                      </div>
                      {result.positioning.taglines.map((t, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/10 gap-2">
                          <span className="text-sm flex-1">"{t}"</span>
                          <CopyButton text={t} />
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-medium mb-2">Messaging Pillars</div>
                      {result.positioning.messaging_pillars.map((p, i) => (
                        <div key={i} className="text-sm py-1 border-b border-white/10">— {p}</div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-purple-300 text-sm font-medium mb-2">Differentiation</div>
                    {result.positioning.differentiation.map((d, i) => (
                      <div key={i} className="text-sm py-1">✓ {d}</div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-bold text-purple-300">Ideal Customer Profile</h2>
                  {[{ label: "Primary ICP", data: result.icp.primary_icp }, { label: "Secondary ICP", data: result.icp.secondary_icp }].map(({ label, data }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 font-bold mb-3">{label}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {[
                          ["Role", data.role], ["Industry", data.industry],
                          ["Company", data.company_size], ["Age Range", data.age_range],
                          ["Income", data.income_range], ["Geography", data.geography],
                          ["Device", data.device_preference], ["Budget Range", data.budget_range],
                        ].map(([k, v]) => (
                          <div key={k} className="bg-white/5 rounded-lg p-2">
                            <div className="text-purple-400 text-xs">{k}</div>
                            <div className="text-white mt-0.5">{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-medium mb-2">Pain Points</div>
                      {result.icp.pain_points.map((p, i) => <div key={i} className="text-sm py-1 border-b border-white/10">— {p}</div>)}
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-medium mb-2">Buying Triggers</div>
                      {result.icp.buying_triggers.map((t, i) => <div key={i} className="text-sm py-1 border-b border-white/10">{t}</div>)}
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-purple-300 text-sm font-medium mb-2">Best Channels</div>
                      {result.icp.channels.map((c, i) => <div key={i} className="text-sm py-1 border-b border-white/10">{c}</div>)}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-bold text-purple-300">Launch Timeline</h2>
                  {result.timeline.phases.map((phase, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border-l-4 border-purple-500">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="font-semibold text-lg">{phase.name}</div>
                        <div className="bg-purple-600/40 text-purple-200 text-xs px-3 py-1 rounded-full">{phase.days}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-purple-400 text-xs mb-1">Budget</div>
                          <div>{phase.budget_assumption}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-purple-400 text-xs mb-1">Estimated CAC</div>
                          <div>{phase.estimated_cac}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-purple-400 text-xs mb-1">Channels</div>
                          {phase.channels?.map((c, j) => <div key={j}>{c}</div>)}
                        </div>
                      </div>
                      {phase.launch_day_plays && phase.launch_day_plays.length > 0 && (
                        <div className="mt-4 bg-gradient-to-r from-purple-600/30 to-pink-600/20 rounded-xl p-4 border border-purple-500/40">
                          <div className="flex items-center gap-2 text-purple-200 font-semibold text-sm mb-3">
                            <span className="text-lg">⚡</span> Launch Day Plays
                          </div>
                          {phase.launch_day_plays.map((play, j) => (
                            <div key={j} className="flex items-start gap-2 text-sm py-1">
                              <span className="text-pink-400 mt-0.5 flex-shrink-0">→</span>
                              <span>{play}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-bold text-purple-300">Content &amp; Ad Copy</h2>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-purple-300 font-medium">Landing Page Headlines</div>
                      <CopyButton text={result.content.landing_page_headlines.join("\n")} />
                    </div>
                    {result.content.landing_page_headlines.map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/10 gap-2">
                        <span className="text-sm font-medium flex-1">"{h}"</span>
                        <CopyButton text={h} />
                      </div>
                    ))}
                  </div>
                  <Collapsible title="Ad Variations (4 channels)" defaultOpen={true} copyText={result.content.ad_variations.join("\n\n")}>
                    {result.content.ad_variations.map((a, i) => (
                      <div key={i} className="flex items-start justify-between py-2 border-b border-white/10 gap-2">
                        <span className="flex-1">{a}</span>
                        <CopyButton text={a} />
                      </div>
                    ))}
                  </Collapsible>
                  <Collapsible title="Email Sequence (3 nurture emails)" copyText={result.content.email_sequence.join("\n\n---\n\n")}>
                    {result.content.email_sequence.map((e, i) => (
                      <div key={i} className="py-3 border-b border-white/10">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-purple-300 text-xs font-medium">Email {i + 1}</span>
                          <CopyButton text={e} />
                        </div>
                        <div className="whitespace-pre-line text-sm">{e}</div>
                      </div>
                    ))}
                  </Collapsible>
                  <Collapsible title="LinkedIn Posts" copyText={result.content.linkedin_posts.join("\n\n---\n\n")}>
                    {result.content.linkedin_posts.map((p, i) => (
                      <div key={i} className="py-3 border-b border-white/10">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-purple-300 text-xs font-medium">Post {i + 1}</span>
                          <CopyButton text={p} />
                        </div>
                        <div className="text-sm">{p}</div>
                      </div>
                    ))}
                  </Collapsible>
                  <Collapsible title="Product Demo Script (3-min)" copyText={result.content.product_demo_script}>
                    <div className="whitespace-pre-line">{result.content.product_demo_script}</div>
                  </Collapsible>
                  <Collapsible title="Influencer / Creator Brief" copyText={result.content.influencer_brief}>
                    <div className="whitespace-pre-line">{result.content.influencer_brief}</div>
                  </Collapsible>
                </div>
              )}

              {activeTab === 4 && (
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-bold text-purple-300">Quality Validation</h2>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${TIER_STYLES[result.validation.tier]}`}>
                      {TIER_ICONS[result.validation.tier]} {result.validation.tier}
                    </span>
                    <span className="text-white text-2xl font-bold">{result.validation.validation_score}<span className="text-purple-300 text-base font-normal">/100</span></span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(result.validation.agent_scores).map(([agent, score]) => {
                      const scoreNum = score as number;
                      const tier = scoreNum >= 85 ? "PASS" : scoreNum >= 60 ? "WARN" : "BLOCK";
                      return (
                        <div key={agent} className={`rounded-xl p-4 text-center border ${TIER_STYLES[tier]}`}>
                          <div className="text-2xl font-bold">{scoreNum}</div>
                          <div className="text-xs mt-1 capitalize">{agent}</div>
                          <div className="text-xs mt-1 font-semibold">{TIER_ICONS[tier]} {tier}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 5 && (
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-bold text-purple-300">GTM Strategic Audit</h2>
                  {!result.gtm_audit ? (
                    <div className="text-purple-300 text-sm">GTM Audit not available for this run.</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${VERDICT_STYLES[result.gtm_audit.audit_verdict]}`}>
                          {VERDICT_ICONS[result.gtm_audit.audit_verdict]} {result.gtm_audit.audit_verdict}
                        </span>
                        <span className="text-white text-2xl font-bold">{result.gtm_audit.overall_audit_score}<span className="text-purple-300 text-base font-normal">/100</span></span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-5">
                        <ScoreBar score={result.gtm_audit.specificity_score} label="Specificity (ICP, KPI targets, budget)" />
                        <ScoreBar score={result.gtm_audit.kpi_realism_score} label="KPI Realism (vs. budget & CAC feasibility)" />
                        <ScoreBar score={result.gtm_audit.channel_differentiation_score} label="Channel Differentiation (phase-specific logic)" />
                        <ScoreBar score={result.gtm_audit.positioning_icp_cohesion_score} label="Positioning ICP Cohesion (trigger alignment)" />
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <div className="text-green-300 font-medium mb-2">🎯 Strategic Recommendations</div>
                        {result.gtm_audit.strategic_recommendations.map((r, i) => (
                          <div key={i} className="text-sm py-1 border-b border-white/10">{i + 1}. {r}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚙️</div>
          <div>Loading dashboard…</div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
