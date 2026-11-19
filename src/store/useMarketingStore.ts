import { create } from "zustand";
import {
  Asset,
  AssetPlatform,
  BrandPersona,
  Campaign,
  CampaignStatus,
  ChatMessage,
  DetailLevel,
  MarketingSkill,
  UserRecord,
} from "@/types/database";
import { generateMarketingResponse } from "@/services/marketingAi";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type NavigationTab =
  | "dashboard"
  | "copilot"
  | "skills"
  | "settings";

interface MarketingState {
  activeTab: NavigationTab;
  currentUser: UserRecord;
  skills: MarketingSkill[];
  campaigns: Campaign[];
  assets: Asset[];
  activeCampaignId: string;
  selectedSkillId: string;
  detailLevel: DetailLevel;
  preferredPlatform: AssetPlatform;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  lastHighlightedAssetId: string | null;
  brandPersona: BrandPersona;

  // Navigation & Selection Actions
  setActiveTab: (tab: NavigationTab) => void;
  setActiveCampaignId: (id: string) => void;
  setSelectedSkillId: (id: string) => void;
  setDetailLevel: (level: DetailLevel) => void;
  setPreferredPlatform: (platform: AssetPlatform) => void;

  // Dual-Pane Co-Pilot Command Action
  sendCopilotCommand: (userCommand: string) => Promise<void>;

  // Asset & Campaign Actions (Left Pane Canvas)
  updateAssetContent: (assetId: string, newContent: string, newTitle?: string) => void;
  deleteAsset: (assetId: string) => void;
  createManualAsset: (platform: AssetPlatform, title: string, content: string) => void;
  createCampaign: (title: string) => void;
  toggleCampaignStatus: (campaignId: string) => void;

  // Skill Library CRUD Actions (Page 2)
  createSkill: (skill_name: string, system_prompt: string, category?: string) => void;
  updateSkill: (id: string, skill_name: string, system_prompt: string, category?: string) => void;
  deleteSkill: (id: string) => void;

  // AI Settings & Persona Actions (Page 3)
  updateBrandPersona: (partial: Partial<BrandPersona>) => void;
}

const INITIAL_SKILLS: MarketingSkill[] = [
  {
    id: "skill-copywriting",
    skill_name: "copywriting",
    category: "Conversion & Messaging",
    system_prompt:
      "You are an elite EdTech conversion copywriter trained on PAS (Problem-Agitate-Solve), Before-After-Bridge, and JTBD frameworks. Write high-converting landing page and campaign copy for MindLC. Emphasize clarity over cleverness, address Ontario parents' anxiety around Grade 7-12 Math (EQAO Grade 9, MCR3U Grade 11 Functions, MHF4U/MCV4U Grade 12), and contrast passive video tutoring or generic chatbots against MindLC's dual model: a dedicated Human Learning Manager for weekly accountability + 24/7 Socratic AI that never just hands over the answer.",
  },
  {
    id: "skill-ai-seo",
    skill_name: "ai-seo",
    category: "Organic & AI Search (AEO/GEO)",
    system_prompt:
      "You are an AI Search & SEO Architect specializing in Answer Engine Optimization (AEO/GEO) for ChatGPT, Perplexity, Google AI Overviews, and Ontario high-intent organic search. Structure content with self-contained 40-60 word answer blocks, question-based H2 headings, Ontario curriculum course codes (MTH1W, MPM2D, MCR3U, MHF4U, MCV4U), and verifiable statistics so both Google and LLMs cite MindLC as the premier Ontario math learning system.",
  },
  {
    id: "skill-social-content",
    skill_name: "social-content",
    category: "Paid & Organic Social",
    system_prompt:
      "You are a high-empathy paid & organic social strategist for Facebook, Instagram, and LinkedIn targeting Ontario parents of Grade 7-12 students. Use scroll-stopping hooks rooted in real kitchen-table math frustration ('9:45 PM before a Grade 11 Functions unit test...'), clear emotional validation, and a low-friction CTA to book a Free MindLC Diagnostic & Learning Manager Consult.",
  },
  {
    id: "skill-copy-editing",
    skill_name: "copy-editing",
    category: "Editorial & Polish",
    system_prompt:
      "You are a ruthless Seven-Sweeps Copy Editor. Audit and rewrite existing MindLC copy across 7 passes: (1) Clarity, (2) Voice & Tone, (3) So-What benefit test, (4) Prove-It specificity check, (5) Specificity upgrade, (6) Heightened parent/student emotion, and (7) Zero-Risk CTA friction removal.",
  },
  {
    id: "skill-cro",
    skill_name: "cro",
    category: "Conversion Rate Optimization",
    system_prompt:
      "You are a Conversion Rate Optimization (CRO) Lead. Analyze and structure MindLC landing pages across 7 dimensions: 5-Second Value Prop Clarity, Outcome-Driven Headline, High-Contrast Value CTA Copy, Visual Scannability, Ontario Parent Social Proof Proximity, Anti-Cheating/Socratic AI Objection Handling, and 2-Step Low-Friction Lead Capture.",
  },
];

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-ontario-fall",
    title: "Ontario Math Grades 7–12 — Fall Parent Enrollment",
    status: "Approved",
    created_at: "2026-10-15T14:00:00Z",
  },
  {
    id: "camp-eqao-gr9",
    title: "Grade 9 De-Streamed Math (MTH1W) & EQAO Readiness",
    status: "Draft",
    created_at: "2026-10-28T09:30:00Z",
  },
  {
    id: "camp-gr11-functions",
    title: "Grade 11/12 Functions & Calculus (MCR3U · MHF4U · MCV4U)",
    status: "Draft",
    created_at: "2026-11-02T11:15:00Z",
  },
];

