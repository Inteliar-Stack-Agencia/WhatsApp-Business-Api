import ConversationList from "@/components/ConversationList";

// Inbox en vivo: siempre renderizar por request (evita prerender en build,
// donde no existen las env vars de Supabase)
export const dynamic = "force-dynamic";

export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full">
      <aside className="flex w-full max-w-sm flex-col border-r border-gray-200 bg-white md:w-96">
        <ConversationList />
      </aside>
      <main className="hidden flex-1 md:flex">{children}</main>
    </div>
  );
}
