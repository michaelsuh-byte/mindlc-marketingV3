import { create } from "zustand";
import {
  Asset,
  AssetPlatform,
  BrandPersona,
  Campaign,
  CampaignStatus,
  ChatMessage,
  CMOApprovalChecklist,
  CompetitorProfile,
  DetailLevel,
  EditableStageGoal,
  HITLProposalState,
  MarketingAgent,
  MarketingSkill,
  OntarioTrendSignal,
  PlanHorizon,
  PlannedActivity,
  PlanQaExchange,
  RealityGateStatus,
  StageId,
  TierId,
  TierWorkspaceState,
  UserRecord,
  VerbatimParentQuote,
  VoCTierTag,
  WeeklyFunnelMetrics,
  WeeklyRealityLog,
} from "@/types/database";
import {
  checkTierAndStageGuardrail,
  computeFunnelRates,
  DEFAULT_TIER_STAGE_GOALS,
  evaluateCmoPlanQuestionAndAdjust,
  executeAutonomousAgentTask,
  generateMarketingResponse,
  getRecommendedStageForTier,
} from "@/services/marketingAi";

export type NavigationTab =
  | "copilot"
  | "planner"
  | "intel"
  | "skills"
  | "settings"
  | "dashboard";

interface MarketingState {
  activeTab: NavigationTab;
  currentUser: UserRecord;
  skills: MarketingSkill[];
  campaigns: Campaign[];

  // =========================================================================
  // 3-TIER × 3-STAGE INDEPENDENT WORKSPACE ARCHITECTURE
  // =========================================================================
  activeTierId: TierId;
  tierWorkspaces: Record<TierId, TierWorkspaceState>;
  vocVault: VerbatimParentQuote[]; // Shared VoC Vault tagged with TIER_1 | TIER_2 | TIER_3 | ALL

  // Active Tier Synchronized Mirrors (for clean component access)
  assets: Asset[];
  selectedProposalId: string;
  paidStudentCount: number;
  activeBottleneckStage: StageId;
  realityGateStatus: RealityGateStatus;
  weeklyRealityLogs: WeeklyRealityLog[];

  activeCampaignId: string;
  selectedSkillId: string;
  detailLevel: DetailLevel;
  preferredPlatform: AssetPlatform;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  lastHighlightedAssetId: string | null;
  brandPersona: BrandPersona;

  // Modals & Drawers
  isRealityGateModalOpen: boolean;
  isVocVaultOpen: boolean;
  isStageGoalEditorOpen: boolean;
  isSampleSeedActive: boolean;
  diagnosticToast: string | null;
  pendingScopeDriftCommand: string | null;
  activeRevisionAssetId: string | null;

  // Market, Competitor & Ontario Education Trend State
  ontarioTrends: OntarioTrendSignal[];
  competitors: CompetitorProfile[];

  // Multi-Horizon CMO Planner & Self-Guided Agent Team State
  activeHorizon: PlanHorizon;
  agents: MarketingAgent[];
  plannedActivities: PlannedActivity[];
  planQaHistory: PlanQaExchange[];
  runningActivityId: string | null;
  isRunningTeamSprint: boolean;
  isAskingPlannerQa: boolean;

  // Tier & Stage Switching / Editing Actions
  setActiveTierId: (tierId: TierId) => void;
  setPaidStudentCount: (count: number) => void;
  setActiveStageOverride: (stageId: StageId) => void;
  updateTierStageGoal: (
    tierId: TierId,
    stageId: StageId,
    partialGoal: Partial<EditableStageGoal>
  ) => void;
  setStageGoalEditorOpen: (open: boolean) => void;

  // Navigation & Selection Actions
  setActiveTab: (tab: NavigationTab) => void;
  setSelectedProposalId: (id: string) => void;
  setActiveCampaignId: (id: string) => void;
  setSelectedSkillId: (id: string) => void;
  setDetailLevel: (level: DetailLevel) => void;
  setPreferredPlatform: (platform: AssetPlatform) => void;
  setActiveHorizon: (horizon: PlanHorizon) => void;
  setActiveRevisionAssetId: (assetId: string | null) => void;
  setVocVaultOpen: (open: boolean) => void;
  clearDiagnosticToast: () => void;

  // Safeguard 1 Actions (Weekly Reality Gate — Per-Tier or Multi-Tier Update)
  setRealityGateModalOpen: (open: boolean) => void;
  toggleRealityGateLockSimulation: () => void;
  submitWeeklyRealityLog: (payload: {
    week_start_date: string;
    funnel_metrics: WeeklyFunnelMetrics;
    verbatim_parent_quotes: {
      quote_text: string;
      context_tag: VerbatimParentQuote["context_tag"];
      tier_id?: VoCTierTag;
    }[];
    top_winning_touchpoint: string;
    alsoUnlockTiers?: TierId[];
  }) => void;
  activatePilotWeek0Override: () => void;

  // Level 3 Micro Cockpit: Conversational Refinement & New Proposal Generation
  sendCopilotCommand: (
    userCommand: string,
    explicitStageOverride?: boolean,
    forceNewProposal?: boolean
  ) => Promise<void>;

  // Level 3 Sticky 30-Second CMO Approval Dock Actions
  toggleCmoChecklistItem: (
    proposalId: string,
    field: keyof CMOApprovalChecklist
  ) => void;
  approveAndLockProposal: (proposalId: string) => void;
  rejectOrKillProposal: (
    proposalId: string,
    reason: string,
    targetState?: "KILLED_BY_STOP_LOSS" | "ARCHIVED"
  ) => void;
  toggleProposalVerification: (
    assetId: string,
    field: "devils_advocate_verified" | "kill_criteria_acknowledged"
  ) => void;
  transitionProposalHitlState: (
    assetId: string,
    nextState: HITLProposalState
  ) => void;

  // Market & Competitor Intel Actions
  addScannedCompetitor: (comp: CompetitorProfile) => void;
  spawnCounterActivityFromCompetitor: (compId: string) => Promise<void>;
  spawnActivityFromTrend: (trendId: string) => Promise<void>;

  // Multi-Horizon Planner & Self-Guided Agent Team Actions
  dispatchAgentForActivity: (activityId: string) => Promise<void>;
  runAutonomousTeamSprint: (horizon: PlanHorizon) => Promise<void>;
  askCmoPlannerQuestion: (question: string) => Promise<void>;
  reassignActivityAgent: (activityId: string, newAgentId: string) => void;

  // Asset & Campaign Actions
  updateAssetContent: (
    assetId: string,
    newContent: string,
    newTitle?: string
  ) => void;
  deleteAsset: (assetId: string) => void;
  createManualAsset: (
    platform: AssetPlatform,
    title: string,
    content: string
  ) => void;
  createCampaign: (title: string) => void;
  toggleCampaignStatus: (campaignId: string) => void;

  // Skill Library CRUD Actions
  createSkill: (
    skill_name: string,
    system_prompt: string,
    category?: string
  ) => void;
  updateSkill: (
    id: string,
    skill_name: string,
    system_prompt: string,
    category?: string
  ) => void;
  deleteSkill: (id: string) => void;

  // AI Settings & Persona Actions
  updateBrandPersona: (partial: Partial<BrandPersona>) => void;
}

// ============================================================================
// SHARED VOC VAULT SEED (Tagged with TIER_1, TIER_2, TIER_3, or ALL)
// ============================================================================

const INITIAL_VOC_VAULT: VerbatimParentQuote[] = [
  {
    id: "VOC-101",
    tier_id: "ALL",
    context_tag: "ai_cheating",
    week_start_date: "2026-11-16",
    is_sample: true,
    quote_text:
      "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test because he blanks out on closed-book problems.",
  },
  {
    id: "VOC-102",
    tier_id: "TIER_2",
    context_tag: "curriculum",
    week_start_date: "2026-11-16",
    is_sample: true,
    quote_text:
      "Her teacher marks Ontario Growing Success (K/T/C/A) Thinking and Application questions strictly—generic tutoring worksheets don't match Grade 11 SBI3U Biology or MCR3U Functions tests.",
  },
  {
    id: "VOC-103",
    tier_id: "TIER_2",
    context_tag: "price",
    week_start_date: "2026-11-16",
    is_sample: true,
    quote_text:
      "We already burned $380/month at Mathnasium—how do I know $139/month won't just be another subscription he ignores after week two?",
  },
  {
    id: "VOC-104",
    tier_id: "ALL",
    context_tag: "trust",
    week_start_date: "2026-11-16",
    is_sample: true,
    quote_text:
      "I don't trust services that promise a guaranteed 90% report card mark—I just want a calm system that holds my teen accountable three nights a week.",
  },
  {
    id: "VOC-105",
    tier_id: "TIER_1",
    context_tag: "student_motivation",
    week_start_date: "2026-11-16",
    is_sample: true,
    quote_text:
      "He actually liked the voice + LaTeX math board during the free diagnostic because he didn't have to type out complex fractions—if it's under $45/month self-serve, I'll let him use it for MCR3U.",
  },
  {
    id: "VOC-106",
    tier_id: "TIER_3",
    context_tag: "curriculum",
    week_start_date: "2026-11-16",
    is_sample: true,
    quote_text:
      "For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI.",
  },
];

