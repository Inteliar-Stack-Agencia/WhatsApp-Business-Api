import axios, { AxiosError } from "axios";
import { META_GRAPH_URL } from "../constants.js";

/**
 * Cliente compartido para la Graph API de Meta (WhatsApp Cloud API +
 * Marketing API viven en el mismo grafo). Inyecta el access token en
 * cada request.
 */
export async function metaRequest<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  data?: Record<string, unknown>,
  params?: Record<string, unknown>
): Promise<T> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "META_ACCESS_TOKEN no está configurado. Cargalo como variable de entorno del MCP."
    );
  }

  const response = await axios({
    method,
    url: `${META_GRAPH_URL}${path}`,
    data,
    params: { ...params, access_token: accessToken },
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });
  return response.data as T;
}

/** Traduce errores de la Graph API (que vienen anidados en error.response.data.error) a mensajes accionables. */
export function handleMetaError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error?: { message?: string; type?: string; code?: number; error_subcode?: number };
    }>;
    const metaError = axiosError.response?.data?.error;
    if (metaError) {
      const parts = [`Error de Meta Graph API: ${metaError.message}`];
      if (metaError.code) parts.push(`(code ${metaError.code}${metaError.error_subcode ? `, subcode ${metaError.error_subcode}` : ""})`);
      if (metaError.code === 190) {
        parts.push("→ El access token venció o es inválido. Generá uno nuevo en Meta Business Settings.");
      } else if (metaError.code === 100) {
        parts.push("→ Revisá que los IDs (waba_id, ad_account_id, phone_number_id) sean correctos y que el token tenga permisos sobre ese activo.");
      } else if (metaError.code === 80007) {
        parts.push("→ Rate limit de WhatsApp Business alcanzado. Esperá antes de reintentar.");
      }
      return parts.join(" ");
    }
    if (axiosError.code === "ECONNABORTED") {
      return "Error: la request a Meta tardó demasiado (timeout). Reintentá.";
    }
    return `Error: la Graph API respondió con status ${axiosError.response?.status ?? "desconocido"}.`;
  }
  return `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
}

/** Resuelve un id (waba_id, ad_account_id) contra el valor explícito o un default de entorno. */
export function resolveId(
  explicit: string | undefined,
  fallback: string | undefined,
  label: string
): string {
  const id = explicit || fallback;
  if (!id) {
    throw new Error(
      `Falta ${label}: pasalo como parámetro o configurá su variable de entorno por default.`
    );
  }
  return id;
}
