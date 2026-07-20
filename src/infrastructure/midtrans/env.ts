function parseBoolean(value: string | undefined) {
  return value === "true";
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getMidtransEnv() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const isProduction = parseBoolean(process.env.MIDTRANS_IS_PRODUCTION);
  const appBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.APP_BASE_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "http://localhost:3000";

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY is missing");
  }

  return {
    serverKey,
    isProduction,
    appBaseUrl,
    snapBaseUrl: isProduction
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com",
  };
}
