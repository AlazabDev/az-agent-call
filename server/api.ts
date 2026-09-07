import { Router } from "express";
import * as z from "zod";
import { AGENT_IDS, type AgentId } from "../shared/agents.js";
import {
	getAgent,
	type RuntimeAgent,
	rotateAgentToken,
	smtpConfigured,
	smtpPasswordSource,
} from "./agents.js";
import { type AdminRequest, requireAdmin } from "./auth.js";
import { config } from "./config.js";
import { sendAsAgent, verifyAgent } from "./mailer.js";
import { supabaseAdmin } from "./supabase.js";
import {
	renderTemplateForAgent,
	TEMPLATE_COUNT,
	templatesForAgent,
} from "./templates.js";
import { tokenStoreStatus } from "./tokenStore.js";

export const apiRouter = Router();
apiRouter.use(requireAdmin);

function canOperate(req: AdminRequest): boolean {
	const role = req.adminUser?.role;
	return role === "owner" || role === "admin" || role === "operator";
}
function canRotate(req: AdminRequest): boolean {
	return req.adminUser?.role === "owner" || req.adminUser?.role === "admin";
}

const AGENT_FRESH_MS = 10 * 60_000;
const GATEWAY_FRESH_MS = 90_000;
const adminEmail = z.string().email().max(320);
const adminRecipients = z.union([
	adminEmail,
	z.array(adminEmail).min(1).max(20),
]);

function parseOptionalRecipients(
	value: unknown,
): string | string[] | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	const parsed = adminRecipients.safeParse(value);
	if (!parsed.success) throw new Error("Invalid email recipient list");
	return parsed.data;
}

function cleanAdminSubject(value: unknown): string {
	const cleaned = String(value ?? "Az Agent Call Center Test")
		.replace(/[\u0000-\u001F\u007F]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 300);
	if (!cleaned) throw new Error("Email subject is empty after validation");
	return cleaned;
}

function isFresh(iso: string | null | undefined, maxAgeMs: number): boolean {
	if (!iso) return false;
	const timestamp = Date.parse(iso);
	return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs;
}

function effectiveAgentStatus(
	status: string | null | undefined,
	lastSeenAt: string | null | undefined,
): "offline" | "online" | "degraded" {
	if (!isFresh(lastSeenAt, AGENT_FRESH_MS)) return "offline";
	return status === "degraded"
		? "degraded"
		: status === "online"
			? "online"
			: "offline";
}

function effectiveGatewayStatus(
	status: string | null | undefined,
	lastSeenAt: string | null | undefined,
): "starting" | "ready" | "degraded" | "offline" {
	if (!isFresh(lastSeenAt, GATEWAY_FRESH_MS)) return "offline";
	return status === "starting" || status === "degraded" || status === "ready"
		? status
		: "offline";
}

apiRouter.get("/auth/me", (req: AdminRequest, res) => {
	res.json({ user: req.adminUser, role: req.adminUser?.role });
});

