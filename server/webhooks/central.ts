import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase.js";
import { getWhatsAppConfig } from "../whatsapp/config.js";

/**
 * Meta WhatsApp Webhook Handshake (GET)
 */
export function handleWhatsAppWebhookVerify(req: Request, res: Response) {
	const config = getWhatsAppConfig();
	const mode = req.query["hub.mode"];
	const token = req.query["hub.verify_token"];
	const challenge = req.query["hub.challenge"];

	if (mode === "subscribe" && token === config.webhookVerifyToken) {
		console.log("[az-webhooks] Meta WhatsApp Webhook verified successfully.");
		return res.status(200).send(challenge);
	}

	console.warn("[az-webhooks] Meta WhatsApp Webhook verification failed.");
	return res.status(403).json({ error: "Verification failed" });
}

/**
 * Meta WhatsApp Webhook Inbound Events (POST)
 */
export async function handleWhatsAppWebhookEvent(req: Request, res: Response) {
	try {
		const body = req.body;

		if (body.object === "whatsapp_business_account") {
			for (const entry of body.entry || []) {
				for (const change of entry.changes || []) {
					const value = change.value;
					if (value?.messages) {
						for (const msg of value.messages) {
							const phoneId = value.metadata?.phone_number_id || "unknown";
							const sender = msg.from;
							const text = msg.text?.body || msg.caption || "[Media]";
							const msgId = msg.id;

							try {
								await supabaseAdmin.from("whatsapp_messages").insert({
									waba_id: entry.id || "meta",
									phone_number_id: phoneId,
									sender_number: sender,
									recipient_number:
										value.metadata?.display_phone_number || "business",
									direction: "inbound",
									message_type: msg.type || "text",
									body_text: text,
									meta_message_id: msgId,
									status: "read",
								});
							} catch {
								// Ignore background DB insert errors
							}
						}
					}

					if (value?.statuses) {
						for (const statusObj of value.statuses) {
							try {
								await supabaseAdmin
									.from("whatsapp_messages")
									.update({ status: statusObj.status })
									.eq("meta_message_id", statusObj.id);
							} catch {
								// Ignore background DB update errors
							}
						}
					}
				}
			}
		}

		return res.status(200).json({ status: "ok" });
	} catch (err: any) {
		console.error("[az-webhooks] Error processing WhatsApp webhook:", err);
		return res.status(200).json({ status: "ok" });
	}
}

/**
 * Daftra ERP Central Webhook Listener (POST)
 */
export async function handleDaftraWebhookEvent(req: Request, res: Response) {
	try {
		const payload = req.body;
		const eventType = payload.event || payload.action || "daftra_event";

		console.log(`[az-webhooks] Received Daftra Webhook event: ${eventType}`);

		try {
			await supabaseAdmin.from("daftra_webhooks_log").insert({
				provider: "daftra",
				event_type: eventType,
				payload,
				processed: true,
			});
		} catch {
			// Ignore background DB insert errors
		}

		return res.status(200).json({ ok: true, received: true, event: eventType });
	} catch (err: any) {
		console.error("[az-webhooks] Error processing Daftra webhook:", err);
		return res.status(500).json({ ok: false, error: err.message });
	}
}
