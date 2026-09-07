import { daftraClient } from "../client.js";
import type { DaftraIncomeRecord } from "../types.js";

export async function listIncomes(
	params: { limit?: number } = {},
): Promise<DaftraIncomeRecord[]> {
	const response = await daftraClient.get("/api2/incomes.json", {
		limit: params.limit || 50,
	});
	const rawList = Array.isArray(response?.data)
		? response.data
		: Array.isArray(response)
			? response
			: [];

	return rawList.map((item: any) => {
		const income = item.Income || item.income || item;
		return {
			id: parseInt(String(income.id), 10),
			title: income.title || income.vendor || income.name || "Income",
			amount: parseFloat(String(income.amount || 0)),
			date: income.date,
			notes: income.note || income.notes,
		};
	});
}
