import os from "node:os";
import type { AgentId } from "../shared/agents.js";
import { config } from "./config.js";
import { supabaseAdmin } from "./supabase.js";

let timer: NodeJS.Timeout | null = null;
let templateCount = 0;
let gatewayStatus: "starting" | "ready" | "degraded" = "starting";

async function heartbeat(): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("mail_gateway_instances").upsert({
    instance_id: config.gatewayInstanceId,
    hostname: os.hostname(),
    version: config.version,
    status: gatewayStatus,
    last_seen_at: now,
    smtp_host: config.smtpHost,
    smtp_port: config.smtpPort,
    template_count: templateCount,
    metadata: { public_app_url: config.publicAppUrl, mcp_path: "/mail", admin_path: "/admin/" },
    updated_at: now,
  }, { onConflict: "instance_id" });
  if (error) throw new Error(`Gateway heartbeat failed: ${error.message}`);
}

export async function startGatewayHeartbeat(count: number): Promise<void> {
  templateCount = count;
  gatewayStatus = "ready";
  await heartbeat();
  if (timer) clearInterval(timer);
  timer = setInterval(() => void heartbeat().catch((error) => console.error("[az-agent-call] heartbeat:", error)), 30_000);
  timer.unref();
}

export async function setGatewayDegraded(): Promise<void> {
  gatewayStatus = "degraded";
  await heartbeat().catch(() => undefined);
}

export async function touchAgentConnection(agentId: AgentId, tool: string, whoami = false): Promise<void> {
  const now = new Date().toISOString();
  const { data } = await supabaseAdmin.from("mail_agent_connections").select("request_count").eq("agent_id", agentId).maybeSingle();
  const row: Record<string, unknown> = {
    agent_id: agentId,
    connection_status: "online",
    gateway_instance_id: config.gatewayInstanceId,
    last_seen_at: now,
    last_tool: tool,
    request_count: Number(data?.request_count ?? 0) + 1,
    updated_at: now,
  };
  if (whoami) row.last_whoami_at = now;
  const { error } = await supabaseAdmin.from("mail_agent_connections").upsert(row, { onConflict: "agent_id" });
  if (error) throw new Error(`Agent connection update failed: ${error.message}`);
}
