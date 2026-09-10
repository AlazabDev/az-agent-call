import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { hasCapability } from "../capabilities.js";
import type { McpConnectorRegister } from "../types.js";

export const registerUberFixConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  if (!hasCapability(agent, "uberfix.read")) {
    return;
  }

  const uberfixGatewayUrl = process.env.UBERFIX_GATEWAY_URL || "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/maintenance-gateway";
  const uberfixApiKey = process.env.UBERFIX_API_KEY || "";

  const getHeaders = () => ({
    "Accept": "application/json",
    "Content-Type": "application/json",
    "x-api-key": uberfixApiKey,
  });

  server.registerTool("uberfix_create_ticket", {
    title: "UberFix Maintenance: Create maintenance ticket",
    description: "Creates a new maintenance request ticket in UberFix Maintenance Gateway.",
    inputSchema: {
      client_name: z.string().min(1).describe("Client or customer full name"),
      client_phone: z.string().min(1).describe("Contact phone number"),
      issue_description: z.string().min(1).describe("Detailed description of the maintenance issue"),
      location: z.string().optional().describe("Property address or unit location"),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium").describe("Ticket urgency priority"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ client_name, client_phone, issue_description, location, priority }) => {
    try {
      await touchAgentConnection(agent.id, "uberfix_create_ticket").catch(() => undefined);

      if (!hasCapability(agent, "uberfix.write")) {
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: "CAPABILITY_DENIED", message: "Agent lacks uberfix.write capability" }) }] };
      }

      if (!uberfixApiKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "uberfix",
              action: "uberfix_create_ticket",
              configured: false,
              data: {
                ticketId: `MNT-LOCAL-${Date.now()}`,
                status: "created_offline_schema",
                clientName: client_name,
                clientPhone: client_phone,
                priority,
                createdAgent: agent.id,
              },
            }),
          }],
        };
      }

      const res = await fetch(uberfixGatewayUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          client_name,
          client_phone,
          issue_description,
          location,
          priority,
        }),
      });

      if (!res.ok) {
        throw new Error(`UberFix Gateway returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "uberfix",
            action: "uberfix_create_ticket",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "uberfix", action: "uberfix_create_ticket", error: message }) }] };
    }
  });

  server.registerTool("uberfix_get_status", {
    title: "UberFix Maintenance: Get ticket status",
    description: "Queries current stage, technician assignment, and history for a maintenance ticket.",
    inputSchema: {
      ticket_id: z.string().min(1).describe("UberFix maintenance ticket ID"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ ticket_id }) => {
    try {
      await touchAgentConnection(agent.id, "uberfix_get_status").catch(() => undefined);

      if (!uberfixApiKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "uberfix",
              action: "uberfix_get_status",
              configured: false,
              data: { ticketId: ticket_id, stage: "pending_dispatch", notesCount: 0 },
            }),
          }],
        };
      }

      const res = await fetch(uberfixGatewayUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "get_status", ticket_id }),
      });

      if (!res.ok) {
        throw new Error(`UberFix Gateway returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "uberfix",
            action: "uberfix_get_status",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "uberfix", action: "uberfix_get_status", error: message }) }] };
    }
  });

  server.registerTool("uberfix_transition_stage", {
    title: "UberFix Maintenance: Transition ticket stage",
    description: "Updates lifecycle stage of a maintenance ticket (e.g. to assigned, in_progress, completed).",
    inputSchema: {
      ticket_id: z.string().min(1).describe("Ticket ID"),
      target_stage: z.enum(["pending", "assigned", "in_progress", "completed", "cancelled"]).describe("Target stage"),
      note: z.string().optional().describe("Optional transition note or rationale"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ ticket_id, target_stage, note }) => {
    try {
      await touchAgentConnection(agent.id, "uberfix_transition_stage").catch(() => undefined);

      if (!hasCapability(agent, "uberfix.write")) {
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: "CAPABILITY_DENIED", message: "Agent lacks uberfix.write capability" }) }] };
      }

      if (!uberfixApiKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "uberfix",
              action: "uberfix_transition_stage",
              configured: false,
              data: { ticketId: ticket_id, targetStage: target_stage, updatedBy: agent.id },
            }),
          }],
        };
      }

      const res = await fetch(uberfixGatewayUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "transition_stage", ticket_id, target_stage, note }),
      });

      if (!res.ok) {
        throw new Error(`UberFix Gateway returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "uberfix",
            action: "uberfix_transition_stage",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "uberfix", action: "uberfix_transition_stage", error: message }) }] };
    }
  });

  server.registerTool("uberfix_add_note", {
    title: "UberFix Maintenance: Add note to ticket",
    description: "Appends a technician observation or agent follow-up note to a maintenance ticket.",
    inputSchema: {
      ticket_id: z.string().min(1).describe("Ticket ID"),
      note: z.string().min(1).describe("Note content"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ ticket_id, note }) => {
    try {
      await touchAgentConnection(agent.id, "uberfix_add_note").catch(() => undefined);

      if (!hasCapability(agent, "uberfix.write")) {
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: "CAPABILITY_DENIED", message: "Agent lacks uberfix.write capability" }) }] };
      }

      if (!uberfixApiKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "uberfix",
              action: "uberfix_add_note",
              configured: false,
              data: { ticketId: ticket_id, noteAdded: note },
            }),
          }],
        };
      }

      const res = await fetch(uberfixGatewayUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "add_note", ticket_id, note }),
      });

      if (!res.ok) {
        throw new Error(`UberFix Gateway returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "uberfix",
            action: "uberfix_add_note",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "uberfix", action: "uberfix_add_note", error: message }) }] };
    }
  });
};
