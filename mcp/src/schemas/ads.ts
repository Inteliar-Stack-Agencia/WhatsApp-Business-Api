import { z } from "zod";

// Objetivos ODAX vigentes desde Marketing API v17+ (los "objectives" viejos
// como LINK_CLICKS/CONVERSIONS ya no se aceptan al crear campañas nuevas).
export const CampaignObjectiveSchema = z.enum([
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_APP_PROMOTION",
]);

export const CreateCampaignInputSchema = z
  .object({
    ad_account_id: z
      .string()
      .optional()
      .describe(
        "Ad Account ID sin el prefijo 'act_' (ej: '123456789'). Si se omite, usa META_AD_ACCOUNT_ID."
      ),
    name: z.string().min(1).max(400).describe("Nombre de la campaña"),
    objective: CampaignObjectiveSchema.describe(
      "Objetivo ODAX de Meta Ads (ej: OUTCOME_LEADS para generación de leads)"
    ),
    budget: z
      .number()
      .positive()
      .describe("Presupuesto en la unidad principal de tu moneda de facturación (ej: 50 = $50)"),
    budget_type: z
      .enum(["daily", "lifetime"])
      .default("daily")
      .describe("Si el budget es diario o total de la campaña"),
  })
  .strict();
export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

export const CreateAdSetInputSchema = z
  .object({
    ad_account_id: z
      .string()
      .optional()
      .describe("Ad Account ID sin 'act_'. Si se omite, usa META_AD_ACCOUNT_ID."),
    campaign_id: z.string().min(1).describe("ID de la campaña padre (de create_campaign)"),
    name: z.string().min(1).max(400).optional().describe("Nombre del ad set (default: derivado del campaign_id)"),
    targeting: z
      .record(z.unknown())
      .describe(
        "Objeto de segmentación de Meta. Ejemplo: {\"geo_locations\":{\"countries\":[\"AR\"]},\"age_min\":18,\"age_max\":65}"
      ),
    budget: z.number().positive().describe("Presupuesto diario en la unidad principal de tu moneda"),
    optimization_goal: z
      .string()
      .default("REACH")
      .describe("Meta optimization_goal (ej: REACH, LINK_CLICKS, CONVERSATIONS, LEAD_GENERATION)"),
    billing_event: z
      .string()
      .default("IMPRESSIONS")
      .describe("Meta billing_event (ej: IMPRESSIONS, LINK_CLICKS)"),
  })
  .strict();
export type CreateAdSetInput = z.infer<typeof CreateAdSetInputSchema>;

export const DatePresetSchema = z.enum([
  "today",
  "yesterday",
  "this_week",
  "last_7d",
  "last_14d",
  "last_30d",
  "this_month",
  "last_month",
  "this_quarter",
  "lifetime",
]);

export const GetCampaignInsightsInputSchema = z
  .object({
    campaign_id: z.string().min(1).describe("ID de la campaña"),
    date_preset: DatePresetSchema.default("last_7d").describe("Rango de fechas predefinido de Meta"),
  })
  .strict();
export type GetCampaignInsightsInput = z.infer<typeof GetCampaignInsightsInputSchema>;
