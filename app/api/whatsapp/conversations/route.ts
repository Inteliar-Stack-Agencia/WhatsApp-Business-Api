import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_LABELS = ["interesado", "no_interesado", "seguimiento", null];
const VALID_STATUSES = ["open", "closed"];

async function requireUser() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

// GET /api/whatsapp/conversations?status=open&label=interesado
export async function GET(req: NextRequest) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("inbox_conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const status = params.get("status");
  if (status && VALID_STATUSES.includes(status)) query = query.eq("status", status);

  const label = params.get("label");
  if (label && VALID_LABELS.includes(label)) query = query.eq("label", label);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversations: data });
}

// PATCH { id, label?, status? } → etiquetar o cerrar/abrir una conversación
export async function PATCH(req: NextRequest) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if ("label" in body) {
    if (!VALID_LABELS.includes(body.label)) {
      return NextResponse.json({ error: "Label inválido" }, { status: 400 });
    }
    updates.label = body.label;
  }
  if ("status" in body) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inbox_conversations")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversation: data });
}
