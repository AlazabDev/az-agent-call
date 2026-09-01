export interface CallSessionOptions {
  to: string;
  from?: string;
  agentId: string;
  scriptTemplateId?: string;
  metadata?: Record<string, unknown>;
}

export interface CallSessionRecord {
  id: string;
  provider: string;
  provider_call_id?: string;
  agent_id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: "queued" | "ringing" | "in_progress" | "completed" | "busy" | "no_answer" | "failed" | "canceled";
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript_text?: string;
  created_at: string;
}

export interface TelephonyProvider {
  name: string;
  isConfigured: boolean;
  makeCall(options: CallSessionOptions): Promise<CallSessionRecord>;
  getCallSession(callId: string): Promise<CallSessionRecord>;
  getTranscript(callId: string): Promise<{ callId: string; transcript: string; status: string }>;
}