apiRouter.get("/dashboard", async (_req, res) => {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const gatewayFresh = new Date(Date.now() - GATEWAY_FRESH_MS).toISOString();
	const agentFresh = new Date(Date.now() - AGENT_FRESH_MS).toISOString();
	const [
		agentsResult,
		sentResult,
		failedResult,
		connectionsResult,
		gatewayResult,
	] = await Promise.all([
		supabaseAdmin.from("mail_agents").select("id, enabled, smtp_password_env"),
		supabaseAdmin
			.from("mail_send_log")
			.select("id", { count: "exact", head: true })
			.gte("created_at", since)
			.eq("status", "success"),
		supabaseAdmin
			.from("mail_send_log")
			.select("id", { count: "exact", head: true })
			.gte("created_at", since)
			.eq("status", "failed"),
		supabaseAdmin
			.from("mail_agent_connections")
			.select("agent_id", { count: "exact", head: true })
			.gte("last_seen_at", agentFresh),
		supabaseAdmin
			.from("mail_gateway_instances")
			.select("instance_id", { count: "exact", head: true })
			.gte("last_seen_at", gatewayFresh),
	]);
	const error =
		agentsResult.error ??
		sentResult.error ??
		failedResult.error ??
		connectionsResult.error ??
		gatewayResult.error;
	if (error) return res.status(500).json({ error: error.message });
	const agents = agentsResult.data ?? [];
	res.json({
		agents: agents.length,
		enabledAgents: agents.filter((a) => a.enabled).length,
		templates: TEMPLATE_COUNT,
		sent24h: sentResult.count ?? 0,
		failed24h: failedResult.count ?? 0,
		onlineAgents: connectionsResult.count ?? 0,
		activeGateways: gatewayResult.count ?? 0,
		missingSmtpPasswords: agents
			.filter((a) => {
				const mock = {
					id: a.id,
					mailbox: `agent-${a.id}@${config.mailboxDomain}`,
					smtp_password_env: a.smtp_password_env,
				} as RuntimeAgent;
				return !smtpConfigured(mock);
			})
			.map((a) => a.id),
		mcpEndpoint: `${config.publicAppUrl}/call`,
		adminEndpoint: `${config.publicAppUrl}/admin/`,
	});
});

apiRouter.get("/agents", async (_req, res) => {
	const [agentsResult, statsResult, connectionsResult] = await Promise.all([
		supabaseAdmin
			.from("mail_agents")
			.select(
				"id, foundry_id, mailbox, enabled, token_hint, token_rotated_at, smtp_password_env",
			)
			.order("id"),
		supabaseAdmin
			.from("mail_agent_stats")
			.select("agent_id, sent_count, last_sent_at"),
		supabaseAdmin
			.from("mail_agent_connections")
			.select(
				"agent_id, connection_status, gateway_instance_id, last_seen_at, last_whoami_at, last_tool, request_count",
			),
	]);
	const error =
		agentsResult.error ?? statsResult.error ?? connectionsResult.error;
	if (error) return res.status(500).json({ error: error.message });
	const statsByAgent = new Map(
		(statsResult.data ?? []).map((row) => [row.agent_id, row]),
	);
	const connectionByAgent = new Map(
		(connectionsResult.data ?? []).map((row) => [row.agent_id, row]),
	);
	res.json(
		(agentsResult.data ?? []).map((row) => {
			const agent = row as RuntimeAgent;
			const recommended = templatesForAgent(agent).length;
			const stat = statsByAgent.get(agent.id);
			const connection = connectionByAgent.get(agent.id);
			return {
				id: agent.id,
				foundryId: agent.foundry_id,
				mailbox: agent.mailbox,
				enabled: agent.enabled,
				tokenHint: agent.token_hint,
				tokenRotatedAt: agent.token_rotated_at,
				recommendedTemplateCount: recommended,
				availableTemplateCount: TEMPLATE_COUNT,
				sentCount: Number(stat?.sent_count ?? 0),
				lastSentAt: stat?.last_sent_at ?? null,
				smtpConfigured: smtpConfigured(agent),
				smtpPasswordSource: smtpPasswordSource(agent),
				connection: connection
					? {
							agentId: agent.id,
							status: effectiveAgentStatus(
								connection.connection_status,
								connection.last_seen_at,
							),
							gatewayInstanceId: connection.gateway_instance_id,
							lastSeenAt: connection.last_seen_at,
							lastWhoamiAt: connection.last_whoami_at,
							lastTool: connection.last_tool,
							requestCount: Number(connection.request_count ?? 0),
						}
					: null,
			};
		}),
	);
});

