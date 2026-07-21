import type { NextRequest } from "next/server";

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getConfiguredAppOrigin() {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? "") ||
    normalizeBaseUrl(process.env.APP_BASE_URL ?? "") ||
    null
  );
}

function getForwardedOrigin(request: NextRequest | Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (!forwardedHost) {
    return null;
  }

  const host = forwardedHost.split(",")[0]?.trim();
  if (!host) {
    return null;
  }

  const proto = (forwardedProto?.split(",")[0]?.trim() || "https").replace(/:$/, "");
  return `${proto}://${host}`;
}

/**
 * Origin publik yang benar untuk redirect OAuth di balik reverse proxy (nginx, Caddy, dll).
 * Prioritas: env APP URL → X-Forwarded-* → request.url
 */
export function getRequestOrigin(request: NextRequest | Request) {
  const configured = getConfiguredAppOrigin();
  if (configured) {
    return configured;
  }

  const forwarded = getForwardedOrigin(request);
  if (forwarded) {
    return forwarded;
  }

  return new URL(request.url).origin;
}
