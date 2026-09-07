import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { sendAsAgent } from "../../mailer.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import {
	allTemplates,
	type EmailTemplateData,
	EmailTemplateError,
	renderTemplateForAgent,
	templateMetadata,
	templatesForAgent,
} from "../../templates.js";
import type { McpConnectorRegister } from "../types.js";

const singleEmail = z.string().email().max(320);
const recipients = z.union([singleEmail, z.array(singleEmail).min(1).max(20)]);
const templateData = z.record(z.unknown());

function toolError(domain: string, action: string, error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	const code =
		error instanceof EmailTemplateError ? error.code : "TEMPLATE_ERROR";
	return {
		isError: true as const,
		content: [
			{
				type: "text" as const,
				text: JSON.stringify({
					ok: false,
					domain,
					action,
					code,
					error: message,
				}),
			},
		],
	};
}

function cleanSubject(value: string): string {
	const cleaned = value
		.replace(/[\u0000-\u001F\u007F]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!cleaned) throw new Error("Subject is empty after validation.");
	return cleaned;
}

export const registerTemplatesConnector: McpConnectorRegister = (
	server: McpServer,
	agent: RuntimeAgent,
) => {
	const recommended = templatesForAgent(agent);
	const catalog = allTemplates().map((t) => ({
		...t,
		recommended: t.recommendedAgent === agent.foundry_id,
	}));

	server.registerTool(
		"list_templates",
		{
			title: "List all 144 voice scripts and call templates",
			description:
				"Lists the complete shared voice script & prompt catalog. Templates recommended for this agent are marked recommended=true, but all templates are usable.",
			inputSchema: {},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async () => {
			await touchAgentConnection(agent.id, "list_templates").catch(
				() => undefined,
			);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							ok: true,
							domain: "templates",
							action: "list_templates",
							data: {
								count: catalog.length,
								recommendedCount: recommended.length,
								access: "global",
								templates: catalog,
							},
						}),
					},
				],
			};
		},
	);

	server.registerTool(
		"get_template_schema",
		{
			title: "Get voice script schema",
			description:
				"Returns metadata and required/optional fields for any template in the shared catalog.",
			inputSchema: { template_id: z.string().min(1).max(200) },
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ template_id }) => {
			try {
				await touchAgentConnection(agent.id, "get_template_schema").catch(
					() => undefined,
				);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "templates",
								action: "get_template_schema",
								data: templateMetadata(template_id),
							}),
						},
					],
				};
			} catch (error) {
				return toolError("templates", "get_template_schema", error);
			}
		},
	);

	server.registerTool(
		"render_template",
		{
			title: "Render voice script template",
			description: "Renders any shared voice script without making a call.",
			inputSchema: {
				template_id: z.string().min(1).max(200),
				data: templateData,
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ template_id, data }) => {
			try {
				await touchAgentConnection(agent.id, "render_template").catch(
					() => undefined,
				);
				const rendered = renderTemplateForAgent(
					agent,
					template_id,
					data as EmailTemplateData,
				);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "templates",
								action: "render_template",
								data: rendered,
							}),
						},
					],
				};
			} catch (error) {
				return toolError("templates", "render_template", error);
			}
		},
	);

	server.registerTool(
		"send_template_email",
		{
			title: `Send shared template / SMS as ${agent.mailbox}`,
			description:
				"Renders and dispatches any template from the shared 144-template catalog.",
			inputSchema: {
				template_id: z.string().min(1).max(200),
				to: recipients,
				cc: recipients.optional(),
				bcc: recipients.optional(),
				data: templateData,
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async ({ template_id, to, cc, bcc, data }) => {
			try {
				await touchAgentConnection(agent.id, "send_template_email").catch(
					() => undefined,
				);
				const rendered = renderTemplateForAgent(
					agent,
					template_id,
					data as EmailTemplateData,
				);
				const result = await sendAsAgent(
					agent,
					{
						to,
						cc,
						bcc,
						subject: rendered.subject,
						text: rendered.text,
						html: rendered.html,
					},
					{ mode: "template", templateId: template_id },
				);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "templates",
								action: "send_template_email",
								data: { templateId: template_id, ...result },
							}),
						},
					],
				};
			} catch (error) {
				return toolError("templates", "send_template_email", error);
			}
		},
	);

	server.registerTool(
		"send_email",
		{
			title: `Send free-form follow-up message as ${agent.mailbox}`,
			description:
				"Sends a free-form email or follow-up message to one or more recipients.",
			inputSchema: {
				to: recipients,
				cc: recipients.optional(),
				bcc: recipients.optional(),
				subject: z.string().min(1).max(300),
				text: z.string().max(100_000).optional().describe("Plain-text body."),
				html: z.string().max(200_000).optional().describe("HTML body."),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async ({ to, cc, bcc, subject, text, html }) => {
			if (!text && !html)
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: false,
								domain: "templates",
								action: "send_email",
								code: "EMPTY_BODY",
								error: "Provide text and/or html.",
							}),
						},
					],
				};
			try {
				await touchAgentConnection(agent.id, "send_email").catch(
					() => undefined,
				);
				const result = await sendAsAgent(
					agent,
					{ to, cc, bcc, subject: cleanSubject(subject), text, html },
					{ mode: "raw" },
				);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "templates",
								action: "send_email",
								data: result,
							}),
						},
					],
				};
			} catch (error) {
				return toolError("templates", "send_email", error);
			}
		},
	);
};