// ============================================================================
// TIER 1 PROPOSALS SEED (Online Self-Coach — $39 CAD/mo Self-Serve)
// ============================================================================
const TIER_1_PROPOSALS: Asset[] = [
  {
    id: "t1-prop-onboarding",
    tier_id: "TIER_1",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Onboarding & Checkout UX",
    channel_badge: "Self-Serve UX",
    title:
      "Self-Serve Diagnostic-to-Checkout Bridge & Day-7 Socratic Voice + LaTeX HUD Onboarding",
    detail_level_used: 2,
    skill_used: "cro",
    agent_author: "Agent-04 · CRO",
    updated_at: "12 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `## [Tier 1 · Online Self-Coach ($39 CAD/mo) — Post-Diagnostic Checkout Screen]
**100% Automated 24/7 Socratic Voice + Live LaTeX STEM HUD (Zero human scheduling required)**

### 1. Instant Post-Diagnostic Result Card (Shown Immediately on Screen)
> *"You completed 4 of 5 steps in MCR3U Quadratic Transformations, but paused when setting up the domain constraint without an answer key. As Ontario parents tell us: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his unit test.'"*

### 2. Why Students Stick With MindLC Self-Coach (Target: Day-7 Return ≥ 50%)
- **Talk Naturally, See Live LaTeX Math Steps:** No typing messy equations—speak out loud while the Socratic voice tutor plots and highlights each algebraic step on your LaTeX HUD.
- **Automated Night-Before-Quiz Missions:** Enter your next Ontario unit test date (` + "`MPM2D`, `MCR3U`, `MHF4U`, `SBI3U`" + `) and get a 15-minute guided Socratic warmup automatically.`,
        single_cta:
          "Unlock Instant 24/7 Socratic Voice + LaTeX HUD Access ($39 CAD/mo Self-Serve — Cancel Anytime in 1 Click)",
        change_summary: "v1 Self-serve diagnostic-to-paid checkout bridge",
        timestamp: "12 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T1-S1-101",
      tier_id: "TIER_1",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "Self-Serve Diagnostic-to-Checkout Bridge & Day-7 Socratic Voice + LaTeX HUD Onboarding",
      channel: "Self-Serve Diagnostic Checkout + Automated Day-7 SMS",
      target_metric: "Diag-to-Paid ≥ 12% & Day-7 Return ≥ 50% (Current: 10.0%)",
      cited_voc_quotes: [
        '[VOC-101 · ALL · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test."',
        '[VOC-105 · TIER_1 · student_motivation] "He actually liked the voice + LaTeX math board during the free diagnostic because he didn\'t have to type out complex fractions—if it\'s under $45/month self-serve, I\'ll let him use it for MCR3U."',
      ],
      single_cta:
        "Unlock Instant 24/7 Socratic Voice + LaTeX HUD Access ($39 CAD/mo Self-Serve — Cancel Anytime in 1 Click)",
      asset_body: `## [Tier 1 · Online Self-Coach ($39 CAD/mo) — Post-Diagnostic Checkout Screen]
**100% Automated 24/7 Socratic Voice + Live LaTeX STEM HUD (Zero human scheduling required)**

### 1. Instant Post-Diagnostic Result Card (Shown Immediately on Screen)
> *"You completed 4 of 5 steps in MCR3U Quadratic Transformations, but paused when setting up the domain constraint without an answer key. As Ontario parents tell us: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his unit test.'"*

### 2. Why Students Stick With MindLC Self-Coach (Target: Day-7 Return ≥ 50%)
- **Talk Naturally, See Live LaTeX Math Steps:** No typing messy equations—speak out loud while the Socratic voice tutor plots and highlights each algebraic step on your LaTeX HUD.
- **Automated Night-Before-Quiz Missions:** Enter your next Ontario unit test date (MPM2D, MCR3U, MHF4U, SBI3U) and get a 15-minute guided Socratic warmup automatically.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Self-serve students drop off before checkout if they are forced to verify an email before seeing their LaTeX HUD diagnostic breakdown.",
        blind_spot_question:
          "Is the Apple Pay / Google Pay 1-click checkout embedded directly underneath the interactive LaTeX HUD diagnostic summary?",
      },
      kill_criteria: {
        sample_threshold: "100 completed free self-serve diagnostics",
        stop_loss_metric: "< 12% Diagnostic-to-Paid self-serve conversion OR < 50% Day-7 student return",
        pivot_action:
          "Introduce a '$1 CAD 7-Day Unit-Test Pass' on the diagnostic completion screen that auto-converts to $39 CAD/mo on Day 8.",
      },
      revision_notes:
        "v1 Scoped strictly to Tier 1 Self-Serve (zero human manager or 1:1 tutor promises).",
    },
    content: `## [Tier 1 · Online Self-Coach ($39 CAD/mo) — Post-Diagnostic Checkout Screen]
**100% Automated 24/7 Socratic Voice + Live LaTeX STEM HUD (Zero human scheduling required)**

### 1. Instant Post-Diagnostic Result Card (Shown Immediately on Screen)
> *"You completed 4 of 5 steps in MCR3U Quadratic Transformations, but paused when setting up the domain constraint without an answer key. As Ontario parents tell us: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his unit test.'"*

### 2. Why Students Stick With MindLC Self-Coach (Target: Day-7 Return ≥ 50%)
- **Talk Naturally, See Live LaTeX Math Steps:** No typing messy equations—speak out loud while the Socratic voice tutor plots and highlights each algebraic step on your LaTeX HUD.
- **Automated Night-Before-Quiz Missions:** Enter your next Ontario unit test date (MPM2D, MCR3U, MHF4U, SBI3U) and get a 15-minute guided Socratic warmup automatically.`,
  },
  {
    id: "t1-prop-killed",
    tier_id: "TIER_1",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Onboarding & Checkout UX",
    channel_badge: "Self-Serve UX",
    title:
      "Hard Paywall Before LaTeX HUD Diagnostic Result (Breached <12% Checkout Stop-Loss)",
    detail_level_used: 1,
    skill_used: "cro",
    updated_at: "Stop-Loss Breached",
    hitl_state: "KILLED_BY_STOP_LOSS",
    is_sample: true,
    kill_or_reject_reason:
      "Stop-Loss Breached (6.4% Diag->Paid vs >=12% target): Hiding the LaTeX HUD diagnostic score behind a credit card wall caused 88% immediate exit.",
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `Enter your credit card ($39 CAD/mo) to unlock and view your child's free diagnostic score!`,
        single_cta: "Enter Credit Card to View Score",
        change_summary: "v1 Hard paywall before showing diagnostic value",
        timestamp: "5 days ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T1-S1-089",
      tier_id: "TIER_1",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "Hard Paywall Before LaTeX HUD Diagnostic Result (Breached <12% Checkout Stop-Loss)",
      channel: "Self-Serve Checkout Gate",
      target_metric: "Diag → Paid ≥ 12% (Actual: 6.4% — BREACHED)",
      cited_voc_quotes: [
        '[VOC-104 · ALL · trust] "I don\'t trust services that promise a guaranteed 90% report card mark—I just want a calm system that holds my teen accountable three nights a week."',
      ],
      single_cta: "Enter Credit Card to View Score",
      asset_body: `Enter your credit card ($39 CAD/mo) to unlock and view your child's free diagnostic score!`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Bait-and-switch paywalls on a 'Free Diagnostic' destroy parent trust instantly.",
        blind_spot_question:
          "Do parents get genuine diagnostic value before being asked for payment?",
      },
      kill_criteria: {
        sample_threshold: "100 completed diagnostics",
        stop_loss_metric: "< 12% Diagnostic-to-Paid conversion",
        pivot_action:
          "Show full K/T/C/A LaTeX HUD diagnostic trace for free; gate ongoing 24/7 Socratic voice practice.",
      },
      revision_notes: "Breached stop-loss at 6.4% conversion; replaced by PROP-T1-S1-101.",
    },
    content: `Enter your credit card ($39 CAD/mo) to unlock and view your child's free diagnostic score!`,
  },
];

// ============================================================================
// TIER 2 PROPOSALS SEED (Managed Hybrid — $139 CAD/mo AI + Human Learning Manager)
// ============================================================================
const V1_DEBRIEF_CONTENT = `## 1. Cognitive Diagnostic Report Header (Minutes 0–2)
**Ontario STEM Focus:** Grade 11/12 MHF4U (Advanced Functions) · MCR3U · SBI3U (Biology)
**Diagnostic Gap Identified:** Procedural Recall is **80%**, but **Multi-Step Problem Decomposition is 44%**.

## 2. 10-Minute Parent Debrief Call Script
### Minutes 0–3: Show the Homework-to-Test Gap
> *"Look at Question 4 on {{student_first_name}}'s diagnostic. When our Socratic AI withheld the final answer, he stalled at step 2. That's why ChatGPT homework shortcuts hurt unit test marks."*

### Minutes 3–10: Pitch Tier 2 Managed Hybrid ($139 CAD/month)
> *"Our Tier 2 Managed Hybrid Plan ($139 CAD/month) pairs 24/7 Socratic AI hints with a weekly Human Learning Manager. Sign up today for guaranteed grade improvements!"*`;

const V2_DEBRIEF_CONTENT = `## 1. Growing Success (K/T/C/A) Cognitive Report Header (Minutes 0–2)
**Ontario STEM Courses Audited:** Grade 11/12 MHF4U (Advanced Functions) · MCR3U (Functions) · SBI3U (Biology)
**Ontario Growing Success (K/T/C/A) Achievement Chart Breakdown:**
- **Knowledge & Understanding (K/U — 35% weight):** **82%** (Formulas recalled accurately on take-home work)
- **Thinking, Investigation & Application (T/I & A — 50% weight):** **44%** (Stalls on unassisted multi-step closed-book unit test problems)

---

## 2. 10-Minute Parent Debrief Call Script (Calm Ontario Educator Advisory Tone)
### Minutes 0–3: Mirror Exact Parent VoC & Screen-Share Timestamped Socratic Stall
> *"Look at Question 4 on {{student_first_name}}'s Cognitive Report. You mentioned earlier: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U unit test.' Right here at the 110-second mark, when our Socratic AI withheld the final solution and asked him to set up the domain constraint himself, he froze. That K/T/C/A Thinking & Application gap explains the exact 25-point drop on closed-book school unit tests."*

### Minutes 3–7: Present Tier 2 Managed Hybrid Plan ($139 CAD/month) vs. $380/mo Centres
> *"At $80/hr, a private tutor ($320+/mo) is only there 1 hour a week—not at 9:45 PM on Tuesday before Wednesday's MHF4U test. Our **Tier 2 Managed Hybrid Plan ($139 CAD/month — $4.63/day)** pairs:*
> 1. **24/7 AI Socratic Coach:** Aligned to Ontario Growing Success (K/T/C/A) rubrics. Never gives the final answer—prompts your teen with step-by-step guiding questions.
> 2. **Dedicated Human Learning Manager + Monthly 15-Min Parent Briefings:** Reviews {{student_first_name}}'s Socratic logs every week, assigns targeted Ontario unit-test prep, and sends you a Friday parent accountability summary."*

### Minutes 7–10: 30-Day Active-Habit Guarantee (Zero Exaggerated Grade Hype)
> *"You also asked: 'How do I know $139/month won't just be another subscription he ignores after week two?' We never make fake grade-percentage promises. Instead, under our **30-Day Active-Habit Guarantee**, if your Human Learning Manager doesn't get {{student_first_name}} completing 3+ Socratic problem-solving sessions a week in Month 1, you get a 100% tuition refund with one email."*`;

