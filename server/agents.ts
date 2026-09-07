import { AGENT_IDS, type AgentId, type AgentRecord } from "../shared/agents.js";
import { config } from "./config.js";
import { touchAgentConnection } from "./runtimeStatus.js";
import { supabaseAdmin } from "./supabase.js";
import {
	agentIdForClearToken,
	hashAgentToken,
	rotateStoredAgentToken,
} from "./tokenStore.js";

export type RuntimeAgent = AgentRecord;
export { hashAgentToken };

export async function agentForToken(
	token: string,
): Promise<RuntimeAgent | null> {
	const id = agentIdForClearToken(token);
	if (!id) return null;
	const agent = await getAgent(id);
	if (agent?.enabled)
		await touchAgentConnection(id, "mcp_request").catch(() => undefined);
	return agent?.enabled ? agent : null;
}

export async function getAgent(id: string): Promise<RuntimeAgent | null> {
	if (!AGENT_IDS.includes(id as AgentId)) return null;
	const { data, error } = await supabaseAdmin
		.from("mail_agents")
		.select(
			"id, foundry_id, mailbox, enabled, token_hint, token_rotated_at, smtp_password_env",
		)
		.eq("id", id)
		.maybeSingle();
	if (error) throw new Error(`Agent lookup failed: ${error.message}`);
	return data as RuntimeAgent | null;
}

export async function rotateAgentToken(
	id: AgentId,
): Promise<{ token: string; hint: string }> {
	return rotateStoredAgentToken(id);
}

function patternPassword(agent: RuntimeAgent): string {
	const local = agent.mailbox.split("@")[0] ?? agent.mailbox;
	return config.smtpPasswordPattern
		.replaceAll("{mailbox}", local)
		.replaceAll("{local}", local)
		.replaceAll("{domain}", config.mailboxDomain);
}

export function smtpConfigured(agent: RuntimeAgent): boolean {
	return Boolean(
		process.env[agent.smtp_password_env]?.trim() || config.smtpPasswordPattern,
	);
}

export function smtpPasswordSource(
	agent: RuntimeAgent,
): "override" | "pattern" | "missing" {
	if (process.env[agent.smtp_password_env]?.trim()) return "override";
	if (config.smtpPasswordPattern) return "pattern";
	return "missing";
}

export function smtpPassword(agent: RuntimeAgent): string {
	const override = process.env[agent.smtp_password_env]?.trim();
	if (override) return override;
	const fallback = patternPassword(agent);
	if (!fallback)
		throw new Error(`SMTP password is not configured for ${agent.id}`);
	return fallback;
}
