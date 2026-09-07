import nodemailer, { type Transporter } from "nodemailer";
import type { RuntimeAgent } from "./agents.js";
import { smtpPassword } from "./agents.js";
import { config } from "./config.js";
import { supabaseAdmin } from "./supabase.js";

const transporters = new Map<string, Transporter>();

function transporterFor(agent: RuntimeAgent): Transporter {
	const existing = transporters.get(agent.id);
	if (existing) return existing;

	const transporter = nodemailer.createTransport({
		host: config.smtpHost,
		port: config.smtpPort,
		secure: config.smtpPort === 465,
		requireTLS: config.smtpPort !== 465,
		auth: { user: agent.mailbox, pass: smtpPassword(agent) },
		pool: true,
		maxConnections: 1,
		maxMessages: 100,
		connectionTimeout: 15_000,
		greetingTimeout: 15_000,
		socketTimeout: 30_000,
		tls: { minVersion: "TLSv1.2", servername: config.smtpHost },
	});

	transporters.set(agent.id, transporter);
	return transporter;
}

export type SendEmailInput = {
	to: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	subject: string;
	text?: string;
	html?: string;
};

export type SendContext = {
	mode: "raw" | "template" | "admin-test";
	templateId?: string;
};

function recipientDisplay(value: string | string[]): string {
	return Array.isArray(value) ? value.join(", ") : value;
}

async function writeSendLog(input: {
	agentId: string;
	senderMailbox: string;
	recipient: string;
	subject: string;
	status: "success" | "failed";
	source: SendContext["mode"];
	templateId?: string;
	messageId?: string;
	errorMessage?: string;
}) {
	const { error } = await supabaseAdmin.from("mail_send_log").insert({
		agent_id: input.agentId,
		sender_mailbox: input.senderMailbox,
		recipient: input.recipient,
		subject: input.subject,
		status: input.status,
		source: input.source,
		template_id: input.templateId ?? null,
		message_id: input.messageId ?? null,
		error_message: input.errorMessage ?? null,
	});
	if (error)
		console.error("[az-agent-call] failed to persist send log:", error.message);
}

/** From and Reply-To are always forced to the token-owned Migadu mailbox. */
export async function sendAsAgent(
	agent: RuntimeAgent,
	input: SendEmailInput,
	context: SendContext = { mode: "raw" },
) {
	try {
		const info = await transporterFor(agent).sendMail({
			from: agent.mailbox,
			replyTo: agent.mailbox,
			to: input.to,
			cc: input.cc,
			bcc: input.bcc,
			subject: input.subject,
			text: input.text,
			html: input.html,
			disableFileAccess: true,
			disableUrlAccess: true,
		});

		await writeSendLog({
			agentId: agent.id,
			senderMailbox: agent.mailbox,
			recipient: recipientDisplay(input.to),
			subject: input.subject,
			status: "success",
			source: context.mode,
			templateId: context.templateId,
			messageId: info.messageId,
		});

		return {
			messageId: info.messageId,
			from: agent.mailbox,
			to: input.to,
			accepted: info.accepted.map(String),
			rejected: info.rejected.map(String),
		};
	} catch (error) {
		await writeSendLog({
			agentId: agent.id,
			senderMailbox: agent.mailbox,
			recipient: recipientDisplay(input.to),
			subject: input.subject,
			status: "failed",
			source: context.mode,
			templateId: context.templateId,
			errorMessage: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function verifyAgent(
	agent: RuntimeAgent,
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		await transporterFor(agent).verify();
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
