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
    label: "Stage 1: Diagnostic-to-Paid Conversion Lock (0–25 Students)",
    studentRange: [0, 25],
    lockedObjective:
      "Maximize Diagnostic Completed -> Paid Conversion (Target >= 25% at $139 CAD/mo Tier 2 Managed Hybrid)",
    targetBenchmark: "Diag Completed -> Paid >= 25%",
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
    label: "Stage 2: Referral & Community-to-Diagnostic Lock (26–60 Students)",
    studentRange: [26, 60],
    lockedObjective:
      "Maximize Parent Referrals & Community/Seminar -> Diagnostic Booked (Target >= 40%)",
    targetBenchmark: "Referral & Seminar -> Diag Booked >= 40%",
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
    label: "Stage 3: GTA Paid Ad Scaling Lock (61–100 Students)",
    studentRange: [61, 100],
    lockedObjective:
      "Scale validated diagnostic landing pages via targeted GTA (Mississauga, Toronto, Oakville, Markham) Meta/Google ads while holding Blended CAC < $150 CAD",
    targetBenchmark: "Blended CAC < $150 CAD (1.08-mo payback on $139 CAD/mo)",
    allowedProposalTypes: [
      "Paid ad creative variants (GTA geo-targeted)",
      "Landing page A/B tests",
      "Budget reallocation alerts",
    ],
    blockedScope: ["Unmeasured brand awareness campaigns without CAC stop-loss"],
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

/**
 * Checks if a user command or target platform violates the active Single-Bottleneck Lock-In Stage.
 */
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
        blockedReason: `Out-of-Scope Request Detected during ${activeStage} (${paidStudents}/100 paid students). Cold paid ads, broad social calendars, and SEO blog clusters are locked until Diagnostic-to-Paid hits >= 25%.`,
        bottleneckMathExplanation: `Current Funnel Reality: Your latest Weekly Reality Log shows ${funnelMetrics.diag_completed} Diagnostics Completed and ${funnelMetrics.paid_conversions} Paid Conversions (${rates.completedToPaidPct}% Diag-to-Paid rate). Pouring top-of-funnel cold traffic into a ${rates.completedToPaidPct}% bucket burns acquisition cash before the $139 CAD/mo Tier 2 Managed Hybrid close loop is watertight.`,
        suggestedInScopeAlternative:
          "Switch to an allowed Stage 1 asset: (1) Cognitive Diagnostic Report copy, (2) 10-Minute Parent Debrief Call Script, (3) Post-Diagnostic 3-Touch Follow-Up Sequence, or (4) $139 CAD/mo Offer Framing & 30-Day Guarantee Copy.",
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
        blockedReason: `Out-of-Scope Request Detected during ${activeStage} (${paidStudents}/100 paid students). High-budget cold ad scaling is locked until Referral & Seminar -> Diagnostic Booked reaches >= 40%.`,
        bottleneckMathExplanation: `At ${paidStudents} students ($${paidStudents * 139} CAD MRR), your highest-leverage growth engine is harvesting warm parent referrals at Week 4–6 and Ontario parent unit-test seminars (MPM2D, MCR3U, MHF4U, SBI3U) where CAC is near $0 CAD.`,
        suggestedInScopeAlternative:
          "Generate a Week 4–6 Parent Referral Invite Flow, an Ontario Parent Seminar Kit, or a Grade 11 MCR3U / SBI3U Unit-Test Lead Magnet.",
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

// ============================================================================
// SAFEGUARD 3: MANDATORY PROPOSAL SCHEMA VALIDATOR
// ============================================================================

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
    missing.push("cited_voc_quotes (must cite >= 1 WeeklyRealityLog VoC quote)");
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

/**
 * Builds the exact Google Gemini system instruction with Context-Cached VoC Quotes,
 * Weekly Funnel Metrics, Single-Bottleneck Lock-In Rules, and Mandatory Proposal Schema.
 */
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
Curriculum Focus: ${persona.curriculumFocus} (MPM2D, MCR3U, MHF4U, MCV4U, SBI3U, SCH4U, SPH4U)

