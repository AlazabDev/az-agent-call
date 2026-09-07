import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { normalizeText } from "../normalizer.js";
import type { DaftraSupplierRecord } from "../types.js";

export async function listSuppliers(
	params: { query?: string; limit?: number } = {},
): Promise<DaftraSupplierRecord[]> {
	const response = await daftraClient.get("/api2/suppliers.json", {
		limit: params.limit || 50,
	});
	const rawList = Array.isArray(response?.data)
		? response.data
		: Array.isArray(response)
			? response
			: [];

	let suppliers: DaftraSupplierRecord[] = rawList.map((item: any) => {
		const s = item.Supplier || item.supplier || item;
		return {
			id: parseInt(String(s.id), 10),
			supplier_number: s.supplier_number || s.no,
			first_name: s.first_name,
			last_name: s.last_name,
			business_name: s.business_name,
			email: s.email,
			phone1: s.phone1 || s.phone,
		};
	});

	if (params.query) {
		const normQ = normalizeText(params.query);
		suppliers = suppliers.filter(
			(s) =>
				normalizeText(s.first_name).includes(normQ) ||
				normalizeText(s.last_name).includes(normQ) ||
				normalizeText(s.business_name).includes(normQ) ||
				normalizeText(s.email).includes(normQ) ||
				String(s.id) === normQ,
		);
	}

	return suppliers;
}

export async function getSupplier(
	idOrQuery: number | string,
): Promise<DaftraSupplierRecord> {
	if (typeof idOrQuery === "number" || /^\d+$/.test(String(idOrQuery).trim())) {
		const supplierId = parseInt(String(idOrQuery).trim(), 10);
		const response = await daftraClient.get(
			`/api2/suppliers/${supplierId}.json`,
		);
		const s = response?.data?.Supplier || response?.data || response;
		if (!s?.id) {
			throw new DaftraError(
				"DAFTRA_NOT_FOUND",
				`Supplier #${supplierId} not found on Daftra ERP`,
				404,
			);
		}
		return {
			id: parseInt(String(s.id), 10),
			supplier_number: s.supplier_number,
			first_name: s.first_name,
			last_name: s.last_name,
			business_name: s.business_name,
			email: s.email,
			phone1: s.phone1 || s.phone,
		};
	}

	const matches = await listSuppliers({ query: String(idOrQuery) });
	if (matches.length === 0) {
		throw new DaftraError(
			"ENTITY_NOT_FOUND",
			`Supplier matching '${idOrQuery}' not found`,
			404,
		);
	}
	if (matches.length > 1) {
		throw new DaftraError(
			"AMBIGUOUS_ENTITY",
			`Multiple suppliers match '${idOrQuery}'`,
			400,
			{ matches },
		);
	}
	return matches[0];
}

export async function createSupplier(
	data: Partial<DaftraSupplierRecord>,
): Promise<DaftraSupplierRecord> {
	const payload = {
		Supplier: {
			first_name: data.first_name || "",
			last_name: data.last_name || "",
			business_name: data.business_name || "",
			email: data.email || "",
			phone1: data.phone1 || "",
		},
	};

	const response = await daftraClient.post("/api2/suppliers.json", payload);
	const created = response?.data?.Supplier || response?.data || response;
	return {
		id: parseInt(String(created.id), 10),
		first_name: created.first_name,
		last_name: created.last_name,
		business_name: created.business_name,
		email: created.email,
		phone1: created.phone1,
	};
}
