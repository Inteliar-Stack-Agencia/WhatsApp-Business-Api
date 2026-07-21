-- Inteliar Inbox — esquema inicial
-- Cuentas de WhatsApp Business (multi-cuenta), conversaciones y mensajes.

create extension if not exists "pgcrypto";

-- ── Cuentas de WhatsApp Business (una por cliente / número) ──────────
create table if not exists public.whatsapp_accounts (
  id                  uuid primary key default gen_random_uuid(),
  account_name        text not null,
  phone_number_id     text not null unique,
  access_token        text not null,
  business_account_id text,
  created_at          timestamptz not null default now()
);

comment on table public.whatsapp_accounts is
  'Números de WhatsApp Business conectados a Cloud API. El access_token solo se lee con service role.';

-- ── Conversaciones (una por contacto por número) ─────────────────────
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid references public.whatsapp_accounts (id) on delete set null,
  phone_number_id text not null,
  contact_phone   text not null,
  contact_name    text,
  last_message    text,
  last_message_at timestamptz,
  status          text not null default 'open'
                  check (status in ('open', 'closed')),
  label           text
                  check (label in ('interesado', 'no_interesado', 'seguimiento')),
  created_at      timestamptz not null default now(),
  unique (phone_number_id, contact_phone)
);

create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);
create index if not exists conversations_account_id_idx
  on public.conversations (account_id);

-- ── Mensajes ─────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  wa_message_id   text unique,          -- id de Meta, para dedupe y updates de estado
  direction       text not null check (direction in ('inbound', 'outbound')),
  type            text not null default 'text',
  content         text,
  status          text default 'sent'
                  check (status in ('sent', 'delivered', 'read', 'failed')),
  "timestamp"     timestamptz not null default now()
);

create index if not exists messages_conversation_id_timestamp_idx
  on public.messages (conversation_id, "timestamp");

-- ── Row Level Security ───────────────────────────────────────────────
-- whatsapp_accounts: sin políticas → solo accesible con service role (protege los tokens).
alter table public.whatsapp_accounts enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;

-- Usuarios logueados (equipo Inteliar) pueden leer conversaciones y mensajes.
-- Las escrituras pasan por las API routes con service role.
create policy "authenticated puede leer conversaciones"
  on public.conversations for select
  to authenticated
  using (true);

create policy "authenticated puede leer mensajes"
  on public.messages for select
  to authenticated
  using (true);

-- ── Realtime ─────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
