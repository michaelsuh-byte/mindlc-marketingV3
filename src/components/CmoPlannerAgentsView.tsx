"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { Asset, PlanHorizon, TierId } from "@/types/database";
import {
  ChannelAwareDraftRenderer,
  stripMarkdownToCleanText,
} from "@/components/ChannelAwareDraftRenderer";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Play,
  Sparkles,
  MessageSquarePlus,
  Send,
  Target,
  Zap,
  ArrowUpRight,
  Layers,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  FileText,
} from "lucide-react";

const HORIZONS: {
  id: PlanHorizon;
  label: string;
  sub: string;
}[] = [
  { id: "Daily", label: "Daily Plan", sub: "Today's high-intent execution" },
  { id: "Weekly", label: "Weekly Sprint", sub: "5-day lead & conversion sprint" },
  { id: "Monthly", label: "Monthly Roadmap", sub: "30-day funnel & upgrades" },
  { id: "Quarterly", label: "Quarterly OKRs", sub: "90-day course checklists & referrals" },
  { id: "Annual", label: "Annual 4-Peak Cycle", sub: "Full Ontario academic year" },
];

const CMO_QUICK_QUESTIONS = [
  "Midterm report cards just dropped in GTA boards — shift our Daily plan to Grade 11 Functions (MCR3U) rescue.",
  "Prioritize Grade 9 De-Streamed Math (MTH1W) & EQAO readiness leads under $24 CPL.",
  "How should we counter Kumon and Mathnasium worksheet fatigue in our Weekly plan?",
  "Our diagnostic booking rate needs a boost — add a CRO + Lifecycle follow-up play.",
];

