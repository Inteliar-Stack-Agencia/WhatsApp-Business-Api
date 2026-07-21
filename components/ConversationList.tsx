"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LABELS, type Conversation, type ConversationLabel } from "@/lib/types";

type Filter = "all" | Exclude<ConversationLabel, null>;

export default function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const params = useParams<{ contactId?: string }>();
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  const load = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    setConversations((data as Conversation[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Pedir permiso de notificaciones del navegador
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("inbox-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { direction?: string; content?: string };
          if (
            msg.direction === "inbound" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            new Notification("Nuevo mensaje de WhatsApp", {
              body: msg.content ?? "",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function logout() {
    await supabaseRef.current.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const filtered =
    filter === "all" ? conversations : conversations.filter((c) => c.label === filter);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between bg-[var(--wa-green-dark)] px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Inteliar Inbox</h1>
        <button
          onClick={logout}
          className="rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>

      {/* Filtros por etiqueta */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Todos
        </FilterChip>
        {LABELS.map((l) => (
          <FilterChip
            key={l.value}
            active={filter === l.value}
            onClick={() => setFilter(l.value)}
          >
            {l.text}
          </FilterChip>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="p-4 text-sm text-gray-400">Cargando conversaciones…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-400">
            No hay conversaciones todavía. Cuando llegue un mensaje al webhook,
            aparece acá.
          </p>
        )}
        {filtered.map((c) => {
          const active = params?.contactId === c.id;
          const label = LABELS.find((l) => l.value === c.label);
          return (
            <Link
              key={c.id}
              href={`/inbox/${c.id}`}
              className={`flex items-center gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50 ${
                active ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg">
                {(c.contact_name ?? c.contact_phone).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">
                    {c.contact_name ?? `+${c.contact_phone}`}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400">
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-gray-500">
                    {c.last_message ?? ""}
                  </span>
                  {label && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${label.color}`}
                    >
                      {label.text}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-[var(--wa-green)] text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
