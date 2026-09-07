import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { hasCapability } from "../capabilities.js";
import type { McpConnectorRegister } from "../types.js";

export const registerMagicPlanConnector: McpConnectorRegister = (
	server: McpServer,
	agent: RuntimeAgent,
) => {
	if (!hasCapability(agent, "magicplan.read")) return;

	const baseUrl = (
		process.env.MAGICPLAN_BASE_URL || "https://cloud.magicplan.app/api/v2"
	).replace(/\/$/, "");
	const apiKey = process.env.MAGICPLAN_API_KEY?.trim() || "";
	const customerKey =
		process.env.MAGICPLAN_CUSTOMER_KEY?.trim() ||
		process.env.MAGICPLAN_CUSTOMER_ID?.trim() ||
		"";

	const requireConfig = () => {
		if (!apiKey || !customerKey) {
			throw new Error(
				"MAGICPLAN_NOT_CONFIGURED: Set MAGICPLAN_API_KEY and MAGICPLAN_CUSTOMER_KEY (or MAGICPLAN_CUSTOMER_ID).",
			);
		}
	};
	const headers = () => ({
		Accept: "application/json",
		"Content-Type": "application/json",
		key: apiKey,
		customer: customerKey,
	});

	server.registerTool(
		"magicplan_list_projects",
		{
			title: "MagicPlan Architectural: List projects",
			description:
				"Lists real MagicPlan Cloud projects and survey/floorplan records.",
			inputSchema: {
				search_term: z.string().optional(),
				limit: z.number().min(1).max(50).default(20),
			},
			annotations: { readOnlyHint: true, openWorldHint: true },
		},
		async ({ search_term, limit }) => {
			try {
				await touchAgentConnection(agent.id, "magicplan_list_projects").catch(
					() => undefined,
				);
				requireConfig();
				const url = new URL(`${baseUrl}/projects`);
				url.searchParams.set("limit", String(limit));
				if (search_term) url.searchParams.set("q", search_term);
				const response = await fetch(url, { headers: headers() });
				const body = await response.json().catch(() => ({}));
				if (!response.ok)
					throw new Error(
						`MAGICPLAN_HTTP_${response.status}: ${JSON.stringify(body)}`,
					);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "magicplan",
								action: "magicplan_list_projects",
								data: body,
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
								domain: "magicplan",
								action: "magicplan_list_projects",
								error: message,
							}),
						},
					],
				};
			}
		},
	);

	server.registerTool(
		"magicplan_get_project",
		{
			title: "MagicPlan Architectural: Get project",
			description:
				"Retrieves complete real MagicPlan project metadata and floorplan details.",
			inputSchema: { project_id: z.string().min(1) },
			annotations: { readOnlyHint: true, openWorldHint: true },
		},
		async ({ project_id }) => {
			try {
				await touchAgentConnection(agent.id, "magicplan_get_project").catch(
					() => undefined,
				);
				requireConfig();
				const response = await fetch(
					`${baseUrl}/projects/${encodeURIComponent(project_id)}`,
					{ headers: headers() },
				);
				const body = await response.json().catch(() => ({}));
				if (!response.ok)
					throw new Error(
						`MAGICPLAN_HTTP_${response.status}: ${JSON.stringify(body)}`,
					);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "magicplan",
								action: "magicplan_get_project",
								data: body,
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
								domain: "magicplan",
								action: "magicplan_get_project",
								error: message,
							}),
						},
					],
				};
			}
		},
	);

	server.registerTool(
		"magicplan_list_files",
		{
			title: "MagicPlan Architectural: List project export files",
			description:
				"Lists real exported PDF/2D/3D/CAD files for a MagicPlan project.",
			inputSchema: { project_id: z.string().min(1) },
			annotations: { readOnlyHint: true, openWorldHint: true },
		},
		async ({ project_id }) => {
			try {
				await touchAgentConnection(agent.id, "magicplan_list_files").catch(
					() => undefined,
				);
				requireConfig();
				const response = await fetch(
					`${baseUrl}/projects/${encodeURIComponent(project_id)}/files`,
					{ headers: headers() },
				);
				const body = await response.json().catch(() => ({}));
				if (!response.ok)
					throw new Error(
						`MAGICPLAN_HTTP_${response.status}: ${JSON.stringify(body)}`,
					);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								ok: true,
								domain: "magicplan",
								action: "magicplan_list_files",
								data: body,
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
								domain: "magicplan",
								action: "magicplan_list_files",
								error: message,
							}),
						},
					],
				};
			}
		},
	);
};
