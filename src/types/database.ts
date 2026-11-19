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

/**
 * Mandatory Output Protocol:
 * Strictly separates the generated marketing asset (for the Left Pane Asset Canvas)
 * from the Strategic Justification (for the Right Pane AI Chat Window).
 */
export interface MandatoryOutputProtocol {
  protocolVersion: "1.0-MINDLC";
  targetPlatform: AssetPlatform;
  assetTitle: string;
  marketingContent: string; // Strictly routed to Left Pane (Asset Canvas)
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
  }; // Strictly routed to Right Pane (Chat Feed)
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
