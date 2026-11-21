import { create } from "zustand";
import {
  ActiveBottleneckStage,
  Asset,
  AssetPlatform,
  BrandPersona,
  Campaign,
  CampaignStatus,
  ChatMessage,
  CMOApprovalChecklist,
  CompetitorProfile,
  DetailLevel,
  HITLProposalState,
  MarketingAgent,
  MarketingSkill,
  OntarioTrendSignal,
  PlanHorizon,
  PlannedActivity,
  PlanQaExchange,
  RealityGateStatus,
  UserRecord,
  VerbatimParentQuote,
  WeeklyFunnelMetrics,
  WeeklyRealityLog,
} from "@/types/database";
import {
  checkBottleneckScopeDrift,
  computeFunnelRates,
  evaluateCmoPlanQuestionAndAdjust,
  executeAutonomousAgentTask,
  generateMarketingResponse,
  getBottleneckStageForStudents,
} from "@/services/marketingAi";

export type NavigationTab =
  | "copilot" // Default: 3-Level Macro -> Meso -> Micro Executive Cockpit
  | "planner" // 5-Horizon CMO Planner & Autonomous Agents
  | "intel" // Ontario Market & Competitor Intel
  | "skills" // Skill Library CRUD
  | "settings" // AI Settings & Persona
  | "dashboard";

interface MarketingState {
  activeTab: NavigationTab;
  currentUser: UserRecord;
  skills: MarketingSkill[];
  campaigns: Campaign[];
  assets: Asset[];
  selectedProposalId: string;
  activeCampaignId: string;
  selectedSkillId: string;
  detailLevel: DetailLevel;
  preferredPlatform: AssetPlatform;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  lastHighlightedAssetId: string | null;
  brandPersona: BrandPersona;

  // SAFEGUARD 1: Weekly Reality Gate & VoC Vault State
  realityGateStatus: RealityGateStatus;
  pilotWeek0Used: boolean;
  weeklyRealityLogs: WeeklyRealityLog[];
  isRealityGateModalOpen: boolean;
  isVocVaultOpen: boolean;
  isSampleSeedActive: boolean;
  diagnosticToast: string | null;

  // SAFEGUARD 2: Single-Bottleneck Lock-In Engine (0-100 Paid Students @ $139 CAD/mo)
  paidStudentCount: number;
  activeBottleneckStage: ActiveBottleneckStage;
  pendingScopeDriftCommand: string | null;

  // SAFEGUARD 3 & 4: Conversational Refinement & HITL State Machine
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

  // Safeguard 1 Actions (Weekly Reality Gate)
  setRealityGateModalOpen: (open: boolean) => void;
  toggleRealityGateLockSimulation: () => void;
  submitWeeklyRealityLog: (payload: {
    week_start_date: string;
    funnel_metrics: WeeklyFunnelMetrics;
    verbatim_parent_quotes: Omit<
      VerbatimParentQuote,
      "id" | "week_start_date"
    >[];
    top_winning_touchpoint: string;
  }) => void;
  activatePilotWeek0Override: () => void;

  // Safeguard 2 Actions (Single-Bottleneck Lock-In Engine)
  setPaidStudentCount: (count: number) => void;

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

const INITIAL_REALITY_LOGS: WeeklyRealityLog[] = [
  {
    id: "wrl-2026-11-16",
    week_start_date: "2026-11-16",
    created_at: "2026-11-16T09:00:00Z",
    is_sample: true,
    funnel_metrics: {
      reach_or_contacts: 64,
      diag_booked: 18,
      diag_completed: 14,
      paid_conversions: 2, // 14.3% Diag->Paid (Underperforming vs >=25% target -> auto-highlighted in Amber/Red!)
    },
    top_winning_touchpoint:
      "10-min Zoom parent debrief screen-sharing the student's timestamped Socratic stall on Question 4 (MHF4U Advanced Functions word problem)",
    verbatim_parent_quotes: [
      {
        id: "VOC-101",
        context_tag: "ai_cheating",
        week_start_date: "2026-11-16",
        is_sample: true,
        quote_text:
          "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test because he blanks out on closed-book problems.",
      },
      {
        id: "VOC-102",
        context_tag: "curriculum",
        week_start_date: "2026-11-16",
        is_sample: true,
        quote_text:
          "Her teacher marks Ontario K/T/C/A Thinking and Application questions super strictly—generic tutoring worksheets don't match Grade 11 SBI3U Biology or MCR3U Functions tests.",
      },
      {
        id: "VOC-103",
        context_tag: "price",
        week_start_date: "2026-11-16",
        is_sample: true,
        quote_text:
          "We already burned $380/month at Mathnasium—how do I know $139/month won't just be another subscription he ignores after week two?",
      },
      {
        id: "VOC-104",
        context_tag: "trust",
        week_start_date: "2026-11-16",
        is_sample: true,
        quote_text:
          "I don't trust services that promise a guaranteed 90% report card mark—I just want a calm professional who holds my teen accountable three nights a week.",
      },
      {
        id: "VOC-105",
        context_tag: "student_motivation",
        week_start_date: "2026-11-16",
        is_sample: true,
        quote_text:
          "If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn't save me any stress.",
      },
    ],
  },
];

const INITIAL_SKILLS: MarketingSkill[] = [
  {
    id: "skill-cro",
    skill_name: "cro",
    category: "Stage 1 Debrief & Diagnostic CRO",
    system_prompt:
      "You are a Conversion Rate Optimization (CRO) Lead focused on lifting Diagnostic Completed -> Paid Conversion (>= 25%) for MindLC ($139 CAD/mo Tier 2 Managed Hybrid). Optimize Cognitive Reports, 10-minute parent debrief call scripts, and 30-day risk-free guarantee framing.",
  },
  {
    id: "skill-copywriting",
    skill_name: "copywriting",
    category: "Stage 1–3 Conversion Copy",
    system_prompt:
      "You are an elite EdTech conversion copywriter trained on PAS, JTBD Four Forces, and VoC mirroring. Write high-converting assets for MindLC's Tier 2 Managed Hybrid Plan ($139 CAD/month) targeting the first 100 paid Ontario Grades 9–12 STEM students.",
  },
  {
    id: "skill-copy-editing",
    skill_name: "copy-editing",
    category: "Seven-Sweeps VoC Polish",
    system_prompt:
      "You are a ruthless Seven-Sweeps Copy Editor. Audit and rewrite MindLC proposals across Clarity, Ontario K/T/C/A Rubric Alignment, Specificity ($139 CAD/mo vs $80/hr weekly tutors), and Single Lock-Step CTA.",
  },
  {
    id: "skill-social-content",
    skill_name: "social-content",
    category: "Stage 2–3 GTA Parent Community & Ads",
    system_prompt:
      "You are a GTA Ontario Parent Community & Ad Strategist (Mississauga, Oakville, Markham, Toronto). Use calm, high-trust hooks rooted in verbatim WeeklyRealityLog parent quotes and hold Blended CAC < $150 CAD.",
  },
  {
    id: "skill-ai-seo",
    skill_name: "ai-seo",
    category: "Ontario Course-Code Lead Magnets & AEO",
    system_prompt:
      "You are an Ontario STEM Curriculum Lead Magnet & AI-SEO Architect targeting MPM2D, MCR3U, MHF4U, MCV4U, and SBI3U unit-test prep.",
  },
];

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-ontario-fall",
    title: "First 100 Paid Students ($139 CAD/mo Tier 2 Managed Hybrid)",
    status: "Approved",
    created_at: "2026-11-01T14:00:00Z",
  },
];