apiRouter.post("/agents/:id/rotate-token", async (req: AdminRequest, res) => {
	if (!canRotate(req))
		return res.status(403).json({ error: "Owner/Admin role required" });
	const id = req.params.id as AgentId;
	if (!AGENT_IDS.includes(id))
		return res.status(404).json({ error: "Unknown agent" });
	try {
		const rotated = await rotateAgentToken(id);
		res.json({
			agentId: id,
			token: rotated.token,
			hint: rotated.hint,
			note: "Token persisted in AGENT_TOKENS_PATH and its SHA-256 hash was synchronized to Supabase.",
		});
	} catch (error) {
		res
			.status(500)
			.json({ error: error instanceof Error ? error.message : String(error) });
	}
});

apiRouter.get("/templates", async (req, res) => {
	let query = supabaseAdmin
		.from("mail_templates")
		.select(
			"id, system, agent_id, name, subject, preheader, locale, version, required, optional, enabled",
		)
		.order("system")
		.order("id")
		.eq("enabled", true);
	const recommendedFor =
		typeof req.query.recommended_for === "string"
			? req.query.recommended_for
			: "";
	if (recommendedFor) query = query.eq("agent_id", recommendedFor);
	const { data, error } = await query;
	if (error) return res.status(500).json({ error: error.message });
	res.json(
		(data ?? []).map((t) => ({
			id: t.id,
			system: t.system,
			agentId: t.agent_id,
			name: t.name,
			subject: t.subject,
			preheader: t.preheader,
			locale: t.locale,
			version: t.version,
			required: t.required ?? [],
			optional: t.optional ?? [],
			enabled: t.enabled,
		})),
	);
});

apiRouter.post("/templates/:id/render", async (req: AdminRequest, res) => {
	if (!canOperate(req))
		return res.status(403).json({ error: "Operator role required" });
	const agentId = req.body?.agentId as AgentId;
	if (!AGENT_IDS.includes(agentId))
		return res.status(400).json({ error: "Valid agentId required" });
	const agent = await getAgent(agentId);
	if (!agent) return res.status(404).json({ error: "Agent not found" });
	try {
		res.json(
			renderTemplateForAgent(
				agent,
				String(req.params.id),
				req.body?.data ?? { recipient_name: "معاينة" },
			),
		);
	} catch (error) {
		res
			.status(400)
			.json({ error: error instanceof Error ? error.message : String(error) });
	}
});

apiRouter.get("/send-log", async (req, res) => {
	const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
	let query = supabaseAdmin
		.from("mail_send_log")
		.select(
			"id, agent_id, sender_mailbox, recipient, subject, status, source, template_id, message_id, error_message, created_at",
		)
		.order("created_at", { ascending: false })
		.limit(limit);
	if (typeof req.query.agent === "string" && req.query.agent)
		query = query.eq("agent_id", req.query.agent);
	if (typeof req.query.status === "string" && req.query.status)
		query = query.eq("status", req.query.status);
	const { data, error } = await query;
	if (error) return res.status(500).json({ error: error.message });
	res.json(
		(data ?? []).map((row) => ({
			id: row.id,
			agentId: row.agent_id,
			senderMailbox: row.sender_mailbox,
			recipient: row.recipient,
			subject: row.subject,
			status: row.status,
			source: row.source,
			templateId: row.template_id,
			messageId: row.message_id,
			errorMessage: row.error_message,
			createdAt: row.created_at,
		})),
	);
});

apiRouter.get("/connections", async (_req, res) => {
	const { data, error } = await supabaseAdmin
		.from("mail_agent_connections")
		.select(
			"agent_id, connection_status, gateway_instance_id, last_seen_at, last_whoami_at, last_tool, request_count, updated_at",
		)
		.order("agent_id");
	if (error) return res.status(500).json({ error: error.message });
	res.json(
		(data ?? []).map((row) => ({
			agentId: row.agent_id,
			status: effectiveAgentStatus(row.connection_status, row.last_seen_at),
			gatewayInstanceId: row.gateway_instance_id,
			lastSeenAt: row.last_seen_at,
			lastWhoamiAt: row.last_whoami_at,
			lastTool: row.last_tool,
			requestCount: Number(row.request_count ?? 0),
			updatedAt: row.updated_at,
		})),
	);
});

