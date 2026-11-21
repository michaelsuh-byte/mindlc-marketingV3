import {
  ActiveBottleneckStage,
  AssetPlatform,
  BottleneckStageConfig,
  BrandPersona,
  CompetitorProfile,
  DetailLevel,
  MandatoryOutputProtocol,
  MandatoryProposalSchema,
  MarketingAgent,
  MarketingSkill,
  OntarioTrendSignal,
  PlanHorizon,
  PlannedActivity,
  ScopeDriftWarning,
  VerbatimParentQuote,
  WeeklyFunnelMetrics,
} from "@/types/database";

// ============================================================================
// SAFEGUARD 2: SINGLE-BOTTLENECK LOCK-IN ENGINE CONFIGURATIONS
// ============================================================================

export const BOTTLENECK_STAGE_CONFIGS: Record<
  ActiveBottleneckStage,
  BottleneckStageConfig
> = {
  STAGE_1_CONVERSION: {
    stage: "STAGE_1_CONVERSION",
    shortLabel: "Stage 1: Fix Diag → Paid (Target ≥ 25%)",
    label: "Stage 1: Diagnostic-to-Paid Conversion Lock (0–25 Students)",
    studentRange: [0, 25],
    lockedObjective:
      "Maximize Diagnostic Completed -> Paid Conversion (Target >= 25% at $139 CAD/mo Tier 2 Managed Hybrid)",
    targetBenchmark: "Diag → Paid ≥ 25%",
    allowedProposalTypes: [
      "Cognitive Report layout/copy",
      "10-minute parent debrief call scripts",
      "Post-diagnostic follow-up sequences",
      "Offer framing & 30-day guarantee copy",
    ],
    blockedScope: [
      "Cold paid ads (Meta / Google cold traffic)",
      "Broad social media content calendars",
      "SEO blog clusters & top-of-funnel listicles",
    ],
    blockedKeywords: [
      "cold ad",
      "facebook ad",
      "meta ad",
      "google ad",
      "instagram ad",
      "social calendar",
      "tiktok",
      "seo blog cluster",
      "blog post",
      "cold traffic",
      "scale ads",
    ],
  },
  STAGE_2_REFERRAL_DIAG: {
    stage: "STAGE_2_REFERRAL_DIAG",
    shortLabel: "Stage 2: Referrals & Seminars → Diag (Target ≥ 40%)",
    label: "Stage 2: Referral & Community-to-Diagnostic Lock (26–60 Students)",
    studentRange: [26, 60],
    lockedObjective:
      "Maximize Parent Referrals & Community/Seminar -> Diagnostic Booked (Target >= 40%)",
    targetBenchmark: "Referral/Seminar → Diag ≥ 40%",
    allowedProposalTypes: [
      "Week 4–6 referral invite flows",
      "Ontario parent seminar/webinar kits",
      "Local community value posts",
      "Unit-test prep lead magnets (MPM2D, MCR3U, MHF4U, SBI3U)",
    ],
    blockedScope: ["High-budget cold ad scaling"],
    blockedKeywords: [
      "high-budget",
      "scale cold ads",
      "lookalike scaling",
      "$5,000 ad budget",
      "broad paid acquisition",
    ],
  },
  STAGE_3_SCALE_ADS: {
    stage: "STAGE_3_SCALE_ADS",
    shortLabel: "Stage 3: Scale GTA Ads (Blended CAC < $150 CAD)",
    label: "Stage 3: GTA Paid Ad Scaling Lock (61–100 Students)",
    studentRange: [61, 100],
    lockedObjective:
      "Scale validated diagnostic landing pages via targeted GTA (Mississauga, Toronto, Oakville, Markham) Meta/Google ads while holding Blended CAC < $150 CAD",
    targetBenchmark: "Blended CAC < $150 CAD",
    allowedProposalTypes: [
      "Paid ad creative variants (GTA geo-targeted)",
      "Landing page A/B tests",
      "Budget reallocation alerts",
    ],
    blockedScope: [
      "Unmeasured brand awareness campaigns without CAC stop-loss",
    ],
    blockedKeywords: ["untracked billboard", "brand awareness only"],
  },
};

export function getBottleneckStageForStudents(
  paidStudents: number
): ActiveBottleneckStage {
  if (paidStudents <= 25) return "STAGE_1_CONVERSION";
  if (paidStudents <= 60) return "STAGE_2_REFERRAL_DIAG";
  return "STAGE_3_SCALE_ADS";
}

export function computeFunnelRates(metrics: WeeklyFunnelMetrics) {
  const contactToBookedPct =
    metrics.reach_or_contacts > 0
      ? Math.round((metrics.diag_booked / metrics.reach_or_contacts) * 100)
      : 0;
  const bookedToCompletedPct =
    metrics.diag_booked > 0
      ? Math.round((metrics.diag_completed / metrics.diag_booked) * 100)
      : 0;
  const completedToPaidPct =
    metrics.diag_completed > 0
      ? Math.round((metrics.paid_conversions / metrics.diag_completed) * 100)
      : 0;
  return {
    contactToBookedPct,
    bookedToCompletedPct,
    completedToPaidPct,
  };
}

