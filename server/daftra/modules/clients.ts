import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { normalizePhone, normalizeText } from "../normalizer.js";
import type {
	CustomerCallerContext,
	DaftraClientRecord,
	DaftraInvoiceRecord,
	DaftraWorkOrderRecord,
} from "../types.js";

export async function listClients(
	params: { query?: string; phone?: string; limit?: number } = {},
): Promise<DaftraClientRecord[]> {
	const response = await daftraClient.get("/api2/clients.json", {
		limit: params.limit || 50,
	});
	const rawList = Array.isArray(response?.data)
		? response.data
		: Array.isArray(response)
			? response
			: [];

	let clients: DaftraClientRecord[] = rawList.map((item: any) => {
		const data = item.Client || item.client || item;
		return {
			id: parseInt(String(data.id), 10),
			client_number: data.client_number || data.no,
			first_name: data.first_name,
			last_name: data.last_name,
			business_name: data.business_name,
			email: data.email,
			phone1: data.phone1 || data.phone,
			phone2: data.phone2,
			address1: data.address1,
			city: data.city,
			country_code: data.country_code,
			notes: data.notes,
			balance: parseFloat(String(data.balance || 0)),
			paid: parseFloat(String(data.paid || 0)),
			unpaid: parseFloat(String(data.unpaid || 0)),
			status: data.status || "active",
		};
	});

	if (params.phone) {
		const normSearchPhone = normalizePhone(params.phone);
		clients = clients.filter(
			(c) =>
				normalizePhone(c.phone1).includes(normSearchPhone) ||
				normalizePhone(c.phone2).includes(normSearchPhone),
		);
	}

	if (params.query) {
		const normQ = normalizeText(params.query);
		clients = clients.filter(
			(c) =>
				normalizeText(c.first_name).includes(normQ) ||
				normalizeText(c.last_name).includes(normQ) ||
				normalizeText(c.business_name).includes(normQ) ||
				normalizeText(c.email).includes(normQ) ||
				String(c.id) === normQ,
		);
	}

	return clients;
}

export async function getClient(
	idOrQuery: number | string,
): Promise<DaftraClientRecord> {
	if (typeof idOrQuery === "number" || /^\d+$/.test(String(idOrQuery).trim())) {
		const clientId = parseInt(String(idOrQuery).trim(), 10);
		const response = await daftraClient.get(`/api2/clients/${clientId}.json`);
		const data = response?.data?.Client || response?.data || response;
		if (!data?.id) {
			throw new DaftraError(
				"DAFTRA_NOT_FOUND",
				`Client #${clientId} not found on Daftra ERP`,
				404,
			);
		}
		return {
			id: parseInt(String(data.id), 10),
			client_number: data.client_number,
			first_name: data.first_name,
			last_name: data.last_name,
			business_name: data.business_name,
			email: data.email,
			phone1: data.phone1 || data.phone,
			phone2: data.phone2,
			address1: data.address1,
			city: data.city,
			notes: data.notes,
			balance: parseFloat(String(data.balance || 0)),
			paid: parseFloat(String(data.paid || 0)),
			unpaid: parseFloat(String(data.unpaid || 0)),
			status: data.status || "active",
		};
	}

	const matches = await listClients({ query: String(idOrQuery) });
	if (matches.length === 0) {
		throw new DaftraError(
			"ENTITY_NOT_FOUND",
			`Client matching '${idOrQuery}' not found`,
			404,
		);
	}
	if (matches.length > 1) {
		throw new DaftraError(
			"AMBIGUOUS_ENTITY",
			`Multiple clients match '${idOrQuery}'`,
			400,
			{ matches },
		);
	}
	return matches[0];
}

export async function createClient(
	data: Partial<DaftraClientRecord>,
): Promise<DaftraClientRecord> {
	const payload = {
		Client: {
			first_name: data.first_name || "",
			last_name: data.last_name || "",
			business_name: data.business_name || "",
			email: data.email || "",
			phone1: data.phone1 || "",
			address1: data.address1 || "",
			city: data.city || "",
			notes: data.notes || "",
		},
	};

	const response = await daftraClient.post("/api2/clients.json", payload);
	const created = response?.data?.Client || response?.data || response;
	return {
		id: parseInt(String(created.id), 10),
		first_name: created.first_name,
		last_name: created.last_name,
		business_name: created.business_name,
		email: created.email,
		phone1: created.phone1,
	};
}

/**
 * Caller Context Lookup: Normalizes phone number, fetches matched client, recent invoices & balance for Customer 360
 */
export async function lookupCallerContext(
	phoneNumber: string,
): Promise<CustomerCallerContext> {
	const normPhone = normalizePhone(phoneNumber);
	const matchedClients = await listClients({ phone: normPhone });

	if (matchedClients.length === 0) {
		return {
			openInvoices: [],
			recentInvoices: [],
			workOrders: [],
			balance: { totalBilled: 0, paid: 0, unpaid: 0, overdue: 0 },
			matchedBy: "none",
		};
	}

	const client = matchedClients[0];
	let recentInvoices: DaftraInvoiceRecord[] = [];
	let openInvoices: DaftraInvoiceRecord[] = [];
	let workOrders: DaftraWorkOrderRecord[] = [];

	try {
		const invRes = await daftraClient.get("/api2/invoices.json", {
			client_id: client.id,
			limit: 20,
		});
		const rawInvoices = Array.isArray(invRes?.data)
			? invRes.data
			: Array.isArray(invRes)
				? invRes
				: [];

		recentInvoices = rawInvoices.map((item: any) => {
			const inv = item.Invoice || item.invoice || item;
			return {
				id: parseInt(String(inv.id), 10),
				invoice_number: inv.invoice_number || inv.no,
				client_id: client.id,
				client_name: [client.first_name, client.last_name, client.business_name]
					.filter(Boolean)
					.join(" "),
				issue_date: inv.issue_date,
				due_date: inv.due_date,
				total: parseFloat(String(inv.total || 0)),
				paid: parseFloat(String(inv.paid || 0)),
				balance: parseFloat(
					String(inv.balance || (inv.total || 0) - (inv.paid || 0)),
				),
				status: inv.status || "draft",
			};
		});

		openInvoices = recentInvoices.filter(
			(inv) => inv.status !== "paid" && (inv.balance || 0) > 0,
		);
	} catch {
		// Non-fatal if invoices fail
	}

	try {
		const woRes = await daftraClient.get("/api2/work_orders.json", {
			client_id: client.id,
			limit: 20,
		});
		const rawWo = Array.isArray(woRes?.data)
			? woRes.data
			: Array.isArray(woRes)
				? woRes
				: [];
		workOrders = rawWo.map((item: any) => {
			const wo = item.WorkOrder || item.work_order || item;
			return {
				id: parseInt(String(wo.id), 10),
				order_no: wo.order_no || wo.no,
				title: wo.title || wo.name,
				client_id: client.id,
				status: wo.status,
			};
		});
	} catch {
		// Non-fatal if work orders fail
	}

	const totalBilled = recentInvoices.reduce(
		(sum, inv) => sum + (inv.total || 0),
		0,
	);
	const paid = recentInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
	const unpaid = recentInvoices.reduce(
		(sum, inv) => sum + (inv.balance || 0),
		0,
	);

	return {
		client,
		openInvoices,
		recentInvoices,
		workOrders,
		balance: {
			totalBilled,
			paid,
			unpaid,
			overdue: openInvoices
				.filter((inv) => inv.status === "overdue")
				.reduce((sum, inv) => sum + (inv.balance || 0), 0),
		},
		matchedBy: "phone",
	};
}
