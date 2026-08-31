import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { agentForToken, getAgent, smtpConfigured } from "./agents.js";
import { bearerToken } from "./auth.js";
import { requireAdminBasicAuth } from "./basicAuth.js";
import { apiRouter } from "./api.js";
import { config } from "./config.js";
import { buildServerForAgent } from "./mcp.js";
import { startGatewayHeartbeat, setGatewayDegraded } from "./runtimeStatus.js";
import { assertSupabaseProjectBinding, supabaseAdmin } from "./supabase.js";
import { syncTemplateCatalogToSupabase } from "./templateSync.js";
import { initializeAgentTokens, tokenStoreStatus } from "./tokenStore.js";
import { AGENT_IDS } from "../shared/agents.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
}));
app.use(express.json({ limit: "512kb" }));
app.use((req, res, next) => {
  const requestId = req.header("x-request-id")?.slice(0, 128) || randomUUID();
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use("/api", apiRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

app.post(["/call", "/mail"], async (req, res) => {
  try {
    const agent = await agentForToken(bearerToken(req.header("authorization")));
    if (!agent) {
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Missing or unrecognized Authorization: Bearer token." },
        id: req.body?.id ?? null,
      });
    }

    const server = buildServerForAgent(agent);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    let closed = false;
    const cleanup = async () => {
      if (closed) return;
      closed = true;
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    };
    res.once("close", () => void cleanup());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[az-agent-call] MCP request failed:", error);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: req.body?.id ?? null });
  }
});

app.all(["/call", "/mail"], (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "az-agent-call", version: config.version });
});

app.get("/readyz", async (_req, res) => {
  try {
    const [agents, templates] = await Promise.all([
      supabaseAdmin.from("mail_agents").select("id, enabled"),
      supabaseAdmin.from("mail_templates").select("id", { count: "exact", head: true }).eq("enabled", true),
    ]);
    const error = agents.error ?? templates.error;
    if (error) throw error;
    const rows = agents.data ?? [];
    const enabled = rows.filter((row) => row.enabled);
    const store = tokenStoreStatus();
    const missingTokens = store.loaded === store.expected ? [] : AGENT_IDS;
    const missingSmtpPasswords: string[] = [];
    for (const row of enabled) {
      const agent = await getAgent(row.id);
      if (!agent || !smtpConfigured(agent)) missingSmtpPasswords.push(row.id);
    }
    const ready = rows.length === 12 && templates.count === config.expectedTemplateCount && missingTokens.length === 0 && missingSmtpPasswords.length === 0;
    res.status(ready ? 200 : 503).json({
      ready,
      agents: rows.length,
      enabledAgents: enabled.length,
      templates: templates.count ?? 0,
      tokenStore: store,
      missingTokens,
      missingSmtpPasswords,
      supabaseProjectRef: config.supabaseProjectRef,
      admin: `${config.publicAppUrl}/admin/`,
      mcp: `${config.publicAppUrl}/call`,
    });
  } catch (error) {
    res.status(503).json({ ready: false, error: error instanceof Error ? error.message : String(error) });
  }
});

const webDist = path.resolve(__dirname, "../../dist");
app.get("/", (_req, res) => res.redirect(302, "/admin/"));
app.use("/admin", requireAdminBasicAuth, express.static(webDist));
app.get("/admin/{*splat}", requireAdminBasicAuth, (_req, res) => res.sendFile(path.join(webDist, "index.html")));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) return res.status(400).json({ error: "Invalid JSON request body." });
  console.error("[az-agent-call] HTTP error:", error);
  res.status(500).json({ error: "Internal server error." });
});

try {
  await assertSupabaseProjectBinding();
  console.log(`[az-agent-call] bound to Supabase project ${config.supabaseProjectRef}`);

  const syncedTemplates = await syncTemplateCatalogToSupabase();
  console.log(`[az-agent-call] synchronized ${syncedTemplates} templates to Supabase`);

  const tokenInit = await initializeAgentTokens();
  console.log(`[az-agent-call] token store ready at ${tokenInit.path}; generated ${tokenInit.generated.length} missing token(s)`);

  await startGatewayHeartbeat(syncedTemplates);
  console.log(`[az-agent-call] gateway heartbeat active as ${config.gatewayInstanceId}`);
} catch (error) {
  await setGatewayDegraded();
  throw error;
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`[az-agent-call] v${config.version} listening on :${config.port}`);
  console.log(`[az-agent-call] admin ${config.publicAppUrl}/admin/ | mcp ${config.publicAppUrl}/call`);
});
