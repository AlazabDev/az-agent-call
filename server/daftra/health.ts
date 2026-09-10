import { getDaftraConfig } from "./config.js";
import { daftraClient } from "./client.js";

export interface DaftraHealthStatus {
  configured: boolean;
  subdomain: string;
  baseUrl: string;
  authMode: string;
  reachable: boolean;
  authenticated: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkDaftraHealth(): Promise<DaftraHealthStatus> {
  const config = getDaftraConfig();

  if (!config.isConfigured) {
    return {
      configured: false,
      subdomain: config.subdomain,
      baseUrl: config.baseUrl,
      authMode: config.authMode,
      reachable: false,
      authenticated: false,
      error: "Daftra API credentials not configured in environment",
    };
  }

  const start = Date.now();
  try {
    // Light ping against Daftra API clients endpoint with limit=1
    await daftraClient.get("/api2/clients.json", { limit: 1 });
    const latencyMs = Date.now() - start;

    return {
      configured: true,
      subdomain: config.subdomain,
      baseUrl: config.baseUrl,
      authMode: config.authMode,
      reachable: true,
      authenticated: true,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      configured: true,
      subdomain: config.subdomain,
      baseUrl: config.baseUrl,
      authMode: config.authMode,
      reachable: err.code !== "DAFTRA_TIMEOUT" && err.code !== "DAFTRA_UNAVAILABLE",
      authenticated: err.code !== "DAFTRA_AUTH_FAILED",
      latencyMs,
      error: err.message || String(err),
    };
  }
}