const V1_DEBRIEF_CONTENT = `## 1. Cognitive Diagnostic Report Header (Minutes 0–2)
**Ontario STEM Focus:** Grade 11/12 MHF4U (Advanced Functions) · MCR3U · SBI3U (Biology)
**Diagnostic Gap Identified:** Procedural Recall is **80%**, but **Multi-Step Problem Decomposition is 44%**.

## 2. 10-Minute Parent Debrief Call Script
### Minutes 0–3: Show the Homework-to-Test Gap
> *"Look at Question 4 on {{student_first_name}}'s diagnostic. When our Socratic AI withheld the final answer, he stalled at step 2. That's why ChatGPT homework shortcuts hurt unit test marks."*

### Minutes 3–10: Pitch Tier 2 Managed Hybrid ($139 CAD/month)
> *"Our Tier 2 Managed Hybrid Plan ($139 CAD/month) pairs 24/7 Socratic AI hints with a weekly Human Learning Manager. Sign up today for guaranteed grade improvements!"*`;

const V2_DEBRIEF_CONTENT = `## 1. Cognitive Diagnostic Report Visual Header (Minutes 0–2)
**Ontario STEM Courses Audited:** Grade 11/12 MHF4U (Advanced Functions) · MCR3U (Functions) · SBI3U (Biology)
**Ontario K/T/C/A Achievement Chart Breakdown:**
- **Knowledge & Understanding (K/U — 35% weight):** **82%** (Formulas recalled accurately on take-home work)
- **Thinking, Investigation & Application (T/I & A — 50% weight):** **44%** (Stalls on unassisted multi-step closed-book unit test problems)

---

## 2. 10-Minute Parent Debrief Call Script (Calm Ontario Educator Advisory Tone)
### Minutes 0–3: Mirror Exact Parent VoC & Screen-Share Timestamped Socratic Stall
> *"Look at Question 4 on {{student_first_name}}'s Cognitive Report. You mentioned earlier: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U unit test.' Right here at the 110-second mark, when our Socratic AI withheld the final solution and asked him to set up the domain constraint himself, he froze. That K/T/C/A Thinking & Application gap explains the exact 25-point drop on closed-book school unit tests."*

### Minutes 3–7: Present Tier 2 Managed Hybrid Plan ($139 CAD/month) vs. $380/mo Centres
> *"At $80/hr, a private tutor ($320+/mo) is only there 1 hour a week—not at 9:45 PM on Tuesday before Wednesday's MHF4U test. Our **Tier 2 Managed Hybrid Plan ($139 CAD/month — $4.63/day)** pairs:*
> 1. **24/7 Socratic AI STEM Coach:** Aligned to Ontario K/T/C/A rubrics. Never gives the final answer—prompts your teen with step-by-step guiding questions.
> 2. **Dedicated Human Learning Manager:** Reviews {{student_first_name}}'s Socratic logs every week, assigns targeted Ontario unit-test prep, and sends you a Friday parent accountability summary."*

### Minutes 7–10: 30-Day Active-Habit Guarantee (Zero Exaggerated Grade Hype)
> *"You also asked: 'How do I know $139/month won't just be another subscription he ignores after week two?' We never make fake grade-percentage promises. Instead, under our **30-Day Active-Habit Guarantee**, if your Human Learning Manager doesn't get {{student_first_name}} completing 3+ Socratic problem-solving sessions a week in Month 1, you get a 100% tuition refund with one email."*`;