apiRouter.get("/gateways", async (_req, res) => {
	const { data, error } = await supabaseAdmin
		.from("mail_gateway_instances")
		.select(
			"instance_id, hostname, version, status, started_at, last_seen_at, smtp_host, smtp_port, template_count",
		)
		.order("last_seen_at", { ascending: false });
	if (error) return res.status(500).json({ error: error.message });
	res.json(
		(data ?? []).map((row) => ({
			instanceId: row.instance_id,
			hostname: row.hostname,
			version: row.version,
			status: effectiveGatewayStatus(row.status, row.last_seen_at),
			startedAt: row.started_at,
			lastSeenAt: row.last_seen_at,
			smtpHost: row.smtp_host,
			smtpPort: row.smtp_port,
			templateCount: row.template_count,
		})),
	);
});

apiRouter.get("/admins", async (req: AdminRequest, res) => {
	if (!canRotate(req))
		return res.status(403).json({ error: "Owner/Admin role required" });
	const { data: users, error: usersError } =
		await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
	if (usersError) return res.status(500).json({ error: usersError.message });
	const { data: platformRoles, error: roleError } = await supabaseAdmin
		.from("adp_user_roles")
		.select("user_id, role")
		.in("role", ["platform_owner", "platform_admin"]);
	const { data: delegated, error: delegatedError } = await supabaseAdmin
		.from("mail_admins")
		.select("user_id, role");
	const error = roleError ?? delegatedError;
	if (error) return res.status(500).json({ error: error.message });
	const roles = new Map<string, string>();
	for (const row of platformRoles ?? [])
		roles.set(row.user_id, row.role === "platform_owner" ? "owner" : "admin");
	for (const row of delegated ?? [])
		if (!roles.has(row.user_id)) roles.set(row.user_id, row.role);
	res.json(
		users.users
			.filter((user) => roles.has(user.id))
			.map((user) => ({
				id: user.id,
				email: user.email,
				role: roles.get(user.id),
				lastSignInAt: user.last_sign_in_at,
				createdAt: user.created_at,
			})),
	);
});

apiRouter.get("/settings", async (_req, res) => {
	const { data: agents, error } = await supabaseAdmin
		.from("mail_agents")
		.select(
			"id, mailbox, foundry_id, enabled, token_hint, token_rotated_at, smtp_password_env",
		)
		.order("id");
	if (error) return res.status(500).json({ error: error.message });
	const store = tokenStoreStatus();
	res.json({
		supabaseUrl: config.supabaseUrl,
		supabaseProjectRef: config.supabaseProjectRef,
		edgeStatusFunction: `${config.supabaseUrl}/functions/v1/agent-mail-status`,
		smtpHost: config.smtpHost,
		smtpPort: config.smtpPort,
		mailboxDomain: config.mailboxDomain,
		smtpPasswordPatternConfigured: Boolean(config.smtpPasswordPattern),
		publicAppUrl: config.publicAppUrl,
		adminEndpoint: `${config.publicAppUrl}/admin/`,
		mcpEndpoint: `${config.publicAppUrl}/call`,
		templates: TEMPLATE_COUNT,
		agentTokensPath: store.path,
		tokenStoreLoaded: store.loaded,
		tokenStoreExpected: store.expected,
		templateAccess: "global",
		agents: (agents ?? []).map((row) => {
			const agent = row as RuntimeAgent;
			return {
				id: agent.id,
				mailbox: agent.mailbox,
				smtpConfigured: smtpConfigured(agent),
				smtpPasswordSource: smtpPasswordSource(agent),
			};
		}),
	});
});