export function CmoPlannerAgentsView() {
  const {
    activeHorizon,
    setActiveHorizon,
    agents,
    plannedActivities,
    planQaHistory,
    runningActivityId,
    isRunningTeamSprint,
    isAskingPlannerQa,
    dispatchAgentForActivity,
    runAutonomousTeamSprint,
    askCmoPlannerQuestion,
    reassignActivityAgent,
    setActiveTab,
    setActiveTierId,
    setSelectedProposalId,
    tierWorkspaces,
    approveAndLockProposal,
    toggleCmoChecklistItem,
  } = useMarketingStore();

  const [cmoQuestionInput, setCmoQuestionInput] = useState("");
  const [expandedAssetIds, setExpandedAssetIds] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const horizonActivities = plannedActivities.filter(
    (a) => a.horizon === activeHorizon
  );
  const queuedCount = horizonActivities.filter(
    (a) => a.status === "Queued"
  ).length;
  const completedCount = horizonActivities.filter(
    (a) => a.status === "Completed"
  ).length;

  // Helper to locate a generated Asset across any of the 3 Tier Workspaces
  const findGeneratedAsset = (assetId?: string): Asset | undefined => {
    if (!assetId) return undefined;
    for (const tid of ["TIER_1", "TIER_2", "TIER_3"] as TierId[]) {
      const found = tierWorkspaces[tid].proposals.find((p) => p.id === assetId);
      if (found) return found;
    }
    return undefined;
  };

  const handleAskCmoQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmoQuestionInput.trim() || isAskingPlannerQa) return;
    const q = cmoQuestionInput.trim();
    setCmoQuestionInput("");
    await askCmoPlannerQuestion(q);
  };

  const handleCopyInlineAsset = async (asset: Asset) => {
    const cleanText = stripMarkdownToCleanText(asset.content);
    const cta = asset.proposal_schema?.single_cta
      ? `\n\n${stripMarkdownToCleanText(asset.proposal_schema.single_cta)}`
      : "";
    await navigator.clipboard.writeText(`${cleanText}${cta}`.trim());
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleQuickApproveFromPlanner = (asset: Asset) => {
    const targetTier = asset.tier_id || "TIER_2";
    setActiveTierId(targetTier);
    // Ensure all 3 checklist items are marked true if not already, then lock
    const chk = asset.cmo_checklist || {
      ontario_context: false,
      single_cta: false,
      brand_trust: false,
    };
    if (!chk.ontario_context) {
      toggleCmoChecklistItem(asset.id, "ontario_context");
    }
    if (!chk.single_cta) {
      toggleCmoChecklistItem(asset.id, "single_cta");
    }
    if (!chk.brand_trust) {
      toggleCmoChecklistItem(asset.id, "brand_trust");
    }
    approveAndLockProposal(asset.id);
    // Return user right back to planner tab so they don't lose their place!
    setActiveTab("planner");
  };

  const handleOpenInCampaignsTab = (asset: Asset) => {
    const targetTier = asset.tier_id || "TIER_2";
    setActiveTierId(targetTier);
    setSelectedProposalId(asset.id);
    setActiveTab("copilot");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            <Bot className="w-4 h-4" />
            Step 2 of Workflow · Plan &amp; Dispatch Specialist Agents
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            CMO Multi-Horizon Planner &amp; Autonomous Agent Team
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl mt-1">
            Review Daily, Weekly, Monthly, Quarterly, and Annual execution
            plans. Dispatch any specialist agent below and inspect, copy, or
            approve the generated draft summary right inside this card—without
            having to switch back and forth between tabs.
          </p>
        </div>

        <button
          onClick={() => runAutonomousTeamSprint(activeHorizon)}
          disabled={isRunningTeamSprint || queuedCount === 0}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition shrink-0"
        >
          {isRunningTeamSprint ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Agents Executing {activeHorizon} Sprint...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Autonomous {activeHorizon} Agent Sprint ({queuedCount} Queued)
            </>
          )}
        </button>
      </div>

      {/* =====================================================================
          SECTION 1: 5-AGENT MARKETING TEAM ROSTER
          ===================================================================== */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Autonomous Marketing Team (5 Specialist Agents)
            </span>
            <h2 className="text-lg font-bold">
              Task-Specialized Agent Roster &amp; Conversion KPI Ownership
            </h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Generated Drafts Appear Inline Below &amp; Sync to Campaigns &amp;
            Tiers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {agents.map((ag) => {
            const isBusy = ag.status === "Executing Task";
            const assignedCount = plannedActivities.filter(
              (a) => a.assignedAgentId === ag.id
            ).length;

            return (
              <div
                key={ag.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  isBusy
                    ? "bg-teal-950/80 border-teal-400 ring-2 ring-teal-400/30"
                    : "bg-slate-800/80 border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-teal-300">
                      {ag.codeName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBusy
                          ? "bg-amber-400 text-slate-950 animate-pulse"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {ag.status}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-white leading-snug">
                    {ag.roleTitle}
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {ag.specialty}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-700/80 space-y-1 text-[11px]">
                  <div className="text-slate-400">
                    Owned KPI:{" "}
                    <strong className="text-slate-200">
                      {ag.conversionMetricOwned}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-teal-300 font-semibold pt-1">
                    <span>{assignedCount} Planned Tasks</span>
                    <span>{ag.tasksCompletedCount} Shipped</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: INTERACTIVE CMO STRATEGY Q&A & PLAN RE-CALIBRATOR
          ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Interactive CMO Plan Q&amp;A &amp; Dynamic Re-Calibration
              </h2>
              <p className="text-xs text-slate-500">
                Ask questions, challenge assumptions, or issue new directives —
                the system answers and dynamically updates your{" "}
                <strong>Daily, Weekly, Monthly, Quarterly, or Annual</strong>{" "}
                agent tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Scenario Chips */}
        <div className="flex flex-wrap gap-2">
          {CMO_QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => askCmoPlannerQuestion(q)}
              disabled={isAskingPlannerQa}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-700 border border-slate-200 transition"
            >
              💡 {q}
            </button>
          ))}
        </div>

        {/* Question Form */}
        <form onSubmit={handleAskCmoQuestion} className="flex gap-2.5">
          <input
            type="text"
            value={cmoQuestionInput}
            onChange={(e) => setCmoQuestionInput(e.target.value)}
            placeholder="Ask a strategic question or adjust the plan (e.g., 'Shift our Weekly plan to counter Kumon for Grade 9 EQAO parents')..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={isAskingPlannerQa || !cmoQuestionInput.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm transition shrink-0"
          >
            <Send className="w-4 h-4 text-teal-400" />
            {isAskingPlannerQa ? "Re-Calibrating Plan..." : "Ask & Adjust Plan"}
          </button>
        </form>

        {/* Latest Q&A Exchange History */}
        {planQaHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            {planQaHistory.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">
                    CMO Query: &ldquo;{item.cmoQuestion}&rdquo;
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    Adjusted: {item.horizonAffected} Plan · {item.timestamp}
                  </span>
                </div>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {stripMarkdownToCleanText(item.strategistAnswer)}
                </p>
                {item.planAdjustmentsMade.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.planAdjustmentsMade.map((adj, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]"
                      >
                        ✓ {adj}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          SECTION 3: 5-HORIZON TACTICAL OPERATING PLAN WITH INLINE DRAFT SUMMARY
          ===================================================================== */}
      <div className="space-y-5">
        {/* Horizon Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap gap-2">
            {HORIZONS.map((h) => {
              const isSelected = activeHorizon === h.id;
              const count = plannedActivities.filter(
                (a) => a.horizon === h.id
              ).length;
              return (
                <button
                  key={h.id}
                  onClick={() => setActiveHorizon(h.id)}
                  className={`px-4 py-2.5 rounded-xl text-left transition border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-teal-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarClock
                      className={`w-4 h-4 ${
                        isSelected ? "text-teal-400" : "text-teal-600"
                      }`}
                    />
                    <span className="font-bold text-sm">{h.label}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-teal-500/20 text-teal-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isSelected ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {h.sub}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-slate-500">
            <span className="text-emerald-700 font-bold">
              {completedCount} Completed
            </span>{" "}
            · {queuedCount} Queued in {activeHorizon} Plan
          </div>
        </div>

        {/* Planned Activity Cards */}
        <div className="space-y-4">
          {horizonActivities.map((act) => {
            const assignedAgent =
              agents.find((ag) => ag.id === act.assignedAgentId) || agents[0];
            const isRunning = runningActivityId === act.id;
            const isDone = act.status === "Completed";
            const generatedAsset = findGeneratedAsset(act.outputAssetId);
            const isFullDraftExpanded = Boolean(expandedAssetIds[act.id]);
            const isAssetApproved =
              generatedAsset?.hitl_state === "APPROVED_FOR_EXECUTION" ||
              generatedAsset?.hitl_state === "VALIDATED_WINNER";

            return (
              <div
                key={act.id}
                className={`bg-white rounded-2xl border p-6 shadow-xs transition ${
                  isDone
                    ? "border-emerald-300 bg-emerald-50/15"
                    : act.adjustedByCmo
                    ? "border-teal-500 ring-1 ring-teal-500/20"
                    : "border-slate-200"
                }`}
              >
                {/* Top Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 text-white">
                      {act.timeWindow}
                    </span>
                    {act.tier_id && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {tierWorkspaces[act.tier_id].tier_short_name} ($
                        {
                          tierWorkspaces[act.tier_id].pricing_config
                            .base_monthly_cad
                        }
                        /mo)
                      </span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      {act.funnelObjective}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Channel: {act.targetPlatform}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {act.courseCodesTargeted.map((code) => (
                      <span
                        key={code}
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Activity Title & Detailed Step-by-Step Execution Guide */}
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                  {act.title}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                  <div className="lg:col-span-8 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Step-by-Step Execution Guide (Who, What &amp; Closing
                      Offer):
                    </div>
                    <div className="text-slate-700 leading-relaxed text-xs whitespace-pre-line">
                      {act.tacticalExecution}
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/70 text-slate-600">
                      <strong className="text-slate-900">
                        Deliverable Produced by Agent:
                      </strong>{" "}
                      {act.deliverableSpec}
                    </div>
                  </div>

                  <div className="lg:col-span-4 p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 flex flex-col justify-between space-y-2">
                    <div className="space-y-2">
                      <div className="font-bold text-teal-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Why Now &amp; Target KPI
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        <strong>Why Now:</strong> {act.marketTrigger}
                      </p>
                      <p className="text-teal-900 font-bold leading-relaxed">
                        <strong>Success Target:</strong> {act.targetKpi}
                      </p>
                    </div>

                    {act.cmoAdjustmentNote && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        {act.cmoAdjustmentNote}
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* INLINE GENERATED DELIVERABLE SUMMARY & FULL PREVIEW CARD  */}
                {/* Eliminates tab ping-pong — review, copy, or approve here! */}
                {/* ========================================================= */}
                {isDone && generatedAsset && (
                  <div className="mt-4 rounded-2xl border border-emerald-300 bg-white shadow-xs overflow-hidden">
                    {/* Summary Header Bar */}
                    <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Generated Deliverable Summary</span>
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {stripMarkdownToCleanText(
                            generatedAsset.title || act.title
                          )}
                        </span>
                        {isAssetApproved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            ✓ Approved &amp; Locked
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1-Click Copy Clean Text Right Here */}
                        <button
                          type="button"
                          onClick={() => handleCopyInlineAsset(generatedAsset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs"
                        >
                          {copiedId === generatedAsset.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">
                                Copied Clean Text!
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Clean Text</span>
                            </>
                          )}
                        </button>

                        {/* 1-Click Quick Approve Right Here in Planner */}
                        {!isAssetApproved && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickApproveFromPlanner(generatedAsset)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Quick Approve Here</span>
                          </button>
                        )}

                        {/* Toggle Full Formatted Preview Inline */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAssetIds((prev) => ({
                              ...prev,
                              [act.id]: !prev[act.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            {isFullDraftExpanded
                              ? "Hide Full Script"
                              : "Read Full Script Inline"}
                          </span>
                          {isFullDraftExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Concise Executive Summary (Always visible when completed so user immediately understands what was generated) */}
                    <div className="p-4 bg-white space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Box 1: Core Message Preview */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Executive Copy Preview
                          </div>
                          <p className="text-slate-800 line-clamp-3 leading-relaxed">
                            {stripMarkdownToCleanText(generatedAsset.content)}
                          </p>
                        </div>

                        {/* Box 2: Single CTA & Cited Parent Quote */}
                        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            Single Next Action (CTA)
                          </div>
                          <p className="font-semibold text-slate-900 leading-snug">
                            {stripMarkdownToCleanText(
                              generatedAsset.proposal_schema?.single_cta ||
                                "Complete enrollment action"
                            )}
                          </p>
                          {generatedAsset.proposal_schema?.cited_voc_quotes?.[0] && (
                            <p className="text-[11px] text-slate-500 truncate pt-1">
                              Addresses:{" "}
                              {
                                generatedAsset.proposal_schema
                                  .cited_voc_quotes[0]
                              }
                            </p>
                          )}
                        </div>

                        {/* Box 3: Devil's Advocate Risk & Stop-Loss */}
                        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Key Risk &amp; Stop-Loss</span>
                          </div>
                          <p className="text-slate-700 line-clamp-2 leading-snug">
                            {generatedAsset.proposal_schema?.devils_advocate
                              ?.primary_failure_hypothesis ||
                              "Guard against generic sales tone."}
                          </p>
                          <p className="text-[11px] font-semibold text-rose-700 pt-0.5 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              Stop-Loss:{" "}
                              {generatedAsset.proposal_schema?.kill_criteria
                                ?.stop_loss_metric || "< Target conversion"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Expandable Full Channel-Aware Draft Preview (Right Inside CMO Planner!) */}
                      {isFullDraftExpanded && (
                        <div className="mt-3 pt-4 border-t border-slate-200">
                          <ChannelAwareDraftRenderer
                            content={generatedAsset.content}
                            title={generatedAsset.title || act.title}
                            channel={
                              generatedAsset.proposal_schema?.channel ||
                              generatedAsset.platform
                            }
                            tierName={
                              tierWorkspaces[generatedAsset.tier_id || "TIER_2"]
                                .tier_name
                            }
                            singleCta={
                              generatedAsset.proposal_schema?.single_cta
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Action & Agent Assignment Bar */}
                <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      Assigned Marketing Agent:
                    </span>
                    <select
                      value={act.assignedAgentId}
                      onChange={(e) =>
                        reassignActivityAgent(act.id, e.target.value)
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          🤖 {ag.codeName} — {ag.roleTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {isDone && generatedAsset && (
                      <button
                        onClick={() => handleOpenInCampaignsTab(generatedAsset)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition"
                        title="Open in Campaigns & Tiers only if you want conversational AI refinement"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Refine in Campaigns &amp; Tiers</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => dispatchAgentForActivity(act.id)}
                      disabled={isRunning}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        isDone
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          : "bg-slate-900 hover:bg-teal-600 text-white shadow-xs"
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          {assignedAgent.codeName} Generating Deliverable...
                        </>
                      ) : isDone ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Re-Run {assignedAgent.codeName}
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Dispatch {assignedAgent.codeName} &amp; Show Summary
                          Here →
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
