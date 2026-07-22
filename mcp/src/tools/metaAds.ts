import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT, DEFAULT_AD_ACCOUNT_ID } from "../constants.js";
import { handleMetaError, metaRequest, resolveId } from "../services/metaClient.js";
import {
  CreateAdSetInputSchema,
  CreateCampaignInputSchema,
  GetCampaignInsightsInputSchema,
  type CreateAdSetInput,
  type CreateCampaignInput,
  type GetCampaignInsightsInput,
} from "../schemas/ads.js";
import type { MetaCampaignResponse, MetaInsightsResponse } from "../types.js";

export function registerMetaAdsTools(server: McpServer): void {
  server.registerTool(
    "ads_create_campaign",
    {
      title: "Crear campaña de Meta Ads",
      description: `Crea una campaña en Meta Ads (Facebook/Instagram). Se crea en estado PAUSED por seguridad — no gasta presupuesto hasta que la actives manualmente en Ads Manager o via la API.

Args:
  - ad_account_id (string, opcional): sin el prefijo 'act_'. Default: META_AD_ACCOUNT_ID.
  - name (string): nombre de la campaña.
  - objective: uno de OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION.
  - budget (number): presupuesto en la unidad principal de tu moneda (ej: 50 = $50, no centavos).
  - budget_type ('daily' | 'lifetime', default 'daily')

Returns: { id, status: "PAUSED" }

Nota de seguridad: la campaña queda pausada. Para que empiece a gastar hay que activarla explícitamente (fuera del alcance de esta tool).`,
      inputSchema: CreateCampaignInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateCampaignInput) => {
      try {
        const adAccountId = resolveId(params.ad_account_id, DEFAULT_AD_ACCOUNT_ID, "ad_account_id");
        const budgetMinorUnits = Math.round(params.budget * 100);

        const data = await metaRequest<MetaCampaignResponse>(
          `/act_${adAccountId}/campaigns`,
          "POST",
          {
            name: params.name,
            objective: params.objective,
            status: "PAUSED",
            special_ad_categories: [],
            ...(params.budget_type === "daily"
              ? { daily_budget: budgetMinorUnits }
              : { lifetime_budget: budgetMinorUnits }),
          }
        );

        const output = { id: data.id, status: "PAUSED" as const };
        return {
          content: [
            {
              type: "text" as const,
              text: `Campaña '${params.name}' creada (id ${output.id}), estado PAUSED. Activala en Ads Manager cuando esté lista.`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );

  server.registerTool(
    "ads_create_ad_set",
    {
      title: "Crear ad set de Meta Ads",
      description: `Crea un ad set (conjunto de anuncios) dentro de una campaña existente. Se crea en estado PAUSED por seguridad.

Args:
  - ad_account_id (string, opcional): default META_AD_ACCOUNT_ID.
  - campaign_id (string): id de la campaña padre (de ads_create_campaign).
  - name (string, opcional): default derivado del campaign_id.
  - targeting (object): spec de segmentación de Meta, ej: {"geo_locations":{"countries":["AR"]},"age_min":18,"age_max":65}.
  - budget (number): presupuesto diario en la unidad principal de tu moneda.
  - optimization_goal (string, default 'REACH'): ej. REACH, LINK_CLICKS, CONVERSATIONS, LEAD_GENERATION.
  - billing_event (string, default 'IMPRESSIONS')

Returns: { id, status: "PAUSED" }

Error Handling:
  - Si el targeting tiene una forma inválida para el objective de la campaña, Meta devuelve un error descriptivo con el campo problemático.`,
      inputSchema: CreateAdSetInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateAdSetInput) => {
      try {
        const adAccountId = resolveId(params.ad_account_id, DEFAULT_AD_ACCOUNT_ID, "ad_account_id");
        const budgetMinorUnits = Math.round(params.budget * 100);
        const name = params.name ?? `Ad Set - ${params.campaign_id}`;

        const data = await metaRequest<MetaCampaignResponse>(`/act_${adAccountId}/adsets`, "POST", {
          name,
          campaign_id: params.campaign_id,
          daily_budget: budgetMinorUnits,
          billing_event: params.billing_event,
          optimization_goal: params.optimization_goal,
          targeting: params.targeting,
          status: "PAUSED",
        });

        const output = { id: data.id, status: "PAUSED" as const };
        return {
          content: [
            { type: "text" as const, text: `Ad set '${name}' creado (id ${output.id}), estado PAUSED.` },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );

  server.registerTool(
    "ads_get_campaign_insights",
    {
      title: "Obtener métricas de una campaña",
      description: `Trae métricas de rendimiento (impresiones, clicks, gasto, CTR, CPC, reach, acciones) de una campaña de Meta Ads en un rango de fechas predefinido.

Args:
  - campaign_id (string)
  - date_preset: today, yesterday, this_week, last_7d, last_14d, last_30d, this_month, last_month, this_quarter, lifetime (default 'last_7d')

Returns:
  {
    "campaign_id": string,
    "date_preset": string,
    "rows": [{ "date_start", "date_stop", "impressions", "clicks", "spend", "ctr", "cpc", "reach", "actions"? }]
  }`,
      inputSchema: GetCampaignInsightsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetCampaignInsightsInput) => {
      try {
        const data = await metaRequest<MetaInsightsResponse>(
          `/${params.campaign_id}/insights`,
          "GET",
          undefined,
          {
            date_preset: params.date_preset,
            fields: "impressions,clicks,spend,ctr,cpc,reach,actions,date_start,date_stop",
          }
        );

        const rows = data.data ?? [];
        const output = { campaign_id: params.campaign_id, date_preset: params.date_preset, rows };

        let text = JSON.stringify(output, null, 2);
        if (text.length > CHARACTER_LIMIT) {
          text = `Respuesta truncada (${rows.length} filas). Usá un date_preset más acotado.\n\n${text.slice(0, CHARACTER_LIMIT)}`;
        }

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );
}
