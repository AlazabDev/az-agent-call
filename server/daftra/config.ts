import process from "node:process";

export interface DaftraConfig {
  baseUrl: string;
  subdomain: string;
  authMode: "apikey" | "bearer";
  apiKey: string;
  accessToken: string;
  timeoutMs: number;
  pageLimit: number;
  isConfigured: boolean;
}

export function getDaftraConfig(): DaftraConfig {
  const subdomain = process.env.DAFTRA_SUBDOMAIN?.trim() || "alazab";
  const apiKey = process.env.DAFTRA_API_KEY?.trim() || "";
  const accessToken = process.env.DAFTRA_ACCESS_TOKEN?.trim() || "";
  const authMode = (process.env.DAFTRA_AUTH_MODE?.trim().toLowerCase() === "bearer" ? "bearer" : "apikey") as "apikey" | "bearer";
  const timeoutMs = parseInt(process.env.DAFTRA_TIMEOUT?.trim() || "30000", 10);
  const pageLimit = parseInt(process.env.DAFTRA_PAGE_LIMIT?.trim() || "50", 10);

  const rawBaseUrl = process.env.DAFTRA_BASE_URL?.trim();
  const baseUrl = rawBaseUrl || `https://${subdomain}.daftra.com/api2`;

  const isConfigured = Boolean(apiKey || accessToken);

  return {
    baseUrl,
    subdomain,
    authMode,
    apiKey,
    accessToken,
    timeoutMs,
    pageLimit,
    isConfigured,
  };
}
