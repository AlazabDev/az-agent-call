import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { RuntimeAgent } from "./agents.js";

export type TemplateTone = "info" | "success" | "warning" | "error";

export interface TemplateDetail {
	label: string;
	value: string | number;
}

export interface EmailTemplateData {
	recipient_name: string;
	reference?: string;
	message?: string;
	status_label?: string;
	status_tone?: TemplateTone;
	details?: TemplateDetail[];
	action_url?: string;
	action_label?: string;
	secondary_action_url?: string;
	secondary_action_label?: string;
	alert_title?: string;
	alert_message?: string;
	alert_tone?: TemplateTone;
	logo_url?: string;
	support_email?: string;
	website_url?: string;
	preferences_url?: string;
	footer_note?: string;
	[key: string]: unknown;
}

export interface TemplateMetadata {
	id: string;
	system: string;
	agent: string;
	systemName: string;
	event: string;
	locale: "ar";
	version: number;
	name: string;
	subject: string;
	preheader: string;
	senderEnv?: string;
	defaultFrom?: string;
	defaultBrandName: string;
	defaultMessage: string;
	defaultStatusLabel: string;
	defaultStatusTone: TemplateTone;
	defaultActionLabel: string;
	required: string[];
	optional: string[];
}

interface LoadedTemplate extends TemplateMetadata {
	html: string;
	text: string;
}

export interface TemplatePublicMetadata {
	id: string;
	system: string;
	systemName: string;
	event: string;
	locale: "ar";
	version: number;
	name: string;
	subject: string;
	preheader: string;
	required: string[];
	optional: string[];
	recommendedAgent: string;
}

export interface RenderedEmail {
	templateId: string;
	subject: string;
	html: string;
	text: string;
	metadata: TemplatePublicMetadata;
}

export interface TemplateSyncRow {
	id: string;
	system: string;
	agent_id: string;
	name: string;
	subject: string;
	preheader: string;
	locale: string;
	version: number;
	html: string;
	text_body: string;
	required: string[];
	optional: string[];
	metadata: Record<string, unknown>;
	enabled: boolean;
}

export class EmailTemplateError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "EmailTemplateError";
	}
}

const TEMPLATES_DIR = process.env.TEMPLATES_DIR
	? path.resolve(process.env.TEMPLATES_DIR)
	: path.join(process.cwd(), "templates");
const EXPECTED_TEMPLATE_COUNT = Number(
	process.env.EXPECTED_TEMPLATE_COUNT ?? 144,
);
const EXPECTED_AGENT_IDENTITIES = new Set([
	"az-agent-backend",
	"az-agent-azabot",
	"az-agent-auth",
	"az-agent-prod",
	"az-agent-maint",
	"az-agent-core",
	"az-agent-bim",
	"az-agent-finance",
	"az-agent-payments",
	"az-agent-copilot",
	"az-agent-project",
	"az-agent-vision",
]);
const VALID_TONES = new Set<TemplateTone>([
	"info",
	"success",
	"warning",
	"error",
]);
const URL_FIELDS = [
	"action_url",
	"secondary_action_url",
	"logo_url",
	"website_url",
	"preferences_url",
] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTML_ENTITIES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};
const DEFAULT_LOGO_URL =
	process.env.EMAIL_LOGO_URL ?? "https://alazab.com/w.gif";
const DEFAULT_WEBSITE_URL =
	process.env.COMPANY_WEBSITE_URL ?? "https://alazab.com";
const TONE_COLORS: Record<
	TemplateTone,
	{ background: string; border: string; color: string }
> = {
	info: { background: "#eaf2ff", border: "#b8cdf5", color: "#164a8a" },
	success: { background: "#eaf8ef", border: "#b9e2c6", color: "#17653a" },
	warning: { background: "#fff7df", border: "#f0d58a", color: "#755300" },
	error: { background: "#fff0f0", border: "#efb9b9", color: "#8a2020" },
};

function requireString(value: unknown, field: string): string {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(
			`[az-agent-call] template metadata field "${field}" is missing or invalid.`,
		);
	}
	return value.trim();
}