const TIER_2_PROPOSALS: Asset[] = [
  {
    id: "asset-stage1-debrief",
    tier_id: "TIER_2",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Parent Call",
    channel_badge: "Parent Call",
    title:
      "10-Min Parent Debrief Script & Growing Success (K/T/C/A) Cognitive Report Close ($139 CAD/mo)",
    detail_level_used: 3,
    skill_used: "cro",
    agent_author: "Agent-04 · Stage-1 CRO",
    updated_at: "8 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false,
    },
    devils_advocate_verified: true,
    kill_criteria_acknowledged: true,
    revision_count: 2,
    versions: [
      {
        version: 1,
        content: V1_DEBRIEF_CONTENT,
        single_cta: "Sign up today for guaranteed grade improvements!",
        change_summary:
          "v1 Initial draft before Ontario K/T/C/A breakdown and brand trust cleanup",
        timestamp: "35 mins ago",
      },
      {
        version: 2,
        content: V2_DEBRIEF_CONTENT,
        single_cta:
          "Activate Your Teen's 30-Day Risk-Free Tier 2 Managed Hybrid Seat ($139 CAD/mo) on the Call to Lock Tomorrow's Human Learning Manager Onboarding",
        change_summary:
          "Updated v2: Removed grade guarantee, added Ontario Growing Success K/T/C/A breakdown, and anchored single CTA to 30-day active-habit seat",
        timestamp: "8 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T2-S1-1042",
      tier_id: "TIER_2",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "10-Min Parent Debrief Script & Growing Success (K/T/C/A) Cognitive Report Close ($139 CAD/mo)",
      channel: "Parent Call (10-Min Zoom Diagnostic Debrief)",
      target_metric: "Diag → Paid ≥ 25% (Current: 14.3%)",
      cited_voc_quotes: [
        '[VOC-101 · ALL · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test because he blanks out on closed-book problems."',
        '[VOC-102 · TIER_2 · curriculum] "Her teacher marks Ontario Growing Success (K/T/C/A) Thinking and Application questions strictly—generic tutoring worksheets don\'t match Grade 11 SBI3U Biology or MCR3U Functions tests."',
        '[VOC-103 · TIER_2 · price] "We already burned $380/month at Mathnasium—how do I know $139/month won\'t just be another subscription he ignores after week two?"',
      ],
      single_cta:
        "Activate Your Teen's 30-Day Risk-Free Tier 2 Managed Hybrid Seat ($139 CAD/mo) on the Call to Lock Tomorrow's Human Learning Manager Onboarding",
      asset_body: V2_DEBRIEF_CONTENT,
      devils_advocate: {
        primary_failure_hypothesis:
          "Ontario parents will stall ('Let me discuss with my spouse tonight') if the 10-minute debrief feels like a generic EdTech sales pitch rather than a calm clinical walkthrough of their child's exact Socratic reasoning stall on an Ontario K/T/C/A Thinking problem.",
        blind_spot_question:
          "Are we screen-sharing the student's actual timestamped wrong step from the diagnostic within the first 90 seconds of the parent call—before mentioning the $139 CAD/month price?",
      },
      kill_criteria: {
        sample_threshold: "12 consecutive 10-minute parent diagnostic debrief calls",
        stop_loss_metric:
          "< 25% paid conversion into the $139 CAD/mo Tier 2 Managed Hybrid Plan within 48 hours of debrief",
        pivot_action:
          "Immediately switch call close offer from '$139 CAD/mo ongoing plan' to a '$19 CAD 14-Day Unit-Test Rescue Sprint' that auto-converts to $139 CAD/mo on Day 15 unless cancelled.",
      },
      revision_notes:
        "Updated v2: Removed grade guarantee, added Ontario K/T/C/A breakdown, and anchored single CTA to 30-day active-habit seat.",
    },
    content: V2_DEBRIEF_CONTENT,
  },
  {
    id: "asset-killed-stoploss",
    tier_id: "TIER_2",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Community",
    channel_badge: "Community",
    title:
      "Generic '24/7 AI Math Bot' Cold Parent Message (Breached <15% Diag-to-Paid Stop-Loss)",
    detail_level_used: 2,
    skill_used: "social-content",
    agent_author: "Agent-03 · Paid Social",
    updated_at: "Stop-Loss Triggered",
    hitl_state: "KILLED_BY_STOP_LOSS",
    is_sample: true,
    kill_or_reject_reason:
      "Stop-Loss Breached after 14 debriefs (14.3% Diag->Paid vs >=25% target): Pitching '24/7 AI' first triggered parent cheating fears (VOC-101) before Human Learning Manager accountability was explained.",
    cmo_checklist: {
      ontario_context: false,
      single_cta: true,
      brand_trust: true,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `Struggling with Ontario high school math? Try MindLC's 24/7 AI Math Tutor for $139/month! Instant help on any math homework problem whenever your teen needs it.`,
        single_cta: "Start Your $139/mo AI Math Subscription Today",
        change_summary: "v1 Lead with AI speed (Triggered VOC-101 anti-cheating objection)",
        timestamp: "4 days ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T2-S1-0988",
      tier_id: "TIER_2",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "Generic '24/7 AI Math Bot' Cold Parent Message (Breached <15% Diag-to-Paid Stop-Loss)",
      channel: "Community (Parent Direct Message)",
      target_metric: "Diag → Paid ≥ 25% (Actual: 14.3% — BREACHED)",
      cited_voc_quotes: [
        '[VOC-101 · ALL · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test."',
      ],
      single_cta: "Start Your $139/mo AI Math Subscription Today",
      asset_body: `Struggling with Ontario high school math? Try MindLC's 24/7 AI Math Tutor for $139/month! Instant help on any math homework problem whenever your teen needs it.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Leading with '24/7 AI Math Tutor' without mentioning Socratic hint guardrails or the Human Learning Manager makes Ontario parents immediately assume it is another ChatGPT cheating shortcut.",
        blind_spot_question:
          "Does the very first sentence distinguish Socratic guided hints + Human accountability from answer-giving bots?",
      },
      kill_criteria: {
        sample_threshold: "50 parent messages OR 14 completed diagnostics",
        stop_loss_metric: "< 15% Diagnostic-to-Paid conversion (Breached at 14.3%)",
        pivot_action:
          "MANDATORY PIVOT: Lead with 'Human Learning Manager Accountability + Anti-Cheating Socratic K/T/C/A Diagnostic' (See PROP-T2-S1-1042).",
      },
      revision_notes:
        "BREACHED STOP-LOSS: Flagged automatically by Weekly Reality Gate when Diag->Paid hit 14.3% (2/14).",
    },
    content: `Struggling with Ontario high school math? Try MindLC's 24/7 AI Math Tutor for $139/month! Instant help on any math homework problem whenever your teen needs it.`,
  },
  {
    id: "asset-approved-live",
    tier_id: "TIER_2",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Parent Call",
    channel_badge: "Parent Call",
    title:
      "Pre-Debrief SMS Reminder: 60-Sec Socratic Hint vs. ChatGPT Answer Comparison",
    detail_level_used: 2,
    skill_used: "cro",
    agent_author: "Agent-04 · Stage-1 CRO",
    updated_at: "Live · Target Met (78% Show-Up)",
    hitl_state: "APPROVED_FOR_EXECUTION",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: true,
    },
    devils_advocate_verified: true,
    kill_criteria_acknowledged: true,
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.

On our 10-minute call, I'll screen-share the exact step where {{student_first_name}} paused on their multi-step Thinking/Application question—and show how our Socratic AI coaches them through it without handing over the answer like ChatGPT.

👉 Single Action: Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief: {{zoom_link}}`,
        single_cta:
          "Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief",
        change_summary: "v1 Approved & live SMS reminder",
        timestamp: "2 days ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T2-S1-1019",
      tier_id: "TIER_2",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "Pre-Debrief SMS Reminder: 60-Sec Socratic Hint vs. ChatGPT Answer Comparison",
      channel: "Parent Call (SMS Pre-Framing)",
      target_metric: "Diag Booked → Completed ≥ 75% (Current: 78% ✓)",
      cited_voc_quotes: [
        '[VOC-101 · ALL · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test."',
      ],
      single_cta:
        "Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief",
      asset_body: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.

On our 10-minute call, I'll screen-share the exact step where {{student_first_name}} paused on their multi-step Thinking/Application question—and show how our Socratic AI coaches them through it without handing over the answer like ChatGPT.

👉 Single Action: Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief: {{zoom_link}}`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Busy GTA parents skip Zoom debriefs if they think it is a 45-minute high-pressure sales call.",
        blind_spot_question:
          "Does the SMS explicitly promise a strict 10-minute clinical walkthrough of their child's K/T/C/A report?",
      },
      kill_criteria: {
        sample_threshold: "20 booked diagnostic parents",
        stop_loss_metric: "< 70% diagnostic debrief attendance rate",
        pivot_action:
          "Send a 90-second Loom video preview of the student's Cognitive Report via SMS 1 hour before the call.",
      },
      revision_notes: "Live and performing at 78% show-up rate (14/18).",
    },
    content: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.`,
  },
];

// ============================================================================
// TIER 3 PROPOSALS SEED (Prime 1:1 Online Tutor Hybrid — $349 CAD/mo)
// ============================================================================
const TIER_3_PROPOSALS: Asset[] = [
  {
    id: "t3-prop-consult",
    tier_id: "TIER_3",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "1:1 Consultation & Upgrade Script",
    channel_badge: "1:1 Consult",
    title:
      "Flag A Overload Tier 2 → Tier 3 Prime Upgrade Script & Grade 12 MHF4U/MCV4U/SBI4U Syllabus Roadmap",
    detail_level_used: 3,
    skill_used: "copywriting",
    agent_author: "Agent-05 · Lifecycle",
    updated_at: "15 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `## [Tier 3 · Prime 1:1 Online Tutor Hybrid ($349 CAD/mo) — Flag A Overload Consultation Script]
**Target Family:** Grade 11/12 university-prep parents targeting Waterloo Engineering/CEMC, U of T CS, McMaster Health Sci, or Ivey/Rotman Business.

### 1. The "Flag A Overload" Trigger (Why Tier 2 Families Upgrade to Tier 3 Prime)
> *"During {{student_first_name}}'s MHF4U/MCV4U Socratic AI sessions this week, our system triggered a **Flag A Cognitive Overload** on multi-step trigonometric proofs and optimization problems. As you shared with us: 'For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI.'"*

### 2. The Prime 1:1 Online Tutor Hybrid Architecture
1. **1–2 Weekly Live Online 1:1 Sessions with a Senior Ontario STEM Educator:** Surgical instruction calibrated to their exact school teacher's unit exam rubric and Waterloo CEMC extension problems.
2. **24/7 Socratic AI Guided Practice Between Sessions:** Ensures mastery sticks on Tuesday and Thursday nights between live sessions.
3. **Executive Parent Briefings & OUAC Top-6 Grade Protection:** Direct weekly reporting from your Learning Manager.`,
        single_cta:
          "Reserve 1 of 2 Remaining Prime 1:1 Educator + Socratic AI Hybrid Seats for This Semester's OUAC Grade Window",
        change_summary: "v1 Initial Tier 3 Prime consultative close script",
        timestamp: "15 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T3-S1-301",
      tier_id: "TIER_3",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "Flag A Overload Tier 2 → Tier 3 Prime Upgrade Script & Grade 12 MHF4U/MCV4U/SBI4U Syllabus Roadmap",
      channel: "1:1 Executive Parent Consultation (Tier 2 Upsell & Inbound)",
      target_metric: "Consultation → Prime Close ≥ 40% (Current: 37.5%)",
      cited_voc_quotes: [
        '[VOC-106 · TIER_3 · curriculum] "For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI."',
        '[VOC-104 · ALL · trust] "I don\'t trust services that promise a guaranteed 90% report card mark—I just want a calm system that holds my teen accountable three nights a week."',
      ],
      single_cta:
        "Reserve 1 of 2 Remaining Prime 1:1 Educator + Socratic AI Hybrid Seats for This Semester's OUAC Grade Window",
      asset_body: `## [Tier 3 · Prime 1:1 Online Tutor Hybrid ($349 CAD/mo) — Flag A Overload Consultation Script]
**Target Family:** Grade 11/12 university-prep parents targeting Waterloo Engineering/CEMC, U of T CS, McMaster Health Sci, or Ivey/Rotman Business.

### 1. The "Flag A Overload" Trigger (Why Tier 2 Families Upgrade to Tier 3 Prime)
> *"During {{student_first_name}}'s MHF4U/MCV4U Socratic AI sessions this week, our system triggered a **Flag A Cognitive Overload** on multi-step trigonometric proofs and optimization problems. As you shared with us: 'For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI.'"*

### 2. The Prime 1:1 Online Tutor Hybrid Architecture
1. **1–2 Weekly Live Online 1:1 Sessions with a Senior Ontario STEM Educator:** Surgical instruction calibrated to their exact school teacher's unit exam rubric and Waterloo CEMC extension problems.
2. **24/7 Socratic AI Guided Practice Between Sessions:** Ensures mastery sticks on Tuesday and Thursday nights between live sessions.
3. **Executive Parent Briefings & OUAC Top-6 Grade Protection:** Direct weekly reporting from your Learning Manager.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "High-expectation Grade 11/12 parents will hesitate at $349 CAD/mo if they do not see the exact credentials of the live 1:1 Ontario STEM educator and a custom week-by-week syllabus plan before the end of the consultation.",
        blind_spot_question:
          "Does the consultation include a 1-page custom 6-week MHF4U/MCV4U/SBI4U exam calendar mapped to their teen's upcoming school unit tests?",
      },
      kill_criteria: {
        sample_threshold: "8 completed 1:1 Prime parent consultations",
        stop_loss_metric: "< 40% Consultation-to-Prime enrollment close rate",
        pivot_action:
          "Offer Tier 2 Flag A families a '2-Session Live 1:1 Midterm Intensive Bridge ($95 CAD credit toward Prime)' so they experience the live educator before committing to the monthly Prime seat.",
      },
      revision_notes:
        "v1 Consultative close script for Tier 3 Prime — zero discount or mass-market framing.",
    },
    content: `## [Tier 3 · Prime 1:1 Online Tutor Hybrid ($349 CAD/mo) — Flag A Overload Consultation Script]
**Target Family:** Grade 11/12 university-prep parents targeting Waterloo Engineering/CEMC, U of T CS, McMaster Health Sci, or Ivey/Rotman Business.

### 1. The "Flag A Overload" Trigger (Why Tier 2 Families Upgrade to Tier 3 Prime)
> *"During {{student_first_name}}'s MHF4U/MCV4U Socratic AI sessions this week, our system triggered a **Flag A Cognitive Overload** on multi-step trigonometric proofs and optimization problems."*`,
  },
];

// ============================================================================
// INITIAL 3 TIER WORKSPACES (`TIER_1`, `TIER_2`, `TIER_3`)
// ============================================================================

