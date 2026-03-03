import { callLLMJSON } from "../deployai/client";
import { PositioningOutput, ICPOutput, EnrichedTimelineOutput, ContentOutput, ValidationOutput, ValidationOutputSchema } from "../schemas/v1";

const SYSTEM_PROMPT = `You are a GTM quality assurance expert. Evaluate the coherence, completeness, and effectiveness of a GTM package.`;

export async function runValidationAgent(
  positioning: PositioningOutput,
  icp: ICPOutput,
  timeline: EnrichedTimelineOutput,
  content: ContentOutput
): Promise<ValidationOutput> {
  const userMessage = `
Validate this complete GTM package for coherence and quality:

POSITIONING: ${positioning.positioning_statement}
VALUE PROP: ${positioning.value_proposition}
PRIMARY ICP: ${icp.primary_icp.role} / ${icp.primary_icp.industry}
TIMELINE PHASES: ${timeline.phases.map(p => p.name).join(", ")}
CONTENT PIECES: ${content.linkedin_posts.length} LinkedIn, ${content.twitter_threads.length} Twitter, ${content.email_sequence.length} emails, ${content.ad_variations.length} ads

Return JSON:
{
  "schema_version": "1.0",
  "validation_score": number,
  "tier": "PASS" or "WARN" or "BLOCK",
  "flags": ["specific issues found"],
  "recommendations": ["actionable improvements"],
  "agent_scores": { "positioning": number, "icp": number, "timeline": number, "content": number }
}`;

  const raw = await callLLMJSON<ValidationOutput>(SYSTEM_PROMPT, userMessage);
  const result = ValidationOutputSchema.parse({ ...raw, schema_version: "1.0" });

  if (result.validation_score >= 85) result.tier = "PASS";
  else if (result.validation_score >= 60) result.tier = "WARN";
  else result.tier = "BLOCK";

  return result;
}
