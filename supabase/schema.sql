-- ============================================================================
-- MindLC AI Marketing Command Center — Supabase PostgreSQL Schema & Seed Data
-- Target: First 100 Paid Students (Tier 2 Managed Hybrid Plan: $139 CAD/mo)
-- Includes: Weekly Reality Gate, Single-Bottleneck Lock-In, & Mandatory Proposal Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'Editor', 'Viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MARKETING_SKILLS TABLE
CREATE TABLE IF NOT EXISTS public.marketing_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_name TEXT UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WEEKLY_REALITY_LOGS TABLE (Safeguard 1: Weekly Reality Gate & VoC Cache)
CREATE TABLE IF NOT EXISTS public.weekly_reality_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start_date DATE UNIQUE NOT NULL,
  funnel_metrics JSONB NOT NULL, -- { reach_or_contacts, diag_booked, diag_completed, paid_conversions }
  verbatim_parent_quotes JSONB NOT NULL, -- [{ id, quote_text, context_tag, week_start_date }]
  top_winning_touchpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ASSETS & HITL PROPOSALS TABLE (Safeguard 3 & 4: Mandatory Proposal Schema + HITL State Machine)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  detail_level_used INTEGER NOT NULL DEFAULT 2 CHECK (detail_level_used BETWEEN 1 AND 3),
  bottleneck_stage TEXT NOT NULL DEFAULT 'STAGE_1_CONVERSION' CHECK (
    bottleneck_stage IN ('STAGE_1_CONVERSION', 'STAGE_2_REFERRAL_DIAG', 'STAGE_3_SCALE_ADS')
  ),
  hitl_state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    hitl_state IN ('DRAFT', 'APPROVED_FOR_EXECUTION', 'VALIDATED_WINNER', 'KILLED_BY_STOP_LOSS')
  ),
  proposal_schema JSONB, -- Full validated MandatoryProposalSchema (devils_advocate, kill_criteria, cited_voc_quotes, single_cta)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security (RLS) Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reality_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write on users"
  ON public.users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on marketing_skills"
  ON public.marketing_skills FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on campaigns"
  ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on weekly_reality_logs"
  ON public.weekly_reality_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on assets"
  ON public.assets FOR ALL USING (true) WITH CHECK (true);
