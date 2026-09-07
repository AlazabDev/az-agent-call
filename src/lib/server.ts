import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import type { AgentConfig } from "./agents.js";
import { sendAsAgent } from "./mailer.js";

const recipients = z.union([
	z.string().email(),
	z.array(z.string().email()).min(1),
]);

/**
 * Builds an MCP server scoped to exactly one agent's identity. The agent's
 * email is baked in from `agent` and is never a tool parameter, so there is
 * no input this agent can send that makes it send as another mailbox.
 */
export function buildServerForAgent(agent: AgentConfig): McpServer {
	const server = new McpServer(
		{ name: "az-agent-call", version: "3.1.0" },
		{
			capabilities: { tools: {} },
			instructions: [
				`You are sending as ${agent.email}. This is fixed — there is no way to send from a different address.`,
				"",
				"`send_email` is for a specific, named recipient (or a short list of them) — a notification,",
				"a reply, a status update. It is not for mailing lists or broadcast announcements.",
				"",
				"Sends go out immediately and cannot be recalled. Double-check the recipient and content first.",
			].join("\n"),
		},
	);

	server.registerTool(
		"send_email",
		{
			title: `Send email as ${agent.email}`,
			description: [
				`Sends an email from ${agent.email} to one or more specific recipients.`,
				"Requires `subject` and at least one of `text` or `html`.",
			].join("\n"),
			inputSchema: {
				to: recipients.describe(
					"Recipient email address, or an array of them.",
				),
				cc: recipients.optional(),
				bcc: recipients.optional(),
				subject: z.string().min(1).max(998),
				text: z
					.string()
					.optional()
					.describe("Plain-text body. Provide this and/or `html`."),
				html: z
					.string()
					.optional()
					.describe("HTML body. Provide this and/or `text`."),
				replyTo: z.string().email().optional(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async ({ to, cc, bcc, subject, text, html, replyTo }) => {
			if (!text && !html) {
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: "Provide `text` and/or `html` for the email body.",
						},
					],
				};
			}

			try {
				const result = await sendAsAgent(agent, {
					to,
					cc,
					bcc,
					subject,
					text,
					html,
					replyTo,
				});
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error) {
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: `Send failed: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				};
			}
		},
	);

	server.registerTool(
		"whoami",
		{
			title: "Show this agent's mail identity",
			description: "Returns the mailbox address this MCP connection sends as.",
			inputSchema: {},
		},
		async () => ({
			content: [
				{
					type: "text",
					text: JSON.stringify({
						email: agent.email,
						foundryId: agent.foundryId,
					}),
				},
			],
		}),
	);

	return server;
}