const INITIAL_TIER_WORKSPACES: Record<TierId, TierWorkspaceState> = {
  TIER_1: {
    tier_id: "TIER_1",
    tier_name: "Tier 1 — Online Self-Coach (Self-Serve)",
    tier_short_name: "Tier 1 · Self-Coach",
    price_label: "$39 CAD/mo Self-Serve",
    monthly_price_cad: 39,
    offer_summary:
      "24/7 Socratic voice + LaTeX HUD AI coaching for Ontario Grades 9–12 STEM (fully automated, no human learning manager or live tutor).",
    target_persona:
      "Self-motivated Ontario Grades 9–12 STEM students & cost-conscious parents seeking 24/7 anti-cheating Socratic homework guidance under $45/mo.",
    tone_guardrail:
      "Never pitch 1-on-1 live human tutoring or dedicated human learning manager calls inside Tier 1 copy—emphasize instant 24/7 automated Socratic voice + LaTeX HUD self-reliance.",
    forbidden_cross_tier_claims: [
      "1-on-1 live human tutor sessions (Reserved for Tier 3)",
      "Dedicated Human Learning Manager phone calls (Reserved for Tier 2 & 3)",
    ],
    forbidden_cross_tier_keywords: [
      "1-on-1 live tutor",
      "live human tutor",
      "human learning manager call",
      "weekly live tutor",
      "1:1 educator",
    ],
    funnel_labels: [
      "Visitors/Leads",
      "Free Diag Started",
      "Diag Completed",
      "Self-Serve Paid",
    ],
    north_star_paid_goal: 300,
    current_paid_count: 32,
    active_stage: "STAGE_1",
    manual_stage_override: false,
    stage_goals: DEFAULT_TIER_STAGE_GOALS.TIER_1,
    reality_gate_status: "UNLOCKED",
    weekly_reality_logs: [
      {
        id: "wrl-t1-2026-11-16",
        tier_id: "TIER_1",
        week_start_date: "2026-11-16",
        created_at: "2026-11-16T09:00:00Z",
        is_sample: true,
        funnel_metrics: {
          reach_or_contacts: 420,
          diag_booked: 165,
          diag_completed: 110,
          paid_conversions: 11, // 10.0% Diag->Paid vs >=12% Stage 1 Target
        },
        top_winning_touchpoint:
          "Interactive LaTeX HUD + Socratic Voice demo on MCR3U quadratic word problems (no typing required)",
        verbatim_parent_quotes: INITIAL_VOC_VAULT.filter(
          (q) => q.tier_id === "TIER_1" || q.tier_id === "ALL"
        ),
      },
    ],
    proposals: TIER_1_PROPOSALS,
    selected_proposal_id: "t1-prop-onboarding",
  },

  TIER_2: {
    tier_id: "TIER_2",
    tier_name: "Tier 2 — Managed Hybrid (AI + Learning Manager)",
    tier_short_name: "Tier 2 · Managed Hybrid",
    price_label: "$139 CAD/mo Managed Hybrid",
    monthly_price_cad: 139,
    offer_summary:
      "24/7 AI Socratic coaching + Growing Success (K/T/C/A) parent reports + dedicated Human Learning Manager accountability & monthly 15-min parent briefings.",
    target_persona:
      "Busy Ontario parents of Grades 9–12 STEM students who need both 24/7 anti-cheating Socratic homework help AND a real human Learning Manager to hold their teen accountable.",
    tone_guardrail:
      "Emphasize the dual engine (24/7 Socratic AI + Human Learning Manager accountability & Growing Success K/T/C/A reports). Never promise 1–2x/week live 1:1 subject tutoring sessions (that is Tier 3 Prime).",
    forbidden_cross_tier_claims: [
      "1–2x/week live 1:1 subject tutoring sessions with an educator (Reserved for Tier 3 Prime)",
    ],
    forbidden_cross_tier_keywords: [
      "twice-weekly live 1:1 tutor",
      "1-on-1 live subject tutor",
    ],
    funnel_labels: [
      "Contacts/Leads",
      "Diag Booked",
      "Diag Completed",
      "Paid Subscriptions",
    ],
    north_star_paid_goal: 100,
    current_paid_count: 14,
    active_stage: "STAGE_1",
    manual_stage_override: false,
    stage_goals: DEFAULT_TIER_STAGE_GOALS.TIER_2,
    reality_gate_status: "UNLOCKED",
    weekly_reality_logs: [
      {
        id: "wrl-t2-2026-11-16",
        tier_id: "TIER_2",
        week_start_date: "2026-11-16",
        created_at: "2026-11-16T09:00:00Z",
        is_sample: true,
        funnel_metrics: {
          reach_or_contacts: 64,
          diag_booked: 18,
          diag_completed: 14,
          paid_conversions: 2, // 14.3% Diag->Paid vs >=25% Stage 1 Target
        },
        top_winning_touchpoint:
          "10-min Zoom parent debrief screen-sharing the student's timestamped Socratic stall on Question 4 (MHF4U)",
        verbatim_parent_quotes: INITIAL_VOC_VAULT.filter(
          (q) => q.tier_id === "TIER_2" || q.tier_id === "ALL"
        ),
      },
    ],
    proposals: TIER_2_PROPOSALS,
    selected_proposal_id: "asset-stage1-debrief",
  },

  TIER_3: {
    tier_id: "TIER_3",
    tier_name: "Tier 3 — Prime 1:1 Online Tutor Hybrid",
    tier_short_name: "Tier 3 · Prime 1:1",
    price_label: "$349 CAD/mo Prime 1:1",
    monthly_price_cad: 349,
    offer_summary:
      "1–2 weekly live online 1:1 tutoring sessions with an Ontario STEM educator + 24/7 AI Socratic practice between sessions + executive parent reporting.",
    target_persona:
      "High-expectation Ontario Grade 11–12 university-prep families (MHF4U, MCV4U, SBI4U, SCH4U, Waterloo CEMC / OUAC Engineering, CS, Medical & Business applicants) and Tier 2 Flag A overload upgrades.",
    tone_guardrail:
      "Executive, consultative, high-status academic positioning. Never use 'cheap self-serve' or discount promo-code framing that erodes premium educator positioning.",
    forbidden_cross_tier_claims: [
      "Cheap self-serve / budget discount framing",
      "Coupon codes or mass-market flash sales",
    ],
    forbidden_cross_tier_keywords: [
      "cheap self-serve",
      "budget app",
      "discount code",
      "coupon",
      "flash sale",
      "50% off",
    ],
    funnel_labels: [
      "Inquiries / Tier 2 Upsells",
      "Consultation Booked",
      "Consultation Completed",
      "Prime Enrolled",
    ],
    north_star_paid_goal: 30,
    current_paid_count: 3,
    active_stage: "STAGE_1",
    manual_stage_override: false,
    stage_goals: DEFAULT_TIER_STAGE_GOALS.TIER_3,
    reality_gate_status: "UNLOCKED",
    weekly_reality_logs: [
      {
        id: "wrl-t3-2026-11-16",
        tier_id: "TIER_3",
        week_start_date: "2026-11-16",
        created_at: "2026-11-16T09:00:00Z",
        is_sample: true,
        funnel_metrics: {
          reach_or_contacts: 18,
          diag_booked: 9,
          diag_completed: 8,
          paid_conversions: 3, // 37.5% Consult->Close vs >=40% Stage 1 Target
        },
        top_winning_touchpoint:
          "Tier 2 Flag A Cognitive Overload alert -> 1:1 Executive Consultation showing custom 6-week MHF4U/MCV4U OUAC roadmap",
        verbatim_parent_quotes: INITIAL_VOC_VAULT.filter(
          (q) => q.tier_id === "TIER_3" || q.tier_id === "ALL"
        ),
      },
    ],
    proposals: TIER_3_PROPOSALS,
    selected_proposal_id: "t3-prop-consult",
  },
};

const INITIAL_SKILLS: MarketingSkill[] = [
  {
    id: "skill-cro",
    skill_name: "cro",
    category: "Stage 1–3 Funnel Conversion CRO",
    system_prompt:
      "You are a Conversion Rate Optimization (CRO) Lead for MindLC across Tier 1 (Self-Coach), Tier 2 (Managed Hybrid), and Tier 3 (Prime 1:1). Enforce strict tier isolation and active stage bottleneck targets.",
  },
  {
    id: "skill-copywriting",
    skill_name: "copywriting",
    category: "Tier-Isolated Conversion Copy",
    system_prompt:
      "You are an elite EdTech conversion copywriter trained on PAS, JTBD Four Forces, and VoC mirroring. Write high-converting assets strictly scoped to the active MindLC product tier without cross-tier tone bleed.",
  },
  {
    id: "skill-copy-editing",
    skill_name: "copy-editing",
    category: "Seven-Sweeps VoC & K/T/C/A Polish",
    system_prompt:
      "You are a ruthless Seven-Sweeps Copy Editor. Audit and rewrite MindLC proposals across Clarity, Ontario Growing Success (K/T/C/A) Alignment, Tier Isolation, and Single Lock-Step CTA.",
  },
  {
    id: "skill-social-content",
    skill_name: "social-content",
    category: "GTA Parent Community & Paid Social",
    system_prompt:
      "You are a GTA Ontario Parent Community & Ad Strategist (Mississauga, Oakville, Markham, Toronto). Use calm, high-trust hooks rooted in verbatim WeeklyRealityLog parent quotes.",
  },
  {
    id: "skill-ai-seo",
    skill_name: "ai-seo",
    category: "Ontario Course-Code Checklists & AEO",
    system_prompt:
      "You are an Ontario STEM Curriculum Lead Magnet & AI-SEO Architect targeting MPM2D, MCR3U, MHF4U, MCV4U, and SBI3U unit-test prep.",
  },
];

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-ontario-fall",
    title: "MindLC 3-Tier × 3-Stage Ontario Grades 9–12 STEM Growth Engine",
    status: "Approved",
    created_at: "2026-11-01T14:00:00Z",
  },
];

const INITIAL_ONTARIO_TRENDS: OntarioTrendSignal[] = [
  {
    id: "trend-midterm-shock",
    title:
      "Ontario Semester 1 Midterm Report Cards & Parent-Teacher Interviews (TDSB, YRDSB, PDSB, HDSB)",
    category: "Ontario Academic Calendar",
    urgency: "Critical Now",
    affectedGrades: "Grades 9–12 Secondary",
    courseCodes: ["MTH1W", "MPM2D", "MCR3U", "MHF4U", "MCV4U", "SBI3U"],
    parentPainSummary:
      "Midterm marks just landed across GTA school boards. Parents seeing a 62%–74% in Grade 11 Functions (MCR3U), Grade 12 Advanced Functions (MHF4U), or Biology (SBI3U) realize they have 8 weeks left before final exams.",
    searchMomentum:
      "+68% week-over-week surge in 'MHF4U tutor Ontario' & 'how to raise midterm math mark'",
    recommendedCmoAction:
      "Use Midterm K/T/C/A error analysis inside your active Tier's Stage 1 conversion script.",
    recommendedAgentId: "agent-cro",
  },
  {
    id: "trend-anti-chatbot-cheating",
    title:
      "Parent Backlash Against Teens Using ChatGPT / Photomath as Homework Shortcuts",
    category: "Parent Search & Social Signal",
    urgency: "Critical Now",
    affectedGrades: "Grades 9–12 STEM",
    courseCodes: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
    parentPainSummary:
      "Parents report their teens get 95% on take-home assignments by copying AI answers, then score 56% on closed-book in-class unit tests.",
    searchMomentum:
      "+81% rise in queries for 'AI math tutor that doesn't give the answer' and 'Socratic math tutor'",
    recommendedCmoAction:
      "Contrast Socratic step-by-step hints against ChatGPT answer-copying across all 3 tiers.",
    recommendedAgentId: "agent-cro",
  },
];

