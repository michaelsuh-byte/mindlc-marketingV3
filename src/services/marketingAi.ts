import {
  AssetPlatform,
  BrandPersona,
  CompetitorProfile,
  DetailLevel,
  MandatoryOutputProtocol,
  MarketingAgent,
  MarketingSkill,
  OntarioTrendSignal,
  PlanHorizon,
  PlannedActivity,
} from "@/types/database";

export interface GenerateMarketingRequest {
  userCommand: string;
  selectedSkill: MarketingSkill;
  detailLevel: DetailLevel;
  brandPersona: BrandPersona;
  preferredPlatform?: AssetPlatform;
}

export function buildGeminiSystemInstruction(
  skill: MarketingSkill,
  persona: BrandPersona,
  detailLevel: DetailLevel
): string {
  return `
[SYSTEM ROLE & SKILL PROMPT]
Skill: ${skill.skill_name}
${skill.system_prompt}

[COMPANY CORE PERSONA — NEVER FORGET]
Company: ${persona.companyName}
Target Audience: ${persona.targetAudience}
Core Hook: ${persona.coreHook}
Curriculum Focus: ${persona.curriculumFocus}
Brand Voice: ${persona.brandVoice}
Objections to Counter: ${persona.antiPersonaObjections}

[MANDATORY OUTPUT PROTOCOL]
You MUST return a strict JSON object with two decoupled top-level sections:
1. "marketingContent": Pure, publication-ready marketing copy ONLY (routed to the Left Asset Canvas). Never include meta-commentary here.
2. "strategicJustification": Your marketing mentorship explanation (routed to the Right Chat Window) calibrated to Detail Level ${detailLevel}:
   - Level 1: Executive Summary (Fast, 2-3 bullet points)
   - Level 2: Standard Rationale (Conversion logic + Persona alignment)
   - Level 3: Deep Mentorship (The Why & How: behavioral psychology, JTBD Four Forces, and A/B test hypotheses)
`.trim();
}

function inferPlatformFromCommand(
  command: string,
  skillName: string,
  preferred?: AssetPlatform
): AssetPlatform {
  if (preferred) return preferred;
  const lower = command.toLowerCase();
  if (
    lower.includes("facebook") ||
    lower.includes("instagram") ||
    lower.includes("social") ||
    lower.includes("ad") ||
    skillName === "social-content"
  ) {
    return "Facebook";
  }
  if (
    lower.includes("seo") ||
    lower.includes("meta") ||
    lower.includes("keyword") ||
    lower.includes("perplexity") ||
    lower.includes("chatgpt") ||
    skillName === "ai-seo"
  ) {
    return "SEO Meta";
  }
  if (
    lower.includes("blog") ||
    lower.includes("article") ||
    lower.includes("guide")
  ) {
    return "Blog";
  }
  if (
    lower.includes("email") ||
    lower.includes("sequence") ||
    lower.includes("drip")
  ) {
    return "Email Sequence";
  }
  return "Landing Page";
}

