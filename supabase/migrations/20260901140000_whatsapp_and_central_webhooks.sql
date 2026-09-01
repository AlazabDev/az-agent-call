-- Supabase Migration: WhatsApp Multi-WABA Hub & Centralized Webhooks Integration
-- Date: 2026-09-01

-- 1. WhatsApp Phone Numbers Catalog Table
CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
    id SERIAL PRIMARY KEY,
    waba_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('agent', 'team', 'project')),
    allocated_agent_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. WhatsApp Messages & Activity Audit Log Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id BIGSERIAL PRIMARY KEY,
    waba_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    sender_number TEXT NOT NULL,
    recipient_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'interactive', 'image', 'document', 'audio')),
    body_text TEXT,
    template_name TEXT,
    meta_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    error_code TEXT,
    error_message TEXT,
    agent_id TEXT,
    call_session_id TEXT,
    daftra_client_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Central Webhook Log Table (Daftra & Meta WhatsApp)
CREATE TABLE IF NOT EXISTS public.daftra_webhooks_log (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'daftra',
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Call Post Transcripts & Sentiment Table
CREATE TABLE IF NOT EXISTS public.call_post_transcripts (
    id BIGSERIAL PRIMARY KEY,
    call_session_id TEXT NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    daftra_client_id INTEGER,
    transcript_summary TEXT,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    synced_to_daftra BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone ON public.whatsapp_messages(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_recipient ON public.whatsapp_messages(recipient_number);
CREATE INDEX IF NOT EXISTS idx_wa_messages_meta_id ON public.whatsapp_messages(meta_message_id);
CREATE INDEX IF NOT EXISTS idx_daftra_webhooks_event ON public.daftra_webhooks_log(event_type);
CREATE INDEX IF NOT EXISTS idx_post_transcripts_client ON public.call_post_transcripts(daftra_client_id);

-- Seed Initial 9 WhatsApp Numbers (3 Agent + 6 Team/Project)
INSERT INTO public.whatsapp_numbers (waba_id, phone_number_id, phone_number, display_name, role, allocated_agent_id)
VALUES
  ('922964860845619', '1328521857002632', '+201115723930', 'Agent Contact Center Line 1', 'agent', 'call-center-1'),
  ('215483880192346', '21011864912017679', '+201092750351', 'Agent Contact Center Line 2', 'agent', 'call-center-2'),
  ('1527103499063250', '1197837903405393', '+201146395966', 'Agent Contact Center Line 3', 'agent', 'call-center-3'),
  ('1303965001665007', '1061490140383829', '+201146397010', 'Egypt Operations Line', 'team', NULL),
  ('2144651456337012', '1020054711186921', '+12054605650', 'US Operations Line 1', 'team', NULL),
  ('1458856398934130', '1032441389943808', '+12064795608', 'US Operations Line 2', 'team', NULL),
  ('1458856398934130', '952530191273396', '+12083799564', 'US Operations Line 3', 'team', NULL),
  ('459851797218855', '644995285354639', '+15557285727', 'Project Sandbox Line 1', 'project', NULL),
  ('459851797218855', '527697617099639', '+15557245001', 'Project Sandbox Line 2', 'project', NULL)
ON CONFLICT (phone_number_id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  allocated_agent_id = EXCLUDED.allocated_agent_id;

-- Enable RLS & Policies
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daftra_webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_post_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on whatsapp_numbers" ON public.whatsapp_numbers FOR ALL USING (true);
CREATE POLICY "Allow authenticated read on whatsapp_numbers" ON public.whatsapp_numbers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true);
CREATE POLICY "Allow authenticated read on whatsapp_messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on daftra_webhooks_log" ON public.daftra_webhooks_log FOR ALL USING (true);
CREATE POLICY "Allow authenticated read on daftra_webhooks_log" ON public.daftra_webhooks_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on call_post_transcripts" ON public.call_post_transcripts FOR ALL USING (true);
CREATE POLICY "Allow authenticated read on call_post_transcripts" ON public.call_post_transcripts FOR SELECT TO authenticated USING (true);
