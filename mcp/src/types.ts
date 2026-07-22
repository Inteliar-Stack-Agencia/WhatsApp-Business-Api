export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  rejected_reason?: string;
  components?: unknown[];
}

export interface WhatsAppTemplateListResponse {
  data: WhatsAppTemplate[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
}

export interface MetaSendMessageResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface MetaCampaignResponse {
  id: string;
}

export interface MetaInsightsRow {
  date_start?: string;
  date_stop?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  reach?: string;
  actions?: { action_type: string; value: string }[];
}

export interface MetaInsightsResponse {
  data: MetaInsightsRow[];
}

export interface ConversationRow {
  id: string;
  account_id: string | null;
  phone_number_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: "open" | "closed";
  label: "interesado" | "no_interesado" | "seguimiento" | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: "inbound" | "outbound";
  type: string;
  content: string | null;
  status: "sent" | "delivered" | "read" | "failed" | null;
  timestamp: string;
}
