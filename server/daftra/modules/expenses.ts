import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import type { DaftraExpenseRecord } from "../types.js";

export async function listExpenses(
	params: { limit?: number } = {},
): Promise<DaftraExpenseRecord[]> {
	const response = await daftraClient.get("/api2/expenses.json", {
		limit: params.limit || 50,
	});
	const rawList = Array.isArray(response?.data)
		? response.data
		: Array.isArray(response)
			? response
			: [];

	return rawList.map((item: any) => {
		const exp = item.Expense || item.expense || item;
		return {
			id: parseInt(String(exp.id), 10),
			title: exp.title || exp.vendor || exp.name || "Expense",
			amount: parseFloat(String(exp.amount || 0)),
			category_id:
				exp.expense_category_id || exp.category_id
					? parseInt(String(exp.expense_category_id || exp.category_id), 10)
					: undefined,
			payment_method: exp.payment_method,
			date: exp.date,
			notes: exp.note || exp.notes,
		};
	});
}

export async function createExpense(data: {
	title: string;
	amount: number;
	category_id?: number;
	payment_method?: string;
	notes?: string;
}): Promise<DaftraExpenseRecord> {
	const payload = {
		Expense: {
			amount: data.amount,
			date: new Date().toISOString().split("T")[0],
			vendor: data.title,
			expense_category_id: data.category_id,
			note: data.notes || "",
		},
	};

	const response = await daftraClient.post("/api2/expenses.json", payload);
	const created = response?.data?.Expense || response?.data || response;

	if (!created?.id) {
		throw new DaftraError(
			"DAFTRA_WRITE_UNCERTAIN",
			"Failed to confirm expense creation response from Daftra ERP",
		);
	}

	return {
		id: parseInt(String(created.id), 10),
		title: created.title || created.vendor || data.title,
		amount: parseFloat(String(created.amount || data.amount)),
		payment_method: created.payment_method || data.payment_method,
		date: created.date || new Date().toISOString().split("T")[0],
	};
}

export async function createSmartExpense(data: {
	title: string;
	amount: number;
	notes?: string;
}): Promise<DaftraExpenseRecord> {
	return createExpense({
		title: data.title,
		amount: data.amount,
		notes: data.notes,
	});
}
