"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Ítems a futuro (roadmap del producto): se muestran para dar contexto de
// hacia dónde va Inteliar Inbox, pero no son funcionales todavía.
const COMING_SOON = [
  { label: "Contactos", icon: "👤" },
  { label: "Negocios", icon: "$" },
  { label: "Tareas", icon: "☑" },
  { label: "Difusión", icon: "▶" },
  { label: "Automatización", icon: "⚙" },
  { label: "Plantillas", icon: "▤" },
  { label: "Analítica", icon: "📶" },
  { label: "Equipo", icon: "👥" },
  { label: "Configuración", icon: "⚙" },
  { label: "Integraciones", icon: "⇄" },
];

export default function Sidebar() {
  const [count, setCount] = useState<number | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    async function loadCount() {
      const { count } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      setCount(count ?? 0);
    }
    loadCount();

    const channel = supabase
      .channel("sidebar-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <nav
      className="hidden w-[210px] shrink-0 flex-col gap-0.5 overflow-y-auto rounded-2xl p-3 text-[#d1d5db] lg:flex"
      style={{ background: "var(--ib-sidebar)" }}
    >
      <div className="mb-2 flex items-center gap-2 px-1.5 py-2 text-sm font-bold text-white">
        <span style={{ color: "var(--wa-green-bright)" }}>◉</span> Inteliar
      </div>

      <Link
        href="/inbox"
        className="flex items-center justify-between rounded-lg px-2.5 py-2 font-bold text-[var(--ib-sidebar)]"
        style={{ background: "var(--wa-green-bright)" }}
      >
        <span className="flex items-center gap-2">💬 Inbox</span>
        {count !== null && (
          <span
            className="rounded-lg px-1.5 text-[10px] font-extrabold"
            style={{ background: "var(--ib-sidebar)", color: "var(--wa-green-bright)" }}
          >
            {count}
          </span>
        )}
      </Link>

      {COMING_SOON.map((item) => (
        <div
          key={item.label}
          title="Próximamente"
          className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-gray-500"
        >
          {item.icon} {item.label}
        </div>
      ))}

      <div className="mt-auto px-2.5 py-2 text-xs text-[var(--ib-muted-2)]">
        ? Ayuda y soporte
      </div>
    </nav>
  );
}
