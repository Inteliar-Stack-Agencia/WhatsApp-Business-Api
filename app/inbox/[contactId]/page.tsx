import ChatWindow from "@/components/ChatWindow";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  return <ChatWindow conversationId={contactId} />;
}
