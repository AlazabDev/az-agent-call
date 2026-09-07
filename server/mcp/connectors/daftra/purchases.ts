import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../../agents.js";
import { logDaftraAction } from "../../../daftra/audit.js";
import { daftraCreatePurchaseOrderSchema } from "../../../daftra/schemas.js";
import { daftraService } from "../../../daftra/service.js";
import { hasCapability } from "../../capabilities.js";

const smartPurchaseItemsSchema = z
	.array(
		z.object({
			product_query: z.string().optional(),
			name: z.string().optional(),
			unit_price: z.number().positive().optional(),
			quantity: z.number().positive().optional().default(1),
		}),
	)
	.min(1);

export function registerDaftraPurchaseTools(
	server: McpServer,
	agent: RuntimeAgent,
) {
	if (hasCapability(agent, "daftra.purchases.read")) {
		server.registerTool(
			"daftra_list_purchase_orders",
			{
				title: "Daftra ERP: List Purchase Orders",
				description:
					"Lists purchase orders from Daftra ERP with optional supplier filter.",
				inputSchema: {
					supplier_id: z.number().optional(),
					limit: z.number().min(1).max(100).optional().default(50),
				},
				annotations: { readOnlyHint: true, openWorldHint: true },
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.purchases.listPurchaseOrders(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_purchase_orders",
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
									action: "daftra_list_purchase_orders",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_purchase_orders",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_list_purchase_orders",
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
			"daftra_get_purchase_order",
			{
				title: "Daftra ERP: Get Purchase Order",
				description: "Retrieves a purchase order by Daftra ID.",
				inputSchema: { id: z.number().int().positive() },
				annotations: { readOnlyHint: true, openWorldHint: true },
			},
			async ({ id }) => {
				const start = Date.now();
				try {
					const data = await daftraService.purchases.getPurchaseOrder(id);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_purchase_order",
						entityType: "purchase_order",
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
									action: "daftra_get_purchase_order",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_purchase_order",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_get_purchase_order",
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
			"daftra_list_purchase_invoices",
			{
				title: "Daftra ERP: List Purchase Invoices",
				description:
					"Lists supplier purchase invoices with optional supplier/work-order filters.",
				inputSchema: {
					supplier_id: z.number().int().positive().optional(),
					work_order_id: z.number().int().positive().optional(),
					limit: z.number().min(1).max(100).optional().default(50),
				},
				annotations: { readOnlyHint: true, openWorldHint: true },
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.purchases.listPurchaseInvoices(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_purchase_invoices",
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
									action: "daftra_list_purchase_invoices",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_list_purchase_invoices",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_list_purchase_invoices",
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
			"daftra_get_purchase_invoice",
			{
				title: "Daftra ERP: Get Purchase Invoice",
				description: "Retrieves one purchase invoice by Daftra ID.",
				inputSchema: { id: z.number().int().positive() },
				annotations: { readOnlyHint: true, openWorldHint: true },
			},
			async ({ id }) => {
				const start = Date.now();
				try {
					const data = await daftraService.purchases.getPurchaseInvoice(id);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_purchase_invoice",
						entityType: "purchase_invoice",
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
									action: "daftra_get_purchase_invoice",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_get_purchase_invoice",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_get_purchase_invoice",
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

	if (hasCapability(agent, "daftra.purchases.create")) {
		server.registerTool(
			"daftra_create_purchase_order",
			{
				title: "Daftra ERP: Create Purchase Order",
				description: "Creates a real purchase order in Daftra ERP.",
				inputSchema: daftraCreatePurchaseOrderSchema.extend({
					work_order_id: z.number().int().positive().optional(),
				}).shape,
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data = await daftraService.purchases.createPurchaseOrder(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_purchase_order",
						entityType: "purchase_order",
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
									action: "daftra_create_purchase_order",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_purchase_order",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_create_purchase_order",
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
			"daftra_create_smart_purchase_order",
			{
				title: "Daftra ERP: Create Smart Purchase Order",
				description:
					"Resolves supplier, optional work order, and product names before creating a real purchase order.",
				inputSchema: {
					supplier_query: z.string().min(1),
					work_order_query: z.string().optional(),
					items: smartPurchaseItemsSchema,
					notes: z.string().optional(),
				},
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data =
						await daftraService.purchases.createSmartPurchaseOrder(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_smart_purchase_order",
						entityType: "purchase_order",
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
									action: "daftra_create_smart_purchase_order",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_smart_purchase_order",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_create_smart_purchase_order",
									code: err.code || "ERROR",
									error: err.message,
									details: err.details,
								}),
							},
						],
					};
				}
			},
		);

		server.registerTool(
			"daftra_create_purchase_invoice",
			{
				title: "Daftra ERP: Create Purchase Invoice",
				description:
					"Creates a real supplier purchase invoice. This is the direct tool for purchase bills, not a purchase order.",
				inputSchema: {
					supplier_id: z.number().int().positive(),
					work_order_id: z.number().int().positive().optional(),
					items: z
						.array(
							z.object({
								product_id: z.number().int().positive().optional(),
								name: z.string().optional(),
								unit_price: z.number().positive(),
								quantity: z.number().positive().default(1),
							}),
						)
						.min(1),
					notes: z.string().optional(),
					date: z.string().optional(),
					draft: z.boolean().optional().default(false),
				},
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data =
						await daftraService.purchases.createPurchaseInvoice(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_purchase_invoice",
						entityType: "purchase_invoice",
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
									action: "daftra_create_purchase_invoice",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_purchase_invoice",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_create_purchase_invoice",
									code: err.code || "ERROR",
									error: err.message,
									details: err.details,
								}),
							},
						],
					};
				}
			},
		);

		server.registerTool(
			"daftra_create_smart_purchase_invoice",
			{
				title: "Daftra ERP: Create Smart Purchase Invoice",
				description:
					"Creates a real purchase invoice after resolving Arabic/English supplier, project/work-order and product names to Daftra IDs.",
				inputSchema: {
					supplier_query: z
						.string()
						.min(1)
						.describe("Supplier name or ID, e.g. ماربل جولد"),
					work_order_query: z
						.string()
						.optional()
						.describe("Project/work-order name or ID, e.g. أربيسك"),
					items: smartPurchaseItemsSchema,
					notes: z.string().optional(),
					date: z.string().optional(),
					draft: z.boolean().optional().default(false),
				},
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async (args) => {
				const start = Date.now();
				try {
					const data =
						await daftraService.purchases.createSmartPurchaseInvoice(args);
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_smart_purchase_invoice",
						entityType: "purchase_invoice",
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
									action: "daftra_create_smart_purchase_invoice",
									data,
								}),
							},
						],
					};
				} catch (err: any) {
					await logDaftraAction({
						agentId: agent.id,
						action: "daftra_create_smart_purchase_invoice",
						success: false,
						errorCode: err.code || "ERROR",
						durationMs: Date.now() - start,
					});
					return {
						isError: true,
						content: [
							{
								type: "text",
								text: JSON.stringify({
									ok: false,
									domain: "daftra",
									action: "daftra_create_smart_purchase_invoice",
									code: err.code || "ERROR",
									error: err.message,
									details: err.details,
								}),
							},
						],
					};
				}
			},
		);
	}
}