const INITIAL_ASSETS: Asset[] = [
  // 🟡 1. AWAITING CMO DECISION (Default Selected in Level 3 Cockpit)
  {
    id: "asset-stage1-debrief",
    campaign_id: "camp-ontario-fall",
    platform: "Parent Call",
    channel_badge: "Parent Call",
    title:
      "10-Min Parent Debrief Script & K/T/C/A Cognitive Report Close ($139 CAD/mo)",
    detail_level_used: 3,
    skill_used: "cro",
    agent_author: "Agent-04 · Stage-1 CRO",
    updated_at: "8 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false, // 2/3 checked so CMO can click the 3rd box and test the 30-Second Approval Dock immediately!
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
          "Updated v2: Removed grade guarantee, added Ontario K/T/C/A breakdown, and anchored single CTA to 30-day active-habit seat",
        timestamp: "8 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-S1-1042",
      title:
        "10-Min Parent Debrief Script & K/T/C/A Cognitive Report Close ($139 CAD/mo)",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Parent Call (10-Min Zoom Diagnostic Debrief)",
      target_metric: "Diag → Paid ≥ 25% (Current: 14.3%)",
      cited_voc_quotes: [
        '[VOC-101 · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test because he blanks out on closed-book problems."',
        '[VOC-102 · curriculum] "Her teacher marks Ontario K/T/C/A Thinking and Application questions super strictly—generic tutoring worksheets don\'t match Grade 11 SBI3U Biology or MCR3U Functions tests."',
        '[VOC-103 · price] "We already burned $380/month at Mathnasium—how do I know $139/month won\'t just be another subscription he ignores after week two?"',
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

  // 🟡 2. AWAITING CMO DECISION (Post-Diagnostic Email Follow-Up)
  {
    id: "asset-stage1-followup",
    campaign_id: "camp-ontario-fall",
    platform: "Email",
    channel_badge: "Email",
    title:
      "72-Hr Undecided Parent Follow-Up: Socratic Trace + Friday Accountability Scorecard",
    detail_level_used: 2,
    skill_used: "copywriting",
    agent_author: "Agent-05 · Lifecycle",
    updated_at: "22 mins ago",
    hitl_state: "DRAFT",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: false,
      brand_trust: true,
    },
    devils_advocate_verified: false,
    kill_criteria_acknowledged: false,
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `### Touch 1 (2 Hours Post-Debrief — Email + SMS): Your Child's MHF4U / SBI3U K/T/C/A Snapshot
**Subject:** {{student_first_name}}'s Ontario K/T/C/A Cognitive Report + 30-Day Active-Habit Guarantee

Hi {{parent_first_name}}, attached is {{student_first_name}}'s 1-page Ontario STEM Cognitive Report from today's diagnostic.

To directly address what you shared on our call (*"If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn't save me any stress"*):
• **Your Human Learning Manager takes over the weekly accountability:** Every Monday, they message {{student_first_name}} to lock their 3 unit-test practice blocks for MHF4U / SBI3U, and every Friday at 4:00 PM you receive a 60-second completion scorecard.
• **30-Day Active-Habit Refund Guarantee:** $139 CAD/month—if your teen doesn't build a consistent 3x/week Socratic problem-solving habit in Month 1, we refund 100% of your tuition.`,
        single_cta:
          "Reply 'ACTIVATE' or tap the 1-Click Tier 2 Enrollment Link ($139 CAD/mo · 30-Day Refund Guarantee) to assign your Human Learning Manager",
        change_summary: "v1 Initial draft targeting undecided post-diagnostic parents",
        timestamp: "22 mins ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-S1-1043",
      title:
        "72-Hr Undecided Parent Follow-Up: Socratic Trace + Friday Accountability Scorecard",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Email (72-Hr Post-Debrief Recovery)",
      target_metric: "Diag → Paid ≥ 25% (Recover ≥ 20% of undecided debriefs)",
      cited_voc_quotes: [
        '[VOC-105 · student_motivation] "If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn\'t save me any stress."',
        '[VOC-104 · trust] "I don\'t trust services that promise a guaranteed 90% report card mark—I just want a calm professional who holds my teen accountable three nights a week."',
      ],
      single_cta:
        "Reply 'ACTIVATE' or tap the 1-Click Tier 2 Enrollment Link ($139 CAD/mo · 30-Day Refund Guarantee) to assign your Human Learning Manager",
      asset_body: `### Touch 1 (2 Hours Post-Debrief — Email + SMS): Your Child's MHF4U / SBI3U K/T/C/A Snapshot
**Subject:** {{student_first_name}}'s Ontario K/T/C/A Cognitive Report + 30-Day Active-Habit Guarantee

Hi {{parent_first_name}}, attached is {{student_first_name}}'s 1-page Ontario STEM Cognitive Report from today's diagnostic.

To directly address what you shared on our call (*"If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn't save me any stress"*):
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

To directly address what you shared on our call (*"If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn't save me any stress"*):
• **Your Human Learning Manager takes over the weekly accountability:** Every Monday, they message {{student_first_name}} to lock their 3 unit-test practice blocks for MHF4U / SBI3U, and every Friday at 4:00 PM you receive a 60-second completion scorecard.
• **30-Day Active-Habit Refund Guarantee:** $139 CAD/month—if your teen doesn't build a consistent 3x/week Socratic problem-solving habit in Month 1, we refund 100% of your tuition.`,
  },

  // 🔴 3. KILL-CRITERIA TRIGGERED (Pinned to top of Left Rail Queue!)
  {
    id: "asset-killed-stoploss",
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
      proposal_id: "PROP-S1-0988",
      title:
        "Generic '24/7 AI Math Bot' Cold Parent Message (Breached <15% Diag-to-Paid Stop-Loss)",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Community (Parent Direct Message)",
      target_metric: "Diag → Paid ≥ 25% (Actual: 14.3% — BREACHED)",
      cited_voc_quotes: [
        '[VOC-101 · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test because he blanks out on closed-book problems."',
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
          "MANDATORY PIVOT: Lead with 'Human Learning Manager Accountability + Anti-Cheating Socratic K/T/C/A Diagnostic' (See PROP-S1-1042).",
      },
      revision_notes:
        "BREACHED STOP-LOSS: Flagged automatically by Weekly Reality Gate when Diag->Paid hit 14.3% (2/14).",
    },
    content: `Struggling with Ontario high school math? Try MindLC's 24/7 AI Math Tutor for $139/month! Instant help on any math homework problem whenever your teen needs it.`,
  },

  // 🟢 4. APPROVED / LIVE
  {
    id: "asset-approved-live",
    campaign_id: "camp-ontario-fall",
    platform: "Parent Call",
    channel_badge: "Parent Call",
    title:
      "Pre-Debrief SMS Reminder: 60-Sec Socratic Hint vs. ChatGPT Answer Comparison",
    detail_level_used: 2,
    skill_used: "cro",
    agent_author: "Agent-04 · Stage-1 CRO",
    updated_at: "Live · Target Met (86% Show-Up)",
    hitl_state: "APPROVED_FOR_EXECUTION",
    is_sample: true,
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: true,
    },
    devils_advocate_verified: true,
    kill_criteria_acknowledged: true,
    revision_count: 2,
    versions: [
      {
        version: 1,
        content: `Hi {{parent_first_name}}, reminder for your MindLC diagnostic debrief today at {{call_time}}.`,
        single_cta: "Join Zoom Debrief Link",
        change_summary: "v1 Plain calendar reminder",
        timestamp: "5 days ago",
      },
      {
        version: 2,
        content: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.

On our 10-minute call, I'll screen-share the exact step where {{student_first_name}} paused on their multi-step Thinking/Application question—and show how our Socratic AI coaches them through it without handing over the answer like ChatGPT.

👉 Single Action: Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief: {{zoom_link}}`,
        single_cta:
          "Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief",
        change_summary:
          "Updated v2: Added K/T/C/A screen-share teaser to boost parent debrief show-up rate to 86%",
        timestamp: "2 days ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-S1-1019",
      title:
        "Pre-Debrief SMS Reminder: 60-Sec Socratic Hint vs. ChatGPT Answer Comparison",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Parent Call (SMS Pre-Framing)",
      target_metric: "Diag Booked → Completed ≥ 75% (Current: 78% ✓)",
      cited_voc_quotes: [
        '[VOC-101 · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test."',
      ],
      single_cta:
        "Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief",
      asset_body: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.

On our 10-minute call, I'll screen-share the exact step where {{student_first_name}} paused on their multi-step Thinking/Application question—and show how our Socratic AI coaches them through it without handing over the answer like ChatGPT.

👉 Single Action: Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief: {{zoom_link}}`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Busy GTA parents skip Zoom debriefs if they think it is a 45-minute high-pressure timeshare pitch.",
        blind_spot_question:
          "Does the SMS explicitly promise a strict 10-minute clinical walkthrough of their child's K/T/C/A report?",
      },
      kill_criteria: {
        sample_threshold: "20 booked diagnostic parents",
        stop_loss_metric: "< 70% diagnostic debrief attendance rate",
        pivot_action:
          "Offer an async 3-minute Loom walkthrough of the Cognitive Report via WhatsApp before scheduling live call.",
      },
      revision_notes: "Live and performing at 78% show-up rate (14/18).",
    },
    content: `Hi {{parent_first_name}} — looking forward to reviewing {{student_first_name}}'s Ontario K/T/C/A STEM Diagnostic today at {{call_time}}.

On our 10-minute call, I'll screen-share the exact step where {{student_first_name}} paused on their multi-step Thinking/Application question—and show how our Socratic AI coaches them through it without handing over the answer like ChatGPT.

👉 Single Action: Tap here at {{call_time}} to join your 10-Min Cognitive Report Debrief: {{zoom_link}}`,
  },

  // ⚪ 5. ARCHIVED / KILLED (Institutional Memory)
  {
    id: "asset-archived-hype",
    campaign_id: "camp-ontario-fall",
    platform: "Landing Page",
    channel_badge: "Landing Page",
    title:
      "Rejected Draft: 'Guaranteed 90%+ in Grade 12 MHF4U in 30 Days' Headline",
    detail_level_used: 1,
    skill_used: "copywriting",
    agent_author: "Agent-03 · Paid Social",
    updated_at: "Archived by CMO",
    hitl_state: "ARCHIVED",
    is_sample: true,
    kill_or_reject_reason:
      "Rejected by Acting CMO during 30s Approval Checklist: Violated Brand Trust rule (VOC-104 shows Ontario parents distrust guaranteed 90% mark claims).",
    cmo_checklist: {
      ontario_context: true,
      single_cta: true,
      brand_trust: false,
    },
    revision_count: 1,
    versions: [
      {
        version: 1,
        content: `Guaranteed 90%+ in Grade 12 Advanced Functions (MHF4U) in 30 Days or Double Your Money Back!`,
        single_cta: "Claim Your 90% Grade Guarantee Now",
        change_summary: "v1 Rejected for exaggerated grade guarantee",
        timestamp: "1 week ago",
      },
    ],
    proposal_schema: {
      proposal_id: "PROP-S1-0940",
      title:
        "Rejected Draft: 'Guaranteed 90%+ in Grade 12 MHF4U in 30 Days' Headline",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Landing Page",
      target_metric: "Diag → Paid ≥ 25%",
      cited_voc_quotes: [
        '[VOC-104 · trust] "I don\'t trust services that promise a guaranteed 90% report card mark—I just want a calm professional who holds my teen accountable three nights a week."',
      ],
      single_cta: "Claim Your 90% Grade Guarantee Now",
      asset_body: `Guaranteed 90%+ in Grade 12 Advanced Functions (MHF4U) in 30 Days or Double Your Money Back!`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Directly contradicts VOC-104—skeptical Ontario parents immediately bounce when they see unrealistic grade guarantees.",
        blind_spot_question:
          "Are we guaranteeing an outcome we don't control (school teacher grading) instead of an input we DO control (3x/week Socratic habit)?",
      },
      kill_criteria: {
        sample_threshold: "Rejected pre-launch via 30s CMO Checklist",
        stop_loss_metric: "Brand Trust Violation",
        pivot_action:
          "Replaced with '30-Day Active-Habit Guarantee (3+ Socratic sessions/week managed by your Human Learning Manager or 100% refund)'.",
      },
      revision_notes:
        "Archived to institutional learning log: Never guarantee report card marks; guarantee the 3x/week Socratic habit.",
    },
    content: `Guaranteed 90%+ in Grade 12 Advanced Functions (MHF4U) in 30 Days or Double Your Money Back!`,
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
      "In Stage 1: Use Midterm K/T/C/A error analysis inside the 10-Min Diagnostic Debrief close script to lock $139 CAD/mo enrollments within 48 hours.",
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
      "Show the student's unassisted Socratic stall vs. ChatGPT answer-copying in Minutes 0–3 of the Parent Debrief.",
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
      "Poorly equipped for Ontario Grades 9–12 K/T/C/A Thinking & Application word problems (MPM2D, MCR3U, MHF4U, SBI3U) and closed at 9:45 PM when homework panic hits.",
    mindlcCounterWedge:
      "$139 CAD/mo Tier 2 Managed Hybrid ($240/mo cheaper than centres) + 24/7 Socratic AI tuned to Ontario course codes + 1-on-1 Human Learning Manager accountability.",
    recommendedConversionPlay:
      "Use the '$380/mo Worksheet Centre vs. $139/mo Managed Hybrid' anchor table on Page 2 of the Cognitive Diagnostic Report.",
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
      "7-day coverage for less than the price of 2 tutor hours/month ($139 CAD/mo): Weekly Human Learning Manager check-ins + 24/7 Socratic AI guided hints.",
    recommendedConversionPlay:
      "Highlight 'The 6-Day Tutoring Gap' during Minutes 3–6 of the Parent Diagnostic Debrief.",
    lastScannedAt: "Verified Today",
  },
];

