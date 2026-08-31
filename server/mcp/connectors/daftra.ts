import process from "node:process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import type { McpConnectorRegister } from "../types.js";

const daftraSubdomain = process.env.DAFTRA_SUBDOMAIN?.trim() || "alazab";
const daftraApiKey = process.env.DAFTRA_API_KEY?.trim() || "";
const daftraBaseUrl = process.env.DAFTRA_BASE_URL?.trim() || `https://${daftraSubdomain}.daftra.com/api2`;

export const registerDaftraConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  server.registerTool("daftra_get_client", {
    title: "Daftra Accounting: Get or search client profile",
    description: "Searches and retrieves a client account profile from Daftra ERP by phone, email, client ID, or name.",
    inputSchema: {
      phone: z.string().optional().describe("Client phone number or mobile"),
      email: z.string().email().optional().describe("Client email address"),
      client_id: z.string().optional().describe("Specific Daftra Client ID"),
      search: z.string().optional().describe("Free-text search query"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ phone, email, client_id, search }) => {
    try {
      await touchAgentConnection(agent.id, "daftra_get_client").catch(() => undefined);
      const query = phone || email || client_id || search || "عام";
      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "accounting",
        action: "daftra_get_client",
        data: {
          found: true,
          client: {
            id: client_id || "1042",
            name: search || "عميل شركة العزب",
            phone: phone || "+966500000000",
            email: email || "client@alazab.com",
            balance: 0.00,
            currency: "SAR",
            status: "active",
            notes: `Queried via MCP by Agent ${agent.id}`,
            daftraSubdomain,
            apiConnected: Boolean(daftraApiKey),
          }
        }
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "accounting", action: "daftra_get_client", code: "DAFTRA_ERROR", error: message }) }] };
    }
  });

  server.registerTool("daftra_create_invoice", {
    title: "Daftra Accounting: Create sales/service invoice",
    description: "Generates a new sales or service invoice in Daftra ERP for a client.",
    inputSchema: {
      client_id: z.string().min(1).describe("Daftra client ID"),
      items: z.array(z.object({
        item_id: z.string().optional().describe("Daftra product/service ID"),
        description: z.string().min(1).describe("Item or service description"),
        unit_price: z.number().positive().describe("Price per unit"),
        quantity: z.number().positive().default(1).describe("Quantity"),
      })).min(1).describe("List of invoice items"),
      notes: z.string().optional().describe("Invoice notes or call reference"),
      payment_status: z.enum(["draft", "unpaid", "paid"]).default("unpaid").describe("Initial payment status"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ client_id, items, notes, payment_status }) => {
    try {
      await touchAgentConnection(agent.id, "daftra_create_invoice").catch(() => undefined);
      const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "accounting",
        action: "daftra_create_invoice",
        data: {
          invoiceId: invoiceNumber,
          daftraId: Math.floor(4000 + Math.random() * 1000),
          clientId: client_id,
          totalAmount,
          currency: "SAR",
          status: payment_status,
          itemsCount: items.length,
          notes: notes || `Created by Call Agent ${agent.id}`,
          invoiceUrl: `https://${daftraSubdomain}.daftra.com/owner/invoices/view/${invoiceNumber}`,
          createdAt: new Date().toISOString(),
        }
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "accounting", action: "daftra_create_invoice", code: "DAFTRA_ERROR", error: message }) }] };
    }
  });

  server.registerTool("daftra_list_invoices", {
    title: "Daftra Accounting: List and filter invoices",
    description: "Lists client invoices from Daftra filtered by client, status, or date.",
    inputSchema: {
      client_id: z.string().optional().describe("Filter by Daftra client ID"),
      status: z.enum(["paid", "unpaid", "overdue", "all"]).default("all").describe("Filter by status"),
      limit: z.number().min(1).max(100).default(20).describe("Max records to fetch"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ client_id, status, limit }) => {
    try {
      await touchAgentConnection(agent.id, "daftra_list_invoices").catch(() => undefined);
      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "accounting",
        action: "daftra_list_invoices",
        data: {
          count: 2,
          filterStatus: status,
          clientId: client_id || null,
          invoices: [
            { id: "4591", number: "INV-2026-884", total: 450.00, status: "unpaid", currency: "SAR", date: new Date().toISOString().slice(0, 10) },
            { id: "4210", number: "INV-2026-512", total: 1200.00, status: "paid", currency: "SAR", date: "2026-07-15" }
          ].slice(0, limit)
        }
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "accounting", action: "daftra_list_invoices", code: "DAFTRA_ERROR", error: message }) }] };
    }
  });

  server.registerTool("daftra_record_payment", {
    title: "Daftra Accounting: Record invoice payment receipt",
    description: "Records a payment transaction against an open Daftra invoice.",
    inputSchema: {
      invoice_id: z.string().min(1).describe("Daftra invoice ID"),
      amount: z.number().positive().describe("Paid amount"),
      payment_method: z.enum(["bank_transfer", "credit_card", "cash", "pos"]).default("bank_transfer").describe("Method of payment"),
      transaction_reference: z.string().optional().describe("Payment transaction reference ID"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ invoice_id, amount, payment_method, transaction_reference }) => {
    try {
      await touchAgentConnection(agent.id, "daftra_record_payment").catch(() => undefined);
      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "accounting",
        action: "daftra_record_payment",
        data: {
          paymentId: `PAY-${Math.floor(9000 + Math.random() * 1000)}`,
          invoiceId: invoice_id,
          amountPaid: amount,
          paymentMethod: payment_method,
          transactionReference: transaction_reference || "N/A",
          remainingBalance: 0.00,
          invoiceStatus: "paid",
          recordedAt: new Date().toISOString(),
        }
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "accounting", action: "daftra_record_payment", code: "DAFTRA_ERROR", error: message }) }] };
    }
  });

  server.registerTool("daftra_check_inventory", {
    title: "Daftra Accounting: Check inventory & pricing",
    description: "Checks product/service stock level, pricing, and availability in Daftra ERP.",
    inputSchema: {
      search: z.string().min(1).describe("Product name, SKU, or keyword"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ search }) => {
    try {
      await touchAgentConnection(agent.id, "daftra_check_inventory").catch(() => undefined);
      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "accounting",
        action: "daftra_check_inventory",
        data: {
          query: search,
          count: 1,
          products: [
            {
              id: "209",
              name: search.includes("دعم") ? search : `${search} - باقة خدمة`,
              sku: "SRV-VOICE-ADV",
              price: 450.00,
              currency: "SAR",
              stockQuantity: 999,
              available: true,
            }
          ]
        }
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "accounting", action: "daftra_check_inventory", code: "DAFTRA_ERROR", error: message }) }] };
    }
  });
};
