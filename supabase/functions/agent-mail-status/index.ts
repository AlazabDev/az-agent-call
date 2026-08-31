import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROJECT_REF = "bxuhcbfdoaflsgbxiqei";
const ALLOWED_ORIGIN = "https://mcp.alazab.com";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return json({ error: "Supabase function environment is incomplete" }, 500);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json({ error: "Unauthorized" }, 401);

  // Use the caller JWT only to establish identity.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  // All control-plane reads are server-side with the built-in service role.
  // The service key never leaves the Edge Function runtime.
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: platformRoles, error: platformError }, { data: delegated, error: delegatedError }] = await Promise.all([
    admin.from("adp_user_roles").select("role").eq("user_id", userData.user.id).in("role", ["platform_owner", "platform_admin"]),
    admin.from("mail_admins").select("role").eq("user_id", userData.user.id).maybeSingle(),
  ]);
  if (platformError || delegatedError) {
    return json({ error: platformError?.message ?? delegatedError?.message ?? "Role lookup failed" }, 500);
  }

  const roles = new Set((platformRoles ?? []).map((row) => String(row.role)));
  const role = roles.has("platform_owner")
    ? "owner"
    : roles.has("platform_admin")
      ? "admin"
      : delegated?.role === "operator" || delegated?.role === "viewer"
        ? delegated.role
        : null;
  if (!role) return json({ error: "Az Agent Mail access required" }, 403);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [agents, templates, sent, failed, gateways, connections] = await Promise.all([
    admin.from("mail_agents").select("id", { count: "exact", head: true }).eq("enabled", true),
    admin.from("mail_templates").select("id", { count: "exact", head: true }).eq("enabled", true),
    admin.from("mail_send_log").select("id", { count: "exact", head: true }).eq("status", "success").gte("created_at", since),
    admin.from("mail_send_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since),
    admin.from("mail_gateway_instances")
      .select("instance_id,hostname,version,status,started_at,last_seen_at,smtp_host,smtp_port,template_count")
      .order("last_seen_at", { ascending: false })
      .limit(5),
    admin.from("mail_agent_connections")
      .select("agent_id,connection_status,gateway_instance_id,last_seen_at,last_whoami_at,last_tool,request_count,updated_at")
      .order("agent_id"),
  ]);

  const errors = [agents.error, templates.error, sent.error, failed.error, gateways.error, connections.error].filter(Boolean);
  if (errors.length) return json({ error: errors.map((error) => error?.message).join("; ") }, 500);

  return json({
    ok: true,
    projectRef: PROJECT_REF,
    auth: { userId: userData.user.id, email: userData.user.email, role },
    counts: {
      agents: agents.count ?? 0,
      templates: templates.count ?? 0,
      sent24h: sent.count ?? 0,
      failed24h: failed.count ?? 0,
    },
    gateways: gateways.data ?? [],
    connections: connections.data ?? [],
    checkedAt: new Date().toISOString(),
  });
});