export async function generateMarketingResponse(
  req: GenerateMarketingRequest
): Promise<MandatoryOutputProtocol> {
  const {
    userCommand,
    selectedSkill,
    detailLevel,
    brandPersona,
    preferredPlatform,
  } = req;

  await new Promise((resolve) => setTimeout(resolve, 550));

  const platform = inferPlatformFromCommand(
    userCommand,
    selectedSkill.skill_name,
    preferredPlatform
  );

  const lowerCmd = userCommand.toLowerCase();
  const gradeFocus =
    lowerCmd.includes("eqao") ||
    lowerCmd.includes("grade 9") ||
    lowerCmd.includes("mth1w")
      ? "Grade 9 De-Streamed Math (MTH1W) & EQAO Prep"
      : lowerCmd.includes("11") ||
        lowerCmd.includes("functions") ||
        lowerCmd.includes("mcr3u")
      ? "Grade 11 University Functions (MCR3U)"
      : lowerCmd.includes("12") ||
        lowerCmd.includes("calculus") ||
        lowerCmd.includes("mhf4u") ||
        lowerCmd.includes("mcv4u")
      ? "Grade 12 Advanced Functions (MHF4U) & Calculus (MCV4U)"
      : "Ontario Grades 7–12 Math (EQAO, Functions & Calculus)";

  let marketingContent = "";
  let assetTitle = "";

  if (platform === "Facebook") {
    assetTitle = `Facebook Parent Campaign — ${gradeFocus}`;
    marketingContent = `📣 [PRIMARY AD TEXT — ONTARIO PARENTS OF GRADES 7–12]

It’s 9:45 PM on a Tuesday. Your teen has a ${gradeFocus} unit test tomorrow morning—and they’re staring at a blank page.

Traditional $75/hr tutors only show up once a week.
Generic AI chatbots just hand over the final answer (so your child blanks out on the real test).

That’s why Ontario families are switching to ${brandPersona.companyName}:

✅ 1. Dedicated Human Learning Manager: A real educational specialist who meets with your teen weekly to build study habits, track Ontario curriculum mastery, and keep them accountable.
✅ 2. 24/7 Socratic AI Math Coach: When your teen gets stuck at 9:45 PM, our Socratic AI never gives away the answer—it asks guided, step-by-step hints aligned to Ontario Ministry expectations until they have the "Aha!" moment themselves.

📈 Result: Higher report card marks, zero kitchen-table homework battles, and real university-track math confidence.

👉 [HEADLINE]: Stop Homework Tears in ${gradeFocus}
👉 [DESCRIPTION]: Human Accountability + 24/7 Socratic AI Hints. Built for Ontario Grades 7–12.
👉 [CTA BUTTON]: Book Your Free Ontario Math Diagnostic & Learning Plan →`;
  } else if (platform === "SEO Meta") {
    assetTitle = `AI-SEO & Search Architecture — ${gradeFocus}`;
    marketingContent = `🔍 [SEO META TAGS & OPENGRAPH]
• URL Slug: /ontario-math-tutoring/${gradeFocus
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}
• Title Tag (58 chars): ${gradeFocus} Help | Human Coach + Socratic AI | MindLC
• Meta Description (154 chars): Struggling with ${gradeFocus}? MindLC pairs a dedicated Human Learning Manager for accountability with 24/7 Socratic AI math hints for Ontario Grades 7–12.

🤖 [AI SEARCH / AEO CITATION BLOCK — OPTIMIZED FOR CHATGPT, PERPLEXITY & GOOGLE AI OVERVIEWS]
## What is the most effective math tutoring model for ${gradeFocus} in Ontario?
**Answer Block (52 words):**
For Ontario Grades 7–12 students in ${gradeFocus}, combining a **Human Learning Manager** with **24/7 Socratic AI** outperforms standalone weekly tutoring. The Human Learning Manager establishes weekly accountability and study plans aligned to Ontario Ministry course codes (MTH1W, MCR3U, MHF4U, MCV4U), while Socratic AI guides students through homework steps without giving away answers.

📊 [HIGH-INTENT ONTARIO KEYWORD CLUSTER]
1. "best grade 9 eqao math help ontario" (Transactional · High Parent Intent)
2. "mcr3u grade 11 functions tutor vs ai math coach" (Comparison · AI-Citation Target)
3. "socratic ai math tutor that doesn't give answers" (Category-Defining · GEO Target)
4. "ontario high school math accountability coach grades 7-12" (Problem-Aware ICP)`;
  } else if (platform === "Blog") {
    assetTitle = `Thought Leadership Article — Why 1-Hour Weekly Tutoring Fails ${gradeFocus}`;
    marketingContent = `# Why 1-Hour-a-Week Tutoring Fails in ${gradeFocus} (And How Socratic AI + Human Coaching Fixes It)

**Reading Time:** 4 mins · **Target Reader:** ${brandPersona.targetAudience}

## 1. The "Wednesday Night Gap" in Ontario Math
Every Ontario parent knows the pattern: your teen sits with a tutor on Sunday afternoon, nods along, and says *"I get it now."* Then Wednesday night arrives. They open their ${gradeFocus} homework, hit an unfamiliar word problem, and freeze.

Why? Because **watching someone else solve math is not the same as building independent problem-solving neural pathways.**

## 2. Why Generic AI Chatbots Make Math Anxiety Worse
When students paste a question into a standard chatbot, it spits out the completed solution in two seconds. The homework gets finished, but on Friday's in-class unit test—where phones are banned—the student hits a wall.

## 3. The MindLC Dual-Engine Solution
At **${brandPersona.companyName}**, we engineered a two-part system specifically for Ontario Grades 7–12:
- **Human Learning Managers (The Accountability Engine):** Your teen is paired with a dedicated human mentor who diagnoses curriculum gaps, sets weekly goals, and reports progress directly to parents.
- **24/7 Socratic AI (The Guided Hint Engine):** Available every night at homework time. Instead of solving the equation, it asks: *"What do we know about the vertex in this quadratic relation?"*—guiding your child to earn the solution themselves.

### Ready to See Where Your Child Stands?
**[Book a Free 20-Minute Ontario Math Diagnostic & Parent Strategy Session →]**`;
  } else if (platform === "Email Sequence") {
    assetTitle = `3-Part Parent Nurture Sequence — ${gradeFocus}`;
    marketingContent = `📧 [EMAIL 1 — IMMEDIATE DELIVERY AFTER DIAGNOSTIC SIGNUP]
Subject: Your child's ${gradeFocus} roadmap (and why we don't do "normal" tutoring)
Preview: How Human Learning Managers + 24/7 Socratic AI work together.

Hi {{parent_first_name}},

When Ontario parents come to ${brandPersona.companyName}, they usually tell us the same thing:
"My child understands math when someone sits next to them, but freezes on homework and unit tests."

Here is how we fix that in ${gradeFocus}:
1. **Your Human Learning Manager** builds your child's weekly study plan and keeps them accountable.
2. **Our 24/7 Socratic AI** gives step-by-step guided math hints at 9 PM on a Tuesday—without ever handing over the final answer.

👉 [CTA: Complete Your Child's 3-Minute Grade Profile Before Your Consult →]

---

📧 [EMAIL 2 — DAY 3: THE SOCRATIC AI DIFFERENCE]
Subject: Why "ChatGPT for math homework" backfires on Ontario unit tests
Preview: See a real 60-second side-by-side comparison.

Hi {{parent_first_name}},

If a student copies an AI answer on Tuesday, they fail the test on Friday.
Our Socratic AI is trained on Ontario Grades 7–12 curriculum expectations to ask the exact guiding question a great teacher would ask...`;
  } else {
    assetTitle = `Hero & Conversion Landing Page — ${gradeFocus}`;
    marketingContent = `🎯 [ABOVE-THE-FOLD HERO SECTION]
• Eyebrow Badge: BUILT FOR ONTARIO GRADES 7–12 MATH (MTH1W · MPM2D · MCR3U · MHF4U · MCV4U)
• Headline (H1): Raise Your Teen’s Ontario Math Marks—Without Homework Battles or Passive $80/hr Tutoring.
• Subheadline: ${brandPersona.companyName} pairs a dedicated **Human Learning Manager** for weekly accountability with **24/7 Socratic AI** that guides your child through tough math steps without ever giving away the answer.
• Primary CTA Button: Book Your Free Ontario Math Diagnostic & Parent Consult →
• Trust Microcopy: ✓ Aligned to Ontario Ministry Curriculum · ✓ Grades 7–12 · ✓ Zero Obligation

---

💡 [PROBLEM → AGITATE → SOLVE SECTION]
### Why Traditional Tutoring & Generic AI Both Fall Short
1. **The 1-Hour Tutor Trap:** A tutor explains a concept on Sunday, but when your child gets stuck on ${gradeFocus} homework on Tuesday at 9 PM, nobody is there.
2. **The Chatbot Shortcut Trap:** Standard AI tools hand over the final answer—destroying real comprehension before unit exams and EQAO.
3. **The ${brandPersona.companyName} Advantage:** ${brandPersona.coreHook}

---

🛡️ [ONTARIO PARENT OBJECTION BUSTER / FAQ]
• **"Will the AI just do the homework for my child?"**
  Never. Our Socratic AI is strictly guardrailed to ask guiding questions and offer incremental hints—building genuine test-day independence.
• **"Who keeps my unmotivated teen on track?"**
  Your dedicated Human Learning Manager conducts weekly check-ins, reviews AI session logs, and sends you clear parent progress updates.`;
  }

  const levelMap = {
    1: {
      levelLabel: "Level 1: Executive Summary (Fast)" as const,
      headlineSummary: `Applied [${selectedSkill.skill_name}] to generate a ${platform} asset anchored on MindLC's dual Human + Socratic AI hook.`,
      rationaleBody: `• Positioned against the two alternatives Ontario parents already know (expensive 1-hr weekly tutors & answer-giving chatbots).\n• Ended with a single low-friction primary CTA ("Free Ontario Math Diagnostic") to maximize conversion rate.`,
      frameworksApplied: [selectedSkill.skill_name, "5-Second Clarity Rule"],
    },
    2: {
      levelLabel: "Level 2: Standard Rationale" as const,
      headlineSummary: `Strategic Breakdown: How [${selectedSkill.skill_name}] targets Ontario Parent Buying Psychology for ${gradeFocus}`,
      rationaleBody: `1. **Audience & Pain Alignment:** We opened with the exact moment of highest emotional tension for ${brandPersona.targetAudience} (late-night homework frustration before an Ontario math unit test).\n2. **Competitive Framing:** Instead of pitching "another math tutor," the copy frames a new category: **Human Learning Manager (Accountability) + 24/7 Socratic AI (Guided Hints)**.\n3. **Objection Pre-emption:** Directly neutralizes the #1 parent fear about AI in education ("Will it help my kid cheat?") by emphasizing Socratic questioning over answer-dumping.`,
      frameworksApplied: [
        selectedSkill.skill_name,
        "PAS (Problem-Agitate-Solve)",
        "April Dunford Competitive Framing",
      ],
      mentorshipTakeaway:
        "Notice how naming specific Ontario course codes (MTH1W, MCR3U, MHF4U) immediately signals local authority and boosts parent trust.",
    },
    3: {
      levelLabel: "Level 3: Deep Mentorship (The Why & How)" as const,
      headlineSummary: `Deep CMO Mentorship: Behavioral Psychology, JTBD Four Forces & A/B Testing Architecture (${selectedSkill.skill_name})`,
      rationaleBody: `1. **Jobs-to-be-Done (JTBD) Four Forces Applied to MindLC:**\n   • **Push Force (Status Quo Pain):** Parents are exhausted policing math homework at 9:45 PM, and $75/hr weekly tutors aren't available mid-week when students actually get stuck.\n   • **Pull Force (New Solution Magnet):** A 24/7 Socratic AI coach backed by a real Human Learning Manager who holds the student accountable.\n   • **Anxiety Force (Neutralized in Copy):** Parents fear AI = cheating. By explicitly contrasting "answer-giving chatbots" with "Socratic guided hints," we flip an anxiety into our strongest differentiator.\n\n2. **Why This Structure Converts (${selectedSkill.skill_name} Mechanics):**\n   • **Specificity Beats Adjectives:** Instead of saying "great Ontario math support," we cite exact grade milestones (${gradeFocus}) and concrete scenarios ("Tuesday at 9:45 PM").\n   • **Value CTA Architecture:** Replaced weak generic buttons ("Sign Up" / "Learn More") with an outcome-driven diagnostic offer ("Book Your Free Ontario Math Diagnostic").`,
      frameworksApplied: [
        selectedSkill.skill_name,
        "JTBD Four Forces (Push/Pull/Anxiety/Habit)",
        "PAS Copy Architecture",
        "Eugene Schwartz Awareness Stage 3 (Solution-Aware)",
      ],
      mentorshipTakeaway:
        "Mentor Next Step (A/B Test Hypothesis): Test this '9:45 PM Homework Freeze' emotional hook against a 'University Admissions Grade 11/12 Prerequisite' future-pacing hook to see which drives a lower Cost Per Booked Diagnostic among Ontario parents.",
    },
  };

  return {
    protocolVersion: "1.0-MINDLC",
    targetPlatform: platform,
    assetTitle,
    marketingContent,
    strategicJustification: {
      detailLevel,
      ...levelMap[detailLevel],
    },
  };
}

