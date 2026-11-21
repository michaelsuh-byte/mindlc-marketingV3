export type UserRole = "Admin" | "Editor" | "Viewer";

export interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface MarketingSkill {
  id: string;
  skill_name: string;
  system_prompt: string;
  category?: string;
  description?: string;
  created_at?: string;
}

export type CampaignStatus = "Draft" | "Approved";

export interface Campaign {
  id: string;
  title: string;
  status: CampaignStatus;
  created_at: string;
}

export type AssetPlatform =
  | "Parent Call"
  | "Email"
  | "Community"
  | "Cognitive Report & Debrief Script"
  | "Email Sequence"
  | "Parent Referral & Seminar Kit"
  | "Landing Page"
  | "Facebook"
  | "SEO Meta"
  | "Blog";

export type DetailLevel = 1 | 2 | 3;

// ============================================================================
// 1. WEEKLY REALITY GATE (DATA-LOCKED GENERATION) TYPES
// ============================================================================

export type VoCContextTag =
  | "trust"
  | "price"
  | "ai_cheating"
  | "student_motivation"
  | "curriculum";

export interface VerbatimParentQuote {
  id: string; // e.g., "VOC-101"
  quote_text: string;
  context_tag: VoCContextTag;
  week_start_date: string;
  is_sample?: boolean;
}

export interface WeeklyFunnelMetrics {
  reach_or_contacts: number;
  diag_booked: number;
  diag_completed: number;
  paid_conversions: number;
}

export interface WeeklyRealityLog {
  id: string;
  week_start_date: string; // ISO date string YYYY-MM-DD
  funnel_metrics: WeeklyFunnelMetrics;
  verbatim_parent_quotes: VerbatimParentQuote[]; // Minimum 2 required
  top_winning_touchpoint: string;
  created_at: string;
  is_sample?: boolean;
}

export type RealityGateStatus =
  | "LOCKED"
  | "UNLOCKED"
  | "PILOT_WEEK_0_OVERRIDE";

// ============================================================================
// 2. SINGLE-BOTTLENECK LOCK-IN ENGINE TYPES (0 -> 100 Students @ $139 CAD/mo)
// ============================================================================

export type ActiveBottleneckStage =
  | "STAGE_1_CONVERSION"
  | "STAGE_2_REFERRAL_DIAG"
  | "STAGE_3_SCALE_ADS";

export interface BottleneckStageConfig {
  stage: ActiveBottleneckStage;
  shortLabel: string;
  label: string;
  studentRange: [number, number];
  lockedObjective: string;
  targetBenchmark: string;
  allowedProposalTypes: string[];
  blockedScope: string[];
  blockedKeywords: string[];
}

export interface ScopeDriftWarning {
  detected: boolean;
  requestedCommand: string;
  activeStage: ActiveBottleneckStage;
  blockedReason: string;
  bottleneckMathExplanation: string;
  suggestedInScopeAlternative: string;
}

// ============================================================================
// 3. MANDATORY PROPOSAL SCHEMA (DEVIL'S ADVOCATE + KILL CRITERIA) & HITL STATE
// ============================================================================

export type HITLProposalState =
  | "KILLED_BY_STOP_LOSS" // 🔴 Kill-Criteria Triggered (Pinned to top)
  | "DRAFT" // 🟡 Awaiting CMO Decision
  | "APPROVED_FOR_EXECUTION" // 🟢 Approved / Live
  | "VALIDATED_WINNER" // 🟢 Approved / Live (Target Met)
  | "ARCHIVED"; // ⚪ Archived / Killed (Institutional memory)

export interface ProposalVersionSnapshot {
  version: number;
  content: string;
  single_cta: string;
  change_summary: string;
  timestamp: string;
}

export interface CMOApprovalChecklist {
  ontario_context: boolean; // Speaks to real Ontario K/T/C/A, unit test, or anti-cheating concerns
  single_cta: boolean; // Asks the parent to take exactly one clear next step
  brand_trust: boolean; // Zero hype or exaggerated grade guarantees
}

export interface MandatoryProposalSchema {
  proposal_id: string;
  title: string;
  bottleneck_stage: ActiveBottleneckStage;
  channel: string;
  target_metric: string;
  cited_voc_quotes: string[]; // Exact quote IDs + snippets from WeeklyRealityLog
  single_cta: string; // Must be ONE clear next action for the parent
  asset_body: string; // Markdown string (the actual copy, script, or campaign asset)
  devils_advocate: {
    primary_failure_hypothesis: string;
    blind_spot_question: string;
  };
  kill_criteria: {
    sample_threshold: string;
    stop_loss_metric: string;
    pivot_action: string;
  };
  revision_notes: string;
}

