"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { DetailLevel } from "@/types/database";
import {
  Send,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Quote,
  Skull,
  ShieldAlert,
  GitCompare,
  Download,
  Lock,
  Sparkles,
  XCircle,
} from "lucide-react";

const QUICK_STEER_CHIPS = [
  {
    label: "Soften sales tone",
    prompt:
      "Tone is too salesy for Mississauga & Oakville parent groups—make it sound like a calm Ontario STEM teacher sharing a K/T/C/A diagnostic checklist.",
  },
  {
    label: "Sharpen Ontario K/T/C/A angle",
    prompt:
      "Sharpen the Ontario Ministry K/T/C/A Achievement Chart breakdown (Knowledge vs. Thinking & Application) for Grade 11/12 MHF4U and SBI3U unit tests.",
  },
  {
    label: "Challenge my assumption",
    prompt:
      "Challenge my primary conversion assumption on this proposal—what is the biggest Devil's Advocate blind spot that could cause Ontario parents to hesitate?",
  },
];

const DETAIL_LEVELS: { level: DetailLevel; label: string }[] = [
  { level: 1, label: "Lvl 1 · Fast" },
  { level: 2, label: "Lvl 2 · Rationale" },
  { level: 3, label: "Lvl 3 · Mentor" },
];

export function CampaignCoPilotView() {
  const {
    assets,
    selectedProposalId,
    skills,
    selectedSkillId,
    detailLevel,
    chatMessages,
    isGenerating,
    lastHighlightedAssetId,
    activeBottleneckStage,
    setSelectedSkillId,
    setDetailLevel,
    setRealityGateModalOpen,
    sendCopilotCommand,
    updateAssetContent,
    toggleCmoChecklistItem,
    approveAndLockProposal,
    rejectOrKillProposal,
  } = useMarketingStore();

  const activeProposal =
    assets.find((a) => a.id === selectedProposalId) || assets[0] || null;

  const versions = activeProposal?.versions || [];
  const latestVersionNum =
    versions.length > 0
      ? versions[versions.length - 1].version
      : activeProposal?.revision_count || 1;

  const [selectedVerNum, setSelectedVerNum] = useState<number>(latestVersionNum);
  const [showDiff, setShowDiff] = useState(false);
  const [flashHighlight, setFlashHighlight] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync selected version number when activeProposal or its versions update
  useEffect(() => {
    const vList = activeProposal?.versions || [];
    const maxV =
      vList.length > 0
        ? vList[vList.length - 1].version
        : activeProposal?.revision_count || 1;
    setSelectedVerNum(maxV);
    setIsRejecting(false);
    setRejectReason("");
  }, [activeProposal?.id, activeProposal?.versions?.length, activeProposal?.revision_count]);

  // Flash-highlight the Left Pane Asset Canvas whenever AI updates the proposal
  useEffect(() => {
    if (lastHighlightedAssetId && lastHighlightedAssetId === activeProposal?.id) {
      setFlashHighlight(true);
      const t = setTimeout(() => setFlashHighlight(false), 1800);
      return () => clearTimeout(t);
    }
  }, [lastHighlightedAssetId, activeProposal?.updated_at, activeProposal?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  const handleSendRefinement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isGenerating) return;
    const text = commandInput.trim();
    setCommandInput("");
    await sendCopilotCommand(text, false, false);
  };

  const handleQuickSteer = async (promptText: string) => {
    if (isGenerating) return;
    await sendCopilotCommand(promptText, false, false);
  };

  const handleCopyMarkdown = () => {
    if (!activeProposal) return;
    navigator.clipboard.writeText(activeProposal.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    if (!activeProposal) return;
    const blob = new Blob([activeProposal.content], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProposal.proposal_schema?.proposal_id || "mindlc-proposal"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmRejectOrKill = (
    targetState: "ARCHIVED" | "KILLED_BY_STOP_LOSS"
  ) => {
    if (!activeProposal) return;
    rejectOrKillProposal(
      activeProposal.id,
      rejectReason ||
        "Killed by Acting CMO during 30-second risk & brand trust review.",
      targetState
    );
    setIsRejecting(false);
    setRejectReason("");
  };

  // Empty State / First-Time Onboarding
  if (!activeProposal) {
    return (
      <div className="h-[calc(100vh-72px)] flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-extrabold text-slate-900">
              Welcome to the MindLC Executive CMO Cockpit
            </h2>
            <p className="text-xs text-slate-500">
              Follow the 3-step loop to acquire our first 100 paid Ontario
              Grades 9–12 STEM students ($139 CAD/month):
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 text-left text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900">
                1. Log Market Reality (60s):
              </strong>{" "}
              Enter weekly funnel numbers and 2 verbatim parent objections.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900">
                2. Refine AI Drafts with Risk Checks:
              </strong>{" "}
              Review Devil&apos;s Advocate failure hypotheses and pre-committed
              Kill Criteria.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900">
                3. Approve via 30s Checklist:
              </strong>{" "}
              Verify Ontario K/T/C/A context, Single CTA, and Brand Trust to
              lock the asset.
            </div>
          </div>
          <button
            onClick={() => setRealityGateModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
          >
            Start Step 1: Log Weekly Market Reality →
          </button>
        </div>
      </div>
    );
  }

  const ps = activeProposal.proposal_schema;
  const hitlState = activeProposal.hitl_state || "DRAFT";
  const checklist = activeProposal.cmo_checklist || {
    ontario_context: false,
    single_cta: false,
    brand_trust: false,
  };
  const checkedCount = [
    checklist.ontario_context,
    checklist.single_cta,
    checklist.brand_trust,
  ].filter(Boolean).length;
  const allThreeChecked = checkedCount === 3;

  const activeVersionSnapshot =
    versions.find((v) => v.version === selectedVerNum) ||
    versions[versions.length - 1];
  const prevVersionSnapshot =
    versions.find((v) => v.version === selectedVerNum - 1) || versions[0];

  const displayedContent =
    selectedVerNum === latestVersionNum
      ? activeProposal.content
      : activeVersionSnapshot?.content || activeProposal.content;

  return (
    <div className="h-[calc(100vh-72px)] grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
      {/* =====================================================================
          LEVEL 3 — LEFT PANE (60% -> 7 of 12 cols):
          THE PROPOSAL ARTIFACT & CRITICAL GUARDRAILS
          ===================================================================== */}
      <section className="lg:col-span-7 flex flex-col border-r border-slate-200 bg-slate-50/60 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-4xl mx-auto w-full">
          {/* Stop-Loss / Rejection Banner if Killed or Archived */}
          {(hitlState === "KILLED_BY_STOP_LOSS" ||
            hitlState === "ARCHIVED") && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                hitlState === "KILLED_BY_STOP_LOSS"
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-slate-100 border-slate-300 text-slate-800"
              }`}
            >
              <div className="space-y-1">
                <div className="font-extrabold uppercase tracking-wider text-[11px]">
                  {hitlState === "KILLED_BY_STOP_LOSS"
                    ? "🔴 Kill-Criteria Stop-Loss Breached — Immediate Pivot Required"
                    : "⚪ Archived / Killed Proposal (Institutional Learning Log)"}
                </div>
                <p className="font-medium leading-relaxed">
                  {activeProposal.kill_or_reject_reason ||
                    ps?.revision_notes ||
                    "Flagged during review."}
                </p>
              </div>
            </div>
          )}

          {/* 1. HEADER BAR: Proposal Title, Target Metric Pill, Single CTA Pill, Version Selector & Diff Switch */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {ps?.proposal_id || activeProposal.id}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 tabular-nums">
                  Target: {ps?.target_metric || "Diag → Paid ≥ 25%"}
                </span>
                {hitlState === "APPROVED_FOR_EXECUTION" && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✓ Approved &amp; Locked
                  </span>
                )}
              </div>

              {/* Version Selector (v1, v2, v3) + Toggleable Show Changes Diff Switch */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {(versions.length > 0
                    ? versions
                    : [{ version: 1, content: activeProposal.content }]
                  ).map((v) => (
                    <button
                      key={v.version}
                      type="button"
                      onClick={() => setSelectedVerNum(v.version)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition ${
                        selectedVerNum === v.version
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      v{v.version}
                    </button>
                  ))}
                </div>

                {versions.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setShowDiff(!showDiff)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      showDiff
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    Show Changes Diff
                  </button>
                )}
              </div>
            </div>

            {/* Editable Proposal Title */}
            <input
              type="text"
              value={activeProposal.title || ps?.title || ""}
              onChange={(e) =>
                updateAssetContent(
                  activeProposal.id,
                  activeProposal.content,
                  e.target.value
                )
              }
              className="w-full text-lg font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-600 focus:outline-none pb-0.5"
            />

            {/* Prominent 1-Second Single CTA Pill */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                  Single CTA Focus (1 Clear Parent Action)
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  👉{" "}
                  {activeVersionSnapshot?.single_cta ||
                    ps?.single_cta ||
                    "Book 20-Minute Ontario K/T/C/A Diagnostic"}
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white text-indigo-800 border border-indigo-200 shrink-0">
                {ps?.channel || activeProposal.platform}
              </span>
            </div>
          </div>

          {/* 2. RENDERED ASSET CANVAS (With Flash-Highlight on Revision & Toggleable Version Diff) */}
          <div
            className={`bg-white rounded-2xl border transition-all duration-500 p-5 shadow-2xs space-y-3 ${
              flashHighlight
                ? "border-indigo-500 ring-4 ring-indigo-500/20 bg-indigo-50/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rendered Proposal Artifact (v{selectedVerNum})
                </span>
                {flashHighlight && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                    Updated via Co-Pilot
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    hitlState === "APPROVED_FOR_EXECUTION"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied Markdown
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>

            {showDiff && versions.length >= 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-rose-800 uppercase">
                    Previous Version (v{prevVersionSnapshot.version})
                  </div>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {prevVersionSnapshot.content}
                  </pre>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">
                    Current Version (v{activeVersionSnapshot.version}) —{" "}
                    {activeVersionSnapshot.change_summary}
                  </div>
                  <pre className="text-xs text-slate-900 whitespace-pre-wrap font-sans leading-relaxed">
                    {activeVersionSnapshot.content}
                  </pre>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="space-y-3 py-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="h-24 bg-slate-100 rounded-xl w-full" />
              </div>
            ) : (
              <textarea
                value={displayedContent}
                onChange={(e) =>
                  updateAssetContent(activeProposal.id, e.target.value)
                }
                rows={13}
                className="w-full text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl p-4 font-sans leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 resize-y"
              />
            )}
          </div>

          {/* 3. VOC GROUNDING STRIP (Exact Real Parent Quotes from Reality Gate) */}
          {ps?.cited_voc_quotes && ps.cited_voc_quotes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-indigo-600" />
                VoC Grounding Strip — Verbatim Parent Objections Answered:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {ps.cited_voc_quotes.map((quote, idx) => (
                  <blockquote
                    key={idx}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-50 border-l-4 border-l-indigo-600 border border-slate-200/80 text-xs text-slate-800 italic leading-relaxed"
                  >
                    {quote}
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* 4. MANDATORY RISK & STOP-LOSS CARD (Split 2-Column Callout Box — Never Hidden in Tabs) */}
          {ps && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Box (Amber Tint — Devil's Advocate) */}
              <div className="p-4 rounded-2xl bg-amber-50/75 border border-amber-300/90 space-y-2.5 text-xs">
                <div className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Devil&apos;s Advocate Risk Check
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    Primary Failure Hypothesis:
                  </span>
                  <p className="text-slate-800 leading-relaxed">
                    {ps.devils_advocate.primary_failure_hypothesis}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950">
                  <span className="text-[11px] font-extrabold block">
                    Blind-Spot Question for Acting CMO:
                  </span>
                  <p className="font-semibold mt-0.5 leading-snug">
                    &ldquo;{ps.devils_advocate.blind_spot_question}&rdquo;
                  </p>
                </div>
              </div>

              {/* Right Box (Rose Tint — Kill Criteria) */}
              <div className="p-4 rounded-2xl bg-rose-50/75 border border-rose-300/90 space-y-2.5 text-xs">
                <div className="font-extrabold text-rose-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Skull className="w-4 h-4 text-rose-600 shrink-0" />
                  Pre-Committed Kill Criteria &amp; Stop-Loss
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-slate-800">
                  <div>
                    <strong className="text-rose-950">Sample Threshold:</strong>{" "}
                    <span className="tabular-nums">
                      {ps.kill_criteria.sample_threshold}
                    </span>
                  </div>
                  <div>
                    <strong className="text-rose-950">
                      Stop-Loss Trigger:
                    </strong>{" "}
                    <span className="font-bold text-rose-900 tabular-nums">
                      {ps.kill_criteria.stop_loss_metric}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/90 border border-rose-200 text-slate-900">
                  <span className="text-[11px] font-extrabold text-rose-900 block">
                    Fallback Pivot Action (Execute Immediately if Breached):
                  </span>
                  <p className="mt-0.5 leading-snug">
                    {ps.kill_criteria.pivot_action}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          LEVEL 3 — RIGHT PANE (40% -> 5 of 12 cols):
          CONVERSATIONAL CO-PILOT & STICKY 30-SECOND APPROVAL DOCK
          ===================================================================== */}
      <section className="lg:col-span-5 flex flex-col bg-white h-full overflow-hidden">
        {/* Compact Chat Header with Skill & Detail Level Selector */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-white">
          <div>
            <div className="text-xs font-extrabold text-slate-900">
              Conversational Refinement Co-Pilot
            </div>
            <div className="text-[11px] text-slate-500">
              Steer tone, Ontario K/T/C/A depth &amp; stress-test assumptions
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-800"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  Skill: {s.skill_name}
                </option>
              ))}
            </select>

            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {DETAIL_LEVELS.map((d) => (
                <button
                  key={d.level}
                  type="button"
                  onClick={() => setDetailLevel(d.level)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    detailLevel === d.level
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 1. Refinement Chat Thread (Scrollable Top Section) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
          {chatMessages.map((msg) => {
            if (msg.sender === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] bg-slate-900 text-white rounded-2xl rounded-br-xs px-3.5 py-2.5 text-xs space-y-1">
                    <p className="leading-relaxed">{msg.userPrompt}</p>
                    <div className="text-[10px] text-slate-400 text-right tabular-nums">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            }

            if (msg.sender === "guardrail" && msg.scopeDriftWarning) {
              const sw = msg.scopeDriftWarning;
              return (
                <div
                  key={msg.id}
                  className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 space-y-2 text-xs"
                >
                  <div className="font-extrabold text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Scope Drift Blocked ({sw.activeStage})
                  </div>
                  <p className="text-rose-950">{sw.blockedReason}</p>
                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-rose-200">
                    {sw.bottleneckMathExplanation}
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() =>
                        sendCopilotCommand(sw.requestedCommand, true, true)
                      }
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px]"
                    >
                      Confirm Explicit Stage Override &amp; Draft Anyway
                    </button>
                  </div>
                </div>
              );
            }

            const sj = msg.strategicJustification;
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="w-full bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3.5 shadow-2xs space-y-2 text-xs">
                  {/* Concise Change Summary Pill */}
                  {msg.changeSummaryPill && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]">
                      <span>✨ {msg.changeSummaryPill}</span>
                    </div>
                  )}

                  {sj?.headlineSummary && (
                    <div className="font-bold text-slate-900 leading-snug">
                      {sj.headlineSummary}
                    </div>
                  )}

                  {sj?.rationaleBody && (
                    <div className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      {sj.rationaleBody}
                    </div>
                  )}

                  {sj?.mentorshipTakeaway && (
                    <div className="text-[11px] text-indigo-900 bg-indigo-50/50 px-3 py-2 rounded-lg border border-indigo-100">
                      <strong>Mentor Note:</strong> {sj.mentorshipTakeaway}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="bg-white border border-indigo-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-slate-600">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
              <span>
                Revising proposal artifact &amp; re-checking Ontario K/T/C/A +
                VoC alignment...
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 3 Quick-Steer Chips + Conversational Input Bar */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STEER_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isGenerating}
                onClick={() => handleQuickSteer(chip.prompt)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-200 text-slate-700 border border-slate-200 text-[11px] font-semibold transition"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendRefinement} className="flex gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Steer this draft (Enter to send)..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isGenerating || !commandInput.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Steer
            </button>
          </form>
        </div>

        {/* ===================================================================
            2. STICKY 30-SECOND CMO APPROVAL DOCK (Pinned Bottom Section)
            =================================================================== */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
              Sticky 30-Second CMO Approval Checklist
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                allThreeChecked
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              {checkedCount}/3 Verified
            </span>
          </div>

          {/* 3 Explicit Checkboxes */}
          <div className="space-y-1.5 text-xs">
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer border border-slate-700/80">
              <input
                type="checkbox"
                checked={checklist.ontario_context}
                onChange={() =>
                  toggleCmoChecklistItem(activeProposal.id, "ontario_context")
                }
                className="mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span>
                <strong className="text-white">Ontario Context:</strong>{" "}
                <span className="text-slate-300">
                  Speaks to real Ontario K/T/C/A, unit test, or anti-cheating
                  concerns.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer border border-slate-700/80">
              <input
                type="checkbox"
                checked={checklist.single_cta}
                onChange={() =>
                  toggleCmoChecklistItem(activeProposal.id, "single_cta")
                }
                className="mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span>
                <strong className="text-white">Single CTA:</strong>{" "}
                <span className="text-slate-300">
                  Asks the parent to take exactly one clear next step.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer border border-slate-700/80">
              <input
                type="checkbox"
                checked={checklist.brand_trust}
                onChange={() =>
                  toggleCmoChecklistItem(activeProposal.id, "brand_trust")
                }
                className="mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span>
                <strong className="text-white">Brand Trust:</strong>{" "}
                <span className="text-slate-300">
                  Zero hype or exaggerated grade guarantees.
                </span>
              </span>
            </label>
          </div>

          {/* 1-Line Reject / Kill Prompt Drawer */}
          {isRejecting && (
            <div className="p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/40 space-y-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="1-line reason saved to institutional learning log..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-rose-400/50 text-xs text-white"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-2.5 py-1 rounded text-[11px] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleConfirmRejectOrKill("KILLED_BY_STOP_LOSS")
                  }
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                >
                  Flag Stop-Loss Breached (🔴)
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRejectOrKill("ARCHIVED")}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold"
                >
                  Archive &amp; Log Reason (⚪)
                </button>
              </div>
            </div>
          )}

          {/* Action Row: Reject / Kill + Approve & Lock Asset */}
          <div className="flex items-center gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => setIsRejecting(!isRejecting)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-500/40 text-slate-300 border border-slate-700 text-xs font-bold transition shrink-0 flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Reject / Kill
            </button>

            <button
              type="button"
              disabled={!allThreeChecked}
              onClick={() => approveAndLockProposal(activeProposal.id)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                allThreeChecked
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              }`}
            >
              {allThreeChecked ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve &amp; Lock Asset
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Check 3/3 items to approve ({checkedCount}/3)
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
