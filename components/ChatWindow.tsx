"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LABELS, type Conversation, type Message } from "@/lib/types";

const DISABLED_TABS = ["Detalles", "Notas", "Tareas", "Negocios"];

export default function ChatWindow({ conversationId }: { conversationId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  const load = useCallback(async () => {
    const supabase = supabaseRef.current;
    const [convRes, msgRes] = await Promise.all([
      supabase.from("inbox_conversations").select("*").eq("id", conversationId).single(),
      supabase
        .from("inbox_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("timestamp", { ascending: true }),
    ]);
    setConversation((convRes.data as Conversation) ?? null);
    setMessages((msgRes.data as Message[]) ?? []);
  }, [conversationId]);

  useEffect(() => {
    load();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inbox_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inbox_conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => setConversation(payload.new as Conversation)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, text }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "No se pudo enviar el mensaje");
    } else {
      setDraft("");
      if (data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
        );
      }
    }
    setSending(false);
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--ib-muted-2)]">
        Cargando conversación…
      </div>
    );
  }

  const activeLabel = LABELS.find((l) => l.value === conversation.label);

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl bg-white shadow-sm">
      {/* Header del chat */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold">
          {(conversation.contact_name ?? conversation.contact_phone)
            .charAt(0)
            .toUpperCase()}
        </div>
        <div className="font-bold text-[13px]">
          {conversation.contact_name ?? `+${conversation.contact_phone}`}
        </div>
        {activeLabel && (
          <span
            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${activeLabel.color}`}
          >
            {activeLabel.text}
          </span>
        )}
      </div>

      {/* Tabs (solo Chat es funcional por ahora) */}
      <div className="flex gap-4 border-b border-gray-100 px-4 pt-2.5 text-xs font-semibold">
        <span className="border-b-2 border-[var(--wa-green)] pb-2 text-[var(--wa-green)]">
          Chat
        </span>
        {DISABLED_TABS.map((tab) => (
          <span
            key={tab}
            title="Próximamente"
            className="cursor-not-allowed pb-2 text-gray-300"
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Mensajes */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ background: "var(--wa-bg-chat)" }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-1.5 flex ${
              m.direction === "outbound" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
                m.direction === "outbound" ? "bg-[var(--wa-bubble-out)]" : "bg-white"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[var(--ib-muted-2)]">
                {new Date(m.timestamp).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {m.direction === "outbound" && <StatusTicks status={m.status} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-2.5 px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí un mensaje"
          className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ background: "var(--wa-green)" }}
        >
          {sending ? "…" : "➤"}
        </button>
      </form>
      {error && (
        <p className="rounded-b-2xl bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function StatusTicks({ status }: { status: Message["status"] }) {
  if (status === "failed") return <span className="text-red-500">✕</span>;
  if (status === "read") return <span className="text-sky-500">✓✓</span>;
  if (status === "delivered") return <span>✓✓</span>;
  return <span>✓</span>;
}
