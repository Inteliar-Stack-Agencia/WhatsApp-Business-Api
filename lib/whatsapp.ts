// Helper para la Cloud API de Meta (Graph API)

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const GRAPH_URL = "https://graph.facebook.com";

export interface SendTextResult {
  ok: boolean;
  waMessageId?: string;
  error?: string;
}

/**
 * Envía un mensaje de texto por WhatsApp Cloud API.
 * Solo funciona dentro de la ventana de 24 h de servicio al cliente;
 * fuera de esa ventana Meta exige plantillas aprobadas.
 */
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<SendTextResult> {
  const res = await fetch(`${GRAPH_URL}/${API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || `Meta API error ${res.status}`,
    };
  }

  return { ok: true, waMessageId: data?.messages?.[0]?.id };
}

// ── Tipos del payload del webhook de Meta ────────────────

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; caption?: string };
  document?: { id: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string };
  interactive?: { type: string; button_reply?: { title: string }; list_reply?: { title: string } };
  button?: { text: string };
}

export interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: { profile: { name: string }; wa_id: string }[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
}

export interface WebhookPayload {
  object: string;
  entry?: {
    id: string;
    changes?: { field: string; value: WebhookValue }[];
  }[];
}

/** Extrae un texto legible según el tipo de mensaje (para guardar y mostrar en la lista). */
export function extractContent(msg: WebhookMessage): string {
  switch (msg.type) {
    case "text":
      return msg.text?.body ?? "";
    case "image":
      return msg.image?.caption ? `📷 ${msg.image.caption}` : "📷 Imagen";
    case "audio":
      return "🎤 Audio";
    case "video":
      return msg.video?.caption ? `🎬 ${msg.video.caption}` : "🎬 Video";
    case "document":
      return `📄 ${msg.document?.filename ?? "Documento"}`;
    case "location":
      return `📍 ${msg.location?.name ?? "Ubicación"}`;
    case "interactive":
      return (
        msg.interactive?.button_reply?.title ??
        msg.interactive?.list_reply?.title ??
        "Respuesta interactiva"
      );
    case "button":
      return msg.button?.text ?? "Botón";
    default:
      return `[${msg.type}]`;
  }
}
