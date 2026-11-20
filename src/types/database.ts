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
  | "Landing Page"
  | "Facebook"
  | "Blog"
  | "SEO Meta"
  | "Email Sequence";

export type DetailLevel = 1 | 2 | 3;

export interface Asset {
  id: string;
  campaign_id: string;
  platform: AssetPlatform;
  title?: string;
  content: string;
  detail_level_used: DetailLevel;
  skill_used?: string;
  agent_author?: string;
  updated_at?: string;
}

export interface BrandPersona {
  companyName: string;
  targetAudience: string;
  coreHook: string;
  curriculumFocus: string;
  brandVoice: string;
  antiPersonaObjections: string;
  geminiModel: string;
}

export interface MandatoryOutputProtocol {
  protocolVersion: "1.0-MINDLC";
  targetPlatform: AssetPlatform;
  assetTitle: string;
  marketingContent: string;
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
  };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  timestamp: string;
  skillName: string;
  detailLevel: DetailLevel;
  userPrompt?: string;
  strategicJustification?: MandatoryOutputProtocol["strategicJustification"];
  linkedAssetId?: string;
  linkedPlatform?: AssetPlatform;
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

// ============================================================================
// SELF-GUIDED MULTI-AGENT MARKETING TEAM & MULTI-HORIZON PLANNER TYPES
// ============================================================================

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
  tacticalExecution: string; // Concrete, zero-jargon execution blueprint
  deliverableSpec: string; // Exact output artifact produced
  marketTrigger: string; // Ontario trend or competitor gap driving this activity
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
}

export interface PlanQaExchange {
  id: string;
  timestamp: string;
  cmoQuestion: string;
  horizonAffected: PlanHorizon | "All Horizons";
  strategistAnswer: string;
  planAdjustmentsMade: string[];
}
