import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let targetUrl = (body.url || "").trim();
    if (!targetUrl) {
      return NextResponse.json(
        { ok: false, error: "Competitor URL is required." },
        { status: 400 }
      );
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    const parsed = new URL(targetUrl);
    const startTime = Date.now();

    let html = "";
    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MindLCMarketIntelAgent/2.0",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(9000),
      });
      html = await res.text();
    } catch (fetchErr: unknown) {
      const msg =
        fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      return NextResponse.json({
        ok: false,
        error: `Could not reach ${targetUrl} (${msg}). Ensure the URL is publicly accessible.`,
      });
    }

    const stripTags = (s: string) =>
      s
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const decode = (s: string) =>
      (s || "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .trim();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = decode(titleMatch ? titleMatch[1] : parsed.hostname);

    const metaDescMatch =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
      );
    const metaDescription = decode(metaDescMatch ? metaDescMatch[1] : "");

    const extractTagList = (tag: string) => {
      const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
      const out: string[] = [];
      let m;
      while ((m = regex.exec(html)) !== null) {
        const cleaned = decode(stripTags(m[1]));
        if (cleaned && cleaned.length > 3 && !out.includes(cleaned)) {
          out.push(cleaned);
        }
      }
      return out;
    };

    const h1s = extractTagList("h1");
    const h2s = extractTagList("h2").slice(0, 8);

    const plainText = decode(stripTags(html));
    const mentionsSocratic = /socratic/i.test(plainText);
    const mentionsLearningManager = /learning manager|accountability coach/i.test(
      plainText
    );
    const mentionsOntarioCodes =
      /\b(MTH1W|MPM2D|MCR3U|MHF4U|MCV4U|EQAO)\b/i.test(plainText);
    const priceMentions =
      plainText.match(/\$\d+(?:\.\d{2})?(?:\s*\/?\s*(?:hr|hour|mo|month|session|week))?/gi) ||
      [];

    const primaryHook = h1s[0] || title || parsed.hostname;
    const gapsDetected: string[] = [];

    if (!mentionsOntarioCodes) {
      gapsDetected.push(
        "Does not explicitly anchor copy on Ontario Ministry course codes (MTH1W, MCR3U, MHF4U, MCV4U) or EQAO."
      );
    }
    if (!mentionsSocratic) {
      gapsDetected.push(
        "Lacks explicit Socratic AI guardrail messaging (leaves parent objection 'Will AI just give my kid the answers?' unresolved)."
      );
    }
    if (!mentionsLearningManager) {
      gapsDetected.push(
        "No dedicated Human Learning Manager accountability loop mentioned between study sessions."
      );
    }
    if (gapsDetected.length === 0) {
      gapsDetected.push(
        "Generic tutoring value proposition without contrasting weekly human accountability + 24/7 Socratic guided math hints."
      );
    }

    return NextResponse.json({
      ok: true,
      url: targetUrl,
      hostname: parsed.hostname.replace(/^www\./, ""),
      responseTimeMs: Date.now() - startTime,
      extracted: {
        title,
        metaDescription:
          metaDescription || plainText.slice(0, 200) + "...",
        primaryH1: primaryHook,
        h2Headings: h2s,
        priceSignals: [...new Set(priceMentions)].slice(0, 5),
        mentionsOntarioCodes,
        mentionsSocratic,
        mentionsLearningManager,
      },
      gapsDetected,
      counterStrategy: {
        battlecardHeadline: `Why Ontario Parents Choose MindLC Over ${parsed.hostname.replace(/^www\./, "")}`,
        wedgeAngle: `While ${parsed.hostname.replace(/^www\./, "")} focuses on "${primaryHook.slice(0, 70)}", it misses the two things Ontario Grades 7–12 families actually need: (1) a dedicated Human Learning Manager who holds unmotivated teens accountable every week, and (2) 24/7 Socratic AI tuned to MTH1W, MCR3U, MHF4U & MCV4U that guides students step-by-step at 9:45 PM without ever giving away the answer.`,
        recommendedAgentTask: `Deploy Agent-02 (AI-SEO) & Agent-03 (Paid Social) to publish a comparison guide and parent ad contrasting "${primaryHook.slice(0, 50)}" against MindLC's Human Learning Manager + 24/7 Socratic AI model.`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Failed to analyze competitor URL",
      },
      { status: 500 }
    );
  }
}