const INITIAL_ASSETS: Asset[] = [
  {
    id: "asset-hero-lp",
    campaign_id: "camp-ontario-fall",
    platform: "Landing Page",
    title: "Hero & PAS Conversion Copy — Ontario Grades 7–12",
    detail_level_used: 3,
    skill_used: "copywriting",
    updated_at: "10 mins ago",
    content: `🎯 [ABOVE-THE-FOLD HERO SECTION]
• Eyebrow: ONTARIO GRADES 7–12 MATH (MTH1W · MPM2D · MCR3U · MHF4U · MCV4U)
• Headline (H1): Raise Your Teen’s Ontario Math Marks—Without Homework Battles or Passive $80/hr Tutoring.
• Subheadline: MindLC pairs a dedicated Human Learning Manager for weekly accountability with 24/7 Socratic AI that guides your child through tough math steps without ever giving away the answer.
• Primary CTA: Book Your Free Ontario Math Diagnostic & Parent Consult →

💡 [WHY TRADITIONAL TUTORING & GENERIC AI BOTH FALL SHORT]
1. The 1-Hour Tutor Trap: A weekly tutor explains a concept on Sunday, but when your teen hits a wall on Wednesday at 9:30 PM, they are on their own.
2. The Chatbot Shortcut Trap: Standard AI tools hand over the final answer—destroying real comprehension before unit tests and EQAO.
3. The MindLC Dual System: Weekly human accountability + 24/7 Socratic step-by-step hints.`,
  },
  {
    id: "asset-fb-ad",
    campaign_id: "camp-ontario-fall",
    platform: "Facebook",
    title: "Ontario Parent Scroll-Stopper — 9:45 PM Homework Hook",
    detail_level_used: 2,
    skill_used: "social-content",
    updated_at: "25 mins ago",
    content: `📣 [FACEBOOK / INSTAGRAM AD — ONTARIO PARENTS]

It’s 9:45 PM on a Tuesday. Your teen has a Grade 11 Functions (MCR3U) unit test tomorrow morning—and they’re staring at a blank page.

Traditional $75/hr tutors only show up once a week.
Generic AI chatbots just hand over the final answer (so your child blanks out on the real test).

That’s why Ontario families are switching to MindLC:
✅ Dedicated Human Learning Manager for weekly study plans & accountability
✅ 24/7 Socratic AI Math Coach for guided step-by-step homework hints (never gives away the answer!)

👉 [CTA BUTTON]: Book Your Free Ontario Math Diagnostic →`,
  },
  {
    id: "asset-seo-meta",
    campaign_id: "camp-ontario-fall",
    platform: "SEO Meta",
    title: "AI-SEO & Google AI Overviews Citation Block",
    detail_level_used: 3,
    skill_used: "ai-seo",
    updated_at: "1 hr ago",
    content: `🔍 [SEO META TAGS]
• Title Tag (57 chars): Ontario Grades 7–12 Math Help | Human Coach + Socratic AI
• Meta Description (155 chars): Boost Ontario Grades 7–12 math marks (EQAO, MCR3U, MHF4U). MindLC combines a Human Learning Manager for accountability with 24/7 Socratic AI guided hints.

🤖 [AEO / LLM EXTRACTABLE ANSWER BLOCK (49 words)]
## How does MindLC improve Ontario Grade 7–12 math grades?
MindLC combines a dedicated **Human Learning Manager** (who sets weekly goals and tracks Ontario curriculum mastery across MTH1W, MCR3U, MHF4U, and MCV4U) with a **24/7 Socratic AI tutor** that guides students through math problems using step-by-step hints rather than giving away final answers.`,
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "msg-welcome",
    sender: "ai",
    timestamp: "Just now",
    skillName: "copywriting",
    detailLevel: 3,
    linkedAssetId: "asset-hero-lp",
    linkedPlatform: "Landing Page",
    strategicJustification: {
      detailLevel: 3,
      levelLabel: "Level 3: Deep Mentorship (The Why & How)",
      headlineSummary:
        "Welcome to the MindLC Campaign Co-Pilot. Your initial Landing Page, Facebook Ad, and AI-SEO assets are loaded on the Left Canvas.",
      rationaleBody:
        "1. **Dual-Pane Architecture:** Whenever you command me below, I strictly enforce the **Mandatory Output Protocol**: pure marketing copy is injected straight into the **Left Asset Canvas**, while my strategic rationale and mentorship stay here in the **Right Chat Feed**.\n2. **Try It Now:** Select a Marketing Skill from the dropdown below, choose Detail Level 1, 2, or 3, and ask me to generate or refine an asset for Ontario Grades 7–12 Math.",
      frameworksApplied: [
        "Mandatory Output Protocol",
        "JTBD Four Forces",
        "PAS Copywriting",
      ],
      mentorshipTakeaway:
        "Tip: Switch between Detail Level 1 (Executive Summary), Level 2 (Standard Rationale), and Level 3 (Deep Mentorship) to control how much marketing theory I teach you on each turn.",
    },
  },
];

