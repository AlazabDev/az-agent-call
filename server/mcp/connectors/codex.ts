import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { config } from "../../config.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { codexAgent } from "../../ai/codexAgent.js";
import { hasCapability } from "../capabilities.js";
import type { McpConnectorRegister } from "../types.js";

export const registerCodexConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  server.registerTool("codex_status", {
    title: "Verify Codex (Azure AI Foundry) agent readiness",
    description: "Returns whether the Codex reasoning/coding agent is configured and reachable, and which Foundry agent name/version is bound.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    await touchAgentConnection(agent.id, "codex_status").catch(() => undefined);
    return { content: [{ type: "text", text: JSON.stringify({
      ok: true,
      domain: "codex",
      action: "codex_status",
      data: {
        configured: codexAgent.isReady,
        agentName: config.azureAiAgentName,
        agentVersion: config.azureAiAgentVersion,
        projectEndpointSet: Boolean(config.azureAiProjectEndpoint),
      },
      checkedAt: new Date().toISOString(),
    }) }] };
  });

  if (!hasCapability(agent, "codex.ask")) return;

  server.registerTool("codex_ask", {
    title: `Ask the Codex agent as ${agent.mailbox}`,
    description: "Sends a prompt or task to the Codex (Azure AI Foundry) reasoning/coding agent. Pass conversation_id to continue a prior exchange with full context, or omit it to start a new one.",
    inputSchema: {
      prompt: z.string().min(1).max(8000).describe("The question, instruction, or coding task to send to Codex"),
      conversation_id: z.string().min(1).max(200).optional().describe("Existing conversation ID to continue, if any"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ prompt, conversation_id }) => {
    try {
      await touchAgentConnection(agent.id, "codex_ask").catch(() => undefined);

      if (!codexAgent.isReady) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              domain: "codex",
              action: "codex_ask",
              code: "CODEX_NOT_CONFIGURED",
              error: "AZURE_AI_PROJECT_ENDPOINT is not configured in environment.",
            }),
          }],
        };
      }

      const result = await codexAgent.ask(prompt, conversation_id);

      return { content: [{ type: "text", text: JSON.stringify({
        ok: true,
        domain: "codex",
        action: "codex_ask",
        data: {
          conversationId: result.conversationId,
          responseId: result.responseId,
          outputText: result.outputText,
          agentName: config.azureAiAgentName,
        },
      }) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "codex", action: "codex_ask", code: "CODEX_ERROR", error: message }) }] };
    }
  });
};
