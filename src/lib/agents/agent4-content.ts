import { callLLMJSON } from "../deployai/client";
import { PositioningOutput, ICPOutput, EnrichedTimelineOutput, ContentOutput, ContentOutputSchema } from "../schemas/v1";

const SYSTEM_PROMPT = `You are a world-class B2B/B2C content strategist and copywriter specializing in product launches. You write channel-native content with distinct tone per platform — no generic copy.`;

function toStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (val == null) return "";
  return JSON.stringify(val);
}

function toStrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(toStr);
  if (val == null) return [];
  return [toStr(val)];
}

export async function runContentAgent(
  positioning: PositioningOutput,
  icp: ICPOutput,
  timeline: EnrichedTimelineOutput
): Promise<ContentOutput> {
  const icpContext = `
Primary ICP: ${icp.primary_icp.role}, ${icp.primary_icp.age_range}, ${icp.primary_icp.geography}
Online Behavior: ${icp.primary_icp.online_behavior.join(", ")}
Device: ${icp.primary_icp.device_preference}
Buying Trigger Moment: ${icp.primary_icp.buying_trigger_moment}
Pain Points: ${icp.pain_points.slice(0, 3).join("; ")}
Alternatives Used: ${icp.primary_icp.alternative_products.join(", ")}`;

  const batchAPromise = callLLMJSON<Partial<ContentOutput>>(SYSTEM_PROMPT, `
Create social media content with DISTINCT tone per platform.

Product: ${positioning.positioning_statement}
Value Prop: ${positioning.value_proposition}
${icpContext}

Return JSON:
{
  "linkedin_posts": ["3 LinkedIn posts, 150-200 words each"],
  "twitter_threads": ["3 Twitter thread openers, max 280 chars each"],
  "short_form_video_scripts": ["3 short-form video scripts (30-45 seconds each)"]
}`);

  const batchBPromise = callLLMJSON<Partial<ContentOutput>>(SYSTEM_PROMPT, `
Create email sequences for a product launch.

Product: ${positioning.positioning_statement}
Value Prop: ${positioning.value_proposition}
Taglines: ${positioning.taglines.join("; ")}
Buying Triggers: ${icp.buying_triggers.join("; ")}
${icpContext}

Return JSON:
{
  "email_sequence": ["Email 1 (Awareness) | Subject: ... | Body: ...", "Email 2 (Consideration) | Subject: ... | Body: ...", "Email 3 (Decision) | Subject: ... | Body: ..."],
  "launch_countdown_emails": ["T-7 days | Subject: ... | CTA: ...", "T-3 days | Subject: ... | CTA: ...", "T-1 day | Subject: ... | CTA: ...", "Launch day | Subject: ... | CTA: ..."]
}`);

  const batchCPromise = callLLMJSON<Partial<ContentOutput>>(SYSTEM_PROMPT, `
Create conversion assets for a product launch.

Product: ${positioning.positioning_statement}
Value Prop: ${positioning.value_proposition}
Taglines: ${positioning.taglines.join("; ")}
Channels: ${timeline.phases[0]?.channels?.join(", ") ?? "digital"}
${icpContext}

Return JSON:
{
  "landing_page_headlines": ["Pain-based headline", "Outcome-based headline", "Curiosity headline", "Social proof headline", "Direct headline"],
  "ad_variations": ["LinkedIn Sponsored | Headline: ... | Body: ...", "Google Search | Headline: ... | Body: ...", "Facebook/Meta | Headline: ... | Body: ...", "YouTube Pre-roll | Headline: ... | Body: ..."],
  "product_demo_script": "HOOK (30s): ... | PROBLEM (30s): ... | SOLUTION (90s): ... | CTA (15s): ...",
  "influencer_brief": "BRAND VOICE: ... | KEY MESSAGES: ... | MUST-MENTION: ... | MUST-AVOID: ...",
  "ctas": ["Free trial CTA", "Demo request CTA", "Waitlist CTA", "Content download CTA", "Social follow CTA", "Referral CTA"]
}`);

  const [batchA, batchB, batchC] = await Promise.all([batchAPromise, batchBPromise, batchCPromise]);

  const merged: ContentOutput = {
    schema_version: "1.0",
    linkedin_posts: toStrArray(batchA.linkedin_posts),
    twitter_threads: toStrArray(batchA.twitter_threads),
    short_form_video_scripts: toStrArray(batchA.short_form_video_scripts),
    email_sequence: toStrArray(batchB.email_sequence),
    launch_countdown_emails: toStrArray(batchB.launch_countdown_emails),
    landing_page_headlines: toStrArray(batchC.landing_page_headlines),
    ad_variations: toStrArray(batchC.ad_variations),
    ctas: toStrArray(batchC.ctas),
    product_demo_script: toStr(batchC.product_demo_script),
    influencer_brief: toStr(batchC.influencer_brief),
  };

  return ContentOutputSchema.parse(merged);
}
