import {
  AssetPlatform,
  BrandPersona,
  DetailLevel,
  MandatoryOutputProtocol,
  MarketingSkill,
} from "@/types/database";

export interface GenerateMarketingRequest {
  userCommand: string;
  selectedSkill: MarketingSkill;
  detailLevel: DetailLevel;
  brandPersona: BrandPersona;
  preferredPlatform?: AssetPlatform;
}

/**
 * Builds the exact system instruction for Google Gemini API (@google/genai)
 * enforcing the Mandatory Output Protocol.
 */
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
  if (lower.includes("facebook") || lower.includes("instagram") || lower.includes("social") || lower.includes("ad") || skillName === "social-content") {
    return "Facebook";
  }
  if (lower.includes("seo") || lower.includes("meta") || lower.includes("keyword") || lower.includes("perplexity") || lower.includes("chatgpt") || skillName === "ai-seo") {
    return "SEO Meta";
  }
  if (lower.includes("blog") || lower.includes("article") || lower.includes("guide")) {
    return "Blog";
  }
  if (lower.includes("email") || lower.includes("sequence") || lower.includes("drip")) {
    return "Email Sequence";
  }
  return "Landing Page";
}

/**
 * Mocked Google Gemini API service implementing the Mandatory Output Protocol.
 * Structured for drop-in replacement with `new GoogleGenAI({ apiKey }).models.generateContent(...)`.
 */
export async function generateMarketingResponse(
  req: GenerateMarketingRequest
): Promise<MandatoryOutputProtocol> {
  const { userCommand, selectedSkill, detailLevel, brandPersona, preferredPlatform } = req;

  // Simulate realistic Gemini API streaming/inference latency
  await new Promise((resolve) => setTimeout(resolve, 650));

  const platform = inferPlatformFromCommand(
    userCommand,
    selectedSkill.skill_name,
    preferredPlatform
  );

  // Extract topic focus from user prompt (e.g., Grade 9 EQAO, MCR3U Functions, Calculus, etc.)
  const lowerCmd = userCommand.toLowerCase();
  const gradeFocus = lowerCmd.includes("eqao") || lowerCmd.includes("grade 9") || lowerCmd.includes("mth1w")
    ? "Grade 9 De-Streamed Math (MTH1W) & EQAO Prep"
    : lowerCmd.includes("11") || lowerCmd.includes("functions") || lowerCmd.includes("mcr3u")
    ? "Grade 11 University Functions (MCR3U)"
    : lowerCmd.includes("12") || lowerCmd.includes("calculus") || lowerCmd.includes("mhf4u") || lowerCmd.includes("mcv4u")
    ? "Grade 12 Advanced Functions (MHF4U) & Calculus (MCV4U)"
    : "Ontario Grades 7–12 Math (EQAO, Functions & Calculus)";

  // =========================================================================
  // PART 1: STRICTLY SEPARATED MARKETING CONTENT (Left Pane: Asset Canvas)
  // =========================================================================
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
• URL Slug: /ontario-math-tutoring/${gradeFocus.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
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
    // Default: High-Converting Landing Page Copy
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

  // =========================================================================
  // PART 2: STRICTLY SEPARATED STRATEGIC JUSTIFICATION (Right Pane: Chat Feed)
  // Calibrated to Detail Level 1, 2, or 3
  // =========================================================================
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
