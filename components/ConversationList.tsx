"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LABELS, type Conversation, type ConversationLabel } from "@/lib/types";

type Filter = "all" | Exclude<ConversationLabel, null>;

export default function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    let list = filter === "all" ? conversations : conversations.filter((c) => c.label === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.contact_name ?? "").toLowerCase().includes(q) ||
          c.contact_phone.toLowerCase().includes(q) ||
          (c.last_message ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, filter, search]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold">Todas las conversaciones</span>
        <button
          onClick={logout}
          className="rounded px-2 py-1 text-xs text-[var(--ib-muted)] hover:bg-gray-100"
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>

      {/* Búsqueda */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
          <span className="text-[var(--ib-muted-2)]">⚲</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o mensaje"
            className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-[var(--ib-muted-2)]"
          />
        </div>
      </div>

      {/* Filtros por etiqueta */}
      <div className="flex gap-3 overflow-x-auto border-b border-gray-100 px-4 pb-2 text-xs font-semibold text-[var(--ib-muted)]">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
          Todos {conversations.length}
        </FilterTab>
        {LABELS.map((l) => (
          <FilterTab
            key={l.value}
            active={filter === l.value}
            onClick={() => setFilter(l.value)}
          >
            {l.text} {conversations.filter((c) => c.label === l.value).length}
          </FilterTab>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="p-4 text-sm text-[var(--ib-muted-2)]">Cargando conversaciones…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-[var(--ib-muted-2)]">
            No hay conversaciones que coincidan.
          </p>
        )}
        {filtered.map((c) => {
          const active = params?.contactId === c.id;
          const label = LABELS.find((l) => l.value === c.label);
          return (
            <Link
              key={c.id}
              href={`/inbox/${c.id}`}
              className={`flex items-center gap-2.5 px-3 py-2 mx-1.5 my-0.5 rounded-lg hover:bg-gray-50 ${
                active ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold">
                {(c.contact_name ?? c.contact_phone).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold">
                    {c.contact_name ?? `+${c.contact_phone}`}
                  </span>
                  <span className="ml-2 shrink-0 text-[10px] text-[var(--ib-muted-2)]">
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-[var(--ib-muted)]">
                    {c.last_message ?? ""}
                  </span>
                  {label && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${label.color}`}
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

function FilterTab({
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
      className={`shrink-0 whitespace-nowrap border-b-2 pb-2 ${
        active
          ? "border-[var(--wa-green)] text-[var(--wa-green)]"
          : "border-transparent hover:text-gray-700"
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
