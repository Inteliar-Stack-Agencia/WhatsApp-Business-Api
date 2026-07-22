# Inteliar Inbox

Inbox de WhatsApp Business propio de **Inteliar Stack**. Competidor de Wati / Respond.io / Treble: recibe mensajes por webhook de Meta Cloud API, los muestra en un panel tipo WhatsApp Web y permite responder, etiquetar leads y manejar múltiples números (multi-cuenta).

**Stack:** Next.js (App Router) · Supabase (DB + Auth + Realtime) · WhatsApp Cloud API (directa, sin intermediarios).

---

## 🚀 Puesta en marcha

### 1. Instalar y configurar

```bash
npm install
cp .env.local.example .env.local
# Completar con tus claves de Supabase y Meta
```

### 2. Crear las tablas en Supabase

Ejecutá la migración en tu proyecto de Supabase (SQL Editor o CLI):

```bash
# Con Supabase CLI
supabase db push
# O copiá supabase/migrations/20260721000000_whatsapp_conversations.sql al SQL Editor
```

Crea: `inbox_accounts` (multi-cuenta), `inbox_conversations` e `inbox_messages`, con RLS y Realtime habilitados.

> Las tablas llevan el prefijo `inbox_` porque el proyecto de Supabase puede ser compartido con otros productos de la agencia — evita choques de nombres con tablas de otros productos que puedan existir en el mismo proyecto.

### 3. Crear un usuario del equipo

En Supabase → Authentication → Users → *Add user* (email + contraseña). Con eso ya podés loguearte en `/login`.

### 4. Cargar tu número de WhatsApp

Insertá tu cuenta en la tabla `inbox_accounts` (SQL Editor):

```sql
insert into inbox_accounts (account_name, phone_number_id, access_token, business_account_id)
values ('Inteliar Stack', 'TU_PHONE_NUMBER_ID', 'TU_ACCESS_TOKEN', 'TU_WABA_ID');
```

Para más clientes: una fila por número. El webhook enruta solo por `phone_number_id`.

### 5. Configurar el webhook en Meta

1. Deployá (Vercel recomendado) o exponé local con un túnel.
2. En [Meta Developer Console](https://developers.facebook.com) → tu app → WhatsApp → Configuration:
   - **Callback URL:** `https://tu-dominio.com/api/webhooks/whatsapp`
   - **Verify token:** el mismo valor que `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en tu `.env.local`
3. Suscribite al campo **messages**.

### 6. Correr

```bash
npm run dev
# http://localhost:3000 → redirige a /inbox
```

---

## ⚙️ Variables de entorno (`.env.local`)

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (pública, respeta RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (solo servidor — webhook y APIs) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token que elegís vos y cargás igual en Meta |
| `META_APP_SECRET` | App Secret de Meta (valida firma `X-Hub-Signature-256`) |
| `WHATSAPP_ACCESS_TOKEN` | Fallback si el número no está en `inbox_accounts` |
| `WHATSAPP_API_VERSION` | Versión de Graph API (default `v23.0`) |

---

## ✨ Qué hace

- **Webhook de Meta** — Recibe mensajes entrantes (texto, imagen, audio, etc.) y actualizaciones de estado (enviado/entregado/leído). Valida firma y deduplica reintentos.
- **Panel tipo WhatsApp Web** — Lista de conversaciones + chat individual, con tildes de estado.
- **Responder desde el panel** — Envío de texto vía Cloud API (dentro de la ventana de 24 h).
- **Etiquetas de lead** — Interesado / Seguimiento / No interesado, con filtros en la lista.
- **Multi-cuenta** — Varios números de WhatsApp Business (uno por cliente de la agencia); cada cuenta con su propio token en `inbox_accounts`.
- **Realtime** — Mensajes y conversaciones se actualizan en vivo (Supabase Realtime) + notificaciones del navegador.
- **Auth** — Login con Supabase Auth; el panel y las APIs internas están protegidas por middleware. El webhook es público (lo exige Meta) pero validado por firma.

---

## 📁 Estructura

```
app/
├── inbox/
│   ├── layout.tsx               # Layout de dos paneles (lista + chat)
│   ├── page.tsx                 # Estado vacío
│   └── [contactId]/page.tsx     # Chat individual
├── login/page.tsx               # Login (Supabase Auth)
├── api/
│   ├── webhooks/whatsapp/route.ts     # Webhook de Meta (GET verify + POST)
│   └── whatsapp/
│       ├── send/route.ts              # Enviar mensaje
│       └── conversations/route.ts     # Listar / etiquetar / cerrar
components/
├── ConversationList.tsx         # Lista con filtros + realtime + notificaciones
└── ChatWindow.tsx               # Chat con realtime y composer
lib/
├── supabase/                    # Clientes browser / server / admin
├── whatsapp.ts                  # Cloud API + tipos del webhook
└── types.ts
supabase/migrations/
└── 20260721000000_whatsapp_conversations.sql
middleware.ts                    # Protege /inbox y /api/whatsapp/*
```

---

## 🗄 Tablas

Todas prefijadas con `inbox_` porque el proyecto de Supabase es compartido con otro producto de la agencia (Riweb.app) y ese prefijo evita choques de nombres.

- **`inbox_accounts`** — `account_name`, `phone_number_id` (único), `access_token`, `business_account_id`. Sin políticas RLS → solo el servidor lee los tokens.
- **`inbox_conversations`** — Una por contacto por número. `status` (open/closed), `label` (interesado/no_interesado/seguimiento), `last_message`, `account_id`.
- **`inbox_messages`** — `direction` (inbound/outbound), `type`, `content`, `status` (sent/delivered/read/failed), `wa_message_id` (dedupe + tracking de estado).

---

## 🗺 Roadmap

- [ ] Migrar el número actual de la app del celular a Cloud API
- [ ] Envío de plantillas aprobadas (fuera de la ventana de 24 h)
- [ ] Media entrante (descargar imágenes/audio de Meta y mostrarlas)
- [ ] Vista mobile (hoy el panel es desktop-first)
- [ ] Multi-tenant real (organizaciones + roles) para venderlo como SaaS
- [ ] Automatizaciones con Make / n8n
- [ ] Camino a Tech Provider / BSP de Meta

---

## Legacy

`auto.go` + `static/` son el dashboard anterior en Go (self-hosted, SQLite). Queda como referencia; el producto activo es la app Next.js de este README.
