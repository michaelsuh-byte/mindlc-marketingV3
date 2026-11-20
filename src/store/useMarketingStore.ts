import { create } from "zustand";
import {
  Asset,
  AssetPlatform,
  BrandPersona,
  Campaign,
  CampaignStatus,
  ChatMessage,
  CompetitorProfile,
  DetailLevel,
  MarketingAgent,
  MarketingSkill,
  OntarioTrendSignal,
  PlanHorizon,
  PlannedActivity,
  PlanQaExchange,
  UserRecord,
} from "@/types/database";
import {
  evaluateCmoPlanQuestionAndAdjust,
  executeAutonomousAgentTask,
  generateMarketingResponse,
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

  // Dual-Pane Co-Pilot Command Action
  sendCopilotCommand: (userCommand: string) => Promise<void>;

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

  // Skill Library CRUD Actions (Page 2)
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

const INITIAL_ONTARIO_TRENDS: OntarioTrendSignal[] = [
  {
    id: "trend-midterm-shock",
    title: "Ontario Semester 1 Midterm Report Cards & Parent-Teacher Interviews (TDSB, YRDSB, PDSB, HDSB)",
    category: "Ontario Academic Calendar",
    urgency: "Critical Now",
    affectedGrades: "Grades 9–12 Secondary",
    courseCodes: ["MTH1W", "MPM2D", "MCR3U", "MHF4U", "MCV4U"],
    parentPainSummary:
      "Midterm marks just landed across GTA school boards. Parents seeing a 62%–74% in Grade 11 Functions (MCR3U) or Grade 12 Advanced Functions (MHF4U) realize they have 8 weeks left before final exams to protect university admissions.",
    searchMomentum: "+68% week-over-week surge in 'Grade 11 functions tutor Ontario' & 'how to raise midterm math mark'",
    recommendedCmoAction:
      "Run '8-Week Semester Rescue' parent ads & landing page header offering an immediate Midterm Exam Error-Analysis Diagnostic with a Human Learning Manager.",
    recommendedAgentId: "agent-social",
  },
  {
    id: "trend-eqao-mth1w",
    title: "Semester 1 Grade 9 De-Streamed Math (MTH1W) EQAO Assessment Preparation Window",
    category: "EQAO & Ministry Policy",
    urgency: "High (Next 14 Days)",
    affectedGrades: "Grade 8 Transition & Grade 9",
    courseCodes: ["MTH1W", "Grade 8 Foundations"],
    parentPainSummary:
      "Since Ontario de-streamed Grade 9 math into a single MTH1W course, teachers move rapidly through algebraic modelling and linear relations. EQAO counts for up to 10–15% of the final course mark.",
    searchMomentum: "+54% surge in 'Grade 9 EQAO math practice tests Ontario' and 'MTH1W tutoring'",
    recommendedCmoAction:
      "Publish a free downloadable 'MTH1W EQAO Multi-Step Problem Guide' gated behind a 2-step Parent Diagnostic booking.",
    recommendedAgentId: "agent-seo",
  },
  {
    id: "trend-anti-chatbot-cheating",
    title: "Parent Backlash Against Teens Using ChatGPT / Photomath as Homework Shortcuts",
    category: "Parent Search & Social Signal",
    urgency: "Critical Now",
    affectedGrades: "Grades 7–12",
    courseCodes: ["MTH1W", "MPM2D", "MCR3U", "MHF4U"],
    parentPainSummary:
      "Parents report their teens get 95% on take-home assignments by copying AI answers, then score 54% on closed-book in-class unit tests because they never learned the underlying math steps.",
    searchMomentum: "+81% rise in AI search queries for 'AI math tutor that doesn't give the answer' and 'Socratic math tutor'",
    recommendedCmoAction:
      "Anchor all top-of-funnel messaging on MindLC's Socratic Guardrail: 'Never gives the final answer—asks guided step-by-step questions like an elite teacher.'",
    recommendedAgentId: "agent-cro",
  },
  {
    id: "trend-ouac-cutoff",
    title: "OUAC University Application Deadlines & Grade 12 Top-6 Prerequisite Compression",
    category: "OUAC University Admissions",
    urgency: "Strategic Window",
    affectedGrades: "Grades 11 & 12 University Track",
    courseCodes: ["MCR3U", "MHF4U", "MCV4U"],
    parentPainSummary:
      "Waterloo, U of T, McMaster, Queen's, and Western Engineering/Business/CS programs require mid-80s to low-90s in MHF4U and MCV4U. Early conditional offers rely heavily on Grade 11 MCR3U and Semester 1 MHF4U marks.",
    searchMomentum: "+49% search lift for 'MHF4U advanced functions tutor Ontario' & 'MCV4U calculus prep'",
    recommendedCmoAction:
      "Deploy 'University Prerequisite Protection' campaign targeting parents of Grade 11/12 STEM & Business applicants.",
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
    theirPrimaryPitch: "In-person neighbourhood math centres with structured worksheet progressions.",
    ontarioParentComplaint:
      "\"I'm tired of driving through Ontario winter traffic twice a week just for my Grade 10/11 teen to fill out generic arithmetic worksheets while a college student watches 5 kids at once.\"",
    structuralWeakness:
      "Strong for K–6 arithmetic drill, but poorly equipped for Ontario Grades 9–12 Ministry Thinking & Application word problems (MTH1W, MCR3U, MHF4U, MCV4U) and completely closed at 9:45 PM when homework panic hits.",
    mindlcCounterWedge:
      "Zero winter driving + 24/7 Socratic AI tuned specifically to Ontario Grades 7–12 course codes + a 1-on-1 Human Learning Manager who tracks actual school unit tests instead of generic worksheets.",
    recommendedConversionPlay:
      "Run 'Stop Driving to Worksheet Centres' Facebook Ad + Comparison Page with a 'Switch & Save' Free Diagnostic.",
    lastScannedAt: "Verified Today",
  },
  {
    id: "comp-hourly-tutors",
    name: "1-on-1 Private & Marketplace Tutors (Varsity Tutors / Superprof / $80/hr Private)",
    archetype: "1-on-1 Hourly Marketplace",
    websiteUrl: "https://www.varsitytutors.com",
    pricingModel: "$65–$95/hour (typically 1 hour per week = $320–$380/mo)",
    theirPrimaryPitch: "1-on-1 live video or in-home tutoring sessions once a week.",
    ontarioParentComplaint:
      "\"The tutor explains it on Sunday afternoon and my son nods along, but when he gets stuck on Wednesday night homework before Thursday's quiz, the tutor isn't there.\"",
    structuralWeakness:
      "The '6-Day Homework Gap': 1 hour of passive explanation per week does not build daily problem-solving habits, and there is zero mid-week support or structured daily accountability.",
    mindlcCounterWedge:
      "Continuous 7-day coverage: Your Human Learning Manager sets the weekly study plan and accountability checkpoints, while our 24/7 Socratic AI coaches your teen through Tuesday and Wednesday night homework in real time.",
    recommendedConversionPlay:
      "Publish 'The 6-Day Tutoring Gap' calculator & blog post on the landing page.",
    lastScannedAt: "Verified Today",
  },
  {
    id: "comp-generic-ai",
    name: "Generic AI Chatbots & Photo-Solvers (ChatGPT / Photomath / Gauth)",
    archetype: "Generic AI Answer Solver",
    websiteUrl: "https://photomath.com",
    pricingModel: "Free – $20/month self-serve app",
    theirPrimaryPitch: "Snap a photo or paste any math problem to get an instant step-by-step solution.",
    ontarioParentComplaint:
      "\"My teen uses it to finish homework in 10 minutes without thinking, and then bombs the actual closed-book test in class!\"",
    structuralWeakness:
      "Hands over the final answer immediately (cognitive offloading) and has zero human oversight—so unmotivated teens either use it to cheat or stop using it altogether.",
    mindlcCounterWedge:
      "Socratic Guardrail + Human Manager: MindLC's AI is hard-coded NEVER to give away the final answer—it prompts the student with guided hints—and a real Human Learning Manager audits their session logs weekly.",
    recommendedConversionPlay:
      "Embed an interactive 'ChatGPT vs. MindLC Socratic AI' side-by-side comparison card above the fold.",
    lastScannedAt: "Verified Today",
  },
  {
    id: "comp-passive-portals",
    name: "Passive Self-Study Portals (TVO Learn Mathify / Khan Academy / IXL)",
    archetype: "Passive Self-Study Portal",
    websiteUrl: "https://tvolearn.com",
    pricingModel: "Free – $20/month self-initiated portal",
    theirPrimaryPitch: "Free on-demand videos, practice drills, or drop-in anonymous chat board.",
    ontarioParentComplaint:
      "\"It's free, which is great in theory, but my 15-year-old never logs in unless I nag them for an hour every night.\"",
    structuralWeakness:
      "100% reliant on teen self-motivation. Without a dedicated human mentor holding the student accountable each week, usage drops to zero within 10 days.",
    mindlcCounterWedge:
      "We remove parent nagging from the equation: your dedicated Human Learning Manager owns the weekly check-ins, study schedule, and parent progress reports.",
    recommendedConversionPlay:
      "Highlight 'End Kitchen-Table Homework Nagging' in parent email and social hooks.",
    lastScannedAt: "Verified Today",
  },
];

const INITIAL_AGENTS: MarketingAgent[] = [
  {
    id: "agent-intel",
    codeName: "Agent-01 · Intel",
    roleTitle: "Ontario Market & Competitor Intel Agent",
    specialty:
      "Monitors Ontario school board exam calendars, EQAO/OUAC windows, and competitor pricing/copy shifts.",
    primarySkillName: "ai-seo",
    targetPlatform: "Blog",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 4,
    conversionMetricOwned: "Market Signal Velocity & Competitor Win-Rate",
  },
  {
    id: "agent-seo",
    codeName: "Agent-02 · AI-SEO",
    roleTitle: "AI-SEO & Course-Code Discovery Agent",
    specialty:
      "Builds MTH1W, MCR3U, MHF4U & MCV4U search pages and 50-word AEO citation blocks for ChatGPT & Perplexity.",
    primarySkillName: "ai-seo",
    targetPlatform: "SEO Meta",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 7,
    conversionMetricOwned: "Organic & AI-Referred Parent Diagnostic Traffic",
  },
  {
    id: "agent-social",
    codeName: "Agent-03 · Paid Social",
    roleTitle: "Ontario Parent Paid Social & Creative Agent",
    specialty:
      "Writes high-empathy Meta/Instagram parent ad sets ('9:45 PM homework wall') with low-CPL diagnostic hooks.",
    primarySkillName: "social-content",
    targetPlatform: "Facebook",
    funnelFocus: "Lead Generation",
    status: "Idle / Ready",
    tasksCompletedCount: 9,
    conversionMetricOwned: "Cost Per Booked Diagnostic (Target CPL < $26)",
  },
  {
    id: "agent-cro",
    codeName: "Agent-04 · Funnel CRO",
    roleTitle: "Landing Page & Diagnostic Funnel CRO Agent",
    specialty:
      "Optimizes above-the-fold hero copy, 2-step diagnostic booking forms, and Socratic vs. Chatbot proof blocks.",
    primarySkillName: "cro",
    targetPlatform: "Landing Page",
    funnelFocus: "Conversion Optimization",
    status: "Idle / Ready",
    tasksCompletedCount: 6,
    conversionMetricOwned: "Visitor-to-Booked-Diagnostic Conversion Rate (Target ≥ 7.2%)",
  },
  {
    id: "agent-lifecycle",
    codeName: "Agent-05 · Lifecycle",
    roleTitle: "Parent Nurture, Close & School Outbound Agent",
    specialty:
      "Runs post-diagnostic parent close sequences, guidance counselor outreach, and parent referral loops.",
    primarySkillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelFocus: "Parent Retention & Referral",
    status: "Idle / Ready",
    tasksCompletedCount: 5,
    conversionMetricOwned: "Diagnostic Show-Up (85%+) & Paid Enrollment Close Rate (40%+)",
  },
];

// Concrete, zero-jargon multi-horizon activities across Daily, Weekly, Monthly, Quarterly, and Annual!
const INITIAL_PLANNED_ACTIVITIES: PlannedActivity[] = [
  // ==================== DAILY HORIZON ====================
  {
    id: "act-daily-1",
    horizon: "Daily",
    timeWindow: "Today · 09:00 AM EST",
    title: "Deploy GTA Midterm Report Card Rescue Ad Set for Grade 11 Functions (MCR3U)",
    tacticalExecution:
      "Launch 3 Meta parent ad variations targeting Ontario parents (ages 38–55 in Toronto, York, Peel, Halton, Ottawa) whose teens just received a sub-78% midterm mark in MCR3U. Hook: '8 weeks left to rescue their MCR3U Functions mark before Semester 1 finals—without $80/hr once-a-week tutor gaps.'",
    deliverableSpec:
      "3 Facebook/Instagram Parent Ad Creatives + Direct CTA to 20-Min Midterm Error-Analysis Diagnostic",
    marketTrigger: "Ontario Semester 1 Midterm Report Cards distributed this week",
    courseCodesTargeted: ["MCR3U", "MPM2D"],
    assignedAgentId: "agent-social",
    skillName: "social-content",
    targetPlatform: "Facebook",
    funnelObjective: "Lead Generation",
    targetKpi: "Generate 12+ booked parent diagnostics/day at CPL ≤ $26",
    status: "Queued",
  },
  {
    id: "act-daily-2",
    horizon: "Daily",
    timeWindow: "Today · 01:30 PM EST",
    title: "Ship 2-Step Course-Code Diagnostic Micro-Form on Homepage Hero",
    tacticalExecution:
      "Replace the 6-field generic contact form with a 2-step micro-commitment widget: Step 1 asks only 'Which Ontario Math course is your child taking? (Gr. 7–8 | Gr. 9 MTH1W | Gr. 10 MPM2D | Gr. 11 MCR3U | Gr. 12 MHF4U/MCV4U)'; Step 2 captures Parent Email & Mobile to unlock the instant calendar slot.",
    deliverableSpec:
      "High-Converting Hero Copy + 2-Step Course-Code Selector Microcopy & Anti-Cheating Trust Badge",
    marketTrigger: "CRO audit showed 44% drop-off on multi-field parent intake forms",
    courseCodesTargeted: ["MTH1W", "MPM2D", "MCR3U", "MHF4U", "MCV4U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Landing Page",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Lift Hero Visitor-to-Diagnostic completion rate from 4.4% to 7.1%",
    status: "Queued",
  },
  {
    id: "act-daily-3",
    horizon: "Daily",
    timeWindow: "Today · 04:30 PM EST",
    title: "Trigger Same-Day Pre-Consult 'Socratic AI vs. ChatGPT' Proof Email for Tonight's Booked Parents",
    tacticalExecution:
      "Send automated pre-diagnostic email to all parents booked for evening consults showing a real 4-turn transcript of MindLC's Socratic AI guiding a Grade 10 student through factoring quadratics without handing over the answer.",
    deliverableSpec:
      "Pre-Diagnostic Parent Indoctrination Email + 4-Step Socratic Transcript Snippet",
    marketTrigger: "Eliminate parent skepticism ('Is this just a ChatGPT wrapper?') before the Human Learning Manager call",
    courseCodesTargeted: ["MPM2D", "MCR3U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Maintain ≥ 86% evening diagnostic show-up rate",
    status: "Queued",
  },

  // ==================== WEEKLY HORIZON ====================
  {
    id: "act-weekly-1",
    horizon: "Weekly",
    timeWindow: "Week Sprint · Mon–Tue",
    title: "Publish 'MindLC vs. Kumon & Mathnasium for Ontario High School Math' Comparison Pillar",
    tacticalExecution:
      "Publish a comprehensive buyer comparison guide breaking down monthly cost ($350–$500/mo franchise centres vs. MindLC), winter driving time saved, and why elementary worksheet drills fail on Ontario Grade 9–12 Thinking/Application rubrics.",
    deliverableSpec:
      "1,200-Word Competitor Comparison Article + 4-Row Feature Matrix + 'Switch Your Tutoring Receipt' CTA",
    marketTrigger: "High parent churn from worksheet centres during Grade 9–11 transition",
    courseCodesTargeted: ["MTH1W", "MPM2D", "MCR3U"],
    assignedAgentId: "agent-intel",
    skillName: "ai-seo",
    targetPlatform: "Blog",
    funnelObjective: "Lead Generation",
    targetKpi: "Capture high-intent 'Mathnasium alternative Ontario' organic & AI search traffic",
    status: "Queued",
  },
  {
    id: "act-weekly-2",
    horizon: "Weekly",
    timeWindow: "Week Sprint · Wed–Thu",
    title: "Deploy 50-Word AEO Citation Blocks for Grade 9 EQAO (MTH1W) & Grade 12 Calculus (MCV4U)",
    tacticalExecution:
      "Add question-headed H2 blocks and FAQPage JSON-LD schema to course pages so ChatGPT Search, Perplexity, and Google AI Overviews cite MindLC when Ontario parents ask 'What is the best math tutoring for Grade 9 EQAO or Grade 12 Calculus?'",
    deliverableSpec:
      "SEO Meta Tags + 52-Word Extractable AEO Answer Blocks + JSON-LD FAQ Schema",
    marketTrigger: "AI Search referral growth (+81% parent usage of ChatGPT/Perplexity for tutor comparisons)",
    courseCodesTargeted: ["MTH1W", "MCV4U"],
    assignedAgentId: "agent-seo",
    skillName: "ai-seo",
    targetPlatform: "SEO Meta",
    funnelObjective: "Lead Generation",
    targetKpi: "Achieve top-3 AI citation share across 15 Ontario course-code prompts",
    status: "Queued",
  },
  {
    id: "act-weekly-3",
    horizon: "Weekly",
    timeWindow: "Week Sprint · Friday Review",
    title: "Run 7-Sweeps Copy Edit on Unconverted Diagnostic Follow-Up Sequence",
    tacticalExecution:
      "Audit and rewrite the 7-day follow-up email flow for parents who completed a diagnostic call but haven't enrolled yet—injecting specific Human Learning Manager weekly report screenshots and a 14-day risk-free guarantee.",
    deliverableSpec:
      "3-Email Post-Consult Objection-Handling Drip (Price vs. $80/hr Tutor, Teen Motivation Guarantee)",
    marketTrigger: "Recover the 58% of diagnostic parents who delay enrollment decisions by 3–7 days",
    courseCodesTargeted: ["MTH1W", "MCR3U", "MHF4U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copy-editing",
    targetPlatform: "Email Sequence",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Recover 18%+ of undecided diagnostic families into paid plans",
    status: "Queued",
  },

  // ==================== MONTHLY HORIZON ====================
  {
    id: "act-monthly-1",
    horizon: "Monthly",
    timeWindow: "Month 1 · Days 1–10",
    title: "Launch Interactive 'Ontario Grade 9 EQAO & Grade 11 Functions Readiness Mini-Quiz' Lead Magnet",
    tacticalExecution:
      "Build a 5-question interactive parent/student diagnostic quiz aligned to Ontario Ministry curriculum expectations that grades their readiness in 3 minutes and books them straight into a Human Learning Manager review call.",
    deliverableSpec:
      "Interactive Quiz Landing Page Copy + Instant Score Report Email Template",
    marketTrigger: "Free interactive tools convert cold Ontario parent traffic at 2.4x higher rate than static PDFs",
    courseCodesTargeted: ["MTH1W", "MCR3U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Landing Page",
    funnelObjective: "Lead Generation",
    targetKpi: "320+ monthly quiz completions with 35%+ booking a live Learning Manager consult",
    status: "Queued",
  },
  {
    id: "act-monthly-2",
    horizon: "Monthly",
    timeWindow: "Month 1 · Days 11–20",
    title: "Execute Ontario High School Guidance Department & Parent Council Workshop Campaign",
    tacticalExecution:
      "Run targeted outbound to 60 GTA & Ottawa secondary school parent councils offering a free 30-minute virtual parent workshop: 'How to Help Your Teen Master De-Streamed Grade 9–12 Math Without AI Cheating.'",
    deliverableSpec:
      "3-Touch School Council Outbound Email Sequence + Parent Workshop Registration Landing Page",
    marketTrigger: "Direct B2B2C trust channel with zero Meta ad auction dependency",
    courseCodesTargeted: ["MTH1W", "MPM2D", "MCR3U", "MHF4U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelObjective: "Lead Generation",
    targetKpi: "Book 4+ school parent council workshops/month (25–40 parent leads per workshop)",
    status: "Queued",
  },

  // ==================== QUARTERLY HORIZON ====================
  {
    id: "act-quarterly-1",
    horizon: "Quarterly",
    timeWindow: "Q1 · Semester 1 Finals → Semester 2 Switch",
    title: "Build Complete Programmatic Ontario Course-Code Hub (Gr. 7, Gr. 8, MTH1W, MPM2D, MCR3U, MHF4U, MCV4U, MDM4U)",
    tacticalExecution:
      "Publish 8 dedicated curriculum hub pages—each featuring unit-by-unit Ontario Ministry expectations, sample Socratic AI hint dialogues, Human Learning Manager accountability workflows, and course-specific parent testimonials.",
    deliverableSpec:
      "8 Course-Code SEO & AEO Hub Pages + Internal Linking Architecture + Course Schema Markup",
    marketTrigger: "Own every course-code search query in Ontario ahead of Semester 2 kickoff",
    courseCodesTargeted: ["MTH1W", "MPM2D", "MCR3U", "MHF4U", "MCV4U", "MDM4U"],
    assignedAgentId: "agent-seo",
    skillName: "ai-seo",
    targetPlatform: "SEO Meta",
    funnelObjective: "Lead Generation",
    targetKpi: "Grow organic non-paid diagnostic bookings to 45% of total pipeline",
    status: "Queued",
  },
  {
    id: "act-quarterly-2",
    horizon: "Quarterly",
    timeWindow: "Q1 · Mid-Quarter",
    title: "Launch 'Give 2 Weeks, Get $100 Tuition Credit' Ontario Parent Referral & Report-Card Win Loop",
    tacticalExecution:
      "Trigger automated referral invitations to every MindLC parent the week their teen scores 85%+ on a unit test or improves their report card mark by 10%+—arming them with a shareable '2-Week Free Socratic AI + Human Manager Pass' for another Ontario family.",
    deliverableSpec:
      "Parent Referral Invitation Sequence + Shareable Friend Landing Page",
    marketTrigger: "Report-card week is the highest net-promoter moment in Ontario EdTech",
    courseCodesTargeted: ["MTH1W", "MCR3U", "MHF4U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelObjective: "Parent Retention & Referral",
    targetKpi: "Generate 22%+ of new quarterly enrollments via parent-to-parent referrals (CAC < $40)",
    status: "Queued",
  },

  // ==================== ANNUAL HORIZON ====================
  {
    id: "act-annual-1",
    horizon: "Annual",
    timeWindow: "Annual Cycle · 4 Ontario Academic Peaks",
    title: "Execute Full-Year 4-Peak Ontario Academic Calendar Synchronization Engine",
    tacticalExecution:
      "Synchronize annual budget and multi-agent creative rotation across the 4 highest-converting Ontario windows: (Peak 1: Aug/Sep Back-to-School Foundation), (Peak 2: Nov/Apr Midterm Report Card Rescue), (Peak 3: Jan/Jun EQAO & Final Exam Blitz), and (Peak 4: Jul/Aug Summer Bridge to MCR3U & MHF4U).",
    deliverableSpec:
      "Annual 4-Peak Campaign Playbook + Budget Allocation Matrix + Summer Bridge Pre-Enrollment Offer",
    marketTrigger: "Eliminate summer EdTech churn by transitioning Grade 9/10 students into July/August 'MCR3U Functions Head-Start' cohorts",
    courseCodesTargeted: ["MTH1W", "MPM2D", "MCR3U", "MHF4U", "MCV4U"],
    assignedAgentId: "agent-intel",
    skillName: "cro",
    targetPlatform: "Landing Page",
    funnelObjective: "Parent Retention & Referral",
    targetKpi: "Increase average student LTV from 4.5 months to 11.2+ months across Grade 7–12 progression",
    status: "Queued",
  },
];

const INITIAL_QA_HISTORY: PlanQaExchange[] = [
  {
    id: "qa-init-1",
    timestamp: "Today · Auto-Brief",
    cmoQuestion:
      "What is the highest-leverage market trigger in Ontario education right now, and how did you structure today's agent tasks around it?",
    horizonAffected: "Daily",
    strategistAnswer:
      "Right now, **Semester 1 Midterm Report Cards** across GTA boards (TDSB, YRDSB, PDSB, HDSB) and **Grade 9 De-Streamed MTH1W EQAO anxiety** are peaking simultaneously. Instead of running generic 'Math Tutoring' ads, I assigned **Agent-03 (Paid Social)** to target the 8-week window between midterms and January finals for `MCR3U` Functions, **Agent-04 (CRO)** to deploy a 2-step course-code diagnostic selector on the homepage, and **Agent-05 (Lifecycle)** to send a pre-consult 'Socratic AI vs. ChatGPT' proof email to tonight's booked parents.",
    planAdjustmentsMade: [
      "Prioritized [Daily] Agent-03 Task: GTA Midterm Report Card Rescue Ad Set (MCR3U)",
      "Prioritized [Daily] Agent-04 Task: 2-Step Course-Code Diagnostic Micro-Form",
      "Prioritized [Daily] Agent-05 Task: Pre-Consult Socratic AI Proof Email",
    ],
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
    agent_author: "Agent-04 · Funnel CRO",
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
    agent_author: "Agent-03 · Paid Social",
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
    agent_author: "Agent-02 · AI-SEO",
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
        "1. **Dual-Pane Architecture:** Whenever you command me below (or dispatch an autonomous agent from the **CMO Planner & Agent Team** tab), pure marketing copy is injected straight into the **Left Asset Canvas**, while strategic rationale and mentorship stay here in the **Right Chat Feed**.\n2. **Try It Now:** Select a Marketing Skill from the dropdown below, choose Detail Level 1, 2, or 3, and ask me to generate or refine an asset for Ontario Grades 7–12 Math.",
      frameworksApplied: [
        "Mandatory Output Protocol",
        "JTBD Four Forces",
        "PAS Copywriting",
      ],
      mentorshipTakeaway:
        "Tip: Visit the 'CMO Planner & Agent Team' tab to review Daily, Weekly, Monthly, Quarterly, and Annual activities or dispatch your 5 specialist agents automatically.",
    },
  },
];

export const useMarketingStore = create<MarketingState>((set, get) => ({
  activeTab: "planner",
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

  addScannedCompetitor: (comp) =>
    set((state) => ({
      competitors: [comp, ...state.competitors],
    })),

  spawnCounterActivityFromCompetitor: async (compId: string) => {
    const state = get();
    const comp = state.competitors.find((c) => c.id === compId);
    if (!comp) return;

    const newActivity: PlannedActivity = {
      id: `act-comp-${Date.now()}`,
      horizon: "Daily",
      timeWindow: "Today · Urgent Counter-Play",
      title: `Counter-Position Against ${comp.name}: "${comp.recommendedConversionPlay.slice(0, 65)}"`,
      tacticalExecution: `Target Ontario parents comparing ${comp.name} (${comp.pricingModel}) against MindLC. Highlight their structural weakness (${comp.structuralWeakness}) and present MindLC's wedge: ${comp.mindlcCounterWedge}`,
      deliverableSpec: `Comparison Battlecard & High-Converting Ad/Landing Section vs. ${comp.name}`,
      marketTrigger: `Competitor gap identified in ${comp.name}`,
      courseCodesTargeted: ["MTH1W", "MCR3U", "MHF4U", "MCV4U"],
      assignedAgentId: "agent-seo",
      skillName: "ai-seo",
      targetPlatform: "Blog",
      funnelObjective: "Conversion Optimization",
      targetKpi: "Capture comparison traffic and convert ≥ 25% to Free Diagnostic",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Spawned from Competitor Intel Matrix (${comp.name})`,
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
    const trend = state.ontarioTrends.find((t) => t.id === trendId);
    if (!trend) return;

    const newActivity: PlannedActivity = {
      id: `act-trend-${Date.now()}`,
      horizon: "Daily",
      timeWindow: "Today · Market Signal Trigger",
      title: `Rapid Response: ${trend.title}`,
      tacticalExecution: `${trend.recommendedCmoAction} Address parent pain directly: "${trend.parentPainSummary}"`,
      deliverableSpec: `Rapid-Response Campaign Asset for ${trend.courseCodes.join(" · ")}`,
      marketTrigger: `${trend.category} (${trend.searchMomentum})`,
      courseCodesTargeted: trend.courseCodes,
      assignedAgentId: trend.recommendedAgentId,
      skillName:
        trend.recommendedAgentId === "agent-social"
          ? "social-content"
          : trend.recommendedAgentId === "agent-seo"
          ? "ai-seo"
          : "cro",
      targetPlatform:
        trend.recommendedAgentId === "agent-social"
          ? "Facebook"
          : trend.recommendedAgentId === "agent-seo"
          ? "SEO Meta"
          : "Landing Page",
      funnelObjective: "Lead Generation",
      targetKpi: "Capitalize on Ontario search surge within 24 hours",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Triggered from Ontario Education Signal: ${trend.title.slice(0, 48)}`,
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
    const activity = state.plannedActivities.find((a) => a.id === activityId);
    if (!activity) return;

    const agent =
      state.agents.find((ag) => ag.id === activity.assignedAgentId) ||
      state.agents[0];

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
        headlineSummary: `[Autonomous Agent Execution] ${result.agentReport}`,
        rationaleBody: `• **Horizon & Trigger:** ${activity.horizon} Plan (${activity.timeWindow}) — ${activity.marketTrigger}\n• **Tactical Execution:** ${activity.tacticalExecution}\n• **Target Conversion KPI:** ${activity.targetKpi}`,
        frameworksApplied: [
          agent.codeName,
          activity.skillName,
          activity.funnelObjective,
        ],
        mentorshipTakeaway: `This deliverable has been added to your Left Asset Canvas under "${result.assetTitle}".`,
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

    const response = await generateMarketingResponse({
      userCommand,
      selectedSkill: skill,
      detailLevel: state.detailLevel,
      brandPersona: state.brandPersona,
      preferredPlatform: state.preferredPlatform,
    });

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
