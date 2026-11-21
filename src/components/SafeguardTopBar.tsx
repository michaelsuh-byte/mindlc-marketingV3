"use client";

import React, { useState, useEffect } from "react";
import { useMarketingStore, NavigationTab } from "@/store/useMarketingStore";
import { computeFunnelRates } from "@/services/marketingAi";
import {
  StageId,
  TierId,
  VoCContextTag,
  VoCTierTag,
} from "@/types/database";
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
  Edit3,
} from "lucide-react";

const CONTEXT_TAGS: { id: VoCContextTag; label: string }[] = [
  { id: "trust", label: "Trust" },
  { id: "ai_cheating", label: "AI Cheating" },
  { id: "price", label: "Price" },
  { id: "curriculum", label: "Curriculum" },
  { id: "student_motivation", label: "Student Motivation" },
];

const TIER_PILLS: { id: TierId; short: string; price: string }[] = [
  { id: "TIER_1", short: "T1 · Self-Coach", price: "$39/mo" },
  { id: "TIER_2", short: "T2 · Managed Hybrid", price: "$139/mo" },
  { id: "TIER_3", short: "T3 · Prime 1:1", price: "$349/mo" },
];

export function SafeguardTopBar() {
  const {
    activeTab,
    setActiveTab,
    activeTierId,
    tierWorkspaces,
    setActiveTierId,
    setActiveStageOverride,
    updateTierStageGoal,
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
  const [editingStageId, setEditingStageId] = useState<StageId | null>(null);

  const currentTierWs = tierWorkspaces[activeTierId];
  const latestLog = weeklyRealityLogs[0];
  const metrics = latestLog?.funnel_metrics || {
    reach_or_contacts: 64,
    diag_booked: 18,
    diag_completed: 14,
    paid_conversions: 2,
  };
  const rates = computeFunnelRates(metrics);
  const stageGoal = currentTierWs.stage_goals[activeBottleneckStage];
  const [lbl1, lbl2, lbl3, lbl4] = currentTierWs.funnel_labels;

  // Stage Goal Inline Editor State
  const [editKpiName, setEditKpiName] = useState(stageGoal.primary_kpi_name);
  const [editKpiTargetPct, setEditKpiTargetPct] = useState(
    stageGoal.primary_kpi_target_pct
  );
  const [editTargetPaid, setEditTargetPaid] = useState(
    stageGoal.target_paid_count
  );

  // Identify lowest conversion step in the active tier's funnel
  const stepRates = [
    { key: "booked", pct: rates.contactToBookedPct },
    { key: "done", pct: rates.bookedToCompletedPct },
    { key: "paid", pct: rates.completedToPaidPct },
  ];
  const lowestStepKey = [...stepRates].sort((a, b) => a.pct - b.pct)[0]?.key;

  // 60-Second Weekly Reality Gate Modal Form State (Syncs when activeTierId changes)
  const [weekStart, setWeekStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reach, setReach] = useState(metrics.reach_or_contacts);
  const [booked, setBooked] = useState(metrics.diag_booked);
  const [completed, setCompleted] = useState(metrics.diag_completed);
  const [paid, setPaid] = useState(metrics.paid_conversions);
  const [touchpoint, setTouchpoint] = useState(
    latestLog?.top_winning_touchpoint || ""
  );
  const [alsoUnlockOtherTiers, setAlsoUnlockOtherTiers] = useState(false);
  const [quotes, setQuotes] = useState<
    {
      quote_text: string;
      context_tag: VoCContextTag;
      tier_id: VoCTierTag;
    }[]
  >([
    {
      quote_text:
        "My son already uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U Advanced Functions unit test.",
      context_tag: "ai_cheating",
      tier_id: activeTierId,
    },
    {
      quote_text:
        "Her teacher marks Ontario Growing Success (K/T/C/A) Thinking and Application questions strictly—generic tutoring worksheets don't match Grade 11 SBI3U or MCR3U tests.",
      context_tag: "curriculum",
      tier_id: "ALL",
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const log = currentTierWs.weekly_reality_logs[0];
    if (log) {
      setReach(log.funnel_metrics.reach_or_contacts);
      setBooked(log.funnel_metrics.diag_booked);
      setCompleted(log.funnel_metrics.diag_completed);
      setPaid(log.funnel_metrics.paid_conversions);
      setTouchpoint(log.top_winning_touchpoint);
    }
  }, [activeTierId, currentTierWs.weekly_reality_logs]);

  const modalLiveRates = computeFunnelRates({
    reach_or_contacts: Number(reach) || 0,
    diag_booked: Number(booked) || 0,
    diag_completed: Number(completed) || 0,
    paid_conversions: Number(paid) || 0,
  });

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
      alsoUnlockTiers: alsoUnlockOtherTiers
        ? ["TIER_1", "TIER_2", "TIER_3"]
        : [activeTierId],
    });
  };

  const handleOpenStageGoalEdit = (st: StageId) => {
    const g = currentTierWs.stage_goals[st];
    setEditingStageId(st);
    setEditKpiName(g.primary_kpi_name);
    setEditKpiTargetPct(g.primary_kpi_target_pct);
    setEditTargetPaid(g.target_paid_count);
  };

  const handleSaveStageGoalEdit = (st: StageId) => {
    updateTierStageGoal(activeTierId, st, {
      primary_kpi_name: editKpiName,
      primary_kpi_target_pct: Number(editKpiTargetPct),
      target_paid_count: Number(editTargetPaid),
      short_badge: `${st.replace("_", " ")}: ${editKpiName} ≥ ${editKpiTargetPct}%`,
    });
    setEditingStageId(null);
  };

  const isLocked = realityGateStatus === "LOCKED";

  // 3-Segment Milestone Progress Bar dynamically scaled to the active tier's Stage 1/2/3 targets!
  const s1Max = currentTierWs.stage_goals.STAGE_1.target_paid_count;
  const s2Max = currentTierWs.stage_goals.STAGE_2.target_paid_count;
  const s3Max = currentTierWs.stage_goals.STAGE_3.target_paid_count;

  const seg1Pct = Math.min(100, Math.round((paidStudentCount / s1Max) * 100));
  const seg2Pct =
    paidStudentCount > s1Max
      ? Math.min(
          100,
          Math.round(((paidStudentCount - s1Max) / (s2Max - s1Max)) * 100)
        )
      : 0;
  const seg3Pct =
    paidStudentCount > s2Max
      ? Math.min(
          100,
          Math.round(((paidStudentCount - s2Max) / (s3Max - s2Max)) * 100)
        )
      : 0;

  const secondaryViews: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "copilot",
      label: "CMO Cockpit",
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "planner",
      label: "5-Horizon Planner",
      icon: <Bot className="w-3.5 h-3.5" />,
    },
    {
      id: "intel",
      label: "Market Intel",
      icon: <Radar className="w-3.5 h-3.5" />,
    },
    {
      id: "skills",
      label: "Skills",
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    {
      id: "settings",
      label: "Persona & Schema",
      icon: <Sliders className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <>
      {/* =====================================================================
          LEVEL 1: MACRO COMMAND STRIP (Sticky Top Bar — Height ~72px)
          Now includes 3-Tier Workspace Switcher + Tier-Specific Funnel & Stage Lock
          ===================================================================== */}
      <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 select-none shadow-2xs">
        {/* MODULE 1: Brand + 3-Tier Workspace Switcher + North Star Progress Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => setActiveTab("copilot")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          {/* 3-Tier Workspace Switcher (`TIER_1` | `TIER_2` | `TIER_3`) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {TIER_PILLS.map((tp) => {
              const isAct = activeTierId === tp.id;
              const tWs = tierWorkspaces[tp.id];
              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => setActiveTierId(tp.id)}
                  className={`px-2.5 py-1 rounded-lg text-left transition ${
                    isAct
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <div className="text-[11px] font-extrabold leading-tight flex items-center gap-1">
                    <span>{tp.short}</span>
                    {tWs.reality_gate_status === "LOCKED" && (
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                    )}
                  </div>
                  <div
                    className={`text-[9.5px] font-mono tabular-nums ${
                      isAct ? "text-indigo-300" : "text-slate-400"
                    }`}
                  >
                    {tp.price} · {tWs.current_paid_count}/{tWs.north_star_paid_goal}
                  </div>
                </button>
              );
            })}
          </div>

          {/* North Star Progress Pill for Selected Tier */}
          <div className="hidden md:flex bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 items-center gap-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  Paid:
                </span>
                <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                  {paidStudentCount}{" "}
                  <span className="text-slate-400 font-normal">
                    / {currentTierWs.north_star_paid_goal}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 w-28">
                <div
                  className="h-1.5 flex-1 bg-slate-200 rounded-l-full overflow-hidden"
                  title={`Stage 1 Target: ${s1Max}`}
                >
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${seg1Pct}%` }}
                  />
                </div>
                <div
                  className="h-1.5 flex-1 bg-slate-200 overflow-hidden"
                  title={`Stage 2 Target: ${s2Max}`}
                >
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${seg2Pct}%` }}
                  />
                </div>
                <div
                  className="h-1.5 flex-1 bg-slate-200 rounded-r-full overflow-hidden"
                  title={`Stage 3 Target: ${s3Max}`}
                >
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${seg3Pct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 leading-tight hidden 2xl:block tabular-nums">
              <div>
                {s1Max} · {s2Max} · {s3Max}
              </div>
              <div className="text-slate-600 font-bold">
                ${(paidStudentCount * currentTierWs.monthly_price_cad).toLocaleString()}{" "}
                MRR
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 2: Active Bottleneck Lock Badge (Popover with Editable Stage 1/2/3 Goals!) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsBottleneckPopoverOpen(!isBottleneckPopoverOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-bold transition"
          >
            <span className="truncate max-w-[230px] sm:max-w-xs">
              🔒 {stageGoal.short_badge}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          </button>

          {isBottleneckPopoverOpen && (
            <div className="absolute left-0 mt-2 w-[440px] bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="font-extrabold text-slate-900 block">
                    {currentTierWs.tier_name} ({currentTierWs.price_label})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {currentTierWs.offer_summary}
                  </span>
                </div>
                <button
                  onClick={() => setIsBottleneckPopoverOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stage 1 / Stage 2 / Stage 3 Switcher & Editable Goals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    Select or Edit Stage Goals ({currentTierWs.tier_short_name}):
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    Paid Count: {paidStudentCount}
                  </span>
                </div>

                {(["STAGE_1", "STAGE_2", "STAGE_3"] as StageId[]).map((st) => {
                  const g = currentTierWs.stage_goals[st];
                  const isCurrent = activeBottleneckStage === st;
                  const isEditingThis = editingStageId === st;

                  return (
                    <div
                      key={st}
                      className={`p-3 rounded-xl border transition ${
                        isCurrent
                          ? "bg-indigo-50/60 border-indigo-400"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveStageOverride(st)}
                          className="text-left font-bold text-slate-900 hover:text-indigo-700 flex items-center gap-1.5"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCurrent ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                          />
                          <span>{g.stage_title}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            isEditingThis
                              ? setEditingStageId(null)
                              : handleOpenStageGoalEdit(st)
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-indigo-700"
                        >
                          <Edit3 className="w-3 h-3" />
                          {isEditingThis ? "Close" : "Edit Goal"}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 mt-1 pl-3.5 tabular-nums">
                        Target: <strong>{g.primary_kpi_name} ≥ {g.primary_kpi_target_pct}%</strong>{" "}
                        · {g.secondary_kpi_summary}
                      </div>

                      {isEditingThis && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500">
                              Primary KPI Name
                            </label>
                            <input
                              type="text"
                              value={editKpiName}
                              onChange={(e) => setEditKpiName(e.target.value)}
                              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500">
                              Target %
                            </label>
                            <input
                              type="number"
                              value={editKpiTargetPct}
                              onChange={(e) =>
                                setEditKpiTargetPct(Number(e.target.value))
                              }
                              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold tabular-nums"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500">
                              Stage Paid Student Milestone
                            </label>
                            <input
                              type="number"
                              value={editTargetPaid}
                              onChange={(e) =>
                                setEditTargetPaid(Number(e.target.value))
                              }
                              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold tabular-nums"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => handleSaveStageGoalEdit(st)}
                              className="w-full py-1.5 rounded bg-indigo-600 text-white font-bold text-[11px]"
                            >
                              Save Goal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Allowed vs Blocked Scope for Active Stage */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-900 text-[11px]">
                    ✓ Allowed ({activeBottleneckStage})
                  </div>
                  <ul className="text-[11px] text-emerald-800 space-y-0.5">
                    {stageGoal.allowed_scope.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1">
                  <div className="font-bold text-rose-900 text-[11px]">
                    ✕ Blocked &amp; Tone Guardrails
                  </div>
                  <ul className="text-[11px] text-rose-800 space-y-0.5">
                    {stageGoal.blocked_scope.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Simulate Paid Count Input */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  Simulate {currentTierWs.tier_short_name} Paid Student Count:
                </span>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={paidStudentCount}
                  onChange={(e) => setPaidStudentCount(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-extrabold text-center tabular-nums"
                />
              </div>

              {/* Workspace Module Switcher */}
              <div className="pt-2 border-t border-slate-100">
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

        {/* MODULE 3: Live Mini-Funnel Health Strip (Uses Tier-Specific Funnel Step Labels!) */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs tabular-nums">
          <div className="px-2 py-0.5 rounded-md text-slate-700">
            <span className="text-slate-500">{lbl1.split("/")[0]}</span>{" "}
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
            <span>{lbl2}</span> <strong>{rates.contactToBookedPct}%</strong>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div
            className={`px-2 py-0.5 rounded-md font-medium ${
              lowestStepKey === "done"
                ? "bg-amber-100 text-amber-950 border border-amber-300 font-bold"
                : "text-slate-700"
            }`}
          >
            <span>{lbl3}</span> <strong>{rates.bookedToCompletedPct}%</strong>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

          <div
            className={`px-2.5 py-0.5 rounded-md ${
              lowestStepKey === "paid" ||
              rates.completedToPaidPct < stageGoal.primary_kpi_target_pct
                ? "bg-rose-100 text-rose-900 border border-rose-300 font-extrabold"
                : "bg-emerald-50 text-emerald-800 font-bold"
            }`}
          >
            <span>{lbl4}</span> <strong>{rates.completedToPaidPct}%</strong>
            {rates.completedToPaidPct < stageGoal.primary_kpi_target_pct && (
              <span className="ml-1 text-[10px] uppercase tracking-wider">
                (&lt;{stageGoal.primary_kpi_target_pct}%)
              </span>
            )}
          </div>
        </div>

        {/* MODULE 4: Reality Gate Status Button (Per-Tier) */}
        <div className="flex items-center gap-2 shrink-0">
          {isSampleSeedActive && (
            <span
              onClick={() => setRealityGateModalOpen(true)}
              className="hidden 2xl:inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium cursor-pointer hover:bg-slate-200"
            >
              Sample Seed
            </span>
          )}

          {isLocked ? (
            <button
              type="button"
              onClick={() => setRealityGateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm animate-pulse transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              ⚠️ Log {currentTierWs.tier_short_name} Reality (60s)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRealityGateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ✓ {currentTierWs.tier_id} Gate Current
            </button>
          )}

          <button
            type="button"
            onClick={toggleRealityGateLockSimulation}
            title={`Toggle Reality Gate Lock for ${currentTierWs.tier_name}`}
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
          WEEKLY REALITY GATE MODAL (Scoped to Active Tier + Multi-Tier Option)
          ===================================================================== */}
      {isRealityGateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Safeguard 1 · {currentTierWs.tier_name} ({currentTierWs.price_label})
                </div>
                <h2 className="font-bold text-base mt-0.5">
                  Log Weekly Funnel Reality &amp; Shared VoC Parent Quotes
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

              {/* Step 1: Tier-Specific Funnel Labels & Live Conversion % */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. {currentTierWs.tier_short_name} Funnel Numbers (`{weekStart}`)
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
                    <label className="block text-[11px] font-semibold text-slate-500 truncate">
                      {lbl1}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reach}
                      onChange={(e) => setReach(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      Step 1 Input
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-500 truncate">
                      {lbl2}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={booked}
                      onChange={(e) => setBooked(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div className="text-[11px] font-semibold text-slate-600 mt-1">
                      {modalLiveRates.contactToBookedPct}% Rate
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-500 truncate">
                      {lbl3}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={completed}
                      onChange={(e) => setCompleted(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base font-extrabold text-slate-900"
                    />
                    <div className="text-[11px] font-semibold text-slate-600 mt-1">
                      {modalLiveRates.bookedToCompletedPct}% Completion
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      modalLiveRates.completedToPaidPct <
                      stageGoal.primary_kpi_target_pct
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-emerald-50/70 border-emerald-300"
                    }`}
                  >
                    <label className="block text-[11px] font-bold text-slate-700 truncate">
                      {lbl4}
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
                        modalLiveRates.completedToPaidPct <
                        stageGoal.primary_kpi_target_pct
                          ? "text-amber-900"
                          : "text-emerald-800"
                      }`}
                    >
                      {modalLiveRates.completedToPaidPct}% (Target ≥
                      {stageGoal.primary_kpi_target_pct}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Verbatim Parent Quotes with Tier Scope Tag (`TIER_1` | `TIER_2` | `TIER_3` | `ALL`) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Verbatim Parent Quotes (Saved to Shared VoC Vault)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setQuotes([
                        ...quotes,
                        {
                          quote_text: "",
                          context_tag: "trust",
                          tier_id: activeTierId,
                        },
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          Quote #{idx + 1}
                        </span>
                        <select
                          value={q.tier_id}
                          onChange={(e) =>
                            setQuotes(
                              quotes.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      tier_id: e.target.value as VoCTierTag,
                                    }
                                  : item
                              )
                            )
                          }
                          className="px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-bold text-indigo-700"
                        >
                          <option value="ALL">Shared: ALL Tiers</option>
                          <option value="TIER_1">Tier 1 Only (Self-Coach)</option>
                          <option value="TIER_2">Tier 2 Only (Hybrid)</option>
                          <option value="TIER_3">Tier 3 Only (Prime 1:1)</option>
                        </select>
                      </div>

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

              {/* Step 3: Top Winning Touchpoint + Multi-Tier Unlock Checkbox */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    3. Top Winning Touchpoint for {currentTierWs.tier_short_name}
                  </label>
                  <input
                    type="text"
                    value={touchpoint}
                    onChange={(e) => setTouchpoint(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={alsoUnlockOtherTiers}
                    onChange={(e) => setAlsoUnlockOtherTiers(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>
                    Also mark Reality Gate as UNLOCKED across all 3 product
                    tiers (`TIER_1`, `TIER_2`, `TIER_3`) for this week
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                {!pilotWeek0Used ? (
                  <button
                    type="button"
                    onClick={activatePilotWeek0Override}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition"
                  >
                    ⚡ Pilot Week 0 Bootstrap Override
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
                    Submit {currentTierWs.tier_short_name} Reality Log
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
