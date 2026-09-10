import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { touchAgentConnection } from "../../../runtimeStatus.js";
import { daftraClient } from "../../../daftra/client.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraRawConnector(server: McpServer, agent: RuntimeAgent): void {
  if (!hasCapability(agent, "daftra.raw")) {
    return;
  }

  server.registerTool("daftra_raw_request", {
    title: "Daftra Accounting: Dynamic OpenAPI Raw Request Execution",
    description: "Executes custom or specialized API endpoints against Daftra API based on daftra_module_openapi.json specifications.",
    inputSchema: {
      endpoint: z.string().min(1).describe("Daftra API sub-path (e.g. /v2/api/entity/client/1 or /v2/api/entity/invoice)"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP method"),
      body: z.record(z.unknown()).optional().describe("Request JSON body parameters"),
      params: z.record(z.string()).optional().describe("URL query string parameters"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ endpoint, method, body, params }) => {
    try {
      await touchAgentConnection(agent.id, "daftra_raw_request").catch(() => undefined);

      if (!hasCapability(agent, "daftra.raw")) {
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: "CAPABILITY_DENIED", message: "Agent lacks daftra.raw capability" }) }] };
      }

      const responseData = await daftraClient.request(endpoint, {
        method,
        query: params,
        body,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "daftra",
            action: "daftra_raw_request",
            endpoint,
            method,
            data: responseData,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_raw_request", error: message }) }] };
    }
  });
}
