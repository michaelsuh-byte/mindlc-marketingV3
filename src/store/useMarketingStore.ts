import { create } from "zustand";
import {
  ActiveBottleneckStage,
  Asset,
  AssetPlatform,
  BrandPersona,
  Campaign,
  CampaignStatus,
  ChatMessage,
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
  evaluateCmoPlanQuestionAndAdjust,
  executeAutonomousAgentTask,
  generateMarketingResponse,
  getBottleneckStageForStudents,
} from "@/services/marketingAi";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type NavigationTab =
  | "dashboard"
  | "intel"
  | "planner"
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

  // SAFEGUARD 1: Weekly Reality Gate State
  realityGateStatus: RealityGateStatus;
  pilotWeek0Used: boolean;
  weeklyRealityLogs: WeeklyRealityLog[];
  isRealityGateModalOpen: boolean;

  // SAFEGUARD 2: Single-Bottleneck Lock-In Engine (0-100 Paid Students @ $139 CAD/mo)
  paidStudentCount: number;
  activeBottleneckStage: ActiveBottleneckStage;
  pendingScopeDriftCommand: string | null;

  // SAFEGUARD 3 & 4: Conversational Refinement Target & HITL State Machine
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
  setActiveCampaignId: (id: string) => void;
  setSelectedSkillId: (id: string) => void;
  setDetailLevel: (level: DetailLevel) => void;
  setPreferredPlatform: (platform: AssetPlatform) => void;
  setActiveHorizon: (horizon: PlanHorizon) => void;
  setActiveRevisionAssetId: (assetId: string | null) => void;

  // Safeguard 1 Actions (Weekly Reality Gate)
  setRealityGateModalOpen: (open: boolean) => void;
  toggleRealityGateLockSimulation: () => void;
  submitWeeklyRealityLog: (payload: {
    week_start_date: string;
    funnel_metrics: WeeklyFunnelMetrics;
    verbatim_parent_quotes: Omit<VerbatimParentQuote, "id" | "week_start_date">[];
    top_winning_touchpoint: string;
  }) => void;
  activatePilotWeek0Override: () => void;

  // Safeguard 2 Actions (Single-Bottleneck Lock-In Engine)
  setPaidStudentCount: (count: number) => void;

  // Dual-Pane Co-Pilot Command Action (Enforces Reality Gate + Bottleneck Lock + Schema)
  sendCopilotCommand: (
    userCommand: string,
    explicitStageOverride?: boolean
  ) => Promise<void>;

  // HITL State Machine Actions on Proposal Cards
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

  // Asset & Campaign Actions (Left Pane Canvas)
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
    funnel_metrics: {
      reach_or_contacts: 64,
      diag_booked: 18,
      diag_completed: 14,
      paid_conversions: 3,
    },
    top_winning_touchpoint:
      "10-minute Zoom parent debrief walking through the student's timestamped Socratic stall on Question 4 (MCR3U Functions word problem)",
    verbatim_parent_quotes: [
      {
        id: "VOC-101",
        context_tag: "ai_cheating",
        week_start_date: "2026-11-16",
        quote_text:
          "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U Functions unit test because he blanks out without his phone.",
      },
      {
        id: "VOC-102",
        context_tag: "price",
        week_start_date: "2026-11-16",
        quote_text:
          "We already burned $380/month at Mathnasium—how do I know $139/month won't just be another subscription he ignores after week two?",
      },
      {
        id: "VOC-103",
        context_tag: "student_motivation",
        week_start_date: "2026-11-16",
        quote_text:
          "If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn't save me any stress.",
      },
      {
        id: "VOC-104",
        context_tag: "curriculum",
        week_start_date: "2026-11-16",
        quote_text:
          "His teacher marks Thinking and Application word problems super strictly—generic American practice apps don't match Ontario MPM2D or MCR3U tests.",
      },
    ],
  },
];

