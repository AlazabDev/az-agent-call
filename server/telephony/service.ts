import { supabaseAdmin } from "../supabase.js";
import { telephonyProvider } from "./provider.js";
import type { CallSessionOptions, CallSessionRecord } from "./types.js";

export const telephonyService = {
  get isReady(): boolean {
    return telephonyProvider.isConfigured;
  },

  async makeCall(options: CallSessionOptions): Promise<CallSessionRecord> {
    const session = await telephonyProvider.makeCall(options);

    try {
      if (supabaseAdmin) {
        await supabaseAdmin.from("call_sessions").insert({
          id: session.id,
          provider: session.provider,
          agent_id: session.agent_id,
          direction: session.direction,
          from_number: session.from_number,
          to_number: session.to_number,
          status: session.status,
          created_at: session.created_at,
        });
      }
    } catch {
      // Non-fatal database log fallback
    }

    return session;
  },

  async getTranscript(callId: string) {
    return telephonyProvider.getTranscript(callId);
  },
};
