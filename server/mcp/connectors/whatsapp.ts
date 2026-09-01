import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import type { McpConnectorRegister } from "../types.js";
import { whatsappService } from "../../whatsapp/service.js";

export const registerWhatsAppConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  server.registerTool("whatsapp_send_message", {
    title: "WhatsApp Messaging: Send direct message to client",
    description: "Sends a direct text message or follow-up note via WhatsApp Business Cloud API to a client phone number.",
    inputSchema: {
      recipient_phone: z.string().min(1).describe("Client WhatsApp phone number (e.g. +201115723930 or 201115723930)"),
      message_text: z.string().min(1).describe("Text message content"),
      daftra_client_id: z.number().optional().describe("Associated Daftra Client ID"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ recipient_phone, message_text, daftra_client_id }) => {
    try {
      await touchAgentConnection(agent.id, "whatsapp_send_message").catch(() => undefined);
      const result = await whatsappService.sendTextMessage({
        agentId: agent.id,
        recipientPhone: recipient_phone,
        text: message_text,
        daftraClientId: daftra_client_id,
      });

      if (!result.ok) {
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "whatsapp", action: "whatsapp_send_message", error: result.error }) }] };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "whatsapp",
            action: "whatsapp_send_message",
            data: {
              messageId: result.messageId,
              recipient: recipient_phone,
              sentByAgent: agent.id,
              status: "sent",
            },
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "whatsapp", action: "whatsapp_send_message", error: message }) }] };
    }
  });

  server.registerTool("whatsapp_send_invoice_notification", {
    title: "WhatsApp Messaging: Send invoice & payment link template",
    description: "Sends a WhatsApp template message containing invoice details, total amount, and payment link.",
    inputSchema: {
      recipient_phone: z.string().min(1).describe("Client WhatsApp phone number"),
      client_name: z.string().min(1).describe("Client name"),
      invoice_number: z.string().min(1).describe("Invoice number (e.g. INV-2026-884)"),
      total_amount: z.string().min(1).describe("Total amount string (e.g. 450 EGP)"),
      invoice_url: z.string().url().describe("Daftra invoice payment URL"),
      daftra_client_id: z.number().optional().describe("Daftra client ID"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ recipient_phone, client_name, invoice_number, total_amount, invoice_url, daftra_client_id }) => {
    try {
      await touchAgentConnection(agent.id, "whatsapp_send_invoice_notification").catch(() => undefined);
      const text = `عزيزنا العميل ${client_name}،\nتم إصدار الفاتورة رقم ${invoice_number} بقيمة ${total_amount}.\nيمكنك استعراض الفاتورة والدفع عبر الرابط التالي:\n${invoice_url}\nشكراً لتواصلك معنا.`;
      const result = await whatsappService.sendTextMessage({
        agentId: agent.id,
        recipientPhone: recipient_phone,
        text,
        daftraClientId: daftra_client_id,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: result.ok,
            domain: "whatsapp",
            action: "whatsapp_send_invoice_notification",
            data: {
              messageId: result.messageId,
              recipient: recipient_phone,
              invoiceNumber: invoice_number,
              sentByAgent: agent.id,
            },
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "whatsapp", action: "whatsapp_send_invoice_notification", error: message }) }] };
    }
  });

  server.registerTool("whatsapp_list_available_lines", {
    title: "WhatsApp Messaging: List available WhatsApp lines",
    description: "Returns the catalog of active WhatsApp lines, assigned WABAs, and agent roles.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    try {
      await touchAgentConnection(agent.id, "whatsapp_list_available_lines").catch(() => undefined);
      const numbers = await whatsappService.getNumbers();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "whatsapp",
            action: "whatsapp_list_available_lines",
            data: {
              count: numbers.length,
              lines: numbers,
            },
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "whatsapp", action: "whatsapp_list_available_lines", error: message }) }] };
    }
  });
};
