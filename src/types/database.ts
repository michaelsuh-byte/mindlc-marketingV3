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
  | "Onboarding & Checkout UX"
  | "1:1 Consultation & Upgrade Script"
  | "VIP Referral & Outcome Brief"
  | "Cognitive Report & Debrief Script"
  | "Email Sequence"
  | "Parent Referral & Seminar Kit"
  | "Landing Page"
  | "Facebook"
  | "SEO Meta"
  | "Blog";

export type DetailLevel = 1 | 2 | 3;

// ============================================================================
// 1. 3-TIER × 3-STAGE ARCHITECTURE TYPES (`TierId` & `StageId`)
// ============================================================================

export type TierId = "TIER_1" | "TIER_2" | "TIER_3";
export type VoCTierTag = TierId | "ALL";
export type StageId = "STAGE_1" | "STAGE_2" | "STAGE_3";

// Backward-compatible alias for StageId
export type ActiveBottleneckStage = StageId;

export interface EditableStageGoal {
  stage_id: StageId;
  stage_title: string; // e.g., "Activation & Self-Serve Conversion"
  short_badge: string; // e.g., "Stage 1: Fix Diag → Paid (≥ 12%)"
  min_paid: number;
  max_paid: number;
  target_paid_count: number;
  primary_kpi_name: string;
  primary_kpi_target_pct: number;
  secondary_kpi_summary: string;
  allowed_scope: string[];
  blocked_scope: string[];
  blocked_keywords: string[];
}

// ============================================================================
// 2. WEEKLY REALITY GATE & SHARED VOC VAULT TYPES
// ============================================================================

export type VoCContextTag =
  | "trust"
  | "price"
  | "ai_cheating"
  | "student_motivation"
  | "curriculum";

export interface VerbatimParentQuote {
  id: string; // e.g., "VOC-101"
  tier_id: VoCTierTag; // "TIER_1" | "TIER_2" | "TIER_3" | "ALL"
  quote_text: string;
  context_tag: VoCContextTag;
  week_start_date: string;
  is_sample?: boolean;
}

export interface WeeklyFunnelMetrics {
  reach_or_contacts: number; // Step 1 (Tier-specific label)
  diag_booked: number; // Step 2 (Tier-specific label)
  diag_completed: number; // Step 3 (Tier-specific label)
  paid_conversions: number; // Step 4 (Tier-specific label)
}

export interface WeeklyRealityLog {
  id: string;
  tier_id: TierId;
  week_start_date: string; // ISO date string YYYY-MM-DD
  funnel_metrics: WeeklyFunnelMetrics;
  verbatim_parent_quotes: VerbatimParentQuote[];
  top_winning_touchpoint: string;
  created_at: string;
  is_sample?: boolean;
}

export type RealityGateStatus =
  | "LOCKED"
  | "UNLOCKED"
  | "PILOT_WEEK_0_OVERRIDE";

export interface ScopeDriftWarning {
  detected: boolean;
  violationType: "STAGE_BOTTLENECK_DRIFT" | "CROSS_TIER_TONE_BLEED";
  requestedCommand: string;
  tierId: TierId;
  activeStage: StageId;
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
  ontario_context: boolean;
  single_cta: boolean;
  brand_trust: boolean;
}

export type MarketingProposalStatus =
  | "IN_REVIEW"
  | "REFINING"
  | "APPROVED"
  | "LIVE"
  | "KILL_TRIGGERED"
  | "ARCHIVED";

export type MarketingProposalChannel =
  | "Email"
  | "Parent Call"
  | "Consultation"
  | "Community"
  | "Social"
  | "SMS"
  | "Landing Page"
  | string;

export interface MandatoryProposalSchema {
  proposal_id: string;
  tier_id: TierId;
  stage_id: StageId;
  bottleneck_stage: StageId; // Alias for stage_id
  status?: MarketingProposalStatus;
  version?: number;
  title: string;
  channel: MarketingProposalChannel;
  target_metric: string;
  cited_voc_quotes: string[];
  single_cta: string;
  asset_body: string;
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
  previous_asset_body?: string;
}

export type MarketingProposal = MandatoryProposalSchema;