function loadCatalog(): LoadedTemplate[] {
	if (!existsSync(TEMPLATES_DIR)) {
		throw new Error(
			`[az-agent-call] templates directory not found: ${TEMPLATES_DIR}`,
		);
	}

	const loaded: LoadedTemplate[] = [];
	const ids = new Set<string>();

	for (const systemDir of readdirSync(TEMPLATES_DIR, {
		withFileTypes: true,
	}).filter((entry) => entry.isDirectory())) {
		const folder = systemDir.name;
		const dir = path.join(TEMPLATES_DIR, folder);
		const metaFiles = readdirSync(dir)
			.filter((name) => name.endsWith(".meta.json"))
			.sort();

		for (const metaFile of metaFiles) {
			const base = metaFile.slice(0, -".meta.json".length);
			const metaPath = path.join(dir, metaFile);
			const htmlPath = path.join(dir, `${base}.html`);
			const textPath = path.join(dir, `${base}.txt`);
			if (!existsSync(htmlPath) || !existsSync(textPath)) {
				throw new Error(
					`[az-agent-call] template ${folder}/${base} must have .html, .txt and .meta.json files.`,
				);
			}

			const raw = JSON.parse(
				readFileSync(metaPath, "utf8"),
			) as Partial<TemplateMetadata>;
			const id = requireString(raw.id, "id");
			const system = requireString(raw.system, "system");
			const agent = requireString(raw.agent, "agent");

			if (ids.has(id))
				throw new Error(`[az-agent-call] duplicate template id: ${id}`);
			if (system !== folder) {
				throw new Error(
					`[az-agent-call] template ${id} says system=${system} but lives under templates/${folder}.`,
				);
			}
			if (agent !== `az-agent-${system}`) {
				throw new Error(
					`[az-agent-call] template ${id} ownership mismatch: ${agent} does not match its system ${system}.`,
				);
			}
			if (!EXPECTED_AGENT_IDENTITIES.has(agent)) {
				throw new Error(
					`[az-agent-call] template ${id} points to unknown agent ${agent}.`,
				);
			}
			if (!VALID_TONES.has(raw.defaultStatusTone as TemplateTone)) {
				throw new Error(
					`[az-agent-call] template ${id} has invalid defaultStatusTone.`,
				);
			}
			if (!Array.isArray(raw.required) || !Array.isArray(raw.optional)) {
				throw new Error(
					`[az-agent-call] template ${id} must declare required[] and optional[].`,
				);
			}

			ids.add(id);
			loaded.push({
				...(raw as TemplateMetadata),
				id,
				system,
				agent,
				html: readFileSync(htmlPath, "utf8"),
				text: readFileSync(textPath, "utf8"),
			});
		}
	}

	loaded.sort((a, b) => a.id.localeCompare(b.id));
	if (
		Number.isFinite(EXPECTED_TEMPLATE_COUNT) &&
		loaded.length !== EXPECTED_TEMPLATE_COUNT
	) {
		throw new Error(
			`[az-agent-call] template catalog mismatch: expected ${EXPECTED_TEMPLATE_COUNT}, found ${loaded.length} in ${TEMPLATES_DIR}.`,
		);
	}
	return loaded;
}

const CATALOG = loadCatalog();
const BY_ID = new Map(CATALOG.map((template) => [template.id, template]));

function publicMetadata(template: LoadedTemplate): TemplatePublicMetadata {
	return {
		id: template.id,
		system: template.system,
		systemName: template.systemName,
		event: template.event,
		locale: template.locale,
		version: template.version,
		name: template.name,
		subject: template.subject,
		preheader: template.preheader,
		required: [...template.required],
		optional: [...template.optional],
		recommendedAgent: template.agent,
	};
}

export const TEMPLATE_COUNT = CATALOG.length;

export function templateRowsForSync(): TemplateSyncRow[] {
	return CATALOG.map((template) => ({
		id: template.id,
		system: template.system,
		agent_id: template.system,
		name: template.name,
		subject: template.subject,
		preheader: template.preheader,
		locale: template.locale,
		version: template.version,
		html: template.html,
		text_body: template.text,
		required: [...template.required],
		optional: [...template.optional],
		metadata: {
			event: template.event,
			systemName: template.systemName,
			agent: template.agent,
			defaultBrandName: template.defaultBrandName,
			defaultMessage: template.defaultMessage,
			defaultStatusLabel: template.defaultStatusLabel,
			defaultStatusTone: template.defaultStatusTone,
			defaultActionLabel: template.defaultActionLabel,
		},
		enabled: true,
	}));
}

export function templateCountsByAgent(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const identity of EXPECTED_AGENT_IDENTITIES) counts[identity] = 0;
	for (const template of CATALOG)
		counts[template.agent] = (counts[template.agent] ?? 0) + 1;
	return counts;
}

export function templatesForAgent(
	agent: RuntimeAgent,
): TemplatePublicMetadata[] {
	return CATALOG.filter((template) => template.agent === agent.foundry_id).map(
		publicMetadata,
	);
}

