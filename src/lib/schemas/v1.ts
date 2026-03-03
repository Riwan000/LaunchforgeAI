import { z } from "zod";

export const SchemaVersion = z.enum(["1.0"]);

export const UserFormPayloadSchema = z.object({
  schema_version: SchemaVersion,
  product_description: z.string().min(10),
  target_market: z.string().optional(),
  pricing: z.string().optional(),
  launch_stage: z.enum(["MVP", "Beta", "Pre-launch"]).optional(),
});

export const ICPProfileSchema = z.object({
  role: z.string(),
  company_size: z.string(),
  industry: z.string(),
  goals: z.array(z.string()),
  age_range: z.string(),
  income_range: z.string(),
  geography: z.string(),
  online_behavior: z.array(z.string()),
  device_preference: z.string(),
  buying_trigger_moment: z.string(),
  budget_range: z.string(),
  alternative_products: z.array(z.string()),
});

export const PositioningOutputSchema = z.object({
  schema_version: SchemaVersion,
  category: z.string(),
  positioning_statement: z.string(),
  differentiation: z.array(z.string()),
  messaging_pillars: z.array(z.string()),
  value_proposition: z.string(),
  taglines: z.array(z.string()),
});

export const ICPOutputSchema = z.object({
  schema_version: SchemaVersion,
  primary_icp: ICPProfileSchema,
  secondary_icp: ICPProfileSchema,
  pain_points: z.array(z.string()),
  buying_triggers: z.array(z.string()),
  objections: z.array(z.string()),
  willingness_to_pay: z.string(),
  channels: z.array(z.string()),
});

export const DraftPhaseSchema = z.object({
  name: z.string(),
  days: z.string(),
  activities: z.array(z.string()),
  kpis: z.record(z.string(), z.string()),
  kpi_justification: z.record(z.string(), z.string()),
  budget_assumption: z.string(),
  estimated_cac: z.string(),
});

export const DraftTimelineOutputSchema = z.object({
  schema_version: SchemaVersion,
  phases: z.array(DraftPhaseSchema),
});

export const EnrichedPhaseSchema = DraftPhaseSchema.extend({
  channels: z.array(z.string()),
  channel_cadence: z.record(z.string(), z.string()),
  channel_phase_logic: z.record(z.string(), z.string()),
  buying_trigger_alignment: z.array(z.string()),
  launch_day_plays: z.array(z.string()).optional(),
});

export const EnrichedTimelineOutputSchema = z.object({
  schema_version: SchemaVersion,
  phases: z.array(EnrichedPhaseSchema),
});

const flexStr = z.preprocess(
  (val) => (typeof val === "string" ? val : val == null ? "" : JSON.stringify(val)),
  z.string()
);
const flexStrArr = z.preprocess(
  (val) => {
    if (Array.isArray(val))
      return val.map((item) => (typeof item === "string" ? item : item == null ? "" : JSON.stringify(item)));
    if (val == null) return [];
    return [typeof val === "string" ? val : JSON.stringify(val)];
  },
  z.array(z.string())
);

export const ContentOutputSchema = z.object({
  schema_version: SchemaVersion,
  linkedin_posts: flexStrArr,
  twitter_threads: flexStrArr,
  short_form_video_scripts: flexStrArr,
  influencer_brief: flexStr,
  email_sequence: flexStrArr,
  launch_countdown_emails: flexStrArr,
  landing_page_headlines: flexStrArr,
  ad_variations: flexStrArr,
  product_demo_script: flexStr,
  ctas: flexStrArr,
});

export const ValidationOutputSchema = z.object({
  schema_version: SchemaVersion,
  validation_score: z.number().min(0).max(100),
  tier: z.enum(["PASS", "WARN", "BLOCK"]),
  flags: z.array(z.string()),
  recommendations: z.array(z.string()),
  agent_scores: z.record(z.string(), z.number()),
});

export const GTMAuditOutputSchema = z.object({
  schema_version: SchemaVersion,
  specificity_score: z.number().min(0).max(100),
  kpi_realism_score: z.number().min(0).max(100),
  channel_differentiation_score: z.number().min(0).max(100),
  positioning_icp_cohesion_score: z.number().min(0).max(100),
  overall_audit_score: z.number().min(0).max(100),
  audit_verdict: z.enum(["STRONG", "ACCEPTABLE", "WEAK"]),
  specificity_notes: z.array(z.string()),
  kpi_realism_notes: z.array(z.string()),
  channel_notes: z.array(z.string()),
  cohesion_notes: z.array(z.string()),
  strategic_recommendations: z.array(z.string()),
});

export type UserFormPayload = z.infer<typeof UserFormPayloadSchema>;
export type PositioningOutput = z.infer<typeof PositioningOutputSchema>;
export type ICPOutput = z.infer<typeof ICPOutputSchema>;
export type DraftTimelineOutput = z.infer<typeof DraftTimelineOutputSchema>;
export type EnrichedTimelineOutput = z.infer<typeof EnrichedTimelineOutputSchema>;
export type ContentOutput = z.infer<typeof ContentOutputSchema>;
export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;
export type GTMAuditOutput = z.infer<typeof GTMAuditOutputSchema>;