export interface TierPricingConfig {
  base_monthly_cad: number; // $39 for Tier 1, $139 for Tier 2, $399 for Tier 3
  semester_pass_5mo_cad: number; // $165 for Tier 1, $590 for Tier 2, $1,795 for Tier 3
  sibling_addon_monthly_cad: number; // $19 for Tier 1, $79 for Tier 2, $349 for Tier 3
  intensive_addon_monthly_cad?: number; // +$250/mo for Tier 3 ($649/mo total -> 8x60-min sessions/mo)
  intensive_semester_pass_5mo_cad?: number; // $2,995 for Tier 3 8x60-min 5-mo pass
}

export type PeriodClosingStatus = "OPEN" | "AUDITED" | "CLOSED_AND_LOCKED";

export interface MonthlyTierLedgerEntry {
  id: string;
  period_month: string; // e.g., "2026-11" (YYYY-MM)
  period_label: string; // e.g., "November 2026"
  tier_id: TierId;
  active_stage: StageId;
  status: PeriodClosingStatus;
  // Student & Add-on Unit Counts
  opening_paid_students: number;
  new_paid_students: number;
  churned_students: number;
  closing_paid_students: number;
  semester_pass_5mo_count: number;
  sibling_addon_count: number;
  intensive_addon_count: number; // Tier 3 +$250/mo 8-session add-on count
  // Funnel & Ad Spend Actuals
  reach_or_contacts: number;
  diag_or_consult_booked: number;
  diag_or_consult_completed: number;
  ad_spend_cad: number;
  tutor_delivery_hours?: number; // For Tier 3 4x60-min vs 8x60-min session cap audit
  // Calculated & Audited Fields (dynamically computed from pricing + counts)
  recognized_mrr_cad: number;
  semester_pass_cash_collected_cad: number;
  total_gross_cash_cad: number;
  blended_cac_cad: number;
  // Dual-View Closing Notes (Finance Ledger Audit + Executive CMO Closing Brief)
  finance_reconciliation_note: string;
  cmo_closing_audit_summary: string;
  next_month_stage_recommendation: string;
  closed_at?: string;
  closed_by?: string;
}

export interface Asset {
  id: string;
  tier_id: TierId;
  stage_id: StageId;
  campaign_id: string;
  platform: AssetPlatform;
  channel_badge?: string;
  title?: string;
  content: string;
  detail_level_used: DetailLevel;
  skill_used?: string;
  agent_author?: string;
  updated_at?: string;
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

export interface TierWorkspaceState {
  tier_id: TierId;
  tier_name: string; // e.g., "Tier 1 — Online Self-Coach"
  tier_short_name: string; // e.g., "Tier 1 · Self-Coach"
  price_label: string; // e.g., "$39/mo | 5-mo Pass $165 | Sibling +$19/mo"
  monthly_price_cad: number; // Base monthly price ($39, $139, $399)
  pricing_config: TierPricingConfig;
  offer_summary: string;
  target_persona: string;
  tone_guardrail: string;
  forbidden_cross_tier_claims: string[];
  forbidden_cross_tier_keywords: string[];
  funnel_labels: [string, string, string, string]; // 4 tier-specific funnel step labels
  north_star_paid_goal: number; // 300 for Tier 1, 100 for Tier 2, 30 for Tier 3
  current_paid_count: number;
  active_stage: StageId;
  manual_stage_override: boolean;
  stage_goals: Record<StageId, EditableStageGoal>;
  reality_gate_status: RealityGateStatus;
  weekly_reality_logs: WeeklyRealityLog[];
  monthly_ledger: MonthlyTierLedgerEntry[];
  proposals: Asset[];
  selected_proposal_id: string;
}

export interface BrandPersona {
  companyName: string;
  planNameAndPrice: string;
  targetAudience: string;
  coreHook: string;
  curriculumFocus: string;
  brandVoice: string;
  antiPersonaObjections: string;
  geminiModel: string;
}

export interface MandatoryOutputProtocol {
  protocolVersion: "3.0-MINDLC-3TIER";
  tierId: TierId;
  stageId: StageId;
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
  tierId?: TierId;
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
  tier_id?: TierId;
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
  requiredStage?: StageId;
}

export interface PlanQaExchange {
  id: string;
  timestamp: string;
  cmoQuestion: string;
  horizonAffected: PlanHorizon | "All Horizons";
  strategistAnswer: string;
  planAdjustmentsMade: string[];
}
