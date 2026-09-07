import process from "node:process";
import type {
	CallSessionOptions,
	CallSessionRecord,
	TelephonyProvider,
} from "./types.js";

function twilioConfig() {
	return {
		accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || "",
		authToken: process.env.TWILIO_AUTH_TOKEN?.trim() || "",
		fromNumber: process.env.TWILIO_FROM_NUMBER?.trim() || "",
		voiceUrl: process.env.TWILIO_VOICE_URL?.trim() || "",
	};
}

function basicAuth(user: string, pass: string): string {
	return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

export class DefaultTelephonyProvider implements TelephonyProvider {
	public readonly name = "twilio-programmable-voice";

	public get isConfigured(): boolean {
		const cfg = twilioConfig();
		return Boolean(
			cfg.accountSid && cfg.authToken && cfg.fromNumber && cfg.voiceUrl,
		);
	}

	public async makeCall(
		options: CallSessionOptions,
	): Promise<CallSessionRecord> {
		const cfg = twilioConfig();
		if (!this.isConfigured) {
			throw new Error(
				"TELEPHONY_NOT_CONFIGURED: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER and TWILIO_VOICE_URL.",
			);
		}

		const body = new URLSearchParams({
			To: options.to,
			From: cfg.fromNumber,
			Url: cfg.voiceUrl,
		});

		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.accountSid)}/Calls.json`,
			{
				method: "POST",
				headers: {
					Authorization: basicAuth(cfg.accountSid, cfg.authToken),
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body,
			},
		);

		const payload = (await response.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		if (!response.ok) {
			throw new Error(
				`TWILIO_CALL_FAILED: HTTP ${response.status} ${JSON.stringify(payload)}`,
			);
		}

		const now = new Date().toISOString();
		const rawStatus = String(payload.status || "queued").replaceAll("-", "_");
		const allowedStatuses: CallSessionRecord["status"][] = [
			"queued",
			"ringing",
			"in_progress",
			"completed",
			"busy",
			"no_answer",
			"failed",
			"canceled",
		];
		const status: CallSessionRecord["status"] = allowedStatuses.includes(
			rawStatus as CallSessionRecord["status"],
		)
			? (rawStatus as CallSessionRecord["status"])
			: "queued";

		return {
			id: String(payload.sid || `twilio_${Date.now()}`),
			provider: this.name,
			agent_id: options.agentId,
			direction: "outbound",
			from_number: String(payload.from || cfg.fromNumber),
			to_number: String(payload.to || options.to),
			status,
			created_at: String(payload.date_created || now),
		};
	}

	public async getCallSession(callId: string): Promise<CallSessionRecord> {
		const cfg = twilioConfig();
		if (!this.isConfigured) {
			throw new Error(
				`TELEPHONY_NOT_CONFIGURED: Cannot fetch call session ${callId}.`,
			);
		}

		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.accountSid)}/Calls/${encodeURIComponent(callId)}.json`,
			{
				headers: {
					Authorization: basicAuth(cfg.accountSid, cfg.authToken),
					Accept: "application/json",
				},
			},
		);
		const payload = (await response.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		if (!response.ok) {
			throw new Error(
				`TWILIO_CALL_LOOKUP_FAILED: HTTP ${response.status} ${JSON.stringify(payload)}`,
			);
		}

		const direction: CallSessionRecord["direction"] = String(
			payload.direction || "outbound",
		).includes("inbound")
			? "inbound"
			: "outbound";
		const rawStatus = String(payload.status || "queued").replaceAll("-", "_");
		const allowedStatuses: CallSessionRecord["status"][] = [
			"queued",
			"ringing",
			"in_progress",
			"completed",
			"busy",
			"no_answer",
			"failed",
			"canceled",
		];
		const status: CallSessionRecord["status"] = allowedStatuses.includes(
			rawStatus as CallSessionRecord["status"],
		)
			? (rawStatus as CallSessionRecord["status"])
			: "queued";

		return {
			id: String(payload.sid || callId),
			provider: this.name,
			agent_id: "unknown",
			direction,
			from_number: String(payload.from || ""),
			to_number: String(payload.to || ""),
			status,
			created_at: String(payload.date_created || new Date().toISOString()),
		};
	}

	public async getTranscript(
		callId: string,
	): Promise<{ callId: string; transcript: string; status: string }> {
		if (!this.isConfigured) {
			throw new Error(
				`TELEPHONY_NOT_CONFIGURED: Cannot fetch transcript for call ${callId}.`,
			);
		}
		throw new Error(
			`TRANSCRIPT_NOT_CONFIGURED: Twilio call ${callId} exists independently from transcription. Configure a transcription provider/webhook before using get_call_transcript.`,
		);
	}
}

export const telephonyProvider = new DefaultTelephonyProvider();
