import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// POST { conversationId, text } → envía por Cloud API y guarda el mensaje
export async function POST(req: NextRequest) {
  // Solo usuarios logueados pueden enviar
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const conversationId: string | undefined = body?.conversationId;
  const text: string | undefined = body?.text?.trim();

  if (!conversationId || !text) {
    return NextResponse.json(
      { error: "Faltan conversationId o text" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: conversation, error: convError } = await supabase
    .from("inbox_conversations")
    .select("id, contact_phone, phone_number_id, account_id")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  // Token de la cuenta (multi-cuenta), con fallback al token global del .env
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
  if (conversation.account_id) {
    const { data: account } = await supabase
      .from("inbox_accounts")
      .select("access_token")
      .eq("id", conversation.account_id)
      .single();
    if (account?.access_token) accessToken = account.access_token;
  }
  if (!accessToken) {
    return NextResponse.json(
      { error: "No hay access token configurado para este número" },
      { status: 500 }
    );
  }

  const result = await sendTextMessage(
    conversation.phone_number_id,
    accessToken,
    conversation.contact_phone,
    text
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const now = new Date().toISOString();

  const { data: message, error: msgError } = await supabase
    .from("inbox_messages")
    .insert({
      conversation_id: conversation.id,
      wa_message_id: result.waMessageId ?? null,
      direction: "outbound",
      type: "text",
      content: text,
      status: "sent",
      timestamp: now,
    })
    .select()
    .single();

  if (msgError) {
    console.error("[send] mensaje enviado pero no guardado:", msgError);
  }

  await supabase
    .from("inbox_conversations")
    .update({ last_message: text, last_message_at: now })
    .eq("id", conversation.id);

  return NextResponse.json({ ok: true, message });
}
