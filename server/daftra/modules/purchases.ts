import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { smartResolver } from "../resolver.js";
import type {
	DaftraInvoiceItem,
	DaftraPurchaseInvoiceRecord,
	DaftraPurchaseOrderRecord,
} from "../types.js";
import { getProduct } from "./products.js";
import { getSupplier } from "./suppliers.js";

function unwrapList(response: any): any[] {
	if (Array.isArray(response?.data)) return response.data;
	if (Array.isArray(response)) return response;
	return [];
}

function purchaseItems(items: DaftraInvoiceItem[]) {
	return items.map((it) => ({
		item: it.name || "Purchase Item",
		product_id: it.product_id || undefined,
		unit_price: it.unit_price,
		quantity: it.quantity || 1,
		discount: it.discount || 0,
	}));
}

async function resolveSmartItems(
	rows: Array<{
		product_query?: string;
		name?: string;
		unit_price?: number;
		quantity?: number;
	}>,
): Promise<DaftraInvoiceItem[]> {
	const items: DaftraInvoiceItem[] = [];
	for (const row of rows) {
		let productId: number | undefined;
		let itemName = row.name || row.product_query || "Purchase Item";
		let unitPrice = row.unit_price || 0;

		if (row.product_query) {
			const resolved = await smartResolver.resolveSingleEntity(
				row.product_query,
				"product",
				["name", "product_code"],
			);
			if (resolved.status === "ambiguous") {
				throw new DaftraError(
					"AMBIGUOUS_ENTITY",
					`Product '${row.product_query}' is ambiguous`,
					400,
					{ matches: resolved.matches },
				);
			}
			if (resolved.status === "resolved") {
				productId = resolved.id;
				const product = await getProduct(resolved.id);
				itemName = product.name || itemName;
				if (!unitPrice)
					unitPrice = product.purchase_price || product.unit_price || 0;
			}
		}

		if (!unitPrice || unitPrice <= 0) {
			throw new DaftraError(
				"DAFTRA_VALIDATION_ERROR",
				`Unit price required for purchase item '${itemName}'`,
			);
		}

		items.push({
			product_id: productId,
			name: itemName,
			unit_price: unitPrice,
			quantity: row.quantity || 1,
		});
	}
	return items;
}

export async function listPurchaseOrders(
	params: { supplier_id?: number; limit?: number } = {},
): Promise<DaftraPurchaseOrderRecord[]> {
	const queryParams: Record<string, any> = { limit: params.limit || 50 };
	if (params.supplier_id) queryParams.supplier_id = params.supplier_id;

	const response = await daftraClient.get(
		"/api2/purchase_orders.json",
		queryParams,
	);
	return unwrapList(response).map((item: any) => {
		const po = item.PurchaseOrder || item.purchase_order || item;
		return {
			id: parseInt(String(po.id), 10),
			order_number: po.order_number || po.no,
			supplier_id: parseInt(String(po.supplier_id || 0), 10),
			total: parseFloat(String(po.total || 0)),
			status: po.status || "draft",
			issue_date: po.issue_date || po.date,
		};
	});
}

export async function getPurchaseOrder(
	id: number,
): Promise<DaftraPurchaseOrderRecord> {
	const response = await daftraClient.get(`/api2/purchase_orders/${id}.json`);
	const po =
		response?.data?.PurchaseOrder ||
		response?.PurchaseOrder ||
		response?.data ||
		response;
	if (!po?.id)
		throw new DaftraError(
			"DAFTRA_NOT_FOUND",
			`Purchase Order #${id} not found on Daftra ERP`,
			404,
		);
	return {
		id: parseInt(String(po.id), 10),
		order_number: po.order_number || po.no,
		supplier_id: parseInt(String(po.supplier_id || 0), 10),
		total: parseFloat(String(po.total || 0)),
		status: po.status || "draft",
		issue_date: po.issue_date || po.date,
	};
}

