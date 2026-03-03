import { callLLMJSON } from "../deployai/client";
import {
  PositioningOutput, ICPOutput, EnrichedTimelineOutput,
  ContentOutput, ValidationOutput, GTMAuditOutput, GTMAuditOutputSchema
} from "../schemas/v1";

const SYSTEM_PROMPT = `You are a senior GTM strategist and launch auditor. You perform rigorous strategic audits of go-to-market packages, scoring them on specificity, KPI realism, channel differentiation, and positioning-ICP cohesion.`;

export async function runGTMAuditAgent(
  positioning: PositioningOutput,
  icp: ICPOutput,
  timeline: EnrichedTimelineOutput,
  content: ContentOutput,
  validation: ValidationOutput
): Promise<GTMAuditOutput> {
  const userMessage = `
Audit this GTM package across 4 strategic dimensions.

Positioning: ${positioning.positioning_statement}
ICP: ${icp.primary_icp.role}, ${icp.primary_icp.buying_trigger_moment}
Timeline phases: ${timeline.phases.map(p => p.name).join(", ")}
Content breadth: ${content.linkedin_posts.length} LinkedIn, ${content.ad_variations.length} ads
Prior validation: ${validation.validation_score}/100 (${validation.tier})

Return JSON:
{
  "schema_version": "1.0",
  "specificity_score": number,
  "kpi_realism_score": number,
  "channel_differentiation_score": number,
  "positioning_icp_cohesion_score": number,
  "overall_audit_score": number,
  "audit_verdict": "STRONG" or "ACCEPTABLE" or "WEAK",
  "specificity_notes": ["2-3 observations"],
  "kpi_realism_notes": ["2-3 observations"],
  "channel_notes": ["2-3 observations"],
  "cohesion_notes": ["2-3 observations"],
  "strategic_recommendations": ["3-5 high-impact improvements"]
}`;

  const raw = await callLLMJSON<GTMAuditOutput>(SYSTEM_PROMPT, userMessage);
  const result = GTMAuditOutputSchema.parse({ ...raw, schema_version: "1.0" });

  if (result.overall_audit_score >= 80) result.audit_verdict = "STRONG";
  else if (result.overall_audit_score >= 60) result.audit_verdict = "ACCEPTABLE";
  else result.audit_verdict = "WEAK";

  return result;
}
