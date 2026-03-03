import { callLLMJSON } from "../deployai/client";
import { PositioningOutput, ICPOutput, ICPOutputSchema } from "../schemas/v1";

const SYSTEM_PROMPT = `You are an expert in ideal customer profile (ICP) research and B2B/B2C market segmentation. You produce highly specific, data-driven ICP profiles with demographic and psychographic precision.`;

export async function runICPAgent(positioning: PositioningOutput): Promise<ICPOutput> {
  const userMessage = `
Based on this product positioning:
Category: ${positioning.category}
Positioning Statement: ${positioning.positioning_statement}
Value Proposition: ${positioning.value_proposition}
Differentiation: ${positioning.differentiation.join(", ")}

Return a JSON object with MANDATORY specificity on ALL fields — no vague answers:
{
  "schema_version": "1.0",
  "primary_icp": {
    "role": "specific job title",
    "company_size": "specific range",
    "industry": "specific vertical",
    "goals": ["3-4 specific measurable goals"],
    "age_range": "specific range",
    "income_range": "specific range",
    "geography": "specific regions",
    "online_behavior": ["3-5 specific behaviors"],
    "device_preference": "specific device",
    "buying_trigger_moment": "specific trigger",
    "budget_range": "specific range",
    "alternative_products": ["3-4 specific competitors"]
  },
  "secondary_icp": {
    "role": "specific job title",
    "company_size": "specific range",
    "industry": "specific vertical",
    "goals": ["2-3 specific goals"],
    "age_range": "specific range",
    "income_range": "specific range",
    "geography": "specific regions",
    "online_behavior": ["2-3 specific behaviors"],
    "device_preference": "specific device",
    "buying_trigger_moment": "specific trigger",
    "budget_range": "specific range",
    "alternative_products": ["2-3 specific alternatives"]
  },
  "pain_points": ["5-6 specific pain points"],
  "buying_triggers": ["4-5 specific triggers"],
  "objections": ["3-5 specific objections"],
  "willingness_to_pay": "specific price range with justification",
  "channels": ["5-6 specific channels ranked by effectiveness"]
}`;

  const raw = await callLLMJSON<ICPOutput>(SYSTEM_PROMPT, userMessage);
  return ICPOutputSchema.parse({ ...raw, schema_version: "1.0" });
}
