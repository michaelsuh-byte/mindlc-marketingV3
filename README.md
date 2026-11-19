# MindLC — AI Marketing Command Center & Mentorship Studio (`mindlc-marketingV2`)

A full-stack AI Marketing Command Center built for **MindLC** (an EdTech platform combining **Human Learning Managers** for weekly accountability with **24/7 Socratic AI** for guided math hints across **Ontario Math Grades 7–12**).

Inspired by [`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills), this application acts as both an **interactive campaign generator** and a **CMO marketing mentor**.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 14 (App Router, React 18, TypeScript), Tailwind CSS
- **State Management:** Zustand (`src/store/useMarketingStore.ts`) for real-time dual-pane state synchronization
- **Backend & Database:** Supabase PostgreSQL & Auth (`supabase/schema.sql`, `src/lib/supabase.ts`)
- **AI Architecture:** Google Gemini Mandatory Output Protocol (`src/services/marketingAi.ts`)

---

## ✨ Core Features

1. **Campaign Co-Pilot (Dual-Pane Interactive Workspace)**
   - **Left Pane (Asset Canvas):** Editable preview cards for generated Landing Pages, Facebook Ads, Blogs, Email Sequences, and AI-SEO blocks with live word/character counters, inline editing, and 1-click Copy.
   - **Right Pane (AI Chat & Mentorship Window):**
     - **Select Marketing Skill Dropdown:** Dynamically pulls from `marketing_skills` (`copywriting`, `ai-seo`, `social-content`, `copy-editing`, `cro`).
     - **Explanation Detail Level (1–3):**
       - `Level 1`: Executive Summary (Fast)
       - `Level 2`: Standard Rationale
       - `Level 3`: Deep Mentorship (The Why & How — JTBD Four Forces, behavioral psychology, and A/B test hypotheses)
   - **Mandatory Output Protocol:** Strictly separates generated `marketingContent` (routed to the Left Asset Canvas) from `strategicJustification` (routed to the Right Chat Feed).

2. **Skill Library (Full CRUD Interface)**
   - Create, Read, Update, and Delete marketing skills and customize their underlying `system_prompt`s.

3. **AI Settings & MindLC Persona Guardrails**
   - Persistent brand positioning editor pre-configured for Ontario parents (Grades 7–12 Math: `MTH1W` EQAO, `MCR3U` Functions, `MHF4U` Advanced Functions, `MCV4U` Calculus & Vectors).

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Optional: Connect Live Supabase Project
1. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor to create the `users`, `marketing_skills`, `campaigns`, and `assets` tables with seed data.
