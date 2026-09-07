import process from "node:process";

export interface WhatsAppNumberRecord {
	id?: number;
	wabaId: string;
	phoneNumberId: string;
	phoneNumber: string;
	displayName: string;
	role: "agent" | "team" | "project";
	allocatedAgentId?: string | null;
	isActive: boolean;
}

export const INITIAL_WHATSAPP_NUMBERS: WhatsAppNumberRecord[] = [
	{
		wabaId: "922964860845619",
		phoneNumberId: "1328521857002632",
		phoneNumber: "+201115723930",
		displayName: "Agent Contact Center Line 1",
		role: "agent",
		allocatedAgentId: "call-center-1",
		isActive: true,
	},
	{
		wabaId: "215483880192346",
		phoneNumberId: "21011864912017679",
		phoneNumber: "+201092750351",
		displayName: "Agent Contact Center Line 2",
		role: "agent",
		allocatedAgentId: "call-center-2",
		isActive: true,
	},
	{
		wabaId: "1527103499063250",
		phoneNumberId: "1197837903405393",
		phoneNumber: "+201146395966",
		displayName: "Agent Contact Center Line 3",
		role: "agent",
		allocatedAgentId: "call-center-3",
		isActive: true,
	},
	{
		wabaId: "1303965001665007",
		phoneNumberId: "1061490140383829",
		phoneNumber: "+201146397010",
		displayName: "Egypt Operations Line",
		role: "team",
		allocatedAgentId: null,
		isActive: true,
	},
	{
		wabaId: "2144651456337012",
		phoneNumberId: "1020054711186921",
		phoneNumber: "+12054605650",
		displayName: "US Operations Line 1",
		role: "team",
		allocatedAgentId: null,
		isActive: true,
	},
	{
		wabaId: "1458856398934130",
		phoneNumberId: "1032441389943808",
		phoneNumber: "+12064795608",
		displayName: "US Operations Line 2",
		role: "team",
		allocatedAgentId: null,
		isActive: true,
	},
	{
		wabaId: "1458856398934130",
		phoneNumberId: "952530191273396",
		phoneNumber: "+12083799564",
		displayName: "US Operations Line 3",
		role: "team",
		allocatedAgentId: null,
		isActive: true,
	},
	{
		wabaId: "459851797218855",
		phoneNumberId: "644995285354639",
		phoneNumber: "+15557285727",
		displayName: "Project Sandbox Line 1",
		role: "project",
		allocatedAgentId: null,
		isActive: true,
	},
	{
		wabaId: "459851797218855",
		phoneNumberId: "527697617099639",
		phoneNumber: "+15557245001",
		displayName: "Project Sandbox Line 2",
		role: "project",
		allocatedAgentId: null,
		isActive: true,
	},
];

export interface WhatsAppConfig {
	apiVersion: string;
	accessToken: string;
	webhookVerifyToken: string;
	appSecret: string;
	isConfigured: boolean;
}

export function getWhatsAppConfig(): WhatsAppConfig {
	const apiVersion = process.env.WA_API_VERSION?.trim() || "v21.0";
	const accessToken = process.env.WA_ACCESS_TOKEN?.trim() || "";
	const webhookVerifyToken =
		process.env.WA_WEBHOOK_VERIFY_TOKEN?.trim() ||
		"alazab_wa_webhook_secret_2026";
	const appSecret = process.env.WA_APP_SECRET?.trim() || "";

	return {
		apiVersion,
		accessToken,
		webhookVerifyToken,
		appSecret,
		isConfigured: Boolean(accessToken),
	};
}