export function checkBottleneckScopeDrift(params: {
  userCommand: string;
  preferredPlatform: AssetPlatform;
  activeStage: ActiveBottleneckStage;
  paidStudents: number;
  funnelMetrics: WeeklyFunnelMetrics;
}): ScopeDriftWarning {
  const {
    userCommand,
    preferredPlatform,
    activeStage,
    paidStudents,
    funnelMetrics,
  } = params;
  const cfg = BOTTLENECK_STAGE_CONFIGS[activeStage];
  const lower = userCommand.toLowerCase();
  const rates = computeFunnelRates(funnelMetrics);

  if (activeStage === "STAGE_1_CONVERSION") {
    const isOutPlatform =
      preferredPlatform === "Facebook" ||
      preferredPlatform === "Blog" ||
      preferredPlatform === "SEO Meta";
    const matchedBlockedKw = cfg.blockedKeywords.find((kw) =>
      lower.includes(kw)
    );

    if (matchedBlockedKw || isOutPlatform) {
      return {
        detected: true,
        requestedCommand: userCommand,
        activeStage,
        blockedReason: `Scope Drift Blocked during ${activeStage} (${paidStudents}/100 paid students). Cold paid ads, broad social calendars, and SEO blog clusters are locked until Diagnostic → Paid reaches ≥ 25%.`,
        bottleneckMathExplanation: `Latest Weekly Reality Log: ${funnelMetrics.diag_completed} Diagnostics Completed → ${funnelMetrics.paid_conversions} Paid (${rates.completedToPaidPct}% Diag-to-Paid conversion vs. 25% target). Driving cold top-of-funnel traffic into a ${rates.completedToPaidPct}% conversion step leaks 79% of hard-won parent demos before our $139 CAD/mo Tier 2 debrief close is locked.`,
        suggestedInScopeAlternative:
          "Focus on an allowed Stage 1 asset: (1) Cognitive Diagnostic Report layout, (2) 10-Min Parent Debrief Script, (3) 72-Hr Post-Diagnostic Follow-Up, or (4) 30-Day Active-Habit Guarantee copy.",
      };
    }
  }

  if (activeStage === "STAGE_2_REFERRAL_DIAG") {
    const matchedBlockedKw = cfg.blockedKeywords.find((kw) =>
      lower.includes(kw)
    );
    if (matchedBlockedKw) {
      return {
        detected: true,
        requestedCommand: userCommand,
        activeStage,
        blockedReason: `Scope Drift Blocked during ${activeStage} (${paidStudents}/100 paid students). High-budget cold ad scaling is locked until Referral & Seminar → Diagnostic Booked reaches ≥ 40%.`,
        bottleneckMathExplanation: `At ${paidStudents} students ($${paidStudents * 139} CAD MRR), your highest-leverage growth loop is Week 4–6 warm parent referrals and local MHF4U/SBI3U/MCR3U unit-test prep seminars at near-$0 CAC.`,
        suggestedInScopeAlternative:
          "Draft a Week 4–6 Parent Referral Invite Flow, an Ontario Parent Seminar Kit, or a Grade 11/12 MHF4U/SBI3U Unit-Test Lead Magnet.",
      };
    }
  }

  return {
    detected: false,
    requestedCommand: userCommand,
    activeStage,
    blockedReason: "",
    bottleneckMathExplanation: "",
    suggestedInScopeAlternative: "",
  };
}

export function validateMandatoryProposalSchema(
  p: MandatoryProposalSchema
): { valid: boolean; missingFields: string[] } {
  const missing: string[] = [];
  if (!p.proposal_id?.trim()) missing.push("proposal_id");
  if (!p.title?.trim()) missing.push("title");
  if (
    ![
      "STAGE_1_CONVERSION",
      "STAGE_2_REFERRAL_DIAG",
      "STAGE_3_SCALE_ADS",
    ].includes(p.bottleneck_stage)
  ) {
    missing.push("bottleneck_stage");
  }
  if (!p.channel?.trim()) missing.push("channel");
  if (!p.target_metric?.trim()) missing.push("target_metric");
  if (!Array.isArray(p.cited_voc_quotes) || p.cited_voc_quotes.length === 0) {
    missing.push("cited_voc_quotes");
  }
  if (!p.single_cta?.trim()) missing.push("single_cta");
  if (!p.asset_body?.trim()) missing.push("asset_body");
  if (!p.devils_advocate?.primary_failure_hypothesis?.trim()) {
    missing.push("devils_advocate.primary_failure_hypothesis");
  }
  if (!p.devils_advocate?.blind_spot_question?.trim()) {
    missing.push("devils_advocate.blind_spot_question");
  }
  if (!p.kill_criteria?.sample_threshold?.trim()) {
    missing.push("kill_criteria.sample_threshold");
  }
  if (!p.kill_criteria?.stop_loss_metric?.trim()) {
    missing.push("kill_criteria.stop_loss_metric");
  }
  if (!p.kill_criteria?.pivot_action?.trim()) {
    missing.push("kill_criteria.pivot_action");
  }
  if (typeof p.revision_notes !== "string") {
    missing.push("revision_notes");
  }
  return { valid: missing.length === 0, missingFields: missing };
}

