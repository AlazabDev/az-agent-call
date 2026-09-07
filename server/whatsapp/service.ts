import { supabaseAdmin } from "../supabase.js";
import { whatsappClient } from "./client.js";
import {
	INITIAL_WHATSAPP_NUMBERS,
	type WhatsAppNumberRecord,
} from "./config.js";

export class WhatsAppService {
	public async getNumbers(): Promise<WhatsAppNumberRecord[]> {
		try {
			const { data, error } = await supabaseAdmin
				.from("whatsapp_numbers")
				.select("*")
				.order("id");

			if (error || !data || data.length === 0) {
				return INITIAL_WHATSAPP_NUMBERS;
			}

			return data.map((row) => ({
				id: row.id,
				wabaId: row.waba_id,
				phoneNumberId: row.phone_number_id,
				phoneNumber: row.phone_number,
				displayName: row.display_name,
				role: row.role,
				allocatedAgentId: row.allocated_agent_id,
				isActive: row.is_active,
			}));
		} catch {
			return INITIAL_WHATSAPP_NUMBERS;
		}
	}

	public async getNumberForAgent(
		agentId: string,
	): Promise<WhatsAppNumberRecord | null> {
		const numbers = await this.getNumbers();
		const assigned = numbers.find(
			(n) => n.allocatedAgentId === agentId && n.isActive,
		);
		if (assigned) return assigned;
		return (
			numbers.find((n) => n.role === "agent" && n.isActive) ||
			numbers[0] ||
			null
		);
	}

	public async sendTextMessage(options: {
		agentId?: string;
		phoneNumberId?: string;
		recipientPhone: string;
		text: string;
		callSessionId?: string;
		daftraClientId?: number;
	}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
		let senderNumberRecord: WhatsAppNumberRecord | null = null;

		if (options.phoneNumberId) {
			const numbers = await this.getNumbers();
			senderNumberRecord =
				numbers.find((n) => n.phoneNumberId === options.phoneNumberId) || null;
		} else if (options.agentId) {
			senderNumberRecord = await this.getNumberForAgent(options.agentId);
		}

		if (!senderNumberRecord) {
			const numbers = await this.getNumbers();
			senderNumberRecord = numbers[0] || null;
		}

		if (!senderNumberRecord) {
			return {
				ok: false,
				error: "No active WhatsApp sender number available.",
			};
		}

		const result = await whatsappClient.sendTextMessage({
			phoneNumberId: senderNumberRecord.phoneNumberId,
			recipientPhone: options.recipientPhone,
			text: options.text,
		});

		try {
			await supabaseAdmin.from("whatsapp_messages").insert({
				waba_id: senderNumberRecord.wabaId,
				phone_number_id: senderNumberRecord.phoneNumberId,
				sender_number: senderNumberRecord.phoneNumber,
				recipient_number: options.recipientPhone,
				direction: "outbound",
				message_type: "text",
				body_text: options.text,
				meta_message_id: result.messageId || null,
				status: result.ok ? "sent" : "failed",
				error_message: result.error || null,
				agent_id: options.agentId || null,
				call_session_id: options.callSessionId || null,
				daftra_client_id: options.daftraClientId || null,
			});
		} catch {
			// Safe audit fallback
		}

		return result;
	}

	public async sendTemplateMessage(options: {
		agentId?: string;
		phoneNumberId?: string;
		recipientPhone: string;
		templateName: string;
		languageCode?: string;
		components?: any[];
		daftraClientId?: number;
	}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
		let senderNumberRecord: WhatsAppNumberRecord | null = null;

		if (options.phoneNumberId) {
			const numbers = await this.getNumbers();
			senderNumberRecord =
				numbers.find((n) => n.phoneNumberId === options.phoneNumberId) || null;
		} else if (options.agentId) {
			senderNumberRecord = await this.getNumberForAgent(options.agentId);
		}

		if (!senderNumberRecord) {
			const numbers = await this.getNumbers();
			senderNumberRecord = numbers[0] || null;
		}

		if (!senderNumberRecord) {
			return {
				ok: false,
				error: "No active WhatsApp sender number available.",
			};
		}

		const result = await whatsappClient.sendTemplateMessage({
			phoneNumberId: senderNumberRecord.phoneNumberId,
			recipientPhone: options.recipientPhone,
			templateName: options.templateName,
			languageCode: options.languageCode || "ar",
			components: options.components,
		});

		try {
			await supabaseAdmin.from("whatsapp_messages").insert({
				waba_id: senderNumberRecord.wabaId,
				phone_number_id: senderNumberRecord.phoneNumberId,
				sender_number: senderNumberRecord.phoneNumber,
				recipient_number: options.recipientPhone,
				direction: "outbound",
				message_type: "template",
				template_name: options.templateName,
				meta_message_id: result.messageId || null,
				status: result.ok ? "sent" : "failed",
				error_message: result.error || null,
				agent_id: options.agentId || null,
				daftra_client_id: options.daftraClientId || null,
			});
		} catch {
			// Safe audit fallback
		}

		return result;
	}

	public async getMessageLogs(limit: number = 100) {
		try {
			const { data, error } = await supabaseAdmin
				.from("whatsapp_messages")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) return [];
			return data || [];
		} catch {
			return [];
		}
	}
}

export const whatsappService = new WhatsAppService();
