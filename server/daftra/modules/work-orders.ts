import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { normalizeText } from "../normalizer.js";
import type { DaftraWorkOrderRecord } from "../types.js";

export async function searchWorkOrders(query?: string): Promise<DaftraWorkOrderRecord[]> {
  const response = await daftraClient.get("/v2/api/entity/work_order/list/1", { limit: 100 });
  const rawList = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

  let workOrders: DaftraWorkOrderRecord[] = rawList.map((item: any) => ({
    id: parseInt(String(item.id), 10),
    order_no: item.order_no || item.no,
    title: item.title || item.name,
    name: item.name || item.title,
    client_id: item.client_id ? parseInt(String(item.client_id), 10) : undefined,
    status: item.status,
    start_date: item.start_date,
    end_date: item.end_date,
  }));

  if (query) {
    const normQ = normalizeText(query);
    workOrders = workOrders.filter(
      (wo) =>
        normalizeText(wo.title).includes(normQ) ||
        normalizeText(wo.order_no).includes(normQ) ||
        String(wo.id) === normQ
    );
  }

  return workOrders;
}

export async function getWorkOrder(id: number): Promise<DaftraWorkOrderRecord> {
  const response = await daftraClient.get(`/v2/api/entity/work_order/${id}`);
  const item = response?.data || response;

  if (!item || !item.id) {
    throw new DaftraError("DAFTRA_NOT_FOUND", `Work Order #${id} not found on Daftra ERP`, 404);
  }

  return {
    id: parseInt(String(item.id), 10),
    order_no: item.order_no || item.no,
    title: item.title || item.name,
    client_id: item.client_id ? parseInt(String(item.client_id), 10) : undefined,
    status: item.status,
    start_date: item.start_date,
    end_date: item.end_date,
  };
}
