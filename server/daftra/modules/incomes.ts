import { daftraClient } from "../client.js";
import type { DaftraIncomeRecord } from "../types.js";

export async function listIncomes(params: { limit?: number } = {}): Promise<DaftraIncomeRecord[]> {
  const response = await daftraClient.get("/v2/api/entity/income/list/1", { limit: params.limit || 50 });
  const rawList = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

  return rawList.map((item: any) => ({
    id: parseInt(String(item.id), 10),
    title: item.title || item.name || "Income",
    amount: parseFloat(String(item.amount || 0)),
    date: item.date,
    notes: item.notes,
  }));
}