const INITIAL_COMPETITORS: CompetitorProfile[] = [
  {
    id: "comp-kumon-mathnasium",
    name: "Franchise Learning Centres (Kumon / Mathnasium / Oxford)",
    archetype: "Franchise Learning Centre",
    websiteUrl: "https://www.mathnasium.ca",
    pricingModel: "$320–$550/month + registration fees (2 fixed drop-off slots/week)",
    theirPrimaryPitch:
      "In-person neighbourhood math centres with structured worksheet progressions.",
    ontarioParentComplaint:
      "\"We already burned $380/month at Mathnasium—my Grade 11 teen sat filling out generic worksheets while a college student watched 5 kids at once.\"",
    structuralWeakness:
      "Poorly equipped for Ontario Grades 9–12 Growing Success (K/T/C/A) Thinking & Application word problems (MPM2D, MCR3U, MHF4U, SBI3U) and closed at 9:45 PM.",
    mindlcCounterWedge:
      "3-Tier Ontario STEM Fit: Tier 1 Self-Coach ($39/mo), Tier 2 Managed Hybrid ($139/mo with Human Learning Manager), or Tier 3 Prime 1:1 Educator Hybrid ($349/mo).",
    recommendedConversionPlay:
      "Use the '$380/mo Worksheet Centre vs. MindLC K/T/C/A System' anchor table in diagnostic debriefs.",
    lastScannedAt: "Verified Today",
  },
  {
    id: "comp-hourly-tutors",
    name: "1-on-1 Private & Marketplace Tutors ($75–$95/hr Private / Varsity Tutors)",
    archetype: "1-on-1 Hourly Marketplace",
    websiteUrl: "https://www.varsitytutors.com",
    pricingModel: "$75–$95/hour (1 hr/week = $320–$380/mo)",
    theirPrimaryPitch: "1-on-1 live video or in-home tutoring sessions once a week.",
    ontarioParentComplaint:
      "\"The tutor explains it on Sunday afternoon, but when my son gets stuck on Wednesday night MHF4U homework before Thursday's test, nobody is there.\"",
    structuralWeakness:
      "The '6-Day Homework Gap': 1 hour of passive explanation per week does not build daily problem-solving habits.",
    mindlcCounterWedge:
      "Continuous 7-day Socratic AI coverage between sessions + Human Learning Manager accountability (Tier 2) or 1–2x/week Senior Educator + 24/7 AI (Tier 3 Prime).",
    recommendedConversionPlay:
      "Highlight 'The 6-Day Tutoring Gap' during parent consultations.",
    lastScannedAt: "Verified Today",
  },
];

const INITIAL_AGENTS: MarketingAgent[] = [
  {
    id: "agent-cro",
    codeName: "Agent-04 · Stage-1 CRO",
    roleTitle: "Stage-1 Funnel Conversion & Debrief Agent",
    specialty:
      "Optimizes Tier 1 self-serve checkout UX, Tier 2 10-min debrief scripts, and Tier 3 1:1 consultative closes.",
    primarySkillName: "cro",
    targetPlatform: "Parent Call",
    funnelFocus: "Conversion Optimization",
    status: "Idle / Ready",
    tasksCompletedCount: 6,
    conversionMetricOwned: "Stage 1 Conversion Gate (T1 ≥12% · T2 ≥25% · T3 ≥40%)",
  },
  {
    id: "agent-lifecycle",
    codeName: "Agent-05 · Lifecycle & Upgrades",
    roleTitle: "Nurture, Referrals & Tier 2→3 Upgrade Agent",
    specialty:
      "Runs post-diagnostic follow-ups, Stage 2 referral loops, and Tier 2 Flag A overload upgrades to Tier 3 Prime.",
    primarySkillName: "copywriting",
    targetPlatform: "Email",
    funnelFocus: "Parent Retention & Referral",
    status: "Idle / Ready",
    tasksCompletedCount: 5,
    conversionMetricOwned: "Day-7 Retention, Referral Share & Tier 2→3 Upgrades",
  },
  {
    id: "agent-seo",
    codeName: "Agent-02 · Ontario STEM Checklists",
    roleTitle: "Course-Code Checklists & Waterloo CEMC Positioning Agent",
    specialty:
      "Builds MPM2D, MCR3U, MHF4U, MCV4U & SBI3U unit-test checklists and Stage 2/3 organic pull assets.",
    primarySkillName: "ai-seo",
    targetPlatform: "Community",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 7,
    conversionMetricOwned: "Stage 2 Organic Pull & Community Seminar Leads",
  },
  {
    id: "agent-social",
    codeName: "Agent-03 · Stage-3 Paid Scale",
    roleTitle: "Stage-3 Low-CAC & GTA Paid Ad Scaling Agent",
    specialty:
      "Scales Tier 1 search/short-form ads (CAC ≤$40) and Tier 2 GTA parent ads (CAC ≤$150) once Stage 3 unlocks.",
    primarySkillName: "social-content",
    targetPlatform: "Facebook",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 4,
    conversionMetricOwned: "Stage 3 Blended CAC (T1 ≤$40 · T2 ≤$150)",
  },
  {
    id: "agent-intel",
    codeName: "Agent-01 · VoC & Reality Intel",
    roleTitle: "3-Tier Reality Gate & Cross-Tier Bleed Auditor",
    specialty:
      "Audits weekly tier funnel drop-offs, shared VoC parent quotes, and cross-tier tone isolation.",
    primarySkillName: "copy-editing",
    targetPlatform: "Parent Call",
    funnelFocus: "Conversion Optimization",
    status: "Idle / Ready",
    tasksCompletedCount: 4,
    conversionMetricOwned: "VoC Resolution & Zero Cross-Tier Tone Bleed",
  },
];