export async function createPurchaseOrder(data: {
	supplier_id: number;
	items: DaftraInvoiceItem[];
	notes?: string;
	work_order_id?: number;
}): Promise<DaftraPurchaseOrderRecord> {
	const supplier = await getSupplier(data.supplier_id);
	const payload = {
		PurchaseOrder: {
			supplier_id: supplier.id,
			date: new Date().toISOString().split("T")[0],
			notes: data.notes || "",
			work_order_id: data.work_order_id,
		},
		PurchaseOrderItem: purchaseItems(data.items),
	};

	const response = await daftraClient.post(
		"/api2/purchase_orders.json",
		payload,
	);
	const created =
		response?.data?.PurchaseOrder ||
		response?.PurchaseOrder ||
		response?.data ||
		response;
	if (!created?.id)
		throw new DaftraError(
			"DAFTRA_WRITE_UNCERTAIN",
			"Failed to confirm purchase order creation response from Daftra ERP",
		);

	return {
		id: parseInt(String(created.id), 10),
		order_number: created.order_number || created.no,
		supplier_id: supplier.id,
		total: parseFloat(String(created.total || 0)),
		status: created.status || "draft",
		issue_date: created.issue_date || created.date,
	};
}

export async function createSmartPurchaseOrder(data: {
	supplier_query: string;
	items: Array<{
		product_query?: string;
		name?: string;
		unit_price?: number;
		quantity?: number;
	}>;
	notes?: string;
	work_order_query?: string;
}): Promise<DaftraPurchaseOrderRecord> {
	const suppRes = await smartResolver.resolveSingleEntity(
		data.supplier_query,
		"supplier",
		["first_name", "last_name", "business_name"],
	);
	if (suppRes.status === "not_found")
		throw new DaftraError(
			"ENTITY_NOT_FOUND",
			`Supplier '${data.supplier_query}' not found in Daftra ERP`,
		);
	if (suppRes.status === "ambiguous")
		throw new DaftraError(
			"AMBIGUOUS_ENTITY",
			`Supplier name '${data.supplier_query}' is ambiguous`,
			400,
			{ matches: suppRes.matches },
		);

	let workOrderId: number | undefined;
	if (data.work_order_query) {
		const wo = await smartResolver.resolveSingleEntity(
			data.work_order_query,
			"work_order",
			["name", "title", "order_no"],
		);
		if (wo.status === "not_found")
			throw new DaftraError(
				"ENTITY_NOT_FOUND",
				`Work order '${data.work_order_query}' not found in Daftra ERP`,
			);
		if (wo.status === "ambiguous")
			throw new DaftraError(
				"AMBIGUOUS_ENTITY",
				`Work order '${data.work_order_query}' is ambiguous`,
				400,
				{ matches: wo.matches },
			);
		workOrderId = wo.id;
	}

	return createPurchaseOrder({
		supplier_id: suppRes.id,
		items: await resolveSmartItems(data.items),
		notes: data.notes,
		work_order_id: workOrderId,
	});
}

export async function listPurchaseInvoices(
	params: { supplier_id?: number; work_order_id?: number; limit?: number } = {},
): Promise<DaftraPurchaseInvoiceRecord[]> {
	const query: Record<string, any> = { limit: params.limit || 50 };
	if (params.supplier_id) query.supplier_id = params.supplier_id;
	if (params.work_order_id) query.work_order_id = params.work_order_id;
	const response = await daftraClient.get(
		"/api2/purchase_invoices.json",
		query,
	);
	return unwrapList(response).map((item: any) => {
		const pi = item.PurchaseOrder || item.purchase_order || item;
		return {
			id: parseInt(String(pi.id), 10),
			invoice_number: pi.no || pi.invoice_number || pi.order_number,
			supplier_id: parseInt(String(pi.supplier_id || 0), 10),
			supplier_name: pi.supplier_name || pi.supplier_business_name,
			total: parseFloat(String(pi.total || 0)),
			paid: parseFloat(String(pi.paid || 0)),
			balance: parseFloat(String(pi.balance || 0)),
			status: pi.status,
			date: pi.date || pi.issue_date,
			work_order_id: pi.work_order_id
				? parseInt(String(pi.work_order_id), 10)
				: undefined,
		};
	});
}

