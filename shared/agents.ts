export const AGENT_IDS = [
	"backend",
	"azabot",
	"auth",
	"prod",
	"maint",
	"core",
	"bim",
	"finance",
	"payments",
	"copilot",
	"project",
	"vision",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_LABELS: Record<AgentId, string> = {
	backend: "Backend",
	azabot: "AzaBot",
	auth: "Auth",
	prod: "Production",
	maint: "Maintenance",
	core: "Core",
	bim: "BIM",
	finance: "Finance",
	payments: "Payments",
	copilot: "Copilot",
	project: "Projects",
	vision: "Vision",
};

export type AgentRecord = {
	id: AgentId;
	foundry_id: string;
	mailbox: string;
	enabled: boolean;
	token_hint: string | null;
	token_rotated_at: string | null;
	smtp_password_env: string;
};

export function foundryId(id: AgentId): string {
	return `az-agent-${id}`;
}

export function mailboxFor(id: AgentId, domain = "alazab.com"): string {
	return `agent-${id}@${domain}`;
}

export function smtpPasswordEnv(id: AgentId): string {
	return `MAILBOX_PASSWORD_${id.toUpperCase()}`;
}