export const useMarketingStore = create<MarketingState>((set, get) => ({
  activeTab: "copilot",
  currentUser: {
    id: "usr-admin-01",
    email: "founder@mindlc.ca",
    role: "Admin",
  },
  skills: INITIAL_SKILLS,
  campaigns: INITIAL_CAMPAIGNS,
  assets: INITIAL_ASSETS,
  activeCampaignId: "camp-ontario-fall",
  selectedSkillId: "skill-copywriting",
  detailLevel: 3,
  preferredPlatform: "Landing Page",
  chatMessages: INITIAL_CHAT,
  isGenerating: false,
  lastHighlightedAssetId: "asset-hero-lp",
  brandPersona: {
    companyName: "MindLC",
    targetAudience:
      "Ontario parents of students in Grades 7–12 (de-streamed Grade 9 MTH1W, Grade 10 MPM2D, Grade 11 Functions MCR3U, Grade 12 Advanced Functions MHF4U & Calculus MCV4U).",
    coreHook:
      "Target: Ontario parents, Grades 7-12. Core hook: We use Human Learning Managers for accountability and Socratic AI for 24/7 guided math hints.",
    curriculumFocus:
      "Ontario Ministry of Education Math Curriculum (Grades 7–8 Foundations, Grade 9 EQAO MTH1W, Grade 11 MCR3U, Grade 12 MHF4U & MCV4U).",
    brandVoice:
      "Empathetic to parent homework stress, academically rigorous, encouraging, clear, anti-shortcut (Socratic mastery over answer-copying).",
    antiPersonaObjections:
      "1. 'Won't my teen just use AI to cheat?' → No, Socratic AI is hard-coded never to give final answers, only guided hints. 2. 'My teen won't log in on their own.' → That's why every student has a dedicated Human Learning Manager for weekly accountability.",
    geminiModel: "gemini-2.5-pro (Mandatory Output Protocol v1.0)",
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setDetailLevel: (level) => set({ detailLevel: level }),
  setPreferredPlatform: (platform) => set({ preferredPlatform: platform }),

  sendCopilotCommand: async (userCommand: string) => {
    const state = get();
    const skill =
      state.skills.find((s) => s.id === state.selectedSkillId) ||
      state.skills[0];
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      timestamp: nowTime,
      skillName: skill.skill_name,
      detailLevel: state.detailLevel,
      userPrompt: userCommand,
    };

    set({
      chatMessages: [...state.chatMessages, userMsg],
      isGenerating: true,
    });

    // Call the Mocked Google Gemini API Service (Mandatory Output Protocol)
    const response = await generateMarketingResponse({
      userCommand,
      selectedSkill: skill,
      detailLevel: state.detailLevel,
      brandPersona: state.brandPersona,
      preferredPlatform: state.preferredPlatform,
    });

    // 1. Route `marketingContent` strictly to the Left Pane (Asset Canvas)
    const newAssetId = `asset-${Date.now()}`;
    const newAsset: Asset = {
      id: newAssetId,
      campaign_id: state.activeCampaignId,
      platform: response.targetPlatform,
      title: response.assetTitle,
      content: response.marketingContent,
      detail_level_used: state.detailLevel,
      skill_used: skill.skill_name,
      updated_at: "Just now",
    };

    if (isSupabaseConfigured && supabase) {
      supabase
        .from("assets")
        .insert({
          campaign_id: newAsset.campaign_id,
          platform: newAsset.platform,
          content: newAsset.content,
          detail_level_used: newAsset.detail_level_used,
        })
        .then(() => {});
    }

    // 2. Route `strategicJustification` strictly to the Right Pane (Chat Feed)
    const aiMsg: ChatMessage = {
      id: `msg-ai-${Date.now() + 1}`,
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      skillName: skill.skill_name,
      detailLevel: state.detailLevel,
      strategicJustification: response.strategicJustification,
      linkedAssetId: newAssetId,
      linkedPlatform: response.targetPlatform,
    };

    set((prev) => ({
      assets: [newAsset, ...prev.assets],
      chatMessages: [...prev.chatMessages, aiMsg],
      isGenerating: false,
      lastHighlightedAssetId: newAssetId,
    }));
  },

  updateAssetContent: (assetId, newContent, newTitle) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              content: newContent,
              title: newTitle !== undefined ? newTitle : a.title,
              updated_at: "Edited just now",
            }
          : a
      ),
    })),

  deleteAsset: (assetId) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== assetId),
    })),

  createManualAsset: (platform, title, content) =>
    set((state) => {
      const id = `asset-${Date.now()}`;
      const created: Asset = {
        id,
        campaign_id: state.activeCampaignId,
        platform,
        title: title || `${platform} Draft`,
        content,
        detail_level_used: state.detailLevel,
        skill_used: "manual",
        updated_at: "Just now",
      };
      return {
        assets: [created, ...state.assets],
        lastHighlightedAssetId: id,
      };
    }),

  createCampaign: (title) =>
    set((state) => {
      const newCamp: Campaign = {
        id: `camp-${Date.now()}`,
        title,
        status: "Draft",
        created_at: new Date().toISOString(),
      };
      return {
        campaigns: [newCamp, ...state.campaigns],
        activeCampaignId: newCamp.id,
      };
    }),

  toggleCampaignStatus: (campaignId) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: (c.status === "Draft" ? "Approved" : "Draft") as CampaignStatus,
            }
          : c
      ),
    })),

  createSkill: (skill_name, system_prompt, category = "Custom Framework") =>
    set((state) => {
      const created: MarketingSkill = {
        id: `skill-${Date.now()}`,
        skill_name: skill_name.trim().toLowerCase().replace(/\s+/g, "-"),
        system_prompt: system_prompt.trim(),
        category,
        created_at: new Date().toISOString(),
      };
      return {
        skills: [...state.skills, created],
        selectedSkillId: created.id,
      };
    }),

  updateSkill: (id, skill_name, system_prompt, category) =>
    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === id
          ? {
              ...s,
              skill_name: skill_name.trim(),
              system_prompt: system_prompt.trim(),
              category: category || s.category,
            }
          : s
      ),
    })),

  deleteSkill: (id) =>
    set((state) => {
      const remaining = state.skills.filter((s) => s.id !== id);
      return {
        skills: remaining,
        selectedSkillId:
          state.selectedSkillId === id && remaining.length > 0
            ? remaining[0].id
            : state.selectedSkillId,
      };
    }),

  updateBrandPersona: (partial) =>
    set((state) => ({
      brandPersona: { ...state.brandPersona, ...partial },
    })),
}));
