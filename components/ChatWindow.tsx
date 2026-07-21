"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LABELS, type Conversation, type Message } from "@/lib/types";

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
      supabase.from("conversations").select("*").eq("id", conversationId).single(),
      supabase
        .from("messages")
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
          table: "messages",
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
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
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

  async function setLabel(label: string | null) {
    if (!conversation) return;
    setConversation({ ...conversation, label: label as Conversation["label"] });
    await fetch("/api/whatsapp/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversationId, label }),
    });
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 text-sm text-gray-400">
        Cargando conversación…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header del chat */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-lg">
            {(conversation.contact_name ?? conversation.contact_phone)
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <div className="font-medium">
              {conversation.contact_name ?? `+${conversation.contact_phone}`}
            </div>
            <div className="text-xs text-gray-400">+{conversation.contact_phone}</div>
          </div>
        </div>

        {/* Etiquetas de lead */}
        <div className="flex items-center gap-1">
          {LABELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLabel(conversation.label === l.value ? null : l.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                conversation.label === l.value
                  ? l.color + " ring-1 ring-current"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {l.text}
            </button>
          ))}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto bg-[var(--wa-bg-chat)] px-6 py-4">
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
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-gray-400">
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
      <form onSubmit={send} className="flex items-center gap-2 bg-white px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí un mensaje"
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-[var(--wa-green)]"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-full bg-[var(--wa-green)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--wa-green-dark)] disabled:opacity-50"
        >
          {sending ? "…" : "Enviar"}
        </button>
      </form>
      {error && (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
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
