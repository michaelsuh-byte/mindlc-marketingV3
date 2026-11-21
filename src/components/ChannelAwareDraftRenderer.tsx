"use client";

import React from "react";
import { Mail, PhoneCall, MessageCircle, Sparkles, ArrowRight } from "lucide-react";

/**
 * Programmatically strip all raw Markdown symbols (`###`, `**`, `*`, `__`, `---`, backticks, `>`)
 * while preserving clean paragraph breaks and converting bullet lists to clean `• ` lines.
 */
export function stripMarkdownToCleanText(raw: string): string {
  if (!raw) return "";

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip horizontal divider lines (---, ***, ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      continue;
    }

    // Strip blockquote markers (`> `)
    line = line.replace(/^>\s*/, "");

    // Convert Markdown headings (`# `, `## `, `### `) into clean title lines without `#`
    line = line.replace(/^#{1,6}\s+/, "");

    // Convert unordered list bullets (`- `, `* `, `+ `) into clean `• ` lines
    if (/^[-*+]\s+/.test(line)) {
      line = line.replace(/^[-*+]\s+/, "• ");
    }

    // Strip inline bold/italic/code markers (`**text**`, `__text__`, `*text*`, `_text_`, `` `text` ``)
    line = line
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/(^|\s)_([^_\n]+)_(\s|$)/g, "$1$2$3")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

    // Remove stray residual `**` or `###` if unbalanced
    line = line.replace(/\*\*/g, "").replace(/^#{1,6}\s*/g, "");

    cleanedLines.push(line);
  }

  // Collapse 3+ consecutive blank lines into a clean double newline paragraph break
  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Escape HTML special characters before building formatted clipboard HTML
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert inline markdown (`**bold**`, `*italic*`, `` `code` ``) to clean HTML tags
 * with zero raw symbols remaining.
 */
function formatInlineHtml(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Strip any leftover raw `**`
  out = out.replace(/\*\*/g, "");
  return out;
}

/**
 * Convert a proposal draft into clean semantic HTML for `Copy Formatted`
 * (pastes cleanly into Gmail, Google Docs, Notion, and Word with zero raw `###` or `**`).
 */
export function convertDraftToCleanHtml(
  raw: string,
  singleCta?: string
): string {
  if (!raw) return "";

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.7; font-size: 15px;">`,
  ];

  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      htmlParts.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlParts.push("</ol>");
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeLists();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      closeLists();
      htmlParts.push(
        `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />`
      );
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      const cleanHeading = formatInlineHtml(
        headingMatch[2].replace(/^\[|\]$/g, "")
      );
      const fontSize = level === 1 ? "18px" : level === 2 ? "16px" : "15px";
      htmlParts.push(
        `<h${level} style="font-size: ${fontSize}; font-weight: 600; color: #0f172a; margin: 18px 0 8px 0;">${cleanHeading}</h${level}>`
      );
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      closeLists();
      const quoteBody = formatInlineHtml(line.replace(/^>\s*/, ""));
      htmlParts.push(
        `<blockquote style="margin: 14px 0; padding: 10px 14px; border-left: 3px solid #6366f1; background-color: #f8fafc; color: #334155;">${quoteBody}</blockquote>`
      );
      continue;
    }

    // Unordered list item (`- `, `* `, `• `)
    if (/^([-*•])\s+/.test(line)) {
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push(
          `<ul style="margin: 10px 0 14px 20px; padding: 0; list-style-type: disc;">`
        );
        inUl = true;
      }
      const itemText = formatInlineHtml(line.replace(/^([-*•])\s+/, ""));
      htmlParts.push(`<li style="margin-bottom: 6px;">${itemText}</li>`);
      continue;
    }

    // Ordered list item (`1. `, `2. `)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push(
          `<ol style="margin: 10px 0 14px 20px; padding: 0;">`
        );
        inOl = true;
      }
      htmlParts.push(
        `<li style="margin-bottom: 6px;">${formatInlineHtml(olMatch[2])}</li>`
      );
      continue;
    }

    // Standard paragraph
    closeLists();
    htmlParts.push(
      `<p style="margin: 0 0 14px 0;">${formatInlineHtml(line)}</p>`
    );
  }

  closeLists();

  if (singleCta) {
    htmlParts.push(
      `<p style="margin: 18px 0 0 0; font-weight: 600; color: #312e81;">Next Step: ${escapeHtml(
        stripMarkdownToCleanText(singleCta)
      )}</p>`
    );
  }

  htmlParts.push("</div>");
  return htmlParts.join("\n");
}

