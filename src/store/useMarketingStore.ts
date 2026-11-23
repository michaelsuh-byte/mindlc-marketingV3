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
  MonthlyTierLedgerEntry,
  OntarioTrendSignal,
  PeriodClosingStatus,
  PlanHorizon,
  PlannedActivity,
  PlanQaExchange,
  RealityGateStatus,
  StageId,
  TierId,
  TierPricingConfig,
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
  DEFAULT_TIER_PRICING,
  DEFAULT_TIER_STAGE_GOALS,
  evaluateCmoPlanQuestionAndAdjust,
  executeAutonomousAgentTask,
  formatTierPriceSummary,
  generateMarketingResponse,
  getRecommendedStageForTier,
  recalculateLedgerEntryTotals,
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

  // 3-Tier × 3-Stage Independent Workspaces
  activeTierId: TierId;
  tierWorkspaces: Record<TierId, TierWorkspaceState>;
  vocVault: VerbatimParentQuote[];

  // Active Tier Synchronized Mirrors
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

  // On-Demand Click-to-Reveal Modals & Drawers
  isStageFunnelModalOpen: boolean;
  isRealityGateModalOpen: boolean;
  isVocVaultOpen: boolean;
  isAiDrawerOpen: boolean;
  isLedgerClosingModalOpen: boolean;
  inspectedRiskProposalIds: Record<string, boolean>;

  isSampleSeedActive: boolean;
  diagnosticToast: string | null;
  pendingScopeDriftCommand: string | null;
  activeRevisionAssetId: string | null;

  // Supporting Strategic Data
  ontarioTrends: OntarioTrendSignal[];
  competitors: CompetitorProfile[];
  activeHorizon: PlanHorizon;
  agents: MarketingAgent[];
  plannedActivities: PlannedActivity[];
  planQaHistory: PlanQaExchange[];
  runningActivityId: string | null;
  isRunningTeamSprint: boolean;
  isAskingPlannerQa: boolean;

  // Tier & Stage Switching / Editing / Pricing & Ledger Actions
  setActiveTierId: (tierId: TierId) => void;
  setPaidStudentCount: (count: number) => void;
  setActiveStageOverride: (stageId: StageId) => void;
  updateTierStageGoal: (
    tierId: TierId,
    stageId: StageId,
    partialGoal: Partial<EditableStageGoal>
  ) => void;
  updateTierPricingConfig: (
    tierId: TierId,
    partialPricing: Partial<TierPricingConfig>
  ) => void;
  updateMonthlyLedgerEntry: (
    tierId: TierId,
    entryId: string,
    partialEntry: Partial<MonthlyTierLedgerEntry>
  ) => void;
  closeAndLockMonthlyLedgerPeriod: (
    tierId: TierId,
    entryId: string,
    nextStatus: PeriodClosingStatus
  ) => void;

  // On-Demand Modal & Drawer Toggles
  setStageFunnelModalOpen: (open: boolean) => void;
  setRealityGateModalOpen: (open: boolean) => void;
  setVocVaultOpen: (open: boolean) => void;
  setAiDrawerOpen: (open: boolean) => void;
  setLedgerClosingModalOpen: (open: boolean) => void;
  markProposalRiskInspected: (proposalId: string) => void;
  closeAllOverlays: () => void;

  // Navigation & Selection Actions
  setActiveTab: (tab: NavigationTab) => void;
  setSelectedProposalId: (id: string) => void;
  setActiveCampaignId: (id: string) => void;
  setSelectedSkillId: (id: string) => void;
  setDetailLevel: (level: DetailLevel) => void;
  setPreferredPlatform: (platform: AssetPlatform) => void;
  setActiveHorizon: (horizon: PlanHorizon) => void;
  setActiveRevisionAssetId: (assetId: string | null) => void;
  clearDiagnosticToast: () => void;

  // Reality Gate Actions
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

  // Co-Pilot Generation & Refinement
  sendCopilotCommand: (
    userCommand: string,
    explicitStageOverride?: boolean,
    forceNewProposal?: boolean
  ) => Promise<void>;

  // 30-Second Approval Popover Actions
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

  // Market Intel & Planner Actions
  addScannedCompetitor: (comp: CompetitorProfile) => void;
  spawnCounterActivityFromCompetitor: (compId: string) => Promise<void>;
  spawnActivityFromTrend: (trendId: string) => Promise<void>;
  dispatchAgentForActivity: (activityId: string) => Promise<void>;
  runAutonomousTeamSprint: (horizon: PlanHorizon) => Promise<void>;
  askCmoPlannerQuestion: (question: string) => Promise<void>;
  reassignActivityAgent: (activityId: string, newAgentId: string) => void;

  // Asset & Skill CRUD
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
  updateBrandPersona: (partial: Partial<BrandPersona>) => void;
}

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
// TIER 1 PROPOSALS (Online Self-Coach — 12/50 Paid)
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
    updated_at: "12 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false,
    },
    revision_count: 2,
    versions: [
      {
        version: 1,
        content: `## [Tier 1 · Online Self-Coach — Post-Diagnostic Screen v1]
Start your 24/7 AI math subscription for $39 CAD/month to unlock your diagnostic score and get unlimited homework answers.`,
        single_cta: "Subscribe for $39/mo Now",
        change_summary: "v1 Initial draft before anti-cheating Socratic framing",
        timestamp: "40 mins ago",
      },
      {
        version: 2,
        content: `## [Tier 1 · Online Self-Coach ($39 CAD/mo) — Post-Diagnostic Checkout Screen]
**100% Automated 24/7 Socratic Voice + Live LaTeX STEM HUD (Zero human scheduling required)**

### 1. Instant Post-Diagnostic Result Card (Shown Immediately on Screen)
> *"You completed 4 of 5 steps in MCR3U Quadratic Transformations, but paused when setting up the domain constraint without an answer key. As Ontario parents tell us: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his unit test.'"*

### 2. Why Students Stick With MindLC Self-Coach (Target: Day-7 Return ≥ 50%)
- **Talk Naturally, See Live LaTeX Math Steps:** No typing messy equations—speak out loud while the Socratic voice tutor plots and highlights each algebraic step on your LaTeX HUD.
- **Automated Night-Before-Quiz Missions:** Enter your next Ontario unit test date (MPM2D, MCR3U, MHF4U, SBI3U) and get a 15-minute guided Socratic warmup automatically.`,
        single_cta:
          "Unlock Instant 24/7 Socratic Voice + LaTeX HUD Access ($39 CAD/mo Self-Serve — Cancel Anytime in 1 Click)",
        change_summary:
          "Updated v2: Removed paywall before score, emphasized Socratic voice + LaTeX HUD over generic answer-giving",
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
      channel: "Self-Serve UX",
      target_metric: "Diag-to-Paid ≥ 12% & Day-7 Return ≥ 50%",
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
          "Self-serve teenagers and parents abandon checkout if they have to create an account before seeing their personalized LaTeX HUD diagnostic result.",
        blind_spot_question:
          "Is 1-click checkout embedded directly underneath the interactive LaTeX HUD diagnostic summary?",
      },
      kill_criteria: {
        sample_threshold: "100 completed free self-serve diagnostics",
        stop_loss_metric:
          "< 12% Diagnostic-to-Paid self-serve conversion OR < 50% Day-7 student return",
        pivot_action:
          "Introduce a '$1 CAD 7-Day Unit-Test Pass' on the diagnostic completion screen that auto-converts to $39 CAD/mo on Day 8.",
      },
      revision_notes:
        "Updated v2: Scoped strictly to Tier 1 Self-Serve (zero human manager or 1:1 tutor promises).",
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
    id: "t1-prop-s2-checklist",
    tier_id: "TIER_1",
    stage_id: "STAGE_2",
    campaign_id: "camp-ontario-fall",
    platform: "Community",
    channel_badge: "Lead Magnet",
    title:
      "Ontario Unit-Test Checklist (MPM2D · MCR3U · MHF4U · SBI3U) & Sibling Self-Coach Loop",
    detail_level_used: 2,
    skill_used: "ai-seo",
    updated_at: "Live",
    hitl_state: "APPROVED_FOR_EXECUTION",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: true,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `## Free Ontario Grade 10–12 Unit-Test Formula & K/T/C/A Trap Checklist
Covers the top 15 Thinking & Application traps in MPM2D, MCR3U, MHF4U, and SBI3U—plus a 1-click link to practice each problem live with MindLC's 24/7 Socratic Voice + LaTeX HUD.`,
        single_cta:
          "Open Your Free Interactive Socratic Voice + LaTeX HUD Practice Problem",
        change_summary: "v1 Approved organic checklist asset",
        timestamp: "2 days ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T1-S2-104",
      tier_id: "TIER_1",
      stage_id: "STAGE_2",
      bottleneck_stage: "STAGE_2",
      title:
        "Ontario Unit-Test Checklist (MPM2D · MCR3U · MHF4U · SBI3U) & Sibling Self-Coach Loop",
      channel: "Organic Checklists & Peer Share",
      target_metric: "Organic Leads ≥ 200/mo & Sibling/Referral ≥ 15%",
      cited_voc_quotes: [
        '[VOC-105 · TIER_1 · student_motivation] "He actually liked the voice + LaTeX math board during the free diagnostic because he didn\'t have to type out complex fractions."',
      ],
      single_cta:
        "Open Your Free Interactive Socratic Voice + LaTeX HUD Practice Problem",
      asset_body: `## Free Ontario Grade 10–12 Unit-Test Formula & K/T/C/A Trap Checklist
Covers the top 15 Thinking & Application traps in MPM2D, MCR3U, MHF4U, and SBI3U—plus a 1-click link to practice each problem live with MindLC's 24/7 Socratic Voice + LaTeX HUD.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Students download static PDFs and never click through to the interactive Socratic Voice + LaTeX HUD diagnostic.",
        blind_spot_question:
          "Does every checklist problem embed a QR code / deep link straight into that exact problem on the live LaTeX HUD?",
      },
      kill_criteria: {
        sample_threshold: "300 checklist downloads",
        stop_loss_metric: "< 20% click-through to Free Diagnostic Started",
        pivot_action:
          "Replace static PDF download with an interactive 3-question web HUD mini-quiz.",
      },
      revision_notes: "Live Stage 2 organic pull asset.",
    },
    content: `## Free Ontario Grade 10–12 Unit-Test Formula & K/T/C/A Trap Checklist
Covers the top 15 Thinking & Application traps in MPM2D, MCR3U, MHF4U, and SBI3U—plus a 1-click link to practice each problem live with MindLC's 24/7 Socratic Voice + LaTeX HUD.`,
  },
  {
    id: "t1-prop-killed",
    tier_id: "TIER_1",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Onboarding & Checkout UX",
    channel_badge: "Checkout Gate",
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
// TIER 2 PROPOSALS (Managed Hybrid — 8/25 Paid)
// ============================================================================
const V1_DEBRIEF_CONTENT = `### [v1 Initial Draft — 10-Min Parent Debrief Script]
Hi {{parent_first_name}}, your child completed the MindLC STEM diagnostic today. For $139 CAD/month, our AI coaching platform and human learning manager will help guarantee better marks on their next Ontario math and science report card. Sign up today to lock in your spot!`;

const V2_DEBRIEF_CONTENT = `### 1. First 90 Seconds: Screen-Share the Timestamped Socratic Reasoning Stall (Zero Sales Pitch)
"Hi {{parent_first_name}}, before we talk about any plan, look at Question 3 from {{student_first_name}}'s diagnostic on our live LaTeX HUD. On standard Knowledge & Understanding (K/U) steps, {{student_first_name}} is solid. The exact stall happened at 04:18 on an **Ontario Growing Success Thinking & Application (T/A)** constraint—where ChatGPT usually gives the final line in 5 seconds, leaving students blanking out on closed-book unit tests."

### 2. Why $139 CAD/mo Tier 2 Managed Hybrid Works Where $380/mo Centres Fail
- **24/7 Socratic Voice + LaTeX HUD (Never Gives the Answer Key):** Guides {{student_first_name}} step-by-step through MPM2D, MCR3U, MHF4U, and SBI3U problems out loud.
- **Dedicated Human Learning Manager + Friday Parent Scorecard:** Every Friday at 4:00 PM, your human Learning Manager reviews {{student_first_name}}'s 3 weekly 25-minute Socratic sessions and texts you a 3-bullet K/T/C/A progress scorecard.
- **30-Day Active-Habit Guarantee:** If {{student_first_name}} doesn't complete at least 3 Socratic sessions/week in Month 1, we refund 100% of your $139 CAD—no awkward phone call required.`;

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
      channel: "Parent Call",
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
    id: "asset-stage1-followup",
    tier_id: "TIER_2",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "Email",
    channel_badge: "Email",
    title:
      "72-Hr Undecided Parent Follow-Up: Socratic Trace + Friday Accountability Scorecard",
    detail_level_used: 2,
    skill_used: "copywriting",
    updated_at: "22 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: false,
      brand_trust: true,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `### Touch 1 (2 Hours Post-Debrief — Email + SMS): Your Child's MHF4U / SBI3U K/T/C/A Snapshot
**Subject:** {{student_first_name}}'s Ontario K/T/C/A Cognitive Report + 30-Day Active-Habit Guarantee

Hi {{parent_first_name}}, attached is {{student_first_name}}'s 1-page Ontario STEM Cognitive Report from today's diagnostic.

• **Your Human Learning Manager takes over the weekly accountability:** Every Monday, they message {{student_first_name}} to lock their 3 unit-test practice blocks for MHF4U / SBI3U, and every Friday at 4:00 PM you receive a 60-second completion scorecard.
• **30-Day Active-Habit Refund Guarantee:** $139 CAD/month—if your teen doesn't build a consistent 3x/week Socratic problem-solving habit in Month 1, we refund 100% of your tuition.`,
        single_cta:
          "Reply 'ACTIVATE' or tap the 1-Click Tier 2 Enrollment Link ($139 CAD/mo · 30-Day Refund Guarantee)",
        change_summary: "v1 Initial draft targeting undecided post-diagnostic parents",
        timestamp: "22 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T2-S1-1043",
      tier_id: "TIER_2",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      title:
        "72-Hr Undecided Parent Follow-Up: Socratic Trace + Friday Accountability Scorecard",
      channel: "Email",
      target_metric: "Diag → Paid ≥ 25% (Recover ≥ 20% of undecided debriefs)",
      cited_voc_quotes: [
        '[VOC-103 · TIER_2 · price] "We already burned $380/month at Mathnasium—how do I know $139/month won\'t just be another subscription he ignores after week two?"',
        '[VOC-104 · ALL · trust] "I don\'t trust services that promise a guaranteed 90% report card mark—I just want a calm system that holds my teen accountable three nights a week."',
      ],
      single_cta:
        "Reply 'ACTIVATE' or tap the 1-Click Tier 2 Enrollment Link ($139 CAD/mo · 30-Day Refund Guarantee)",
      asset_body: `### Touch 1 (2 Hours Post-Debrief — Email + SMS): Your Child's MHF4U / SBI3U K/T/C/A Snapshot
**Subject:** {{student_first_name}}'s Ontario K/T/C/A Cognitive Report + 30-Day Active-Habit Guarantee

Hi {{parent_first_name}}, attached is {{student_first_name}}'s 1-page Ontario STEM Cognitive Report from today's diagnostic.

• **Your Human Learning Manager takes over the weekly accountability:** Every Monday, they message {{student_first_name}} to lock their 3 unit-test practice blocks for MHF4U / SBI3U, and every Friday at 4:00 PM you receive a 60-second completion scorecard.
• **30-Day Active-Habit Refund Guarantee:** $139 CAD/month—if your teen doesn't build a consistent 3x/week Socratic problem-solving habit in Month 1, we refund 100% of your tuition.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Undecided parents ignore text-only follow-up emails after 24 hours once the emotional clarity of seeing the diagnostic report fades.",
        blind_spot_question:
          "Does Touch 1 include a personalized 45-second voice note or Loom video from the exact Human Learning Manager who will coach their teen?",
      },
      kill_criteria: {
        sample_threshold: "20 undecided post-diagnostic parents enrolled in sequence",
        stop_loss_metric: "< 15% recovery conversion into $139 CAD/mo Tier 2 within 72 hours",
        pivot_action:
          "Replace Email Touch 2 (Hour 24) with a direct SMS from the Human Learning Manager offering a free live 15-minute 'Night-Before-the-Unit-Test' check-in.",
      },
      revision_notes: "v1 Initial draft targeting undecided post-diagnostic parents.",
    },
    content: `### Touch 1 (2 Hours Post-Debrief — Email + SMS): Your Child's MHF4U / SBI3U K/T/C/A Snapshot
**Subject:** {{student_first_name}}'s Ontario K/T/C/A Cognitive Report + 30-Day Active-Habit Guarantee

Hi {{parent_first_name}}, attached is {{student_first_name}}'s 1-page Ontario STEM Cognitive Report from today's diagnostic.

• **Your Human Learning Manager takes over the weekly accountability:** Every Monday, they message {{student_first_name}} to lock their 3 unit-test practice blocks for MHF4U / SBI3U, and every Friday at 4:00 PM you receive a 60-second completion scorecard.
• **30-Day Active-Habit Refund Guarantee:** $139 CAD/month—if your teen doesn't build a consistent 3x/week Socratic problem-solving habit in Month 1, we refund 100% of your tuition.`,
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
      channel: "Community",
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
    updated_at: "Live · 78% Show-Up",
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
      channel: "Parent Call",
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
    content: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.

On our 10-minute call, I'll screen-share the exact step where {{student_first_name}} paused on their multi-step Thinking/Application question—and show how our Socratic AI coaches them through it without handing over the answer like ChatGPT.

👉 Single Action: Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief: {{zoom_link}}`,
  },
];

// ============================================================================
// TIER 3 PROPOSALS (Prime 1:1 Online Tutor Hybrid — 2/5 Paid · $399/mo Base 4×60m | +$250/mo Intensive $649/mo 8×60m)
// ============================================================================
const TIER_3_PROPOSALS: Asset[] = [
  {
    id: "t3-prop-consult",
    tier_id: "TIER_3",
    stage_id: "STAGE_1",
    campaign_id: "camp-ontario-fall",
    platform: "1:1 Consultation & Upgrade Script",
    channel_badge: "Consultation",
    title:
      "Flag A Overload Tier 2 → Tier 3 Prime Consultation Script ($399/mo Base 4×60m | $649/mo Intensive 8×60m)",
    detail_level_used: 3,
    skill_used: "copywriting",
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
        content: `### 1. The Flag A Overload Trigger (Why Tier 2 Families Upgrade to Tier 3 Prime)
> "During {{student_first_name}}'s MHF4U/MCV4U Socratic AI sessions this week, our system triggered a Flag A Cognitive Overload on multi-step trigonometric proofs and optimization problems. As you shared with us: 'For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI.'"

### 2. The Prime 1:1 Online Tutor Hybrid Architecture ($399/mo Base | $649/mo Intensive)
• 4 × 60-Minute Live 1:1 Online STEM Tutoring Sessions per Month ($399/mo Base | 5-Mo Pass $1,795): Surgical instruction calibrated to their exact school teacher's unit exam rubric and Waterloo CEMC extension problems (strictly 4 × 60-minute sessions/month, or upgrade with the +$250/mo Intensive Add-on to $649/mo / $2,995 5-Mo Pass for 8 × 60-minute live sessions/month).
• 24/7 Socratic AI Guided Practice Between Sessions: Ensures mastery sticks on Tuesday and Thursday nights between live sessions.
• Tutor-Integrated Monthly 15-Minute Parent Briefing: Direct OUAC Top-6 prerequisite grade tracking with your lead educator (no duplicate Learning Manager handoff; Sibling add-on +$349/mo).`,
        single_cta:
          "Reserve 1 of 3 Remaining Prime 1:1 Educator + Socratic AI Hybrid Seats ($399/mo Base for 4×60m or $649/mo Intensive for 8×60m)",
        change_summary: "v1 Initial Tier 3 Prime consultative close script ($399 base / $649 intensive)",
        timestamp: "15 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T3-S1-301",
      tier_id: "TIER_3",
      stage_id: "STAGE_1",
      bottleneck_stage: "STAGE_1",
      status: "IN_REVIEW",
      version: 1,
      title:
        "Flag A Overload Tier 2 → Tier 3 Prime Consultation Script ($399/mo Base 4×60m | $649/mo Intensive 8×60m)",
      channel: "Consultation",
      target_metric: "Consultation → Prime Close ≥ 40%",
      cited_voc_quotes: [
        '[VOC-106 · TIER_3 · curriculum] "For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI."',
        '[VOC-104 · ALL · trust] "I don\'t trust services that promise a guaranteed 90% report card mark—I just want a calm system that holds my teen accountable three nights a week."',
      ],
      single_cta:
        "Reserve 1 of 3 Remaining Prime 1:1 Educator + Socratic AI Hybrid Seats ($399/mo Base for 4×60m or $649/mo Intensive for 8×60m)",
      asset_body: `### 1. The Flag A Overload Trigger (Why Tier 2 Families Upgrade to Tier 3 Prime)
> "During {{student_first_name}}'s MHF4U/MCV4U Socratic AI sessions this week, our system triggered a Flag A Cognitive Overload on multi-step trigonometric proofs and optimization problems. As you shared with us: 'For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI.'"

### 2. The Prime 1:1 Online Tutor Hybrid Architecture ($399/mo Base | $649/mo Intensive)
• 4 × 60-Minute Live 1:1 Online STEM Tutoring Sessions per Month ($399/mo Base | 5-Mo Pass $1,795): Surgical instruction calibrated to their exact school teacher's unit exam rubric and Waterloo CEMC extension problems (strictly 4 × 60-minute sessions/month, or upgrade with the +$250/mo Intensive Add-on to $649/mo / $2,995 5-Mo Pass for 8 × 60-minute live sessions/month).
• 24/7 Socratic AI Guided Practice Between Sessions: Ensures mastery sticks on Tuesday and Thursday nights between live sessions.
• Tutor-Integrated Monthly 15-Minute Parent Briefing: Direct OUAC Top-6 prerequisite grade tracking with your lead educator (no duplicate Learning Manager handoff; Sibling add-on +$349/mo).`,
      devils_advocate: {
        primary_failure_hypothesis:
          "High-expectation Grade 11/12 parents will hesitate at $399–$649 CAD/mo if they do not see the exact credentials of the live 1:1 Ontario STEM educator and a custom week-by-week syllabus plan before the end of the consultation.",
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
        "v1 Consultative close script for Tier 3 Prime ($399/mo 4×60m base | $649/mo 8×60m intensive).",
    },
    content: `### 1. The Flag A Overload Trigger (Why Tier 2 Families Upgrade to Tier 3 Prime)
> "During {{student_first_name}}'s MHF4U/MCV4U Socratic AI sessions this week, our system triggered a Flag A Cognitive Overload on multi-step trigonometric proofs and optimization problems. As you shared with us: 'For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI.'"

### 2. The Prime 1:1 Online Tutor Hybrid Architecture ($399/mo Base | $649/mo Intensive)
• 4 × 60-Minute Live 1:1 Online STEM Tutoring Sessions per Month ($399/mo Base | 5-Mo Pass $1,795): Surgical instruction calibrated to their exact school teacher's unit exam rubric and Waterloo CEMC extension problems (strictly 4 × 60-minute sessions/month, or upgrade with the +$250/mo Intensive Add-on to $649/mo / $2,995 5-Mo Pass for 8 × 60-minute live sessions/month).
• 24/7 Socratic AI Guided Practice Between Sessions: Ensures mastery sticks on Tuesday and Thursday nights between live sessions.
• Tutor-Integrated Monthly 15-Minute Parent Briefing: Direct OUAC Top-6 prerequisite grade tracking with your lead educator (no duplicate Learning Manager handoff; Sibling add-on +$349/mo).`,
  },
  {
    id: "t3-prop-s2-vip",
    tier_id: "TIER_3",
    stage_id: "STAGE_2",
    campaign_id: "camp-ontario-fall",
    platform: "VIP Referral & Outcome Brief",
    channel_badge: "Email",
    title:
      "Anonymized Waterloo CEMC & Grade 12 MHF4U Turnaround Case Study (68% → 89%) + VIP Referral Note",
    detail_level_used: 2,
    skill_used: "copywriting",
    updated_at: "Live",
    hitl_state: "APPROVED_FOR_EXECUTION",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: true,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `### Private Case Brief: Grade 12 Advanced Functions (MHF4U) & Waterloo Euclid Prep
How an Oakville Grade 12 student moved from a 68% midterm mark to an 89% final exam score in 7 weeks by pairing 4 × 60-minute monthly live 1:1 educator proof clinics with 4x/week Socratic AI homework drills.`,
        single_cta:
          "Request a Private 15-Minute Academic Consultation for a Referred Family",
        change_summary: "v1 Approved VIP outcome brief",
        timestamp: "3 days ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-T3-S2-304",
      tier_id: "TIER_3",
      stage_id: "STAGE_2",
      bottleneck_stage: "STAGE_2",
      status: "LIVE",
      version: 1,
      title:
        "Anonymized Waterloo CEMC & Grade 12 MHF4U Turnaround Case Study (68% → 89%) + VIP Referral Note",
      channel: "Email",
      target_metric: "≥ 3 Turnaround Case Studies & VIP Referrals ≥ 30%",
      cited_voc_quotes: [
        '[VOC-106 · TIER_3 · curriculum] "For Waterloo Engineering and U of T Computer Science, she needs at least a 92% in MHF4U and MCV4U—we need a real Ontario specialist tutor 1-on-1 every week on top of the 24/7 Socratic AI."',
      ],
      single_cta:
        "Request a Private 15-Minute Academic Consultation for a Referred Family",
      asset_body: `### Private Case Brief: Grade 12 Advanced Functions (MHF4U) & Waterloo Euclid Prep
How an Oakville Grade 12 student moved from a 68% midterm mark to an 89% final exam score in 7 weeks by pairing 4 × 60-minute monthly live 1:1 educator proof clinics with 4x/week Socratic AI homework drills.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Parents distrust case studies if they don't show the actual before/after rubric breakdown.",
        blind_spot_question:
          "Does the brief include a redacted snapshot of the student's Growing Success K/T/C/A Thinking rubric jump?",
      },
      kill_criteria: {
        sample_threshold: "10 Prime families briefed",
        stop_loss_metric: "< 30% VIP referral introduction rate",
        pivot_action:
          "Have the Senior STEM Educator personally co-sign a 1-on-1 invitation letter for the parent's closest friend.",
      },
      revision_notes: "Approved Stage 2 VIP referral asset.",
    },
    content: `### Private Case Brief: Grade 12 Advanced Functions (MHF4U) & Waterloo Euclid Prep
How an Oakville Grade 12 student moved from a 68% midterm mark to an 89% final exam score in 7 weeks by pairing 4 × 60-minute monthly live 1:1 educator proof clinics with 4x/week Socratic AI homework drills.`,
  },
];

