import { z } from "zod";

export const TemplateCategorySchema = z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]);

export const CreateWhatsAppTemplateInputSchema = z
  .object({
    waba_id: z
      .string()
      .optional()
      .describe(
        "ID de la WhatsApp Business Account donde crear la plantilla. Si se omite, usa META_WABA_ID del entorno."
      ),
    name: z
      .string()
      .min(1)
      .max(512)
      .regex(/^[a-z0-9_]+$/, "El nombre solo puede tener minúsculas, números y guiones bajos")
      .describe("Nombre único de la plantilla (ej: 'seguimiento_lead')"),
    category: TemplateCategorySchema.describe(
      "Categoría de Meta: MARKETING, UTILITY o AUTHENTICATION"
    ),
    language: z
      .string()
      .min(2)
      .describe("Código de idioma/locale de Meta (ej: 'es', 'es_AR', 'en_US')"),
    content: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        "Texto del cuerpo (body) de la plantilla. Usá {{1}}, {{2}}, etc. para variables."
      ),
    parameters: z
      .array(z.string())
      .optional()
      .describe(
        "Valores de ejemplo para cada variable {{n}} del content, en orden (requerido por Meta para aprobar la plantilla)."
      ),
  })
  .strict();
export type CreateWhatsAppTemplateInput = z.infer<typeof CreateWhatsAppTemplateInputSchema>;

export const ListWhatsAppTemplatesInputSchema = z
  .object({
    waba_id: z.string().optional().describe("ID de la WABA. Si se omite, usa META_WABA_ID."),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de plantillas a devolver"),
    after: z.string().optional().describe("Cursor de paginación (paging.cursors.after de la respuesta anterior)"),
  })
  .strict();
export type ListWhatsAppTemplatesInput = z.infer<typeof ListWhatsAppTemplatesInputSchema>;

export const DeleteWhatsAppTemplateInputSchema = z
  .object({
    template_id: z.string().min(1).describe("ID de la plantilla a eliminar (hsm_id)"),
    waba_id: z.string().optional().describe("ID de la WABA. Si se omite, usa META_WABA_ID."),
  })
  .strict();
export type DeleteWhatsAppTemplateInput = z.infer<typeof DeleteWhatsAppTemplateInputSchema>;

export const GetTemplateStatusInputSchema = z
  .object({
    template_id: z.string().min(1).describe("ID de la plantilla a consultar"),
  })
  .strict();
export type GetTemplateStatusInput = z.infer<typeof GetTemplateStatusInputSchema>;

export const SendWhatsAppMessageInputSchema = z
  .object({
    phone_number_id: z.string().min(1).describe("Phone Number ID de Meta desde el que se envía"),
    to: z.string().min(6).describe("Número del destinatario en formato E.164 sin '+' (ej: '5491122334455')"),
    template_name: z.string().min(1).describe("Nombre de una plantilla aprobada por Meta"),
    language: z
      .string()
      .default("es_AR")
      .describe("Locale de la plantilla tal como fue aprobada (ej: 'es_AR', 'en_US')"),
    parameters: z
      .array(z.string())
      .optional()
      .describe("Valores para las variables {{1}}, {{2}}... del body de la plantilla, en orden"),
  })
  .strict();
export type SendWhatsAppMessageInput = z.infer<typeof SendWhatsAppMessageInputSchema>;

export const MediaTypeSchema = z.enum(["image", "video", "audio", "document"]);

export const SendWhatsAppMediaInputSchema = z
  .object({
    phone_number_id: z.string().min(1).describe("Phone Number ID de Meta desde el que se envía"),
    to: z.string().min(6).describe("Número del destinatario en formato E.164 sin '+' "),
    type: MediaTypeSchema.describe("Tipo de media: image, video, audio o document"),
    url: z.string().url().describe("URL pública del archivo a enviar (Meta la descarga directamente)"),
    caption: z.string().optional().describe("Texto opcional que acompaña la media (no aplica a audio)"),
  })
  .strict();
export type SendWhatsAppMediaInput = z.infer<typeof SendWhatsAppMediaInputSchema>;

export const MarkMessageAsReadInputSchema = z
  .object({
    phone_number_id: z
      .string()
      .min(1)
      .describe("Phone Number ID de Meta dueño de la conversación (requerido por la Graph API)"),
    message_id: z.string().min(1).describe("wa_message_id del mensaje entrante a marcar como leído"),
  })
  .strict();
export type MarkMessageAsReadInput = z.infer<typeof MarkMessageAsReadInputSchema>;