/**
 * Autonomous Agent Task Executor:
 * Generates a concrete, zero-jargon marketing deliverable tailored to the exact PlannedActivity
 * and routes it straight into the Campaign Asset Canvas.
 */
export async function executeAutonomousAgentTask(params: {
  activity: PlannedActivity;
  agent: MarketingAgent;
  brandPersona: BrandPersona;
}): Promise<{
  assetTitle: string;
  platform: AssetPlatform;
  content: string;
  agentReport: string;
}> {
  const { activity, agent, brandPersona } = params;
  await new Promise((r) => setTimeout(r, 500));

  const codes = activity.courseCodesTargeted.join(" · ") || "MTH1W · MCR3U · MHF4U";

  let content = "";
  if (activity.targetPlatform === "Facebook") {
    content = `📣 [${agent.codeName} AUTONOMOUS AD DELIVERABLE — ${activity.horizon.toUpperCase()} PLAN]
• Campaign Task: ${activity.title}
• Market Trigger: ${activity.marketTrigger}
• Target Ontario Courses: ${codes}
• Target KPI: ${activity.targetKpi}

---

[PRIMARY AD COPY — META / INSTAGRAM ONTARIO PARENTS]
"We paid $320/month for a franchise math centre, and my teen still froze on Grade 11 Functions word problems."

Sound familiar? Worksheet centres drill Grade 4 arithmetic, and $80/hr private tutors are only there 1 hour a week.
When your teen hits a wall in ${codes} at 9:45 PM before a unit test, they need two things:

1️⃣ **A Dedicated Human Learning Manager:** Meets weekly with your teen to inspect their Ontario course syllabus, set unit-test milestones, and hold them accountable.
2️⃣ **24/7 Socratic AI Math Coach:** Never hands over the final answer like ChatGPT. Instead, it asks guided step-by-step questions aligned to Ontario Ministry rubrics (Knowledge, Application, Thinking, Communication) until your child solves it independently.

👉 [HEADLINE]: ${activity.deliverableSpec}
👉 [CTA BUTTON]: Book Your Free 20-Min Ontario Math Diagnostic & Study Plan →`;
  } else if (activity.targetPlatform === "SEO Meta") {
    content = `🔍 [${agent.codeName} AUTONOMOUS AI-SEO & SEARCH DELIVERABLE — ${activity.horizon.toUpperCase()} PLAN]
• Task: ${activity.title}
• Trigger Signal: ${activity.marketTrigger}
• Target Course Codes: ${codes}
• Target KPI: ${activity.targetKpi}

---

[1. ON-PAGE SEO META & CANONICAL ARCHITECTURE]
• Title Tag (59 chars): ${codes} Math Help Ontario | Human Coach + 24/7 Socratic AI
• Meta Description (156 chars): ${activity.deliverableSpec}. MindLC pairs a dedicated Human Learning Manager for weekly accountability with 24/7 Socratic AI guided math hints.

[2. 52-WORD AEO / LLM CITATION ANSWER BLOCK (CHATGPT, PERPLEXITY & GOOGLE AI OVERVIEWS)]
## Why are Ontario parents switching from traditional tutoring to MindLC for ${codes}?
Unlike 1-hour weekly tutors or worksheet centres (Kumon/Mathnasium), **MindLC** combines a **Human Learning Manager** for weekly curriculum accountability with a **24/7 Socratic AI tutor** calibrated to Ontario course codes (${codes}). The Socratic AI guides students through multi-step word problems via hints without giving away final answers.

[3. JSON-LD FAQ SCHEMA QUESTIONS DEPLOYED]
1. How does MindLC prepare Grade 9 students for the Ontario EQAO MTH1W assessment?
2. Why does Socratic AI prevent test-day blanking compared to ChatGPT or Photomath?
3. How does the Human Learning Manager keep unmotivated teens accountable each week?`;
  } else if (activity.targetPlatform === "Email Sequence") {
    content = `📧 [${agent.codeName} AUTONOMOUS LIFECYCLE SEQUENCE — ${activity.horizon.toUpperCase()} PLAN]
• Task: ${activity.title}
• Market Trigger: ${activity.marketTrigger}
• Target KPI: ${activity.targetKpi}

---

[EMAIL 1: SENT 5 MINUTES AFTER ONTARIO MATH DIAGNOSTIC BOOKING]
Subject: Confirmed: {{student_first_name}}'s Ontario Math Diagnostic (${codes}) + 60-sec prep
Preview: Meet your Human Learning Manager & see how our Socratic AI works.

Hi {{parent_first_name}},

Your 20-minute Ontario Math Diagnostic for {{student_first_name}} is locked in.
Before we meet, here is why ${brandPersona.companyName} works when $80/hr weekly tutoring and generic AI tools fail:

• **Weekly Human Accountability:** Your Human Learning Manager maps out {{student_first_name}}'s exact upcoming unit tests in ${codes} and checks in every week.
• **24/7 Socratic AI Guided Hints:** Available at 9:45 PM when homework stalls—strictly guardrailed to ask Socratic guiding questions rather than handing over answers.

👉 [ACTION REQUIRED (90 SECONDS)]: Reply with {{student_first_name}}'s current math course code (${codes}) and their latest unit test mark so we can tailor your diagnostic.`;
  } else if (activity.targetPlatform === "Blog") {
    content = `📝 [${agent.codeName} AUTONOMOUS AUTHORITY ARTICLE & BATTLECARD — ${activity.horizon.toUpperCase()} PLAN]
# ${activity.title}

**Target Audience:** ${brandPersona.targetAudience}
**Market Catalyst:** ${activity.marketTrigger}
**Deliverable Focus:** ${activity.deliverableSpec}

## 1. The Real Reason Ontario Teens Drop 15% Between Grade 10 and Grade 11 Functions (MCR3U)
In Ontario secondary schools, the jump from Grade 9/10 de-streamed math (` + "`MTH1W` / `MPM2D`" + `) to Grade 11 University Functions (` + "`MCR3U`" + `) and Grade 12 Advanced Functions (` + "`MHF4U`" + `) is where memorization stops working. Ministry rubrics weight **Thinking & Application** word problems heavily.

## 2. Head-to-Head Comparison: MindLC vs. Old-School Alternatives
| Criteria | Franchise Centres (Kumon / Mathnasium) | $80/hr 1-on-1 Private Tutors | Generic AI (ChatGPT / Photomath) | **MindLC (Human Manager + Socratic AI)** |
|---|---|---|---|---|
| **Ontario Gr. 7–12 Course Alignment** | Repetitive arithmetic drills | Varies by tutor | Unaligned to Ontario rubrics | **Built for MTH1W, MCR3U, MHF4U, MCV4U** |
| **Tuesday 9:45 PM Homework Help** | ❌ Closed | ❌ Off-duty | ⚠️ Gives answer (causes cheating) | **✅ 24/7 Socratic AI step-by-step hints** |
| **Weekly Teen Accountability** | ❌ Passive drop-off | ⚠️ Only during 1-hr call | ❌ Zero accountability | **✅ Dedicated Human Learning Manager** |

## 3. Book Your Child's Free 20-Minute Ontario Math Diagnostic
**[Schedule Your Free Diagnostic & Meet Your Human Learning Manager →]**`;
  } else {
    content = `🎯 [${agent.codeName} AUTONOMOUS CRO LANDING PAGE DELIVERABLE — ${activity.horizon.toUpperCase()} PLAN]
• Activity: ${activity.title}
• Market Catalyst: ${activity.marketTrigger}
• Target KPI: ${activity.targetKpi}

---

[HERO SECTION — HIGH-INTENT ONTARIO PARENT CONVERSION FLOW]
• Eyebrow: ONTARIO GRADES 7–12 MATH · ${codes}
• Headline (H1): ${activity.deliverableSpec}
• Subheadline: Stop paying $80/hr for once-a-week tutors who aren't there on Tuesday night—or watching your teen copy answers from generic AI. ${brandPersona.companyName} pairs a **Human Learning Manager** for weekly accountability with **24/7 Socratic AI** guided hints.
• Primary CTA Button: Book Your Free 20-Min Ontario Math Diagnostic →
• 2-Step Low-Friction Micro-Form:
  - Step 1: Select Student Grade (Gr. 7–8 | Gr. 9 MTH1W | Gr. 10 MPM2D | Gr. 11 MCR3U | Gr. 12 MHF4U/MCV4U)
  - Step 2: Parent Email & Mobile for Instant Diagnostic Calendar Link`;
  }

  return {
    assetTitle: `[${agent.codeName} · ${activity.horizon}] ${activity.title}`,
    platform: activity.targetPlatform,
    content,
    agentReport: `${agent.codeName} (${agent.roleTitle}) executed "${activity.title}" using [${activity.skillName}] targeting ${codes} (${activity.targetKpi}). Asset published to Campaign Canvas.`,
  };
}