apiRouter.get("/diagnostics", async (_req, res) => {
	const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
	const { error: dbError } = await supabaseAdmin
		.from("mail_agents")
		.select("id", { count: "exact", head: true });
	checks.push({
		name: "Supabase",
		ok: !dbError,
		detail: dbError?.message ?? config.supabaseProjectRef,
	});
	checks.push({
		name: "Template catalog",
		ok: TEMPLATE_COUNT === config.expectedTemplateCount,
		detail: `${TEMPLATE_COUNT}/${config.expectedTemplateCount}`,
	});
	const store = tokenStoreStatus();
	checks.push({
		name: "Agent token store",
		ok: store.loaded === store.expected,
		detail: `${store.loaded}/${store.expected} · ${store.path}`,
	});
	const smtpChecks = [];
	for (const id of AGENT_IDS) {
		const agent = await getAgent(id);
		if (agent) smtpChecks.push({ id, ...(await verifyAgent(agent)) });
	}
	res.json({
		ok:
			checks.every((check) => check.ok) &&
			smtpChecks.every((check) => check.ok),
		checks,
		smtpChecks,
		checkedAt: new Date().toISOString(),
	});
});

apiRouter.post("/test-send", async (req: AdminRequest, res) => {
	if (!canOperate(req))
		return res.status(403).json({ error: "Operator role required" });
	const { agentId, to, templateId, data, subject, text, html, cc, bcc } =
		req.body ?? {};
	if (!AGENT_IDS.includes(agentId))
		return res.status(400).json({ error: "Invalid agentId" });
	const toResult = adminRecipients.safeParse(to);
	if (!toResult.success)
		return res.status(400).json({ error: "Valid recipient(s) required" });
	let safeCc: string | string[] | undefined;
	let safeBcc: string | string[] | undefined;
	try {
		safeCc = parseOptionalRecipients(cc);
		safeBcc = parseOptionalRecipients(bcc);
	} catch (error) {
		return res
			.status(400)
			.json({ error: error instanceof Error ? error.message : String(error) });
	}
	const agent = await getAgent(agentId);
	if (!agent) return res.status(404).json({ error: "Agent not found" });
	if (!smtpConfigured(agent))
		return res.status(409).json({ error: "SMTP password is not configured" });
	try {
		if (templateId) {
			const rendered = renderTemplateForAgent(
				agent,
				templateId,
				data ?? { recipient_name: "اختبار" },
			);
			return res.json(
				await sendAsAgent(
					agent,
					{
						to: toResult.data,
						cc: safeCc,
						bcc: safeBcc,
						subject: rendered.subject,
						text: rendered.text,
						html: rendered.html,
					},
					{ mode: "admin-test", templateId },
				),
			);
		}
		if (!text && !html)
			return res.status(400).json({ error: "text and/or html required" });
		const safeSubject = cleanAdminSubject(subject);
		res.json(
			await sendAsAgent(
				agent,
				{
					to: toResult.data,
					cc: safeCc,
					bcc: safeBcc,
					subject: safeSubject,
					text: text ? String(text).slice(0, 100_000) : undefined,
					html: html ? String(html).slice(0, 200_000) : undefined,
				},
				{ mode: "admin-test" },
			),
		);
	} catch (error) {
		res
			.status(500)
			.json({ error: error instanceof Error ? error.message : String(error) });
	}
});

/* ==========================================================================
   Daftra ERP Integration API Routes
   ========================================================================== */
import { daftraService } from "./daftra/service.js";