const INITIAL_AGENTS: MarketingAgent[] = [
  {
    id: "agent-cro",
    codeName: "Agent-04 · Stage-1 CRO",
    roleTitle: "Diagnostic-to-Paid Conversion & Debrief Agent",
    specialty:
      "Optimizes K/T/C/A Cognitive Reports, 10-min parent debrief scripts, and $139 CAD/mo 30-day guarantee framing.",
    primarySkillName: "cro",
    targetPlatform: "Parent Call",
    funnelFocus: "Conversion Optimization",
    status: "Idle / Ready",
    tasksCompletedCount: 6,
    conversionMetricOwned: "Diag Completed → Paid ≥ 25% (Stage 1 Lock)",
  },
  {
    id: "agent-lifecycle",
    codeName: "Agent-05 · Lifecycle & Referrals",
    roleTitle: "Post-Diagnostic Follow-Up & Week 4–6 Referral Agent",
    specialty:
      "Runs 72-hr undecided parent follow-up sequences and Stage 2 Week 4–6 parent referral & seminar flows.",
    primarySkillName: "copywriting",
    targetPlatform: "Email",
    funnelFocus: "Parent Retention & Referral",
    status: "Idle / Ready",
    tasksCompletedCount: 5,
    conversionMetricOwned: "72-Hr Undecided Recovery & Stage 2 Referral ≥ 40%",
  },
  {
    id: "agent-seo",
    codeName: "Agent-02 · STEM Lead Magnets",
    roleTitle: "Ontario Course-Code Lead Magnet & Seminar Agent",
    specialty:
      "Builds MPM2D, MCR3U, MHF4U & SBI3U unit-test prep kits and community seminar funnels (Stage 2).",
    primarySkillName: "ai-seo",
    targetPlatform: "Community",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 7,
    conversionMetricOwned: "Community/Seminar → Diagnostic Booked ≥ 40%",
  },
  {
    id: "agent-social",
    codeName: "Agent-03 · Stage-3 GTA Ads",
    roleTitle: "GTA Meta/Google Ad Scaling Agent (Locked in Stage 1)",
    specialty:
      "Scales Mississauga, Oakville, Markham & Toronto parent ads once Stage 3 (61–100 students) unlocks.",
    primarySkillName: "social-content",
    targetPlatform: "Facebook",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 4,
    conversionMetricOwned: "Stage 3 GTA Blended CAC < $150 CAD",
  },
  {
    id: "agent-intel",
    codeName: "Agent-01 · VoC & Reality Intel",
    roleTitle: "Weekly Reality Gate & VoC Objection Auditor",
    specialty:
      "Audits weekly funnel drop-offs, parent verbatim quotes, and competitor pricing shifts.",
    primarySkillName: "copy-editing",
    targetPlatform: "Parent Call",
    funnelFocus: "Conversion Optimization",
    status: "Idle / Ready",
    tasksCompletedCount: 4,
    conversionMetricOwned: "VoC Objection Resolution & Stop-Loss Compliance",
  },
];

