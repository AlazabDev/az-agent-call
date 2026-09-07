import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabaseAdmin = createClient(
	config.supabaseUrl,
	config.supabaseServiceRoleKey,
	{
		auth: { autoRefreshToken: false, persistSession: false },
		db: { schema: "public" },
		global: { headers: { "X-Client-Info": "az-agent-call-server/3.0.1" } },
	},
);

export async function assertSupabaseProjectBinding(): Promise<void> {
	const { data, error } = await supabaseAdmin
		.from("mail_settings")
		.select("value")
		.eq("key", "runtime")
		.maybeSingle();

	if (error) throw new Error(`Supabase binding check failed: ${error.message}`);
	const value = (data?.value ?? {}) as Record<string, unknown>;
	const databaseRef =
		typeof value.supabase_project_ref === "string"
			? value.supabase_project_ref
			: "";

	if (!databaseRef) {
		throw new Error("Supabase runtime setting is missing supabase_project_ref");
	}
	if (databaseRef !== config.supabaseProjectRef) {
		throw new Error(
			`Supabase project mismatch: app=${config.supabaseProjectRef}, database=${databaseRef}`,
		);
	}
}
