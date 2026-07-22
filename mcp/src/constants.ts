export const META_API_VERSION = process.env.META_API_VERSION || "v25.0";
export const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Límite de caracteres para no saturar el contexto del agente con
// respuestas gigantes (ej. insights de campañas con muchos días).
export const CHARACTER_LIMIT = 25000;

export const DEFAULT_WABA_ID = process.env.META_WABA_ID;
export const DEFAULT_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
