import { callLLMJSON } from "../deployai/client";
import { UserFormPayload, PositioningOutput, PositioningOutputSchema } from "../schemas/v1";

const SYSTEM_PROMPT = `You are a world-class product positioning strategist. Given a product description, analyze and produce a comprehensive positioning strategy.`;

export async function runPositioningAgent(input: UserFormPayload): Promise<PositioningOutput> {
  const userMessage = `
Product Description: ${input.product_description}
Target Market: ${input.target_market ?? "Not specified"}
Pricing: ${input.pricing ?? "Not specified"}
Launch Stage: ${input.launch_stage ?? "Not specified"}

Return a JSON object with exactly this structure:
{
  "schema_version": "1.0",
  "category": "string - product category",
  "positioning_statement": "string - clear positioning statement",
  "differentiation": ["string array - 3-5 key differentiators"],
  "messaging_pillars": ["string array - 3-4 core messaging pillars"],
  "value_proposition": "string - concise value proposition",
  "taglines": ["string array - 3-5 tagline options"]
}`;

  const raw = await callLLMJSON<PositioningOutput>(SYSTEM_PROMPT, userMessage);
  return PositioningOutputSchema.parse({ ...raw, schema_version: "1.0" });
}
