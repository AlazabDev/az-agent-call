import { supabaseAdmin } from "./supabase.js";
import { templateRowsForSync } from "./templates.js";

export async function syncTemplateCatalogToSupabase(): Promise<number> {
  const rows = templateRowsForSync();
  const batchSize = 40;

  for (let index = 0; index < rows.length; index += batchSize) {
    const { error } = await supabaseAdmin
      .from("call_templates")
      .upsert(rows.slice(index, index + batchSize), { onConflict: "id" });
    if (error) throw new Error(`Template sync failed at batch ${index / batchSize + 1}: ${error.message}`);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("call_templates")
    .select("id");
  if (existingError) throw new Error(`Template stale-check failed: ${existingError.message}`);

  const activeIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !activeIds.has(id));
  if (staleIds.length) {
    const { error: staleError } = await supabaseAdmin
      .from("call_templates")
      .update({ enabled: false })
      .in("id", staleIds);
    if (staleError) throw new Error(`Template stale-disable failed: ${staleError.message}`);
  }

  return rows.length;
}
