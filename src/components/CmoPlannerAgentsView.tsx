"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { PlanHorizon } from "@/types/database";
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
} from "lucide-react";

const HORIZONS: {
  id: PlanHorizon;
  label: string;
  sub: string;
}[] = [
  { id: "Daily", label: "Daily Plan", sub: "Today's high-intent execution" },
  { id: "Weekly", label: "Weekly Sprint", sub: "5-day lead & conversion sprint" },
  { id: "Monthly", label: "Monthly Roadmap", sub: "30-day funnel & school council" },
  { id: "Quarterly", label: "Quarterly OKRs", sub: "90-day course hubs & referrals" },
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
  } = useMarketingStore();

  const [cmoQuestionInput, setCmoQuestionInput] = useState("");

  const horizonActivities = plannedActivities.filter(
    (a) => a.horizon === activeHorizon
  );
  const queuedCount = horizonActivities.filter(
    (a) => a.status === "Queued"
  ).length;
  const completedCount = horizonActivities.filter(
    (a) => a.status === "Completed"
  ).length;

  const handleAskCmoQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmoQuestionInput.trim() || isAskingPlannerQa) return;
    const q = cmoQuestionInput.trim();
    setCmoQuestionInput("");
    await askCmoPlannerQuestion(q);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            <Bot className="w-4 h-4" />
            Multi-Agent Marketing Operating System
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            CMO Multi-Horizon Planner &amp; Autonomous Agent Team
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl mt-1">
            Daily, Weekly, Monthly, Quarterly, and Annual execution plans
            synchronized with Ontario Grades 9–12 STEM trends. Ask questions to
            dynamically adjust the schedule, or dispatch specialist agents to
            draft lead-generation and conversion assets.
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
          SECTION 1: 5-AGENT SELF-GUIDED MARKETING TEAM ROSTER
          ===================================================================== */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Autonomous Marketing Team (5 Specialist Agents)
            </span>
            <h2 className="text-lg font-bold">
              Task-Specialized Agent Roster & Conversion KPI Ownership
            </h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            All Outputs Route to Campaign Co-Pilot Canvas
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
                Interactive CMO Plan Q&A & Dynamic Re-Calibration
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
                  {item.strategistAnswer}
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
          SECTION 3: 5-HORIZON TACTICAL OPERATING PLAN (DAILY -> ANNUAL)
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

            return (
              <div
                key={act.id}
                className={`bg-white rounded-2xl border p-6 shadow-xs transition ${
                  isDone
                    ? "border-emerald-300 bg-emerald-50/20"
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
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      {act.funnelObjective}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Deliverable: {act.targetPlatform} (`{act.skillName}`)
                    </span>
                    {act.adjustedByCmo && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        ★ Adjusted by CMO Q&A / Signal
                      </span>
                    )}
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

                {/* Activity Title & Concrete Tactical Execution */}
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                  {act.title}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                  <div className="lg:col-span-8 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Execution Plan:
                    </div>
                    <p className="text-slate-700 leading-relaxed text-xs">
                      {act.tacticalExecution}
                    </p>
                    <div className="pt-1 text-slate-600">
                      <strong className="text-slate-900">
                        Deliverable:
                      </strong>{" "}
                      {act.deliverableSpec}
                    </div>
                  </div>

                  <div className="lg:col-span-4 p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 flex flex-col justify-between space-y-2">
                    <div className="space-y-1.5">
                      <div className="font-bold text-teal-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Market Trigger & Target KPI
                      </div>
                      <p className="text-slate-700">
                        <strong>Trigger:</strong> {act.marketTrigger}
                      </p>
                      <p className="text-teal-900 font-bold">
                        <strong>KPI:</strong> {act.targetKpi}
                      </p>
                    </div>

                    {act.cmoAdjustmentNote && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        {act.cmoAdjustmentNote}
                      </div>
                    )}
                  </div>
                </div>

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
                    {isDone && act.outputAssetId && (
                      <button
                        onClick={() => setActiveTab("copilot")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        View Generated Asset in Co-Pilot Canvas
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
                          Dispatch {assignedAgent.codeName} to Execute →
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