/**
 * Render inline text as React nodes with bold, italic, and code styling,
 * stripping all raw `**`, `*`, and backtick characters from screen.
 */
function renderCleanInlineNodes(text: string): React.ReactNode {
  if (!text) return null;
  // Clean any leading/trailing raw hash symbols
  const cleaned = text.replace(/^#{1,6}\s+/, "");

  // Tokenize by **bold**, *italic*, or `code`
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|_[a-zA-Z0-9][^_\n]*_|\*[^*\n]+\*|`[^`]+`)/g;
  const parts = cleaned.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      const inner = part.slice(1, -1).replace(/^\*|\*$/g, "");
      return (
        <em key={idx} className="italic text-slate-700">
          {inner}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <span
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[13px]"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    // Strip any stray unbalanced `**` or `###`
    return (
      <React.Fragment key={idx}>
        {part.replace(/\*\*/g, "").replace(/#{2,}/g, "")}
      </React.Fragment>
    );
  });
}

// Structured block parsed from a draft for clean editorial rendering
interface ParsedDraftBlock {
  type: "heading" | "paragraph" | "blockquote" | "ul" | "ol" | "divider";
  text?: string;
  items?: string[];
  level?: number;
}

function parseDraftBlocks(rawContent: string): {
  subjectLine: string | null;
  blocks: ParsedDraftBlock[];
} {
  const lines = (rawContent || "").replace(/\r\n/g, "\n").split("\n");
  let subjectLine: string | null = null;
  const blocks: ParsedDraftBlock[] = [];

  let currentUl: string[] = [];
  let currentOl: string[] = [];
  let currentQuote: string[] = [];

  const flushOpenGroups = () => {
    if (currentQuote.length > 0) {
      blocks.push({
        type: "blockquote",
        text: currentQuote.join(" "),
      });
      currentQuote = [];
    }
    if (currentUl.length > 0) {
      blocks.push({
        type: "ul",
        items: [...currentUl],
      });
      currentUl = [];
    }
    if (currentOl.length > 0) {
      blocks.push({
        type: "ol",
        items: [...currentOl],
      });
      currentOl = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushOpenGroups();
      continue;
    }

    // Horizontal rule (`---`, `***`)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushOpenGroups();
      blocks.push({ type: "divider" });
      continue;
    }

    // Detect Email Subject Line (`**Subject:** ...` or `Subject: ...`)
    const subjectMatch = line.match(
      /^(?:\*\*Subject(?:\s+Line)?:\*\*|Subject(?:\s+Line)?:\s*\*\*|\*\*Subject\*\*:|Subject(?:\s+Line)?:)\s*(.+)$/i
    );
    if (subjectMatch && !subjectLine) {
      flushOpenGroups();
      subjectLine = stripMarkdownToCleanText(subjectMatch[1]);
      continue;
    }

    // Heading (`#`, `##`, `###`, `####`)
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushOpenGroups();
      const rawHeading = headingMatch[2]
        .replace(/^\[|\]$/g, "")
        .replace(/\*\*/g, "")
        .trim();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: rawHeading,
      });
      continue;
    }

    // Blockquote (`> ...`)
    if (line.startsWith(">")) {
      if (currentUl.length > 0 || currentOl.length > 0) flushOpenGroups();
      const cleanedQuoteLine = line
        .replace(/^>\s*/, "")
        .replace(/^\*"|"\*$/g, '"')
        .replace(/^\*|\*$/g, "");
      if (cleanedQuoteLine) {
        currentQuote.push(cleanedQuoteLine);
      }
      continue;
    }

    // Unordered list (`- `, `* `, `• `)
    if (/^([-*•])\s+/.test(line)) {
      if (currentQuote.length > 0 || currentOl.length > 0) flushOpenGroups();
      currentUl.push(line.replace(/^([-*•])\s+/, ""));
      continue;
    }

    // Ordered list (`1. `, `2. `)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (currentQuote.length > 0 || currentUl.length > 0) flushOpenGroups();
      currentOl.push(olMatch[2]);
      continue;
    }

    // Normal paragraph
    flushOpenGroups();
    blocks.push({
      type: "paragraph",
      text: line,
    });
  }

  flushOpenGroups();
  return { subjectLine, blocks };
}

