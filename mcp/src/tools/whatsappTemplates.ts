import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DEFAULT_WABA_ID } from "../constants.js";
import { handleMetaError, metaRequest, resolveId } from "../services/metaClient.js";
import {
  CreateWhatsAppTemplateInputSchema,
  DeleteWhatsAppTemplateInputSchema,
  GetTemplateStatusInputSchema,
  ListWhatsAppTemplatesInputSchema,
  type CreateWhatsAppTemplateInput,
  type DeleteWhatsAppTemplateInput,
  type GetTemplateStatusInput,
  type ListWhatsAppTemplatesInput,
} from "../schemas/whatsapp.js";
import type { WhatsAppTemplate, WhatsAppTemplateListResponse } from "../types.js";

export function registerWhatsAppTemplateTools(server: McpServer): void {
  server.registerTool(
    "whatsapp_create_template",
    {
      title: "Crear plantilla de WhatsApp",
      description: `Crea una plantilla de mensaje de WhatsApp Business para que Meta la revise y apruebe.

Las plantillas son obligatorias para iniciar conversaciones fuera de la ventana de 24 h de servicio al cliente (ej: primer contacto, recordatorios, seguimientos). Meta tarda entre minutos y horas en aprobarlas — usá get_template_status para chequear el resultado.

Args:
  - waba_id (string, opcional): WhatsApp Business Account donde crearla. Default: META_WABA_ID.
  - name (string): nombre único, solo minúsculas/números/guiones bajos.
  - category ('MARKETING' | 'UTILITY' | 'AUTHENTICATION')
  - language (string): locale de Meta (ej: 'es_AR').
  - content (string): texto del body, con variables {{1}}, {{2}}, etc.
  - parameters (string[], opcional): valores de ejemplo para cada variable, en orden (Meta los exige para aprobar).

Returns: { id, status } de la plantilla creada (status arranca en "PENDING").

Error Handling:
  - Si el nombre ya existe para ese idioma, Meta devuelve un error descriptivo.
  - Si el content tiene {{n}} sin el parámetro de ejemplo correspondiente, Meta rechaza la creación.`,
      inputSchema: CreateWhatsAppTemplateInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateWhatsAppTemplateInput) => {
      try {
        const wabaId = resolveId(params.waba_id, DEFAULT_WABA_ID, "waba_id");

        const components: Record<string, unknown>[] = [
          {
            type: "BODY",
            text: params.content,
            ...(params.parameters && params.parameters.length > 0
              ? { example: { body_text: [params.parameters] } }
              : {}),
          },
        ];

        const data = await metaRequest<{ id: string; status?: string }>(
          `/${wabaId}/message_templates`,
          "POST",
          {
            name: params.name,
            category: params.category,
            language: params.language,
            components,
          }
        );

        const output = { id: data.id, status: data.status ?? "PENDING" };
        return {
          content: [
            {
              type: "text" as const,
              text: `Plantilla '${params.name}' creada con id ${output.id}. Estado: ${output.status}. Usá get_template_status para seguir la aprobación.`,
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
    "whatsapp_list_templates",
    {
      title: "Listar plantillas de WhatsApp",
      description: `Lista las plantillas de mensaje configuradas en una WhatsApp Business Account, con su estado de aprobación.

Args:
  - waba_id (string, opcional): default META_WABA_ID.
  - limit (number, 1-100, default 25)
  - after (string, opcional): cursor de paginación (paging.cursors.after de la respuesta anterior).

Returns:
  {
    "count": number,
    "templates": [{ "id", "name", "category", "language", "status", "rejected_reason"? }],
    "has_more": boolean,
    "next_after": string | undefined
  }`,
      inputSchema: ListWhatsAppTemplatesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListWhatsAppTemplatesInput) => {
      try {
        const wabaId = resolveId(params.waba_id, DEFAULT_WABA_ID, "waba_id");

        const data = await metaRequest<WhatsAppTemplateListResponse>(
          `/${wabaId}/message_templates`,
          "GET",
          undefined,
          {
            limit: params.limit,
            fields: "id,name,category,language,status,rejected_reason",
            ...(params.after ? { after: params.after } : {}),
          }
        );

        const templates = data.data ?? [];
        const output = {
          count: templates.length,
          templates: templates.map((t: WhatsAppTemplate) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            language: t.language,
            status: t.status,
            ...(t.rejected_reason ? { rejected_reason: t.rejected_reason } : {}),
          })),
          has_more: Boolean(data.paging?.next),
          next_after: data.paging?.cursors?.after,
        };

        const lines = [`# Plantillas de WhatsApp (${output.count})`, ""];
        for (const t of output.templates) {
          lines.push(`- **${t.name}** (${t.id}) — ${t.category}/${t.language} — ${t.status}${t.rejected_reason ? ` (${t.rejected_reason})` : ""}`);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );

  server.registerTool(
    "whatsapp_delete_template",
    {
      title: "Eliminar plantilla de WhatsApp",
      description: `Elimina permanentemente una plantilla de mensaje de WhatsApp Business. Esta acción no se puede deshacer.

Args:
  - template_id (string): id de la plantilla (hsm_id).
  - waba_id (string, opcional): default META_WABA_ID.

Returns: { deleted: true, template_id }

Error Handling:
  - Si la plantilla no existe o ya fue borrada, Meta devuelve error 100.`,
      inputSchema: DeleteWhatsAppTemplateInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteWhatsAppTemplateInput) => {
      try {
        const wabaId = resolveId(params.waba_id, DEFAULT_WABA_ID, "waba_id");

        await metaRequest(`/${wabaId}/message_templates`, "DELETE", undefined, {
          hsm_id: params.template_id,
        });

        const output = { deleted: true, template_id: params.template_id };
        return {
          content: [{ type: "text" as const, text: `Plantilla ${params.template_id} eliminada.` }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );

  server.registerTool(
    "whatsapp_get_template_status",
    {
      title: "Consultar estado de plantilla",
      description: `Consulta el estado de aprobación de una plantilla de WhatsApp: APPROVED, PENDING o REJECTED.

Args:
  - template_id (string): id de la plantilla devuelto por whatsapp_create_template o whatsapp_list_templates.

Returns: { id, name, status, category, language, rejected_reason? }`,
      inputSchema: GetTemplateStatusInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetTemplateStatusInput) => {
      try {
        const data = await metaRequest<WhatsAppTemplate>(`/${params.template_id}`, "GET", undefined, {
          fields: "id,name,status,category,language,rejected_reason",
        });

        const output = {
          id: data.id,
          name: data.name,
          status: data.status,
          category: data.category,
          language: data.language,
          ...(data.rejected_reason ? { rejected_reason: data.rejected_reason } : {}),
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `Plantilla '${output.name}': ${output.status}${output.rejected_reason ? ` — ${output.rejected_reason}` : ""}`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );
}
