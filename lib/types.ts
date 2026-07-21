export type ConversationStatus = "open" | "closed";
export type ConversationLabel = "interesado" | "no_interesado" | "seguimiento" | null;
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface WhatsAppAccount {
  id: string;
  account_name: string;
  phone_number_id: string;
  access_token: string;
  business_account_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  account_id: string | null;
  phone_number_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: ConversationStatus;
  label: ConversationLabel;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: MessageDirection;
  type: string;
  content: string | null;
  status: MessageStatus | null;
  timestamp: string;
}

export const LABELS: { value: Exclude<ConversationLabel, null>; text: string; color: string }[] = [
  { value: "interesado", text: "Interesado", color: "bg-green-100 text-green-800" },
  { value: "seguimiento", text: "Seguimiento", color: "bg-yellow-100 text-yellow-800" },
  { value: "no_interesado", text: "No interesado", color: "bg-red-100 text-red-800" },
];