const INITIAL_PLANNED_ACTIVITIES: PlannedActivity[] = [
  {
    id: "act-daily-1",
    horizon: "Daily",
    timeWindow: "Today · Stage 1 Priority #1",
    title:
      "Deploy 10-Minute Parent Diagnostic Debrief Script with Timestamped Socratic Error Trace ($139 CAD/mo Close)",
    tacticalExecution:
      "Equip Human Learning Managers on today's diagnostic debrief calls with the 3-part close script: (Min 0–3) Screen-share the student's unassisted stall on Question 4 vs. ChatGPT shortcutting (VOC-101); (Min 3–7) Anchor $139 CAD/mo Tier 2 Managed Hybrid against $380/mo Mathnasium (VOC-103); (Min 7–10) Close with the 30-Day Active-Habit Refund Guarantee.",
    deliverableSpec:
      "10-Min Parent Debrief Call Script + K/T/C/A Cognitive Report Objection Box",
    marketTrigger:
      "Current Diag Completed -> Paid is 14.3% (2/14); must reach >= 25% to unlock Stage 2",
    courseCodesTargeted: ["MHF4U", "SBI3U", "MCR3U", "MPM2D"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Parent Call",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Lift Diag Completed → Paid Conversion from 14.3% to ≥ 25%",
    status: "Queued",
    requiredStage: "STAGE_1_CONVERSION",
  },
];

const INITIAL_QA_HISTORY: PlanQaExchange[] = [
  {
    id: "qa-init-1",
    timestamp: "Active Safeguard Brief",
    cmoQuestion:
      "Why is Diag → Paid (14.3%) highlighted in Amber/Red on the Macro Command Strip?",
    horizonAffected: "Daily",
    strategistAnswer:
      "In the latest Weekly Reality Log (sample seed data), 14 diagnostics were completed and 2 converted to the $139 CAD/mo Tier 2 Managed Hybrid Plan (**14.3%** vs. our **≥ 25%** Stage 1 requirement). Because `PROP-S1-0988` ('Generic 24/7 AI Math Bot') breached its `< 15%` stop-loss threshold, it has been pinned to 🔴 **Kill-Criteria Triggered** at the top of your Left Rail, and replaced by `PROP-S1-1042` (*10-Min Parent Debrief Script & K/T/C/A Cognitive Report Close*).",
    planAdjustmentsMade: [
      "Flagged PROP-S1-0988 into 🔴 Kill-Criteria Triggered queue",
      "Queued PROP-S1-1042 (v2) in 🟡 Awaiting CMO Decision",
    ],
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "msg-welcome",
    proposalId: "asset-stage1-debrief",
    sender: "ai",
    timestamp: "8 mins ago",
    skillName: "cro",
    detailLevel: 2,
    linkedAssetId: "asset-stage1-debrief",
    linkedPlatform: "Parent Call",
    changeSummaryPill:
      "Updated v2: Removed grade guarantee, added Ontario K/T/C/A breakdown, and anchored single CTA to 30-day active-habit seat",
    strategicJustification: {
      detailLevel: 2,
      levelLabel: "Level 2: Standard Rationale",
      headlineSummary:
        "Ready for 30-Second CMO Review: 10-Min Parent Debrief Script (PROP-S1-1042 · v2)",
      rationaleBody:
        "1. **Bottleneck Focus (`STAGE_1_CONVERSION`):** Our Live Mini-Funnel shows `Diag Done → Paid` is **14.3%** (Target ≥ 25%). This script fixes the debrief close by screen-sharing the student's Ontario K/T/C/A Thinking & Application gap in the first 90 seconds.\n2. **Conversational Refinement:** Click any of the **3 quick-steer chips** below (or type a custom instruction) to create `v3`, then check the 3 boxes in the **Sticky 30-Second Approval Dock** to lock the asset.",
      frameworksApplied: [
        "Stage 1 Conversion Lock",
        "Ontario K/T/C/A Rubric",
        "VoC Grounding (VOC-101..103)",
      ],
      mentorshipTakeaway:
        "Toggle 'Show Changes Diff' in the Left Pane header to see exactly what changed between v1 and v2.",
      contextCacheStatus:
        "Context Cache HIT (5 VoC quotes + 14.3% Diag-to-Paid rate)",
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
  selectedProposalId: "asset-stage1-debrief",
  activeCampaignId: "camp-ontario-fall",
  selectedSkillId: "skill-cro",
  detailLevel: 2,
  preferredPlatform: "Parent Call",
  chatMessages: INITIAL_CHAT,
  isGenerating: false,
  lastHighlightedAssetId: "asset-stage1-debrief",
  brandPersona: {
    companyName: "MindLC",
    planNameAndPrice: "Tier 2 Managed Hybrid Plan: $139 CAD/month",
    targetAudience:
      "Ontario parents of students in Grades 9–12 STEM (MPM2D, MCR3U, MHF4U, MCV4U, SBI3U, SCH4U, SPH4U).",
    coreHook:
      "Target: First 100 paid Ontario Grades 9–12 STEM students ($139 CAD/month Tier 2 Managed Hybrid Plan). Core hook: Human Learning Managers for weekly accountability + 24/7 Socratic AI for guided step-by-step hints (never hands over the answer).",
    curriculumFocus:
      "Ontario Ministry of Education Grades 9–12 STEM & K/T/C/A Achievement Chart (MTH1W, MPM2D, MCR3U, MHF4U, MCV4U, SBI3U).",
    brandVoice:
      "Calm Ontario educator advisory tone, evidence-driven, zero exaggerated grade guarantees, anti-shortcut (Socratic mastery over ChatGPT answer-copying).",
    antiPersonaObjections:
      "1. VOC-101 (ai_cheating): 'My son uses ChatGPT to finish homework in 5 mins and gets 56% on MHF4U unit tests.' 2. VOC-103 (price): 'We burned $380/mo at Mathnasium—why won't he ignore this $139/mo subscription?' -> Answered via 30-Day Active-Habit Guarantee.",
    geminiModel: "gemini-2.5-pro (HITL Safeguard Schema v2.0)",
  },

  realityGateStatus: "UNLOCKED",
  pilotWeek0Used: false,
  weeklyRealityLogs: INITIAL_REALITY_LOGS,
  isRealityGateModalOpen: false,
  isVocVaultOpen: false,
  isSampleSeedActive: true,
  diagnosticToast: null,

  paidStudentCount: 14,
  activeBottleneckStage: "STAGE_1_CONVERSION",
  pendingScopeDriftCommand: null,

  activeRevisionAssetId: "asset-stage1-debrief",

  ontarioTrends: INITIAL_ONTARIO_TRENDS,
  competitors: INITIAL_COMPETITORS,
  activeHorizon: "Daily",
  agents: INITIAL_AGENTS,
  plannedActivities: INITIAL_PLANNED_ACTIVITIES,
  planQaHistory: INITIAL_QA_HISTORY,
  runningActivityId: null,
  isRunningTeamSprint: false,
  isAskingPlannerQa: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedProposalId: (id) =>
    set({
      selectedProposalId: id,
      activeRevisionAssetId: id,
      pendingScopeDriftCommand: null,
    }),
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setDetailLevel: (level) => set({ detailLevel: level }),
  setPreferredPlatform: (platform) => set({ preferredPlatform: platform }),
  setActiveHorizon: (horizon) => set({ activeHorizon: horizon }),
  setActiveRevisionAssetId: (assetId) =>
    set({
      activeRevisionAssetId: assetId,
      selectedProposalId: assetId || get().selectedProposalId,
    }),
  setVocVaultOpen: (open) => set({ isVocVaultOpen: open }),
  clearDiagnosticToast: () => set({ diagnosticToast: null }),

  setRealityGateModalOpen: (open) => set({ isRealityGateModalOpen: open }),

  toggleRealityGateLockSimulation: () =>
    set((state) => ({
      realityGateStatus:
        state.realityGateStatus === "LOCKED" ? "UNLOCKED" : "LOCKED",
    })),

  submitWeeklyRealityLog: (payload) =>
    set((state) => {
      const formattedQuotes: VerbatimParentQuote[] =
        payload.verbatim_parent_quotes.map((q, idx) => ({
          id: `VOC-${201 + state.weeklyRealityLogs.length * 2 + idx}`,
          quote_text: q.quote_text.trim(),
          context_tag: q.context_tag,
          week_start_date: payload.week_start_date,
          is_sample: false,
        }));

      const newLog: WeeklyRealityLog = {
        id: `wrl-${Date.now()}`,
        week_start_date: payload.week_start_date,
        funnel_metrics: payload.funnel_metrics,
        verbatim_parent_quotes: formattedQuotes,
        top_winning_touchpoint: payload.top_winning_touchpoint.trim(),
        created_at: new Date().toISOString(),
        is_sample: false,
      };

      const rates = computeFunnelRates(payload.funnel_metrics);
      const newPaidTotal = Math.min(
        100,
        Math.max(
          state.paidStudentCount,
          payload.funnel_metrics.paid_conversions
        )
      );
      const nextStage = getBottleneckStageForStudents(newPaidTotal);

      // Check if Diag-to-Paid is below 25% target and flag any live campaign if stop-loss breached
      const isDiagToPaidLow = rates.completedToPaidPct < 25;
      const updatedAssets = state.assets.map((a) => {
        const cleaned = { ...a, is_sample: false };
        if (
          isDiagToPaidLow &&
          a.hitl_state === "APPROVED_FOR_EXECUTION" &&
          a.proposal_schema?.bottleneck_stage === "STAGE_1_CONVERSION"
        ) {
          return {
            ...cleaned,
            hitl_state: "KILLED_BY_STOP_LOSS" as HITLProposalState,
            kill_or_reject_reason: `Auto-Flagged by Weekly Reality Gate: Diag-to-Paid conversion was ${rates.completedToPaidPct}% (< 25% target threshold). Review Pivot Action.`,
          };
        }
        return cleaned;
      });

      const toastMsg = isDiagToPaidLow
        ? `Bottleneck detected: Diag-to-Paid is ${rates.completedToPaidPct}% (Target ≥ 25%). Proposals unlocked, sample tag cleared & calibrated to ${formattedQuotes.length} new parent quotes.`
        : `Target Met! Diag-to-Paid hit ${rates.completedToPaidPct}% (≥ 25%). Proposals unlocked & calibrated to ${formattedQuotes.length} new parent quotes.`;

      // Clear sample logs on first real submission
      const nonSampleLogs = state.weeklyRealityLogs.filter(
        (l) => !l.is_sample
      );

      return {
        weeklyRealityLogs: [newLog, ...nonSampleLogs],
        realityGateStatus: "UNLOCKED",
        isRealityGateModalOpen: false,
        isSampleSeedActive: false,
        assets: updatedAssets,
        paidStudentCount: newPaidTotal,
        activeBottleneckStage: nextStage,
        diagnosticToast: toastMsg,
      };
    }),

  activatePilotWeek0Override: () =>
    set((state) => {
      if (state.pilotWeek0Used) return state;
      return {
        realityGateStatus: "PILOT_WEEK_0_OVERRIDE",
        pilotWeek0Used: true,
        isRealityGateModalOpen: false,
        diagnosticToast:
          "Pilot Week 0 Bootstrap Override activated (One-time unlock). Log your first real Weekly Reality check within 7 days.",
      };
    }),

  setPaidStudentCount: (count) => {
    const clamped = Math.max(0, Math.min(100, count));
    const stage = getBottleneckStageForStudents(clamped);
    const defaultPlatformForStage: Record<
      ActiveBottleneckStage,
      AssetPlatform
    > = {
      STAGE_1_CONVERSION: "Parent Call",
      STAGE_2_REFERRAL_DIAG: "Community",
      STAGE_3_SCALE_ADS: "Facebook",
    };
    set({
      paidStudentCount: clamped,
      activeBottleneckStage: stage,
      preferredPlatform: defaultPlatformForStage[stage],
      pendingScopeDriftCommand: null,
    });
  },

  sendCopilotCommand: async (
    userCommand: string,
    explicitStageOverride = false,
    forceNewProposal = false
  ) => {
    const state = get();
    const isRevisingExisting =
      !forceNewProposal && Boolean(state.activeRevisionAssetId);

    // SAFEGUARD 1: Block NEW proposal generation when Reality Gate is LOCKED
    if (!isRevisingExisting && state.realityGateStatus === "LOCKED") {
      set({ isRealityGateModalOpen: true });
      const gateMsg: ChatMessage = {
        id: `msg-gate-${Date.now()}`,
        proposalId: state.selectedProposalId,
        sender: "guardrail",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        skillName: "RealityGate",
        detailLevel: state.detailLevel,
        userPrompt: userCommand,
        strategicJustification: {
          detailLevel: state.detailLevel,
          levelLabel: "Level 1: Executive Summary (Fast)",
          headlineSummary:
            "🔒 WEEKLY REALITY GATE LOCKED — New Proposal Generation Blocked",
          rationaleBody:
            "Complete the 60-second Weekly Reality Log first to unlock new proposals. (Conversational refinement of the currently selected proposal remains unlocked.)",
          frameworksApplied: ["Safeguard 1: Weekly Reality Gate"],
        },
      };
      set((prev) => ({ chatMessages: [...prev.chatMessages, gateMsg] }));
      return;
    }

    const latestLog = state.weeklyRealityLogs[0] || INITIAL_REALITY_LOGS[0];
    const allVocQuotes = state.weeklyRealityLogs
      .flatMap((l) => l.verbatim_parent_quotes)
      .slice(0, 10);

    // SAFEGUARD 2: Check Single-Bottleneck Scope Drift on new or out-of-scope requests
    if (!explicitStageOverride) {
      const drift = checkBottleneckScopeDrift({
        userCommand,
        preferredPlatform: isRevisingExisting
          ? "Parent Call"
          : state.preferredPlatform,
        activeStage: state.activeBottleneckStage,
        paidStudents: state.paidStudentCount,
        funnelMetrics: latestLog.funnel_metrics,
      });

      if (drift.detected) {
        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
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
          proposalId: state.selectedProposalId,
          sender: "guardrail",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          skillName: "BottleneckGuardrail",
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
      ? state.assets.find((a) => a.id === state.activeRevisionAssetId)
      : undefined;

    const nextVer = targetAssetForRevision
      ? (targetAssetForRevision.versions?.length ||
          targetAssetForRevision.revision_count ||
          1) + 1
      : 1;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
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
      brandPersona: state.brandPersona,
      preferredPlatform: targetAssetForRevision
        ? targetAssetForRevision.platform
        : state.preferredPlatform,
      activeStage: state.activeBottleneckStage,
      vocQuotes: allVocQuotes,
      funnelMetrics: latestLog.funnel_metrics,
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
          `Updated v${nextVer}: Refined via CMO Co-Pilot`,
        timestamp: "Just now",
      };

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now() + 1}`,
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

      set((prev) => ({
        assets: prev.assets.map((a) =>
          a.id === targetAssetForRevision.id
            ? {
                ...a,
                content: response.marketingContent,
                proposal_schema: response.proposalSchema,
                hitl_state: "DRAFT",
                cmo_checklist: {
                  ontario_context: true,
                  single_cta: true,
                  brand_trust: false, // Require final Brand Trust check after revision
                },
                revision_count: nextVer,
                versions: [...existingVersions, newVersionSnapshot],
                updated_at: `v${nextVer} · Just now`,
              }
            : a
        ),
        chatMessages: [...prev.chatMessages, aiMsg],
        isGenerating: false,
        lastHighlightedAssetId: targetAssetForRevision.id,
      }));
      return;
    }

    // Create brand-new Proposal in Awaiting CMO Decision (DRAFT)
    const newAssetId = `asset-${Date.now()}`;
    const newAsset: Asset = {
      id: newAssetId,
      campaign_id: state.activeCampaignId,
      platform: response.targetPlatform,
      channel_badge: response.proposalSchema.channel.split(" ")[0] || "Parent Call",
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
      devils_advocate_verified: false,
      kill_criteria_acknowledged: false,
      revision_count: 1,
      versions: [
        {
          version: 1,
          content: response.marketingContent,
          single_cta: response.proposalSchema.single_cta,
          change_summary:
            response.changeSummaryPill || "v1 Initial AI Proposal Draft",
          timestamp: "Just now",
        },
      ],
    };

    const aiMsg: ChatMessage = {
      id: `msg-ai-${Date.now() + 1}`,
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

    set((prev) => ({
      assets: [newAsset, ...prev.assets],
      selectedProposalId: newAssetId,
      activeRevisionAssetId: newAssetId,
      chatMessages: [...prev.chatMessages, aiMsg],
      isGenerating: false,
      lastHighlightedAssetId: newAssetId,
    }));
  },

  toggleCmoChecklistItem: (proposalId, field) =>
    set((state) => ({
      assets: state.assets.map((a) => {
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
      }),
    })),

  approveAndLockProposal: (proposalId) =>
    set((state) => {
      const target = state.assets.find((a) => a.id === proposalId);
      const chk = target?.cmo_checklist;
      if (!chk?.ontario_context || !chk?.single_cta || !chk?.brand_trust) {
        return state;
      }
      return {
        assets: state.assets.map((a) =>
          a.id === proposalId
            ? {
                ...a,
                hitl_state: "APPROVED_FOR_EXECUTION",
                devils_advocate_verified: true,
                kill_criteria_acknowledged: true,
                updated_at: "Approved & Locked",
              }
            : a
        ),
        diagnosticToast: `Approved & Locked "${target?.title?.slice(0, 48)}..." — Moved to 🟢 Approved / Live queue.`,
      };
    }),

  rejectOrKillProposal: (
    proposalId,
    reason,
    targetState = "ARCHIVED"
  ) =>
    set((state) => {
      const target = state.assets.find((a) => a.id === proposalId);
      return {
        assets: state.assets.map((a) =>
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
        ),
        diagnosticToast:
          targetState === "KILLED_BY_STOP_LOSS"
            ? `Stop-Loss Triggered on "${target?.title?.slice(0, 42)}..." — Pinned to 🔴 Kill-Criteria Triggered.`
            : `Killed & Archived "${target?.title?.slice(0, 42)}..." — Reason saved to institutional learning log.`,
      };
    }),

  toggleProposalVerification: (assetId, field) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, [field]: !a[field] } : a
      ),
    })),

  transitionProposalHitlState: (assetId, nextState) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              hitl_state: nextState,
              updated_at: `HITL -> ${nextState}`,
            }
          : a
      ),
    })),

  addScannedCompetitor: (comp) =>
    set((state) => ({
      competitors: [comp, ...state.competitors],
    })),

  spawnCounterActivityFromCompetitor: async (compId: string) => {
    const state = get();
    if (state.realityGateStatus === "LOCKED") {
      set({ isRealityGateModalOpen: true });
      return;
    }
    const comp = state.competitors.find((c) => c.id === compId);
    if (!comp) return;

    const newActivity: PlannedActivity = {
      id: `act-comp-${Date.now()}`,
      horizon: "Daily",
      timeWindow: `Today · ${state.activeBottleneckStage} Counter-Play`,
      title: `Counter-Position Against ${comp.name}: "${comp.recommendedConversionPlay.slice(0, 65)}"`,
      tacticalExecution: `Target Ontario parents comparing ${comp.name} (${comp.pricingModel}) against MindLC ($139 CAD/mo Tier 2 Managed Hybrid). Highlight their structural weakness (${comp.structuralWeakness}) and present MindLC's wedge: ${comp.mindlcCounterWedge}`,
      deliverableSpec: `Comparison Battlecard & Debrief Objection Script vs. ${comp.name}`,
      marketTrigger: `Competitor gap identified in ${comp.name}`,
      courseCodesTargeted: ["MHF4U", "SBI3U", "MCR3U", "MPM2D"],
      assignedAgentId: "agent-cro",
      skillName: "cro",
      targetPlatform: "Parent Call",
      funnelObjective: "Conversion Optimization",
      targetKpi: "Lift Diag Completed -> Paid Conversion >= 25%",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Spawned from Competitor Intel Matrix (${comp.name})`,
      requiredStage: state.activeBottleneckStage,
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
    if (state.realityGateStatus === "LOCKED") {
      set({ isRealityGateModalOpen: true });
      return;
    }
    const trend = state.ontarioTrends.find((t) => t.id === trendId);
    if (!trend) return;

    const newActivity: PlannedActivity = {
      id: `act-trend-${Date.now()}`,
      horizon: "Daily",
      timeWindow: `Today · ${state.activeBottleneckStage} Signal Trigger`,
      title: `Rapid Response (${state.activeBottleneckStage}): ${trend.title}`,
      tacticalExecution: `${trend.recommendedCmoAction} Address parent pain directly: "${trend.parentPainSummary}"`,
      deliverableSpec: `Stage-Aligned Proposal for ${trend.courseCodes.join(" · ")}`,
      marketTrigger: `${trend.category} (${trend.searchMomentum})`,
      courseCodesTargeted: trend.courseCodes,
      assignedAgentId: "agent-cro",
      skillName: "cro",
      targetPlatform: "Parent Call",
      funnelObjective: "Conversion Optimization",
      targetKpi: "Diag Completed -> Paid >= 25% ($139 CAD/mo Tier 2)",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Triggered from Ontario Signal: ${trend.title.slice(0, 48)}`,
      requiredStage: state.activeBottleneckStage,
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
    if (state.realityGateStatus === "LOCKED") {
      set({ isRealityGateModalOpen: true });
      return;
    }
    const activity = state.plannedActivities.find((a) => a.id === activityId);
    if (!activity) return;

    const agent =
      state.agents.find((ag) => ag.id === activity.assignedAgentId) ||
      state.agents[0];
    const latestLog = state.weeklyRealityLogs[0] || INITIAL_REALITY_LOGS[0];
    const allVocQuotes = state.weeklyRealityLogs
      .flatMap((l) => l.verbatim_parent_quotes)
      .slice(0, 10);

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
      activeStage: state.activeBottleneckStage,
      vocQuotes: allVocQuotes,
      funnelMetrics: latestLog.funnel_metrics,
    });

    const newAssetId = `asset-agent-${Date.now()}`;
    const newAsset: Asset = {
      id: newAssetId,
      campaign_id: state.activeCampaignId,
      platform: result.platform,
      channel_badge: "Parent Call",
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

    const aiMsg: ChatMessage = {
      id: `msg-agent-${Date.now()}`,
      proposalId: newAssetId,
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      skillName: activity.skillName,
      detailLevel: 3,
      changeSummaryPill: `v1 Drafted by ${agent.codeName}`,
      linkedAssetId: newAssetId,
      linkedPlatform: result.platform,
      strategicJustification: {
        detailLevel: 3,
        levelLabel: "Level 3: Deep Mentorship (The Why & How)",
        headlineSummary: `[Autonomous Agent Proposal Drafted] ${result.agentReport}`,
        rationaleBody: `• **Bottleneck Stage Lock:** ${state.activeBottleneckStage}\n• **Cited VoC Quotes:** ${result.proposalSchema.cited_voc_quotes.join(" ; ")}`,
        frameworksApplied: [agent.codeName, state.activeBottleneckStage],
        mentorshipTakeaway:
          "Inspect the proposal in the Cockpit and complete the 30-second checklist to approve.",
      },
    };

    set((prev) => ({
      runningActivityId: null,
      assets: [newAsset, ...prev.assets],
      selectedProposalId: newAssetId,
      activeRevisionAssetId: newAssetId,
      chatMessages: [...prev.chatMessages, aiMsg],
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
    }));
  },

  runAutonomousTeamSprint: async (horizon: PlanHorizon) => {
    const state = get();
    if (state.realityGateStatus === "LOCKED") {
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
    set({ isAskingPlannerQa: true });

    const res = await evaluateCmoPlanQuestionAndAdjust({
      question,
      activeHorizon: state.activeHorizon,
      trends: state.ontarioTrends,
      competitors: state.competitors,
      brandPersona: state.brandPersona,
      activeStage: state.activeBottleneckStage,
      paidStudents: state.paidStudentCount,
    });

    const newExchange: PlanQaExchange = {
      id: `qa-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cmoQuestion: question,
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
    set((state) => ({
      assets: state.assets.map((a) =>
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
      ),
    })),

  deleteAsset: (assetId) =>
    set((state) => {
      const remaining = state.assets.filter((a) => a.id !== assetId);
      const nextSelected =
        state.selectedProposalId === assetId
          ? remaining[0]?.id || ""
          : state.selectedProposalId;
      return {
        assets: remaining,
        selectedProposalId: nextSelected,
        activeRevisionAssetId: nextSelected || null,
      };
    }),

  createManualAsset: (platform, title, content) =>
    set((state) => {
      if (state.realityGateStatus === "LOCKED") {
        return { isRealityGateModalOpen: true };
      }
      const id = `asset-${Date.now()}`;
      const latestLog = state.weeklyRealityLogs[0] || INITIAL_REALITY_LOGS[0];
      const firstQuote = latestLog.verbatim_parent_quotes[0];
      const created: Asset = {
        id,
        campaign_id: state.activeCampaignId,
        platform,
        channel_badge: platform,
        title: title || `${platform} Proposal`,
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
            single_cta:
              "Activate Your Teen's $139 CAD/mo Tier 2 Managed Hybrid Seat (30-Day Active-Habit Guarantee)",
            change_summary: "v1 Initial manual draft",
            timestamp: "Just now",
          },
        ],
        proposal_schema: {
          proposal_id: `PROP-MAN-${Date.now().toString().slice(-4)}`,
          title: title || `${platform} Proposal`,
          bottleneck_stage: state.activeBottleneckStage,
          channel: platform,
          target_metric:
            state.activeBottleneckStage === "STAGE_1_CONVERSION"
              ? "Diag → Paid ≥ 25%"
              : state.activeBottleneckStage === "STAGE_2_REFERRAL_DIAG"
              ? "Referral & Seminar → Diag ≥ 40%"
              : "Blended CAC < $150 CAD",
          cited_voc_quotes: [
            firstQuote
              ? `[${firstQuote.id} · ${firstQuote.context_tag}] "${firstQuote.quote_text}"`
              : '[VOC-101 · ai_cheating] "My son uses ChatGPT to finish homework in 5 mins and gets 56% on his MHF4U test."',
          ],
          single_cta:
            "Activate Your Teen's $139 CAD/mo Tier 2 Managed Hybrid Seat (30-Day Active-Habit Guarantee)",
          asset_body: content,
          devils_advocate: {
            primary_failure_hypothesis:
              "Parents may hesitate if this draft does not explicitly contrast Socratic AI K/T/C/A hints against answer-dumping chatbots.",
            blind_spot_question:
              "Does this asset cite a real parent objection from this week's reality log?",
          },
          kill_criteria: {
            sample_threshold: "12 parent diagnostic debriefs",
            stop_loss_metric: "< 20% conversion to next funnel step",
            pivot_action:
              "Refine via CMO Co-Pilot chat using the top winning touchpoint from WeeklyRealityLog.",
          },
          revision_notes: "v1 Manual draft created by Acting CMO.",
        },
      };
      return {
        assets: [created, ...state.assets],
        selectedProposalId: id,
        activeRevisionAssetId: id,
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
}));
