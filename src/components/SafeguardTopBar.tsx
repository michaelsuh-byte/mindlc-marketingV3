"use client";

import React, { useEffect, useState } from "react";
import { useMarketingStore, NavigationTab } from "@/store/useMarketingStore";
import { computeFunnelRates } from "@/services/marketingAi";
import {
  StageId,
  TierId,
  VerbatimParentQuote,
  VoCTierTag,
  WeeklyFunnelMetrics,
} from "@/types/database";
import {
  Target,
  MessageSquareQuote,
  X,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Plus,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Compass,
  Lock,
  Unlock,
} from "lucide-react";

const TIER_TAB_ITEMS: {
  id: TierId;
  shortLabel: string;
}[] = [
  { id: "TIER_1", shortLabel: "Tier 1 · Online" },
  { id: "TIER_2", shortLabel: "Tier 2 · Managed" },
  { id: "TIER_3", shortLabel: "Tier 3 · Prime 1:1" },
];

const STAGE_ORDER: StageId[] = ["STAGE_1", "STAGE_2", "STAGE_3"];

const TAG_BADGE_STYLES: Record<VerbatimParentQuote["context_tag"], string> = {
  ai_cheating: "bg-rose-50 text-rose-700 border-rose-200",
  curriculum: "bg-indigo-50 text-indigo-700 border-indigo-200",
  price: "bg-amber-50 text-amber-800 border-amber-200",
  trust: "bg-emerald-50 text-emerald-700 border-emerald-200",
  student_motivation: "bg-purple-50 text-purple-700 border-purple-200",
};

