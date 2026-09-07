import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraCreateInvoiceSchema } from "../../../daftra/schemas.js";
import { daftraService } from "../../../daftra/service.js";
import { hasCapability } from "../../capabilities.js";

export function registerDaftraInvoiceTools(
	server: McpServer,
	agent: RuntimeAgent,
) {
	if (hasCapability(agent, "daftra.invoices.read")) {
		server.registerTool(
			"daftra_list_invoices",
			{
				title: "Daftra ERP: List Invoices",
				description:
					"Lists sales invoices with optional client_id or status filter.",
				inputSchema: {
					client_id: z.number().optional(),
					status: z.string().optional(),
					limit: z.number().optional().default(50),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.invoices.listInvoices(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_invoices",
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
									action: "daftra_list_invoices",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_invoices",
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
									action: "daftra_list_invoices",
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
			"daftra_get_invoice",
			{
				title: "Daftra ERP: Get Invoice",
				description: "Retrieves complete invoice details by invoice ID.",
				inputSchema: {
					id: z.number().describe("Invoice ID"),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.invoices.getInvoice(args.id);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_invoice",
						entityType: "invoice",
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
									action: "daftra_get_invoice",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_invoice",
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
									action: "daftra_get_invoice",
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

	if (hasCapability(agent, "daftra.invoices.create")) {
		server.registerTool(
			"daftra_create_invoice",
			{
				title: "Daftra ERP: Create Invoice",
				description:
					"Creates a sales invoice or draft invoice in Daftra ERP using client ID and line items.",
				inputSchema: daftraCreateInvoiceSchema.shape,
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.invoices.createInvoice(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_invoice",
						entityType: "invoice",
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
									action: "daftra_create_invoice",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_invoice",
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
									action: "daftra_create_invoice",
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
			"daftra_create_smart_invoice",
			{
				title: "Daftra ERP: Create Smart Invoice",
				description:
					"Creates a sales invoice using text client names and product names via Smart Resolver.",
				inputSchema: {
					client_query: z
						.string()
						.min(1)
						.describe("Client name, email, or phone e.g. 'مؤسسة عوف'"),
					items: z
						.array(
							z.object({
								product_query: z
									.string()
									.optional()
									.describe("Product name or SKU"),
								name: z.string().optional(),
								unit_price: z.number().optional(),
								quantity: z.number().optional().default(1),
							}),
						)
						.min(1),
					notes: z.string().optional(),
					draft: z.boolean().optional().default(false),
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.invoices.createSmartInvoice(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_smart_invoice",
						entityType: "invoice",
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
									action: "daftra_create_smart_invoice",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_smart_invoice",
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
									action: "daftra_create_smart_invoice",
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
	}
}
