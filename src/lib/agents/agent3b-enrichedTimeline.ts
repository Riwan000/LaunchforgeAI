import { callLLMJSON } from "../deployai/client";
import { ICPOutput, DraftTimelineOutput, EnrichedTimelineOutput, EnrichedTimelineOutputSchema } from "../schemas/v1";

const SYSTEM_PROMPT = `You are a GTM execution expert who enriches launch timelines with ICP-specific channel strategies, phase-level channel logic, and launch-day tactical plays.`;

export async function runEnrichedTimelineAgent(
  icp: ICPOutput,
  draft: DraftTimelineOutput
): Promise<EnrichedTimelineOutput> {
  const userMessage = `
Enrich this draft timeline with ICP-specific channels, cadences, phase logic, and launch-day plays.

ICP Channels: ${icp.channels.join(", ")}
Buying Triggers: ${icp.buying_triggers.join(", ")}
Primary ICP Online Behavior: ${icp.primary_icp.online_behavior.join(", ")}
Buying Trigger Moment: ${icp.primary_icp.buying_trigger_moment}

Draft Timeline:
${JSON.stringify(draft.phases, null, 2)}

Return JSON — preserve ALL existing fields and add enrichment fields:
{
  "schema_version": "1.0",
  "phases": [
    {
      "name": "string",
      "days": "string",
      "activities": ["string array"],
      "kpis": {"metric": "value"},
      "kpi_justification": {"metric": "justification"},
      "budget_assumption": "string",
      "estimated_cac": "string",
      "channels": ["specific channels active in this phase"],
      "channel_cadence": { "channel_name": "specific cadence" },
      "channel_phase_logic": { "channel_name": "WHY this channel is used in THIS phase" },
      "buying_trigger_alignment": ["how each activity maps to a buying trigger"],
      "launch_day_plays": ["ONLY for launch phase — 3 specific tactical plays"]
    }
  ]
}`;

  const raw = await callLLMJSON<EnrichedTimelineOutput>(SYSTEM_PROMPT, userMessage);
  return EnrichedTimelineOutputSchema.parse({ ...raw, schema_version: "1.0" });
}
