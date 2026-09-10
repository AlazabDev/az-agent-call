import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RuntimeAgent } from "../../../agents.js";
import { daftraService } from "../../../daftra/service.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraRecordPaymentSchema } from "../../../daftra/schemas.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraPaymentTools(server: McpServer, agent: RuntimeAgent) {
  if (hasCapability(agent, "daftra.payments.create")) {
    server.registerTool(
      "daftra_add_invoice_payment",
      {
        title: "Daftra ERP: Add Invoice Payment",
        description: "Records a financial payment or receipt against a specific Daftra sales invoice.",
        inputSchema: daftraRecordPaymentSchema.shape,
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.payments.addInvoicePayment(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_add_invoice_payment", entityType: "payment", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_add_invoice_payment", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_add_invoice_payment", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_add_invoice_payment", code: err.code || "ERROR", error: err.message, data: err.details }) }] };
        }
      }
    );
  }
}
