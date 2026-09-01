import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import { normalizeText } from "../normalizer.js";
import type { DaftraProductRecord } from "../types.js";

export async function listProducts(params: { limit?: number; query?: string } = {}): Promise<DaftraProductRecord[]> {
  const response = await daftraClient.get("/api2/products.json", { limit: params.limit || 50 });
  const rawList = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

  let products: DaftraProductRecord[] = rawList.map((item: any) => {
    const p = item.Product || item.product || item;
    return {
      id: parseInt(String(p.id), 10),
      product_code: p.product_code || p.code,
      name: p.name || p.title || "Unnamed Product",
      unit_price: parseFloat(String(p.unit_price || p.price || 0)),
      purchase_price: parseFloat(String(p.purchase_price || 0)),
      quantity: parseFloat(String(p.quantity || p.stock_quantity || 0)),
      description: p.description,
      category_id: p.category_id ? parseInt(String(p.category_id), 10) : undefined,
    };
  });

  if (params.query) {
    const normQ = normalizeText(params.query);
    products = products.filter(
      (p) =>
        normalizeText(p.name).includes(normQ) ||
        normalizeText(p.product_code).includes(normQ) ||
        normalizeText(p.description).includes(normQ) ||
        String(p.id) === normQ
    );
  }

  return products;
}

export async function getProduct(idOrQuery: number | string): Promise<DaftraProductRecord> {
  if (typeof idOrQuery === "number" || /^\d+$/.test(String(idOrQuery).trim())) {
    const productId = parseInt(String(idOrQuery).trim(), 10);
    const response = await daftraClient.get(`/api2/products/${productId}.json`);
    const p = response?.data?.Product || response?.data || response;
    if (!p || !p.id) {
      throw new DaftraError("DAFTRA_NOT_FOUND", `Product #${productId} not found on Daftra ERP`, 404);
    }
    return {
      id: parseInt(String(p.id), 10),
      product_code: p.product_code || p.code,
      name: p.name || p.title || "Unnamed Product",
      unit_price: parseFloat(String(p.unit_price || p.price || 0)),
      purchase_price: parseFloat(String(p.purchase_price || 0)),
      quantity: parseFloat(String(p.quantity || p.stock_quantity || 0)),
      description: p.description,
    };
  }

  const matches = await listProducts({ query: String(idOrQuery) });
  if (matches.length === 0) {
    throw new DaftraError("ENTITY_NOT_FOUND", `Product matching '${idOrQuery}' not found`, 404);
  }
  if (matches.length > 1) {
    throw new DaftraError("AMBIGUOUS_ENTITY", `Multiple products match '${idOrQuery}'`, 400, { matches });
  }
  return matches[0];
}

export async function createProduct(data: Partial<DaftraProductRecord>): Promise<DaftraProductRecord> {
  const payload = {
    Product: {
      name: data.name,
      product_code: data.product_code || "",
      unit_price: data.unit_price || 0,
      purchase_price: data.purchase_price || 0,
      description: data.description || "",
    },
  };

  const response = await daftraClient.post("/api2/products.json", payload);
  const created = response?.data?.Product || response?.data || response;
  return {
    id: parseInt(String(created.id), 10),
    name: created.name,
    product_code: created.product_code,
    unit_price: parseFloat(String(created.unit_price || 0)),
  };
}