[WEEKLY REALITY LOG — COMPUTED FUNNEL RATES]
• Reach/Contacts -> Diagnostic Booked: ${rates.contactToBookedPct}% (${funnelMetrics.diag_booked}/${funnelMetrics.reach_or_contacts})
• Diagnostic Booked -> Diagnostic Completed: ${rates.bookedToCompletedPct}% (${funnelMetrics.diag_completed}/${funnelMetrics.diag_booked})
• Diagnostic Completed -> Paid ($139 CAD/mo): ${rates.completedToPaidPct}% (${funnelMetrics.paid_conversions}/${funnelMetrics.diag_completed})

[LATEST VERBATIM PARENT QUOTES (VoC) — MUST CITE AT LEAST 1 IN EVERY PROPOSAL]
${
  top10Quotes.length > 0
    ? top10Quotes
        .map(
          (q) =>
            `- [${q.id}] (tag: ${q.context_tag}): "${q.quote_text}"`
        )
        .join("\n")
    : `- [VOC-01] (tag: ai_cheating): "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U unit test."`
}
[/GEMINI CONTEXT CACHE BLOCK]

[SINGLE-BOTTLENECK LOCK-IN GUARDRAIL: ${activeStage}]
• Locked Objective: ${stageCfg.lockedObjective}
• Allowed Proposal Types: ${stageCfg.allowedProposalTypes.join(" | ")}
• STRICTLY FORBIDDEN SCOPE: ${stageCfg.blockedScope.join(" | ")}
If the Acting CMO requests an out-of-scope campaign, you MUST warn about scope drift, explain the current bottleneck math (${rates.completedToPaidPct}% Diag-to-Paid), and require explicit override confirmation.

[ACTIVE SKILL SYSTEM PROMPT: ${skill.skill_name}]
${skill.system_prompt}

[MANDATORY PROPOSAL JSON SCHEMA + DEVIL'S ADVOCATE + KILL CRITERIA]
Every generated or revised proposal MUST output all required schema fields:
proposal_id, title, bottleneck_stage, channel, target_metric, cited_voc_quotes, single_cta, asset_body, devils_advocate { primary_failure_hypothesis, blind_spot_question }, kill_criteria { sample_threshold, stop_loss_metric, pivot_action }, and revision_notes.
Pair with Strategic Justification at Detail Level ${detailLevel}.
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
}