const INITIAL_PLANNED_ACTIVITIES: PlannedActivity[] = [
  {
    id: "act-t1-daily",
    tier_id: "TIER_1",
    horizon: "Daily",
    timeWindow: "Today · Tier 1 Stage 1 Priority",
    title:
      "[Tier 1 · Self-Coach] Remove Pre-Diagnostic Email Gate & Add 1-Click $39/mo LaTeX HUD Checkout Bridge",
    tacticalExecution:
      "Let Ontario Grades 9–12 students launch the Socratic voice + LaTeX HUD diagnostic immediately without registration friction; display their K/T/C/A step gap and embed a 1-click self-serve checkout + automated Day-3 unit-test SMS reminder.",
    deliverableSpec:
      "Self-Serve Diagnostic Result Screen Copy + Day-7 Return SMS Flow",
    marketTrigger: "Tier 1 Diag->Paid is 10.0% (11/110) vs. >=12% Stage 1 Target",
    courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Onboarding & Checkout UX",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Tier 1 Diag-to-Paid ≥ 12% & Day-7 Student Return ≥ 50%",
    status: "Queued",
    requiredStage: "STAGE_1",
  },
  {
    id: "act-t2-daily",
    tier_id: "TIER_2",
    horizon: "Daily",
    timeWindow: "Today · Tier 2 Stage 1 Priority",
    title:
      "[Tier 2 · Managed Hybrid] Deploy 10-Min Parent Debrief Script with Growing Success (K/T/C/A) Error Trace ($139 CAD/mo)",
    tacticalExecution:
      "Equip Human Learning Managers on today's debrief calls to screen-share the student's timestamped Socratic stall in Minutes 0–3, contrast $139/mo Managed Hybrid against $380/mo worksheet centres in Minutes 3–7, and close with the 30-Day Active-Habit Guarantee.",
    deliverableSpec:
      "10-Min Parent Debrief Call Script + Growing Success K/T/C/A Report Header",
    marketTrigger: "Tier 2 Diag->Paid is 14.3% (2/14) vs. >=25% Stage 1 Target",
    courseCodesTargeted: ["MHF4U", "SBI3U", "MCR3U", "MPM2D"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Parent Call",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Lift Tier 2 Diag Completed → Paid from 14.3% to ≥ 25%",
    status: "Queued",
    requiredStage: "STAGE_1",
  },
  {
    id: "act-t3-daily",
    tier_id: "TIER_3",
    horizon: "Daily",
    timeWindow: "Today · Tier 3 Stage 1 Priority",
    title:
      "[Tier 3 · Prime 1:1] Trigger 'Flag A Cognitive Overload' Consultation Invites for Grade 12 MHF4U/MCV4U Students",
    tacticalExecution:
      "Identify Tier 2 students who hit 3+ consecutive Level 4 Thinking/Application stalls in MHF4U, MCV4U, or SBI4U and invite their parents to a 1:1 Executive Consultation for Prime 1:1 Live Educator + AI Hybrid.",
    deliverableSpec:
      "Flag A Overload Parent Briefing Script + Custom 6-Week OUAC Syllabus Template",
    marketTrigger: "Tier 3 Consultation->Close is 37.5% (3/8) vs. >=40% Stage 1 Target",
    courseCodesTargeted: ["MHF4U", "MCV4U", "SBI4U", "SCH4U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "1:1 Consultation & Upgrade Script",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Tier 3 Consultation-to-Close ≥ 40% (First 5 Prime Families)",
    status: "Queued",
    requiredStage: "STAGE_1",
  },
];

const INITIAL_QA_HISTORY: PlanQaExchange[] = [
  {
    id: "qa-init-1",
    timestamp: "3-Tier × 3-Stage Architecture Active",
    cmoQuestion:
      "How does the new 3-Tier × 3-Stage workspace isolation prevent cross-tier tone bleed?",
    horizonAffected: "Daily",
    strategistAnswer:
      "Each product tier (`TIER_1` Self-Coach @ $39/mo, `TIER_2` Managed Hybrid @ $139/mo, `TIER_3` Prime 1:1 @ $349/mo) now maintains its own isolated funnel metrics, Stage 1/2/3 goals, Reality Gate status, and proposal queue. When you switch tiers in the Macro Command Strip, the AI Agent context builder swaps out the value proposition and enforces strict **Cross-Tier Tone Guardrails** (forbidding human tutor promises in Tier 1, and forbidding discount/self-serve framing in Tier 3 Prime).",
    planAdjustmentsMade: [
      "Scoped Tier 1 (32/300 paid), Tier 2 (14/100 paid), and Tier 3 (3/30 paid) into isolated workspaces",
      "Unified Shared VoC Vault with tier tags (TIER_1 | TIER_2 | TIER_3 | ALL)",
    ],
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "msg-welcome",
    tierId: "TIER_2",
    proposalId: "asset-stage1-debrief",
    sender: "ai",
    timestamp: "Just now",
    skillName: "cro",
    detailLevel: 2,
    linkedAssetId: "asset-stage1-debrief",
    linkedPlatform: "Parent Call",
    changeSummaryPill:
      "3-Tier × 3-Stage Workspace Active: Switch between Tier 1 (Self-Coach), Tier 2 (Managed Hybrid), and Tier 3 (Prime 1:1) in the top bar",
    strategicJustification: {
      detailLevel: 2,
      levelLabel: "Level 2: Standard Rationale",
      headlineSummary:
        "3-Tier × 3-Stage Independent Workspace Architecture Ready",
      rationaleBody:
        "1. **Independent Tier Workspaces (`TIER_1`, `TIER_2`, `TIER_3`):** Each tier has its own custom funnel step labels, Stage 1/2/3 editable goals, Reality Gate log, and proposal queue.\n2. **Cross-Tier Tone Bleed Guardrail:** Try switching to **`Tier 1 · Self-Coach`** and asking for a *'1-on-1 live human tutor call'*, or switching to **`Tier 3 · Prime 1:1`** and asking for a *'50% off cheap discount coupon'*—the guardrail immediately intercepts cross-tier tone bleed!",
      frameworksApplied: [
        "3-Tier × 3-Stage Isolation",
        "Shared VoC Vault (Tier-Tagged)",
        "Cross-Tier Tone Bleed Guardrail",
      ],
      mentorshipTakeaway:
        "Click the active Stage Lock badge in the top bar anytime to view or edit the Stage 1, Stage 2, and Stage 3 KPI targets for the currently selected tier.",
      contextCacheStatus:
        "Tier Cache HIT (TIER_2 · STAGE_1 · Growing Success K/T/C/A)",
    },
  },
];

// Helper to compute top-level mirror fields from a tier workspace
function syncMirrorsFromTier(ws: TierWorkspaceState) {
  return {
    assets: ws.proposals,
    selectedProposalId:
      ws.selected_proposal_id || ws.proposals[0]?.id || "",
    activeRevisionAssetId:
      ws.selected_proposal_id || ws.proposals[0]?.id || null,
    paidStudentCount: ws.current_paid_count,
    activeBottleneckStage: ws.active_stage,
    realityGateStatus: ws.reality_gate_status,
    weeklyRealityLogs: ws.weekly_reality_logs,
  };
}

export const useMarketingStore = create<MarketingState>((set, get) => {
  const initialTier: TierId = "TIER_2";
  const initialWs = INITIAL_TIER_WORKSPACES[initialTier];

  return {
    activeTab: "copilot",
    currentUser: {
      id: "usr-admin-01",
      email: "founder@mindlc.ca",
      role: "Admin",
    },
    skills: INITIAL_SKILLS,
    campaigns: INITIAL_CAMPAIGNS,

    activeTierId: initialTier,
    tierWorkspaces: INITIAL_TIER_WORKSPACES,
    vocVault: INITIAL_VOC_VAULT,

    ...syncMirrorsFromTier(initialWs),

    activeCampaignId: "camp-ontario-fall",
    selectedSkillId: "skill-cro",
    detailLevel: 2,
    preferredPlatform: "Parent Call",
    chatMessages: INITIAL_CHAT,
    isGenerating: false,
    lastHighlightedAssetId: initialWs.selected_proposal_id,
    brandPersona: {
      companyName: "MindLC",
      planNameAndPrice:
        "3-Tier Ontario STEM Architecture ($39 Self-Coach · $139 Managed Hybrid · $349 Prime 1:1)",
      targetAudience:
        "Ontario parents & students in Grades 9–12 STEM (MPM2D, MCR3U, MHF4U, MCV4U, SBI3U, SCH4U, SPH4U).",
      coreHook:
        "Tier 1: 24/7 Socratic Voice + LaTeX HUD Self-Coach ($39/mo) | Tier 2: Managed Hybrid with Growing Success K/T/C/A Reports & Human Learning Manager ($139/mo) | Tier 3: Prime 1:1 Live Online Educator + 24/7 Socratic AI ($349/mo).",
      curriculumFocus:
        "Ontario Ministry of Education Grades 9–12 STEM & Growing Success (K/T/C/A) Achievement Chart (MTH1W, MPM2D, MCR3U, MHF4U, MCV4U, SBI3U, SBI4U).",
      brandVoice:
        "Calm Ontario educator advisory tone, strict tier isolation (zero cross-tier tone bleed), zero exaggerated grade guarantees.",
      antiPersonaObjections:
        "VOC-101 (ai_cheating), VOC-102 (K/T/C/A curriculum), VOC-103 ($139 vs $380 Mathnasium), VOC-105 (Tier 1 LaTeX HUD self-serve), VOC-106 (Tier 3 Waterloo/U of T 1:1 depth).",
      geminiModel: "gemini-2.5-pro (3-Tier × 3-Stage Isolated Context v3.0)",
    },

    isRealityGateModalOpen: false,
    isVocVaultOpen: false,
    isStageGoalEditorOpen: false,
    isSampleSeedActive: true,
    diagnosticToast: null,
    pendingScopeDriftCommand: null,

    ontarioTrends: INITIAL_ONTARIO_TRENDS,
    competitors: INITIAL_COMPETITORS,
    activeHorizon: "Daily",
    agents: INITIAL_AGENTS,
    plannedActivities: INITIAL_PLANNED_ACTIVITIES,
    planQaHistory: INITIAL_QA_HISTORY,
    runningActivityId: null,
    isRunningTeamSprint: false,
    isAskingPlannerQa: false,

    // =======================================================================
    // TIER & STAGE SWITCHING / EDITING ACTIONS
    // =======================================================================
    setActiveTierId: (tierId) =>
      set((state) => {
        const ws = state.tierWorkspaces[tierId];
        return {
          activeTierId: tierId,
          ...syncMirrorsFromTier(ws),
          pendingScopeDriftCommand: null,
          lastHighlightedAssetId: ws.selected_proposal_id,
        };
      }),

    setPaidStudentCount: (count) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const maxCap = Math.max(ws.north_star_paid_goal, 300);
        const clamped = Math.max(0, Math.min(maxCap, count));
        const recommendedStage = getRecommendedStageForTier(tierId, clamped);
        const updatedWs: TierWorkspaceState = {
          ...ws,
          current_paid_count: clamped,
          active_stage: recommendedStage,
          manual_stage_override: false,
        };
        const updatedMap = {
          ...state.tierWorkspaces,
          [tierId]: updatedWs,
        };
        return {
          tierWorkspaces: updatedMap,
          ...syncMirrorsFromTier(updatedWs),
          pendingScopeDriftCommand: null,
        };
      }),

    setActiveStageOverride: (stageId) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedWs: TierWorkspaceState = {
          ...ws,
          active_stage: stageId,
          manual_stage_override: true,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
          pendingScopeDriftCommand: null,
        };
      }),

    updateTierStageGoal: (tierId, stageId, partialGoal) =>
      set((state) => {
        const ws = state.tierWorkspaces[tierId];
        const currentGoal = ws.stage_goals[stageId];
        const updatedGoal: EditableStageGoal = {
          ...currentGoal,
          ...partialGoal,
        };
        const updatedWs: TierWorkspaceState = {
          ...ws,
          stage_goals: {
            ...ws.stage_goals,
            [stageId]: updatedGoal,
          },
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(
            tierId === state.activeTierId
              ? updatedWs
              : state.tierWorkspaces[state.activeTierId]
          ),
          diagnosticToast: `Saved updated ${stageId} goals for ${ws.tier_short_name} (${updatedGoal.primary_kpi_name} ≥ ${updatedGoal.primary_kpi_target_pct}%).`,
        };
      }),

    setStageGoalEditorOpen: (open) => set({ isStageGoalEditorOpen: open }),

    // =======================================================================
    // NAVIGATION & SELECTION ACTIONS
    // =======================================================================
    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedProposalId: (id) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedWs: TierWorkspaceState = {
          ...ws,
          selected_proposal_id: id,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          selectedProposalId: id,
          activeRevisionAssetId: id,
          pendingScopeDriftCommand: null,
        };
      }),
    setActiveCampaignId: (id) => set({ activeCampaignId: id }),
    setSelectedSkillId: (id) => set({ selectedSkillId: id }),
    setDetailLevel: (level) => set({ detailLevel: level }),
    setPreferredPlatform: (platform) => set({ preferredPlatform: platform }),
    setActiveHorizon: (horizon) => set({ activeHorizon: horizon }),
    setActiveRevisionAssetId: (assetId) =>
      set((state) => ({
        activeRevisionAssetId: assetId,
        selectedProposalId: assetId || state.selectedProposalId,
      })),
    setVocVaultOpen: (open) => set({ isVocVaultOpen: open }),
    clearDiagnosticToast: () => set({ diagnosticToast: null }),

    // =======================================================================
    // SAFEGUARD 1: WEEKLY REALITY GATE (PER-TIER OR MULTI-TIER)
    // =======================================================================
    setRealityGateModalOpen: (open) => set({ isRealityGateModalOpen: open }),

    toggleRealityGateLockSimulation: () =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const nextStatus: RealityGateStatus =
          ws.reality_gate_status === "LOCKED" ? "UNLOCKED" : "LOCKED";
        const updatedWs: TierWorkspaceState = {
          ...ws,
          reality_gate_status: nextStatus,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          realityGateStatus: nextStatus,
        };
      }),

    submitWeeklyRealityLog: (payload) =>
      set((state) => {
        const activeTier = state.activeTierId;
        const ws = state.tierWorkspaces[activeTier];
        const stageGoal = ws.stage_goals[ws.active_stage];

        const formattedQuotes: VerbatimParentQuote[] =
          payload.verbatim_parent_quotes.map((q, idx) => ({
            id: `VOC-${210 + state.vocVault.length + idx}`,
            tier_id: q.tier_id || activeTier,
            quote_text: q.quote_text.trim(),
            context_tag: q.context_tag,
            week_start_date: payload.week_start_date,
            is_sample: false,
          }));

        const newLog: WeeklyRealityLog = {
          id: `wrl-${activeTier.toLowerCase()}-${Date.now()}`,
          tier_id: activeTier,
          week_start_date: payload.week_start_date,
          funnel_metrics: payload.funnel_metrics,
          verbatim_parent_quotes: formattedQuotes,
          top_winning_touchpoint: payload.top_winning_touchpoint.trim(),
          created_at: new Date().toISOString(),
          is_sample: false,
        };

        const rates = computeFunnelRates(payload.funnel_metrics);
        const newPaidTotal = Math.max(
          ws.current_paid_count,
          payload.funnel_metrics.paid_conversions
        );
        const nextStage = ws.manual_stage_override
          ? ws.active_stage
          : getRecommendedStageForTier(activeTier, newPaidTotal);

        const isBelowTarget =
          rates.completedToPaidPct < stageGoal.primary_kpi_target_pct;

        const updatedProposals = ws.proposals.map((a) => {
          const cleaned = { ...a, is_sample: false };
          if (
            isBelowTarget &&
            a.hitl_state === "APPROVED_FOR_EXECUTION" &&
            a.stage_id === ws.active_stage
          ) {
            return {
              ...cleaned,
              hitl_state: "KILLED_BY_STOP_LOSS" as HITLProposalState,
              kill_or_reject_reason: `Auto-Flagged by ${ws.tier_short_name} Reality Gate: ${ws.funnel_labels[2]} → ${ws.funnel_labels[3]} was ${rates.completedToPaidPct}% (< ${stageGoal.primary_kpi_target_pct}% target).`,
            };
          }
          return cleaned;
        });

        const updatedActiveWs: TierWorkspaceState = {
          ...ws,
          current_paid_count: newPaidTotal,
          active_stage: nextStage,
          reality_gate_status: "UNLOCKED",
          weekly_reality_logs: [
            newLog,
            ...ws.weekly_reality_logs.filter((l) => !l.is_sample),
          ],
          proposals: updatedProposals,
        };

        const updatedWorkspaces: Record<TierId, TierWorkspaceState> = {
          ...state.tierWorkspaces,
          [activeTier]: updatedActiveWs,
        };

        // Optional: Unlock additional tiers selected in the modal
        for (const extraTier of payload.alsoUnlockTiers || []) {
          if (extraTier !== activeTier) {
            updatedWorkspaces[extraTier] = {
              ...updatedWorkspaces[extraTier],
              reality_gate_status: "UNLOCKED",
            };
          }
        }

        const toastMsg = isBelowTarget
          ? `[${ws.tier_short_name}] Bottleneck detected: ${ws.funnel_labels[2]} → ${ws.funnel_labels[3]} is ${rates.completedToPaidPct}% (Target ≥ ${stageGoal.primary_kpi_target_pct}%). Proposals unlocked & calibrated to ${formattedQuotes.length} new VoC quotes.`
          : `[${ws.tier_short_name}] Target Met! ${ws.funnel_labels[2]} → ${ws.funnel_labels[3]} hit ${rates.completedToPaidPct}% (≥ ${stageGoal.primary_kpi_target_pct}%). Proposals unlocked.`;

        return {
          tierWorkspaces: updatedWorkspaces,
          vocVault: [
            ...formattedQuotes,
            ...state.vocVault.map((q) => ({ ...q, is_sample: false })),
          ],
          ...syncMirrorsFromTier(updatedActiveWs),
          isRealityGateModalOpen: false,
          isSampleSeedActive: false,
          diagnosticToast: toastMsg,
        };
      }),

    activatePilotWeek0Override: () =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedWs: TierWorkspaceState = {
          ...ws,
          reality_gate_status: "PILOT_WEEK_0_OVERRIDE",
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          realityGateStatus: "PILOT_WEEK_0_OVERRIDE",
          isRealityGateModalOpen: false,
          diagnosticToast: `Pilot Week 0 Override activated for ${ws.tier_short_name}.`,
        };
      }),

    // =======================================================================
    // LEVEL 3 CO-PILOT: TIER-ISOLATED GENERATION & REFINEMENT
    // =======================================================================
    sendCopilotCommand: async (
      userCommand: string,
      explicitStageOverride = false,
      forceNewProposal = false
    ) => {
      const state = get();
      const tierId = state.activeTierId;
      const ws = state.tierWorkspaces[tierId];
      const isRevisingExisting =
        !forceNewProposal && Boolean(state.activeRevisionAssetId);

      // 1. Check Tier's Reality Gate
      if (!isRevisingExisting && ws.reality_gate_status === "LOCKED") {
        set({ isRealityGateModalOpen: true });
        return;
      }

      const latestLog = ws.weekly_reality_logs[0];
      const metrics = latestLog?.funnel_metrics || {
        reach_or_contacts: 64,
        diag_booked: 18,
        diag_completed: 14,
        paid_conversions: 2,
      };

      // Top 8 VoC quotes relevant to this tier (tier_id === activeTierId || "ALL")
      const tierVocQuotes = state.vocVault
        .filter((q) => q.tier_id === tierId || q.tier_id === "ALL")
        .slice(0, 8);

      // 2. Check Cross-Tier Tone Bleed & Active Stage Bottleneck Lock
      if (!explicitStageOverride) {
        const drift = checkTierAndStageGuardrail({
          userCommand,
          tierWorkspace: ws,
          funnelMetrics: metrics,
        });

        if (drift.detected) {
          const userMsg: ChatMessage = {
            id: `msg-user-${Date.now()}`,
            tierId,
            proposalId: state.selectedProposalId,
            sender: "user",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            skillName:
              state.skills.find((s) => s.id === state.selectedSkillId)
                ?.skill_name || "cro",
            detailLevel: state.detailLevel,
            userPrompt: userCommand,
          };

          const driftMsg: ChatMessage = {
            id: `msg-drift-${Date.now() + 1}`,
            tierId,
            proposalId: state.selectedProposalId,
            sender: "guardrail",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            skillName: "TierStageGuardrail",
            detailLevel: state.detailLevel,
            scopeDriftWarning: drift,
          };

          set((prev) => ({
            chatMessages: [...prev.chatMessages, userMsg, driftMsg],
            pendingScopeDriftCommand: userCommand,
          }));
          return;
        }
      }

      const skill =
        state.skills.find((s) => s.id === state.selectedSkillId) ||
        state.skills[0];
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const targetAssetForRevision = isRevisingExisting
        ? ws.proposals.find((a) => a.id === state.activeRevisionAssetId)
        : undefined;

      const nextVer = targetAssetForRevision
        ? (targetAssetForRevision.versions?.length ||
            targetAssetForRevision.revision_count ||
            1) + 1
        : 1;

      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        tierId,
        proposalId: targetAssetForRevision?.id || state.selectedProposalId,
        sender: "user",
        timestamp: nowTime,
        skillName: skill.skill_name,
        detailLevel: state.detailLevel,
        userPrompt: userCommand,
        isRevisionTurn: Boolean(targetAssetForRevision),
      };

      set({
        chatMessages: [...state.chatMessages, userMsg],
        isGenerating: true,
        pendingScopeDriftCommand: null,
      });

      const response = await generateMarketingResponse({
        userCommand,
        selectedSkill: skill,
        detailLevel: state.detailLevel,
        tierWorkspace: ws,
        vocQuotesForTier: tierVocQuotes,
        preferredPlatform: targetAssetForRevision
          ? targetAssetForRevision.platform
          : state.preferredPlatform,
        existingProposalToRevise: targetAssetForRevision?.proposal_schema,
        nextVersionNumber: nextVer,
      });

      if (targetAssetForRevision) {
        const existingVersions = targetAssetForRevision.versions || [
          {
            version: 1,
            content: targetAssetForRevision.content,
            single_cta:
              targetAssetForRevision.proposal_schema?.single_cta ||
              "Book Diagnostic",
            change_summary: "v1 Initial baseline",
            timestamp: "Earlier",
          },
        ];

        const newVersionSnapshot = {
          version: nextVer,
          content: response.marketingContent,
          single_cta: response.proposalSchema.single_cta,
          change_summary:
            response.changeSummaryPill ||
            `Updated v${nextVer} (${ws.tier_short_name})`,
          timestamp: "Just now",
        };

        const aiMsg: ChatMessage = {
          id: `msg-ai-${Date.now() + 1}`,
          tierId,
          proposalId: targetAssetForRevision.id,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          skillName: skill.skill_name,
          detailLevel: state.detailLevel,
          changeSummaryPill: newVersionSnapshot.change_summary,
          strategicJustification: response.strategicJustification,
          linkedAssetId: targetAssetForRevision.id,
          linkedPlatform: targetAssetForRevision.platform,
          isRevisionTurn: true,
        };

        set((prev) => {
          const curWs = prev.tierWorkspaces[tierId];
          const updatedProposals = curWs.proposals.map((a) =>
            a.id === targetAssetForRevision.id
              ? {
                  ...a,
                  content: response.marketingContent,
                  proposal_schema: response.proposalSchema,
                  hitl_state: "DRAFT" as HITLProposalState,
                  cmo_checklist: {
                    ontario_context: true,
                    single_cta: true,
                    brand_trust: false,
                  },
                  revision_count: nextVer,
                  versions: [...existingVersions, newVersionSnapshot],
                  updated_at: `v${nextVer} · Just now`,
                }
              : a
          );
          const updatedWs: TierWorkspaceState = {
            ...curWs,
            proposals: updatedProposals,
          };
          return {
            tierWorkspaces: { ...prev.tierWorkspaces, [tierId]: updatedWs },
            ...syncMirrorsFromTier(updatedWs),
            chatMessages: [...prev.chatMessages, aiMsg],
            isGenerating: false,
            lastHighlightedAssetId: targetAssetForRevision.id,
          };
        });
        return;
      }

      // Create New Proposal Scoped to Active Tier & Active Stage
      const newAssetId = `asset-${tierId.toLowerCase()}-${Date.now()}`;
      const newAsset: Asset = {
        id: newAssetId,
        tier_id: tierId,
        stage_id: ws.active_stage,
        campaign_id: state.activeCampaignId,
        platform: response.targetPlatform,
        channel_badge:
          response.proposalSchema.channel.split("(")[0].trim() ||
          ws.tier_short_name,
        title: response.assetTitle,
        content: response.marketingContent,
        detail_level_used: state.detailLevel,
        skill_used: skill.skill_name,
        updated_at: "v1 · Just now",
        proposal_schema: response.proposalSchema,
        hitl_state: "DRAFT",
        cmo_checklist: {
          ontario_context: false,
          single_cta: false,
          brand_trust: false,
        },
        revision_count: 1,
        versions: [
          {
            version: 1,
            content: response.marketingContent,
            single_cta: response.proposalSchema.single_cta,
            change_summary:
              response.changeSummaryPill ||
              `v1 Initial ${ws.tier_short_name} Draft`,
            timestamp: "Just now",
          },
        ],
      };

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now() + 1}`,
        tierId,
        proposalId: newAssetId,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        skillName: skill.skill_name,
        detailLevel: state.detailLevel,
        changeSummaryPill: response.changeSummaryPill,
        strategicJustification: response.strategicJustification,
        linkedAssetId: newAssetId,
        linkedPlatform: response.targetPlatform,
      };

      set((prev) => {
        const curWs = prev.tierWorkspaces[tierId];
        const updatedWs: TierWorkspaceState = {
          ...curWs,
          proposals: [newAsset, ...curWs.proposals],
          selected_proposal_id: newAssetId,
        };
        return {
          tierWorkspaces: { ...prev.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
          chatMessages: [...prev.chatMessages, aiMsg],
          isGenerating: false,
          lastHighlightedAssetId: newAssetId,
        };
      });
    },

    // =======================================================================
    // STICKY 30-SECOND CMO APPROVAL DOCK ACTIONS (Tier-Scoped)
    // =======================================================================
    toggleCmoChecklistItem: (proposalId, field) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedProposals = ws.proposals.map((a) => {
          if (a.id !== proposalId) return a;
          const current = a.cmo_checklist || {
            ontario_context: false,
            single_cta: false,
            brand_trust: false,
          };
          const updated = { ...current, [field]: !current[field] };
          return {
            ...a,
            cmo_checklist: updated,
            devils_advocate_verified:
              updated.ontario_context && updated.brand_trust,
            kill_criteria_acknowledged: updated.single_cta,
          };
        });
        const updatedWs = { ...ws, proposals: updatedProposals };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
        };
      }),

    approveAndLockProposal: (proposalId) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const target = ws.proposals.find((a) => a.id === proposalId);
        const chk = target?.cmo_checklist;
        if (!chk?.ontario_context || !chk?.single_cta || !chk?.brand_trust) {
          return state;
        }
        const updatedProposals = ws.proposals.map((a) =>
          a.id === proposalId
            ? {
                ...a,
                hitl_state: "APPROVED_FOR_EXECUTION" as HITLProposalState,
                devils_advocate_verified: true,
                kill_criteria_acknowledged: true,
                updated_at: "Approved & Locked",
              }
            : a
        );
        const updatedWs = { ...ws, proposals: updatedProposals };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
          diagnosticToast: `[${ws.tier_short_name}] Approved & Locked "${target?.title?.slice(0, 46)}..." — Moved to 🟢 Approved / Live.`,
        };
      }),

    rejectOrKillProposal: (proposalId, reason, targetState = "ARCHIVED") =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const target = ws.proposals.find((a) => a.id === proposalId);
        const updatedProposals = ws.proposals.map((a) =>
          a.id === proposalId
            ? {
                ...a,
                hitl_state: targetState,
                kill_or_reject_reason:
                  reason.trim() ||
                  "Killed by Acting CMO during 30-second risk review.",
                updated_at:
                  targetState === "KILLED_BY_STOP_LOSS"
                    ? "Stop-Loss Triggered"
                    : "Archived by CMO",
              }
            : a
        );
        const updatedWs = { ...ws, proposals: updatedProposals };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
          diagnosticToast: `[${ws.tier_short_name}] ${
            targetState === "KILLED_BY_STOP_LOSS"
              ? "Flagged Stop-Loss Breach on"
              : "Archived"
          } "${target?.title?.slice(0, 42)}..."`,
        };
      }),

    toggleProposalVerification: (assetId, field) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedWs = {
          ...ws,
          proposals: ws.proposals.map((a) =>
            a.id === assetId ? { ...a, [field]: !a[field] } : a
          ),
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
        };
      }),

    transitionProposalHitlState: (assetId, nextState) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedWs = {
          ...ws,
          proposals: ws.proposals.map((a) =>
            a.id === assetId
              ? { ...a, hitl_state: nextState, updated_at: `HITL -> ${nextState}` }
              : a
          ),
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
        };
      }),

    addScannedCompetitor: (comp) =>
      set((state) => ({
        competitors: [comp, ...state.competitors],
      })),

    spawnCounterActivityFromCompetitor: async (compId: string) => {
      const state = get();
      const ws = state.tierWorkspaces[state.activeTierId];
      if (ws.reality_gate_status === "LOCKED") {
        set({ isRealityGateModalOpen: true });
        return;
      }
      const comp = state.competitors.find((c) => c.id === compId);
      if (!comp) return;

      const newActivity: PlannedActivity = {
        id: `act-comp-${Date.now()}`,
        tier_id: ws.tier_id,
        horizon: "Daily",
        timeWindow: `Today · ${ws.tier_short_name} (${ws.active_stage})`,
        title: `[${ws.tier_short_name}] Counter ${comp.name}: "${comp.recommendedConversionPlay.slice(0, 58)}"`,
        tacticalExecution: `Target Ontario parents comparing ${comp.name} (${comp.pricingModel}) against ${ws.tier_name} (${ws.price_label}). Highlight their weakness (${comp.structuralWeakness}) and present our tier wedge: ${ws.offer_summary}`,
        deliverableSpec: `Comparison Battlecard & Objection Script vs. ${comp.name}`,
        marketTrigger: `Competitor gap identified in ${comp.name}`,
        courseCodesTargeted: ["MHF4U", "SBI3U", "MCR3U", "MPM2D"],
        assignedAgentId: "agent-cro",
        skillName: "cro",
        targetPlatform: "Parent Call",
        funnelObjective: "Conversion Optimization",
        targetKpi: `${ws.stage_goals[ws.active_stage].primary_kpi_name} >= ${ws.stage_goals[ws.active_stage].primary_kpi_target_pct}%`,
        status: "Queued",
        adjustedByCmo: true,
        cmoAdjustmentNote: `Spawned from Competitor Intel (${comp.name})`,
        requiredStage: ws.active_stage,
      };

      set((prev) => ({
        plannedActivities: [newActivity, ...prev.plannedActivities],
        activeHorizon: "Daily",
        activeTab: "planner",
      }));

      await get().dispatchAgentForActivity(newActivity.id);
    },

    spawnActivityFromTrend: async (trendId: string) => {
      const state = get();
      const ws = state.tierWorkspaces[state.activeTierId];
      if (ws.reality_gate_status === "LOCKED") {
        set({ isRealityGateModalOpen: true });
        return;
      }
      const trend = state.ontarioTrends.find((t) => t.id === trendId);
      if (!trend) return;

      const newActivity: PlannedActivity = {
        id: `act-trend-${Date.now()}`,
        tier_id: ws.tier_id,
        horizon: "Daily",
        timeWindow: `Today · ${ws.tier_short_name} (${ws.active_stage})`,
        title: `[${ws.tier_short_name}] Signal Play: ${trend.title}`,
        tacticalExecution: `${trend.recommendedCmoAction} Scoped strictly to ${ws.tier_name} (${ws.price_label}).`,
        deliverableSpec: `${ws.tier_short_name} Proposal for ${trend.courseCodes.join(" · ")}`,
        marketTrigger: `${trend.category} (${trend.searchMomentum})`,
        courseCodesTargeted: trend.courseCodes,
        assignedAgentId: "agent-cro",
        skillName: "cro",
        targetPlatform: "Parent Call",
        funnelObjective: "Conversion Optimization",
        targetKpi: `${ws.stage_goals[ws.active_stage].primary_kpi_name} >= ${ws.stage_goals[ws.active_stage].primary_kpi_target_pct}%`,
        status: "Queued",
        adjustedByCmo: true,
        cmoAdjustmentNote: `Triggered from Ontario Signal: ${trend.title.slice(0, 44)}`,
        requiredStage: ws.active_stage,
      };

      set((prev) => ({
        plannedActivities: [newActivity, ...prev.plannedActivities],
        activeHorizon: "Daily",
        activeTab: "planner",
      }));

      await get().dispatchAgentForActivity(newActivity.id);
    },

    dispatchAgentForActivity: async (activityId: string) => {
      const state = get();
      const tierId = state.activeTierId;
      const ws = state.tierWorkspaces[tierId];
      if (ws.reality_gate_status === "LOCKED") {
        set({ isRealityGateModalOpen: true });
        return;
      }
      const activity = state.plannedActivities.find((a) => a.id === activityId);
      if (!activity) return;

      const agent =
        state.agents.find((ag) => ag.id === activity.assignedAgentId) ||
        state.agents[0];
      const tierVocQuotes = state.vocVault
        .filter((q) => q.tier_id === tierId || q.tier_id === "ALL")
        .slice(0, 8);

      set((prev) => ({
        runningActivityId: activityId,
        agents: prev.agents.map((ag) =>
          ag.id === agent.id ? { ...ag, status: "Executing Task" } : ag
        ),
      }));

      const result = await executeAutonomousAgentTask({
        activity,
        agent,
        brandPersona: state.brandPersona,
        tierWorkspace: ws,
        vocQuotesForTier: tierVocQuotes,
      });

      const newAssetId = `asset-agent-${Date.now()}`;
      const newAsset: Asset = {
        id: newAssetId,
        tier_id: tierId,
        stage_id: ws.active_stage,
        campaign_id: state.activeCampaignId,
        platform: result.platform,
        channel_badge: ws.tier_short_name,
        title: result.assetTitle,
        content: result.content,
        detail_level_used: 3,
        skill_used: activity.skillName,
        agent_author: agent.codeName,
        updated_at: "v1 · Generated by " + agent.codeName,
        proposal_schema: result.proposalSchema,
        hitl_state: "DRAFT",
        cmo_checklist: {
          ontario_context: false,
          single_cta: false,
          brand_trust: false,
        },
        revision_count: 1,
        versions: [
          {
            version: 1,
            content: result.content,
            single_cta: result.proposalSchema.single_cta,
            change_summary: `v1 Drafted autonomously by ${agent.codeName} for ${ws.tier_short_name}`,
            timestamp: "Just now",
          },
        ],
      };

      set((prev) => {
        const curWs = prev.tierWorkspaces[tierId];
        const updatedWs: TierWorkspaceState = {
          ...curWs,
          proposals: [newAsset, ...curWs.proposals],
          selected_proposal_id: newAssetId,
        };
        return {
          runningActivityId: null,
          tierWorkspaces: { ...prev.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
          lastHighlightedAssetId: newAssetId,
          plannedActivities: prev.plannedActivities.map((a) =>
            a.id === activityId
              ? { ...a, status: "Completed", outputAssetId: newAssetId }
              : a
          ),
          agents: prev.agents.map((ag) =>
            ag.id === agent.id
              ? {
                  ...ag,
                  status: "Completed Sprint",
                  tasksCompletedCount: ag.tasksCompletedCount + 1,
                }
              : ag
          ),
        };
      });
    },

    runAutonomousTeamSprint: async (horizon: PlanHorizon) => {
      const state = get();
      const ws = state.tierWorkspaces[state.activeTierId];
      if (ws.reality_gate_status === "LOCKED") {
        set({ isRealityGateModalOpen: true });
        return;
      }
      const queued = state.plannedActivities.filter(
        (a) => a.horizon === horizon && a.status === "Queued"
      );
      if (queued.length === 0) return;

      set({ isRunningTeamSprint: true });
      for (const act of queued) {
        await get().dispatchAgentForActivity(act.id);
      }
      set({ isRunningTeamSprint: false });
    },

    askCmoPlannerQuestion: async (question: string) => {
      const state = get();
      const ws = state.tierWorkspaces[state.activeTierId];
      set({ isAskingPlannerQa: true });

      const res = await evaluateCmoPlanQuestionAndAdjust({
        question,
        activeHorizon: state.activeHorizon,
        trends: state.ontarioTrends,
        competitors: state.competitors,
        brandPersona: state.brandPersona,
        tierWorkspace: ws,
      });

      const newExchange: PlanQaExchange = {
        id: `qa-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cmoQuestion: `[${ws.tier_short_name}] ${question}`,
        horizonAffected: res.horizonAffected,
        strategistAnswer: res.strategistAnswer,
        planAdjustmentsMade: res.adjustmentSummary,
      };

      set((prev) => ({
        isAskingPlannerQa: false,
        activeHorizon: res.horizonAffected,
        plannedActivities: [...res.newActivities, ...prev.plannedActivities],
        planQaHistory: [newExchange, ...prev.planQaHistory],
      }));
    },

    reassignActivityAgent: (activityId, newAgentId) =>
      set((state) => ({
        plannedActivities: state.plannedActivities.map((a) =>
          a.id === activityId ? { ...a, assignedAgentId: newAgentId } : a
        ),
      })),

    updateAssetContent: (assetId, newContent, newTitle) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const updatedProposals = ws.proposals.map((a) =>
          a.id === assetId
            ? {
                ...a,
                content: newContent,
                title: newTitle !== undefined ? newTitle : a.title,
                proposal_schema: a.proposal_schema
                  ? {
                      ...a.proposal_schema,
                      asset_body: newContent,
                      title:
                        newTitle !== undefined
                          ? newTitle
                          : a.proposal_schema.title,
                    }
                  : undefined,
                updated_at: "Edited manually",
              }
            : a
        );
        const updatedWs = { ...ws, proposals: updatedProposals };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
        };
      }),

    deleteAsset: (assetId) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        const remaining = ws.proposals.filter((a) => a.id !== assetId);
        const nextSelected =
          ws.selected_proposal_id === assetId
            ? remaining[0]?.id || ""
            : ws.selected_proposal_id;
        const updatedWs: TierWorkspaceState = {
          ...ws,
          proposals: remaining,
          selected_proposal_id: nextSelected,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
        };
      }),

    createManualAsset: (platform, title, content) =>
      set((state) => {
        const tierId = state.activeTierId;
        const ws = state.tierWorkspaces[tierId];
        if (ws.reality_gate_status === "LOCKED") {
          return { isRealityGateModalOpen: true };
        }
        const id = `asset-${tierId.toLowerCase()}-${Date.now()}`;
        const stageGoal = ws.stage_goals[ws.active_stage];
        const firstQuote = state.vocVault.find(
          (q) => q.tier_id === tierId || q.tier_id === "ALL"
        );
        const created: Asset = {
          id,
          tier_id: tierId,
          stage_id: ws.active_stage,
          campaign_id: state.activeCampaignId,
          platform,
          channel_badge: platform,
          title: title || `[${ws.tier_short_name}] ${platform} Proposal`,
          content,
          detail_level_used: state.detailLevel,
          skill_used: "manual",
          updated_at: "v1 · Just now",
          hitl_state: "DRAFT",
          cmo_checklist: {
            ontario_context: false,
            single_cta: false,
            brand_trust: false,
          },
          revision_count: 1,
          versions: [
            {
              version: 1,
              content,
              single_cta: `Complete ${ws.funnel_labels[3]} (${ws.price_label})`,
              change_summary: `v1 Manual ${ws.tier_short_name} draft`,
              timestamp: "Just now",
            },
          ],
          proposal_schema: {
            proposal_id: `PROP-${tierId}-${Date.now().toString().slice(-4)}`,
            tier_id: tierId,
            stage_id: ws.active_stage,
            bottleneck_stage: ws.active_stage,
            title: title || `[${ws.tier_short_name}] ${platform} Proposal`,
            channel: platform,
            target_metric: `${stageGoal.primary_kpi_name} ≥ ${stageGoal.primary_kpi_target_pct}%`,
            cited_voc_quotes: [
              firstQuote
                ? `[${firstQuote.id} · ${firstQuote.tier_id} · ${firstQuote.context_tag}] "${firstQuote.quote_text}"`
                : '[VOC-101 · ALL · ai_cheating] "My son uses ChatGPT to finish homework in 5 mins and gets 56% on his MHF4U test."',
            ],
            single_cta: `Complete ${ws.funnel_labels[3]} (${ws.price_label})`,
            asset_body: content,
            devils_advocate: {
              primary_failure_hypothesis:
                "Parents may hesitate if this draft does not explicitly align with the selected tier's value proposition.",
              blind_spot_question:
                "Does this asset respect our cross-tier tone guardrails and cite a real VoC quote?",
            },
            kill_criteria: {
              sample_threshold: "15 target interactions",
              stop_loss_metric: `< ${stageGoal.primary_kpi_target_pct}% conversion to ${ws.funnel_labels[3]}`,
              pivot_action:
                "Refine via CMO Co-Pilot chat using the top winning touchpoint from this tier's WeeklyRealityLog.",
            },
            revision_notes: `v1 Manual draft created in ${ws.tier_name}.`,
          },
        };
        const updatedWs: TierWorkspaceState = {
          ...ws,
          proposals: [created, ...ws.proposals],
          selected_proposal_id: id,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(updatedWs),
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
                status: (c.status === "Draft"
                  ? "Approved"
                  : "Draft") as CampaignStatus,
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
  };
});