export interface Asset {
  id: string;
  campaign_id: string;
  platform: AssetPlatform;
  channel_badge?: string; // e.g., "Parent Call", "Email", "Community", "Meta Ad"
  title?: string;
  content: string;
  detail_level_used: DetailLevel;
  skill_used?: string;
  agent_author?: string;
  updated_at?: string;
  // HITL & Mandatory Proposal Schema extensions
  proposal_schema?: MandatoryProposalSchema;
  hitl_state?: HITLProposalState;
  cmo_checklist?: CMOApprovalChecklist;
  devils_advocate_verified?: boolean;
  kill_criteria_acknowledged?: boolean;
  revision_count?: number;
  versions?: ProposalVersionSnapshot[];
  kill_or_reject_reason?: string;
  is_sample?: boolean;
}

export interface BrandPersona {
  companyName: string;
  planNameAndPrice: string; // "Tier 2 Managed Hybrid Plan: $139 CAD/month"
  targetAudience: string;
  coreHook: string;
  curriculumFocus: string;
  brandVoice: string;
  antiPersonaObjections: string;
  geminiModel: string;
}

export interface MandatoryOutputProtocol {
  protocolVersion: "2.0-MINDLC-HITL";
  targetPlatform: AssetPlatform;
  assetTitle: string;
  marketingContent: string;
  proposalSchema: MandatoryProposalSchema;
  changeSummaryPill?: string;
  strategicJustification: {
    detailLevel: DetailLevel;
    levelLabel:
      | "Level 1: Executive Summary (Fast)"
      | "Level 2: Standard Rationale"
      | "Level 3: Deep Mentorship (The Why & How)";
    headlineSummary: string;
    rationaleBody: string;
    frameworksApplied: string[];
    mentorshipTakeaway?: string;
    contextCacheStatus?: string;
  };
}

export interface ChatMessage {
  id: string;
  proposalId?: string;
  sender: "user" | "ai" | "guardrail";
  timestamp: string;
  skillName: string;
  detailLevel: DetailLevel;
  userPrompt?: string;
  changeSummaryPill?: string;
  strategicJustification?: MandatoryOutputProtocol["strategicJustification"];
  scopeDriftWarning?: ScopeDriftWarning;
  linkedAssetId?: string;
  linkedPlatform?: AssetPlatform;
  isRevisionTurn?: boolean;
}

// ============================================================================
// ONTARIO MARKET, COMPETITOR & EDUCATION TREND INTELLIGENCE TYPES
// ============================================================================

export interface OntarioTrendSignal {
  id: string;
  title: string;
  category:
    | "Ontario Academic Calendar"
    | "EQAO & Ministry Policy"
    | "OUAC University Admissions"
    | "Parent Search & Social Signal";
  urgency: "Critical Now" | "High (Next 14 Days)" | "Strategic Window";
  affectedGrades: string;
  courseCodes: string[];
  parentPainSummary: string;
  searchMomentum: string;
  recommendedCmoAction: string;
  recommendedAgentId: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  archetype:
    | "Franchise Learning Centre"
    | "1-on-1 Hourly Marketplace"
    | "Generic AI Answer Solver"
    | "Passive Self-Study Portal"
    | "Live Scanned Competitor";
  websiteUrl: string;
  pricingModel: string;
  theirPrimaryPitch: string;
  ontarioParentComplaint: string;
  structuralWeakness: string;
  mindlcCounterWedge: string;
  recommendedConversionPlay: string;
  lastScannedAt: string;
}

export type PlanHorizon =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annual";

export type FunnelObjective =
  | "Lead Generation"
  | "Conversion Optimization"
  | "Parent Retention & Referral";

export interface MarketingAgent {
  id: string;
  codeName: string;
  roleTitle: string;
  specialty: string;
  primarySkillName: string;
  targetPlatform: AssetPlatform;
  funnelFocus: FunnelObjective;
  status: "Idle / Ready" | "Executing Task" | "Completed Sprint";
  tasksCompletedCount: number;
  conversionMetricOwned: string;
}

export interface PlannedActivity {
  id: string;
  horizon: PlanHorizon;
  timeWindow: string;
  title: string;
  tacticalExecution: string;
  deliverableSpec: string;
  marketTrigger: string;
  courseCodesTargeted: string[];
  assignedAgentId: string;
  skillName: string;
  targetPlatform: AssetPlatform;
  funnelObjective: FunnelObjective;
  targetKpi: string;
  status: "Queued" | "Completed";
  outputAssetId?: string;
  adjustedByCmo?: boolean;
  cmoAdjustmentNote?: string;
  requiredStage?: ActiveBottleneckStage;
}

export interface PlanQaExchange {
  id: string;
  timestamp: string;
  cmoQuestion: string;
  horizonAffected: PlanHorizon | "All Horizons";
  strategistAnswer: string;
  planAdjustmentsMade: string[];
}
