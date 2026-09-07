import { syncTemplateCatalogToSupabase } from "../server/templateSync.js";

const count = await syncTemplateCatalogToSupabase();
console.log(`Synced ${count} templates to Supabase.`);
