import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "./supabase.js";

export type MailAdminRole = "owner" | "admin" | "operator" | "viewer";
export type AdminRequest = Request & {
  adminUser?: {
    id: string;
    email?: string;
    role: MailAdminRole;
    roleSource: "adp_user_roles" | "call_admins";
  };
};

function bearer(header: string | undefined): string {
  return header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
}

async function resolveMailRole(userId: string): Promise<{ role: MailAdminRole; source: "adp_user_roles" | "call_admins" } | null> {
  const { data: platformRoles, error: platformError } = await supabaseAdmin
    .from("adp_user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"]);

  if (platformError) throw new Error(`Central role lookup failed: ${platformError.message}`);
  const roles = new Set((platformRoles ?? []).map((row) => String(row.role)));
  if (roles.has("platform_owner")) return { role: "owner", source: "adp_user_roles" };
  if (roles.has("platform_admin")) return { role: "admin", source: "adp_user_roles" };

  const { data: delegated, error: delegatedError } = await supabaseAdmin
    .from("call_admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (delegatedError) throw new Error(`Mail role lookup failed: ${delegatedError.message}`);
  if (!delegated) return null;
  if (delegated.role !== "operator" && delegated.role !== "viewer") {
    throw new Error(`Unsupported delegated mail role: ${String(delegated.role)}`);
  }
  return { role: delegated.role, source: "call_admins" };
}

export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = bearer(req.header("authorization"));
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return res.status(401).json({ error: "Invalid Supabase session" });

  try {
    const resolved = await resolveMailRole(userData.user.id);
    if (!resolved) return res.status(403).json({ error: "Az Agent Call Center access required" });

    req.adminUser = {
      id: userData.user.id,
      email: userData.user.email,
      role: resolved.role,
      roleSource: resolved.source,
    };
    next();
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

export function bearerToken(header: string | undefined): string {
  return bearer(header);
}