export function buildGeminiSystemInstruction(
  skill: MarketingSkill,
  persona: BrandPersona,
  detailLevel: DetailLevel,
  activeStage: ActiveBottleneckStage = "STAGE_1_CONVERSION",
  vocQuotes: VerbatimParentQuote[] = [],
  funnelMetrics: WeeklyFunnelMetrics = {
    reach_or_contacts: 64,
    diag_booked: 18,
    diag_completed: 14,
    paid_conversions: 3,
  }
): string {
  const stageCfg = BOTTLENECK_STAGE_CONFIGS[activeStage];
  const rates = computeFunnelRates(funnelMetrics);
  const top10Quotes = vocQuotes.slice(0, 10);

  return `
[GEMINI CONTEXT CACHE BLOCK: cache_key="mindlc_voc_reality_gate_v2" ttl="604800s"]
Company: ${persona.companyName} (${persona.planNameAndPrice || "Tier 2 Managed Hybrid Plan: $139 CAD/month"})
Goal: Acquire first 100 paid Ontario Grades 9–12 STEM students ($13,900 CAD MRR milestone).
Core Hook: ${persona.coreHook}
Curriculum Focus: ${persona.curriculumFocus} (Ontario K/T/C/A Achievement Chart · MPM2D, MCR3U, MHF4U, MCV4U, SBI3U, SCH4U, SPH4U)

[WEEKLY REALITY LOG — COMPUTED FUNNEL RATES]
• Reach/Contacts -> Diagnostic Booked: ${rates.contactToBookedPct}% (${funnelMetrics.diag_booked}/${funnelMetrics.reach_or_contacts})
• Diagnostic Booked -> Diagnostic Completed: ${rates.bookedToCompletedPct}% (${funnelMetrics.diag_completed}/${funnelMetrics.diag_booked})
• Diagnostic Completed -> Paid ($139 CAD/mo): ${rates.completedToPaidPct}% (${funnelMetrics.paid_conversions}/${funnelMetrics.diag_completed})

[LATEST VERBATIM PARENT QUOTES (VoC) — MUST CITE AT LEAST 1 IN EVERY PROPOSAL]
${
  top10Quotes.length > 0
    ? top10Quotes
        .map((q) => `- [${q.id}] (tag: ${q.context_tag}): "${q.quote_text}"`)
        .join("\n")
    : `- [VOC-101] (tag: ai_cheating): "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MHF4U unit test."`
}
[/GEMINI CONTEXT CACHE BLOCK]

[SINGLE-BOTTLENECK LOCK-IN GUARDRAIL: ${activeStage}]
• Locked Objective: ${stageCfg.lockedObjective}
• Allowed Proposal Types: ${stageCfg.allowedProposalTypes.join(" | ")}
• STRICTLY FORBIDDEN SCOPE: ${stageCfg.blockedScope.join(" | ")}

[ACTIVE SKILL SYSTEM PROMPT: ${skill.skill_name}]
${skill.system_prompt}
`.trim();
}

export interface GenerateMarketingRequest {
  userCommand: string;
  selectedSkill: MarketingSkill;
  detailLevel: DetailLevel;
  brandPersona: BrandPersona;
  preferredPlatform?: AssetPlatform;
  activeStage?: ActiveBottleneckStage;
  vocQuotes?: VerbatimParentQuote[];
  funnelMetrics?: WeeklyFunnelMetrics;
  existingProposalToRevise?: MandatoryProposalSchema;
  nextVersionNumber?: number;
}

