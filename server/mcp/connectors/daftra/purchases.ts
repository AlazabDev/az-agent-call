import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { daftraService } from "../../../daftra/service.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraCreatePurchaseOrderSchema } from "../../../daftra/schemas.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraPurchaseTools(server: McpServer, agent: RuntimeAgent) {
  if (hasCapability(agent, "daftra.purchases.read")) {
    server.registerTool(
      "daftra_list_purchase_orders",
      {
        title: "Daftra ERP: List Purchase Orders",
        description: "Lists purchase orders from Daftra ERP with optional supplier_id filter.",
        inputSchema: {
          supplier_id: z.number().optional(),
          limit: z.number().optional().default(50),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.purchases.listPurchaseOrders(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_list_purchase_orders", success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_list_purchase_orders", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_list_purchase_orders", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_list_purchase_orders", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );

    server.registerTool(
      "daftra_get_purchase_order",
      {
        title: "Daftra ERP: Get Purchase Order",
        description: "Retrieves purchase order details by ID.",
        inputSchema: {
          id: z.number(),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.purchases.getPurchaseOrder(args.id);
          await logDaftraAction({ agentId: agent.id, action: "daftra_get_purchase_order", entityType: "purchase_order", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_get_purchase_order", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_get_purchase_order", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_get_purchase_order", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );
  }

  if (hasCapability(agent, "daftra.purchases.create")) {
    server.registerTool(
      "daftra_create_purchase_order",
      {
        title: "Daftra ERP: Create Purchase Order",
        description: "Creates a purchase order in Daftra ERP using supplier ID and line items.",
        inputSchema: daftraCreatePurchaseOrderSchema.shape,
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.purchases.createPurchaseOrder(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_purchase_order", entityType: "purchase_order", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_create_purchase_order", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_purchase_order", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_create_purchase_order", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );

    server.registerTool(
      "daftra_create_smart_purchase_order",
      {
        title: "Daftra ERP: Create Smart Purchase Order",
        description: "Creates a purchase order using text supplier names via Smart Resolver.",
        inputSchema: {
          supplier_query: z.string().min(1),
          items: z.array(
            z.object({
              product_query: z.string().optional(),
              name: z.string().optional(),
              unit_price: z.number().optional(),
              quantity: z.number().optional().default(1),
            })
          ).min(1),
          notes: z.string().optional(),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.purchases.createSmartPurchaseOrder(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_smart_purchase_order", entityType: "purchase_order", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_create_smart_purchase_order", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_smart_purchase_order", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_create_smart_purchase_order", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );
  }
}
