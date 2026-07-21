export default function InboxPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-white text-center shadow-sm">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
        style={{ background: "var(--wa-green)" }}
      >
        💬
      </div>
      <h2 className="text-xl font-semibold">Inteliar Inbox</h2>
      <p className="mt-1 max-w-xs text-sm text-[var(--ib-muted)]">
        Seleccioná una conversación de la izquierda para ver los mensajes y
        responder.
      </p>
    </div>
  );
}
