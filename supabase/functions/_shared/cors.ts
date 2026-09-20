/**
 * SECURITY.md 2.8 promete "no backend endpoint may allow wildcard origins",
 * mas até agora nenhuma Edge Function chamada pelo navegador existia de
 * verdade para cumprir isso (webhook é Meta->servidor; onboard-tenant nunca
 * chegou a ser invocada pelo frontend). admin-console é a primeira, então a
 * allowlist explícita nasce aqui.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://robowhats-dashboard.muulej.workers.dev",
  "http://localhost:5173",
];

function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("DASHBOARD_ALLOWED_ORIGINS");
  if (configured) {
    return configured.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") || "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}
