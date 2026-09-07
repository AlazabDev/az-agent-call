import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraService } from "../../../daftra/service.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraClientTools(
	server: McpServer,
	agent: RuntimeAgent,
) {
	if (hasCapability(agent, "daftra.clients.read")) {
		server.registerTool(
			"daftra_list_clients",
			{
				title: "Daftra ERP: List Clients",
				description:
					"Lists client profiles from Daftra ERP with optional query or phone filter.",
				inputSchema: {
					query: z.string().optional(),
					phone: z.string().optional(),
					limit: z.number().optional().default(50),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.clients.listClients(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_clients",
						success: true,
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: true,
									domain: "daftra",
									action: "daftra_list_clients",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_clients",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_list_clients",
									code: err.code || "ERROR",
									error: err.message,
								}),
							},
						],
					};
				}
			},
		);

		server.registerTool(
			"daftra_get_client",
			{
				title: "Daftra ERP: Get Client",
				description: "Retrieves a client profile by ID, phone, email, or name.",
				inputSchema: {
					idOrQuery: z
						.union([z.number(), z.string()])
						.describe("Client ID or search string"),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.clients.getClient(args.idOrQuery);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_client",
						entityType: "client",
						entityId: data.id,
						success: true,
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: true,
									domain: "daftra",
									action: "daftra_get_client",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_client",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_get_client",
									code: err.code || "ERROR",
									error: err.message,
									data: err.details,
								}),
							},
						],
					};
				}
			},
		);

		server.registerTool(
			"daftra_lookup_caller_context",
			{
				title: "Daftra ERP: Lookup Caller Customer 360",
				description:
					"Looks up customer profile, open invoices, work orders & unpaid balance by phone number for live call center context.",
				inputSchema: {
					phone: z.string().min(1).describe("Caller phone number"),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.clients.lookupCallerContext(
						args.phone,
					);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_lookup_caller_context",
						success: true,
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: true,
									domain: "daftra",
									action: "daftra_lookup_caller_context",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_lookup_caller_context",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_lookup_caller_context",
									code: err.code || "ERROR",
									error: err.message,
								}),
							},
						],
					};
				}
			},
		);
	}

	if (hasCapability(agent, "daftra.clients.write")) {
		server.registerTool(
			"daftra_create_client",
			{
				title: "Daftra ERP: Create Client",
				description: "Creates a new client account profile on Daftra ERP.",
				inputSchema: {
					first_name: z.string().optional(),
					last_name: z.string().optional(),
					business_name: z.string().optional(),
					email: z.string().optional(),
					phone1: z.string().optional(),
					address1: z.string().optional(),
					notes: z.string().optional(),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.clients.createClient(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_client",
						entityType: "client",
						entityId: data.id,
						success: true,
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: true,
									domain: "daftra",
									action: "daftra_create_client",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_client",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_create_client",
									code: err.code || "ERROR",
									error: err.message,
								}),
							},
						],
					};
				}
			},
		);
	}
}
