import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { config } from "../../config.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { telephonyService } from "../../telephony/service.js";
import type { McpConnectorRegister } from "../types.js";

export const registerTelephonyConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  server.registerTool("whoami", {
    title: "Verify fixed telephony identity and connection",
    description: "Returns the authenticated Foundry agent identity, fixed line/extension, telephony readiness, and MCP endpoint status.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    await touchAgentConnection(agent.id, "whoami", true).catch(() => undefined);
    return { content: [{ type: "text", text: JSON.stringify({
      ok: true,
      domain: "system",
      action: "whoami",
      connected: true,
      service: "az-agent-call",
      agentId: agent.id,
      foundryId: agent.foundry_id,
      extension: agent.mailbox,
      lineLocked: true,
      telephonyReady: telephonyService.isReady,
      mcpEndpoint: `${config.publicAppUrl}/call`,
      checkedAt: new Date().toISOString(),
    }) }] };
  });

  server.registerTool("make_call", {
    title: `Make voice call or dispatch phone session as ${agent.mailbox}`,
    description: "Initiates an outbound voice call or audio session from the authenticated agent line.",
    inputSchema: {
      to: z.string().min(3).max(50).describe("Recipient phone number or SIP extension"),
      subject: z.string().min(1).max(300).describe("Call purpose or script subject"),
      template_id: z.string().optional().describe("Optional voice script template ID"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ to, subject, template_id }) => {
    try {
      await touchAgentConnection(agent.id, "make_call").catch(() => undefined);

      if (!telephonyService.isReady) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              domain: "telephony",
              action: "make_call",
              code: "TELEPHONY_NOT_CONFIGURED",
              error: "Telephony provider (SIP/Twilio) is not configured in environment.",
            }),
          }],
        };
      }

      const session = await telephonyService.makeCall({
        to,
        from: agent.mailbox,
        agentId: agent.id,
        scriptTemplateId: template_id,
        metadata: { subject },
      });

      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "telephony",
        action: "make_call",
        data: {
          callStatus: session.status,
          recipient: to,
          callSessionId: session.id,
          subject,
          templateId: template_id,
          timestamp: session.created_at,
        }
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "telephony", action: "make_call", code: "TELEPHONY_ERROR", error: message }) }] };
    }
  });

  server.registerTool("get_call_transcript", {
    title: "Get call audio transcript",
    description: "Returns the text transcript and audio logs for a specific call session ID.",
    inputSchema: { call_session_id: z.string().min(1).max(200) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ call_session_id }) => {
    try {
      await touchAgentConnection(agent.id, "get_call_transcript").catch(() => undefined);

      if (!telephonyService.isReady) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              domain: "telephony",
              action: "get_call_transcript",
              code: "TELEPHONY_NOT_CONFIGURED",
              error: "Telephony provider is not configured.",
            }),
          }],
        };
      }

      const transcript = await telephonyService.getTranscript(call_session_id);
      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "telephony",
        action: "get_call_transcript",
        data: transcript,
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "telephony", action: "get_call_transcript", code: "TELEPHONY_ERROR", error: message }) }] };
    }
  });
};
