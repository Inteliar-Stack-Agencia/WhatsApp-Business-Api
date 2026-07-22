"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LABELS, type Conversation } from "@/lib/types";

type ConversationWithAccount = Conversation & {
  inbox_accounts: { account_name: string } | null;
};

export default function ContactPanel({ conversationId }: { conversationId: string }) {
  const [conversation, setConversation] = useState<ConversationWithAccount | null>(null);
  const supabaseRef = useRef(createClient());

  const load = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("inbox_conversations")
      .select("*, inbox_accounts(account_name)")
      .eq("id", conversationId)
      .single();
    setConversation((data as ConversationWithAccount) ?? null);
  }, [conversationId]);

  useEffect(() => {
    load();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`contact-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inbox_conversations",
          filter: `id=eq.${conversationId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  async function setLabel(label: string | null) {
    if (!conversation) return;
    setConversation({ ...conversation, label: label as Conversation["label"] });
    await fetch("/api/whatsapp/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversationId, label }),
    });
  }

  if (!conversation) return null;

  const activeLabel = LABELS.find((l) => l.value === conversation.label);

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col gap-3.5 overflow-y-auto xl:flex">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Datos de contacto</span>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold">
            {(conversation.contact_name ?? conversation.contact_phone)
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold">
              {conversation.contact_name ?? `+${conversation.contact_phone}`}
            </div>
            {activeLabel ? (
              <span
                className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold ${activeLabel.color}`}
              >
                {activeLabel.text}
              </span>
            ) : (
              <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                Sin etiqueta
              </span>
            )}
          </div>
        </div>

        <Field label="Teléfono" value={`+${conversation.contact_phone}`} />
        <Field
          label="Estado"
          value={conversation.status === "open" ? "Abierta" : "Cerrada"}
        />
        <Field
          label="Número"
          value={conversation.inbox_accounts?.account_name ?? conversation.phone_number_id}
        />

        <div className="mb-1.5 mt-3 text-[10px] text-[var(--ib-muted-2)]">Etiquetas</div>
        <div className="flex flex-wrap gap-1.5">
          {LABELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLabel(conversation.label === l.value ? null : l.value)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                conversation.label === l.value
                  ? l.color + " ring-1 ring-current"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {l.text}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] text-[var(--ib-muted-2)]">{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}
