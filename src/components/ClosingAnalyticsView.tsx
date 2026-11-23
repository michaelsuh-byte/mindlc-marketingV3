"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import {
  aggregateMonthlyPerformancePeriod,
  computeCombined3TierBenchmarks,
  computeTierUnitEconomics,
  getReportingPeriodOptions,
} from "@/services/marketingAi";
import { stripMarkdownToCleanText } from "@/components/ChannelAwareDraftRenderer";
import { CalendarReportingMode, TierId } from "@/types/database";
import {
  Calendar,
  Download,
  Edit3,
  Sparkles,
  Info,
  RefreshCw,
  Lock,
  RotateCcw,
  Trash2,
  X,
  Users,
  Plus,
  Sliders,
} from "lucide-react";

type ClosingSubTab = "revenue_tier" | "kpi_scorecard" | "ai_memo_plan";

const TIER_ORDER: TierId[] = ["TIER_1", "TIER_2", "TIER_3"];

// Generate extended selectable calendar months from 2026-09 through 2030-12
function generateExtendedMonthOptions(maxYear: number): string[] {
  const list: string[] = [];
  const endYr = Math.max(2028, maxYear + 1);
  for (let yr = 2026; yr <= endYr; yr++) {
    const startMo = yr === 2026 ? 9 : 1;
    for (let mo = startMo; mo <= 12; mo++) {
      list.push(`${yr}-${String(mo).padStart(2, "0")}`);
    }
  }
  return list;
}