/** All 144 templates are globally visible and usable. Ownership metadata is recommendation only. */
export function allTemplates(): TemplatePublicMetadata[] {
	return CATALOG.map(publicMetadata);
}

function catalogTemplate(templateId: string): LoadedTemplate {
	const template = BY_ID.get(templateId);
	if (!template) {
		throw new EmailTemplateError("القالب غير موجود", "TEMPLATE_NOT_FOUND", {
			templateId,
		});
	}
	return template;
}

export function templateMetadata(templateId: string): TemplatePublicMetadata {
	return publicMetadata(catalogTemplate(templateId));
}

export function templateMetadataForAgent(
	_agent: RuntimeAgent,
	templateId: string,
): TemplatePublicMetadata {
	return templateMetadata(templateId);
}

function boundedString(
	value: unknown,
	field: string,
	max: number,
	required = false,
): string | undefined {
	if (value === undefined || value === null || value === "") {
		if (required)
			throw new EmailTemplateError(`الحقل ${field} مطلوب`, "MISSING_FIELD", {
				field,
			});
		return undefined;
	}
	const text = String(value).trim();
	if (!text || text.length > max) {
		throw new EmailTemplateError(
			`الحقل ${field} غير صالح أو تجاوز الحد`,
			"INVALID_FIELD",
			{ field, max },
		);
	}
	return text;
}

function normalizeEmail(value: string): string {
	const normalized = value.trim().toLowerCase();
	if (normalized.length > 320 || !EMAIL_PATTERN.test(normalized)) {
		throw new EmailTemplateError(
			"عنوان البريد الإلكتروني غير صالح",
			"INVALID_EMAIL",
			{ value },
		);
	}
	return normalized;
}

function validateUrl(value: string, field: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new EmailTemplateError(`الرابط ${field} غير صالح`, "INVALID_URL", {
			field,
			value,
		});
	}
	if (url.protocol !== "https:") {
		throw new EmailTemplateError(
			`الرابط ${field} يجب أن يستخدم HTTPS`,
			"INSECURE_URL",
			{ field, value },
		);
	}
	return url.toString();
}

function validateTemplateData(
	template: LoadedTemplate,
	input: EmailTemplateData,
): EmailTemplateData {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		throw new EmailTemplateError(
			"بيانات القالب يجب أن تكون كائنًا",
			"INVALID_DATA",
		);
	}

	const output: EmailTemplateData = { ...input };
	for (const requiredField of template.required) {
		if (
			input[requiredField] === undefined ||
			input[requiredField] === null ||
			input[requiredField] === ""
		) {
			throw new EmailTemplateError(
				`الحقل ${requiredField} مطلوب`,
				"MISSING_FIELD",
				{ field: requiredField },
			);
		}
	}

	output.recipient_name = boundedString(
		input.recipient_name,
		"recipient_name",
		200,
		true,
	)!;
	output.reference = boundedString(input.reference, "reference", 120);
	output.message = boundedString(input.message, "message", 4000);
	output.status_label = boundedString(input.status_label, "status_label", 100);
	output.action_label = boundedString(input.action_label, "action_label", 100);
	output.secondary_action_label = boundedString(
		input.secondary_action_label,
		"secondary_action_label",
		100,
	);
	output.alert_title = boundedString(input.alert_title, "alert_title", 150);
	output.alert_message = boundedString(
		input.alert_message,
		"alert_message",
		1500,
	);
	output.footer_note = boundedString(input.footer_note, "footer_note", 1000);
	output.support_email = input.support_email
		? normalizeEmail(String(input.support_email))
		: undefined;

	if (input.status_tone && !VALID_TONES.has(input.status_tone)) {
		throw new EmailTemplateError(
			"قيمة status_tone غير معتمدة",
			"INVALID_TONE",
			{ value: input.status_tone },
		);
	}
	if (input.alert_tone && !VALID_TONES.has(input.alert_tone)) {
		throw new EmailTemplateError("قيمة alert_tone غير معتمدة", "INVALID_TONE", {
			value: input.alert_tone,
		});
	}

	for (const field of URL_FIELDS) {
		const value = input[field];
		if (value) output[field] = validateUrl(String(value), field);
	}

	if (input.details !== undefined) {
		if (!Array.isArray(input.details) || input.details.length > 30) {
			throw new EmailTemplateError(
				"details يجب أن تكون مصفوفة بحد أقصى 30 عنصرًا",
				"INVALID_DETAILS",
			);
		}
		output.details = input.details.map((detail, index) => ({
			label: boundedString(
				detail?.label,
				`details[${index}].label`,
				120,
				true,
			)!,
			value: boundedString(
				detail?.value,
				`details[${index}].value`,
				700,
				true,
			)!,
		}));
	}

	return output;
}

