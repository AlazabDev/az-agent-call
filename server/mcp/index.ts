import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RuntimeAgent } from "../agents.js";
import { config } from "../config.js";
import { registerTelephonyConnector } from "./connectors/telephony.js";
import { registerTemplatesConnector } from "./connectors/templates.js";
import { registerDaftraConnector } from "./connectors/daftra.js";

/** Builds an MCP server scoped to the bearer-token owner with modular domain connectors. */
export function buildServerForAgent(agent: RuntimeAgent): McpServer {
  const server = new McpServer(
    { name: "az-agent-call", version: config.version },
    {
      capabilities: { tools: {} },
      instructions: [
        `Alazab Central MCP Protocol (v${config.version})`,
        `Authenticated Agent Identity: ${agent.mailbox} (${agent.foundry_id}).`,
        "Domains connected: Telephony, Voice Templates, Daftra Accounting.",
        "Server-locked identity: tools operate under fixed bearer token identity.",
        "Every tool execution is logged in Supabase audit logs.",
      ].join("\n"),
    },
  );

  // Register Modular Domain Connectors
  registerTelephonyConnector(server, agent);
  registerTemplatesConnector(server, agent);
  registerDaftraConnector(server, agent);

  return server;
}
