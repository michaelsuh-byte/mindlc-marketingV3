"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import {
  aggregateMonthlyPerformancePeriod,
  computeCombined3TierBenchmarks,
  getReportingPeriodOptions,
} from "@/services/marketingAi";
import { stripMarkdownToCleanText } from "@/components/ChannelAwareDraftRenderer";
import { CalendarReportingMode, TierId } from "@/types/database";
import {
  Calendar,
  Download,
  Edit3,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Lock,
  RotateCcw,
  Trash2,
  X,
  TrendingUp,
  Users,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

type ClosingSubTab = "revenue_tier" | "kpi_scorecard" | "ai_memo_plan";

const TIER_ORDER: TierId[] = ["TIER_1", "TIER_2", "TIER_3"];

export function ClosingAnalyticsView() {
  const {
    tierWorkspaces,
    monthlyPerformanceRecords,
    calendarReportingMode,
    selectedReportingPeriodId,
    fiscalYearStartMonth,
    isSampleSeedActive,
    diagnosticToast,
    clearDiagnosticToast,
    setCalendarReportingMode,
    setSelectedReportingPeriodId,
    setFiscalYearStartMonth,
    updateMonthlyPerformanceTierRecord,
    updateMonthlyMarketingSpend,
    updateMonthlyClosingNotes,
    syncMonthlyActualsFromRealityLogs,
    runAiPeriodReview,
    closeMonthlyPerformancePeriod,
    clearSampleDataAndReset,
    restoreSampleDataSeed,
  } = useMarketingStore();

  const [activeSubTab, setActiveSubTab] =
    useState<ClosingSubTab>("revenue_tier");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingMonthId, setEditingMonthId] = useState<string>("2026-11");
  const [editingSide, setEditingSide] = useState<"actuals" | "targets">(
    "actuals"
  );
  const [showExportMenu, setShowExportMenu] = useState(false);

  const periodOptions = getReportingPeriodOptions(
    calendarReportingMode,
    fiscalYearStartMonth
  );
  const activePeriodOption =
    periodOptions.find((p) => p.id === selectedReportingPeriodId) ||
    periodOptions[0];

  const rollup = aggregateMonthlyPerformancePeriod(
    monthlyPerformanceRecords,
    activePeriodOption?.monthIds || ["2026-09", "2026-10", "2026-11"]
  );

  const combinedBenchmarks = computeCombined3TierBenchmarks(tierWorkspaces);

  const activeEditingRecord =
    monthlyPerformanceRecords.find((r) => r.month_id === editingMonthId) ||
    monthlyPerformanceRecords[monthlyPerformanceRecords.length - 1];

  const latestPeriodMonthRecord =
    monthlyPerformanceRecords
      .filter((r) => rollup.monthsIncluded.includes(r.month_id))
      .slice(-1)[0] ||
    monthlyPerformanceRecords[monthlyPerformanceRecords.length - 1];

  // Export JSON or CSV for Finance & Accounting App interoperability
  const handleExportLedger = (format: "json" | "csv") => {
    setShowExportMenu(false);
    if (format === "json") {
      const payload = {
        exported_at: new Date().toISOString(),
        reporting_mode: calendarReportingMode,
        period_id: activePeriodOption?.id,
        fiscal_year_start_month: fiscalYearStartMonth,
        monthly_records: monthlyPerformanceRecords,
        aggregated_period_kpis: rollup,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mindlc-monthly-ledger-${activePeriodOption?.id || "all"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // CSV Export
    const headers = [
      "month_id",
      "status",
      "tier_id",
      "unit_price_cad",
      "tier3_intensive_addon_count",
      "starting_paid_students",
      "new_leads",
      "diagnostics_or_consults_completed",
      "new_paid_students",
      "referral_or_organic_new_students",
      "upgraded_to_higher_tier",
      "churned_students",
      "ending_paid_students",
      "cash_collected_cad",
      "recognized_mrr_cad",
      "paid_ads_cad",
      "events_seminars_cad",
      "referral_credits_cad",
      "marketing_tools_cad",
    ];
    const rows: string[] = [headers.join(",")];
    for (const rec of monthlyPerformanceRecords) {
      for (const tid of TIER_ORDER) {
        const act = rec.actuals[tid];
        rows.push(
          [
            rec.month_id,
            rec.status,
            tid,
            act.unit_price_cad,
            act.tier3_intensive_addon_count || 0,
            act.starting_paid_students,
            act.new_leads,
            act.diagnostics_or_consults_completed,
            act.new_paid_students,
            act.referral_or_organic_new_students,
            act.upgraded_to_higher_tier,
            act.churned_students,
            act.ending_paid_students,
            act.cash_collected_cad,
            act.recognized_mrr_cad,
            rec.spend_actual.paid_ads_cad,
            rec.spend_actual.events_seminars_cad,
            rec.spend_actual.referral_credits_cad,
            rec.spend_actual.marketing_tools_cad,
          ].join(",")
        );
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindlc-monthly-ledger-${activePeriodOption?.id || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAttainmentBadgeClass = (pct: number) => {
    if (pct >= 100) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (pct >= 80) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    return "bg-rose-50 text-rose-800 border-rose-200";
  };

  // Max value for clean stacked bar chart scaling
  const maxBarRevenue = Math.max(
    1,
    rollup.targetKpis.recognizedRevenueCad,
    rollup.actualKpis.recognizedRevenueCad
  );

  // 10 Standard Marketing KPIs + MER Table Definition
  const kpiScorecardRows = [
    {
      id: "kpi-1",
      name: "1. Period Recognized Revenue (CAD)",
      formulaTooltip:
        "Sum of monthly earned revenue across all months in period (includes amortized 5-mo Semester Passes and Tier 3 +$250/mo 8×60-min add-ons).",
      targetStr: `$${rollup.targetKpis.recognizedRevenueCad.toLocaleString()} CAD`,
      actualStr: `$${rollup.actualKpis.recognizedRevenueCad.toLocaleString()} CAD (Cash: $${rollup.actualKpis.cashCollectedCad.toLocaleString()} · End MRR: $${rollup.actualKpis.endingMrrCad.toLocaleString()})`,
      varianceStr: `${
        rollup.actualKpis.recognizedRevenueCad >=
        rollup.targetKpis.recognizedRevenueCad
          ? "+"
          : ""
      }$${(
        rollup.actualKpis.recognizedRevenueCad -
        rollup.targetKpis.recognizedRevenueCad
      ).toLocaleString()} (${rollup.revenueAttainmentPct}%)`,
      status:
        rollup.revenueAttainmentPct >= 100
          ? "green"
          : rollup.revenueAttainmentPct >= 80
          ? "amber"
          : "rose",
    },
    {
      id: "kpi-2",
      name: "2. Blended ARPA (Average Revenue Per Account)",
      formulaTooltip:
        "Ending Monthly Recognized Revenue (MRR) ÷ Ending Paid Students across Tier 1 ($39), Tier 2 ($139), and Tier 3 ($399/$649).",
      targetStr: `$${rollup.targetKpis.blendedArpaCad.toFixed(2)} /mo`,
      actualStr: `$${rollup.actualKpis.blendedArpaCad.toFixed(2)} /mo`,
      varianceStr: `${
        rollup.actualKpis.blendedArpaCad >= rollup.targetKpis.blendedArpaCad
          ? "+"
          : ""
      }$${(
        rollup.actualKpis.blendedArpaCad - rollup.targetKpis.blendedArpaCad
      ).toFixed(2)}`,
      status:
        rollup.actualKpis.blendedArpaCad >= rollup.targetKpis.blendedArpaCad
          ? "green"
          : "amber",
    },
    {
      id: "kpi-3",
      name: "3. CPL — Cost Per Lead",
      formulaTooltip:
        "Total Marketing Spend (Paid Ads + Events/Seminars + Referral Credits + Tools) ÷ Total New Leads.",
      targetStr:
        rollup.targetKpis.cplCad !== null
          ? `$${rollup.targetKpis.cplCad.toFixed(2)} CAD`
          : "N/A (0 leads)",
      actualStr:
        rollup.actualKpis.cplCad !== null
          ? `$${rollup.actualKpis.cplCad.toFixed(2)} CAD`
          : "N/A (0 leads)",
      varianceStr:
        rollup.actualKpis.cplCad !== null && rollup.targetKpis.cplCad !== null
          ? `$${(rollup.actualKpis.cplCad - rollup.targetKpis.cplCad).toFixed(
              2
            )}`
          : "0.0%",
      status:
        rollup.actualKpis.cplCad !== null &&
        rollup.targetKpis.cplCad !== null &&
        rollup.actualKpis.cplCad <= rollup.targetKpis.cplCad * 1.1
          ? "green"
          : "amber",
    },
    {
      id: "kpi-4",
      name: "4. Blended CAC — Customer Acquisition Cost",
      formulaTooltip:
        "Total Period Marketing Spend ÷ Total New Paid Students Acquired.",
      targetStr:
        rollup.targetKpis.blendedCacCad !== null
          ? `$${rollup.targetKpis.blendedCacCad.toFixed(2)} CAD`
          : "N/A",
      actualStr:
        rollup.actualKpis.blendedCacCad !== null
          ? `$${rollup.actualKpis.blendedCacCad.toFixed(2)} CAD`
          : "N/A (0 new paid)",
      varianceStr:
        rollup.actualKpis.blendedCacCad !== null &&
        rollup.targetKpis.blendedCacCad !== null
          ? `$${(
              rollup.actualKpis.blendedCacCad - rollup.targetKpis.blendedCacCad
            ).toFixed(2)}`
          : "N/A",
      status:
        rollup.actualKpis.blendedCacCad !== null &&
        rollup.targetKpis.blendedCacCad !== null &&
        rollup.actualKpis.blendedCacCad <= rollup.targetKpis.blendedCacCad * 1.15
          ? "green"
          : "amber",
    },
    {
      id: "kpi-5",
      name: "5. Organic & Referral Share (%)",
      formulaTooltip:
        "(Referral & Organic New Paid Students ÷ Total New Paid Students) × 100.",
      targetStr: `${rollup.targetKpis.organicReferralSharePct}%`,
      actualStr: `${rollup.actualKpis.organicReferralSharePct}% (${rollup.actualKpis.referralOrOrganicNew}/${rollup.actualKpis.newPaidStudents})`,
      varianceStr: `${(
        rollup.actualKpis.organicReferralSharePct -
        rollup.targetKpis.organicReferralSharePct
      ).toFixed(1)} pts`,
      status:
        rollup.actualKpis.organicReferralSharePct >=
        rollup.targetKpis.organicReferralSharePct
          ? "green"
          : "amber",
    },
    {
      id: "kpi-6",
      name: "6. Lead-to-Diagnostic/Consult Rate (%)",
      formulaTooltip:
        "(Completed Diagnostics & Consultations ÷ Total New Leads) × 100.",
      targetStr: `${rollup.targetKpis.leadToDiagRatePct}%`,
      actualStr: `${rollup.actualKpis.leadToDiagRatePct}% (${rollup.actualKpis.diagnosticsCompleted}/${rollup.actualKpis.newLeads})`,
      varianceStr: `${(
        rollup.actualKpis.leadToDiagRatePct -
        rollup.targetKpis.leadToDiagRatePct
      ).toFixed(1)} pts`,
      status:
        rollup.actualKpis.leadToDiagRatePct >=
        rollup.targetKpis.leadToDiagRatePct
          ? "green"
          : "amber",
    },
    {
      id: "kpi-7",
      name: "7. Diagnostic-to-Paid Conversion Rate (%)",
      formulaTooltip:
        "(Total New Paid Students ÷ Completed Diagnostics & Consultations) × 100.",
      targetStr: `${rollup.targetKpis.diagToPaidRatePct}%`,
      actualStr: `${rollup.actualKpis.diagToPaidRatePct}% (${rollup.actualKpis.newPaidStudents}/${rollup.actualKpis.diagnosticsCompleted})`,
      varianceStr: `${(
        rollup.actualKpis.diagToPaidRatePct -
        rollup.targetKpis.diagToPaidRatePct
      ).toFixed(1)} pts`,
      status:
        rollup.actualKpis.diagToPaidRatePct >=
        rollup.targetKpis.diagToPaidRatePct
          ? "green"
          : "amber",
    },
    {
      id: "kpi-8",
      name: "8. Tier Upgrade Rate (T1→T2 & T2→T3 %)",
      formulaTooltip:
        "(Students Upgraded to Higher Tier ÷ Starting Lower-Tier Students) × 100.",
      targetStr: `${rollup.targetKpis.tierUpgradeRatePct}%`,
      actualStr: `${rollup.actualKpis.tierUpgradeRatePct}% (${rollup.actualKpis.upgradedStudents} upgrades)`,
      varianceStr: `${(
        rollup.actualKpis.tierUpgradeRatePct -
        rollup.targetKpis.tierUpgradeRatePct
      ).toFixed(1)} pts`,
      status:
        rollup.actualKpis.tierUpgradeRatePct >=
        rollup.targetKpis.tierUpgradeRatePct
          ? "green"
          : "amber",
    },
    {
      id: "kpi-9",
      name: "9. Average Monthly Logo Churn (%)",
      formulaTooltip:
        "((Total Churned Students ÷ Average Active Students) ÷ Months in Period) × 100.",
      targetStr: `${rollup.targetKpis.avgMonthlyLogoChurnPct}% /mo`,
      actualStr: `${rollup.actualKpis.avgMonthlyLogoChurnPct}% /mo (${rollup.actualKpis.churnedStudents} churned)`,
      varianceStr: `${(
        rollup.actualKpis.avgMonthlyLogoChurnPct -
        rollup.targetKpis.avgMonthlyLogoChurnPct
      ).toFixed(2)} pts`,
      status:
        rollup.actualKpis.avgMonthlyLogoChurnPct <=
        Math.max(5, rollup.targetKpis.avgMonthlyLogoChurnPct + 1)
          ? "green"
          : "rose",
    },
    {
      id: "kpi-10",
      name: "10. LTV : CAC Ratio & CAC Payback (Months)",
      formulaTooltip:
        "LTV = Blended ARPA ÷ Monthly Churn Rate (conservatively capped at 10 months / 2 Ontario semesters if churn is 0%). Payback = Blended CAC ÷ Blended ARPA.",
      targetStr:
        rollup.targetKpis.ltvToCacRatio !== null
          ? `${rollup.targetKpis.ltvToCacRatio}x (${rollup.targetKpis.cacPaybackMonths} mo payback)`
          : "N/A",
      actualStr:
        rollup.actualKpis.ltvToCacRatio !== null
          ? `${rollup.actualKpis.ltvToCacRatio}x (${rollup.actualKpis.cacPaybackMonths} mo payback · LTV $${rollup.actualKpis.ltvCad})`
          : `N/A (LTV $${rollup.actualKpis.ltvCad})`,
      varianceStr:
        rollup.actualKpis.ltvToCacRatio !== null &&
        rollup.targetKpis.ltvToCacRatio !== null
          ? `${(
              rollup.actualKpis.ltvToCacRatio - rollup.targetKpis.ltvToCacRatio
            ).toFixed(1)}x`
          : "N/A",
      status:
        rollup.actualKpis.ltvToCacRatio === null ||
        rollup.actualKpis.ltvToCacRatio >= 3
          ? "green"
          : "amber",
    },
    {
      id: "kpi-11",
      name: "11. MER — Marketing Efficiency Ratio (Recognized Rev / Spend)",
      formulaTooltip:
        "Period Recognized Revenue (CAD) ÷ Total Period Marketing Spend (CAD).",
      targetStr:
        rollup.targetKpis.merRatio !== null
          ? `${rollup.targetKpis.merRatio}x`
          : "N/A ($0 spend)",
      actualStr:
        rollup.actualKpis.merRatio !== null
          ? `${rollup.actualKpis.merRatio}x ($${rollup.actualKpis.recognizedRevenueCad.toLocaleString()} / $${rollup.actualKpis.totalSpendCad.toLocaleString()})`
          : "N/A ($0 spend)",
      varianceStr:
        rollup.actualKpis.merRatio !== null &&
        rollup.targetKpis.merRatio !== null
          ? `${(
              rollup.actualKpis.merRatio - rollup.targetKpis.merRatio
            ).toFixed(2)}x`
          : "N/A",
      status:
        rollup.actualKpis.merRatio === null || rollup.actualKpis.merRatio >= 3
          ? "green"
          : "amber",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50/70 pb-20">
      {/* =================================================================== */}
      {/* 1. CONTROL STRIP (Calendar View Toggle + Period Dropdown + Actions) */}
      {/* =================================================================== */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-[56px] z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Calendar View Toggle + Period Dropdown + Status Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { id: "ONTARIO_ACADEMIC", label: "Academic Term (Sem 1/2)" },
                  { id: "ACADEMIC_QUARTER", label: "Academic Qtr (AQ1–4)" },
                  { id: "FISCAL_QUARTER", label: "Fiscal Quarter (Q1–Q4)" },
                ] as { id: CalendarReportingMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setCalendarReportingMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    calendarReportingMode === m.id
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {calendarReportingMode === "FISCAL_QUARTER" && (
              <select
                value={fiscalYearStartMonth}
                onChange={(e) =>
                  setFiscalYearStartMonth(
                    Number(e.target.value) === 9 ? 9 : 1
                  )
                }
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
                title="Configurable Fiscal Year Start Month"
              >
                <option value={1}>FY Start: Jan 1</option>
                <option value={9}>FY Start: Sep 1</option>
              </select>
            )}

            {/* Period Selector Dropdown */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={activePeriodOption?.id || ""}
                onChange={(e) => setSelectedReportingPeriodId(e.target.value)}
                className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                rollup.statusLabel === "CLOSED"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : rollup.statusLabel === "IN_PROGRESS"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  rollup.statusLabel === "CLOSED"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              {rollup.statusLabel} ({rollup.monthsIncluded.join(", ")})
            </span>
          </div>

          {/* Right: Action Buttons ([✏️ Log Monthly Data], [✨ AI Period Review], [⬇️ Export Ledger], Sample Data Reset) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Log Monthly Data</span>
            </button>

            <button
              onClick={() =>
                runAiPeriodReview(activePeriodOption?.label || "Current Period")
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Period Review</span>
            </button>

            {/* Export Monthly Ledger Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Monthly Ledger</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40">
                  <button
                    onClick={() => handleExportLedger("json")}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Export Finance JSON</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      .json
                    </span>
                  </button>
                  <button
                    onClick={() => handleExportLedger("csv")}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Export Finance CSV</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      .csv
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Sample Data Reset / Restore Button (Section 5) */}
            {isSampleSeedActive ? (
              <button
                onClick={clearSampleDataAndReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 transition-colors"
                title="Clear sample data seed (2026-09, 2026-10, 2026-11) to test zero-division safety and live inputs"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Sample Data</span>
              </button>
            ) : (
              <button
                onClick={restoreSampleDataSeed}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Sample Seed</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {diagnosticToast && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between gap-3 shadow-md">
            <span>{diagnosticToast}</span>
            <button
              onClick={clearDiagnosticToast}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* ================================================================= */}
        {/* 2. EXECUTIVE SUMMARY STRIP (4 Clean KPI Cards Only)               */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Period Gross Revenue */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                1. Period Recognized Revenue
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getAttainmentBadgeClass(
                  rollup.revenueAttainmentPct
                )}`}
              >
                {rollup.revenueAttainmentPct}% of Target
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                ${rollup.actualKpis.recognizedRevenueCad.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">
                / ${rollup.targetKpis.recognizedRevenueCad.toLocaleString()} CAD
              </span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Cash Collected:{" "}
                <strong className="font-mono text-emerald-700">
                  ${rollup.actualKpis.cashCollectedCad.toLocaleString()}
                </strong>
              </span>
              <span>
                End MRR:{" "}
                <strong className="font-mono text-slate-800">
                  ${rollup.actualKpis.endingMrrCad.toLocaleString()}
                </strong>
              </span>
            </div>
          </div>

          {/* Card 2: Ending Paid Students */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                2. Ending Paid Students
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getAttainmentBadgeClass(
                  rollup.studentAttainmentPct
                )}`}
              >
                {rollup.studentAttainmentPct}% of Target
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {rollup.actualKpis.endingStudents}
              </span>
              <span className="text-xs font-mono text-slate-400">
                / {rollup.targetKpis.endingStudents} students
              </span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>
                T1: <strong>{rollup.byTierActual.TIER_1.ending_paid_students}</strong>
              </span>
              <span>
                T2: <strong>{rollup.byTierActual.TIER_2.ending_paid_students}</strong>
              </span>
              <span>
                T3:{" "}
                <strong>
                  {rollup.byTierActual.TIER_3.ending_paid_students}
                </strong>{" "}
                ({rollup.byTierActual.TIER_3.tier3_intensive_addon_count} 8×60m)
              </span>
            </div>
          </div>

          {/* Card 3: Acquisition Efficiency (Blended CAC + MER) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                3. Acquisition Efficiency
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                MER:{" "}
                {rollup.actualKpis.merRatio !== null
                  ? `${rollup.actualKpis.merRatio}x`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {rollup.actualKpis.blendedCacCad !== null
                  ? `$${rollup.actualKpis.blendedCacCad}`
                  : "N/A"}
              </span>
              <span className="text-xs text-slate-400">Blended CAC (CAD)</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Spend:{" "}
                <strong className="font-mono text-slate-800">
                  ${rollup.actualKpis.totalSpendCad.toLocaleString()}
                </strong>
              </span>
              <span>
                Organic/Ref:{" "}
                <strong className="font-mono text-emerald-700">
                  {rollup.actualKpis.organicReferralSharePct}%
                </strong>
              </span>
            </div>
          </div>

          {/* Card 4: Retention & Unit Health (Monthly Churn % + LTV : CAC) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                4. Retention &amp; Unit Health
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                LTV:CAC{" "}
                {rollup.actualKpis.ltvToCacRatio !== null
                  ? `${rollup.actualKpis.ltvToCacRatio}x`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {rollup.actualKpis.avgMonthlyLogoChurnPct}%
              </span>
              <span className="text-xs text-slate-400">
                Avg Monthly Logo Churn
              </span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Blended ARPA:{" "}
                <strong className="font-mono text-slate-800">
                  ${rollup.actualKpis.blendedArpaCad}
                </strong>
              </span>
              <span>
                Payback:{" "}
                <strong className="font-mono text-slate-800">
                  {rollup.actualKpis.cacPaybackMonths ?? 0} mo
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. THREE CLICK-TO-SWITCH SUB-TABS (Prevent Visual Clutter)        */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab("revenue_tier")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "revenue_tier"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              A. Revenue &amp; Tier Breakdown (+ Unit Economics)
            </button>
            <button
              onClick={() => setActiveSubTab("kpi_scorecard")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "kpi_scorecard"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              B. Marketing KPI Scorecard (10 KPIs + MER)
            </button>
            <button
              onClick={() => setActiveSubTab("ai_memo_plan")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "ai_memo_plan"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              C. AI Closing Memo, Hiring Roadmap &amp; Next Plan
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUB-TAB A: REVENUE & TIER BREAKDOWN + 1 STACKED BAR CHART         */}
        {/* ================================================================= */}
        {activeSubTab === "revenue_tier" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Target vs Actual Variance Table by Tier 1 / Tier 2 / Tier 3 + Totals */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Period Revenue &amp; Student Variance by Tier (CAD)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Separates Cash Collected (5-mo upfront passes) from
                      Recognized Monthly Revenue
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {rollup.monthsIncluded.join(" · ")}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-3 px-4">Product Tier</th>
                        <th className="py-3 px-3 text-center">
                          End Students (Act / Tgt)
                        </th>
                        <th className="py-3 px-3 text-right">
                          Target Recognized Rev
                        </th>
                        <th className="py-3 px-3 text-right">
                          Actual Recognized Rev
                        </th>
                        <th className="py-3 px-3 text-right">
                          Actual Cash Collected
                        </th>
                        <th className="py-3 px-3 text-center">Attainment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {TIER_ORDER.map((tid) => {
                        const ws = tierWorkspaces[tid];
                        const tSide = rollup.byTierTarget[tid];
                        const aSide = rollup.byTierActual[tid];
                        const attPct =
                          tSide.recognized_mrr_cad > 0
                            ? Number(
                                (
                                  (aSide.recognized_mrr_cad /
                                    tSide.recognized_mrr_cad) *
                                  100
                                ).toFixed(1)
                              )
                            : 0;

                        return (
                          <tr key={tid} className="hover:bg-slate-50/80">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">
                                {ws.tier_name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                ${ws.pricing_config.base_monthly_cad}/mo · 5-Mo
                                Pass ${ws.pricing_config.semester_pass_5mo_cad}{" "}
                                · Sibling +$
                                {ws.pricing_config.sibling_addon_monthly_cad}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono">
                              <strong className="text-slate-900">
                                {aSide.ending_paid_students}
                              </strong>{" "}
                              <span className="text-slate-400">
                                / {tSide.ending_paid_students}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                              ${tSide.recognized_mrr_cad.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                              ${aSide.recognized_mrr_cad.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                              ${aSide.cash_collected_cad.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getAttainmentBadgeClass(
                                  attPct
                                )}`}
                              >
                                {attPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Totals Row */}
                      <tr className="bg-slate-50 font-semibold text-slate-900">
                        <td className="py-3.5 px-4">
                          Combined 3-Tier Period Total
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono">
                          {rollup.actualKpis.endingStudents} /{" "}
                          {rollup.targetKpis.endingStudents}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          $
                          {rollup.targetKpis.recognizedRevenueCad.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold">
                          $
                          {rollup.actualKpis.recognizedRevenueCad.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-800">
                          ${rollup.actualKpis.cashCollectedCad.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getAttainmentBadgeClass(
                              rollup.revenueAttainmentPct
                            )}`}
                          >
                            {rollup.revenueAttainmentPct}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ONE Clean Stacked Bar Chart Comparing Target vs Actual Revenue by Tier */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Target vs. Actual Revenue by Tier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visual stacked comparison for {activePeriodOption?.label}
                  </p>
                </div>

                <div className="space-y-5 py-2">
                  {/* Target Stacked Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        Period Target
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        $
                        {rollup.targetKpis.recognizedRevenueCad.toLocaleString()}{" "}
                        CAD
                      </span>
                    </div>
                    <div className="h-7 w-full bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200">
                      <div
                        style={{
                          width: `${
                            (rollup.byTierTarget.TIER_1.recognized_mrr_cad /
                              maxBarRevenue) *
                            100
                          }%`,
                        }}
                        className="bg-sky-400 h-full"
                        title={`Tier 1 Target: $${rollup.byTierTarget.TIER_1.recognized_mrr_cad}`}
                      />
                      <div
                        style={{
                          width: `${
                            (rollup.byTierTarget.TIER_2.recognized_mrr_cad /
                              maxBarRevenue) *
                            100
                          }%`,
                        }}
                        className="bg-indigo-500 h-full"
                        title={`Tier 2 Target: $${rollup.byTierTarget.TIER_2.recognized_mrr_cad}`}
                      />
                      <div
                        style={{
                          width: `${
                            (rollup.byTierTarget.TIER_3.recognized_mrr_cad /
                              maxBarRevenue) *
                            100
                          }%`,
                        }}
                        className="bg-emerald-500 h-full"
                        title={`Tier 3 Target: $${rollup.byTierTarget.TIER_3.recognized_mrr_cad}`}
                      />
                    </div>
                  </div>

                  {/* Actual Stacked Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">
                        Period Actual (Recognized)
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        $
                        {rollup.actualKpis.recognizedRevenueCad.toLocaleString()}{" "}
                        CAD
                      </span>
                    </div>
                    <div className="h-7 w-full bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200">
                      <div
                        style={{
                          width: `${
                            (rollup.byTierActual.TIER_1.recognized_mrr_cad /
                              maxBarRevenue) *
                            100
                          }%`,
                        }}
                        className="bg-sky-500 h-full"
                        title={`Tier 1 Actual: $${rollup.byTierActual.TIER_1.recognized_mrr_cad}`}
                      />
                      <div
                        style={{
                          width: `${
                            (rollup.byTierActual.TIER_2.recognized_mrr_cad /
                              maxBarRevenue) *
                            100
                          }%`,
                        }}
                        className="bg-indigo-600 h-full"
                        title={`Tier 2 Actual: $${rollup.byTierActual.TIER_2.recognized_mrr_cad}`}
                      />
                      <div
                        style={{
                          width: `${
                            (rollup.byTierActual.TIER_3.recognized_mrr_cad /
                              maxBarRevenue) *
                            100
                          }%`,
                        }}
                        className="bg-emerald-600 h-full"
                        title={`Tier 3 Actual: $${rollup.byTierActual.TIER_3.recognized_mrr_cad}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
                    Tier 1 ($39)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
                    Tier 2 ($139)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                    Tier 3 ($399 / $649)
                  </span>
                </div>
              </div>
            </div>

            {/* Unit Economics & Contribution Margin Reference Table (From Google Docs Team Pricing Proposal) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Approved Unit Economics &amp; Monthly Contribution Margin per
                    Student (CAD)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Includes AI API ($9.00), Stripe (2.9% + $0.30), Learning
                    Manager ($26/hr + 12% load = $29.12/hr), and Online STEM
                    Tutor ($40/hr + 12% load = $44.80/hr)
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  25–30 Min Monthly Briefing (25m Avg vs. 30m Max Sensitivity)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-4">Product Tier / Option</th>
                      <th className="py-2.5 px-3 text-right">Monthly Price</th>
                      <th className="py-2.5 px-3 text-right">AI API</th>
                      <th className="py-2.5 px-3 text-right">
                        Manager / Briefing (25m Avg)
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Live 1:1 Tutor (60m)
                      </th>
                      <th className="py-2.5 px-3 text-right">Stripe Fee</th>
                      <th className="py-2.5 px-3 text-right">
                        Contribution Margin (25m Avg)
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        30-Min Max Conservative Floor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        Tier 1 · Online Self-Coach (Automated)
                      </td>
                      <td className="py-2.5 px-3 text-right">$39.00</td>
                      <td className="py-2.5 px-3 text-right">$9.00</td>
                      <td className="py-2.5 px-3 text-right">$0.00</td>
                      <td className="py-2.5 px-3 text-right">$0.00</td>
                      <td className="py-2.5 px-3 text-right">$1.43</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        $28.57 (73.3%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        $28.57 (73.3%)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        Tier 2 · Managed Hybrid (Core Growth Engine)
                      </td>
                      <td className="py-2.5 px-3 text-right">$139.00</td>
                      <td className="py-2.5 px-3 text-right">$9.00</td>
                      <td className="py-2.5 px-3 text-right">$29.12</td>
                      <td className="py-2.5 px-3 text-right">$0.00</td>
                      <td className="py-2.5 px-3 text-right">$4.33</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        $96.55 (69.5%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        $94.12 (67.7%)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        Tier 3 · Prime 1:1 (4×60m/mo · Tutor-Integrated Briefing)
                      </td>
                      <td className="py-2.5 px-3 text-right">$399.00</td>
                      <td className="py-2.5 px-3 text-right">$9.00</td>
                      <td className="py-2.5 px-3 text-right">$18.67</td>
                      <td className="py-2.5 px-3 text-right">$179.20</td>
                      <td className="py-2.5 px-3 text-right">$11.87</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        $180.26 (45.2%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        $176.53 (44.2%)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-indigo-900">
                        Tier 3+ Intensive Add-on (8×60m/mo · +$250/mo)
                      </td>
                      <td className="py-2.5 px-3 text-right">$649.00</td>
                      <td className="py-2.5 px-3 text-right">$9.00</td>
                      <td className="py-2.5 px-3 text-right">$18.67</td>
                      <td className="py-2.5 px-3 text-right">$358.40</td>
                      <td className="py-2.5 px-3 text-right">$19.12</td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        $243.81 (37.6%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        $240.08 (37.0%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB B: MARKETING KPI SCORECARD (10 KPIs + MER with Tooltips)  */}
        {/* ================================================================= */}
        {activeSubTab === "kpi_scorecard" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  10 Standard Marketing KPIs + MER Scorecard (
                  {activePeriodOption?.label})
                </h3>
                <p className="text-xs text-slate-500">
                  All ratios recomputed from aggregated period flow &amp;
                  snapshot totals (hover any KPI row to inspect formula)
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Paid Ads: ${rollup.actualKpis.spendBreakdown.paid_ads_cad} ·
                Events: ${rollup.actualKpis.spendBreakdown.events_seminars_cad}{" "}
                · Referrals: $
                {rollup.actualKpis.spendBreakdown.referral_credits_cad} · Tools:
                ${rollup.actualKpis.spendBreakdown.marketing_tools_cad}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-3 px-4">
                      Marketing KPI (Hover for Formula)
                    </th>
                    <th className="py-3 px-4 text-right">Period Target</th>
                    <th className="py-3 px-4 text-right">Period Actual</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {kpiScorecardRows.map((row) => (
                    <tr
                      key={row.id}
                      title={row.formulaTooltip}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <span>{row.name}</span>
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {row.formulaTooltip}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {row.targetStr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {row.actualStr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {row.varianceStr}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            row.status === "green"
                              ? "bg-emerald-500"
                              : row.status === "amber"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB C: AI CLOSING MEMO, HIRING ROADMAP & NEXT PLAN            */}
        {/* ================================================================= */}
        {activeSubTab === "ai_memo_plan" && latestPeriodMonthRecord && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Cleanly Rendered AI Period Debrief + CMO Closing Notes */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      AI Period Debrief &amp; Funnel Bottleneck Audit (Zero Raw
                      Markdown)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {latestPeriodMonthRecord.month_id}
                  </span>
                </div>

                <div className="text-[14.5px] leading-[1.7] text-slate-800 whitespace-pre-wrap">
                  {stripMarkdownToCleanText(
                    latestPeriodMonthRecord.ai_diagnostic_summary ||
                      "Click 'AI Period Review' in the top control strip to generate an automated period debrief."
                  )}
                </div>
              </div>

              {/* Editable CMO Closing Notes & Close Period Action */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Acting CMO Closing Notes ({latestPeriodMonthRecord.month_id})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Closing this period locks the month and rolls ending
                      student counts forward to next month&apos;s starting
                      baseline.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      latestPeriodMonthRecord.status === "CLOSED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {latestPeriodMonthRecord.status}
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={latestPeriodMonthRecord.closing_notes}
                  onChange={(e) =>
                    updateMonthlyClosingNotes(
                      latestPeriodMonthRecord.month_id,
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() =>
                      closeMonthlyPerformancePeriod(
                        latestPeriodMonthRecord.month_id
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      Close Period ({latestPeriodMonthRecord.month_id}) &amp;
                      Roll Baselines Forward
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Ontario Labor Law Hiring & Manager Expansion Roadmap + Stage Contribution Margin */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Learning Manager Expansion Roadmap (Ontario ESA)
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">
                      Phase 1 · Pilot (1–20 Paid Students)
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Founder-led Learning Manager execution (~14.0–14.8 hrs/mo
                      at 10 students) with shadow ledger labor allocation ($300
                      base + $20/student) to prevent P&amp;L margin shock.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200">
                    <div className="font-semibold text-indigo-950">
                      Phase 2 · Part-Time Handover (Start at 18–20 → Handover at
                      25 Paid)
                    </div>
                    <p className="text-[11px] text-indigo-900 mt-0.5 leading-relaxed">
                      Initiate Ontario Vulnerable Sector Check (VSC, 2–6 wks) at
                      18–20 students ($2,500–$2,780 MRR). Full handover at 25
                      students ($3,475 MRR, $2,297 contribution margin / 66.1%
                      at $26/hr + 12% statutory load + $4/student 90-day
                      retention bonus).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">
                      Phase 3 · Full-Time Lead Transition (120+ Paid Students)
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Maintain 1–2 part-time managers from 25–100 students.
                      Promote top part-time manager to Full-Time Operations Lead
                      ($54,080/yr, $5,047/mo employer load) at 120 Tier 2
                      students ($16,680 MRR, $10,033 contribution margin /
                      60.1%).
                    </p>
                  </div>
                </div>
              </div>

              {/* Stage 1–3 Expected Contribution Margin Summary */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  3-Stage Combined Revenue &amp; Contribution Margin
                </div>
                <div className="space-y-2.5 text-xs">
                  {combinedBenchmarks.map((b, i) => (
                    <div
                      key={b.stageId}
                      className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>
                          Stage {i + 1} ({b.totalStudents} students · ARPA $
                          {b.blendedArpa})
                        </span>
                        <span className="font-mono text-emerald-400">
                          ${b.mrr.toLocaleString()}/mo MRR
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                        <span>
                          Contribution Margin (25m avg): $
                          {b.monthlyContributionMarginAvg25.toLocaleString()}/mo
                          ({b.contributionMarginPctAvg25}%)
                        </span>
                        <span className="text-slate-400">
                          30m floor: $
                          {b.monthlyContributionMarginMax30.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4. MODAL: [✏️ Log Monthly Data] WITH "SYNC FROM REALITY LOGS"       */}
      {/* =================================================================== */}
      {isLogModalOpen && activeEditingRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsLogModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Log Monthly Atomic Ledger Data (YYYY-MM)
                </h2>
                <select
                  value={editingMonthId}
                  onChange={(e) => setEditingMonthId(e.target.value)}
                  className="text-xs font-mono font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                >
                  {monthlyPerformanceRecords.map((r) => (
                    <option key={r.month_id} value={r.month_id}>
                      {r.month_id} · {r.month_label || r.status}
                    </option>
                  ))}
                </select>

                <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditingSide("actuals")}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      editingSide === "actuals"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    Actuals
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSide("targets")}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      editingSide === "targets"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    Targets
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    syncMonthlyActualsFromRealityLogs(editingMonthId)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync from Weekly Reality Logs</span>
                </button>
                <button
                  onClick={() => setIsLogModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* 3-Tier Student & Revenue Inputs */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-2 text-center">Start Paid</th>
                      <th className="py-2.5 px-2 text-center">New Leads</th>
                      <th className="py-2.5 px-2 text-center">Diag/Consult</th>
                      <th className="py-2.5 px-2 text-center">New Paid</th>
                      <th className="py-2.5 px-2 text-center">Ref/Organic</th>
                      <th className="py-2.5 px-2 text-center">Upgraded</th>
                      <th className="py-2.5 px-2 text-center">Churned</th>
                      <th className="py-2.5 px-2 text-center">5-Mo Pass</th>
                      <th className="py-2.5 px-2 text-center">
                        T3 +$250 (8×60m)
                      </th>
                      <th className="py-2.5 px-3 text-right">End Paid</th>
                      <th className="py-2.5 px-3 text-right">
                        Recognized MRR
                      </th>
                      <th className="py-2.5 px-3 text-right">Cash Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {TIER_ORDER.map((tid) => {
                      const rec = activeEditingRecord[editingSide][tid];
                      const ws = tierWorkspaces[tid];
                      return (
                        <tr key={tid}>
                          <td className="py-3 px-3 font-sans font-semibold text-slate-900">
                            {ws.tier_short_name} (${rec.unit_price_cad})
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.starting_paid_students}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    starting_paid_students:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.new_leads}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    new_leads:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-16 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.diagnostics_or_consults_completed}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    diagnostics_or_consults_completed:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.new_paid_students}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    new_paid_students:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.referral_or_organic_new_students}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    referral_or_organic_new_students:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.upgraded_to_higher_tier}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    upgraded_to_higher_tier:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.churned_students}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    churned_students:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec.semester_pass_5mo_count || 0}
                              onChange={(e) =>
                                updateMonthlyPerformanceTierRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  {
                                    semester_pass_5mo_count:
                                      parseInt(e.target.value || "0", 10) || 0,
                                  }
                                )
                              }
                              className="w-14 text-center border border-slate-300 rounded py-1"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            {tid === "TIER_3" ? (
                              <input
                                type="number"
                                min={0}
                                value={rec.tier3_intensive_addon_count || 0}
                                onChange={(e) =>
                                  updateMonthlyPerformanceTierRecord(
                                    editingMonthId,
                                    editingSide,
                                    "TIER_3",
                                    {
                                      tier3_intensive_addon_count:
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-14 text-center border border-indigo-300 bg-indigo-50/40 rounded py-1"
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {rec.ending_paid_students}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            ${rec.recognized_mrr_cad.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-indigo-700">
                            ${rec.cash_collected_cad.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4 Marketing Spend OpEx Categories */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-800">
                  Monthly Marketing Spend Breakdown (4 Finance OpEx Accounts —{" "}
                  {editingSide === "actuals" ? "ActualSpend" : "TargetSpend"})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { key: "paid_ads_cad", label: "1. Paid Ads (CAD)" },
                      {
                        key: "events_seminars_cad",
                        label: "2. Events & Seminars (CAD)",
                      },
                      {
                        key: "referral_credits_cad",
                        label: "3. Referral Credits (CAD)",
                      },
                      {
                        key: "marketing_tools_cad",
                        label: "4. Marketing Tools (CAD)",
                      },
                    ] as const
                  ).map((item) => {
                    const spendSide =
                      editingSide === "actuals"
                        ? "spend_actual"
                        : "spend_target";
                    return (
                      <div key={item.key}>
                        <label className="block text-[11px] font-medium text-slate-600">
                          {item.label}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={activeEditingRecord[spendSide][item.key]}
                          onChange={(e) =>
                            updateMonthlyMarketingSpend(
                              editingMonthId,
                              spendSide,
                              {
                                [item.key]:
                                  parseInt(e.target.value || "0", 10) || 0,
                              }
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Done &amp; Recalculate KPIs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
