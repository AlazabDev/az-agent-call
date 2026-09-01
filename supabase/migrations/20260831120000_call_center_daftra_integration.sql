-- Supabase Migration: Az Agent Call Center & Daftra ERP Deep Integration
-- Date: 2026-08-31

-- 1. Call Sessions Table
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'az-telephony-sip',
    provider_call_id TEXT,
    agent_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'ringing', 'in_progress', 'completed', 'busy', 'no_answer', 'failed', 'canceled')),
    started_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT,
    transcript_text TEXT,
    daftra_client_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Call Events Lifecycle Table
CREATE TABLE IF NOT EXISTS public.call_events (
    id BIGSERIAL PRIMARY KEY,
    call_session_id TEXT NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Daftra Action Audit Log
CREATE TABLE IF NOT EXISTS public.daftra_action_log (
    id BIGSERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    call_session_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    http_status INTEGER,
    error_code TEXT,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Daftra Entity Aliases Table
CREATE TABLE IF NOT EXISTS public.daftra_entity_aliases (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    alias TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_agent ON public.call_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_to_number ON public.call_sessions(to_number);
CREATE INDEX IF NOT EXISTS idx_daftra_audit_agent ON public.daftra_action_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_daftra_aliases_query ON public.daftra_entity_aliases(entity_type, alias);

-- RLS Policies
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daftra_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daftra_entity_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on call_sessions" ON public.call_sessions FOR ALL USING (true);
CREATE POLICY "Allow authenticated admin read on call_sessions" ON public.call_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on call_events" ON public.call_events FOR ALL USING (true);
CREATE POLICY "Allow authenticated admin read on call_events" ON public.call_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on daftra_action_log" ON public.daftra_action_log FOR ALL USING (true);
CREATE POLICY "Allow authenticated admin read on daftra_action_log" ON public.daftra_action_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on daftra_entity_aliases" ON public.daftra_entity_aliases FOR ALL USING (true);
CREATE POLICY "Allow authenticated admin read on daftra_entity_aliases" ON public.daftra_entity_aliases FOR SELECT TO authenticated USING (true);
