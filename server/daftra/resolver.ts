import { daftraClient } from "./client.js";
import { DaftraError } from "./errors.js";
import { normalizeText } from "./normalizer.js";

export type EntityTypeKey = "client" | "supplier" | "work_order" | "product" | "cost_center" | "treasury";

export interface EntityMatch {
  entity_type: EntityTypeKey;
  id: number;
  name: string;
  number?: string;
  confidence: number;
  matchType: "id" | "exact" | "alias" | "normalized" | "fuzzy";
  details: unknown;
}

export type ResolutionResult =
  | {
      status: "resolved";
      id: number;
      entityType: EntityTypeKey;
      confidence: number;
      matchType: "id" | "exact" | "alias" | "normalized" | "fuzzy";
      entity: unknown;
    }
  | {
      status: "ambiguous";
      matches: EntityMatch[];
    }
  | {
      status: "not_found";
      query: string;
    };

function getSearchVariants(rawQuery: string): string[] {
  const q = normalizeText(rawQuery);
  const variants = new Set<string>([q]);

  if (q.includes("عوف")) variants.add("auf");
  if (q.includes("auf")) variants.add("عوف");
  if (q.includes("عزب") || q.includes("العزب")) {
    variants.add("azab");
    variants.add("alazab");
  }
  if (q.includes("azab")) {
    variants.add("عزب");
    variants.add("العزب");
  }
  if (q.includes("اربيسك") || q.includes("ارابيسك")) {
    variants.add("arabesque");
    variants.add("arbesk");
  }
  if (q.includes("arabesque")) variants.add("اربيسك");
  if (q.includes("ماربل")) variants.add("marble");
  if (q.includes("marble")) variants.add("ماربل");

  return Array.from(variants);
}

function extractEntityData(rawItem: any): any {
  if (!rawItem) return {};
  const keys = Object.keys(rawItem);
  if (keys.length === 1 && typeof rawItem[keys[0]] === "object" && rawItem[keys[0]] !== null) {
    return { ...rawItem[keys[0]], _wrapperKey: keys[0] };
  }
  return rawItem;
}

export class SmartResolver {
  public async searchEntities(
    rawQuery: string,
    entityType: "all" | EntityTypeKey = "all"
  ): Promise<EntityMatch[]> {
    const q = rawQuery.trim();
    if (!q) return [];

    const variants = getSearchVariants(q);
    const matches: EntityMatch[] = [];
    const matchedIds = new Set<string>();

    const fetchAndMatch = async (v1Path: string, v2Key: EntityTypeKey, nameFields: string[]) => {
      try {
        let items: any[] = [];
        try {
          const resV1 = await daftraClient.get(v1Path, { limit: 100 });
          items = Array.isArray(resV1?.data) ? resV1.data : Array.isArray(resV1) ? resV1 : [];
        } catch {
          const resV2 = await daftraClient.get(`/v2/api/entity/${v2Key}/list/1`);
          items = Array.isArray(resV2?.data) ? resV2.data : Array.isArray(resV2) ? resV2 : [];
        }

        for (const rawItem of items) {
          const item = extractEntityData(rawItem);
          if (!item.id) continue;

          const entityIdKey = `${v2Key}_${item.id}`;
          if (matchedIds.has(entityIdKey)) continue;

          const itemIdStr = String(item.id).trim();
          let confidence = 0;
          let matchType: "id" | "exact" | "alias" | "normalized" | "fuzzy" = "normalized";

          // Exact ID match
          if (itemIdStr === q) {
            confidence = 1.0;
            matchType = "id";
          } else {
            for (const field of nameFields) {
              const val = item[field];
              if (!val) continue;

              const normVal = normalizeText(String(val));

              // Exact string match
              if (normVal === normalizeText(q)) {
                confidence = 0.98;
                matchType = "exact";
                break;
              }

              // Alias / Variant match
              for (const v of variants) {
                if (normVal.includes(v)) {
                  confidence = Math.max(confidence, v === normalizeText(q) ? 0.9 : 0.8);
                  matchType = v === normalizeText(q) ? "normalized" : "alias";
                }
              }
            }
          }

          if (confidence > 0) {
            matchedIds.add(entityIdKey);
            const fullName =
              [item.first_name, item.last_name, item.business_name, item.name, item.title]
                .filter(Boolean)
                .join(" ") || item.name || item.business_name || `Entity #${item.id}`;

            matches.push({
              entity_type: v2Key,
              id: parseInt(itemIdStr, 10),
              name: fullName,
              number: item.order_no || item.no || item.client_number || item.supplier_number || item.product_code || item.code,
              confidence,
              matchType,
              details: item,
            });
          }
        }
      } catch {
        // Safe failover for missing endpoints
      }
    };

    const tasks: Promise<void>[] = [];

    if (entityType === "all" || entityType === "client") {
      tasks.push(fetchAndMatch("/api2/clients.json", "client", ["first_name", "last_name", "business_name", "email", "phone1", "phone2"]));
    }
    if (entityType === "all" || entityType === "supplier") {
      tasks.push(fetchAndMatch("/api2/suppliers.json", "supplier", ["first_name", "last_name", "business_name", "email", "phone1"]));
    }
    if (entityType === "all" || entityType === "work_order") {
      tasks.push(fetchAndMatch("/v2/api/entity/work_order/list/1", "work_order", ["name", "title", "order_no"]));
    }
    if (entityType === "all" || entityType === "product") {
      tasks.push(fetchAndMatch("/api2/products.json", "product", ["name", "product_code", "description"]));
    }

    await Promise.all(tasks);

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches;
  }

  public async resolveSingleEntity(
    providedIdOrName: string | number | undefined,
    entityType: EntityTypeKey,
    nameFields: string[]
  ): Promise<ResolutionResult> {
    if (!providedIdOrName) {
      return { status: "not_found", query: "" };
    }

    const rawQuery = String(providedIdOrName).trim();

    // If pure number ID
    if (/^\d+$/.test(rawQuery)) {
      const numericId = parseInt(rawQuery, 10);
      return {
        status: "resolved",
        id: numericId,
        entityType,
        confidence: 1.0,
        matchType: "id",
        entity: { id: numericId },
      };
    }

    const matches = await this.searchEntities(rawQuery, entityType);

    if (matches.length === 0) {
      return { status: "not_found", query: rawQuery };
    }

    if (matches.length === 1 || (matches[0].confidence >= 0.95 && matches[1]?.confidence < 0.8)) {
      const top = matches[0];
      return {
        status: "resolved",
        id: top.id,
        entityType: top.entity_type,
        confidence: top.confidence,
        matchType: top.matchType,
        entity: top.details,
      };
    }

    // Multiple high confidence matches -> Ambiguous
    return {
      status: "ambiguous",
      matches,
    };
  }
}

export const smartResolver = new SmartResolver();
