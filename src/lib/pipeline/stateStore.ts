import { PipelineRun, AgentRunState } from "./types";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const STORE_PATH = path.join(process.cwd(), ".pipeline-state.json");

const g = global as typeof global & { __pipelineStore?: Map<string, PipelineRun> };
if (!g.__pipelineStore) {
  g.__pipelineStore = new Map<string, PipelineRun>();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const obj = JSON.parse(raw) as Record<string, PipelineRun>;
    for (const [k, v] of Object.entries(obj)) g.__pipelineStore.set(k, v);
  } catch {
    // No state file yet — start fresh
  }
}
const store = g.__pipelineStore;

function persist(): void {
  try {
    const obj = Object.fromEntries(store);
    fs.writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2));
  } catch {}
}

export function hashInput(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

export function createRun(run_id: string, form_input: unknown): PipelineRun {
  const now = new Date().toISOString();
  const run: PipelineRun = {
    run_id,
    status: "PENDING",
    created_at: now,
    updated_at: now,
    form_input,
    agents: {},
  };
  store.set(run_id, run);
  persist();
  return run;
}

export function getRun(run_id: string): PipelineRun | null {
  return store.get(run_id) ?? null;
}

export function updateRunStatus(run_id: string, status: PipelineRun["status"], error?: string): void {
  const run = store.get(run_id);
  if (!run) return;
  run.status = status;
  run.updated_at = new Date().toISOString();
  if (error) run.error = error;
  persist();
}

export function setRunResult(run_id: string, result: unknown): void {
  const run = store.get(run_id);
  if (!run) return;
  run.result = result;
  run.status = "COMPLETED";
  run.updated_at = new Date().toISOString();
  persist();
}

export function upsertAgentState(state: AgentRunState): void {
  const run = store.get(state.run_id);
  if (!run) return;
  run.agents[state.agent_id] = state;
  run.updated_at = new Date().toISOString();
  persist();
}

export function getAgentState(run_id: string, agent_id: string): AgentRunState | null {
  const run = store.get(run_id);
  return run?.agents[agent_id] ?? null;
}

export function listRuns(): Array<Omit<PipelineRun, "result">> {
  return Array.from(store.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(({ result: _omit, ...rest }) => rest);
}
