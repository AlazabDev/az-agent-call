import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RuntimeAgent } from "../agents.js";

export interface McpEnvelope<T = unknown> {
  ok: boolean;
  domain: string;
  action: string;
  data?: T;
  error?: string | null;
  code?: string;
  meta?: {
    agentId: string;
    timestamp: string;
    requestId?: string;
  };
}

export type McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => void;
