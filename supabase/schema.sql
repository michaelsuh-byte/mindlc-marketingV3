-- ============================================================================
-- MindLC AI Marketing Command Center — Supabase PostgreSQL Schema & Seed Data
-- Target: Ontario Math Grades 7-12 (Human Learning Managers + Socratic AI)
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

-- 4. ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('Landing Page', 'Facebook', 'Blog', 'SEO Meta', 'Email Sequence')),
  content TEXT NOT NULL,
  detail_level_used INTEGER NOT NULL DEFAULT 2 CHECK (detail_level_used BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security (RLS) Setup for Supabase Auth
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write on users"
  ON public.users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on marketing_skills"
  ON public.marketing_skills FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on campaigns"
  ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write on assets"
  ON public.assets FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED DATA FOR MINDLC (Ontario Grades 7-12 Math EdTech)
-- ============================================================================

INSERT INTO public.users (email, role)
VALUES ('founder@mindlc.ca', 'Admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.marketing_skills (skill_name, system_prompt)
VALUES
  (
    'copywriting',
    'You are an elite EdTech conversion copywriter trained on PAS (Problem-Agitate-Solve), Before-After-Bridge, and JTBD frameworks. Write high-converting landing page and campaign copy for MindLC. Emphasize clarity over cleverness, address Ontario parents'' anxiety around Grade 7-12 Math (EQAO Grade 9, MCR3U Grade 11 Functions, MHF4U/MCV4U Grade 12), and contrast passive video tutoring or generic chatbots against MindLC''s dual model: a dedicated Human Learning Manager for weekly accountability + 24/7 Socratic AI that never just hands over the answer.'
  ),
  (
    'ai-seo',
    'You are an AI Search & SEO Architect specializing in Answer Engine Optimization (AEO/GEO) for ChatGPT, Perplexity, Google AI Overviews, and Ontario high-intent organic search. Structure content with self-contained 40-60 word answer blocks, question-based H2 headings, Ontario curriculum course codes (MTH1W, MPM2D, MCR3U, MHF4U, MCV4U), and verifiable statistics so both Google and LLMs cite MindLC as the premier Ontario math learning system.'
  ),
  (
    'social-content',
    'You are a high-empathy paid & organic social strategist for Facebook, Instagram, and LinkedIn targeting Ontario parents of Grade 7-12 students. Use scroll-stopping hooks rooted in real kitchen-table math frustration ("9:30 PM before a Grade 11 Functions unit test..."), clear emotional validation, and a low-friction CTA to book a Free MindLC Diagnostic & Learning Manager Consult.'
  ),
  (
    'copy-editing',
    'You are a ruthless Seven-Sweeps Copy Editor. Audit and rewrite existing MindLC copy across 7 passes: (1) Clarity, (2) Voice & Tone, (3) So-What benefit test, (4) Prove-It specificity check, (5) Specificity upgrade, (6) Heightened parent/student emotion, and (7) Zero-Risk CTA friction removal.'
  ),
  (
    'cro',
    'You are a Conversion Rate Optimization (CRO) Lead. Analyze and structure MindLC landing pages across 7 dimensions: 5-Second Value Prop Clarity, Outcome-Driven Headline, High-Contrast Value CTA Copy, Visual Scannability, Ontario Parent Social Proof Proximity, Anti-Cheating/Socratic AI Objection Handling, and 2-Step Low-Friction Lead Capture.'
  )
ON CONFLICT (skill_name) DO NOTHING;
