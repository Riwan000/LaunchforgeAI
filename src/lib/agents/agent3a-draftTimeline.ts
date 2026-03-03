import { callLLMJSON } from "../deployai/client";
import { PositioningOutput, DraftTimelineOutput, DraftTimelineOutputSchema } from "../schemas/v1";

const SYSTEM_PROMPT = `You are a GTM launch strategist with deep expertise in go-to-market execution, budget planning, and KPI forecasting. You produce highly actionable, budget-grounded timelines.`;

export async function runDraftTimelineAgent(positioning: PositioningOutput): Promise<DraftTimelineOutput> {
  const userMessage = `
Create a detailed GTM launch timeline for:
Category: ${positioning.category}
Positioning: ${positioning.positioning_statement}
Messaging Pillars: ${positioning.messaging_pillars.join(", ")}

Return JSON with 3-4 phases. Each phase MUST include justified KPIs, budget assumptions, and estimated CAC:
{
  "schema_version": "1.0",
  "phases": [
    {
      "name": "phase name",
      "days": "e.g. Days 1-21",
      "activities": ["5-6 specific tactical activities"],
      "kpis": { "metric_name": "specific target value" },
      "kpi_justification": { "metric_name": "why this target is realistic" },
      "budget_assumption": "specific budget with itemization",
      "estimated_cac": "specific CAC with calculation logic"
    }
  ]
}`;

  const raw = await callLLMJSON<DraftTimelineOutput>(SYSTEM_PROMPT, userMessage);
  return DraftTimelineOutputSchema.parse({ ...raw, schema_version: "1.0" });
}
