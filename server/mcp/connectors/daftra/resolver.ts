import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RuntimeAgent } from "../../../agents.js";
import { daftraService } from "../../../daftra/service.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraSearchEntitiesSchema } from "../../../daftra/schemas.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraResolverTools(server: McpServer, agent: RuntimeAgent) {
  if (hasCapability(agent, "daftra.clients.read") || hasCapability(agent, "daftra.products.read")) {
    server.registerTool(
      "daftra_search_entities",
      {
        title: "Daftra ERP: Smart Search Entities",
        description: "Searches across clients, suppliers, products, work orders, cost centers, and treasuries with Arabic & English transliteration support.",
        inputSchema: daftraSearchEntitiesSchema.shape,
      },
      async (args) => {
        const start = Date.now();
        try {
          const matches = await daftraService.resolver.searchEntities(args.query, args.entity_type);
          await logDaftraAction({ agentId: agent.id, action: "daftra_search_entities", success: true, durationMs: Date.now() - start });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  ok: true,
                  domain: "daftra",
                  action: "daftra_search_entities",
                  data: { query: args.query, results_count: matches.length, matches },
                }),
              },
            ],
          };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_search_entities", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_search_entities", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );
  }
}
