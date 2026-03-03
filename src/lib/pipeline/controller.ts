import { v4 as uuidv4 } from "uuid";
import * as store from "./stateStore";
import { AgentRunState } from "./types";
import { UserFormPayload, PositioningOutput, ICPOutput, DraftTimelineOutput, EnrichedTimelineOutput, ContentOutput } from "../schemas/v1";
import { runPositioningAgent } from "../agents/agent1-positioning";
import { runICPAgent } from "../agents/agent2-icp";
import { runDraftTimelineAgent } from "../agents/agent3a-draftTimeline";
import { runEnrichedTimelineAgent } from "../agents/agent3b-enrichedTimeline";
import { runContentAgent } from "../agents/agent4-content";
import { runValidationAgent } from "../agents/agent5-validation";
import { runGTMAuditAgent } from "../agents/agent6-gtm-audit";

const MAX_RETRIES = parseInt(process.env.AGENT_MAX_RETRIES ?? "3");
const VALIDATION_RETRY_MAX = parseInt(process.env.VALIDATION_RETRY_MAX ?? "2");

async function runWithRetry<T>(
  run_id: string,
  agent_id: string,
  input: unknown,
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let attempt = 0;
  const input_hash = store.hashInput(input);

  while (attempt <= maxRetries) {
    const agentState: AgentRunState = {
      run_id,
      agent_id,
      status: attempt === 0 ? "RUNNING" : "RETRY",
      attempt_count: attempt + 1,
      input_hash,
      output_payload: null,
      timestamp: new Date().toISOString(),
    };
    store.upsertAgentState(agentState);

    try {
      const result = await fn();
      store.upsertAgentState({ ...agentState, status: "SUCCESS", output_payload: result, timestamp: new Date().toISOString() });
      return result;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        store.upsertAgentState({ ...agentState, status: "FAILED_FINAL", timestamp: new Date().toISOString() });
        throw err;
      }
      store.upsertAgentState({ ...agentState, status: "FAILED", timestamp: new Date().toISOString() });
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`${agent_id} exceeded max retries`);
}

export async function startPipeline(payload: UserFormPayload): Promise<string> {
  const run_id = uuidv4();
  store.createRun(run_id, payload);
  store.updateRunStatus(run_id, "RUNNING");

  executePipeline(run_id, payload).catch((err: unknown) => {
    store.updateRunStatus(run_id, "FAILED", String(err));
  });

  return run_id;
}

async function executePipeline(run_id: string, payload: UserFormPayload): Promise<void> {
  const positioning = await runWithRetry<PositioningOutput>(
    run_id, "agent1-positioning", payload,
    () => runPositioningAgent(payload)
  );

  const [icp, draftTimeline] = await Promise.all([
    runWithRetry<ICPOutput>(run_id, "agent2-icp", positioning, () => runICPAgent(positioning)),
    runWithRetry<DraftTimelineOutput>(run_id, "agent3a-draftTimeline", positioning, () => runDraftTimelineAgent(positioning)),
  ]);

  const enrichedTimeline = await runWithRetry<EnrichedTimelineOutput>(
    run_id, "agent3b-enrichedTimeline", { icp, draftTimeline },
    () => runEnrichedTimelineAgent(icp, draftTimeline)
  );

  const content = await runWithRetry<ContentOutput>(
    run_id, "agent4-content", { positioning, icp, enrichedTimeline },
    () => runContentAgent(positioning, icp, enrichedTimeline)
  );

  let validation = await runWithRetry(
    run_id, "agent5-validation", { positioning, icp, enrichedTimeline, content },
    () => runValidationAgent(positioning, icp, enrichedTimeline, content)
  );

  if (validation.tier === "BLOCK") {
    for (let retry = 0; retry < VALIDATION_RETRY_MAX; retry++) {
      const failingAgents = Object.entries(validation.agent_scores)
        .filter(([, score]) => (score as number) < 60)
        .map(([agent]) => agent);

      let newPositioning = positioning;
      let newIcp = icp;
      let newEnrichedTimeline = enrichedTimeline;
      let newContent = content;

      if (failingAgents.includes("positioning")) {
        newPositioning = await runWithRetry<PositioningOutput>(run_id, `agent1-positioning-retry${retry}`, payload, () => runPositioningAgent(payload));
      }
      if (failingAgents.includes("icp")) {
        newIcp = await runWithRetry<ICPOutput>(run_id, `agent2-icp-retry${retry}`, newPositioning, () => runICPAgent(newPositioning));
      }
      if (failingAgents.includes("timeline")) {
        const newDraft = await runWithRetry<DraftTimelineOutput>(run_id, `agent3a-retry${retry}`, newPositioning, () => runDraftTimelineAgent(newPositioning));
        newEnrichedTimeline = await runWithRetry<EnrichedTimelineOutput>(run_id, `agent3b-retry${retry}`, { newIcp, newDraft }, () => runEnrichedTimelineAgent(newIcp, newDraft));
      }
      if (failingAgents.includes("content")) {
        newContent = await runWithRetry<ContentOutput>(run_id, `agent4-retry${retry}`, { newPositioning, newIcp, newEnrichedTimeline }, () => runContentAgent(newPositioning, newIcp, newEnrichedTimeline));
      }

      validation = await runWithRetry(
        run_id, `agent5-validation-retry${retry}`,
        { newPositioning, newIcp, newEnrichedTimeline, newContent },
        () => runValidationAgent(newPositioning, newIcp, newEnrichedTimeline, newContent)
      );

      if (validation.tier !== "BLOCK") {
        Object.assign(positioning, newPositioning);
        Object.assign(icp, newIcp);
        Object.assign(enrichedTimeline, newEnrichedTimeline);
        Object.assign(content, newContent);
        break;
      }
    }
  }

  const gtmAudit = await runWithRetry(
    run_id, "agent6-gtm-audit", { positioning, icp, enrichedTimeline, content, validation },
    () => runGTMAuditAgent(positioning, icp, enrichedTimeline, content, validation)
  );

  const result = { run_id, positioning, icp, timeline: enrichedTimeline, content, validation, gtm_audit: gtmAudit };
  store.setRunResult(run_id, result);
}

export function getPipelineStatus(runId: string) {
  const run = store.getRun(runId);
  if (!run) return null;
  return { status: run.status, agents: run.agents, error: run.error };
}

export function getPipelineResult(runId: string) {
  const run = store.getRun(runId);
  if (!run) return null;
  return run.result ?? null;
}
