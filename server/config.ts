import os from "node:os";
import path from "node:path";

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value)
		throw new Error(
			`[az-agent-call] Missing required environment variable ${name}`,
		);
	return value;
}

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const inferredProjectRef = new URL(supabaseUrl).hostname.split(".")[0];
const supabaseProjectRef = (
	process.env.SUPABASE_PROJECT_REF ?? inferredProjectRef
).trim();

export const config = {
	version: "3.1.0",
	port: Number(process.env.PORT ?? 3300),
	publicAppUrl: (
		process.env.PUBLIC_APP_URL ?? "https://mcp.alazab.com"
	).replace(/\/$/, ""),
	adminBasePath: "/admin",
	adminPassword: required("ADMIN_PASSWORD"),
	mailboxDomain: (process.env.MAILBOX_DOMAIN ?? "alazab.com")
		.trim()
		.toLowerCase(),
	smtpHost: (process.env.MIGADU_SMTP_HOST ?? "smtp.migadu.com").trim(),
	smtpPort: Number(process.env.MIGADU_SMTP_PORT ?? 587),
	smtpPasswordPattern: process.env.MAILBOX_PASSWORD_PATTERN?.trim() ?? "",
	agentTokensPath: path.resolve(
		process.env.AGENT_TOKENS_PATH ?? "/app/data/agent-tokens.json",
	),
	gatewayInstanceId: (process.env.GATEWAY_INSTANCE_ID ?? os.hostname()).trim(),
	companyName: process.env.COMPANY_NAME ?? "شركة العزب",
	companyWebsiteUrl: process.env.COMPANY_WEBSITE_URL ?? "https://alazab.com",
	emailLogoUrl: process.env.EMAIL_LOGO_URL ?? "https://alazab.com/w.gif",
	corsOrigins: (
		process.env.CORS_ORIGINS ??
		`${(process.env.PUBLIC_APP_URL ?? "https://mcp.alazab.com").replace(/\/$/, "")},http://localhost:8080`
	)
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean),
	expectedTemplateCount: Number(process.env.EXPECTED_TEMPLATE_COUNT ?? 144),
	templatesDir: path.resolve(
		process.cwd(),
		process.env.TEMPLATES_DIR ?? "templates",
	),
	supabaseProjectRef,
	supabaseUrl,
	supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
};