export async function generateMarketingResponse(
  req: GenerateMarketingRequest
): Promise<MandatoryOutputProtocol> {
  const {
    userCommand,
    selectedSkill,
    detailLevel,
    brandPersona,
    preferredPlatform = "Cognitive Report & Debrief Script",
    activeStage = "STAGE_1_CONVERSION",
    vocQuotes = [],
    funnelMetrics = {
      reach_or_contacts: 64,
      diag_booked: 18,
      diag_completed: 14,
      paid_conversions: 3,
    },
    existingProposalToRevise,
  } = req;

  await new Promise((resolve) => setTimeout(resolve, 480));

  const lowerCmd = userCommand.toLowerCase();
  const rates = computeFunnelRates(funnelMetrics);

  // Pick top matching VoC quotes from WeeklyRealityLog to cite explicitly
  const matchedQuotes = vocQuotes.filter((q) => {
    if (lowerCmd.includes("price") || lowerCmd.includes("139") || lowerCmd.includes("cost"))
      return q.context_tag === "price";
    if (lowerCmd.includes("cheat") || lowerCmd.includes("chatgpt") || lowerCmd.includes("socratic"))
      return q.context_tag === "ai_cheating";
    if (lowerCmd.includes("motivat") || lowerCmd.includes("lazy") || lowerCmd.includes("log in"))
      return q.context_tag === "student_motivation";
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
          `[VOC-101 · ai_cheating] "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U Functions unit test."`,
          `[VOC-102 · price] "We already wasted $380/month at Mathnasium—how do I know $139/month won't just be another subscription he ignores?"`,
        ];

  const courseFocus =
    lowerCmd.includes("sbi3u") || lowerCmd.includes("bio") || lowerCmd.includes("science")
      ? "Grade 11/12 Ontario STEM (MCR3U Functions & SBI3U/SCH4U)"
      : lowerCmd.includes("mhf4u") || lowerCmd.includes("mcv4u") || lowerCmd.includes("12")
      ? "Grade 12 Advanced Functions (MHF4U) & Calculus (MCV4U)"
      : "Ontario Grades 9–12 STEM (MPM2D, MCR3U, MHF4U, SBI3U)";

  // If revising an existing proposal via conversational HITL refinement:
  if (existingProposalToRevise) {
    const revisedBody = `${existingProposalToRevise.asset_body}\n\n---\n### 🔄 [CMO HITL Revision Applied — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}]\n**Refinement Directive:** "${userCommand}"\n\n• **Sharpened VoC Alignment:** Directly addresses ${citedQuotesList[0]} by contrasting passive answer-copying with MindLC's 4-step Socratic cognitive trace and weekly Human Learning Manager check-in.\n• **Tier 2 Managed Hybrid Framing ($139 CAD/mo):** Breaks down to **$4.63 CAD/day**—less than 2 hours of a private $80/hr tutor—backed by our **30-Day Active-Habit & Unit-Test Improvement Guarantee**.\n• **Single Lock-Step CTA:** "${existingProposalToRevise.single_cta}"`;

    const revisedSchema: MandatoryProposalSchema = {
      ...existingProposalToRevise,
      cited_voc_quotes: citedQuotesList,
      asset_body: revisedBody,
      revision_notes: `Revised via CMO chat ("${userCommand.slice(0, 75)}") — tightened $139 CAD/mo Tier 2 Managed Hybrid framing and cited ${citedQuotesList[0].split(" ")[0]}.`,
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
      strategicJustification: {
        detailLevel,
        levelLabel:
          detailLevel === 1
            ? "Level 1: Executive Summary (Fast)"
            : detailLevel === 2
            ? "Level 2: Standard Rationale"
            : "Level 3: Deep Mentorship (The Why & How)",
        headlineSummary: `Conversational HITL Revision Applied to "${revisedSchema.title}"`,
        rationaleBody: `1. **Revision Summary:** ${revisedSchema.revision_notes}\n2. **VoC Citation Preserved:** Resolved ${citedQuotesList.join(" AND ")}.\n3. **Kill Criteria Maintained:** ${revisedSchema.kill_criteria.sample_threshold} -> Stop-loss at ${revisedSchema.kill_criteria.stop_loss_metric}.`,
        frameworksApplied: [
          selectedSkill.skill_name,
          "HITL Conversational Refinement",
          activeStage,
        ],
        mentorshipTakeaway:
          "Re-verify the Devil's Advocate Blind-Spot Question on the card before transitioning this proposal from DRAFT to APPROVED_FOR_EXECUTION.",
        contextCacheStatus: `Context Cache HIT (${vocQuotes.length} VoC quotes + ${rates.completedToPaidPct}% Diag-to-Paid rate injected)`,
      },
    };
  }

  // Generate New Proposal tailored to ActiveBottleneckStage
  let proposalSchema: MandatoryProposalSchema;

  if (activeStage === "STAGE_1_CONVERSION") {
    proposalSchema = {
      proposal_id: `PROP-S1-${Date.now().toString().slice(-5)}`,
      title: `10-Min Parent Diagnostic Debrief Script & Cognitive Report Close ($139 CAD/mo Tier 2 Managed Hybrid)`,
      bottleneck_stage: "STAGE_1_CONVERSION",
      channel:
        preferredPlatform === "Email Sequence"
          ? "Post-Diagnostic 72-Hr Follow-Up Sequence (Email + SMS)"
          : "1-on-1 Zoom Parent Debrief + Cognitive Diagnostic Report",
      target_metric: `Diagnostic Completed -> Paid Conversion (Current: ${rates.completedToPaidPct}% -> Target: >= 25%)`,
      cited_voc_quotes: citedQuotesList,
      single_cta:
        "Activate Your Teen's 30-Day Risk-Free Tier 2 Managed Hybrid Seat ($139 CAD/mo) Before Friday's Unit Test Study Plan Lock",
      asset_body: `## 1. Cognitive Diagnostic Report Header (Shown on Screen During Minutes 0–3)
**Student Course Focus:** ${courseFocus}
**Diagnostic Finding:** Conceptual Understanding is **78%**, but **Multi-Step Application & Exam Execution Under Time Pressure is 48%** (Root cause of homework-to-test mark drops).

---

## 2. Minute-by-Minute 10-Minute Parent Debrief Call Script
### Minutes 0–3: Validate the Exact Parent Frustration (VoC Mirroring)
> *"When we looked at your child's diagnostic trace in ${courseFocus}, we saw the exact pattern most Ontario parents tell us about: ${citedQuotesList[0]}. Look at Question 4 on their Cognitive Report—they knew the formula, but when the word problem required 3 chained algebraic steps without an AI handing them step 1, they stalled at minute 2."*

### Minutes 3–6: Contrast the Two Failed Alternatives vs. Tier 2 Managed Hybrid ($139 CAD/mo)
> *"If you hire an $80/hr tutor once a week ($320/month), nobody is there on Tuesday at 9:30 PM when they hit that wall. And if they use ChatGPT, it spits out the answer so they never build the neural pathway for Friday's closed-book test.*
>
> *That's why our **Tier 2 Managed Hybrid Plan ($139 CAD/month)** combines two things:*
> 1. **24/7 Socratic AI STEM Coach:** Hard-coded NEVER to give the final answer. It prompts your teen with the exact guiding question they need at 9:30 PM.
> 2. **Dedicated Human Learning Manager:** Reviews their Socratic session logs every week, sets their upcoming Ontario unit-test goals, and messages you a 60-second parent accountability scorecard."*

### Minutes 6–9: Neutralize the "Will My Teen Actually Use It?" Objection + 30-Day Guarantee
> *"You also raised a critical point: ${citedQuotesList[1] || citedQuotesList[0]}. Under our **30-Day Active-Habit Guarantee**, if your Human Learning Manager cannot get your teen completing at least 3 Socratic problem sessions per week in their first 30 days, we refund 100% of your $139 CAD tuition immediately."*

### Minute 10: Single Lock-Step Close
👉 **Single Parent Action:** *"I have your child's first week of ${courseFocus} Socratic modules queued for this week's unit. Shall we activate their $139 CAD/mo Tier 2 Managed Hybrid seat now so their Human Learning Manager can run their onboarding check-in tomorrow?"*`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Ontario parents who just completed a free diagnostic may say 'Let me talk to my spouse and get back to you' if the Cognitive Report looks like a generic percentage score instead of showing a concrete timestamped clip of their teen stalling on a multi-step Ontario curriculum question.",
        blind_spot_question:
          "During the 10-minute debrief, does the presenter show the student's actual step-by-step Socratic error trace on screen within the first 90 seconds, or do they talk abstractly about features?",
      },
      kill_criteria: {
        sample_threshold: "12 completed 10-minute parent diagnostic debrief calls",
        stop_loss_metric:
          "< 20% same-call or 48-hour paid conversion into the $139 CAD/mo Tier 2 Managed Hybrid Plan",
        pivot_action:
          "Immediately switch from a full $139/mo upfront commitment on the call to a '$19 CAD 14-Day Unit-Test Rescue Sprint' that auto-upgrades to $139 CAD/mo on Day 15 unless cancelled.",
      },
      revision_notes:
        "Initial Stage 1 generation grounded in WeeklyRealityLog VoC quotes and locked to Diagnostic-to-Paid >= 25% objective.",
    };
  } else if (activeStage === "STAGE_2_REFERRAL_DIAG") {
    proposalSchema = {
      proposal_id: `PROP-S2-${Date.now().toString().slice(-5)}`,
      title: `Week 4 Report-Card Win Parent Referral Flow & MCR3U/SBI3U Unit-Test Seminar Kit`,
      bottleneck_stage: "STAGE_2_REFERRAL_DIAG",
      channel: "Active Parent WhatsApp/SMS Trigger + GTA School Parent Community Seminar",
      target_metric: "Referral & Community Seminar -> Diagnostic Booked (Target >= 40%)",
      cited_voc_quotes: citedQuotesList,
      single_cta:
        "Forward Your Unique 'Gift a Free Ontario STEM Cognitive Diagnostic + 14-Day Socratic Pass' Link to 2 GTA Parent Friends",
      asset_body: `## 1. Week 4–6 "Unit-Test Win Moment" Parent Referral Trigger
**Trigger Condition:** Fires automatically the evening an active Tier 2 ($139 CAD/mo) student completes their 10th Socratic AI session or logs a +10% unit test jump in ${courseFocus}.

### WhatsApp / SMS Message from Human Learning Manager to Parent:
> *"Hi {{parent_first_name}}! Quick win to share: {{student_first_name}} solved 4 multi-step ${courseFocus} problems independently tonight using only 1 Socratic hint (down from 4 hints in Week 1).*
>
> *Most parents tell us before joining: ${citedQuotesList[0]}. Since you know 2 or 3 other Ontario parents stressing over ${courseFocus} midterms right now, I unlocked **2 VIP Guest Passes** under your name. It gives their teen our full 20-Min Cognitive Diagnostic + 14 days of Managed Socratic AI free—and takes $50 CAD off your next $139/mo renewal for each family who books their diagnostic."*

---

## 2. Forwardable 1-Tap Message for the Parent to Paste into Parent Group Chats:
> *"Hey! A few of us were talking about ${courseFocus} marks—we switched from $80/hr weekly tutoring to MindLC ($139/mo for a dedicated Human Learning Manager + 24/7 Socratic AI that gives hints instead of just spitting out answers like ChatGPT). Our Learning Manager gave me 2 free passes for a full Ontario Math/STEM Diagnostic if you want to grab one for your teen before the next unit test: {{referral_link}}"*`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Ontario parents rarely forward marketing links in private school WhatsApp groups if the message sounds like an affiliate pitch rather than a scarce, high-status academic diagnostic pass from their child's Learning Manager.",
        blind_spot_question:
          "Are we triggering this ask immediately after a concrete student micro-win (a specific unit test or Socratic streak), or sending it as a generic monthly blast?",
      },
      kill_criteria: {
        sample_threshold: "30 active Week 4–6 parents prompted by their Human Learning Manager",
        stop_loss_metric: "< 25% of prompted parents share a guest pass OR < 40% of referred leads book a diagnostic",
        pivot_action:
          "Pivot from 1-to-1 referral links to a live 30-minute Sunday evening 'Ontario Grade 11/12 MCR3U & SBI3U Midterm Survival Parent Clinic' where current parents invite 1 friend directly.",
      },
      revision_notes:
        "Initial Stage 2 generation locked to Referral & Seminar -> Diagnostic Booked >= 40%.",
    };
  } else {
    // STAGE_3_SCALE_ADS (61-100 Paid Students)
    proposalSchema = {
      proposal_id: `PROP-S3-${Date.now().toString().slice(-5)}`,
      title: `GTA Geo-Targeted (Mississauga, Oakville, Markham, Toronto) Meta Ad Set — $139 CAD/mo vs. $380/mo Centres`,
      bottleneck_stage: "STAGE_3_SCALE_ADS",
      channel: "Meta (Facebook & Instagram) Geo-Targeted GTA Parent Feed",
      target_metric: "Blended Paid Student CAC < $150 CAD (Diag-to-Paid >= 25% maintained)",
      cited_voc_quotes: citedQuotesList,
      single_cta:
        "Book Your Teen's Free 20-Minute Ontario STEM Cognitive Diagnostic (Mississauga · Oakville · Markham · Toronto)",
      asset_body: `## 📣 GTA Parent Meta Ad Variant A — The "9:45 PM Homework Freeze" Hook
**Geo-Target:** Mississauga, Oakville, Markham, North York, Richmond Hill (Parents 38–55)

**Primary Text:**
${citedQuotesList[0]}

If you're a parent in the GTA with a teen in ${courseFocus}, you already know the two traps:
❌ **$80/hr Private Tutors ($320+/mo):** Great on Sunday afternoon, nowhere to be found on Tuesday at 9:45 PM before Wednesday's unit test.
❌ **Generic ChatGPT / Photo-Solvers:** Spits out the final answer in 2 seconds—so your teen finishes the worksheet without thinking and blanks out on the real closed-book test.

✅ **The MindLC Tier 2 Managed Hybrid Plan ($139 CAD/month):**
1. **24/7 Socratic AI STEM Coach:** Trained on Ontario Ministry course codes (MPM2D, MCR3U, MHF4U, MCV4U, SBI3U). Never hands over the answer—asks step-by-step guiding questions until your child solves it independently.
2. **Dedicated Human Learning Manager:** Holds your teen accountable every week and sends you clear parent progress reports.

👉 **Headline:** Replace $350/mo Tutoring With 24/7 Socratic AI + Human Accountability ($139 CAD/mo)
👉 **Single CTA Button:** Book Your Free 20-Min Ontario STEM Cognitive Diagnostic →`,
      devils_advocate: {
        primary_failure_hypothesis:
          "GTA Meta CPMs for education audiences can spike above $45 CAD during midterm weeks, pushing Cost Per Booked Diagnostic above $38 CAD and breaching the $150 CAD Blended CAC ceiling if landing page bounce rate exceeds 65%.",
        blind_spot_question:
          "Does the landing page hero immediately display the exact Ontario course code (MCR3U / MHF4U / MPM2D) from the ad's UTM parameter above the fold?",
      },
      kill_criteria: {
        sample_threshold: "1,500 GTA parent impressions OR $150 CAD ad spend per creative variant",
        stop_loss_metric: "Outbound CTR < 1.2% OR Cost Per Completed Diagnostic > $35 CAD (Blended CAC > $150 CAD)",
        pivot_action:
          "Kill underperforming ad variant within 24 hours and reallocate 100% of daily budget to top-converting GTA postal-code cluster (Oakville/Markham Grade 11 MCR3U).",
      },
      revision_notes:
        "Initial Stage 3 GTA ad scaling proposal locked to Blended CAC < $150 CAD.",
    };
  }

  // Enforce schema validation before returning
  const validation = validateMandatoryProposalSchema(proposalSchema);
  if (!validation.valid) {
    throw new Error(
      `MandatoryProposalSchema validation failed: missing ${validation.missingFields.join(", ")}`
    );
  }

  const levelMap = {
    1: {
      levelLabel: "Level 1: Executive Summary (Fast)" as const,
      headlineSummary: `[${activeStage}] Drafted "${proposalSchema.title}" targeting ${proposalSchema.target_metric}.`,
      rationaleBody: `• **VoC Resolved:** ${proposalSchema.cited_voc_quotes[0]}\n• **Devil's Advocate Risk:** ${proposalSchema.devils_advocate.primary_failure_hypothesis}\n• **Kill Criteria:** ${proposalSchema.kill_criteria.sample_threshold} -> Stop-loss at ${proposalSchema.kill_criteria.stop_loss_metric}.`,
      frameworksApplied: [
        selectedSkill.skill_name,
        activeStage,
        "Mandatory Proposal Schema v2",
      ],
      contextCacheStatus: `Context Cache HIT (${vocQuotes.length} VoC quotes + ${rates.completedToPaidPct}% Diag-to-Paid rate)`,
    },
    2: {
      levelLabel: "Level 2: Standard Rationale" as const,
      headlineSummary: `[${activeStage}] How "${proposalSchema.title}" Resolves Ground-Truth Parent Objections`,
      rationaleBody: `1. **Bottleneck Discipline:** Locked strictly to **${BOTTLENECK_STAGE_CONFIGS[activeStage].lockedObjective}**.\n2. **Direct VoC Injection:** Built around verbatim parent quotes from your Weekly Reality Log (${proposalSchema.cited_voc_quotes.join(" ; ")}).\n3. **Pre-Registered Stop-Loss:** Prevents sunk-cost fallacy by enforcing an automatic pivot (${proposalSchema.kill_criteria.pivot_action}) if ${proposalSchema.kill_criteria.stop_loss_metric} after ${proposalSchema.kill_criteria.sample_threshold}.`,
      frameworksApplied: [
        selectedSkill.skill_name,
        activeStage,
        "VoC Context Injection",
        "Pre-Committed Kill Criteria",
      ],
      mentorshipTakeaway: `Before approving this proposal on the Left Canvas, answer the Devil's Advocate Blind-Spot Question: "${proposalSchema.devils_advocate.blind_spot_question}"`,
      contextCacheStatus: `Context Cache HIT (${vocQuotes.length} VoC quotes + ${rates.completedToPaidPct}% Diag-to-Paid rate)`,
    },
    3: {
      levelLabel: "Level 3: Deep Mentorship (The Why & How)" as const,
      headlineSummary: `Deep CMO Mentorship: Unit Economics ($139 CAD/mo Tier 2), VoC Anchoring & Falsifiable Kill Criteria`,
      rationaleBody: `1. **Why This Bottleneck Stage Comes First (${activeStage}):**\n   • At your current funnel metrics (${funnelMetrics.diag_completed} diagnostics completed -> ${funnelMetrics.paid_conversions} paid = **${rates.completedToPaidPct}% conversion**), every 5% lift in \`Diag Completed -> Paid\` compounds the ROI of every future referral and GTA ad dollar.\n\n2. **Voice-of-Customer (VoC) Psychological Reframing:**\n   • By quoting exact parent fears (${proposalSchema.cited_voc_quotes[0]}), we shift the $139 CAD/month Tier 2 Managed Hybrid offer from "another AI subscription" to "a $4.63/day replacement for $350/mo worksheet centres and absent $80/hr weekly tutors."\n\n3. **Devil's Advocate & Stop-Loss Rigor:**\n   • Amateur marketers fall in love with their copy; disciplined CMOs pre-commit to a **Kill Threshold** (${proposalSchema.kill_criteria.sample_threshold} / ${proposalSchema.kill_criteria.stop_loss_metric}) and an immediate **Pivot Action** (${proposalSchema.kill_criteria.pivot_action}).`,
      frameworksApplied: [
        selectedSkill.skill_name,
        activeStage,
        "JTBD Four Forces",
        "Devil's Advocate Falsification",
        "Stop-Loss Unit Economics ($139 CAD/mo)",
      ],
      mentorshipTakeaway: `Verify the Blind-Spot Question ("${proposalSchema.devils_advocate.blind_spot_question}") and check both HITL Safeguard boxes on the Left Card to unlock the Approve button.`,
      contextCacheStatus: `Context Cache HIT (${vocQuotes.length} VoC quotes + ${rates.completedToPaidPct}% Diag-to-Paid rate)`,
    },
  };

  return {
    protocolVersion: "2.0-MINDLC-HITL",
    targetPlatform: preferredPlatform,
    assetTitle: proposalSchema.title,
    marketingContent: proposalSchema.asset_body,
    proposalSchema,
    strategicJustification: {
      detailLevel,
      ...levelMap[detailLevel],
    },
  };
}

