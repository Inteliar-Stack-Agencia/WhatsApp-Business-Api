import ConversationList from "@/components/ConversationList";
import InboxHeader from "@/components/InboxHeader";
import Sidebar from "@/components/Sidebar";

// Inbox en vivo: siempre renderizar por request (evita prerender en build,
// donde no existen las env vars de Supabase)
export const dynamic = "force-dynamic";

export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full flex-col">
      <InboxHeader />
      <div className="flex flex-1 gap-3 overflow-hidden px-4 pb-4">
        <Sidebar />
        <aside className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-sm md:w-[360px]">
          <ConversationList />
        </aside>
        <main className="hidden flex-1 gap-3 overflow-hidden md:flex">{children}</main>
      </div>
    </div>
  );
}
