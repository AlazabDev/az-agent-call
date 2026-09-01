import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { daftraService } from "../../../daftra/service.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraCreateExpenseSchema } from "../../../daftra/schemas.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraExpenseTools(server: McpServer, agent: RuntimeAgent) {
  if (hasCapability(agent, "daftra.expenses.read")) {
    server.registerTool(
      "daftra_list_expenses",
      {
        title: "Daftra ERP: List Expenses",
        description: "Lists recorded expenses from Daftra ERP.",
        inputSchema: {
          limit: z.number().optional().default(50),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.expenses.listExpenses(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_list_expenses", success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_list_expenses", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_list_expenses", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_list_expenses", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );
  }

  if (hasCapability(agent, "daftra.expenses.create")) {
    server.registerTool(
      "daftra_create_expense",
      {
        title: "Daftra ERP: Create Expense",
        description: "Creates an expense record in Daftra ERP.",
        inputSchema: daftraCreateExpenseSchema.shape,
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.expenses.createExpense(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_expense", entityType: "expense", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_create_expense", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_expense", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_create_expense", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );

    server.registerTool(
      "daftra_create_smart_expense",
      {
        title: "Daftra ERP: Create Smart Expense",
        description: "Creates an expense record with title and amount.",
        inputSchema: {
          title: z.string().min(1),
          amount: z.number().positive(),
          notes: z.string().optional(),
        },
      },
      async (args) => {
        const start = Date.now();
        try {
          const data = await daftraService.expenses.createSmartExpense(args);
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_smart_expense", entityType: "expense", entityId: data.id, success: true, durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, domain: "daftra", action: "daftra_create_smart_expense", data }) }] };
        } catch (err: any) {
          await logDaftraAction({ agentId: agent.id, action: "daftra_create_smart_expense", success: false, errorCode: err.code || "ERROR", durationMs: Date.now() - start });
          return { content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "daftra", action: "daftra_create_smart_expense", code: err.code || "ERROR", error: err.message }) }] };
        }
      }
    );
  }
}
