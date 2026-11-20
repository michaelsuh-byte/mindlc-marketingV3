"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import {
  BOTTLENECK_STAGE_CONFIGS,
  computeFunnelRates,
} from "@/services/marketingAi";
import { VoCContextTag } from "@/types/database";
import {
  Lock,
  Unlock,
  ShieldAlert,
  Target,
  Quote,
  Plus,
  CheckCircle2,
  AlertOctagon,
  SlidersHorizontal,
  X,
} from "lucide-react";

const CONTEXT_TAGS: VoCContextTag[] = [
  "ai_cheating",
  "price",
  "student_motivation",
  "curriculum",
  "trust",
];

export function SafeguardTopBar() {
  const {
    realityGateStatus,
    pilotWeek0Used,
    weeklyRealityLogs,
    isRealityGateModalOpen,
    paidStudentCount,
    activeBottleneckStage,
    setRealityGateModalOpen,
    toggleRealityGateLockSimulation,
    submitWeeklyRealityLog,
    activatePilotWeek0Override,
    setPaidStudentCount,
  } = useMarketingStore();

  const latestLog = weeklyRealityLogs[0];
  const rates = latestLog
    ? computeFunnelRates(latestLog.funnel_metrics)
    : { contactToBookedPct: 0, bookedToCompletedPct: 0, completedToPaidPct: 0 };
  const stageCfg = BOTTLENECK_STAGE_CONFIGS[activeBottleneckStage];

  // Modal Form State for 60-Second Weekly Reality Log
  const [weekStart, setWeekStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reach, setReach] = useState(
    latestLog?.funnel_metrics.reach_or_contacts || 70
  );
  const [booked, setBooked] = useState(
    latestLog?.funnel_metrics.diag_booked || 20
  );
  const [completed, setCompleted] = useState(
    latestLog?.funnel_metrics.diag_completed || 16
  );
  const [paid, setPaid] = useState(
    latestLog?.funnel_metrics.paid_conversions || 4
  );
  const [touchpoint, setTouchpoint] = useState(
    latestLog?.top_winning_touchpoint ||
      "10-min Zoom parent debrief showing the student's timestamped Socratic stall on MCR3U Question 4"
  );
  const [quotes, setQuotes] = useState<
    { quote_text: string; context_tag: VoCContextTag }[]
  >([
    {
      quote_text:
        "My son already uses ChatGPT to finish homework in 5 minutes and then gets 58% on his MCR3U Functions unit test.",
      context_tag: "ai_cheating",
    },
    {
      quote_text:
        "We already burned $380/month at Mathnasium—how do I know $139/month won't just be another subscription he ignores?",
      context_tag: "price",
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddQuoteField = () => {
    setQuotes([
      ...quotes,
      { quote_text: "", context_tag: "student_motivation" },
    ]);
  };

  const handleQuoteChange = (
    idx: number,
    field: "quote_text" | "context_tag",
    val: string
  ) => {
    setQuotes(
      quotes.map((q, i) =>
        i === idx
          ? {
              ...q,
              [field]: val,
            }
          : q
      )
    );
  };

  const handleSubmitRealityCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const validQuotes = quotes.filter((q) => q.quote_text.trim().length >= 10);
    if (validQuotes.length < 2) {
      setFormError(
        "Safeguard 1 Requirement: You must log at least 2 verbatim, unedited parent quotes/objections heard this week."
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

  return (
    <>
      {/* Persistent Conversion Safeguards Ribbon */}
      <div className="bg-slate-950 text-slate-100 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Safeguard 1 — Weekly Reality Gate Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${
              isLocked
                ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                : realityGateStatus === "PILOT_WEEK_0_OVERRIDE"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                REALITY GATE: LOCKED
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                REALITY GATE:{" "}
                {realityGateStatus === "PILOT_WEEK_0_OVERRIDE"
                  ? "PILOT WEEK 0 OVERRIDE"
                  : `UNLOCKED (${latestLog?.week_start_date})`}
              </>
            )}
          </div>

          <button
            onClick={() => setRealityGateModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition"
          >
            {isLocked
              ? "🔓 Submit 60-Sec Weekly Reality Log"
              : "📊 Update Weekly Reality Log / VoC"}
          </button>

          <button
            onClick={toggleRealityGateLockSimulation}
            title="Toggle between LOCKED and UNLOCKED to test Safeguard 1 Data-Locked Generation"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition"
          >
            {isLocked ? "Simulate Unlock" : "Simulate Gate Lock"}
          </button>

          {latestLog && (
            <span className="text-slate-400 hidden xl:inline">
              Diag→Paid:{" "}
              <strong
                className={
                  rates.completedToPaidPct >= 25
                    ? "text-emerald-400"
                    : "text-amber-400"
                }
              >
                {rates.completedToPaidPct}% (
                {latestLog.funnel_metrics.paid_conversions}/
                {latestLog.funnel_metrics.diag_completed})
              </strong>{" "}
              · VoC Cached:{" "}
              <strong className="text-teal-300">
                {weeklyRealityLogs.flatMap((l) => l.verbatim_parent_quotes).length}{" "}
                Quotes
              </strong>
            </span>
          )}
        </div>

        {/* Right: Safeguard 2 — Single-Bottleneck Lock-In Engine (0-100 Students @ $139 CAD/mo) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Tier 2 ($139 CAD/mo):</span>
            <strong className="text-white">
              {paidStudentCount}/100 Students
            </strong>
            <span className="text-teal-400 font-mono">
              (${(paidStudentCount * 139).toLocaleString()} MRR)
            </span>
          </div>

          {/* Quick Stage Switcher Pills to Test All 3 Bottleneck Lock Stages */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setPaidStudentCount(14)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                activeBottleneckStage === "STAGE_1_CONVERSION"
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Stage 1 (0–25 Paid Students): Locked to Diag->Paid >= 25%"
            >
              S1: 0–25 (Conv Lock)
            </button>
            <button
              onClick={() => setPaidStudentCount(38)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                activeBottleneckStage === "STAGE_2_REFERRAL_DIAG"
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Stage 2 (26–60 Paid Students): Locked to Referrals & Seminars >= 40%"
            >
              S2: 26–60 (Referral Lock)
            </button>
            <button
              onClick={() => setPaidStudentCount(72)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                activeBottleneckStage === "STAGE_3_SCALE_ADS"
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Stage 3 (61–100 Paid Students): GTA Paid Ads (Blended CAC < $150 CAD)"
            >
              S3: 61–100 (GTA Ads)
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Banner showing the Active Bottleneck Stage Allowed vs. Blocked Scope */}
      <div className="bg-slate-900/95 text-slate-200 border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-teal-400 uppercase tracking-wider">
            🔒 Active Bottleneck Lock ({activeBottleneckStage}):
          </span>
          <span className="font-semibold text-white">
            {stageCfg.lockedObjective}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-emerald-300">
            <strong>Allowed:</strong>{" "}
            {stageCfg.allowedProposalTypes.slice(0, 3).join(" · ")}
          </span>
          <span className="text-red-300">
            <strong>Blocked Scope:</strong> {stageCfg.blockedScope.join(" · ")}
          </span>
        </div>
      </div>

      {/* =====================================================================
          60-SECOND WEEKLY REALITY GATE MODAL (Safeguard 1)
          ===================================================================== */}
      {isRealityGateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-teal-400" />
                <div>
                  <h2 className="font-bold text-base">
                    Safeguard 1: Weekly Reality Gate (60-Second Ground-Truth Check)
                  </h2>
                  <p className="text-xs text-slate-400">
                    New proposal generation is data-locked until this week&apos;s
                    funnel numbers &amp; 2 verbatim parent quotes are logged.
                  </p>
                </div>
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
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Week Start
                  </label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    1. Reach / Contacts
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={reach}
                    onChange={(e) => setReach(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    2. Diag Booked
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={booked}
                    onChange={(e) => setBooked(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    3. Diag Completed
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={completed}
                    onChange={(e) => setCompleted(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-teal-700 mb-1">
                    4. Paid ($139/mo)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={paid}
                    onChange={(e) => setPaid(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg border-2 border-teal-500 text-sm font-extrabold text-teal-900"
                  />
                </div>
              </div>

              {/* Verbatim Parent Quotes (Min 2) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Quote className="w-4 h-4 text-teal-600" />
                    Verbatim Parent Objections / Questions Heard This Week (Min 2)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddQuoteField}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Quote
                  </button>
                </div>

                {quotes.map((q, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <select
                      value={q.context_tag}
                      onChange={(e) =>
                        handleQuoteChange(idx, "context_tag", e.target.value)
                      }
                      className="px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 shrink-0"
                    >
                      {CONTEXT_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          tag: {tag}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={q.quote_text}
                      onChange={(e) =>
                        handleQuoteChange(idx, "quote_text", e.target.value)
                      }
                      placeholder={`Exact unedited parent quote #${idx + 1}...`}
                      required={idx < 2}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                ))}
              </div>

              {/* Top Winning Touchpoint */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Top Winning Touchpoint / Channel This Week
                </label>
                <input
                  type="text"
                  value={touchpoint}
                  onChange={(e) => setTouchpoint(e.target.value)}
                  required
                  placeholder="Single conversation or touchpoint that produced the highest positive parent response..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                {!pilotWeek0Used ? (
                  <button
                    type="button"
                    onClick={activatePilotWeek0Override}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition"
                  >
                    ⚡ Use One-Time &ldquo;Pilot Week 0 Bootstrap&rdquo; Override
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Pilot Week 0 Bootstrap override already used.
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRealityGateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Save Weekly Reality Log &amp; Unlock Generation
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