export async function generateMarketingResponse(
  req: GenerateMarketingRequest
): Promise<MandatoryOutputProtocol> {
  const {
    userCommand,
    selectedSkill,
    detailLevel,
    preferredPlatform = "Parent Call",
    activeStage = "STAGE_1_CONVERSION",
    vocQuotes = [],
    funnelMetrics = {
      reach_or_contacts: 64,
      diag_booked: 18,
      diag_completed: 14,
      paid_conversions: 3,
    },
    existingProposalToRevise,
    nextVersionNumber = 2,
  } = req;

  await new Promise((resolve) => setTimeout(resolve, 420));

  const lowerCmd = userCommand.toLowerCase();
  const rates = computeFunnelRates(funnelMetrics);

  const matchedQuotes = vocQuotes.filter((q) => {
    if (
      lowerCmd.includes("price") ||
      lowerCmd.includes("139") ||
      lowerCmd.includes("cost")
    )
      return q.context_tag === "price";
    if (
      lowerCmd.includes("cheat") ||
      lowerCmd.includes("chatgpt") ||
      lowerCmd.includes("socratic")
    )
      return q.context_tag === "ai_cheating";
    if (
      lowerCmd.includes("ktca") ||
      lowerCmd.includes("k/t/c/a") ||
      lowerCmd.includes("curriculum") ||
      lowerCmd.includes("mhf4u") ||
      lowerCmd.includes("sbi3u")
    )
      return q.context_tag === "curriculum";
    return true;
  });

  const citedQuotesList =
    matchedQuotes.length > 0
      ? matchedQuotes
          .slice(0, 2)
          .map((q) => `[${q.id} · ${q.context_tag}] "${q.quote_text}"`)
      : vocQuotes.length > 0
      ? vocQuotes
          .slice(0, 2)
          .map((q) => `[${q.id} · ${q.context_tag}] "${q.quote_text}"`)
      : [
          `[VOC-101 · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MHF4U Advanced Functions unit test."`,
          `[VOC-102 · curriculum] "His teacher marks Ontario K/T/C/A Thinking & Application questions strictly—generic tutoring worksheets don't match MHF4U or SBI3U tests."`,
        ];

  // =========================================================================
  // CONVERSATIONAL HITL REVISION OF SELECTED PROPOSAL (Level 3 Cockpit)
  // =========================================================================
  if (existingProposalToRevise) {
    let revisedBody = existingProposalToRevise.asset_body;
    let revisedSingleCta = existingProposalToRevise.single_cta;
    let changeSummaryPill = `Updated v${nextVersionNumber}: Refined copy based on CMO prompt & preserved VoC grounding`;
    let devilsAdvocate = { ...existingProposalToRevise.devils_advocate };

    if (
      lowerCmd.includes("soften") ||
      lowerCmd.includes("salesy") ||
      lowerCmd.includes("calm") ||
      lowerCmd.includes("teacher")
    ) {
      changeSummaryPill = `Updated v${nextVersionNumber}: Removed sales urgency, reframed as a calm Ontario STEM teacher checklist, and anchored CTA to 20-min diagnostic review`;
      revisedSingleCta =
        "Reply 'CHECKLIST' or tap to book a calm, zero-pressure 20-Minute Ontario K/T/C/A Diagnostic Review with a Learning Manager";
      revisedBody = `${existingProposalToRevise.asset_body}\n\n---\n### 🌿 [v${nextVersionNumber} Refinement — Calm Ontario Teacher & Parent-Advisory Tone]\n> *"As an Ontario secondary STEM educator, I never recommend buying a tutoring plan before diagnosing which bucket of the Ontario Achievement Chart (K/T/C/A) is actually costing your teen marks. In 80% of MHF4U and SBI3U unit tests we review in Mississauga and Oakville, Knowledge (K) is fine—it's multi-step Thinking (T) and Application (A) under closed-book exam conditions where students freeze after relying on ChatGPT for homework."*\n\n• **Zero Grade-Hype Policy:** Removed all promotional urgency; replaced with a transparent walkthrough of the student's 4-step Socratic reasoning trace.\n• **Single Low-Friction Next Step:** ${revisedSingleCta}`;
    } else if (
      lowerCmd.includes("k/t/c/a") ||
      lowerCmd.includes("ktca") ||
      lowerCmd.includes("ontario") ||
      lowerCmd.includes("mhf4u") ||
      lowerCmd.includes("sbi3u")
    ) {
      changeSummaryPill = `Updated v${nextVersionNumber}: Sharpened Ontario Ministry K/T/C/A rubric breakdown for MHF4U Advanced Functions & SBI3U Biology unit tests`;
      revisedBody = `${existingProposalToRevise.asset_body}\n\n---\n### 📐 [v${nextVersionNumber} Refinement — Ontario K/T/C/A Achievement Chart Breakdown (MHF4U · MCR3U · SBI3U)]\n• **Knowledge & Understanding (K/U — 35% of mark):** Most students score 80%+ here because formulas are memorized.\n• **Thinking & Investigation (T/I — 30% of mark):** Where students who use ChatGPT at home drop to 50% on closed-book tests (${citedQuotesList[0]}).\n• **Communication (C — 15%) & Application (A — 20%):** Our 24/7 Socratic AI enforces full Ontario mathematical/scientific notation and step-by-step justification before unlocking the next hint, while the Human Learning Manager audits their weekly rubric readiness.`;
    } else if (
      lowerCmd.includes("challenge") ||
      lowerCmd.includes("assumption") ||
      lowerCmd.includes("devil")
    ) {
      changeSummaryPill = `Updated v${nextVersionNumber}: Stress-tested Devil's Advocate failure hypothesis & tightened 48-hour stop-loss pivot criteria`;
      devilsAdvocate = {
        primary_failure_hypothesis:
          "Critical Challenge: Even if Ontario parents love the Socratic AI concept during the 10-minute debrief, 40%+ will stall if the teen themselves isn't present for the final 3 minutes of the call to agree to the 3x/week Socratic habit.",
        blind_spot_question:
          "Is the student required to sit beside the parent for Minutes 7–10 of the debrief to co-sign their weekly 3-session schedule with the Human Learning Manager?",
      };
      revisedBody = `${existingProposalToRevise.asset_body}\n\n---\n### 🛡️ [v${nextVersionNumber} Refinement — Devil's Advocate Counter-Measure Added]\n• **Teen Co-Commitment Protocol (Minute 8 of Debrief):** Before asking the parent to activate the $139 CAD/mo Tier 2 Managed Hybrid seat, the Human Learning Manager asks the student directly: *"Can you commit to three 25-minute Socratic sessions on Mon/Wed/Thu at 8:00 PM if it saves you 2 hours of pre-test cramming?"*`;
    } else {
      changeSummaryPill = `Updated v${nextVersionNumber}: Applied CMO directive ("${userCommand.slice(0, 48)}") & verified single-CTA compliance`;
      revisedBody = `${existingProposalToRevise.asset_body}\n\n---\n### 🔄 [v${nextVersionNumber} CMO Refinement — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}]\n**CMO Instruction:** "${userCommand}"\n\n• **VoC Grounding Reinforced:** Directly resolves ${citedQuotesList[0]}.\n• **Tier 2 Managed Hybrid Clarity ($139 CAD/month):** Emphasizes weekly Human Learning Manager accountability + 24/7 Socratic AI hints with zero exaggerated grade promises.\n• **Single Parent Action:** ${revisedSingleCta}`;
    }

    const revisedSchema: MandatoryProposalSchema = {
      ...existingProposalToRevise,
      cited_voc_quotes: citedQuotesList,
      single_cta: revisedSingleCta,
      asset_body: revisedBody,
      devils_advocate: devilsAdvocate,
      revision_notes: changeSummaryPill,
    };

    const check = validateMandatoryProposalSchema(revisedSchema);
    if (!check.valid) {
      throw new Error(
        `Proposal schema validation failed: ${check.missingFields.join(", ")}`
      );
    }

    return {
      protocolVersion: "2.0-MINDLC-HITL",
      targetPlatform: preferredPlatform,
      assetTitle: revisedSchema.title,
      marketingContent: revisedSchema.asset_body,
      proposalSchema: revisedSchema,
      changeSummaryPill,
      strategicJustification: {
        detailLevel,
        levelLabel:
          detailLevel === 1
            ? "Level 1: Executive Summary (Fast)"
            : detailLevel === 2
            ? "Level 2: Standard Rationale"
            : "Level 3: Deep Mentorship (The Why & How)",
        headlineSummary: changeSummaryPill,
        rationaleBody: `1. **What Changed in v${nextVersionNumber}:** ${changeSummaryPill}\n2. **Ontario VoC Preserved:** Anchored on ${citedQuotesList[0]}.\n3. **Ready for 30-Second Approval Dock:** Check the 3 verification boxes below (` + "`Ontario Context`, `Single CTA`, `Brand Trust`" + `) to lock and approve this asset.`,
        frameworksApplied: [
          selectedSkill.skill_name,
          "Ontario K/T/C/A Alignment",
          activeStage,
        ],
        mentorshipTakeaway:
          "Toggle 'Show Changes Diff' in the Left Pane header to compare v" +
          (nextVersionNumber - 1) +
          " against v" +
          nextVersionNumber +
          " side-by-side.",
        contextCacheStatus: `Context Cache HIT (${vocQuotes.length} VoC quotes + ${rates.completedToPaidPct}% Diag-to-Paid rate)`,
      },
    };
  }

  // =========================================================================
  // GENERATE NEW PROPOSAL FOR ACTIVE BOTTLENECK STAGE
  // =========================================================================
  let proposalSchema: MandatoryProposalSchema;

  if (activeStage === "STAGE_1_CONVERSION") {
    proposalSchema = {
      proposal_id: `PROP-S1-${Date.now().toString().slice(-4)}`,
      title: `10-Min Parent Debrief Script & K/T/C/A Cognitive Report Close ($139 CAD/mo Tier 2)`,
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel: "Parent Call",
      target_metric: `Diag → Paid ≥ 25% (Current: ${rates.completedToPaidPct}%)`,
      cited_voc_quotes: citedQuotesList,
      single_cta:
        "Activate Your Teen's 30-Day Risk-Free Tier 2 Managed Hybrid Seat ($139 CAD/mo) Before Friday's MHF4U/SBI3U Study Plan Lock",
      asset_body: `## 1. Cognitive Diagnostic Report Header (Minutes 0–2)
**Ontario STEM Course Focus:** Grade 11/12 MHF4U (Advanced Functions) · MCR3U (Functions) · SBI3U (Biology)
**Ontario K/T/C/A Diagnostic Breakdown:**
- **Knowledge & Understanding (K/U):** **82%** (Strong formula recall on homework)
- **Thinking, Investigation & Application (T/I & A):** **46%** (Stalls on multi-step closed-book unit test problems without AI hints)

---

## 2. 10-Minute Parent Debrief Call Script
### Minutes 0–3: Mirror Exact Parent VoC & Show Timestamped Socratic Trace
> *"When we reviewed {{student_first_name}}'s diagnostic trace, we saw the exact pattern you described: ${citedQuotesList[0]}. Look at Question 4 on screen—when our Socratic AI withheld the final solution and asked for the domain constraint step, they paused for 110 seconds. That is the exact gap between their 90% homework mark and their 61% unit test mark."*

### Minutes 3–7: Contrast $380/mo Centres & ChatGPT vs. Tier 2 Managed Hybrid ($139 CAD/mo)
> *"A $80/hr weekly tutor ($320+/mo) isn't there at 9:45 PM on Tuesday before Wednesday's unit test. And generic ChatGPT hands over the final answer so the student never builds independent exam stamina.*
>
> *Our **Tier 2 Managed Hybrid Plan ($139 CAD/month — $4.63/day)** pairs:*
> 1. **24/7 Socratic AI STEM Coach:** Tuned to Ontario K/T/C/A rubrics. Never gives the final answer—prompts your teen with step-by-step guiding hints.
> 2. **Dedicated Human Learning Manager:** Audits their Socratic logs weekly, sets unit-test milestones, and sends you a Friday parent progress check-in."*

### Minutes 7–10: 30-Day Active-Habit Guarantee & Single Lock-Step Close
> *"Under our **30-Day Active-Habit Guarantee**, if your Human Learning Manager does not get {{student_first_name}} completing at least 3 Socratic problem sessions per week in Month 1, we refund 100% of your $139 CAD tuition. Shall we lock their seat now so their Learning Manager can run tomorrow's onboarding?"*`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Ontario parents may stall with 'Let me ask my spouse' if the 10-minute debrief talks abstractly about AI features rather than screen-sharing their teen's exact wrong step from the diagnostic within the first 90 seconds.",
        blind_spot_question:
          "Does the presenter screen-share the student's actual timestamped Socratic stall before mentioning the $139 CAD/month price?",
      },
      kill_criteria: {
        sample_threshold: "12 completed 10-minute parent diagnostic debrief calls",
        stop_loss_metric: "< 20% paid conversion into $139 CAD/mo Tier 2 within 48 hours",
        pivot_action:
          "Switch call close offer immediately from '$139 CAD/mo ongoing plan' to a '$19 CAD 14-Day Unit-Test Rescue Sprint' that auto-renews at $139 CAD/mo on Day 15.",
      },
      revision_notes:
        "v1 Initial Stage 1 draft grounded in WeeklyRealityLog VoC quotes and Ontario K/T/C/A rubric.",
    };
  } else if (activeStage === "STAGE_2_REFERRAL_DIAG") {
    proposalSchema = {
      proposal_id: `PROP-S2-${Date.now().toString().slice(-4)}`,
      title: `Week 4 Unit-Test Win Parent Referral Flow & MHF4U/SBI3U Community Seminar Kit`,
      bottleneck_stage: "STAGE_2_REFERRAL_DIAG",
      channel: "Community",
      target_metric: "Referral & Seminar → Diag Booked ≥ 40%",
      cited_voc_quotes: citedQuotesList,
      single_cta:
        "Forward Your 2 VIP 'Ontario K/T/C/A Cognitive Diagnostic + 14-Day Socratic Guest Passes' to 2 GTA Parent Friends",
      asset_body: `## 1. Week 4–6 "Unit-Test Win Moment" Parent Referral Trigger
**Fires When:** Active Tier 2 ($139 CAD/mo) student logs a +10% unit-test jump or completes 10 unassisted Socratic STEM chains in MHF4U, MCR3U, or SBI3U.

### Message from Human Learning Manager to Parent:
> *"Hi {{parent_first_name}} — great milestone tonight: {{student_first_name}} solved 4 multi-step Thinking & Application (T/A) problems in MHF4U using only 1 Socratic hint (down from 4 hints in Week 1).*
>
> *Most parents tell us before joining: ${citedQuotesList[0]}. I just unlocked **2 VIP Diagnostic Guest Passes** under your family's name for any Mississauga, Oakville, or Markham parent friends stressing over upcoming unit tests. Each pass includes a full 20-Min Cognitive Diagnostic + 14 days of Managed Socratic AI—and credits $50 CAD toward your next $139/mo billing cycle."*`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Ontario parents hesitate to share referral links in private school WhatsApp groups if the message reads like a promotional discount coupon rather than an exclusive academic assessment pass from their child's Learning Manager.",
        blind_spot_question:
          "Is this referral prompt sent within 2 hours of a verified student micro-win (unit test score or Socratic streak)?",
      },
      kill_criteria: {
        sample_threshold: "30 active Week 4–6 parents messaged by their Human Learning Manager",
        stop_loss_metric: "< 25% pass-share rate OR < 40% of referred families booking a diagnostic",
        pivot_action:
          "Pivot immediately to a live 30-minute Sunday evening 'Ontario Grade 11/12 MHF4U & SBI3U Unit-Test Survival Clinic' co-hosted by our Lead Learning Manager.",
      },
      revision_notes:
        "v1 Initial Stage 2 referral & community diagnostic flow.",
    };
  } else {
    proposalSchema = {
      proposal_id: `PROP-S3-${Date.now().toString().slice(-4)}`,
      title: `GTA Geo-Targeted (Mississauga · Oakville · Markham) Meta Ad Variant — $139/mo vs. $380/mo Centres`,
      bottleneck_stage: "STAGE_3_SCALE_ADS",
      channel: "Meta Ad",
      target_metric: "Blended CAC < $150 CAD (Diag → Paid ≥ 25%)",
      cited_voc_quotes: citedQuotesList,
      single_cta:
        "Book Your Teen's Free 20-Minute Ontario K/T/C/A STEM Cognitive Diagnostic",
      asset_body: `## 📣 GTA Parent Meta Ad — "The 9:45 PM MHF4U / SBI3U Homework Wall"
**Geo-Target:** Mississauga, Oakville, Markham, Richmond Hill, North York (Parents 38–55)

${citedQuotesList[0]}

Why GTA families are replacing $380/mo worksheet centres and $80/hr once-a-week tutors with **MindLC Tier 2 Managed Hybrid ($139 CAD/month)**:
1. **24/7 Socratic AI STEM Coach:** Aligned to Ontario K/T/C/A rubrics (MPM2D, MCR3U, MHF4U, MCV4U, SBI3U). Guides your teen step-by-step at 9:45 PM without ever handing over the final answer.
2. **Dedicated Human Learning Manager:** Weekly study plan accountability + Friday parent progress reports.

👉 **Single CTA:** Book Your Free 20-Min Ontario STEM Cognitive Diagnostic →`,
      devils_advocate: {
        primary_failure_hypothesis:
          "GTA education CPMs can exceed $45 CAD during exam weeks, driving Cost Per Booked Diagnostic over $35 CAD if the landing page doesn't mirror the exact Ontario course code from the ad.",
        blind_spot_question:
          "Does the landing page headline dynamically inject the exact course code (MHF4U / MCR3U / SBI3U) clicked in the ad?",
      },
      kill_criteria: {
        sample_threshold: "1,000 impressions OR $150 CAD spend per ad creative",
        stop_loss_metric: "Outbound CTR < 1.2% OR Cost Per Completed Diagnostic > $35 CAD",
        pivot_action:
          "Pause creative automatically and reallocate budget to the highest-converting GTA postal code cluster.",
      },
      revision_notes:
        "v1 Initial Stage 3 GTA ad creative with $150 CAD Blended CAC stop-loss.",
    };
  }

  return {
    protocolVersion: "2.0-MINDLC-HITL",
    targetPlatform: preferredPlatform,
    assetTitle: proposalSchema.title,
    marketingContent: proposalSchema.asset_body,
    proposalSchema,
    changeSummaryPill: `Created v1: Grounded in ${proposalSchema.cited_voc_quotes.length} VoC quotes (${activeStage})`,
    strategicJustification: {
      detailLevel,
      levelLabel:
        detailLevel === 1
          ? "Level 1: Executive Summary (Fast)"
          : detailLevel === 2
          ? "Level 2: Standard Rationale"
          : "Level 3: Deep Mentorship (The Why & How)",
      headlineSummary: `Drafted "${proposalSchema.title}" (${activeStage})`,
      rationaleBody: `1. **Bottleneck Focus:** Strictly aligned to **${BOTTLENECK_STAGE_CONFIGS[activeStage].shortLabel}**.\n2. **VoC Grounding:** Cites ${proposalSchema.cited_voc_quotes.join(" ; ")}.\n3. **30-Second Approval Ready:** Review the Devil's Advocate & Kill Criteria callouts on the Left Pane, then check the 3 boxes in the sticky bottom dock to lock the asset.`,
      frameworksApplied: [
        selectedSkill.skill_name,
        activeStage,
        "Ontario K/T/C/A Rubric",
      ],
      mentorshipTakeaway:
        "Use the 3 quick-steer chips below ('Soften sales tone', 'Sharpen Ontario K/T/C/A angle', 'Challenge my assumption') to iterate before approving.",
      contextCacheStatus: `Context Cache HIT (${vocQuotes.length} VoC quotes + ${rates.completedToPaidPct}% Diag-to-Paid rate)`,
    },
  };
}

