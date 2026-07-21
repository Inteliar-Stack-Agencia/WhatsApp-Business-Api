const FEATURE_BADGES = [
  { icon: "📱", label: "WhatsApp Cloud API" },
  { icon: "👥", label: "Multi-cuenta" },
  { icon: "🏷", label: "Etiquetas de leads" },
  { icon: "⚡", label: "Tiempo real" },
];

export default function InboxHeader() {
  return (
    <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
      <div>
        <div className="text-2xl font-extrabold">
          <span style={{ color: "var(--wa-green)" }}>Inteliar</span> Inbox
        </div>
        <div className="mt-0.5 text-sm text-[var(--ib-muted)]">
          Gestioná conversaciones. Construí relaciones. Hacé crecer tu negocio.
        </div>
      </div>
      <div className="hidden gap-2.5 md:flex">
        {FEATURE_BADGES.map((b) => (
          <div
            key={b.label}
            className="min-w-[110px] rounded-xl bg-white px-4 py-2.5 text-center shadow-sm"
          >
            <div className="text-lg">{b.icon}</div>
            <div className="mt-1 text-[10px] font-semibold leading-tight text-gray-700">
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