/**
 * Autonomous Agent Task Executor — now wraps every agent output in the
 * MandatoryProposalSchema (with VoC citations, Devil's Advocate, and Kill Criteria).
 */
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
    title: `[${agent.codeName} · ${activity.horizon}] ${activity.title}`,
    channel: `${activity.targetPlatform} (${activity.courseCodesTargeted.join(" · ")})`,
    target_metric: activity.targetKpi,
  };

  return {
    assetTitle: customizedSchema.title,
    platform: activity.targetPlatform,
    content: customizedSchema.asset_body,
    proposalSchema: customizedSchema,
    agentReport: `${agent.codeName} generated schema-validated proposal "${customizedSchema.title}" citing ${customizedSchema.cited_voc_quotes.length} VoC quotes with pre-registered Kill Criteria (${customizedSchema.kill_criteria.sample_threshold}).`,
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
  await new Promise((r) => setTimeout(r, 400));

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
    timeWindow: `${targetHorizon} Priority #1 (CMO Adjusted · ${activeStage})`,
    title:
      activeStage === "STAGE_1_CONVERSION"
        ? `Stage 1 Conversion Fix: ${question.slice(0, 58)} (10-Min Debrief & $139 CAD/mo Guarantee)`
        : activeStage === "STAGE_2_REFERRAL_DIAG"
        ? `Stage 2 Referral & Seminar Play: ${question.slice(0, 55)}`
        : `Stage 3 GTA Ad Scale Play: ${question.slice(0, 58)}`,
    tacticalExecution: `Aligned strictly to ${stageCfg.lockedObjective} (${paidStudents}/100 paid students). Execute allowed stage play (${stageCfg.allowedProposalTypes.slice(0, 2).join(" + ")}) while citing latest WeeklyRealityLog parent objections and enforcing 48-hour Stop-Loss Kill Criteria.`,
    deliverableSpec: `${stageCfg.allowedProposalTypes[0]} + Devil's Advocate & Kill Criteria Spec`,
    marketTrigger: `CMO Directive ("${question.slice(0, 50)}") under ${activeStage}`,
    courseCodesTargeted: ["MPM2D", "MCR3U", "MHF4U", "SBI3U"],
    assignedAgentId:
      activeStage === "STAGE_1_CONVERSION"
        ? "agent-cro"
        : activeStage === "STAGE_2_REFERRAL_DIAG"
        ? "agent-lifecycle"
        : "agent-social",
    skillName:
      activeStage === "STAGE_1_CONVERSION"
        ? "cro"
        : activeStage === "STAGE_2_REFERRAL_DIAG"
        ? "copywriting"
        : "social-content",
    targetPlatform:
      activeStage === "STAGE_1_CONVERSION"
        ? "Cognitive Report & Debrief Script"
        : activeStage === "STAGE_2_REFERRAL_DIAG"
        ? "Parent Referral & Seminar Kit"
        : "Facebook",
    funnelObjective:
      activeStage === "STAGE_1_CONVERSION"
        ? "Conversion Optimization"
        : "Lead Generation",
    targetKpi: stageCfg.targetBenchmark,
    status: "Queued",
    adjustedByCmo: true,
    cmoAdjustmentNote: `Adjusted under ${activeStage}: "${question.slice(0, 60)}"`,
    requiredStage: activeStage,
  };

  return {
    horizonAffected: targetHorizon,
    strategistAnswer: `**CMO Plan Re-Calibration (Enforcing ${activeStage} at ${paidStudents}/100 Paid Students):**\n1. **Bottleneck Filter Applied:** Because MindLC is currently in **${stageCfg.label}**, all newly injected tasks are locked to **${stageCfg.lockedObjective}**.\n2. **Task Injected into ${targetHorizon} Schedule:** Dispatched specialist agent to produce a schema-validated proposal with VoC quote citations, Devil's Advocate blind-spot check, and hard Kill Criteria.`,
    newActivities: [act1],
    adjustmentSummary: [
      `Injected [${targetHorizon}] ${activeStage} Task: "${act1.title}" (Target: ${stageCfg.targetBenchmark})`,
    ],
  };
}