export function ClosingAnalyticsView() {
  const {
    tierWorkspaces,
    monthlyPerformanceRecords,
    calendarReportingMode,
    selectedReportingPeriodId,
    fiscalYearStartMonth,
    unitEconomicsCosts,
    maxAcademicStartYear,
    isSampleSeedActive,
    diagnosticToast,
    clearDiagnosticToast,
    setCalendarReportingMode,
    setSelectedReportingPeriodId,
    setFiscalYearStartMonth,
    setMaxAcademicStartYear,
    ensureMonthlyPerformanceRecordExists,
    updateUnitEconomicsCosts,
    updateTierPricingConfig,
    addPromoCohortToMonthlyRecord,
    removePromoCohortFromMonthlyRecord,
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
  const [isEditingUnitEconomics, setIsEditingUnitEconomics] = useState(false);

  // Promotional / Multi-Month Cohort Sale form inside Log Monthly Data Modal
  const [promoTierId, setPromoTierId] = useState<TierId>("TIER_2");
  const [promoLabel, setPromoLabel] = useState<string>(
    "Pilot Early-Bird Promo"
  );
  const [promoAccountsSold, setPromoAccountsSold] = useState<number>(2);
  const [promoMonthsDuration, setPromoMonthsDuration] = useState<number>(3);
  const [promoTotalPriceCad, setPromoTotalPriceCad] = useState<number>(297);

  const periodOptions = getReportingPeriodOptions(
    calendarReportingMode,
    fiscalYearStartMonth,
    maxAcademicStartYear
  );
  const activePeriodOption =
    periodOptions.find((p) => p.id === selectedReportingPeriodId) ||
    periodOptions[0];

  const rollup = aggregateMonthlyPerformancePeriod(
    monthlyPerformanceRecords,
    activePeriodOption?.monthIds || ["2026-09", "2026-10", "2026-11"]
  );

  const unitEconomics = computeTierUnitEconomics(
    tierWorkspaces,
    unitEconomicsCosts
  );
  const combinedBenchmarks = computeCombined3TierBenchmarks(
    tierWorkspaces,
    unitEconomicsCosts
  );

  const extendedMonthList = generateExtendedMonthOptions(maxAcademicStartYear);

  const activeEditingRecord =
    monthlyPerformanceRecords.find((r) => r.month_id === editingMonthId) ||
    monthlyPerformanceRecords[monthlyPerformanceRecords.length - 1];

  const latestPeriodMonthRecord =
    monthlyPerformanceRecords
      .filter((r) => rollup.monthsIncluded.includes(r.month_id))
      .slice(-1)[0] ||
    monthlyPerformanceRecords[monthlyPerformanceRecords.length - 1];

  const handleSelectEditingMonth = (nextMonthId: string) => {
    ensureMonthlyPerformanceRecordExists(nextMonthId);
    setEditingMonthId(nextMonthId);
  };

  const handleAddPromoCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoAccountsSold <= 0 || promoMonthsDuration <= 0) return;
    ensureMonthlyPerformanceRecordExists(editingMonthId);
    addPromoCohortToMonthlyRecord(editingMonthId, editingSide, promoTierId, {
      promo_label: promoLabel.trim() || "Promotional Cohort",
      accounts_sold: Number(promoAccountsSold) || 1,
      months_duration: Math.max(1, Number(promoMonthsDuration) || 1),
      total_price_per_account_cad: Number(promoTotalPriceCad) || 0,
    });
  };

  // Export JSON or CSV for Finance & Accounting App interoperability
  const handleExportLedger = (format: "json" | "csv") => {
    setShowExportMenu(false);
    if (format === "json") {
      const payload = {
        exported_at: new Date().toISOString(),
        reporting_mode: calendarReportingMode,
        period_id: activePeriodOption?.id,
        fiscal_year_start_month: fiscalYearStartMonth,
        unit_economics_assumptions: unitEconomicsCosts,
        monthly_records: monthlyPerformanceRecords,
        aggregated_period_kpis: rollup,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mindlc-monthly-ledger-${
        activePeriodOption?.id || "all"
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      "month_id",
      "status",
      "tier_id",
      "unit_price_cad",
      "discounted_promo_price_cad",
      "discounted_accounts_count",
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
            act.discounted_promo_price_cad ?? act.unit_price_cad,
            act.discounted_accounts_count || 0,
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

  const maxBarRevenue = Math.max(
    1,
    rollup.targetKpis.recognizedRevenueCad,
    rollup.actualKpis.recognizedRevenueCad
  );

  const kpiScorecardRows = [
    {
      id: "kpi-1",
      name: "1. Period Recognized Revenue (CAD)",
      formulaTooltip:
        "Sum of monthly earned revenue across all months in period (includes amortized multi-month cohorts, 5-mo Semester Passes, and Tier 3 +$250/mo 8×60-min add-ons).",
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
        "Ending Monthly Recognized Revenue (MRR) ÷ Ending Paid Students across Tier 1, Tier 2, and Tier 3.",
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
        rollup.actualKpis.blendedCacCad <=
          rollup.targetKpis.blendedCacCad * 1.15
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
        "LTV = Blended ARPA ÷ Monthly Churn Rate (capped at 10 months / 2 Ontario semesters if churn is 0%). Payback = Blended CAC ÷ Blended ARPA.",
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
    <div className="min-h-full bg-slate-50/70 pb-20">
      {/* =================================================================== */}
      {/* 1. CONTROL STRIP (Sticky at top-0 of the scrollable main pane       */}
      {/*    so top lines of panels are NEVER hidden behind the top bar!)     */}
      {/* =================================================================== */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Calendar View Toggle + Period Dropdown + Horizon Extension + Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
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
                  setFiscalYearStartMonth(Number(e.target.value) === 9 ? 9 : 1)
                }
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
                title="Configurable Fiscal Year Start Month"
              >
                <option value={1}>FY Start: Jan 1</option>
                <option value={9}>FY Start: Sep 1</option>
              </select>
            )}

            {/* Period Selector Dropdown (Multi-Year 2026 through maxAcademicStartYear+1) */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
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

            {/* Adjustable Horizon Year Selector (Extendable Beyond 2027 up to 2035) */}
            <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-500 text-[11px]">Horizon:</span>
              <select
                value={maxAcademicStartYear}
                onChange={(e) =>
                  setMaxAcademicStartYear(parseInt(e.target.value, 10) || 2029)
                }
                className="font-mono font-semibold text-slate-800 bg-transparent focus:outline-none"
                title="Extend selectable academic and fiscal periods up to 2035"
              >
                {[2027, 2028, 2029, 2030, 2031, 2032, 2035].map((yr) => (
                  <option key={yr} value={yr}>
                    Through {yr + 1}
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
              onClick={() => {
                const defaultMo =
                  activePeriodOption?.monthIds[0] || editingMonthId;
                ensureMonthlyPerformanceRecordExists(defaultMo);
                setEditingMonthId(defaultMo);
                setIsLogModalOpen(true);
              }}
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
                <span>Export Ledger</span>
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

            {/* Sample Data Reset / Restore Button */}
            {isSampleSeedActive ? (
              <button
                onClick={clearSampleDataAndReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 transition-colors"
                title="Clear sample data seed (2026-09, 2026-10, 2026-11)"
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
        {/* 2. EXECUTIVE SUMMARY STRIP (4 KPI Cards)                          */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Period Gross Revenue */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
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
            <div className="flex items-center justify-between gap-2">
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
                T1:{" "}
                <strong>{rollup.byTierActual.TIER_1.ending_paid_students}</strong>
              </span>
              <span>
                T2:{" "}
                <strong>{rollup.byTierActual.TIER_2.ending_paid_students}</strong>
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
            <div className="flex items-center justify-between gap-2">
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
            <div className="flex items-center justify-between gap-2">
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
        {/* 3. THREE CLICK-TO-SWITCH SUB-TABS                                 */}
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
              A. Revenue &amp; Tier Breakdown (+ Adjustable Unit Economics)
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
        {/* SUB-TAB A: REVENUE & TIER BREAKDOWN + ADJUSTABLE UNIT ECONOMICS   */}
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
                      Separates Cash Collected (multi-month &amp; 5-mo upfront
                      passes) from Recognized Monthly Revenue
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

              {/* Stacked Bar Chart Comparing Target vs Actual Revenue by Tier */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Target vs. Actual Revenue by Tier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Stacked comparison for {activePeriodOption?.label}
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
                    Tier 1 (${tierWorkspaces.TIER_1.pricing_config.base_monthly_cad})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
                    Tier 2 (${tierWorkspaces.TIER_2.pricing_config.base_monthly_cad})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                    Tier 3 (${tierWorkspaces.TIER_3.pricing_config.base_monthly_cad} / $
                    {tierWorkspaces.TIER_3.pricing_config.base_monthly_cad +
                      (tierWorkspaces.TIER_3.pricing_config
                        .intensive_addon_monthly_cad || 250)}
                    )
                  </span>
                </div>
              </div>
            </div>

            {/* ADJUSTABLE UNIT ECONOMICS & MONTHLY CONTRIBUTION MARGIN TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Approved Unit Economics &amp; Monthly Contribution Margin per
                    Student (CAD)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Directly adjust AI API, Stripe %/fixed fee, Learning Manager
                    hourly load, or Tutor hourly rate below to model future cost
                    changes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingUnitEconomics((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    isEditingUnitEconomics
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>
                    {isEditingUnitEconomics
                      ? "Done Adjusting Unit Costs"
                      : "Adjust Unit Cost Assumptions"}
                  </span>
                </button>
              </div>

              {/* Editable Cost Assumptions Bar (Revealed when clicking Adjust Unit Cost Assumptions) */}
              {isEditingUnitEconomics && (
                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      AI API / Student ($/mo)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min={0}
                      value={unitEconomicsCosts.ai_api_cost_per_student_cad}
                      onChange={(e) =>
                        updateUnitEconomicsCosts({
                          ai_api_cost_per_student_cad:
                            parseFloat(e.target.value || "0") || 0,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Stripe Fee (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={unitEconomicsCosts.stripe_fee_pct}
                      onChange={(e) =>
                        updateUnitEconomicsCosts({
                          stripe_fee_pct:
                            parseFloat(e.target.value || "0") || 0,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Stripe Fixed ($/txn)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={0}
                      value={unitEconomicsCosts.stripe_fixed_fee_cad}
                      onChange={(e) =>
                        updateUnitEconomicsCosts({
                          stripe_fixed_fee_cad:
                            parseFloat(e.target.value || "0") || 0,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Manager Loaded ($/hr)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={unitEconomicsCosts.manager_hourly_loaded_cad}
                      onChange={(e) =>
                        updateUnitEconomicsCosts({
                          manager_hourly_loaded_cad:
                            parseFloat(e.target.value || "0") || 0,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      T2 Manager Mins/Mo
                    </label>
                    <input
                      type="number"
                      step="5"
                      min={0}
                      value={unitEconomicsCosts.tier2_manager_mins_avg}
                      onChange={(e) =>
                        updateUnitEconomicsCosts({
                          tier2_manager_mins_avg:
                            parseFloat(e.target.value || "0") || 0,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Tutor Loaded ($/hr)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={unitEconomicsCosts.tutor_hourly_loaded_cad}
                      onChange={(e) =>
                        updateUnitEconomicsCosts({
                          tutor_hourly_loaded_cad:
                            parseFloat(e.target.value || "0") || 0,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>
              )}

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
                        Direct Cost Total
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Contribution Margin (25m Avg)
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        30-Min Max Conservative Floor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {/* Tier 1 Row */}
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        Tier 1 · Online Self-Coach (Automated)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isEditingUnitEconomics ? (
                          <input
                            type="number"
                            min={1}
                            value={unitEconomics.TIER_1.price}
                            onChange={(e) =>
                              updateTierPricingConfig("TIER_1", {
                                base_monthly_cad:
                                  parseInt(e.target.value || "1", 10) || 1,
                              })
                            }
                            className="w-16 text-right border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                          />
                        ) : (
                          `$${unitEconomics.TIER_1.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_1.ai.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">$0.00</td>
                      <td className="py-2.5 px-3 text-right">$0.00</td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_1.stripe.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_1.directCostAvg25.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        ${unitEconomics.TIER_1.cmAvg25.toFixed(2)} (
                        {unitEconomics.TIER_1.cmPctAvg25}%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_1.cmMax30.toFixed(2)} (
                        {unitEconomics.TIER_1.cmPctMax30}%)
                      </td>
                    </tr>

                    {/* Tier 2 Row */}
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        Tier 2 · Managed Hybrid (Core Growth Engine)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isEditingUnitEconomics ? (
                          <input
                            type="number"
                            min={1}
                            value={unitEconomics.TIER_2.price}
                            onChange={(e) =>
                              updateTierPricingConfig("TIER_2", {
                                base_monthly_cad:
                                  parseInt(e.target.value || "1", 10) || 1,
                              })
                            }
                            className="w-16 text-right border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                          />
                        ) : (
                          `$${unitEconomics.TIER_2.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_2.ai.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_2.managerOrBriefingAvg25.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">$0.00</td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_2.stripe.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_2.directCostAvg25.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        ${unitEconomics.TIER_2.cmAvg25.toFixed(2)} (
                        {unitEconomics.TIER_2.cmPctAvg25}%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_2.cmMax30.toFixed(2)} (
                        {unitEconomics.TIER_2.cmPctMax30}%)
                      </td>
                    </tr>

                    {/* Tier 3 Base Row */}
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        Tier 3 · Prime 1:1 (
                        {unitEconomicsCosts.tier3_base_sessions_per_mo}×60m/mo ·
                        Tutor-Integrated Briefing)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isEditingUnitEconomics ? (
                          <input
                            type="number"
                            min={1}
                            value={unitEconomics.TIER_3.price}
                            onChange={(e) =>
                              updateTierPricingConfig("TIER_3", {
                                base_monthly_cad:
                                  parseInt(e.target.value || "1", 10) || 1,
                              })
                            }
                            className="w-16 text-right border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                          />
                        ) : (
                          `$${unitEconomics.TIER_3.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3.ai.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3.managerOrBriefingAvg25.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3.liveTutor.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3.stripe.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_3.directCostAvg25.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        ${unitEconomics.TIER_3.cmAvg25.toFixed(2)} (
                        {unitEconomics.TIER_3.cmPctAvg25}%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_3.cmMax30.toFixed(2)} (
                        {unitEconomics.TIER_3.cmPctMax30}%)
                      </td>
                    </tr>

                    {/* Tier 3+ Intensive Row */}
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-semibold text-indigo-900">
                        Tier 3+ Intensive Add-on (
                        {unitEconomicsCosts.tier3_intensive_sessions_per_mo}
                        ×60m/mo · +$
                        {tierWorkspaces.TIER_3.pricing_config
                          .intensive_addon_monthly_cad || 250}
                        /mo)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3_INTENSIVE.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3_INTENSIVE.ai.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        $
                        {unitEconomics.TIER_3_INTENSIVE.managerOrBriefingAvg25.toFixed(
                          2
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3_INTENSIVE.liveTutor.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ${unitEconomics.TIER_3_INTENSIVE.stripe.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        $
                        {unitEconomics.TIER_3_INTENSIVE.directCostAvg25.toFixed(
                          2
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        ${unitEconomics.TIER_3_INTENSIVE.cmAvg25.toFixed(2)} (
                        {unitEconomics.TIER_3_INTENSIVE.cmPctAvg25}%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        ${unitEconomics.TIER_3_INTENSIVE.cmMax30.toFixed(2)} (
                        {unitEconomics.TIER_3_INTENSIVE.cmPctMax30}%)
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
                      AI Period Debrief &amp; Funnel Bottleneck Audit
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
                      Acting CMO Closing Notes (
                      {latestPeriodMonthRecord.month_id})
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
      {/* 4. MODAL: [✏️ Log Monthly Data] WITH DISCOUNTED PRICE SECTION &     */}
      {/*    MULTI-MONTH PROMOTIONAL COHORT RECORDER                          */}
      {/* =================================================================== */}
      {isLogModalOpen && activeEditingRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsLogModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Log Monthly Atomic Ledger Data (YYYY-MM)
                </h2>
                <select
                  value={editingMonthId}
                  onChange={(e) => handleSelectEditingMonth(e.target.value)}
                  className="text-xs font-mono font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                >
                  {extendedMonthList.map((mId) => {
                    const existing = monthlyPerformanceRecords.find(
                      (r) => r.month_id === mId
                    );
                    return (
                      <option key={mId} value={mId}>
                        {mId}{" "}
                        {existing
                          ? `· ${existing.month_label || existing.status}`
                          : "· (Click to Initialize Month)"}
                      </option>
                    );
                  })}
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

            <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* SECTION A: 3-Tier Student Counts, Standard vs Discounted Monthly Price, and Calculated Revenue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    1. Core Funnel, Student Counts &amp; Discounted Monthly
                    Pricing ({editingMonthId})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Enter discounted monthly rate &amp; discounted account count
                    for single-month promotions
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-2.5 px-3">Tier</th>
                        <th className="py-2.5 px-2 text-center">Start Paid</th>
                        <th className="py-2.5 px-2 text-center">New Leads</th>
                        <th className="py-2.5 px-2 text-center">
                          Diag/Consult
                        </th>
                        <th className="py-2.5 px-2 text-center">New Paid</th>
                        <th className="py-2.5 px-2 text-center">Ref/Organic</th>
                        <th className="py-2.5 px-2 text-center">Upgraded</th>
                        <th className="py-2.5 px-2 text-center">Churned</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50/70">
                          Promo $/mo
                        </th>
                        <th className="py-2.5 px-2 text-center bg-amber-50/70">
                          Promo Accts
                        </th>
                        <th className="py-2.5 px-2 text-center">5-Mo Pass</th>
                        <th className="py-2.5 px-2 text-center">
                          T3 +$250 (8×60m)
                        </th>
                        <th className="py-2.5 px-3 text-right">End Paid</th>
                        <th className="py-2.5 px-3 text-right">
                          Recognized MRR
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          Cash Collected
                        </th>
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
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
                                value={rec.diagnostics_or_consults_completed}
                                onChange={(e) =>
                                  updateMonthlyPerformanceTierRecord(
                                    editingMonthId,
                                    editingSide,
                                    tid,
                                    {
                                      diagnostics_or_consults_completed:
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
                              />
                            </td>
                            {/* Discounted Promo Monthly Price */}
                            <td className="py-3 px-2 text-center bg-amber-50/40">
                              <input
                                type="number"
                                min={0}
                                value={
                                  rec.discounted_promo_price_cad !== undefined
                                    ? rec.discounted_promo_price_cad
                                    : rec.unit_price_cad
                                }
                                onChange={(e) =>
                                  updateMonthlyPerformanceTierRecord(
                                    editingMonthId,
                                    editingSide,
                                    tid,
                                    {
                                      discounted_promo_price_cad:
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-14 text-center border border-amber-300 bg-white rounded py-1"
                                title="Discounted promotional monthly price (CAD)"
                              />
                            </td>
                            {/* Discounted Accounts Count */}
                            <td className="py-3 px-2 text-center bg-amber-50/40">
                              <input
                                type="number"
                                min={0}
                                value={rec.discounted_accounts_count || 0}
                                onChange={(e) =>
                                  updateMonthlyPerformanceTierRecord(
                                    editingMonthId,
                                    editingSide,
                                    tid,
                                    {
                                      discounted_accounts_count:
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-amber-300 bg-white rounded py-1"
                                title="Number of accounts sold at discounted monthly price"
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
                                        parseInt(e.target.value || "0", 10) ||
                                        0,
                                    }
                                  )
                                }
                                className="w-12 text-center border border-slate-300 rounded py-1"
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
                                  className="w-12 text-center border border-indigo-300 bg-indigo-50/40 rounded py-1"
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
              </div>

              {/* SECTION B: SEPARATE MULTI-MONTH & PROMOTIONAL COHORT SALES RECORDER */}
              {/* ("record how many accounts were sold for how many months, and at what price") */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                      2. Promotional &amp; Multi-Month Cohort Sales Recorder (
                      {editingMonthId})
                    </h3>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Record how many accounts were sold, for how many months,
                      and at what total package price. Automatically splits
                      upfront Cash Collected vs. monthly amortized Recognized
                      MRR.
                    </p>
                  </div>
                </div>

                {/* Add New Promotional Cohort Form */}
                <form
                  onSubmit={handleAddPromoCohort}
                  className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end bg-white p-3.5 rounded-xl border border-amber-200/80 text-xs"
                >
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Product Tier
                    </label>
                    <select
                      value={promoTierId}
                      onChange={(e) => setPromoTierId(e.target.value as TierId)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 bg-white font-semibold"
                    >
                      <option value="TIER_1">Tier 1 · Online</option>
                      <option value="TIER_2">Tier 2 · Managed</option>
                      <option value="TIER_3">Tier 3 · Prime 1:1</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Promotion / Cohort Name
                    </label>
                    <input
                      type="text"
                      value={promoLabel}
                      onChange={(e) => setPromoLabel(e.target.value)}
                      placeholder="e.g., Pilot Beta 3-Mo Bundle or Midterm Promo"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Accounts Sold
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={promoAccountsSold}
                      onChange={(e) =>
                        setPromoAccountsSold(
                          parseInt(e.target.value || "1", 10) || 1
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Months Duration
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={promoMonthsDuration}
                      onChange={(e) =>
                        setPromoMonthsDuration(
                          parseInt(e.target.value || "1", 10) || 1
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Package Price / Acct ($)
                    </label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={promoTotalPriceCad}
                        onChange={(e) =>
                          setPromoTotalPriceCad(
                            parseInt(e.target.value || "0", 10) || 0
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0"
                        title="Add Promotional Cohort"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* List of Recorded Promotional Cohorts Across Tiers for This Month */}
                <div className="space-y-1.5">
                  {TIER_ORDER.flatMap((tid) =>
                    (
                      activeEditingRecord[editingSide][tid].promo_cohorts || []
                    ).map((cohort) => {
                      const totalCash =
                        cohort.accounts_sold *
                        cohort.total_price_per_account_cad;
                      const monthlyRecognized = Math.round(
                        totalCash / Math.max(1, cohort.months_duration)
                      );
                      return (
                        <div
                          key={cohort.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-white border border-amber-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                              {tierWorkspaces[tid].tier_short_name}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {cohort.promo_label}
                            </span>
                            <span className="text-slate-500 font-mono">
                              · {cohort.accounts_sold} accounts ×{" "}
                              {cohort.months_duration} mo @ $
                              {cohort.total_price_per_account_cad}/acct
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-emerald-700 font-semibold">
                              MRR: +${monthlyRecognized}/mo
                            </span>
                            <span className="text-indigo-700 font-semibold">
                              Cash: +${totalCash} CAD
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removePromoCohortFromMonthlyRecord(
                                  editingMonthId,
                                  editingSide,
                                  tid,
                                  cohort.id
                                )
                              }
                              className="text-rose-500 hover:text-rose-700"
                              title="Remove cohort"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION C: 4 Marketing Spend OpEx Categories */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-800">
                  3. Monthly Marketing Spend Breakdown (4 Finance OpEx Accounts
                  — {editingSide === "actuals" ? "Actual Spend" : "Target Spend"}
                  )
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
