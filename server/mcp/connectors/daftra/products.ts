import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { daftraService } from "../../../daftra/service.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraProductTools(server: McpServer, agent: RuntimeAgent) {
  if (hasCapability(agent, "daftra.products.read")) {
    server.registerTool(
      "daftra_list_products",
      {
        title: "Daftra ERP: List Products",
        description: "Lists products and inventory items from Daftra ERP with optional search query.",
        inputSchema: {
          query: z.string().optional(),
          limit: z.number().optional().default(50),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.products.listProducts(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_list_products", success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_list_products", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_list_products", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_list_products", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );

    server.registerTool(
      "daftra_get_product",
      {
        title: "Daftra ERP: Get Product",
        description: "Retrieves a product record by ID, code, or name.",
        inputSchema: {
          idOrQuery: z.union([z.number(), z.string()]),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.products.getProduct(args.idOrQuery);
          await logDaftraAction({ agentId: agent.id, action: "daftra_get_product", entityType: "product", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_get_product", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_get_product", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_get_product", code: err.code || "ERROR", error: err.message, data: err.details }) }] };
        }
      }
    );
  }

  if (hasCapability(agent, "daftra.products.write")) {
    server.registerTool(
      "daftra_create_product",
      {
        title: "Daftra ERP: Create Product",
        description: "Creates a new product / inventory item in Daftra ERP.",
        inputSchema: {
          name: z.string().min(1),
          product_code: z.string().optional(),
          unit_price: z.number().optional().default(0),
          purchase_price: z.number().optional().default(0),
          description: z.string().optional(),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.products.createProduct(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_product", entityType: "product", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_create_product", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_product", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_create_product", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );
  }
}