// ============================================================================
// INITIAL 3 TIER WORKSPACES (`12/50`, `8/25`, `2/5`) WITH FINALIZED PRICING & LEDGER
// ============================================================================
const INITIAL_TIER_WORKSPACES: Record<TierId, TierWorkspaceState> = {
  TIER_1: {
    tier_id: "TIER_1",
    tier_name: "Tier 1 · Online Self-Coach",
    tier_short_name: "Tier 1 · Online",
    price_label: "$39/mo | 5-mo Pass $165 | Sibling +$19/mo",
    monthly_price_cad: 39,
    pricing_config: DEFAULT_TIER_PRICING.TIER_1,
    offer_summary:
      "24/7 Socratic voice + LaTeX HUD AI coaching (fully self-serve, automated weekly email summary, no human manager).",
    target_persona:
      "Self-Serve Online Customers (Ontario Grades 9–12 STEM students & parents seeking 24/7 automated Socratic homework coaching).",
    tone_guardrail:
      "Never pitch 1-on-1 live human tutoring or dedicated human learning manager calls inside Tier 1 copy.",
    forbidden_cross_tier_claims: [
      "1-on-1 live human tutor sessions (Reserved for Tier 3)",
      "Dedicated Human Learning Manager phone calls (Reserved for Tier 2)",
    ],
    forbidden_cross_tier_keywords: [
      "1-on-1 live tutor",
      "live human tutor",
      "human learning manager call",
      "weekly live tutor",
      "1:1 educator",
      "30-minute tutor",
    ],
    funnel_labels: [
      "Visitors/Leads",
      "Free Diagnostic Started",
      "Diagnostic Completed",
      "Self-Serve Paid",
    ],
    north_star_paid_goal: 300,
    current_paid_count: 12, // 12/50 in Stage 1
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
          diag_completed: 120,
          paid_conversions: 12, // 10.0% Diag->Paid vs >=12% Stage 1 Target
        },
        top_winning_touchpoint:
          "Interactive LaTeX HUD + Socratic Voice demo on MCR3U quadratic word problems (no typing required)",
        verbatim_parent_quotes: INITIAL_VOC_VAULT.filter(
          (q) => q.tier_id === "TIER_1" || q.tier_id === "ALL"
        ),
      },
    ],
    monthly_ledger: [
      recalculateLedgerEntryTotals(
        {
          id: "ledger-t1-2026-10",
          period_month: "2026-10",
          period_label: "October 2026",
          tier_id: "TIER_1",
          active_stage: "STAGE_1",
          status: "CLOSED_AND_LOCKED",
          opening_paid_students: 0,
          new_paid_students: 6,
          churned_students: 0,
          closing_paid_students: 6,
          semester_pass_5mo_count: 1,
          sibling_addon_count: 1,
          intensive_addon_count: 0,
          reach_or_contacts: 240,
          diag_or_consult_booked: 88,
          diag_or_consult_completed: 64,
          ad_spend_cad: 0,
          recognized_mrr_cad: 0,
          semester_pass_cash_collected_cad: 0,
          total_gross_cash_cad: 0,
          blended_cac_cad: 0,
          finance_reconciliation_note:
            "Reconciled against Stripe CAD Payouts: 5 monthly subscriptions ($39) + 1 5-Mo Semester Pass ($165 upfront, $33/mo amortized MRR) + 1 Sibling Add-on (+$19/mo).",
          cmo_closing_audit_summary:
            "Stage 1 Diag-to-Paid hit 9.4% (6/64). Day-7 student return reached 54% after enabling Socratic Voice + LaTeX HUD onboarding.",
          next_month_stage_recommendation:
            "Remain in Stage 1 (0–50 paid) and remove account-wall friction before showing diagnostic scores to lift Diag-to-Paid >= 12%.",
          closed_at: "2026-10-31T18:00:00Z",
          closed_by: "Acting CMO",
        },
        DEFAULT_TIER_PRICING.TIER_1
      ),
      recalculateLedgerEntryTotals(
        {
          id: "ledger-t1-2026-11",
          period_month: "2026-11",
          period_label: "November 2026 (Current Period)",
          tier_id: "TIER_1",
          active_stage: "STAGE_1",
          status: "OPEN",
          opening_paid_students: 6,
          new_paid_students: 7,
          churned_students: 1,
          closing_paid_students: 12,
          semester_pass_5mo_count: 2,
          sibling_addon_count: 3,
          intensive_addon_count: 0,
          reach_or_contacts: 420,
          diag_or_consult_booked: 165,
          diag_or_consult_completed: 120,
          ad_spend_cad: 140,
          recognized_mrr_cad: 0,
          semester_pass_cash_collected_cad: 0,
          total_gross_cash_cad: 0,
          blended_cac_cad: 0,
          finance_reconciliation_note:
            "10 active monthly ($39) + 2 5-Mo Semester Passes ($165) + 3 Sibling seats (+$19/mo). Zero refund disputes.",
          cmo_closing_audit_summary:
            "Diag-to-Paid improved to 10.0% (12/120 cumulative, 24% towards Stage 1 $1,950 MRR milestone). Sibling add-on attachment at 25%.",
          next_month_stage_recommendation:
            "Keep Stage 1 focus on post-diagnostic checkout bridge until 12% Diag-to-Paid threshold is sustained across 100 completions.",
        },
        DEFAULT_TIER_PRICING.TIER_1
      ),
    ],
    proposals: TIER_1_PROPOSALS,
    selected_proposal_id: "t1-prop-onboarding",
  },

  TIER_2: {
    tier_id: "TIER_2",
    tier_name: "Tier 2 · Managed Hybrid",
    tier_short_name: "Tier 2 · Managed",
    price_label: "$139/mo | 5-mo Pass $590 | Sibling +$79/mo",
    monthly_price_cad: 139,
    pricing_config: DEFAULT_TIER_PRICING.TIER_2,
    offer_summary:
      "24/7 AI Socratic coaching + Growing Success (K/T/C/A) parent reports + dedicated Learning Manager accountability & monthly 20–30 min parent briefings.",
    target_persona:
      "Ontario parents of Grades 9–12 STEM students who want both 24/7 anti-cheating Socratic homework help AND a Human Learning Manager for weekly accountability.",
    tone_guardrail:
      "Emphasize 24/7 Socratic AI + Human Learning Manager accountability & Growing Success K/T/C/A reports. Never promise 4×60-min live 1:1 subject tutoring sessions (Reserved for Tier 3).",
    forbidden_cross_tier_claims: [
      "4 × 60-minute live 1:1 subject tutoring sessions with an educator (Reserved for Tier 3 Prime)",
    ],
    forbidden_cross_tier_keywords: [
      "twice-weekly live 1:1 tutor",
      "1-on-1 live subject tutor",
      "30-minute tutor",
    ],
    funnel_labels: [
      "Contacts/Leads",
      "Diag Booked",
      "Diag Completed",
      "Paid Subscriptions",
    ],
    north_star_paid_goal: 100,
    current_paid_count: 8, // 8/25 in Stage 1
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
    monthly_ledger: [
      recalculateLedgerEntryTotals(
        {
          id: "ledger-t2-2026-10",
          period_month: "2026-10",
          period_label: "October 2026",
          tier_id: "TIER_2",
          active_stage: "STAGE_1",
          status: "CLOSED_AND_LOCKED",
          opening_paid_students: 0,
          new_paid_students: 5,
          churned_students: 0,
          closing_paid_students: 5,
          semester_pass_5mo_count: 1,
          sibling_addon_count: 1,
          intensive_addon_count: 0,
          reach_or_contacts: 92,
          diag_or_consult_booked: 28,
          diag_or_consult_completed: 22,
          ad_spend_cad: 0,
          recognized_mrr_cad: 0,
          semester_pass_cash_collected_cad: 0,
          total_gross_cash_cad: 0,
          blended_cac_cad: 0,
          finance_reconciliation_note:
            "Reconciled: 4 monthly ($139) + 1 5-Mo Semester Pass ($590 upfront, $118/mo amortized MRR) + 1 Sibling Add-on (+$79/mo). 0 refunds triggered under 30-Day Active-Habit Guarantee.",
          cmo_closing_audit_summary:
            "Stage 1 Diag-to-Paid hit 22.7% (5/22). 10-minute parent debrief script out-converted email-only report delivery 3.2x.",
          next_month_stage_recommendation:
            "Stay locked in Stage 1 (0–25 paid, $3,475/mo target) and enforce 90-second live LaTeX error screen-share before quoting $139/mo.",
          closed_at: "2026-10-31T18:00:00Z",
          closed_by: "Acting CMO",
        },
        DEFAULT_TIER_PRICING.TIER_2
      ),
      recalculateLedgerEntryTotals(
        {
          id: "ledger-t2-2026-11",
          period_month: "2026-11",
          period_label: "November 2026 (Current Period)",
          tier_id: "TIER_2",
          active_stage: "STAGE_1",
          status: "OPEN",
          opening_paid_students: 5,
          new_paid_students: 3,
          churned_students: 0,
          closing_paid_students: 8,
          semester_pass_5mo_count: 2,
          sibling_addon_count: 2,
          intensive_addon_count: 0,
          reach_or_contacts: 118,
          diag_or_consult_booked: 34,
          diag_or_consult_completed: 26,
          ad_spend_cad: 0,
          recognized_mrr_cad: 0,
          semester_pass_cash_collected_cad: 0,
          total_gross_cash_cad: 0,
          blended_cac_cad: 0,
          finance_reconciliation_note:
            "6 monthly ($139) + 2 5-Mo Semester Passes ($590) + 2 Sibling seats (+$79/mo). 100% Week-4 retention across October cohort.",
          cmo_closing_audit_summary:
            "8/25 paid students active toward Stage 1 $3,475/mo milestone. Cold AI-first messaging killed via stop-loss; K/T/C/A debrief script is primary driver.",
          next_month_stage_recommendation:
            "Execute 72-Hr Undecided Parent Follow-Up sequence to lift Diag-to-Paid above 25% and cross 25 paid students.",
        },
        DEFAULT_TIER_PRICING.TIER_2
      ),
    ],
    proposals: TIER_2_PROPOSALS,
    selected_proposal_id: "asset-stage1-debrief",
  },

  TIER_3: {
    tier_id: "TIER_3",
    tier_name: "Tier 3 · Prime 1:1 Online Tutor",
    tier_short_name: "Tier 3 · Prime 1:1",
    price_label:
      "$399/mo base (4×60m) | +$250/mo Intensive ($649/mo 8×60m) | 5-mo Pass $1,795/$2,995 | Sibling +$349/mo",
    monthly_price_cad: 399,
    pricing_config: DEFAULT_TIER_PRICING.TIER_3,
    offer_summary:
      "24/7 AI coaching + 4 × 60-minute live 1:1 online STEM tutoring sessions/month (strictly 4 sessions/mo cap to prevent 4.33-week calendar margin leakage) + tutor-integrated monthly 15-min parent briefing. Optional +$250/mo Add-on ($649/mo) upgrades to 8 × 60-minute live sessions/month.",
    target_persona:
      "Grade 11–12 university-prep / high-anxiety families (MHF4U, MCV4U, SBI4U, Waterloo CEMC) & Tier 2 upsell candidates.",
    tone_guardrail:
      "Consultative, executive university-prep positioning. Strictly 4 × 60-minute (or 8 × 60-minute Intensive) live sessions/month. Never use 'cheap self-serve', discount promos, or 30-minute session framing.",
    forbidden_cross_tier_claims: [
      "Cheap self-serve / budget discount framing",
      "Coupon codes or mass-market flash sales",
      "Uncapped weekly tutoring or 30-minute sessions",
    ],
    forbidden_cross_tier_keywords: [
      "cheap self-serve",
      "budget app",
      "discount code",
      "coupon",
      "flash sale",
      "50% off",
      "30-minute tutor",
    ],
    funnel_labels: [
      "Inquiries / Tier 2 Upsell Candidates",
      "Consultation Booked",
      "Consultation Completed",
      "Prime Enrolled",
    ],
    north_star_paid_goal: 30,
    current_paid_count: 2, // 2/5 in Stage 1
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
          diag_completed: 6,
          paid_conversions: 2, // 33.3% Consult->Close vs >=40% Stage 1 Target
        },
        top_winning_touchpoint:
          "Tier 2 Flag A Cognitive Overload alert -> 1:1 Executive Consultation showing custom 6-week MHF4U/MCV4U OUAC roadmap",
        verbatim_parent_quotes: INITIAL_VOC_VAULT.filter(
          (q) => q.tier_id === "TIER_3" || q.tier_id === "ALL"
        ),
      },
    ],
    monthly_ledger: [
      recalculateLedgerEntryTotals(
        {
          id: "ledger-t3-2026-10",
          period_month: "2026-10",
          period_label: "October 2026",
          tier_id: "TIER_3",
          active_stage: "STAGE_1",
          status: "CLOSED_AND_LOCKED",
          opening_paid_students: 0,
          new_paid_students: 1,
          churned_students: 0,
          closing_paid_students: 1,
          semester_pass_5mo_count: 0,
          sibling_addon_count: 0,
          intensive_addon_count: 1,
          reach_or_contacts: 9,
          diag_or_consult_booked: 4,
          diag_or_consult_completed: 3,
          ad_spend_cad: 0,
          tutor_delivery_hours: 8,
          recognized_mrr_cad: 0,
          semester_pass_cash_collected_cad: 0,
          total_gross_cash_cad: 0,
          blended_cac_cad: 0,
          finance_reconciliation_note:
            "Reconciled: 1 Prime Base Seat ($399/mo) + 1 Intensive 8×60-min Add-on (+$250/mo) = $649 CAD MRR. Tutor delivered exactly 8.0 hours (zero 4.33-week calendar leakage).",
          cmo_closing_audit_summary:
            "First Tier 2 Flag A upgrade closed at $649/mo (33.3% Consult-to-Close). Tutor-integrated 15-min briefing eliminated duplicate manager cost.",
          next_month_stage_recommendation:
            "Target 5 Prime seats ($1,995/mo base MRR) by auditing all Tier 2 MHF4U/MCV4U students for Flag A overload 21 days before midterms.",
          closed_at: "2026-10-31T18:00:00Z",
          closed_by: "Acting CMO",
        },
        DEFAULT_TIER_PRICING.TIER_3
      ),
      recalculateLedgerEntryTotals(
        {
          id: "ledger-t3-2026-11",
          period_month: "2026-11",
          period_label: "November 2026 (Current Period)",
          tier_id: "TIER_3",
          active_stage: "STAGE_1",
          status: "OPEN",
          opening_paid_students: 1,
          new_paid_students: 1,
          churned_students: 0,
          closing_paid_students: 2,
          semester_pass_5mo_count: 0,
          sibling_addon_count: 0,
          intensive_addon_count: 1,
          reach_or_contacts: 18,
          diag_or_consult_booked: 9,
          diag_or_consult_completed: 6,
          ad_spend_cad: 0,
          tutor_delivery_hours: 12,
          recognized_mrr_cad: 0,
          semester_pass_cash_collected_cad: 0,
          total_gross_cash_cad: 0,
          blended_cac_cad: 0,
          finance_reconciliation_note:
            "2 Prime Base Seats (2 × $399 = $798) + 1 Intensive Add-on (+$250) = $1,048 CAD MRR. Total live delivery capped at 12 × 60-min sessions.",
          cmo_closing_audit_summary:
            "2/5 Prime seats filled ($1,048/mo actual MRR with Intensive add-on vs $1,995/mo Stage 1 base goal). Consult-to-Close at 33.3% vs 40% target.",
          next_month_stage_recommendation:
            "Deploy custom 6-week school-specific MHF4U/MCV4U syllabus roadmap during consultation to push Consult-to-Close >= 40%.",
        },
        DEFAULT_TIER_PRICING.TIER_3
      ),
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
];

