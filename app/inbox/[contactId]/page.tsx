import ChatWindow from "@/components/ChatWindow";
import ContactPanel from "@/components/ContactPanel";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  return (
    <>
      <ChatWindow conversationId={contactId} />
      <ContactPanel conversationId={contactId} />
    </>
  );
}