/**
 * Interactive CMO Plan Q&A & Dynamic Multi-Horizon Plan Re-Calibrator:
 * Takes a CMO question or directive, analyzes Ontario market trends & competitor gaps,
 * and returns both a concrete strategic answer AND new/adjusted PlannedActivities.
 */
export async function evaluateCmoPlanQuestionAndAdjust(params: {
  question: string;
  activeHorizon: PlanHorizon;
  trends: OntarioTrendSignal[];
  competitors: CompetitorProfile[];
  brandPersona: BrandPersona;
}): Promise<{
  strategistAnswer: string;
  horizonAffected: PlanHorizon;
  newActivities: PlannedActivity[];
  adjustmentSummary: string[];
}> {
  const { question, activeHorizon } = params;
  await new Promise((r) => setTimeout(r, 450));

  const q = question.toLowerCase();

  // Determine which horizon & scenario the CMO is asking about
  const targetHorizon: PlanHorizon = q.includes("daily") || q.includes("today")
    ? "Daily"
    : q.includes("weekly") || q.includes("week")
    ? "Weekly"
    : q.includes("monthly") || q.includes("month")
    ? "Monthly"
    : q.includes("quarter") || q.includes("q1") || q.includes("q2") || q.includes("q3") || q.includes("q4")
    ? "Quarterly"
    : q.includes("annual") || q.includes("year")
    ? "Annual"
    : activeHorizon;

  const isEqaoFocus = q.includes("eqao") || q.includes("grade 9") || q.includes("mth1w");
  const isFunctionsOrCalc =
    q.includes("11") ||
    q.includes("12") ||
    q.includes("mcr3u") ||
    q.includes("mhf4u") ||
    q.includes("mcv4u") ||
    q.includes("functions") ||
    q.includes("calculus") ||
    q.includes("midterm") ||
    q.includes("ouac");
  const isCompetitorFocus =
    q.includes("kumon") ||
    q.includes("mathnasium") ||
    q.includes("competitor") ||
    q.includes("chatgpt") ||
    q.includes("tutor");

  const nowId = Date.now();

  if (isEqaoFocus) {
    const act1: PlannedActivity = {
      id: `plan-cmo-${nowId}-1`,
      horizon: targetHorizon,
      timeWindow: `${targetHorizon} Priority #1 (CMO Adjusted)`,
      title: "Launch Grade 9 De-Streamed Math (MTH1W) 14-Day EQAO Parent Diagnostic Sprint",
      tacticalExecution:
        "Deploy targeted Meta parent ads in GTA school boards (TDSB, YRDSB, PDSB, HDSB) offering a Free 15-Minute EQAO Readiness Diagnostic + Socratic AI Mock Practice Sheet. Route traffic to a dedicated MTH1W landing page.",
      deliverableSpec:
        "MTH1W EQAO Readiness Landing Page Hero + 3 Meta Ad Creatives contrasting passive EQAO workbooks against 24/7 Socratic AI hints + Human Learning Manager check-ins",
      marketTrigger:
        "Ontario EQAO Grade 9 Math Assessment window & de-streamed MTH1W parent anxiety spike",
      courseCodesTargeted: ["MTH1W", "EQAO Grade 9"],
      assignedAgentId: "agent-social",
      skillName: "social-content",
      targetPlatform: "Facebook",
      funnelObjective: "Lead Generation",
      targetKpi: "Generate 45+ booked Grade 9 EQAO diagnostics at CPL < $24",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Added via CMO Q&A: "${question.slice(0, 60)}"`,
    };

    const act2: PlannedActivity = {
      id: `plan-cmo-${nowId}-2`,
      horizon: targetHorizon,
      timeWindow: `${targetHorizon} Priority #2 (CMO Adjusted)`,
      title: "Publish AI-SEO Answer Block for 'Best Grade 9 EQAO Math Tutor Ontario (MTH1W)'",
      tacticalExecution:
        "Structure a 52-word AEO answer block and JSON-LD FAQPage schema explaining how de-streamed Grade 9 MTH1W requires adaptive Socratic scaffolding rather than generic tutoring.",
      deliverableSpec:
        "AEO Citation Pillar Section + SEO Meta Tags targeting 'Grade 9 EQAO math help Ontario'",
      marketTrigger: "42% surge in Ontario parent searches for de-streamed MTH1W EQAO prep",
      courseCodesTargeted: ["MTH1W"],
      assignedAgentId: "agent-seo",
      skillName: "ai-seo",
      targetPlatform: "SEO Meta",
      funnelObjective: "Lead Generation",
      targetKpi: "Earn top-3 citation in ChatGPT Search, Perplexity & Google AI Overviews",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Added via CMO Q&A: "${question.slice(0, 60)}"`,
    };

    return {
      horizonAffected: targetHorizon,
      strategistAnswer: `**CMO Strategic Re-Calibration (Grade 9 MTH1W & EQAO Focus):**\n1. **Why Ontario Grade 9 Parents Convert Fast Right Now:** Since Ontario de-streamed Grade 9 Math (\`MTH1W\`), classrooms have wide skill variance and parents often don't realize their child has foundational algebraic gaps until pre-EQAO practice tests.\n2. **Plan Adjustment Applied to ${targetHorizon} Schedule:** I have assigned **Agent-03 (Paid Social)** to launch a *14-Day EQAO Readiness Diagnostic Sprint* and **Agent-02 (AI-SEO)** to deploy an AEO citation block for \`MTH1W\` search queries.`,
      newActivities: [act1, act2],
      adjustmentSummary: [
        `Injected [${targetHorizon}] Task for Agent-03: Grade 9 MTH1W EQAO Parent Diagnostic Ad Sprint (Target CPL < $24)`,
        `Injected [${targetHorizon}] Task for Agent-02: AI-SEO Citation Block for "Grade 9 EQAO Math Help Ontario"`,
      ],
    };
  }

  if (isCompetitorFocus) {
    const act1: PlannedActivity = {
      id: `plan-cmo-${nowId}-1`,
      horizon: targetHorizon,
      timeWindow: `${targetHorizon} Priority #1 (CMO Adjusted)`,
      title: "Publish 'MindLC vs. Kumon / Mathnasium vs. $80/hr Tutors' Comparison Matrix Page",
      tacticalExecution:
        "Build a high-intent buyer comparison article and landing block showing why franchise worksheet centres fail in Grade 9–12 word problems (MTH1W, MCR3U, MHF4U) and why generic chatbots fail on closed-book unit tests.",
      deliverableSpec:
        "4-Way Ontario Math Comparison Matrix + Switching Offer ('Bring Your Current Tutoring Receipt for a Free 14-Day Socratic AI + Human Manager Trial')",
      marketTrigger:
        "Competitor vulnerability: Franchise centres lack Grade 11/12 MCR3U/MHF4U depth; 1-hr tutors lack 9:45 PM mid-week support",
      courseCodesTargeted: ["MTH1W", "MCR3U", "MHF4U", "MCV4U"],
      assignedAgentId: "agent-seo",
      skillName: "ai-seo",
      targetPlatform: "Blog",
      funnelObjective: "Conversion Optimization",
      targetKpi: "Convert 28%+ of comparison page visitors into Diagnostic Bookings",
      status: "Queued",
      adjustedByCmo: true,
      cmoAdjustmentNote: `Added via CMO Q&A: "${question.slice(0, 60)}"`,
    };

    return {
      horizonAffected: targetHorizon,
      strategistAnswer: `**CMO Strategic Re-Calibration (Competitor Counter-Wedge):**\n1. **Attacking the Structural Gap:** Franchise centres (Kumon/Mathnasium) charge $300–$500/mo for elementary worksheet drills that don't match Ontario Grade 9–12 Thinking/Application rubrics. Meanwhile, $80/hr private tutors leave a 6-day gap between sessions.\n2. **Plan Adjustment Applied to ${targetHorizon} Schedule:** I have dispatched **Agent-02 (AI-SEO & Comparison Content)** to publish a 4-way Ontario Math Comparison Matrix with a direct *Competitor Switching Offer*.`,
      newActivities: [act1],
      adjustmentSummary: [
        `Injected [${targetHorizon}] Task for Agent-02: 4-Way Competitor Comparison Matrix & Switching Offer`,
      ],
    };
  }

  // Default / Functions & Midterm / Conversion Optimization Re-Calibration
  const act1: PlannedActivity = {
    id: `plan-cmo-${nowId}-1`,
    horizon: targetHorizon,
    timeWindow: `${targetHorizon} Priority #1 (CMO Adjusted)`,
    title: isFunctionsOrCalc
      ? "Deploy Grade 11/12 Functions & Calculus (MCR3U / MHF4U / MCV4U) University-Cutoff Rescue Campaign"
      : `Execute CMO Custom Directive: ${question.slice(0, 68)}`,
    tacticalExecution:
      "Target Ontario parents of Grade 11/12 university-bound students worried about OUAC prerequisites (where an 85%+ in MCR3U, MHF4U, and MCV4U is required for Engineering, CS, and Business programs). Pair a 2-step low-friction diagnostic form with a live Socratic AI step-by-step hint preview.",
    deliverableSpec:
      "CRO Landing Page Hero + 2-Step Diagnostic Funnel ('Rescue Your Teen's MCR3U / MHF4U Mark Before OUAC Transmission')",
    marketTrigger:
      "Ontario Midterm Report Card & OUAC University Prerequisite anxiety window",
    courseCodesTargeted: ["MCR3U", "MHF4U", "MCV4U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Landing Page",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Lift landing page Visitor-to-Diagnostic conversion rate from 4.2% to 7.5%+",
    status: "Queued",
    adjustedByCmo: true,
    cmoAdjustmentNote: `Added via CMO Q&A: "${question.slice(0, 60)}"`,
  };

  const act2: PlannedActivity = {
    id: `plan-cmo-${nowId}-2`,
    horizon: targetHorizon,
    timeWindow: `${targetHorizon} Priority #2 (CMO Adjusted)`,
    title: "Trigger 3-Part Post-Diagnostic Parent Close Sequence (Human Manager + Socratic AI Proof)",
    tacticalExecution:
      "Send automated 3-part email & SMS follow-up within 5 minutes of diagnostic booking containing a 60-second side-by-side clip of Socratic AI vs. ChatGPT on an MCR3U quadratic optimization problem.",
    deliverableSpec:
      "3-Touch Parent Conversion Email Sequence with Course-Code Personalization",
    marketTrigger: "Reduce diagnostic no-show rate and lift post-consult enrollment close rate",
    courseCodesTargeted: ["MTH1W", "MCR3U", "MHF4U"],
    assignedAgentId: "agent-lifecycle",
    skillName: "copywriting",
    targetPlatform: "Email Sequence",
    funnelObjective: "Conversion Optimization",
    targetKpi: "Increase Diagnostic Show-Up Rate to 84%+ and Paid Close Rate to 42%+",
    status: "Queued",
    adjustedByCmo: true,
    cmoAdjustmentNote: `Added via CMO Q&A: "${question.slice(0, 60)}"`,
  };

  return {
    horizonAffected: targetHorizon,
    strategistAnswer: `**CMO Strategic Re-Calibration (${targetHorizon} Plan Updated):**\n1. **Direct Response to Your Directive:** To maximize qualified Ontario parent lead generation and conversion without wasting ad spend, we must tighten the handoff between *high-anxiety course triggers* (\`MCR3U\`, \`MHF4U\`, \`MCV4U\`, \`MTH1W\`) and our *20-Minute Free Diagnostic*.\n2. **Multi-Agent Tasks Injected into ${targetHorizon} Plan:**\n   • **Agent-04 (CRO & Funnel Agent):** Deployed a 2-step university-prerequisite rescue landing flow.\n   • **Agent-05 (Lifecycle & Close Agent):** Deployed an immediate post-booking 3-email parent proof sequence contrasting Socratic AI against answer-dumping chatbots.`,
    newActivities: [act1, act2],
    adjustmentSummary: [
      `Injected [${targetHorizon}] Task for Agent-04 (CRO): 2-Step Diagnostic Funnel for MCR3U/MHF4U/MCV4U`,
      `Injected [${targetHorizon}] Task for Agent-05 (Lifecycle): 3-Part Post-Diagnostic Parent Close Sequence`,
    ],
  };
}