const INITIAL_COMPETITORS: CompetitorProfile[] = [
  {
    id: "comp-kumon-mathnasium",
    name: "Franchise Learning Centres (Kumon / Mathnasium / Oxford)",
    archetype: "Franchise Learning Centre",
    websiteUrl: "https://www.mathnasium.ca",
    pricingModel: "$320–$550/month + registration fees",
    theirPrimaryPitch:
      "In-person neighbourhood math centres with structured worksheet progressions.",
    ontarioParentComplaint:
      "\"We already burned $380/month at Mathnasium—my Grade 11 teen sat filling out generic worksheets while a college student watched 5 kids at once.\"",
    structuralWeakness:
      "Poorly equipped for Ontario Grades 9–12 Growing Success (K/T/C/A) Thinking & Application word problems and closed at 9:45 PM.",
    mindlcCounterWedge:
      "3-Tier Ontario STEM Fit: Tier 1 Self-Coach ($39/mo), Tier 2 Managed Hybrid ($139/mo with Human Learning Manager), or Tier 3 Prime 1:1 Educator Hybrid ($349/mo).",
    recommendedConversionPlay:
      "Use the '$380/mo Worksheet Centre vs. MindLC K/T/C/A System' anchor table in diagnostic debriefs.",
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
];

const INITIAL_PLANNED_ACTIVITIES: PlannedActivity[] = [
  {
    id: "act-t2-daily",
    tier_id: "TIER_2",
    horizon: "Daily",
    timeWindow: "Today · Tier 2 Stage 1 Priority",
    title:
      "[Tier 2 · Managed] Deploy 10-Min Parent Debrief Script with Growing Success (K/T/C/A) Error Trace ($139 CAD/mo)",
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
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "msg-welcome",
    tierId: "TIER_2",
    proposalId: "asset-stage1-debrief",
    sender: "ai",
    timestamp: "8 mins ago",
    skillName: "cro",
    detailLevel: 2,
    linkedAssetId: "asset-stage1-debrief",
    linkedPlatform: "Parent Call",
    changeSummaryPill:
      "Updated v2: Removed grade guarantee, added Growing Success K/T/C/A breakdown & anchored single CTA",
    strategicJustification: {
      detailLevel: 2,
      levelLabel: "Level 2: Standard Rationale",
      headlineSummary:
        "AI Co-Pilot Drawer Ready — Refine Copy Side-by-Side Without Screen Clutter",
      rationaleBody:
        "Click any of the 3 quick-steer chips below (or type a custom instruction) to generate `v3` while reading the live draft on the left. Press `Esc` or click `X` anytime to close this drawer.",
      frameworksApplied: [
        "Stage 1 Conversion Lock",
        "Growing Success (K/T/C/A)",
        "VoC Grounding",
      ],
    },
  },
];

function syncMirrorsFromTier(ws: TierWorkspaceState) {
  return {
    assets: ws.proposals,
    selectedProposalId: ws.selected_proposal_id || ws.proposals[0]?.id || "",
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
        "3-Tier Ontario STEM Architecture ($39 Online · $139 Managed · $349 Prime 1:1)",
      targetAudience:
        "Ontario parents & students in Grades 9–12 STEM (MPM2D, MCR3U, MHF4U, MCV4U, SBI3U, SCH4U, SPH4U).",
      coreHook:
        "Tier 1: 24/7 Socratic Voice + LaTeX HUD Self-Coach ($39/mo) | Tier 2: Managed Hybrid with Growing Success K/T/C/A Reports & Human Learning Manager ($139/mo) | Tier 3: Prime 1:1 Live Online Educator + 24/7 Socratic AI ($349/mo).",
      curriculumFocus:
        "Ontario Ministry of Education Grades 9–12 STEM & Growing Success (K/T/C/A) Achievement Chart.",
      brandVoice:
        "Calm Ontario educator advisory tone, strict tier isolation, zero exaggerated grade guarantees.",
      antiPersonaObjections:
        "VOC-101 (ai_cheating), VOC-102 (K/T/C/A curriculum), VOC-103 ($139 vs $380 Mathnasium), VOC-105 (Tier 1 LaTeX HUD self-serve), VOC-106 (Tier 3 Waterloo/U of T 1:1 depth).",
      geminiModel: "gemini-2.5-pro (3-Tier × 3-Stage Isolated Context v3.0)",
    },

    isStageFunnelModalOpen: false,
    isRealityGateModalOpen: false,
    isVocVaultOpen: false,
    isAiDrawerOpen: false,
    isLedgerClosingModalOpen: false,
    inspectedRiskProposalIds: {},

    isSampleSeedActive: true,
    diagnosticToast: null,
    pendingScopeDriftCommand: null,

    ontarioTrends: INITIAL_ONTARIO_TRENDS,
    competitors: INITIAL_COMPETITORS,
    activeHorizon: "Daily",
    agents: INITIAL_AGENTS,
    plannedActivities: INITIAL_PLANNED_ACTIVITIES,
    planQaHistory: [],
    runningActivityId: null,
    isRunningTeamSprint: false,
    isAskingPlannerQa: false,

    // Switching Tier Tabs cleanly loads that tier's state and closes open drawers!
    setActiveTierId: (tierId) =>
      set((state) => {
        const ws = state.tierWorkspaces[tierId];
        return {
          activeTierId: tierId,
          activeTab: "copilot",
          ...syncMirrorsFromTier(ws),
          isAiDrawerOpen: false,
          isVocVaultOpen: false,
          isStageFunnelModalOpen: false,
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
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
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
          diagnosticToast: `Updated ${ws.tier_short_name} ${stageId} target: ${updatedGoal.primary_kpi_name} ≥ ${updatedGoal.primary_kpi_target_pct}% (Target: ${updatedGoal.target_paid_count} students).`,
        };
      }),

    updateTierPricingConfig: (tierId, partialPricing) =>
      set((state) => {
        const ws = state.tierWorkspaces[tierId];
        const updatedPricing: TierPricingConfig = {
          ...ws.pricing_config,
          ...partialPricing,
        };
        const updatedLedger = ws.monthly_ledger.map((entry) =>
          recalculateLedgerEntryTotals(entry, updatedPricing)
        );
        const updatedWs: TierWorkspaceState = {
          ...ws,
          monthly_price_cad: updatedPricing.base_monthly_cad,
          pricing_config: updatedPricing,
          price_label: formatTierPriceSummary(tierId, updatedPricing),
          monthly_ledger: updatedLedger,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(
            tierId === state.activeTierId
              ? updatedWs
              : state.tierWorkspaces[state.activeTierId]
          ),
          diagnosticToast: `Updated ${ws.tier_short_name} unit pricing & dynamically recalculated all Stage MRR, Quarterly, ARR, and Monthly Ledger totals.`,
        };
      }),

    updateMonthlyLedgerEntry: (tierId, entryId, partialEntry) =>
      set((state) => {
        const ws = state.tierWorkspaces[tierId];
        const updatedLedger = ws.monthly_ledger.map((entry) => {
          if (entry.id !== entryId) return entry;
          return recalculateLedgerEntryTotals(
            { ...entry, ...partialEntry },
            ws.pricing_config
          );
        });
        const latestOpen = updatedLedger[updatedLedger.length - 1];
        const updatedPaidCount = latestOpen
          ? latestOpen.closing_paid_students
          : ws.current_paid_count;
        const updatedWs: TierWorkspaceState = {
          ...ws,
          current_paid_count: updatedPaidCount,
          monthly_ledger: updatedLedger,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          ...syncMirrorsFromTier(
            tierId === state.activeTierId
              ? updatedWs
              : state.tierWorkspaces[state.activeTierId]
          ),
        };
      }),

    closeAndLockMonthlyLedgerPeriod: (tierId, entryId, nextStatus) =>
      set((state) => {
        const ws = state.tierWorkspaces[tierId];
        const updatedLedger = ws.monthly_ledger.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: nextStatus,
                closed_at:
                  nextStatus === "CLOSED_AND_LOCKED"
                    ? new Date().toISOString()
                    : entry.closed_at,
                closed_by: "Acting CMO",
              }
            : entry
        );
        const updatedWs: TierWorkspaceState = {
          ...ws,
          monthly_ledger: updatedLedger,
        };
        return {
          tierWorkspaces: { ...state.tierWorkspaces, [tierId]: updatedWs },
          diagnosticToast: `[${ws.tier_short_name}] Monthly Ledger Period updated to ${nextStatus}.`,
        };
      }),

    setStageFunnelModalOpen: (open) =>
      set({
        isStageFunnelModalOpen: open,
        isRealityGateModalOpen: open ? false : get().isRealityGateModalOpen,
        isLedgerClosingModalOpen: open ? false : get().isLedgerClosingModalOpen,
      }),

    setRealityGateModalOpen: (open) =>
      set({
        isRealityGateModalOpen: open,
        isStageFunnelModalOpen: open ? false : get().isStageFunnelModalOpen,
        isLedgerClosingModalOpen: open ? false : get().isLedgerClosingModalOpen,
      }),

    setVocVaultOpen: (open) =>
      set({
        isVocVaultOpen: open,
        isAiDrawerOpen: open ? false : get().isAiDrawerOpen,
      }),

    setAiDrawerOpen: (open) =>
      set({
        isAiDrawerOpen: open,
        isVocVaultOpen: open ? false : get().isVocVaultOpen,
      }),

    setLedgerClosingModalOpen: (open) =>
      set({
        isLedgerClosingModalOpen: open,
        isStageFunnelModalOpen: open ? false : get().isStageFunnelModalOpen,
        isRealityGateModalOpen: open ? false : get().isRealityGateModalOpen,
      }),

    markProposalRiskInspected: (proposalId) =>
      set((state) => ({
        inspectedRiskProposalIds: {
          ...state.inspectedRiskProposalIds,
          [proposalId]: true,
        },
      })),

    closeAllOverlays: () =>
      set({
        isStageFunnelModalOpen: false,
        isRealityGateModalOpen: false,
        isVocVaultOpen: false,
        isAiDrawerOpen: false,
        isLedgerClosingModalOpen: false,
      }),

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
    clearDiagnosticToast: () => set({ diagnosticToast: null }),

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

        for (const extraTier of payload.alsoUnlockTiers || []) {
          if (extraTier !== activeTier) {
            updatedWorkspaces[extraTier] = {
              ...updatedWorkspaces[extraTier],
              reality_gate_status: "UNLOCKED",
            };
          }
        }

        const toastMsg = isBelowTarget
          ? `[${ws.tier_short_name}] Bottleneck: ${ws.funnel_labels[2]} → ${ws.funnel_labels[3]} is ${rates.completedToPaidPct}% (Target ≥ ${stageGoal.primary_kpi_target_pct}%). Proposals unlocked & calibrated.`
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

      const tierVocQuotes = state.vocVault
        .filter((q) => q.tier_id === tierId || q.tier_id === "ALL")
        .slice(0, 8);

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
            isAiDrawerOpen: true,
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
          diagnosticToast: `[${ws.tier_short_name}] Approved & Locked "${target?.title?.slice(0, 46)}..."`,
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
        tacticalExecution: `Target Ontario parents comparing ${comp.name} against ${ws.tier_name}.`,
        deliverableSpec: `Comparison Battlecard vs. ${comp.name}`,
        marketTrigger: `Competitor gap identified in ${comp.name}`,
        courseCodesTargeted: ["MHF4U", "SBI3U", "MCR3U", "MPM2D"],
        assignedAgentId: "agent-cro",
        skillName: "cro",
        targetPlatform: "Parent Call",
        funnelObjective: "Conversion Optimization",
        targetKpi: `${ws.stage_goals[ws.active_stage].primary_kpi_name} >= ${ws.stage_goals[ws.active_stage].primary_kpi_target_pct}%`,
        status: "Queued",
        adjustedByCmo: true,
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
        tacticalExecution: `${trend.recommendedCmoAction} Scoped strictly to ${ws.tier_name}.`,
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
            change_summary: `v1 Drafted autonomously by ${agent.codeName}`,
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