function escapeHtml(value: unknown): string {
	return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

function getValue(data: Record<string, unknown>, keyPath: string): unknown {
	return keyPath.split(".").reduce<unknown>((current, key) => {
		if (current && typeof current === "object" && key in current) {
			return (current as Record<string, unknown>)[key];
		}
		return undefined;
	}, data);
}

function renderSections(
	template: string,
	data: Record<string, unknown>,
	html: boolean,
): string {
	const sectionPattern = /{{#\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g;
	const invertedPattern = /{{\^\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g;

	let output = template.replace(
		sectionPattern,
		(_match, key: string, block: string) => {
			const value = getValue(data, key);
			if (Array.isArray(value)) {
				return value
					.map((item) =>
						renderString(
							block,
							{
								...data,
								...(item && typeof item === "object"
									? (item as Record<string, unknown>)
									: { ".": item }),
							},
							html,
						),
					)
					.join("");
			}
			if (value && typeof value === "object") {
				return renderString(
					block,
					{ ...data, ...(value as Record<string, unknown>) },
					html,
				);
			}
			return value ? renderString(block, data, html) : "";
		},
	);

	output = output.replace(
		invertedPattern,
		(_match, key: string, block: string) => {
			const value = getValue(data, key);
			const empty =
				value === undefined ||
				value === null ||
				value === false ||
				value === "" ||
				(Array.isArray(value) && value.length === 0);
			return empty ? renderString(block, data, html) : "";
		},
	);
	return output;
}

function renderString(
	template: string,
	data: Record<string, unknown>,
	html: boolean,
): string {
	let output = template;
	let previous = "";
	let iterations = 0;
	while (output !== previous && iterations < 10) {
		previous = output;
		output = renderSections(output, data, html);
		iterations += 1;
	}
	return output.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
		const value = getValue(data, key);
		return html ? escapeHtml(value) : String(value ?? "");
	});
}

export function renderTemplateForAgent(
	agent: RuntimeAgent,
	templateId: string,
	inputData: EmailTemplateData,
): RenderedEmail {
	const template = catalogTemplate(templateId);
	const data = validateTemplateData(template, inputData);
	const status = TONE_COLORS[data.status_tone ?? template.defaultStatusTone];
	const alert = TONE_COLORS[data.alert_tone ?? "warning"];

	const merged: Record<string, unknown> = {
		...data,
		brand_name: template.defaultBrandName,
		company_name: process.env.COMPANY_NAME ?? "شركة العزب",
		logo_url: data.logo_url ?? DEFAULT_LOGO_URL,
		support_email: data.support_email ?? agent.mailbox,
		website_url: data.website_url ?? DEFAULT_WEBSITE_URL,
		current_year: new Date().getUTCFullYear(),
		system_name: template.systemName,
		template_reference: template.id,
		email_title: template.name,
		preheader: template.preheader,
		message: data.message ?? template.defaultMessage,
		status_label: data.status_label ?? template.defaultStatusLabel,
		action_label: data.action_label ?? template.defaultActionLabel,
		secondary_action_label: data.secondary_action_label ?? "فتح الرابط البديل",
		footer_note:
			data.footer_note ?? "هذه رسالة تشغيلية آلية صادرة من نظام العزب.",
		status_background: status.background,
		status_border: status.border,
		status_color: status.color,
		alert_background: alert.background,
		alert_border: alert.border,
		alert_color: alert.color,
	};

	const subject = renderString(template.subject, merged, false)
		.replace(/[\r\n]+/g, " ")
		.trim();
	const html = renderString(template.html, merged, true);
	const text = `${renderString(template.text, merged, false)
		.replace(/\n{3,}/g, "\n\n")
		.trim()}\n`;

	if (
		/{{[\s\S]*?}}/.test(subject) ||
		/{{[\s\S]*?}}/.test(html) ||
		/{{[\s\S]*?}}/.test(text)
	) {
		throw new EmailTemplateError(
			"تعذر حل جميع متغيرات القالب",
			"UNRESOLVED_TEMPLATE_VARIABLE",
			{ templateId },
		);
	}

	return {
		templateId,
		subject,
		html,
		text,
		metadata: publicMetadata(template),
	};
}
