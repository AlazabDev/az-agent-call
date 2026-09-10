import process from "node:process";
import type { CallSessionOptions, CallSessionRecord, TelephonyProvider } from "./types.js";

export class DefaultTelephonyProvider implements TelephonyProvider {
  public readonly name = "az-telephony-sip";

  public get isConfigured(): boolean {
    const sipHost = process.env.SIP_HOST || process.env.TWILIO_ACCOUNT_SID;
    return Boolean(sipHost);
  }

  public async makeCall(options: CallSessionOptions): Promise<CallSessionRecord> {
    if (!this.isConfigured) {
      throw new Error("TELEPHONY_NOT_CONFIGURED: Telephony Provider credentials (SIP_HOST or TWILIO_ACCOUNT_SID) are not configured in environment.");
    }

    // Provider implementation when configured
    const now = new Date().toISOString();
    return {
      id: `call_${Date.now()}`,
      provider: this.name,
      agent_id: options.agentId,
      direction: "outbound",
      from_number: options.from || "system",
      to_number: options.to,
      status: "queued",
      created_at: now,
    };
  }

  public async getCallSession(callId: string): Promise<CallSessionRecord> {
    if (!this.isConfigured) {
      throw new Error(`TELEPHONY_NOT_CONFIGURED: Cannot fetch call session ${callId} - Telephony Provider not configured.`);
    }

    throw new Error(`TELEPHONY_NOT_FOUND: Call session ${callId} not found.`);
  }

  public async getTranscript(callId: string): Promise<{ callId: string; transcript: string; status: string }> {
    if (!this.isConfigured) {
      throw new Error(`TELEPHONY_NOT_CONFIGURED: Cannot fetch transcript for call ${callId} - Telephony Provider not configured.`);
    }

    throw new Error(`TELEPHONY_NOT_FOUND: Call transcript for ${callId} not found.`);
  }
}

export const telephonyProvider = new DefaultTelephonyProvider();
