import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { smartResolver } from "../resolver.js";
import type { DaftraInvoiceItem, DaftraPurchaseOrderRecord } from "../types.js";
import { getSupplier } from "./suppliers.js";

export async function listPurchaseOrders(params: { supplier_id?: number; limit?: number } = {}): Promise<DaftraPurchaseOrderRecord[]> {
  const queryParams: Record<string, any> = { limit: params.limit || 50 };
  if (params.supplier_id) queryParams.supplier_id = params.supplier_id;

  const response = await daftraClient.get("/api2/purchase_orders.json", queryParams);
  const rawList = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

  return rawList.map((item: any) => {
    const po = item.PurchaseOrder || item.purchase_order || item;
    return {
      id: parseInt(String(po.id), 10),
      order_number: po.order_number || po.no,
      supplier_id: parseInt(String(po.supplier_id || 0), 10),
      total: parseFloat(String(po.total || 0)),
      status: po.status || "draft",
      issue_date: po.issue_date,
    };
  });
}

export async function getPurchaseOrder(id: number): Promise<DaftraPurchaseOrderRecord> {
  const response = await daftraClient.get(`/api2/purchase_orders/${id}.json`);
  const po = response?.data?.PurchaseOrder || response?.data || response;
  if (!po || !po.id) {
    throw new DaftraError("DAFTRA_NOT_FOUND", `Purchase Order #${id} not found on Daftra ERP`, 404);
  }

  return {
    id: parseInt(String(po.id), 10),
    order_number: po.order_number || po.no,
    supplier_id: parseInt(String(po.supplier_id || 0), 10),
    total: parseFloat(String(po.total || 0)),
    status: po.status || "draft",
    issue_date: po.issue_date,
  };
}

export async function createPurchaseOrder(data: {
  supplier_id: number;
  items: DaftraInvoiceItem[];
  notes?: string;
}): Promise<DaftraPurchaseOrderRecord> {
  const supplier = await getSupplier(data.supplier_id);

  const formattedItems = data.items.map((it) => ({
    item_title: it.name || "Item",
    product_id: it.product_id || 0,
    unit_price: it.unit_price,
    quantity: it.quantity || 1,
  }));

  const payload = {
    PurchaseOrder: {
      supplier_id: supplier.id,
      notes: data.notes || "",
      order_items: formattedItems,
    },
  };

  const response = await daftraClient.post("/api2/purchase_orders.json", payload);
  const created = response?.data?.PurchaseOrder || response?.data || response;

  if (!created || !created.id) {
    throw new DaftraError("DAFTRA_WRITE_UNCERTAIN", "Failed to confirm purchase order creation response from Daftra ERP");
  }

  return {
    id: parseInt(String(created.id), 10),
    order_number: created.order_number || created.no,
    supplier_id: supplier.id,
    total: parseFloat(String(created.total || 0)),
    status: created.status || "draft",
  };
}

export async function createSmartPurchaseOrder(data: {
  supplier_query: string;
  items: Array<{ product_query?: string; name?: string; unit_price?: number; quantity?: number }>;
  notes?: string;
}): Promise<DaftraPurchaseOrderRecord> {
  const suppRes = await smartResolver.resolveSingleEntity(data.supplier_query, "supplier", [
    "first_name",
    "last_name",
    "business_name",
  ]);

  if (suppRes.status === "not_found") {
    throw new DaftraError("ENTITY_NOT_FOUND", `Supplier '${data.supplier_query}' not found in Daftra ERP`);
  }
  if (suppRes.status === "ambiguous") {
    throw new DaftraError("AMBIGUOUS_ENTITY", `Supplier name '${data.supplier_query}' is ambiguous`, 400, {
      matches: suppRes.matches,
    });
  }

  const items: DaftraInvoiceItem[] = data.items.map((it) => ({
    name: it.name || it.product_query || "Purchase Item",
    unit_price: it.unit_price || 0,
    quantity: it.quantity || 1,
  }));

  return createPurchaseOrder({
    supplier_id: suppRes.id,
    items,
    notes: data.notes,
  });
}
