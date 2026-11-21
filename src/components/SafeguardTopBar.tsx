"use client";

import React, { useState, useEffect } from "react";
import { useMarketingStore, NavigationTab } from "@/store/useMarketingStore";
import {
  BOTTLENECK_STAGE_CONFIGS,
  computeFunnelRates,
} from "@/services/marketingAi";
import { VoCContextTag } from "@/types/database";
import {
  Lock,
  Unlock,
  ChevronDown,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  GraduationCap,
  Layers,
  Bot,
  Radar,
  BookOpen,
  Sliders,
} from "lucide-react";

const CONTEXT_TAGS: { id: VoCContextTag; label: string }[] = [
  { id: "trust", label: "Trust" },
  { id: "ai_cheating", label: "AI Cheating" },
  { id: "price", label: "Price" },
  { id: "curriculum", label: "Curriculum" },
  { id: "student_motivation", label: "Student Motivation" },
];

export function SafeguardTopBar() {
  const {
    activeTab,
    setActiveTab,
    realityGateStatus,
    pilotWeek0Used,
    weeklyRealityLogs,
    isRealityGateModalOpen,
    isSampleSeedActive,
    diagnosticToast,
    paidStudentCount,
    activeBottleneckStage,
    setRealityGateModalOpen,
    toggleRealityGateLockSimulation,
    submitWeeklyRealityLog,
    activatePilotWeek0Override,
    setPaidStudentCount,
    clearDiagnosticToast,
  } = useMarketingStore();

  const [isBottleneckPopoverOpen, setIsBottleneckPopoverOpen] = useState(false);

  const latestLog = weeklyRealityLogs[0];
  const metrics = latestLog?.funnel_metrics || {
    reach_or_contacts: 64,
    diag_booked: 18,
    diag_completed: 14,
    paid_conversions: 2,
  };
  const rates = computeFunnelRates(metrics);
  const stageCfg = BOTTLENECK_STAGE_CONFIGS[activeBottleneckStage];

  // Identify the single lowest conversion rate in the 3 transitions to highlight in Amber/Rose
  const stepRates = [
    { key: "booked", pct: rates.contactToBookedPct, target: 25 },
    { key: "done", pct: rates.bookedToCompletedPct, target: 75 },
    { key: "paid", pct: rates.completedToPaidPct, target: 25 },
  ];
  const lowestStepKey = [...stepRates].sort((a, b) => a.pct - b.pct)[0]?.key;

  // 60-Second Weekly Reality Gate Modal Form State
  const [weekStart, setWeekStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reach, setReach] = useState(metrics.reach_or_contacts);
  const [booked, setBooked] = useState(metrics.diag_booked);
  const [completed, setCompleted] = useState(metrics.diag_completed);
  const [paid, setPaid] = useState(metrics.paid_conversions);
  const [touchpoint, setTouchpoint] = useState(
    latestLog?.top_winning_touchpoint ||
      "10-min Zoom parent debrief screen-sharing the student's timestamped Socratic stall on Question 4 (MHF4U)"
  );
  const [quotes, setQuotes] = useState<
    { quote_text: string; context_tag: VoCContextTag }[]
  >([
    {
      quote_text:
        "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test.",
      context_tag: "ai_cheating",
    },
    {
      quote_text:
        "Her teacher marks Ontario K/T/C/A Thinking and Application questions strictly—generic tutoring worksheets don't match Grade 11 SBI3U or MCR3U tests.",
      context_tag: "curriculum",
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Live modal conversion % calculation as the user types
  const modalLiveRates = computeFunnelRates({
    reach_or_contacts: Number(reach) || 0,
    diag_booked: Number(booked) || 0,
    diag_completed: Number(completed) || 0,
    paid_conversions: Number(paid) || 0,
  });

  // Esc key handler to close modals & popovers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRealityGateModalOpen(false);
        setIsBottleneckPopoverOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setRealityGateModalOpen]);

  // Auto-dismiss diagnostic toast after 7 seconds
  useEffect(() => {
    if (!diagnosticToast) return;
    const t = setTimeout(() => clearDiagnosticToast(), 7000);
    return () => clearTimeout(t);
  }, [diagnosticToast, clearDiagnosticToast]);

  const handleSubmitRealityCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const validQuotes = quotes.filter((q) => q.quote_text.trim().length >= 8);
    if (validQuotes.length < 2) {
      setFormError(
        "Please enter at least 2 exact, unedited verbatim parent quotes or objections heard this week."
      );
      return;
    }
    if (!touchpoint.trim()) {
      setFormError("Please specify this week's top winning touchpoint.");
      return;
    }
    setFormError(null);
    submitWeeklyRealityLog({
      week_start_date: weekStart,
      funnel_metrics: {
        reach_or_contacts: Number(reach),
        diag_booked: Number(booked),
        diag_completed: Number(completed),
        paid_conversions: Number(paid),
      },
      verbatim_parent_quotes: validQuotes,
      top_winning_touchpoint: touchpoint,
    });
  };

  const isLocked = realityGateStatus === "LOCKED";

  // Segmented progress bar calculation across 0->25 (Stage 1), 26->60 (Stage 2), 61->100 (Stage 3)
  const seg1Pct = Math.min(100, Math.round((paidStudentCount / 25) * 100));
  const seg2Pct =
    paidStudentCount > 25
      ? Math.min(100, Math.round(((paidStudentCount - 25) / 35) * 100))
      : 0;
  const seg3Pct =
    paidStudentCount > 60
      ? Math.min(100, Math.round(((paidStudentCount - 60) / 40) * 100))
      : 0;

  const secondaryViews: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: "copilot", label: "CMO Cockpit", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "planner", label: "5-Horizon Planner & Agents", icon: <Bot className="w-3.5 h-3.5" /> },
    { id: "intel", label: "Market & Competitor Intel", icon: <Radar className="w-3.5 h-3.5" /> },
    { id: "skills", label: "Skill Library", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "settings", label: "Persona & Schema", icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* =====================================================================
          LEVEL 1: MACRO COMMAND STRIP (Sticky Top Bar — Height ~72px)
          ===================================================================== */}
      <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-slate-200 px-5 flex items-center justify-between gap-4 select-none shadow-2xs">
        {/* MODULE 1: Brand + North Star Progress Pill (Paid Students: X / 100 with 25/60/100 milestones) */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div
            onClick={() => setActiveTab("copilot")}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                MindLC
              </div>
              <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                $139/mo Hybrid Cockpit
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />

          {/* North Star Progress Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Paid Students:
                </span>
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {paidStudentCount} <span className="text-slate-400 font-normal">/ 100</span>
                </span>
              </div>
              {/* Sleek 3-Segment Progress Bar (25 · 60 · 100) */}
              <div className="flex items-center gap-1 mt-1 w-36">
                <div
                  className="h-1.5 flex-1 bg-slate-200 rounded-l-full overflow-hidden"
                  title="Stage 1 Milestone: 25 Students"
                >
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${seg1Pct}%` }}
                  />
                </div>
                <div
                  className="h-1.5 flex-1 bg-slate-200 overflow-hidden"
                  title="Stage 2 Milestone: 60 Students"
                >
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${seg2Pct}%` }}
                  />
                </div>
                <div
                  className="h-1.5 flex-1 bg-slate-200 rounded-r-full overflow-hidden"
                  title="Stage 3 Milestone: 100 Students"
                >
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${seg3Pct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 leading-tight hidden xl:block">
              <div>25 · 60 · 100</div>
              <div className="text-slate-600 font-semibold tabular-nums">
                ${(paidStudentCount * 139).toLocaleString()} MRR
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 2: Active Bottleneck Lock Badge (Clickable Popover for Allowed vs Blocked Scope) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsBottleneckPopoverOpen(!isBottleneckPopoverOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-bold transition"
          >
            <span>🔒 {stageCfg.shortLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
          </button>

          {isBottleneckPopoverOpen && (
            <div className="absolute left-0 mt-2 w-96 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-50 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900">
                  Single-Bottleneck Lock-In Engine
                </span>
                <button
                  onClick={() => setIsBottleneckPopoverOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase text-amber-800">
                  Locked Objective:
                </div>
                <p className="text-slate-700 font-medium">
                  {stageCfg.lockedObjective}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-900 text-[11px]">
                    ✓ Allowed Proposal Types
                  </div>
                  <ul className="text-[11px] text-emerald-800 space-y-0.5">
                    {stageCfg.allowedProposalTypes.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1">
                  <div className="font-bold text-rose-900 text-[11px]">
                    ✕ Blocked Scope
                  </div>
                  <ul className="text-[11px] text-rose-800 space-y-0.5">
                    {stageCfg.blockedScope.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stage Simulator Switcher */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Simulate Paid Student Milestone Stage:
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaidStudentCount(14)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border ${
                      activeBottleneckStage === "STAGE_1_CONVERSION"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Stage 1 (14/100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidStudentCount(38)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border ${
                      activeBottleneckStage === "STAGE_2_REFERRAL_DIAG"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Stage 2 (38/100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidStudentCount(72)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border ${
                      activeBottleneckStage === "STAGE_3_SCALE_ADS"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Stage 3 (72/100)
                  </button>
                </div>
              </div>

              {/* Workspace Module Switcher inside Popover */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Switch Command Module:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {secondaryViews.map((sv) => (
                    <button
                      key={sv.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(sv.id);
                        setIsBottleneckPopoverOpen(false);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                        activeTab === sv.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {sv.icon}
                      {sv.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 3: Live Mini-Funnel Health Strip (Tabular Numerals + Lowest Rate Auto-Highlighted in Amber/Red) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs tabular-nums">
          <div className="px-2 py-0.5 rounded-md text-slate-700">
            <span className="text-slate-500">Contacts</span>{" "}
            <strong className="font-bold text-slate-900">
              {metrics.reach_or_contacts}
            </strong>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div
            className={`px-2 py-0.5 rounded-md font-medium ${
              lowestStepKey === "booked"
                ? "bg-amber-100 text-amber-950 border border-amber-300 font-bold"
                : "text-slate-700"
            }`}
          >
            <span>Diag Booked</span>{" "}
            <strong>{rates.contactToBookedPct}%</strong>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div
            className={`px-2 py-0.5 rounded-md font-medium ${
              lowestStepKey === "done"
                ? "bg-amber-100 text-amber-950 border border-amber-300 font-bold"
                : "text-slate-700"
            }`}
          >
            <span>Diag Done</span>{" "}
            <strong>{rates.bookedToCompletedPct}%</strong>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div
            className={`px-2.5 py-0.5 rounded-md ${
              lowestStepKey === "paid" || rates.completedToPaidPct < 25
                ? "bg-rose-100 text-rose-900 border border-rose-300 font-extrabold"
                : "bg-emerald-50 text-emerald-800 font-bold"
            }`}
            title="Lowest conversion step in funnel — automatically highlighted"
          >
            <span>Paid</span> <strong>{rates.completedToPaidPct}%</strong>
            {rates.completedToPaidPct < 25 && (
              <span className="ml-1 text-[10px] uppercase tracking-wider">
                (Bottleneck)
              </span>
            )}
          </div>
        </div>

        {/* MODULE 4: Reality Gate Status Button (Right-aligned) + Compact View Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {isSampleSeedActive && (
            <span
              onClick={() => setRealityGateModalOpen(true)}
              className="hidden xl:inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium cursor-pointer hover:bg-slate-200"
              title="Initial Ontario Grade 11/12 STEM sample data — clears on your first Weekly Reality Gate submission"
            >
              Sample Seed Data
            </span>
          )}

          {isLocked ? (
            <button
              type="button"
              onClick={() => setRealityGateModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm animate-pulse transition"
            >
              <AlertTriangle className="w-4 h-4" />
              ⚠️ Log Weekly Reality (60s) to Unlock Proposals
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRealityGateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ✓ Reality Gate Current (5d left)
            </button>
          )}

          <button
            type="button"
            onClick={toggleRealityGateLockSimulation}
            title={
              isLocked
                ? "Click to unlock Reality Gate"
                : "Click to simulate LOCKED Reality Gate state"
            }
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
          >
            {isLocked ? (
              <Lock className="w-4 h-4 text-amber-600" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Diagnostic Summary Toast Banner */}
      {diagnosticToast && (
        <div className="bg-slate-900 text-white px-6 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium">{diagnosticToast}</span>
          </div>
          <button
            onClick={clearDiagnosticToast}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          SPECIAL INTERACTIVE FLOW 1: WEEKLY REALITY GATE MODAL (60-Sec Check)
          ===================================================================== */}
      {isRealityGateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Safeguard 1 · 60-Second Market Reality Check
                </div>
                <h2 className="font-bold text-base mt-0.5">
                  Log Weekly Funnel Reality &amp; Verbatim Ontario Parent Quotes
                </h2>
              </div>
              <button
                onClick={() => setRealityGateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRealityCheck} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Step 1: 4 Numeric Funnel Inputs + Automatic Live Conversion % */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Weekly Funnel Numbers (`{weekStart}`)
                  </label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-300 text-xs font-semibold tabular-nums"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Contacts / Reach
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reach}
                      onChange={(e) => setReach(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Top of funnel
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Diag Booked
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={booked}
                      onChange={(e) => setBooked(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div className="text-[11px] font-semibold text-slate-600 mt-1">
                      {modalLiveRates.contactToBookedPct}% Booked Rate
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Diag Completed
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={completed}
                      onChange={(e) => setCompleted(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div className="text-[11px] font-semibold text-slate-600 mt-1">
                      {modalLiveRates.bookedToCompletedPct}% Show-Up Rate
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      modalLiveRates.completedToPaidPct < 25
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-emerald-50/70 border-emerald-300"
                    }`}
                  >
                    <label className="block text-[11px] font-bold text-slate-700">
                      Paid ($139/mo)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={paid}
                      onChange={(e) => setPaid(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div
                      className={`text-[11px] font-bold mt-1 ${
                        modalLiveRates.completedToPaidPct < 25
                          ? "text-amber-900"
                          : "text-emerald-800"
                      }`}
                    >
                      {modalLiveRates.completedToPaidPct}% Diag→Paid (Target ≥25%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: 2+ Verbatim Parent Quotes + Tag Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Exact Verbatim Parent Objections Heard This Week (Min 2)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setQuotes([
                        ...quotes,
                        { quote_text: "", context_tag: "trust" },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Quote
                  </button>
                </div>

                {quotes.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">
                        Parent Verbatim Quote #{idx + 1}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {CONTEXT_TAGS.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              setQuotes(
                                quotes.map((item, i) =>
                                  i === idx
                                    ? { ...item, context_tag: tag.id }
                                    : item
                                )
                              )
                            }
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                              q.context_tag === tag.id
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={q.quote_text}
                      onChange={(e) =>
                        setQuotes(
                          quotes.map((item, i) =>
                            i === idx
                              ? { ...item, quote_text: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Paste exact unedited parent quote or objection..."
                      required={idx < 2}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>
                ))}
              </div>

              {/* Step 3: 1 Winning Touchpoint Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  3. Top Winning Touchpoint This Week
                </label>
                <input
                  type="text"
                  value={touchpoint}
                  onChange={(e) => setTouchpoint(e.target.value)}
                  required
                  placeholder="Single channel or conversation that produced the highest positive parent response..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                {!pilotWeek0Used ? (
                  <button
                    type="button"
                    onClick={activatePilotWeek0Override}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition"
                  >
                    ⚡ Pilot Week 0 Bootstrap Override (1-Time)
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Pilot Week 0 Override used
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRealityGateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Cancel (Esc)
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Reality Log &amp; Calibrate Proposals
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