export async function getPurchaseInvoice(
	id: number,
): Promise<DaftraPurchaseInvoiceRecord> {
	const response = await daftraClient.get(`/api2/purchase_invoices/${id}.json`);
	const pi =
		response?.data?.PurchaseOrder ||
		response?.PurchaseOrder ||
		response?.data ||
		response;
	if (!pi?.id)
		throw new DaftraError(
			"DAFTRA_NOT_FOUND",
			`Purchase Invoice #${id} not found on Daftra ERP`,
			404,
		);
	return {
		id: parseInt(String(pi.id), 10),
		invoice_number: pi.no || pi.invoice_number || pi.order_number,
		supplier_id: parseInt(String(pi.supplier_id || 0), 10),
		supplier_name: pi.supplier_name || pi.supplier_business_name,
		total: parseFloat(String(pi.total || 0)),
		paid: parseFloat(String(pi.paid || 0)),
		balance: parseFloat(String(pi.balance || 0)),
		status: pi.status,
		date: pi.date || pi.issue_date,
		work_order_id: pi.work_order_id
			? parseInt(String(pi.work_order_id), 10)
			: undefined,
	};
}

export async function createPurchaseInvoice(data: {
	supplier_id: number;
	items: DaftraInvoiceItem[];
	notes?: string;
	work_order_id?: number;
	date?: string;
	draft?: boolean;
}): Promise<DaftraPurchaseInvoiceRecord> {
	const supplier = await getSupplier(data.supplier_id);
	const payload = {
		PurchaseOrder: {
			supplier_id: supplier.id,
			date: data.date || new Date().toISOString().split("T")[0],
			notes: data.notes || "",
			work_order_id: data.work_order_id,
		},
		PurchaseOrderItem: purchaseItems(data.items),
	};
	const response = await daftraClient.request("/api2/purchase_invoices.json", {
		method: "POST",
		query: data.draft ? { send: "draft" } : undefined,
		body: payload,
	});
	const created =
		response?.data?.PurchaseOrder ||
		response?.PurchaseOrder ||
		response?.data ||
		response;
	if (!created?.id)
		throw new DaftraError(
			"DAFTRA_WRITE_UNCERTAIN",
			"Failed to confirm purchase invoice creation response from Daftra ERP",
		);
	return {
		id: parseInt(String(created.id), 10),
		invoice_number:
			created.no || created.invoice_number || created.order_number,
		supplier_id: supplier.id,
		supplier_name: [
			supplier.first_name,
			supplier.last_name,
			supplier.business_name,
		]
			.filter(Boolean)
			.join(" "),
		total: parseFloat(String(created.total || 0)),
		paid: parseFloat(String(created.paid || 0)),
		balance: parseFloat(String(created.balance || 0)),
		status: created.status || (data.draft ? "draft" : "received"),
		date: created.date || data.date,
		work_order_id: data.work_order_id,
	};
}

export async function createSmartPurchaseInvoice(data: {
	supplier_query: string;
	work_order_query?: string;
	items: Array<{
		product_query?: string;
		name?: string;
		unit_price?: number;
		quantity?: number;
	}>;
	notes?: string;
	date?: string;
	draft?: boolean;
}): Promise<DaftraPurchaseInvoiceRecord> {
	const supplier = await smartResolver.resolveSingleEntity(
		data.supplier_query,
		"supplier",
		["first_name", "last_name", "business_name"],
	);
	if (supplier.status === "not_found")
		throw new DaftraError(
			"ENTITY_NOT_FOUND",
			`Supplier '${data.supplier_query}' not found in Daftra ERP`,
		);
	if (supplier.status === "ambiguous")
		throw new DaftraError(
			"AMBIGUOUS_ENTITY",
			`Supplier '${data.supplier_query}' is ambiguous`,
			400,
			{ matches: supplier.matches },
		);

	let workOrderId: number | undefined;
	if (data.work_order_query) {
		const wo = await smartResolver.resolveSingleEntity(
			data.work_order_query,
			"work_order",
			["name", "title", "order_no"],
		);
		if (wo.status === "not_found")
			throw new DaftraError(
				"ENTITY_NOT_FOUND",
				`Work order '${data.work_order_query}' not found in Daftra ERP`,
			);
		if (wo.status === "ambiguous")
			throw new DaftraError(
				"AMBIGUOUS_ENTITY",
				`Work order '${data.work_order_query}' is ambiguous`,
				400,
				{ matches: wo.matches },
			);
		workOrderId = wo.id;
	}

	return createPurchaseInvoice({
		supplier_id: supplier.id,
		work_order_id: workOrderId,
		items: await resolveSmartItems(data.items),
		notes: data.notes,
		date: data.date,
		draft: data.draft,
	});
}
