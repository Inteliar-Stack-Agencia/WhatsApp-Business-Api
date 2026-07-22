import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseClient } from "../services/supabaseClient.js";
import {
  AddConversationLabelInputSchema,
  GetConversationMessagesInputSchema,
  GetConversationsInputSchema,
  type AddConversationLabelInput,
  type GetConversationMessagesInput,
  type GetConversationsInput,
} from "../schemas/conversations.js";
import type { ConversationRow, MessageRow } from "../types.js";

function handleSupabaseError(error: unknown): string {
  if (error instanceof Error) return `Error: ${error.message}`;
  return `Error inesperado: ${String(error)}`;
}

export function registerConversationTools(server: McpServer): void {
  server.registerTool(
    "inbox_get_conversations",
    {
      title: "Listar conversaciones del inbox",
      description: `Lista conversaciones de WhatsApp guardadas en el inbox de Inteliar (Supabase), con filtros opcionales por número, estado y etiqueta de lead.

Args:
  - phone_number_id (string, opcional): filtra por un número de WhatsApp Business. Si se omite, trae de todas las cuentas.
  - status ('open' | 'closed', opcional)
  - label ('interesado' | 'no_interesado' | 'seguimiento', opcional)
  - limit (number, 1-100, default 25)
  - offset (number, default 0)

Returns:
  {
    "total_returned": number,
    "conversations": [{ "id", "contact_phone", "contact_name", "phone_number_id", "status", "label", "last_message", "last_message_at" }],
    "has_more": boolean,
    "next_offset": number | undefined
  }`,
      inputSchema: GetConversationsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetConversationsInput) => {
      try {
        const supabase = getSupabaseClient();
        let query = supabase
          .from("inbox_conversations")
          .select("*", { count: "exact" })
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .range(params.offset, params.offset + params.limit - 1);

        if (params.phone_number_id) query = query.eq("phone_number_id", params.phone_number_id);
        if (params.status) query = query.eq("status", params.status);
        if (params.label) query = query.eq("label", params.label);

        const { data, error, count } = await query;
        if (error) throw new Error(error.message);

        const conversations = (data ?? []) as ConversationRow[];
        const total = count ?? conversations.length;
        const output = {
          total_returned: conversations.length,
          conversations,
          has_more: total > params.offset + conversations.length,
          ...(total > params.offset + conversations.length
            ? { next_offset: params.offset + conversations.length }
            : {}),
        };

        const lines = [`# Conversaciones (${output.total_returned} de ${total})`, ""];
        for (const c of conversations) {
          lines.push(
            `- **${c.contact_name ?? "+" + c.contact_phone}** (${c.id}) — ${c.status}${c.label ? ` — ${c.label}` : ""} — "${c.last_message ?? ""}"`
          );
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleSupabaseError(error) }] };
      }
    }
  );

  server.registerTool(
    "inbox_get_conversation_messages",
    {
      title: "Obtener mensajes de una conversación",
      description: `Trae los mensajes de una conversación del inbox, ordenados del más antiguo al más reciente.

Args:
  - conversation_id (string, uuid)
  - limit (number, 1-200, default 50)
  - offset (number, default 0)

Returns:
  {
    "total_returned": number,
    "messages": [{ "id", "direction", "type", "content", "status", "timestamp" }],
    "has_more": boolean,
    "next_offset": number | undefined
  }`,
      inputSchema: GetConversationMessagesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetConversationMessagesInput) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error, count } = await supabase
          .from("inbox_messages")
          .select("*", { count: "exact" })
          .eq("conversation_id", params.conversation_id)
          .order("timestamp", { ascending: true })
          .range(params.offset, params.offset + params.limit - 1);

        if (error) throw new Error(error.message);

        const messages = (data ?? []) as MessageRow[];
        const total = count ?? messages.length;
        const output = {
          total_returned: messages.length,
          messages,
          has_more: total > params.offset + messages.length,
          ...(total > params.offset + messages.length
            ? { next_offset: params.offset + messages.length }
            : {}),
        };

        const lines = [`# Mensajes (${output.total_returned} de ${total})`, ""];
        for (const m of messages) {
          const arrow = m.direction === "inbound" ? "←" : "→";
          lines.push(`${arrow} [${m.timestamp}] ${m.content ?? `(${m.type})`}`);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleSupabaseError(error) }] };
      }
    }
  );

  server.registerTool(
    "inbox_add_conversation_label",
    {
      title: "Etiquetar conversación",
      description: `Aplica o quita una etiqueta de lead a una conversación del inbox.

Args:
  - conversation_id (string, uuid)
  - label ('interesado' | 'no_interesado' | 'seguimiento' | null): pasá null para quitar la etiqueta actual.

Returns: { conversation_id, label }`,
      inputSchema: AddConversationLabelInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: AddConversationLabelInput) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("inbox_conversations")
          .update({ label: params.label })
          .eq("id", params.conversation_id)
          .select("id, label")
          .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error(`No se encontró la conversación ${params.conversation_id}`);

        const output = { conversation_id: data.id, label: data.label };
        return {
          content: [
            {
              type: "text" as const,
              text: params.label
                ? `Conversación ${params.conversation_id} etiquetada como '${params.label}'.`
                : `Se quitó la etiqueta de la conversación ${params.conversation_id}.`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: handleSupabaseError(error) }] };
      }
    }
  );
}