apiRouter.get("/daftra/health", async (_req, res) => {
	try {
		const health = await daftraService.checkHealth();
		res.json(health);
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
});

apiRouter.get("/daftra/clients", async (req, res) => {
	try {
		const query = req.query.query ? String(req.query.query) : undefined;
		const phone = req.query.phone ? String(req.query.phone) : undefined;
		const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
		const data = await daftraService.clients.listClients({
			query,
			phone,
			limit,
		});
		res.json({ ok: true, data });
	} catch (err: any) {
		res
			.status(err.httpStatus || 500)
			.json(
				err.toEnvelopeData
					? err.toEnvelopeData()
					: { ok: false, error: err.message },
			);
	}
});

apiRouter.get("/daftra/clients/:id", async (req, res) => {
	try {
		const data = await daftraService.clients.getClient(String(req.params.id));
		res.json({ ok: true, data });
	} catch (err: any) {
		res
			.status(err.httpStatus || 500)
			.json(
				err.toEnvelopeData
					? err.toEnvelopeData()
					: { ok: false, error: err.message },
			);
	}
});

apiRouter.get("/daftra/caller-context", async (req, res) => {
	try {
		const phone = String(req.query.phone || "");
		if (!phone)
			return res
				.status(400)
				.json({ ok: false, error: "Query parameter 'phone' is required" });
		const data = await daftraService.clients.lookupCallerContext(phone);
		res.json({ ok: true, data });
	} catch (err: any) {
		res
			.status(err.httpStatus || 500)
			.json(
				err.toEnvelopeData
					? err.toEnvelopeData()
					: { ok: false, error: err.message },
			);
	}
});

apiRouter.get("/daftra/invoices", async (req, res) => {
	try {
		const clientId = req.query.client_id
			? parseInt(String(req.query.client_id), 10)
			: undefined;
		const status = req.query.status ? String(req.query.status) : undefined;
		const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
		const data = await daftraService.invoices.listInvoices({
			client_id: clientId,
			status,
			limit,
		});
		res.json({ ok: true, data });
	} catch (err: any) {
		res
			.status(err.httpStatus || 500)
			.json(
				err.toEnvelopeData
					? err.toEnvelopeData()
					: { ok: false, error: err.message },
			);
	}
});

apiRouter.get("/daftra/products", async (req, res) => {
	try {
		const query = req.query.query ? String(req.query.query) : undefined;
		const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
		const data = await daftraService.products.listProducts({ query, limit });
		res.json({ ok: true, data });
	} catch (err: any) {
		res
			.status(err.httpStatus || 500)
			.json(
				err.toEnvelopeData
					? err.toEnvelopeData()
					: { ok: false, error: err.message },
			);
	}
});

import {
	handleDaftraWebhookEvent,
	handleWhatsAppWebhookEvent,
	handleWhatsAppWebhookVerify,
} from "./webhooks/central.js";
/* ==========================================================================
   WhatsApp Multi-WABA Hub & Central Webhooks API Routes
   ========================================================================== */
import { whatsappService } from "./whatsapp/service.js";

apiRouter.get("/whatsapp/numbers", async (_req, res) => {
	try {
		const numbers = await whatsappService.getNumbers();
		res.json({ ok: true, count: numbers.length, data: numbers });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
});

apiRouter.post("/whatsapp/send", async (req, res) => {
	try {
		const {
			phoneNumberId,
			recipientPhone,
			text,
			templateName,
			daftraClientId,
			agentId,
		} = req.body || {};
		if (!recipientPhone)
			return res
				.status(400)
				.json({ ok: false, error: "recipientPhone is required" });

		if (templateName) {
			const result = await whatsappService.sendTemplateMessage({
				phoneNumberId,
				recipientPhone,
				templateName,
				daftraClientId,
				agentId,
			});
			return res.json({ ok: result.ok, data: result });
		}

		if (!text)
			return res
				.status(400)
				.json({ ok: false, error: "text or templateName is required" });

		const result = await whatsappService.sendTextMessage({
			phoneNumberId,
			recipientPhone,
			text,
			daftraClientId,
			agentId,
		});
		res.json({ ok: result.ok, data: result });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
});

apiRouter.get("/whatsapp/logs", async (req, res) => {
	try {
		const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
		const logs = await whatsappService.getMessageLogs(limit);
		res.json({ ok: true, count: logs.length, data: logs });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
});

apiRouter.get("/webhooks/whatsapp", handleWhatsAppWebhookVerify);
apiRouter.post("/webhooks/whatsapp", handleWhatsAppWebhookEvent);
apiRouter.post("/daftra/webhook", handleDaftraWebhookEvent);
