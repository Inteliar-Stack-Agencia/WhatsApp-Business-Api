import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleMetaError, metaRequest } from "../services/metaClient.js";
import {
  MarkMessageAsReadInputSchema,
  SendWhatsAppMediaInputSchema,
  SendWhatsAppMessageInputSchema,
  type MarkMessageAsReadInput,
  type SendWhatsAppMediaInput,
  type SendWhatsAppMessageInput,
} from "../schemas/whatsapp.js";
import type { MetaSendMessageResponse } from "../types.js";

export function registerWhatsAppMessagingTools(server: McpServer): void {
  server.registerTool(
    "whatsapp_send_template_message",
    {
      title: "Enviar mensaje con plantilla de WhatsApp",
      description: `Envía un mensaje de WhatsApp usando una plantilla previamente aprobada por Meta. Es la única forma de iniciar una conversación fuera de la ventana de 24 h de servicio al cliente.

Args:
  - phone_number_id (string): Phone Number ID de Meta desde el que se envía.
  - to (string): número del destinatario en formato E.164 sin '+' (ej: '5491122334455').
  - template_name (string): nombre de una plantilla con status APPROVED.
  - language (string, default 'es_AR'): locale exacto con el que se aprobó la plantilla.
  - parameters (string[], opcional): valores para las variables {{1}}, {{2}}... del body, en orden.

Returns: { message_id, wa_id }

Error Handling:
  - Si la plantilla no está aprobada, Meta devuelve error específico — usá whatsapp_get_template_status para confirmar antes de enviar.
  - Si falta un parámetro requerido por la plantilla, Meta rechaza el envío.`,
      inputSchema: SendWhatsAppMessageInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: SendWhatsAppMessageInput) => {
      try {
        const data = await metaRequest<MetaSendMessageResponse>(
          `/${params.phone_number_id}/messages`,
          "POST",
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: params.to,
            type: "template",
            template: {
              name: params.template_name,
              language: { code: params.language },
              ...(params.parameters && params.parameters.length > 0
                ? {
                    components: [
                      {
                        type: "body",
                        parameters: params.parameters.map((text) => ({ type: "text", text })),
                      },
                    ],
                  }
                : {}),
            },
          }
        );

        const output = {
          message_id: data.messages?.[0]?.id,
          wa_id: data.contacts?.[0]?.wa_id,
        };

        return {
          content: [{ type: "text" as const, text: `Mensaje enviado a ${params.to}. id: ${output.message_id}` }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );

  server.registerTool(
    "whatsapp_send_media",
    {
      title: "Enviar media por WhatsApp",
      description: `Envía una imagen, video, audio o documento por WhatsApp a partir de una URL pública (Meta la descarga directamente, no hace falta subir el archivo antes).

Solo funciona dentro de la ventana de 24 h de servicio al cliente (o como respuesta a un mensaje entrante reciente); para iniciar contacto fuera de esa ventana usá whatsapp_send_template_message.

Args:
  - phone_number_id (string): Phone Number ID desde el que se envía.
  - to (string): número del destinatario en formato E.164 sin '+'.
  - type ('image' | 'video' | 'audio' | 'document')
  - url (string): URL pública y accesible del archivo.
  - caption (string, opcional): texto que acompaña la media (no aplica a audio).

Returns: { message_id, wa_id }

Error Handling:
  - Si la URL no es accesible públicamente o el formato no es soportado, Meta devuelve error descriptivo.`,
      inputSchema: SendWhatsAppMediaInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: SendWhatsAppMediaInput) => {
      try {
        const mediaObject: Record<string, unknown> = { link: params.url };
        if (params.caption && params.type !== "audio") mediaObject.caption = params.caption;

        const data = await metaRequest<MetaSendMessageResponse>(
          `/${params.phone_number_id}/messages`,
          "POST",
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: params.to,
            type: params.type,
            [params.type]: mediaObject,
          }
        );

        const output = {
          message_id: data.messages?.[0]?.id,
          wa_id: data.contacts?.[0]?.wa_id,
        };

        return {
          content: [{ type: "text" as const, text: `${params.type} enviado a ${params.to}. id: ${output.message_id}` }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );

  server.registerTool(
    "whatsapp_mark_message_as_read",
    {
      title: "Marcar mensaje como leído",
      description: `Marca un mensaje entrante como leído (aparecen los tilde azules del lado del contacto).

Args:
  - phone_number_id (string): Phone Number ID dueño de la conversación.
  - message_id (string): wa_message_id del mensaje entrante a marcar.

Returns: { success: true }`,
      inputSchema: MarkMessageAsReadInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: MarkMessageAsReadInput) => {
      try {
        await metaRequest(`/${params.phone_number_id}/messages`, "POST", {
          messaging_product: "whatsapp",
          status: "read",
          message_id: params.message_id,
        });

        return {
          content: [{ type: "text" as const, text: `Mensaje ${params.message_id} marcado como leído.` }],
          structuredContent: { success: true },
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleMetaError(error) }] };
      }
    }
  );
}