export async function executeAutonomousAgentTask(params: {
  activity: PlannedActivity;
  agent: MarketingAgent;
  brandPersona: BrandPersona;
  activeStage: ActiveBottleneckStage;
  vocQuotes: VerbatimParentQuote[];
  funnelMetrics: WeeklyFunnelMetrics;
}): Promise<{
  assetTitle: string;
  platform: AssetPlatform;
  content: string;
  proposalSchema: MandatoryProposalSchema;
  agentReport: string;
}> {
  const {
    activity,
    agent,
    brandPersona,
    activeStage,
    vocQuotes,
    funnelMetrics,
  } = params;

  const mockSkill: MarketingSkill = {
    id: `skill-${activity.skillName}`,
    skill_name: activity.skillName,
    system_prompt: `Execute ${activity.title}`,
  };

  const generated = await generateMarketingResponse({
    userCommand: `${activity.title} — ${activity.tacticalExecution}`,
    selectedSkill: mockSkill,
    detailLevel: 3,
    brandPersona,
    preferredPlatform: activity.targetPlatform,
    activeStage,
    vocQuotes,
    funnelMetrics,
  });

  const customizedSchema: MandatoryProposalSchema = {
    ...generated.proposalSchema,
    proposal_id: `PROP-${agent.codeName.split(" ")[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
    title: `[${agent.codeName}] ${activity.title}`,
    channel: activity.targetPlatform,
    target_metric: activity.targetKpi,
  };

  return {
    assetTitle: customizedSchema.title,
    platform: activity.targetPlatform,
    content: customizedSchema.asset_body,
    proposalSchema: customizedSchema,
    agentReport: `${agent.codeName} drafted "${customizedSchema.title}" citing ${customizedSchema.cited_voc_quotes.length} VoC quotes.`,
  };
}

export async function evaluateCmoPlanQuestionAndAdjust(params: {
  question: string;
  activeHorizon: PlanHorizon;
  trends: OntarioTrendSignal[];
  competitors: CompetitorProfile[];
  brandPersona: BrandPersona;
  activeStage?: ActiveBottleneckStage;
  paidStudents?: number;
}): Promise<{
  strategistAnswer: string;
  horizonAffected: PlanHorizon;
  newActivities: PlannedActivity[];
  adjustmentSummary: string[];
}> {
  const {
    question,
    activeHorizon,
    activeStage = "STAGE_1_CONVERSION",
    paidStudents = 14,
  } = params;
  await new Promise((r) => setTimeout(r, 380));

  const q = question.toLowerCase();
  const targetHorizon: PlanHorizon =
    q.includes("daily") || q.includes("today")
      ? "Daily"
      : q.includes("weekly") || q.includes("week")
      ? "Weekly"
      : q.includes("monthly") || q.includes("month")
      ? "Monthly"
      : q.includes("quarter") || q.includes("q1") || q.includes("q2")
      ? "Quarterly"
      : q.includes("annual") || q.includes("year")
      ? "Annual"
      : activeHorizon;

  const nowId = Date.now();
  const stageCfg = BOTTLENECK_STAGE_CONFIGS[activeStage];

  const act1: PlannedActivity = {
    id: `plan-cmo-${nowId}-1`,
    horizon: targetHorizon,
    timeWindow: `${targetHorizon} Priority #1 (${activeStage})`,
    title: `${stageCfg.shortLabel.split(":")[0]} Play: ${question.slice(0, 62)}`,
    tacticalExecution: `Locked to ${stageCfg.lockedObjective} (${paidStudents}/100 students). Execute allowed stage play (${stageCfg.allowedProposalTypes.slice(0, 2).join(" + ")}) citing WeeklyRealityLog parent objections and enforcing 48-hr stop-loss.`,
    deliverableSpec: `${stageCfg.allowedProposalTypes[0]} + Devil's Advocate & Kill Criteria`,
    marketTrigger: `CMO Directive ("${question.slice(0, 48)}")`,
    courseCodesTargeted: ["MHF4U", "SBI3U", "MCR3U", "MPM2D"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Parent Call",
    funnelObjective: "Conversion Optimization",
    targetKpi: stageCfg.targetBenchmark,
    status: "Queued",
    adjustedByCmo: true,
    cmoAdjustmentNote: `Adjusted under ${activeStage}: "${question.slice(0, 60)}"`,
    requiredStage: activeStage,
  };

  return {
    horizonAffected: targetHorizon,
    strategistAnswer: `**CMO Plan Re-Calibration (${activeStage} · ${paidStudents}/100 Paid Students):**\nLocked strictly to **${stageCfg.lockedObjective}**. Dispatched task to your ${targetHorizon} queue.`,
    newActivities: [act1],
    adjustmentSummary: [
      `Added [${targetHorizon}] Task: "${act1.title}" (${stageCfg.targetBenchmark})`,
    ],
  };
}