export function SafeguardTopBar() {
  const {
    activeTab,
    setActiveTab,
    activeTierId,
    tierWorkspaces,
    setActiveTierId,
    setPaidStudentCount,
    setActiveStageOverride,
    updateTierStageGoal,
    vocVault,
    realityGateStatus,
    isStageFunnelModalOpen,
    isRealityGateModalOpen,
    isVocVaultOpen,
    setStageFunnelModalOpen,
    setRealityGateModalOpen,
    setVocVaultOpen,
    closeAllOverlays,
    submitWeeklyRealityLog,
    activatePilotWeek0Override,
    toggleRealityGateLockSimulation,
    sendCopilotCommand,
  } = useMarketingStore();

  const activeTier = tierWorkspaces[activeTierId];
  const [step1Label, step2Label, step3Label, step4Label] =
    activeTier.funnel_labels;

  const latestLog = activeTier.weekly_reality_logs[0];
  const funnelMetrics: WeeklyFunnelMetrics = latestLog?.funnel_metrics ?? {
    reach_or_contacts: 0,
    diag_booked: 0,
    diag_completed: 0,
    paid_conversions: 0,
  };
  const funnelRates = computeFunnelRates(funnelMetrics);

  // Stage & Funnel Modal state
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  // Reality Gate Form state
  const [weekStartDate, setWeekStartDate] = useState(
    latestLog?.week_start_date || new Date().toISOString().slice(0, 10)
  );
  const [reachOrContacts, setReachOrContacts] = useState(
    funnelMetrics.reach_or_contacts
  );
  const [diagBooked, setDiagBooked] = useState(funnelMetrics.diag_booked);
  const [diagCompleted, setDiagCompleted] = useState(
    funnelMetrics.diag_completed
  );
  const [paidConversions, setPaidConversions] = useState(
    funnelMetrics.paid_conversions
  );
  const [topWinningTouchpoint, setTopWinningTouchpoint] = useState(
    latestLog?.top_winning_touchpoint || ""
  );
  const [alsoUnlockAllTiers, setAlsoUnlockAllTiers] = useState(true);
  const [quotes, setQuotes] = useState<
    {
      quote_text: string;
      context_tag: VerbatimParentQuote["context_tag"];
      tier_id: VoCTierTag;
    }[]
  >([
    {
      quote_text:
        latestLog?.verbatim_parent_quotes[0]?.quote_text ||
        "My child finishes homework with ChatGPT in 5 minutes and then blanks out on closed-book Ontario unit tests.",
      context_tag:
        latestLog?.verbatim_parent_quotes[0]?.context_tag || "ai_cheating",
      tier_id: activeTierId,
    },
    {
      quote_text:
        latestLog?.verbatim_parent_quotes[1]?.quote_text ||
        "Her teacher marks Ontario K/T/C/A Thinking & Application rubrics strictly—generic tutoring sheets don't match.",
      context_tag:
        latestLog?.verbatim_parent_quotes[1]?.context_tag || "curriculum",
      tier_id: activeTierId,
    },
  ]);
  const [gateError, setGateError] = useState<string | null>(null);

  // VoC Drawer filter state
  const [vocFilterTier, setVocFilterTier] = useState<VoCTierTag | "SHOW_ALL">(
    "SHOW_ALL"
  );
  const [vocFilterTag, setVocFilterTag] = useState<
    VerbatimParentQuote["context_tag"] | "ALL_TAGS"
  >("ALL_TAGS");
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [showUtilityMenu, setShowUtilityMenu] = useState(false);

  // Sync Reality Gate form when switching tiers
  useEffect(() => {
    const log = tierWorkspaces[activeTierId].weekly_reality_logs[0];
    if (log) {
      setWeekStartDate(log.week_start_date);
      setReachOrContacts(log.funnel_metrics.reach_or_contacts);
      setDiagBooked(log.funnel_metrics.diag_booked);
      setDiagCompleted(log.funnel_metrics.diag_completed);
      setPaidConversions(log.funnel_metrics.paid_conversions);
      setTopWinningTouchpoint(log.top_winning_touchpoint);
      if (log.verbatim_parent_quotes.length >= 2) {
        setQuotes(
          log.verbatim_parent_quotes.map((q) => ({
            quote_text: q.quote_text,
            context_tag: q.context_tag,
            tier_id: q.tier_id || activeTierId,
          }))
        );
      }
    }
  }, [activeTierId, tierWorkspaces]);

  // Global ESC key closes any open modal or slide-over drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllOverlays();
        setShowUtilityMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAllOverlays]);

  const handleRealityGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validQuotes = quotes.filter((q) => q.quote_text.trim().length >= 10);
    if (validQuotes.length < 2) {
      setGateError(
        "Please enter at least 2 verbatim parent quotes (min 10 characters each) heard this week."
      );
      return;
    }
    if (!topWinningTouchpoint.trim()) {
      setGateError(
        "Please specify the top winning channel or conversation touchpoint from this week."
      );
      return;
    }
    setGateError(null);
    submitWeeklyRealityLog({
      week_start_date: weekStartDate,
      funnel_metrics: {
        reach_or_contacts: Number(reachOrContacts) || 0,
        diag_booked: Number(diagBooked) || 0,
        diag_completed: Number(diagCompleted) || 0,
        paid_conversions: Number(paidConversions) || 0,
      },
      verbatim_parent_quotes: validQuotes,
      top_winning_touchpoint: topWinningTouchpoint.trim(),
      alsoUnlockTiers: alsoUnlockAllTiers
        ? (["TIER_1", "TIER_2", "TIER_3"] as TierId[])
        : [],
    });
  };

  const activeStageNumber =
    activeTier.active_stage === "STAGE_1"
      ? "Stage 1"
      : activeTier.active_stage === "STAGE_2"
      ? "Stage 2"
      : "Stage 3";

  const filteredVocQuotes = vocVault.filter((q) => {
    const tierMatch =
      vocFilterTier === "SHOW_ALL"
        ? true
        : q.tier_id === vocFilterTier || q.tier_id === "ALL";
    const tagMatch =
      vocFilterTag === "ALL_TAGS" ? true : q.context_tag === vocFilterTag;
    return tierMatch && tagMatch;
  });

  // Compute weakest step among the 3 conversion rates for the 4-Step Mini-Funnel
  const stepRates = [
    {
      index: 0,
      label: `${step1Label} → ${step2Label}`,
      rate: funnelRates.contactToBookedPct,
    },
    {
      index: 1,
      label: `${step2Label} → ${step3Label}`,
      rate: funnelRates.bookedToCompletedPct,
    },
    {
      index: 2,
      label: `${step3Label} → ${step4Label}`,
      rate: funnelRates.completedToPaidPct,
    },
  ];
  const weakestRateObj = [...stepRates].sort((a, b) => a.rate - b.rate)[0];

  return (
    <>
      {/* ===================================================================== */}
      {/* 1. ULTRA-MINIMAL TOP BAR (Height ~60px — Zero Metric Clutter)          */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-30 h-[60px] bg-white border-b border-slate-200 px-5 flex items-center justify-between select-none">
        {/* LEFT SIDE: Brand Mark + 3 Product Tier Tabs (Segmented Control) */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("copilot")}
            className="flex items-center gap-2 text-left group focus:outline-none"
            title="Return to Focused Proposal Canvas"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-tight">
              M
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900 hidden sm:inline">
              MindLC
            </span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          {/* 3 Product Tier Tabs (Segmented Control) */}
          <nav
            aria-label="Product Tier Workspaces"
            className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80"
          >
            {TIER_TAB_ITEMS.map((item) => {
              const ws = tierWorkspaces[item.id];
              const isSelected = activeTierId === item.id;
              const stageTarget =
                ws.stage_goals[ws.active_stage].target_paid_count;
              const countPill = `${ws.current_paid_count}/${stageTarget}`;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTierId(item.id);
                    if (activeTab !== "copilot") {
                      setActiveTab("copilot");
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/90 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{item.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {countPill}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* RIGHT SIDE: 3 Compact On-Demand Trigger Buttons (Click to Reveal) */}
        <div className="flex items-center gap-2">
          {/* 1. [🎯 Stage X · Goals] */}
          <button
            onClick={() => setStageFunnelModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
            title="View & Edit Stage 1/2/3 Roadmap and 4-Step Mini-Funnel"
          >
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-800">
              {activeStageNumber}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">Goals</span>
          </button>

          {/* 2. [● Reality Gate] */}
          <button
            onClick={() => setRealityGateModalOpen(true)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-2xs ${
              realityGateStatus === "LOCKED"
                ? "bg-amber-50/90 hover:bg-amber-100/80 text-amber-900 border-amber-300"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
            title="Open 60-Second Weekly Reality Gate Check"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                realityGateStatus === "LOCKED"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            <span>Reality Gate</span>
          </button>

          {/* 3. [💬 VoC Vault] */}
          <button
            onClick={() => setVocVaultOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
            title="Open Verbatim Parent Quote (VoC) Slide-Over Vault"
          >
            <MessageSquareQuote className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">VoC Vault</span>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
              {vocVault.length}
            </span>
          </button>

          {/* Secondary More Views Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowUtilityMenu((prev) => !prev)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                activeTab !== "copilot" || showUtilityMenu
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 hover:text-slate-800 border-slate-200"
              }`}
              title="More Strategic Views (Planner, Market Intel, Brand Persona)"
            >
              <Compass className="w-4 h-4" />
            </button>

            {showUtilityMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Workspace Views
                </div>
                {(
                  [
                    { id: "copilot", label: "📄 Proposal Focus Canvas" },
                    { id: "planner", label: "🗓️ Multi-Horizon CMO Planner" },
                    { id: "intel", label: "🔭 Ontario Market & Competitors" },
                    { id: "skills", label: "⚡ AI Playbook Skills" },
                    { id: "settings", label: "🛡️ Brand Guardrails" },
                  ] as { id: NavigationTab; label: string }[]
                ).map((nav) => (
                  <button
                    key={nav.id}
                    onClick={() => {
                      setActiveTab(nav.id);
                      setShowUtilityMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between ${
                      activeTab === nav.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{nav.label}</span>
                    {activeTab === nav.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. ON-DEMAND MODAL A: STAGE & FUNNEL MODAL (`[🎯 Stage X · Goals]`)   */}
      {/* ===================================================================== */}
      {isStageFunnelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setStageFunnelModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {activeTier.tier_name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeTier.price_label}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-900 mt-1">
                  3-Stage Growth Roadmap &amp; Conversion Funnel Telemetry
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Quick simulation control for active paid students in this tier */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500">Current Paid:</span>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={activeTier.current_paid_count}
                    onChange={(e) =>
                      setPaidStudentCount(
                        Math.max(0, parseInt(e.target.value || "0", 10))
                      )
                    }
                    className="w-14 font-mono font-semibold text-slate-900 border border-slate-200 rounded px-1.5 py-0.5 text-center"
                  />
                </div>

                {/* Edit Goals Toggle */}
                <button
                  onClick={() => setIsEditingGoals((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isEditingGoals
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingGoals ? "Done Editing" : "Edit Goals"}</span>
                </button>

                <button
                  onClick={() => setStageFunnelModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* 3-STAGE ROADMAP (3 Horizontal Cards for Stage 1, Stage 2, Stage 3) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Stage 1 / 2 / 3 Strategic Guardrails ({activeTier.tier_name})
                  </span>
                  <span className="text-xs text-slate-500">
                    Click any stage card to set it as the active stage filter
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {STAGE_ORDER.map((stageId, idx) => {
                    const goal = activeTier.stage_goals[stageId];
                    const isActiveStage = activeTier.active_stage === stageId;

                    return (
                      <div
                        key={stageId}
                        onClick={() => {
                          if (!isEditingGoals) {
                            setActiveStageOverride(stageId);
                          }
                        }}
                        className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                          isActiveStage
                            ? "border-indigo-600 bg-indigo-50/25 ring-2 ring-indigo-600/15"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        } ${!isEditingGoals ? "cursor-pointer" : ""}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isActiveStage
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              Stage {idx + 1} · {goal.min_paid}–{goal.max_paid}{" "}
                              paid
                            </span>
                            {isActiveStage && (
                              <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active Stage
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {goal.stage_title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {goal.secondary_kpi_summary}
                            </p>
                          </div>

                          {isEditingGoals ? (
                            <div
                              className="space-y-2 pt-2 border-t border-slate-200/80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500">
                                  Milestone Student Cap
                                </label>
                                <input
                                  type="number"
                                  value={goal.target_paid_count}
                                  onChange={(e) =>
                                    updateTierStageGoal(activeTierId, stageId, {
                                      target_paid_count:
                                        parseInt(e.target.value || "1", 10) ||
                                        1,
                                    })
                                  }
                                  className="mt-0.5 w-full text-xs font-mono border border-slate-300 rounded px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-slate-500">
                                  Primary Goal Metric
                                </label>
                                <input
                                  type="text"
                                  value={goal.primary_kpi_name}
                                  onChange={(e) =>
                                    updateTierStageGoal(activeTierId, stageId, {
                                      primary_kpi_name: e.target.value,
                                    })
                                  }
                                  className="mt-0.5 w-full text-xs border border-slate-300 rounded px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-emerald-700">
                                  Allowed Scope (comma-separated)
                                </label>
                                <textarea
                                  rows={2}
                                  value={goal.allowed_scope.join(", ")}
                                  onChange={(e) =>
                                    updateTierStageGoal(activeTierId, stageId, {
                                      allowed_scope: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  className="mt-0.5 w-full text-xs border border-slate-300 rounded px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase text-rose-700">
                                  Blocked Scope (comma-separated)
                                </label>
                                <textarea
                                  rows={2}
                                  value={goal.blocked_scope.join(", ")}
                                  onChange={(e) =>
                                    updateTierStageGoal(activeTierId, stageId, {
                                      blocked_scope: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  className="mt-0.5 w-full text-xs border border-slate-300 rounded px-2 py-1"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                                <div className="text-[10px] font-semibold uppercase text-slate-400">
                                  Primary Goal Metric
                                </div>
                                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                                  {goal.primary_kpi_name} (Target ≥{" "}
                                  {goal.primary_kpi_target_pct}%)
                                </div>
                              </div>

                              <div className="space-y-1.5 text-xs">
                                <div>
                                  <span className="font-semibold text-emerald-700">
                                    Allowed:{" "}
                                  </span>
                                  <span className="text-slate-600">
                                    {goal.allowed_scope.join(" · ")}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold text-rose-700">
                                    Blocked:{" "}
                                  </span>
                                  <span className="text-slate-500">
                                    {goal.blocked_scope.join(" · ")}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4-STEP MINI-FUNNEL FOR THIS TIER (Directly beneath the 3 Stage Cards) */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      4-Step Mini-Funnel ({activeTier.tier_name})
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ground-truth conversion telemetry from the latest Weekly
                      Reality Log ({latestLog?.week_start_date || "No log"})
                    </p>
                  </div>

                  {weakestRateObj && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Weakest Conversion Link:{" "}
                        <strong>{weakestRateObj.label}</strong> (
                        {weakestRateObj.rate}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Step 1 */}
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5">
                    <div className="text-[11px] text-slate-500 font-medium">
                      1. {step1Label}
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {funnelMetrics.reach_or_contacts}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Top-of-funnel volume
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    className={`rounded-lg border p-3.5 ${
                      weakestRateObj?.index === 0
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        2. {step2Label}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          weakestRateObj?.index === 0
                            ? "bg-amber-200/80 text-amber-950"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {funnelRates.contactToBookedPct}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {funnelMetrics.diag_booked}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Conversion from Step 1
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    className={`rounded-lg border p-3.5 ${
                      weakestRateObj?.index === 1
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        3. {step3Label}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          weakestRateObj?.index === 1
                            ? "bg-amber-200/80 text-amber-950"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {funnelRates.bookedToCompletedPct}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {funnelMetrics.diag_completed}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Show-up / completion rate
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div
                    className={`rounded-lg border p-3.5 ${
                      weakestRateObj?.index === 2
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        4. {step4Label}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          weakestRateObj?.index === 2
                            ? "bg-amber-200/80 text-amber-950"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {funnelRates.completedToPaidPct}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {funnelMetrics.paid_conversions}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Diagnostic-to-Paid close
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ON-DEMAND MODAL B: 60-SECOND REALITY GATE MODAL (`[● Reality Gate]`)*/}
      {/* ===================================================================== */}
      {isRealityGateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setRealityGateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    realityGateStatus === "LOCKED"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    60-Second Weekly Reality Gate ({activeTier.tier_name})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ground-truth numbers + 2 verbatim parent quotes required to
                    unlock AI proposal generation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRealityGateLockSimulation}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  title="Simulate Lock / Unlock state for testing"
                >
                  {realityGateStatus === "LOCKED" ? (
                    <>
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Status: Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-emerald-600" />
                      <span>Status: Current</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setRealityGateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleRealityGateSubmit} className="p-6 space-y-5">
              {gateError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {gateError}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Week Of
                  </label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 truncate">
                    1. {step1Label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={reachOrContacts}
                    onChange={(e) =>
                      setReachOrContacts(parseInt(e.target.value || "0", 10))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 truncate">
                    2. {step2Label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={diagBooked}
                    onChange={(e) =>
                      setDiagBooked(parseInt(e.target.value || "0", 10))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 truncate">
                    3. {step3Label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={diagCompleted}
                    onChange={(e) =>
                      setDiagCompleted(parseInt(e.target.value || "0", 10))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 truncate">
                    4. {step4Label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={paidConversions}
                    onChange={(e) =>
                      setPaidConversions(parseInt(e.target.value || "0", 10))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Verbatim Parent Quotes (Minimum 2) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Verbatim Parent Quotes Heard This Week (Min 2 Exact Quotes)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setQuotes((prev) => [
                        ...prev,
                        {
                          quote_text: "",
                          context_tag: "trust",
                          tier_id: activeTierId,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Quote</span>
                  </button>
                </div>

                {quotes.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Parent Quote #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.tier_id}
                          onChange={(e) => {
                            const updated = [...quotes];
                            updated[idx].tier_id = e.target
                              .value as VoCTierTag;
                            setQuotes(updated);
                          }}
                          className="text-[11px] border border-slate-300 rounded px-2 py-0.5 bg-white"
                        >
                          <option value="TIER_1">Tier 1 · Online</option>
                          <option value="TIER_2">Tier 2 · Managed</option>
                          <option value="TIER_3">Tier 3 · Prime 1:1</option>
                          <option value="ALL">All Tiers</option>
                        </select>
                        <select
                          value={q.context_tag}
                          onChange={(e) => {
                            const updated = [...quotes];
                            updated[idx].context_tag = e.target
                              .value as VerbatimParentQuote["context_tag"];
                            setQuotes(updated);
                          }}
                          className="text-[11px] border border-slate-300 rounded px-2 py-0.5 bg-white"
                        >
                          <option value="ai_cheating">ai_cheating</option>
                          <option value="curriculum">curriculum</option>
                          <option value="price">price</option>
                          <option value="trust">trust</option>
                          <option value="student_motivation">
                            student_motivation
                          </option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={q.quote_text}
                      onChange={(e) => {
                        const updated = [...quotes];
                        updated[idx].quote_text = e.target.value;
                        setQuotes(updated);
                      }}
                      placeholder="Paste exact words a parent said on a call, DM, or email..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Top Winning Channel / Touchpoint This Week
                </label>
                <input
                  type="text"
                  value={topWinningTouchpoint}
                  onChange={(e) => setTopWinningTouchpoint(e.target.value)}
                  placeholder="e.g., 15-min post-diagnostic parent debrief call showing K/T/C/A rubric gaps"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoUnlockAllTiers}
                    onChange={(e) => setAlsoUnlockAllTiers(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Sync VoC quotes across all 3 Tiers</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={activatePilotWeek0Override}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200"
                  >
                    Load Sample Baseline (Week 0)
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    Save &amp; Unlock Generation
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. ON-DEMAND DRAWER C: VoC VAULT RIGHT SLIDE-OVER (`[💬 VoC Vault]`)  */}
      {/* ===================================================================== */}
      {isVocVaultOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-[1px] flex justify-end"
          onClick={() => setVocVaultOpen(false)}
        >
          <aside
            className="w-full max-w-[420px] bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                  <span>Verbatim Parent Quote Vault (VoC)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exact parent objections logged across weekly Reality Gates
                </p>
              </div>
              <button
                onClick={() => setVocVaultOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: "SHOW_ALL", label: "All Tiers" },
                    { id: "TIER_1", label: "Tier 1" },
                    { id: "TIER_2", label: "Tier 2" },
                    { id: "TIER_3", label: "Tier 3" },
                  ] as { id: VoCTierTag | "SHOW_ALL"; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setVocFilterTier(t.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      vocFilterTier === t.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    "ALL_TAGS",
                    "ai_cheating",
                    "curriculum",
                    "price",
                    "trust",
                    "student_motivation",
                  ] as const
                ).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setVocFilterTag(tag)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                      vocFilterTag === tag
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tag === "ALL_TAGS" ? "all_tags" : `#${tag}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quote Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredVocQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {q.id}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          TAG_BADGE_STYLES[q.context_tag]
                        }`}
                      >
                        #{q.context_tag}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {q.tier_id}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed italic">
                    &ldquo;{q.quote_text}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(q.quote_text);
                        setCopiedQuoteId(q.id);
                        setTimeout(() => setCopiedQuoteId(null), 1500);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                    >
                      {copiedQuoteId === q.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Quote</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setVocVaultOpen(false);
                        setActiveTab("copilot");
                        sendCopilotCommand(
                          `Incorporate verbatim parent quote [${q.id}] ("${q.quote_text}") directly into the hook and objection handling of this proposal.`
                        );
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Cite in Active Draft</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {filteredVocQuotes.length} of {vocVault.length} parent
                quotes
              </span>
              <button
                onClick={() => {
                  setVocVaultOpen(false);
                  setRealityGateModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Quotes</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