const INITIAL_SKILLS: MarketingSkill[] = [
  {
    id: "skill-copywriting",
    skill_name: "copywriting",
    category: "Stage 1–3 Conversion Copy",
    system_prompt:
      "You are an elite EdTech conversion copywriter trained on PAS, JTBD Four Forces, and VoC mirroring. Write high-converting assets for MindLC's Tier 2 Managed Hybrid Plan ($139 CAD/month) targeting the first 100 paid Ontario Grades 9–12 STEM students.",
  },
  {
    id: "skill-cro",
    skill_name: "cro",
    category: "Stage 1 Debrief & Diagnostic CRO",
    system_prompt:
      "You are a Conversion Rate Optimization (CRO) Lead focused on lifting Diagnostic Completed -> Paid Conversion (>= 25%) for MindLC ($139 CAD/mo Tier 2 Managed Hybrid). Optimize Cognitive Reports, 10-minute parent debrief call scripts, and 30-day risk-free guarantee framing.",
  },
  {
    id: "skill-copy-editing",
    skill_name: "copy-editing",
    category: "Seven-Sweeps VoC Polish",
    system_prompt:
      "You are a ruthless Seven-Sweeps Copy Editor. Audit and rewrite MindLC proposals across Clarity, VoC Quote Alignment, Specificity ($139 CAD/mo vs $80/hr weekly tutors), and Single Lock-Step CTA.",
  },
  {
    id: "skill-social-content",
    skill_name: "social-content",
    category: "Stage 2–3 GTA Parent Social & Ads",
    system_prompt:
      "You are a GTA Ontario Parent Social & Ad Strategist (Mississauga, Oakville, Markham, Toronto). Use scroll-stopping hooks rooted in verbatim WeeklyRealityLog parent quotes and hold Blended CAC < $150 CAD.",
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
  {
    id: "camp-eqao-gr9",
    title: "Stage 1: Diagnostic-to-Paid (>= 25%) Debrief & Follow-Up System",
    status: "Draft",
    created_at: "2026-11-10T09:30:00Z",
  },
  {
    id: "camp-gr11-functions",
    title: "Stage 2: Week 4–6 Parent Referral & MCR3U/SBI3U Seminar Loop",
    status: "Draft",
    created_at: "2026-11-15T11:15:00Z",
  },
];

const INITIAL_ASSETS: Asset[] = [
  {
    id: "asset-stage1-debrief",
    campaign_id: "camp-ontario-fall",
    platform: "Cognitive Report & Debrief Script",
    title:
      "10-Min Parent Diagnostic Debrief Script & Cognitive Report Close ($139 CAD/mo Tier 2)",
    detail_level_used: 3,
    skill_used: "cro",
    agent_author: "Agent-04 · Funnel CRO",
    updated_at: "10 mins ago",
    hitl_state: "DRAFT",
    devils_advocate_verified: false,
    kill_criteria_acknowledged: false,
    revision_count: 1,
    proposal_schema: {
      proposal_id: "PROP-S1-1042",
      title:
        "10-Min Parent Diagnostic Debrief Script & Cognitive Report Close ($139 CAD/mo Tier 2)",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "1-on-1 Zoom Parent Debrief + Cognitive Diagnostic Report",
      target_metric:
        "Diagnostic Completed -> Paid Conversion (Current: 21% -> Target: >= 25%)",
      cited_voc_quotes: [
        '[VOC-101 · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U Functions unit test because he blanks out without his phone."',
        '[VOC-102 · price] "We already burned $380/month at Mathnasium—how do I know $139/month won\'t just be another subscription he ignores after week two?"',
      ],
      single_cta:
        "Activate Your Teen's 30-Day Risk-Free Tier 2 Managed Hybrid Seat ($139 CAD/mo) on the Call to Lock Tomorrow's Human Learning Manager Onboarding",
      asset_body: `## 1. Cognitive Diagnostic Report Visual Header (Minutes 0–2)
**Courses Audited:** Ontario Grade 10–12 STEM (MPM2D · MCR3U · MHF4U · SBI3U)
**Diagnostic Gap Identified:** Procedural Recall is **76%**, but **Unassisted Multi-Step Problem Decomposition is 44%** (Explains why homework marks are high while closed-book unit tests drop 20%+).

---

## 2. 10-Minute Parent Debrief Call Script
### Minutes 0–3: Mirror Exact Parent VoC & Show Timestamped Socratic Stall
> *"Look at Question 4 on {{student_first_name}}'s Cognitive Report. You mentioned earlier: 'My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U Functions unit test.' Right here at the 2-minute mark, when our Socratic AI withheld the final answer and asked him to set up the quadratic domain constraint himself, he froze. That's the exact 20-point gap on his school unit tests."*

### Minutes 3–7: Present Tier 2 Managed Hybrid Plan ($139 CAD/month) vs. $380/mo Centres
> *"At $80/hr, a private tutor ($320+/mo) is only there 1 hour a week. Our **Tier 2 Managed Hybrid Plan ($139 CAD/month — $4.63/day)** pairs:*
> 1. **24/7 Socratic AI STEM Coach:** Gives guided step-by-step hints at 9:45 PM—never the final answer.
> 2. **Dedicated Human Learning Manager:** Reviews {{student_first_name}}'s Socratic logs every week, assigns targeted Ontario unit-test prep, and sends you a Friday parent accountability summary."*

### Minutes 7–10: 30-Day Active-Habit Guarantee & Single CTA Close
> *"You asked: 'How do I know $139/month won't just be another subscription he ignores after week two?' Under our **30-Day Active-Habit Guarantee**, if your Human Learning Manager doesn't get {{student_first_name}} completing 3+ Socratic sessions a week in the first 30 days, you get a 100% refund with one email. Let's activate his seat now so his Learning Manager can lock his study plan before Friday's quiz."*`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Parents will delay ('Let me discuss with my spouse tonight') if the 10-minute debrief feels like a generic sales pitch rather than a clinical walkthrough of their child's exact Socratic reasoning stall.",
        blind_spot_question:
          "Are we screen-sharing the student's actual wrong step from the diagnostic within the first 90 seconds of the parent call?",
      },
      kill_criteria: {
        sample_threshold: "12 consecutive 10-minute parent diagnostic debrief calls",
        stop_loss_metric: "< 25% paid conversion into the $139 CAD/mo Tier 2 Managed Hybrid Plan within 48 hours of debrief",
        pivot_action:
          "Immediately switch call close offer from '$139 CAD/mo subscription' to a '$19 CAD 14-Day Unit-Test Rescue Sprint' that auto-converts to $139 CAD/mo on Day 15.",
      },
      revision_notes:
        "Baseline Stage 1 Debrief & Cognitive Report proposal anchored on VOC-101 and VOC-102.",
    },
    content: `## 1. Cognitive Diagnostic Report Visual Header (Minutes 0–2)
**Courses Audited:** Ontario Grade 10–12 STEM (MPM2D · MCR3U · MHF4U · SBI3U)
**Diagnostic Gap Identified:** Procedural Recall is **76%**, but **Unassisted Multi-Step Problem Decomposition is 44%**.`,
  },
  {
    id: "asset-stage1-followup",
    campaign_id: "camp-ontario-fall",
    platform: "Email Sequence",
    title:
      "72-Hour Post-Diagnostic Undecided Parent Close Sequence ($139 CAD/mo + 30-Day Guarantee)",
    detail_level_used: 3,
    skill_used: "copywriting",
    agent_author: "Agent-05 · Lifecycle",
    updated_at: "25 mins ago",
    hitl_state: "APPROVED_FOR_EXECUTION",
    devils_advocate_verified: true,
    kill_criteria_acknowledged: true,
    revision_count: 2,
    proposal_schema: {
      proposal_id: "PROP-S1-1043",
      title:
        "72-Hour Post-Diagnostic Undecided Parent Close Sequence ($139 CAD/mo + 30-Day Guarantee)",
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Post-Debrief Email + SMS Sequence (Hours +2, +24, +72)",
      target_metric: "Diagnostic Completed -> Paid Conversion (Recover 15%+ of undecided debriefs)",
      cited_voc_quotes: [
        '[VOC-103 · student_motivation] "If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn\'t save me any stress."',
        '[VOC-104 · curriculum] "His teacher marks Thinking and Application word problems super strictly—generic American practice apps don\'t match Ontario MPM2D or MCR3U tests."',
      ],
      single_cta:
        "Click One-Tap Enrollment Link ($139 CAD/mo · 30-Day Active-Habit Refund Guarantee) to Assign Your Teen's Human Learning Manager Today",
      asset_body: `### Touch 1 (2 Hours Post-Debrief — SMS + Email): The Cognitive Report Snapshot
**Subject:** {{student_first_name}}'s MCR3U Cognitive Report + 30-Day Active-Habit Guarantee

Hi {{parent_first_name}}, attached is {{student_first_name}}'s 1-page Ontario STEM Cognitive Report from today's diagnostic.
To directly answer your concern (*"If I still have to sit at the kitchen table nagging him to log in every Tuesday night, it doesn't save me any stress"*):
• **Your Human Learning Manager takes over the nagging:** Every Monday, they message {{student_first_name}} directly to lock their 3 unit-test practice blocks for the week, and every Friday you get a 60-second completion scorecard.
• **Backed by our 30-Day Active-Habit Guarantee:** $139 CAD/month—if your teen doesn't build a 3x/week Socratic problem-solving habit in Month 1, we refund every penny.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Undecided parents ignore text-heavy follow-up emails after 24 hours once the emotional urgency of the diagnostic call fades.",
        blind_spot_question:
          "Does Touch 1 include a personalized 45-second Loom/voice note from the exact Human Learning Manager who will coach their teen?",
      },
      kill_criteria: {
        sample_threshold: "25 undecided post-diagnostic parents enrolled into the 72-hr sequence",
        stop_loss_metric: "< 12% recovery conversion into $139 CAD/mo Tier 2 within 72 hours",
        pivot_action:
          "Replace Email Touch 2 (Hour 24) with a direct SMS from the Human Learning Manager offering a free live 15-minute 'Night-Before-the-Quiz' rescue check-in.",
      },
      revision_notes:
        "Approved by Acting CMO after verifying Human Learning Manager voice-note attachment.",
    },
    content: `### Touch 1 (2 Hours Post-Debrief — SMS + Email): The Cognitive Report Snapshot`,
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
      "Midterm marks just landed across GTA school boards. Parents seeing a 62%–74% in Grade 11 Functions (MCR3U) or Biology (SBI3U) realize they have 8 weeks left before final exams.",
    searchMomentum:
      "+68% week-over-week surge in 'Grade 11 functions tutor Ontario' & 'how to raise midterm math mark'",
    recommendedCmoAction:
      "In Stage 1: Use Midterm Report Card urgency inside the 10-Min Diagnostic Debrief close script to lock $139 CAD/mo enrollments within 48 hours.",
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
      "Parents report their teens get 95% on take-home assignments by copying AI answers, then score 54% on closed-book in-class unit tests.",
    searchMomentum:
      "+81% rise in queries for 'AI math tutor that doesn't give the answer' and 'Socratic math tutor'",
    recommendedCmoAction:
      "Show the student's unassisted Socratic stall vs. ChatGPT answer-copying in Minutes 0–3 of the Parent Debrief.",
    recommendedAgentId: "agent-cro",
  },
  {
    id: "trend-eqao-mth1w",
    title:
      "Semester 1 Grade 9 De-Streamed Math (MTH1W) & Grade 10 (MPM2D) Unit-Test Bottleneck",
    category: "EQAO & Ministry Policy",
    urgency: "High (Next 14 Days)",
    affectedGrades: "Grades 9 & 10",
    courseCodes: ["MTH1W", "MPM2D"],
    parentPainSummary:
      "Ontario Ministry rubrics heavily weight Thinking & Application multi-step word problems where worksheet drilling fails.",
    searchMomentum:
      "+54% surge in 'Grade 9 EQAO math practice tests Ontario' and 'MPM2D unit test prep'",
    recommendedCmoAction:
      "In Stage 2: Deploy MPM2D & MCR3U Unit-Test Prep Lead Magnets through local parent communities.",
    recommendedAgentId: "agent-lifecycle",
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
      "Poorly equipped for Ontario Grades 9–12 Ministry Thinking & Application word problems (MPM2D, MCR3U, MHF4U, SBI3U) and closed at 9:45 PM when homework panic hits.",
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
      "\"The tutor explains it on Sunday afternoon, but when my son gets stuck on Wednesday night MCR3U homework before Thursday's test, nobody is there.\"",
    structuralWeakness:
      "The '6-Day Homework Gap': 1 hour of passive explanation per week does not build daily problem-solving habits.",
    mindlcCounterWedge:
      "7-day coverage for less than the price of 2 tutor hours/month ($139 CAD/mo): Weekly Human Learning Manager check-ins + 24/7 Socratic AI guided hints.",
    recommendedConversionPlay:
      "Highlight 'The 6-Day Tutoring Gap' during Minutes 3–6 of the Parent Diagnostic Debrief.",
    lastScannedAt: "Verified Today",
  },
  {
    id: "comp-generic-ai",
    name: "Generic AI Chatbots & Photo-Solvers (ChatGPT / Photomath / Gauth)",
    archetype: "Generic AI Answer Solver",
    websiteUrl: "https://photomath.com",
    pricingModel: "Free – $28 CAD/month self-serve app",
    theirPrimaryPitch:
      "Snap a photo or paste any math problem to get an instant step-by-step solution.",
    ontarioParentComplaint:
      "\"My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U Functions unit test!\"",
    structuralWeakness:
      "Hands over the final answer immediately (cognitive offloading) and has zero human accountability.",
    mindlcCounterWedge:
      "Socratic Guardrail + Human Learning Manager: MindLC never gives the final answer—it prompts the teen with guided questions and reports weekly progress to parents.",
    recommendedConversionPlay:
      "Show side-by-side 'ChatGPT Answer-Dump vs. MindLC Socratic Hint' in the Post-Diagnostic Follow-Up email.",
    lastScannedAt: "Verified Today",
  },
];

const INITIAL_AGENTS: MarketingAgent[] = [
  {
    id: "agent-cro",
    codeName: "Agent-04 · Stage-1 CRO",
    roleTitle: "Diagnostic-to-Paid Conversion & Debrief Agent",
    specialty:
      "Optimizes Cognitive Reports, 10-min parent debrief scripts, and $139 CAD/mo 30-day guarantee framing.",
    primarySkillName: "cro",
    targetPlatform: "Cognitive Report & Debrief Script",
    funnelFocus: "Conversion Optimization",
    status: "Idle / Ready",
    tasksCompletedCount: 6,
    conversionMetricOwned: "Diagnostic Completed -> Paid >= 25% (Stage 1 Lock)",
  },
  {
    id: "agent-lifecycle",
    codeName: "Agent-05 · Lifecycle & Referrals",
    roleTitle: "Post-Diagnostic Follow-Up & Week 4–6 Referral Agent",
    specialty:
      "Runs 72-hr undecided parent follow-up sequences and Stage 2 Week 4–6 parent referral & seminar flows.",
    primarySkillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelFocus: "Parent Retention & Referral",
    status: "Idle / Ready",
    tasksCompletedCount: 5,
    conversionMetricOwned: "72-Hr Undecided Recovery & Stage 2 Referral >= 40%",
  },
  {
    id: "agent-seo",
    codeName: "Agent-02 · STEM Lead Magnets",
    roleTitle: "Ontario Course-Code Lead Magnet & Seminar Agent",
    specialty:
      "Builds MPM2D, MCR3U, MHF4U & SBI3U unit-test prep kits and community seminar funnels (Stage 2).",
    primarySkillName: "ai-seo",
    targetPlatform: "Parent Referral & Seminar Kit",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 7,
    conversionMetricOwned: "Community/Seminar -> Diagnostic Booked >= 40%",
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
    targetPlatform: "Cognitive Report & Debrief Script",
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
      "Equip Human Learning Managers on today's diagnostic debrief calls with the 3-part close script: (Min 0–3) Screen-share the student's unassisted stall on Question 4 vs. ChatGPT shortcutting (VOC-101); (Min 3–7) Anchor $139 CAD/mo Tier 2 Managed Hybrid against $380/mo Mathnasium (VOC-102); (Min 7–10) Close with the 30-Day Active-Habit Refund Guarantee.",
    deliverableSpec:
      "10-Min Parent Debrief Call Script + Cognitive Report Objection Box + Kill Criteria Tracker",
    marketTrigger:
      "Current Diag Completed -> Paid is 21.4% (3/14); must reach >= 25% to unlock Stage 2",
    courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Cognitive Report & Debrief Script",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Lift Diag Completed -> Paid Conversion from 21.4% to >= 28%",
    status: "Queued",
    requiredStage: "STAGE_1_CONVERSION",
  },
  {
    id: "act-daily-2",
    horizon: "Daily",
    timeWindow: "Today · Stage 1 Priority #2",
    title:
      "Trigger 72-Hour Post-Diagnostic Undecided Parent Close Sequence (Human Learning Manager Voice Note + 30-Day Guarantee)",
    tacticalExecution:
      "Send 3-touch email/SMS sequence to the 11 parents who completed diagnostics this week without enrolling on the call. Directly resolve VOC-103 ('If I still have to sit at the kitchen table nagging him to log in...') by showing the Friday Parent Accountability Scorecard.",
    deliverableSpec:
      "3-Touch Post-Diagnostic Follow-Up Sequence (Hours +2, +24, +72) with Single 1-Tap $139 CAD/mo Checkout CTA",
    marketTrigger: "11 completed diagnostics sitting undecided from this week's cohort",
    courseCodesTargeted: ["MCR3U", "MHF4U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Convert >= 2 of 11 undecided diagnostic families within 72 hours",
    status: "Queued",
    requiredStage: "STAGE_1_CONVERSION",
  },
  {
    id: "act-weekly-1",
    horizon: "Weekly",
    timeWindow: "Weekly Sprint · Stage 1 Conversion Audit",
    title:
      "Re-Design Page 1 of Student Cognitive Diagnostic Report to Highlight 'Homework vs. Closed-Book Test Gap'",
    tacticalExecution:
      "Add a red/green visual contrast box at the top of the PDF/web Cognitive Report comparing 'Homework Score with AI/Notes (92%)' vs. 'Unassisted Ontario Rubric Application Score (48%)'—followed immediately by the 30-Day Tier 2 Managed Hybrid prescription.",
    deliverableSpec:
      "Cognitive Report Layout Copy + $139 CAD/mo vs. $380/mo Centre Value Stack Table",
    marketTrigger: "Resolve VOC-101 & VOC-102 visually before the parent asks about price",
    courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Cognitive Report & Debrief Script",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Achieve >= 25% same-call close rate across 15 diagnostic debriefs",
    status: "Queued",
    requiredStage: "STAGE_1_CONVERSION",
  },
  {
    id: "act-monthly-1",
    horizon: "Monthly",
    timeWindow: "Month 1 · Stage 1 -> Stage 2 Transition Prep",
    title:
      "Prepare Week 4–6 'Unit-Test Win' Parent Referral Pass & GTA MCR3U/SBI3U Parent Seminar Kit (Unlocks at 26 Students)",
    tacticalExecution:
      "Build the automated WhatsApp/SMS referral trigger for our first 25 paying families when their teen logs a +10% unit test improvement, arming each parent with 2 VIP Diagnostic Guest Passes.",
    deliverableSpec:
      "Week 4–6 Parent Referral Invite Flow + 30-Min Ontario Parent Seminar Script",
    marketTrigger: "Prepare zero-CAC Stage 2 referral engine as soon as Stage 1 hits 25 paid students",
    courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Parent Referral & Seminar Kit",
    funnelObjective: "Parent Retention & Referral",
    targetKpi: "Referral & Seminar -> Diagnostic Booked >= 40% in Stage 2",
    status: "Queued",
    requiredStage: "STAGE_2_REFERRAL_DIAG",
  },
  {
    id: "act-quarterly-1",
    horizon: "Quarterly",
    timeWindow: "90-Day Milestone · First 100 Paid Students ($13,900 CAD MRR)",
    title:
      "Stage-Gated Progression: 0–25 Conversion Lock -> 26–60 Referral & Seminar Lock -> 61–100 GTA Paid Ad Scale",
    tacticalExecution:
      "Enforce strict stage progression: do not spend cold ad budget in Stage 1 (0–25); scale referrals and MPM2D/MCR3U/MHF4U/SBI3U unit-test seminars in Stage 2 (26–60); unlock Mississauga/Oakville/Markham/Toronto Meta & Google ads in Stage 3 (61–100) with hard $150 CAD Blended CAC stop-loss.",
    deliverableSpec:
      "90-Day Stage-Gated Acquisition Playbook & Unit Economics Dashboard",
    marketTrigger: "Path to 100 Tier 2 Managed Hybrid students ($139 CAD/month)",
    courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "MCV4U", "SBI3U"],
    assignedAgentId: "agent-intel",
    skillName: "cro",
    targetPlatform: "Cognitive Report & Debrief Script",
    funnelObjective: "Conversion Optimization",
    targetKpi: "100 Paid Students ($13,900 CAD MRR) with Blended CAC < $150 CAD",
    status: "Queued",
    requiredStage: "STAGE_1_CONVERSION",
  },
  {
    id: "act-annual-1",
    horizon: "Annual",
    timeWindow: "Annual 4-Peak Ontario Academic Retention & Expansion Cycle",
    title:
      "Multi-Grade STEM Progression Engine (Grade 9 MTH1W -> Grade 10 MPM2D -> Grade 11 MCR3U/SBI3U -> Grade 12 MHF4U/MCV4U)",
    tacticalExecution:
      "Transition active Tier 2 ($139 CAD/mo) students across semesters and summer bridge cohorts so a Grade 9/10 student remains enrolled through Grade 12 OUAC university admissions.",
    deliverableSpec:
      "Annual Semester-Bridge Retention & Sibling Referral Playbook",
    marketTrigger: "Maximize LTV:CAC ratio across the 4-year Ontario secondary STEM lifecycle",
    courseCodesTargeted: ["MTH1W", "MPM2D", "MCR3U", "MHF4U", "MCV4U", "SBI3U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelObjective: "Parent Retention & Referral",
    targetKpi: "Average Student Retention >= 10.5 months (LTV >= $1,459 CAD on <$150 CAC)",
    status: "Queued",
    requiredStage: "STAGE_1_CONVERSION",
  },
];

const INITIAL_QA_HISTORY: PlanQaExchange[] = [
  {
    id: "qa-init-1",
    timestamp: "Active Safeguard Brief",
    cmoQuestion:
      "Why are cold Meta ads and SEO blog clusters currently blocked in our workspace?",
    horizonAffected: "Daily",
    strategistAnswer:
      "Because we are currently at **14 / 100 paid students** ($1,946 CAD MRR on the $139 CAD/mo Tier 2 Managed Hybrid Plan), the **Single-Bottleneck Lock-In Engine** has locked the workspace to **`STAGE_1_CONVERSION`** (*Diagnostic Completed -> Paid Conversion >= 25%*). Our latest Weekly Reality Log shows 14 completed diagnostics and 3 paid conversions (**21.4%**). Until we lift that above **25%** using the *10-Minute Parent Debrief Script*, *Cognitive Report redesign*, and *30-Day Active-Habit Guarantee*, running cold ads or blog clusters would burn time and budget.",
    planAdjustmentsMade: [
      "Locked workspace to STAGE_1_CONVERSION (0–25 Paid Students)",
      "Injected VoC quotes VOC-101..VOC-104 from WeeklyRealityLog into all proposals",
    ],
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "msg-welcome",
    sender: "ai",
    timestamp: "Just now",
    skillName: "cro",
    detailLevel: 3,
    linkedAssetId: "asset-stage1-debrief",
    linkedPlatform: "Cognitive Report & Debrief Script",
    strategicJustification: {
      detailLevel: 3,
      levelLabel: "Level 3: Deep Mentorship (The Why & How)",
      headlineSummary:
        "Conversion Safeguards & HITL State Machine Active (Goal: First 100 Paid Students @ $139 CAD/mo Tier 2 Managed Hybrid).",
      rationaleBody:
        "1. **Weekly Reality Gate (`UNLOCKED` — Week of 2026-11-16 Logged):** 4 verbatim Ontario parent quotes (`VOC-101`..`VOC-104`) and your live funnel rates (`21.4% Diag-to-Paid`) are context-cached into my system prompt. (Click **'Test Reality Gate Lock'** in the top bar to see how new generation locks when a weekly log is missing!).\n2. **Single-Bottleneck Lock-In (`STAGE_1_CONVERSION` at 14/100 Students):** I will strictly block out-of-scope requests (like cold Meta ads or SEO blogs) and warn you with bottleneck math unless you explicitly override.\n3. **Mandatory Proposal Schema & HITL Approval:** Every card on the Left Canvas includes **Cited VoC Quotes**, **Single CTA**, **Devil's Advocate Failure Hypothesis & Blind-Spot Question**, and **Kill Criteria Stop-Loss**.",
      frameworksApplied: [
        "Weekly Reality Gate (VoC Cache)",
        "Single-Bottleneck Lock-In (Stage 1)",
        "Mandatory Proposal Schema (Devil's Advocate + Kill Criteria)",
        "HITL Approval State Machine",
      ],
      mentorshipTakeaway:
        "Try typing 'Write a cold Facebook ad for GTA parents' below to see the Single-Bottleneck Scope-Drift Guardrail in action—or click 'Refine in Chat' on any Left Canvas card to revise it conversationally!",
      contextCacheStatus:
        "Context Cache HIT (4 VoC quotes + 21.4% Diag-to-Paid rate injected)",
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
  selectedSkillId: "skill-cro",
  detailLevel: 3,
  preferredPlatform: "Cognitive Report & Debrief Script",
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
      "Ontario Ministry of Education Grades 9–12 STEM (MTH1W, MPM2D, MCR3U, MHF4U, MCV4U, SBI3U).",
    brandVoice:
      "Direct, evidence-driven, empathetic to parent homework stress, anti-shortcut (Socratic mastery over ChatGPT answer-copying).",
    antiPersonaObjections:
      "1. VOC-101 (ai_cheating): 'My son uses ChatGPT to finish homework in 5 mins and gets 58% on unit tests.' 2. VOC-102 (price): 'We burned $380/mo at Mathnasium—why won't he ignore this $139/mo subscription?' -> Answered via 30-Day Active-Habit Guarantee.",
    geminiModel: "gemini-2.5-pro (HITL Safeguard Schema v2.0)",
  },

  // Safeguard 1 Initial State
  realityGateStatus: "UNLOCKED",
  pilotWeek0Used: false,
  weeklyRealityLogs: INITIAL_REALITY_LOGS,
  isRealityGateModalOpen: false,

  // Safeguard 2 Initial State (14 Paid Students -> STAGE_1_CONVERSION)
  paidStudentCount: 14,
  activeBottleneckStage: "STAGE_1_CONVERSION",
  pendingScopeDriftCommand: null,

  // Safeguard 3 & 4 Initial State
  activeRevisionAssetId: null,

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
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setDetailLevel: (level) => set({ detailLevel: level }),
  setPreferredPlatform: (platform) => set({ preferredPlatform: platform }),
  setActiveHorizon: (horizon) => set({ activeHorizon: horizon }),
  setActiveRevisionAssetId: (assetId) =>
    set({ activeRevisionAssetId: assetId }),

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
          id: `VOC-${105 + state.weeklyRealityLogs.length * 2 + idx}`,
          quote_text: q.quote_text.trim(),
          context_tag: q.context_tag,
          week_start_date: payload.week_start_date,
        }));

      const newLog: WeeklyRealityLog = {
        id: `wrl-${Date.now()}`,
        week_start_date: payload.week_start_date,
        funnel_metrics: payload.funnel_metrics,
        verbatim_parent_quotes: formattedQuotes,
        top_winning_touchpoint: payload.top_winning_touchpoint.trim(),
        created_at: new Date().toISOString(),
      };

      const newPaidTotal = Math.min(
        100,
        Math.max(0, payload.funnel_metrics.paid_conversions)
      );

      return {
        weeklyRealityLogs: [newLog, ...state.weeklyRealityLogs],
        realityGateStatus: "UNLOCKED",
        isRealityGateModalOpen: false,
        paidStudentCount:
          newPaidTotal > 0 ? newPaidTotal : state.paidStudentCount,
        activeBottleneckStage: getBottleneckStageForStudents(
          newPaidTotal > 0 ? newPaidTotal : state.paidStudentCount
        ),
      };
    }),

  activatePilotWeek0Override: () =>
    set((state) => {
      if (state.pilotWeek0Used) return state;
      return {
        realityGateStatus: "PILOT_WEEK_0_OVERRIDE",
        pilotWeek0Used: true,
        isRealityGateModalOpen: false,
      };
    }),

  setPaidStudentCount: (count) => {
    const clamped = Math.max(0, Math.min(100, count));
    const stage = getBottleneckStageForStudents(clamped);
    const defaultPlatformForStage: Record<
      ActiveBottleneckStage,
      AssetPlatform
    > = {
      STAGE_1_CONVERSION: "Cognitive Report & Debrief Script",
      STAGE_2_REFERRAL_DIAG: "Parent Referral & Seminar Kit",
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
    explicitStageOverride = false
  ) => {
    const state = get();
    const isRevisingExisting = Boolean(state.activeRevisionAssetId);

    // =========================================================================
    // SAFEGUARD 1 ENFORCEMENT: WEEKLY REALITY GATE
    // Block `generateNewProposal()` when LOCKED, but ALLOW conversational
    // refinement of existing proposals!
    // =========================================================================
    if (!isRevisingExisting && state.realityGateStatus === "LOCKED") {
      set({ isRealityGateModalOpen: true });
      const gateMsg: ChatMessage = {
        id: `msg-gate-${Date.now()}`,
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
            "No WeeklyRealityLog is active for the current 7-day cycle. Submit the 60-second Weekly Reality Check (funnel metrics + 2 verbatim parent quotes) or use the one-time 'Pilot Week 0 Bootstrap' override to unlock new generation. Note: You CAN still refine existing proposals on the Left Canvas by clicking 'Refine in Chat' on any card.",
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

    // =========================================================================
    // SAFEGUARD 2 ENFORCEMENT: SINGLE-BOTTLENECK LOCK-IN ENGINE
    // Check if the Acting CMO requested an out-of-scope proposal
    // =========================================================================
    if (!isRevisingExisting && !explicitStageOverride) {
      const drift = checkBottleneckScopeDrift({
        userCommand,
        preferredPlatform: state.preferredPlatform,
        activeStage: state.activeBottleneckStage,
        paidStudents: state.paidStudentCount,
        funnelMetrics: latestLog.funnel_metrics,
      });

      if (drift.detected) {
        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
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

    const targetAssetForRevision = state.activeRevisionAssetId
      ? state.assets.find((a) => a.id === state.activeRevisionAssetId)
      : undefined;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      timestamp: nowTime,
      skillName: skill.skill_name,
      detailLevel: state.detailLevel,
      userPrompt: targetAssetForRevision
        ? `[Refining Proposal: ${targetAssetForRevision.proposal_schema?.proposal_id || targetAssetForRevision.title}] ${userCommand}`
        : explicitStageOverride
        ? `[CMO Stage Override Confirmed] ${userCommand}`
        : userCommand,
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
    });

    if (targetAssetForRevision) {
      // Update existing proposal in place and reset HITL state to DRAFT for re-verification
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
                devils_advocate_verified: false,
                kill_criteria_acknowledged: false,
                revision_count: (a.revision_count || 1) + 1,
                updated_at: "Revised via CMO Chat just now",
              }
            : a
        ),
        chatMessages: [...prev.chatMessages, aiMsg],
        isGenerating: false,
        lastHighlightedAssetId: targetAssetForRevision.id,
      }));
      return;
    }

    // Create new schema-validated Proposal Card on Left Canvas
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
      proposal_schema: response.proposalSchema,
      hitl_state: "DRAFT",
      devils_advocate_verified: false,
      kill_criteria_acknowledged: false,
      revision_count: 1,
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
              updated_at: `HITL -> ${nextState} (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
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
      courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
      assignedAgentId: "agent-cro",
      skillName: "cro",
      targetPlatform: "Cognitive Report & Debrief Script",
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
      targetPlatform: "Cognitive Report & Debrief Script",
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
      title: result.assetTitle,
      content: result.content,
      detail_level_used: 3,
      skill_used: activity.skillName,
      agent_author: agent.codeName,
      updated_at: "Generated by " + agent.codeName,
      proposal_schema: result.proposalSchema,
      hitl_state: "DRAFT",
      devils_advocate_verified: false,
      kill_criteria_acknowledged: false,
      revision_count: 1,
    };

    const aiMsg: ChatMessage = {
      id: `msg-agent-${Date.now()}`,
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      skillName: activity.skillName,
      detailLevel: 3,
      linkedAssetId: newAssetId,
      linkedPlatform: result.platform,
      strategicJustification: {
        detailLevel: 3,
        levelLabel: "Level 3: Deep Mentorship (The Why & How)",
        headlineSummary: `[Autonomous Agent Proposal Drafted] ${result.agentReport}`,
        rationaleBody: `• **Bottleneck Stage Lock:** ${state.activeBottleneckStage}\n• **Cited VoC Quotes:** ${result.proposalSchema.cited_voc_quotes.join(" ; ")}\n• **Devil's Advocate Risk:** ${result.proposalSchema.devils_advocate.primary_failure_hypothesis}\n• **Kill Criteria:** ${result.proposalSchema.kill_criteria.sample_threshold} -> ${result.proposalSchema.kill_criteria.stop_loss_metric}`,
        frameworksApplied: [
          agent.codeName,
          state.activeBottleneckStage,
          "Mandatory Proposal Schema",
        ],
        mentorshipTakeaway: `Review Devil's Advocate & Kill Criteria on the Left Canvas to transition "${result.assetTitle}" from DRAFT to APPROVED_FOR_EXECUTION.`,
        contextCacheStatus: `Context Cache HIT (${allVocQuotes.length} VoC quotes injected)`,
      },
    };

    set((prev) => ({
      runningActivityId: null,
      assets: [newAsset, ...prev.assets],
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
              updated_at: "Edited manually just now",
            }
          : a
      ),
    })),

  deleteAsset: (assetId) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== assetId),
      activeRevisionAssetId:
        state.activeRevisionAssetId === assetId
          ? null
          : state.activeRevisionAssetId,
    })),

  createManualAsset: (platform, title, content) =>
    set((state) => {
      const id = `asset-${Date.now()}`;
      const latestLog = state.weeklyRealityLogs[0] || INITIAL_REALITY_LOGS[0];
      const firstQuote = latestLog.verbatim_parent_quotes[0];
      const created: Asset = {
        id,
        campaign_id: state.activeCampaignId,
        platform,
        title: title || `${platform} Proposal`,
        content,
        detail_level_used: state.detailLevel,
        skill_used: "manual",
        updated_at: "Just now",
        hitl_state: "DRAFT",
        devils_advocate_verified: false,
        kill_criteria_acknowledged: false,
        revision_count: 1,
        proposal_schema: {
          proposal_id: `PROP-MAN-${Date.now().toString().slice(-4)}`,
          title: title || `${platform} Proposal`,
          bottleneck_stage: state.activeBottleneckStage,
          channel: platform,
          target_metric:
            state.activeBottleneckStage === "STAGE_1_CONVERSION"
              ? "Diagnostic Completed -> Paid Conversion >= 25%"
              : state.activeBottleneckStage === "STAGE_2_REFERRAL_DIAG"
              ? "Referral & Seminar -> Diagnostic Booked >= 40%"
              : "GTA Paid Ad Blended CAC < $150 CAD",
          cited_voc_quotes: [
            firstQuote
              ? `[${firstQuote.id} · ${firstQuote.context_tag}] "${firstQuote.quote_text}"`
              : '[VOC-101 · ai_cheating] "My son uses ChatGPT to finish homework in 5 mins and gets 58% on his MCR3U test."',
          ],
          single_cta:
            "Book or Activate Your Teen's $139 CAD/mo Tier 2 Managed Hybrid Plan (30-Day Active-Habit Guarantee)",
          asset_body: content,
          devils_advocate: {
            primary_failure_hypothesis:
              "Parents may hesitate if this manual draft does not explicitly contrast Socratic AI hints against answer-dumping chatbots.",
            blind_spot_question:
              "Does this asset cite a real parent objection from this week's reality log?",
          },
          kill_criteria: {
            sample_threshold: "15 parent interactions / debriefs",
            stop_loss_metric: "< 20% conversion to next funnel step",
            pivot_action:
              "Refine via CMO Co-Pilot chat using the top winning touchpoint from WeeklyRealityLog.",
          },
          revision_notes: "Manual draft created by Acting CMO.",
        },
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
