import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { smartResolver } from "../resolver.js";
import type { DaftraInvoiceItem, DaftraInvoiceRecord } from "../types.js";
import { getClient } from "./clients.js";
import { getProduct } from "./products.js";

export async function listInvoices(params: { client_id?: number; status?: string; limit?: number } = {}): Promise<DaftraInvoiceRecord[]> {
  const queryParams: Record<string, any> = { limit: params.limit || 50 };
  if (params.client_id) queryParams.client_id = params.client_id;
  if (params.status) queryParams.status = params.status;

  const response = await daftraClient.get("/api2/invoices.json", queryParams);
  const rawList = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

  return rawList.map((item: any) => {
    const inv = item.Invoice || item.invoice || item;
    return {
      id: parseInt(String(inv.id), 10),
      invoice_number: inv.invoice_number || inv.no,
      client_id: parseInt(String(inv.client_id || 0), 10),
      client_name: inv.client_name || inv.client_data?.name,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      summary: inv.summary || inv.notes,
      subtotal: parseFloat(String(inv.subtotal || inv.total || 0)),
      tax: parseFloat(String(inv.tax || 0)),
      total: parseFloat(String(inv.total || 0)),
      paid: parseFloat(String(inv.paid || 0)),
      balance: parseFloat(String(inv.balance || (inv.total || 0) - (inv.paid || 0))),
      status: inv.status || "draft",
    };
  });
}

export async function getInvoice(id: number): Promise<DaftraInvoiceRecord> {
  const response = await daftraClient.get(`/api2/invoices/${id}.json`);
  const inv = response?.data?.Invoice || response?.data || response;
  if (!inv || !inv.id) {
    throw new DaftraError("DAFTRA_NOT_FOUND", `Invoice #${id} not found on Daftra ERP`, 404);
  }

  const items: DaftraInvoiceItem[] = Array.isArray(inv.invoice_items || inv.items)
    ? (inv.invoice_items || inv.items).map((it: any) => ({
        item_id: it.id ? parseInt(String(it.id), 10) : undefined,
        product_id: it.product_id ? parseInt(String(it.product_id), 10) : undefined,
        name: it.item_title || it.name || it.description,
        unit_price: parseFloat(String(it.unit_price || it.price || 0)),
        quantity: parseFloat(String(it.quantity || 1)),
        discount: parseFloat(String(it.discount || 0)),
      }))
    : [];

  return {
    id: parseInt(String(inv.id), 10),
    invoice_number: inv.invoice_number || inv.no,
    client_id: parseInt(String(inv.client_id || 0), 10),
    client_name: inv.client_name,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    summary: inv.summary,
    total: parseFloat(String(inv.total || 0)),
    paid: parseFloat(String(inv.paid || 0)),
    balance: parseFloat(String(inv.balance || 0)),
    status: inv.status || "draft",
    items,
  };
}

export async function createInvoice(data: {
  client_id: number;
  items: DaftraInvoiceItem[];
  issue_date?: string;
  due_date?: string;
  notes?: string;
  work_order_id?: number;
  draft?: boolean;
}): Promise<DaftraInvoiceRecord> {
  // Validate client existence first
  const client = await getClient(data.client_id);

  const formattedItems = data.items.map((it) => ({
    item_title: it.name || "Service / Line Item",
    product_id: it.product_id || 0,
    unit_price: it.unit_price,
    quantity: it.quantity || 1,
  }));

  const payload = {
    Invoice: {
      client_id: client.id,
      issue_date: data.issue_date || new Date().toISOString().split("T")[0],
      due_date: data.due_date,
      summary: data.notes || "",
      work_order_id: data.work_order_id,
      status: data.draft ? "draft" : "sent",
      invoice_items: formattedItems,
    },
  };

  const response = await daftraClient.post("/api2/invoices.json", payload);
  const created = response?.data?.Invoice || response?.data || response;

  if (!created || !created.id) {
    throw new DaftraError("DAFTRA_WRITE_UNCERTAIN", "Failed to confirm invoice creation response from Daftra ERP");
  }

  return {
    id: parseInt(String(created.id), 10),
    invoice_number: created.invoice_number || created.no,
    client_id: client.id,
    client_name: [client.first_name, client.last_name, client.business_name].filter(Boolean).join(" "),
    total: parseFloat(String(created.total || 0)),
    paid: 0,
    balance: parseFloat(String(created.total || 0)),
    status: created.status || "draft",
  };
}

/**
 * Smart Invoice Creator: Accepts text client name & product names, resolves them accurately, and creates actual invoice.
 */
export async function createSmartInvoice(data: {
  client_query: string;
  items: Array<{ product_query?: string; name?: string; unit_price?: number; quantity?: number }>;
  notes?: string;
  draft?: boolean;
}): Promise<DaftraInvoiceRecord> {
  const clientRes = await smartResolver.resolveSingleEntity(data.client_query, "client", [
    "first_name",
    "last_name",
    "business_name",
    "email",
  ]);

  if (clientRes.status === "not_found") {
    throw new DaftraError("ENTITY_NOT_FOUND", `Client '${data.client_query}' not found in Daftra ERP`);
  }
  if (clientRes.status === "ambiguous") {
    throw new DaftraError("AMBIGUOUS_ENTITY", `Client name '${data.client_query}' is ambiguous`, 400, {
      matches: clientRes.matches,
    });
  }

  const resolvedItems: DaftraInvoiceItem[] = [];
  for (const rawIt of data.items) {
    let productId: number | undefined;
    let price = rawIt.unit_price || 0;
    let itemName = rawIt.name || rawIt.product_query || "Item";

    if (rawIt.product_query) {
      const prodRes = await smartResolver.resolveSingleEntity(rawIt.product_query, "product", ["name", "product_code"]);
      if (prodRes.status === "resolved") {
        productId = prodRes.id;
        const actualProd = await getProduct(prodRes.id);
        itemName = actualProd.name;
        if (!price) price = actualProd.unit_price || 0;
      }
    }

    if (!price || price <= 0) {
      throw new DaftraError("DAFTRA_VALIDATION_ERROR", `Unit price required for item '${itemName}'`);
    }

    resolvedItems.push({
      product_id: productId,
      name: itemName,
      unit_price: price,
      quantity: rawIt.quantity || 1,
    });
  }

  return createInvoice({
    client_id: clientRes.id,
    items: resolvedItems,
    notes: data.notes,
    draft: data.draft,
  });
}
