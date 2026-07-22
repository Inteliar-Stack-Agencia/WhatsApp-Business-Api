import { z } from "zod";

export const GetConversationsInputSchema = z
  .object({
    phone_number_id: z
      .string()
      .optional()
      .describe("Filtrar por un número de WhatsApp Business específico. Si se omite, trae de todas las cuentas."),
    status: z.enum(["open", "closed"]).optional().describe("Filtrar por estado de la conversación"),
    label: z
      .enum(["interesado", "no_interesado", "seguimiento"])
      .optional()
      .describe("Filtrar por etiqueta de lead"),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de conversaciones a devolver"),
    offset: z.number().int().min(0).default(0).describe("Conversaciones a saltear (paginación)"),
  })
  .strict();
export type GetConversationsInput = z.infer<typeof GetConversationsInputSchema>;

export const GetConversationMessagesInputSchema = z
  .object({
    conversation_id: z.string().uuid().describe("ID de la conversación"),
    limit: z.number().int().min(1).max(200).default(50).describe("Máximo de mensajes a devolver"),
    offset: z.number().int().min(0).default(0).describe("Mensajes a saltear (paginación), desde el más antiguo"),
  })
  .strict();
export type GetConversationMessagesInput = z.infer<typeof GetConversationMessagesInputSchema>;

export const AddConversationLabelInputSchema = z
  .object({
    conversation_id: z.string().uuid().describe("ID de la conversación a etiquetar"),
    label: z
      .enum(["interesado", "no_interesado", "seguimiento"])
      .nullable()
      .describe("Etiqueta a aplicar. Pasá null para quitar la etiqueta actual."),
  })
  .strict();
export type AddConversationLabelInput = z.infer<typeof AddConversationLabelInputSchema>;