function renderBlockList(blocks: ParsedDraftBlock[]) {
  return blocks.map((block, idx) => {
    if (block.type === "divider") {
      return <hr key={idx} className="my-5 border-t border-slate-100" />;
    }

    if (block.type === "heading") {
      const isTopHeading = (block.level || 2) <= 2;
      return (
        <h3
          key={idx}
          className={`${
            isTopHeading
              ? "text-[16px] font-semibold text-slate-900 mt-5 mb-2"
              : "text-[14.5px] font-semibold text-slate-800 mt-4 mb-1.5"
          } tracking-tight`}
        >
          {renderCleanInlineNodes(block.text || "")}
        </h3>
      );
    }

    if (block.type === "blockquote") {
      return (
        <div
          key={idx}
          className="my-4 pl-4 pr-4 py-3.5 rounded-r-xl border-l-[3px] border-indigo-500 bg-slate-50/90 text-[14.5px] leading-[1.7] text-slate-700"
        >
          {renderCleanInlineNodes(block.text || "")}
        </div>
      );
    }

    if (block.type === "ul") {
      return (
        <ul key={idx} className="my-3.5 space-y-2.5 pl-1">
          {(block.items || []).map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] leading-[1.7] text-slate-800"
            >
              <span className="text-indigo-500 font-bold select-none mt-[1px]">
                •
              </span>
              <span className="flex-1">{renderCleanInlineNodes(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (block.type === "ol") {
      return (
        <ol key={idx} className="my-3.5 space-y-2.5 pl-1">
          {(block.items || []).map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] leading-[1.7] text-slate-800"
            >
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0 mt-1">
                {i + 1}
              </span>
              <span className="flex-1">{renderCleanInlineNodes(item)}</span>
            </li>
          ))}
        </ol>
      );
    }

    return (
      <p
        key={idx}
        className="text-[15px] leading-[1.72] text-slate-800 mb-4 last:mb-0"
      >
        {renderCleanInlineNodes(block.text || "")}
      </p>
    );
  });
}

export type ChannelLayoutMode = "email" | "call_script" | "social" | "editorial";

export function detectChannelLayoutMode(
  channelOrPlatform: string
): ChannelLayoutMode {
  const lower = (channelOrPlatform || "").toLowerCase();
  if (lower.includes("email") || lower.includes("newsletter")) {
    return "email";
  }
  if (
    lower.includes("call") ||
    lower.includes("consult") ||
    lower.includes("debrief") ||
    lower.includes("script")
  ) {
    return "call_script";
  }
  if (
    lower.includes("community") ||
    lower.includes("social") ||
    lower.includes("facebook") ||
    lower.includes("sms")
  ) {
    return "social";
  }
  return "editorial";
}

interface ChannelAwareDraftRendererProps {
  content: string;
  title: string;
  channel: string;
  tierName: string;
  singleCta?: string;
}

export function ChannelAwareDraftRenderer({
  content,
  title,
  channel,
  tierName,
  singleCta,
}: ChannelAwareDraftRendererProps) {
  const mode = detectChannelLayoutMode(channel);
  const { subjectLine, blocks } = parseDraftBlocks(content);

  // =========================================================================
  // 1. EMAIL / NEWSLETTER PREVIEW FRAME
  // =========================================================================
  if (mode === "email") {
    const effectiveSubject =
      subjectLine || stripMarkdownToCleanText(title);

    return (
      <div className="space-y-4">
        {/* Email Envelope Metadata Header Bar */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>Email Preview · {tierName}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Ontario Parent Outreach
            </span>
          </div>
          <div className="pt-1.5 border-t border-slate-200/80 flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
              Subject
            </span>
            <span className="text-[15px] font-semibold text-slate-900">
              {effectiveSubject}
            </span>
          </div>
        </div>

        {/* Clean Readable Email Body */}
        <div className="px-2 pt-2 pb-1">{renderBlockList(blocks)}</div>

        {/* Styled Preview Pill for Single CTA */}
        {singleCta && (
          <div className="pt-4 border-t border-slate-100">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-2xs">
              <span>{stripMarkdownToCleanText(singleCta)}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. PARENT CALL / CONSULTATION SCRIPT LAYOUT (Step Cards with Left Accents)
  // =========================================================================
  if (mode === "call_script") {
    // Group blocks into logical call sections whenever a heading appears
    const sections: { heading: string; sectionBlocks: ParsedDraftBlock[] }[] =
      [];
    let currentSection: {
      heading: string;
      sectionBlocks: ParsedDraftBlock[];
    } | null = null;

    const defaultStepTitles = [
      "Opening & Diagnostic Screen-Share",
      "Key Socratic & K/T/C/A Insight",
      "Objection Bridge & Accountability",
      "Single Low-Friction Close",
    ];

    for (const b of blocks) {
      if (b.type === "divider") continue;
      if (b.type === "heading") {
        if (currentSection && currentSection.sectionBlocks.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: b.text || defaultStepTitles[sections.length] || "Call Step",
          sectionBlocks: [],
        };
      } else {
        if (!currentSection) {
          currentSection = {
            heading: defaultStepTitles[0],
            sectionBlocks: [],
          };
        }
        currentSection.sectionBlocks.push(b);
      }
    }
    if (currentSection && currentSection.sectionBlocks.length > 0) {
      sections.push(currentSection);
    }

    const accentBorders = [
      "border-l-indigo-500",
      "border-l-emerald-500",
      "border-l-amber-500",
      "border-l-sky-500",
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            <span>Live Call / Consultation Guide · {tierName}</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Scannable step cards for live parent conversation
          </span>
        </div>

        <div className="space-y-3.5">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className={`rounded-xl border border-slate-200 border-l-4 ${
                accentBorders[idx % accentBorders.length]
              } bg-white p-5 shadow-2xs`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {renderCleanInlineNodes(sec.heading)}
              </div>
              <div>{renderBlockList(sec.sectionBlocks)}</div>
            </div>
          ))}
        </div>

        {singleCta && (
          <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/80 p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Call Close Action (Single CTA)
              </div>
              <div className="text-xs font-semibold text-slate-900">
                {stripMarkdownToCleanText(singleCta)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. SOCIAL / COMMUNITY / SMS POST CARD (Natural Conversational Flow)
  // =========================================================================
  if (mode === "social") {
    // Filter out heavy report-style headings so community posts read like a real person
    const conversationalBlocks = blocks.map((b) =>
      b.type === "heading"
        ? ({ type: "paragraph", text: b.text } as ParsedDraftBlock)
        : b
    );

    return (
      <div className="max-w-[640px] mx-auto rounded-2xl border border-slate-200 bg-slate-50/40 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              M
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">
                MindLC Ontario STEM Team
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <MessageCircle className="w-3 h-3 text-indigo-600" />
                <span>{channel} · Clean Community Post</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          {renderBlockList(conversationalBlocks)}

          {singleCta && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{stripMarkdownToCleanText(singleCta)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. EDITORIAL / UX COPY LAYOUT (Default Clean Typography)
  // =========================================================================
  return (
    <div className="space-y-4">
      <div>{renderBlockList(blocks)}</div>
      {singleCta && (
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900">
            <span>Single CTA: {stripMarkdownToCleanText(singleCta)}</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}
