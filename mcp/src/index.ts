#!/usr/bin/env node
/**
 * Inteliar MCP — unifica WhatsApp Business Cloud API, Meta Ads API y el
 * inbox de Inteliar (Supabase) en un único servidor MCP.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { registerWhatsAppTemplateTools } from "./tools/whatsappTemplates.js";
import { registerWhatsAppMessagingTools } from "./tools/whatsappMessaging.js";
import { registerMetaAdsTools } from "./tools/metaAds.js";
import { registerConversationTools } from "./tools/conversations.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "inteliar-mcp",
    version: "1.0.0",
  });

  registerWhatsAppTemplateTools(server);
  registerWhatsAppMessagingTools(server);
  registerMetaAdsTools(server);
  registerConversationTools(server);

  return server;
}

function checkRequiredEnv(): void {
  const missing: string[] = [];
  if (!process.env.META_ACCESS_TOKEN) missing.push("META_ACCESS_TOKEN");
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    console.error(`ERROR: faltan variables de entorno requeridas: ${missing.join(", ")}`);
    console.error("Revisá mcp/.env.example para la lista completa.");
    process.exit(1);
  }
}

async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Inteliar MCP corriendo por stdio");
}

async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    // Stateless: una instancia de server + transport por request.
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3100", 10);
  app.listen(port, () => {
    console.error(`Inteliar MCP corriendo en http://localhost:${port}/mcp`);
  });
}

checkRequiredEnv();

const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHttp().catch((error) => {
    console.error("Error del servidor:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Error del servidor:", error);
    process.exit(1);
  });
}
