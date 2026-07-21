export default function InboxPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wa-green)] text-3xl text-white">
        💬
      </div>
      <h2 className="text-xl font-semibold">Inteliar Inbox</h2>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Seleccioná una conversación de la izquierda para ver los mensajes y
        responder.
      </p>
    </div>
  );
}
