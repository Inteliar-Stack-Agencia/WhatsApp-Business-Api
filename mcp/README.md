# Inteliar MCP

Servidor MCP que unifica **WhatsApp Business Cloud API**, **Meta Ads API** y el **inbox de Inteliar** (Supabase) en un único set de herramientas. Es lo que Claude usa para operar todo directamente — crear y enviar plantillas, lanzar campañas, leer y etiquetar conversaciones — sin pasar por la UI del inbox.

---

## 🚀 Puesta en marcha

```bash
cd mcp
npm install
cp .env.example .env
# Completá META_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

npm run build
npm start
```

Para desarrollo con auto-reload: `npm run dev`.

### Conectar a Claude Code / Claude Desktop (stdio)

```json
{
  "mcpServers": {
    "inteliar-mcp": {
      "command": "node",
      "args": ["/ruta/absoluta/a/inteliar-inbox/mcp/dist/index.js"],
      "env": {
        "META_ACCESS_TOKEN": "...",
        "META_WABA_ID": "...",
        "META_AD_ACCOUNT_ID": "...",
        "SUPABASE_URL": "https://xeqbapfjosgchkhqwzsh.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}
```

### Correr como servidor remoto (Streamable HTTP)

```bash
TRANSPORT=http PORT=3100 npm start
# POST http://localhost:3100/mcp
```

---

## ⚙️ Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `META_ACCESS_TOKEN` | Sí | Token de sistema con permisos `whatsapp_business_messaging`, `whatsapp_business_management`, `ads_management` |
| `META_API_VERSION` | No | Versión de Graph API (default `v25.0`) |
| `META_WABA_ID` | No | WABA por default para las tools de plantillas, si no se pasa `waba_id` explícito |
| `META_AD_ACCOUNT_ID` | No | Ad Account por default para las tools de Ads, si no se pasa `ad_account_id` explícito |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase donde vive el inbox (`inbox_conversations`, `inbox_messages`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Service role — este server corre server-side y saltea RLS |
| `TRANSPORT` | No | `stdio` (default) o `http` |
| `PORT` | No | Puerto para el transporte HTTP (default `3100`) |

Como la agencia maneja varios clientes/números, `waba_id` y `ad_account_id` también se pueden pasar como parámetro en cada llamada — los env vars son solo el default para el caso más común.

---

## 🛠 Herramientas expuestas

### Plantillas de WhatsApp
| Tool | Qué hace |
|---|---|
| `whatsapp_create_template` | Crea una plantilla para revisión de Meta |
| `whatsapp_list_templates` | Lista plantillas de una WABA, paginado |
| `whatsapp_delete_template` | Elimina una plantilla (irreversible) |
| `whatsapp_get_template_status` | Consulta el estado de aprobación |

### Mensajería de WhatsApp
| Tool | Qué hace |
|---|---|
| `whatsapp_send_template_message` | Envía un mensaje con plantilla aprobada (fuera de la ventana de 24 h) |
| `whatsapp_send_media` | Envía imagen/video/audio/documento por URL |
| `whatsapp_mark_message_as_read` | Marca un mensaje entrante como leído |

### Meta Ads
| Tool | Qué hace |
|---|---|
| `ads_create_campaign` | Crea una campaña (queda **PAUSED** por seguridad) |
| `ads_create_ad_set` | Crea un ad set dentro de una campaña (**PAUSED**) |
| `ads_get_campaign_insights` | Métricas de una campaña por rango de fechas |

### Conversaciones (inbox)
| Tool | Qué hace |
|---|---|
| `inbox_get_conversations` | Lista conversaciones, con filtros por número/estado/etiqueta |
| `inbox_get_conversation_messages` | Mensajes de una conversación |
| `inbox_add_conversation_label` | Etiqueta o desetiqueta una conversación |

---

## ⚠️ Notas de seguridad

- **Campañas y ad sets se crean pausados.** No gastan presupuesto hasta que alguien los active manualmente — evita que un error de un agente queme plata real.
- **`whatsapp_delete_template` es irreversible.** Está marcada con `destructiveHint: true`.
- El `SUPABASE_SERVICE_ROLE_KEY` saltea Row Level Security — este proceso corre en un entorno de confianza (no lo expongas del lado del cliente).
- El proyecto de Supabase (Riweb.app) es compartido con otro producto de la agencia; las tablas del inbox usan el prefijo `inbox_` para no chocar (ver `../supabase/migrations/`).

---

## 📁 Estructura

```
mcp/
├── src/
│   ├── index.ts              # Entry point: registra tools, elige transporte
│   ├── constants.ts
│   ├── types.ts
│   ├── services/
│   │   ├── metaClient.ts     # Cliente HTTP a Graph API + manejo de errores
│   │   └── supabaseClient.ts # Cliente Supabase (service role)
│   ├── schemas/               # Zod schemas por dominio
│   │   ├── whatsapp.ts
│   │   ├── ads.ts
│   │   └── conversations.ts
│   └── tools/                 # Registro de tools por dominio
│       ├── whatsappTemplates.ts
│       ├── whatsappMessaging.ts
│       ├── metaAds.ts
│       └── conversations.ts
└── dist/                       # Build (gitignored)
```
