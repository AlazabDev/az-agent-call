import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { hasCapability } from "../capabilities.js";
import type { McpConnectorRegister } from "../types.js";

export const registerUberFixConnector: McpConnectorRegister = (
	server: McpServer,
	agent: RuntimeAgent,
) => {
	if (!hasCapability(agent, "uberfix.read")) return;

	const gatewayUrl = process.env.UBERFIX_GATEWAY_URL?.trim() || "";
	const apiKey = process.env.UBERFIX_API_KEY?.trim() || "";
	const requireConfig = () => {
		if (!gatewayUrl || !apiKey)
			throw new Error(
				"UBERFIX_NOT_CONFIGURED: Set UBERFIX_GATEWAY_URL and UBERFIX_API_KEY.",
			);
	};
	const headers = () => ({
		Accept: "application/json",
		"Content-Type": "application/json",
		"x-api-key": apiKey,
	});
	const call = async (payload: Record<string, unknown>) => {
		requireConfig();
		const response = await fetch(gatewayUrl, {
			method: "POST",
			headers: headers(),
			body: JSON.stringify(payload),
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok)
			throw new Error(
				`UBERFIX_HTTP_${response.status}: ${JSON.stringify(body)}`,
			);
		return body;
	};

	server.registerTool(
		"uberfix_create_ticket",
		{
			title: "UberFix Maintenance: Create maintenance ticket",
			description: "Creates a real maintenance request in UberFix.",
			inputSchema: {
				client_name: z.string().min(1),
				client_phone: z.string().min(1),
				issue_description: z.string().min(1),
				location: z.string().optional(),
				priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async (args) => {
			try {
				await touchAgentConnection(agent.id, "uberfix_create_ticket").catch(
					() => undefined,
				);
				if (!hasCapability(agent, "uberfix.write"))
					throw new Error(
						"CAPABILITY_DENIED: Agent lacks uberfix.write capability",
					);
				const data = await call({
					action: "create_ticket",
					...args,
					agent_id: agent.id,
				});
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "uberfix",
								action: "uberfix_create_ticket",
								data,
							}),
						},
					],
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: false,
								domain: "uberfix",
								action: "uberfix_create_ticket",
								error: message,
							}),
						},
					],
				};
			}
		},
	);

	server.registerTool(
		"uberfix_get_status",
		{
			title: "UberFix Maintenance: Get ticket status",
			description:
				"Gets the real lifecycle state and assignment of an UberFix ticket.",
			inputSchema: { ticket_id: z.string().min(1) },
			annotations: { readOnlyHint: true, openWorldHint: true },
		},
		async ({ ticket_id }) => {
			try {
				await touchAgentConnection(agent.id, "uberfix_get_status").catch(
					() => undefined,
				);
				const data = await call({ action: "get_status", ticket_id });
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "uberfix",
								action: "uberfix_get_status",
								data,
							}),
						},
					],
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: false,
								domain: "uberfix",
								action: "uberfix_get_status",
								error: message,
							}),
						},
					],
				};
			}
		},
	);

	server.registerTool(
		"uberfix_transition_stage",
		{
			title: "UberFix Maintenance: Transition ticket stage",
			description: "Moves a real UberFix ticket to a target workflow stage.",
			inputSchema: {
				ticket_id: z.string().min(1),
				target_stage: z.enum([
					"pending",
					"assigned",
					"in_progress",
					"completed",
					"cancelled",
				]),
				note: z.string().optional(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async ({ ticket_id, target_stage, note }) => {
			try {
				await touchAgentConnection(agent.id, "uberfix_transition_stage").catch(
					() => undefined,
				);
				if (!hasCapability(agent, "uberfix.write"))
					throw new Error(
						"CAPABILITY_DENIED: Agent lacks uberfix.write capability",
					);
				const data = await call({
					action: "transition_stage",
					ticket_id,
					target_stage,
					note,
					agent_id: agent.id,
				});
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "uberfix",
								action: "uberfix_transition_stage",
								data,
							}),
						},
					],
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: false,
								domain: "uberfix",
								action: "uberfix_transition_stage",
								error: message,
							}),
						},
					],
				};
			}
		},
	);

	server.registerTool(
		"uberfix_add_note",
		{
			title: "UberFix Maintenance: Add note to ticket",
			description:
				"Adds a real follow-up note to an UberFix maintenance ticket.",
			inputSchema: { ticket_id: z.string().min(1), note: z.string().min(1) },
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async ({ ticket_id, note }) => {
			try {
				await touchAgentConnection(agent.id, "uberfix_add_note").catch(
					() => undefined,
				);
				if (!hasCapability(agent, "uberfix.write"))
					throw new Error(
						"CAPABILITY_DENIED: Agent lacks uberfix.write capability",
					);
				const data = await call({
					action: "add_note",
					ticket_id,
					note,
					agent_id: agent.id,
				});
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "uberfix",
								action: "uberfix_add_note",
								data,
							}),
						},
					],
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: false,
								domain: "uberfix",
								action: "uberfix_add_note",
								error: message,
							}),
						},
					],
				};
			}
		},
	);
};
