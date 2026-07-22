import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractContent, type WebhookPayload, type WebhookValue } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// ── GET: verificación del webhook (Meta manda hub.challenge) ─────────
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: mensajes entrantes y actualizaciones de estado ─────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Validar firma de Meta si hay APP_SECRET configurado
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const valid =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Responder 200 rápido igual ante errores internos: si no, Meta reintenta
  // y termina desactivando el webhook.
  try {
    const supabase = createAdminClient();
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        await processChange(supabase, change.value);
      }
    }
  } catch (err) {
    console.error("[webhook] error procesando payload:", err);
  }

  return NextResponse.json({ received: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function processChange(supabase: AdminClient, value: WebhookValue) {
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  // Mensajes entrantes
  for (const msg of value.messages ?? []) {
    const contactName =
      value.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name ?? null;
    const content = extractContent(msg);
    const timestamp = new Date(Number(msg.timestamp) * 1000).toISOString();

    // Cuenta asociada (multi-cuenta): puede no existir todavía
    const { data: account } = await supabase
      .from("inbox_accounts")
      .select("id")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();

    // Upsert de la conversación por (phone_number_id, contact_phone)
    const { data: conversation, error: convError } = await supabase
      .from("inbox_conversations")
      .upsert(
        {
          phone_number_id: phoneNumberId,
          contact_phone: msg.from,
          contact_name: contactName ?? undefined,
          account_id: account?.id ?? null,
          last_message: content,
          last_message_at: timestamp,
          status: "open",
        },
        { onConflict: "phone_number_id,contact_phone" }
      )
      .select("id")
      .single();

    if (convError || !conversation) {
      console.error("[webhook] error upsert conversación:", convError);
      continue;
    }

    // Insertar el mensaje (wa_message_id único = dedupe de reintentos de Meta)
    const { error: msgError } = await supabase.from("inbox_messages").upsert(
      {
        conversation_id: conversation.id,
        wa_message_id: msg.id,
        direction: "inbound",
        type: msg.type,
        content,
        status: null,
        timestamp,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true }
    );
    if (msgError) console.error("[webhook] error insert mensaje:", msgError);
  }

  // Actualizaciones de estado (sent / delivered / read / failed)
  for (const st of value.statuses ?? []) {
    const { error } = await supabase
      .from("inbox_messages")
      .update({ status: st.status })
      .eq("wa_message_id", st.id);
    if (error) console.error("[webhook] error update status:", error);
  }
}
