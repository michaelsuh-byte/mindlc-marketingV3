import {
  AssetPlatform,
  BrandPersona,
  CalendarReportingMode,
  CompetitorProfile,
  DetailLevel,
  EditableStageGoal,
  MandatoryOutputProtocol,
  MandatoryProposalSchema,
  MarketingAgent,
  MarketingSkill,
  MonthlyMarketingSpend,
  MonthlyPerformanceRecord,
  MonthlyTierLedgerEntry,
  MonthlyTierRecord,
  OntarioTrendSignal,
  PlanHorizon,
  PlannedActivity,
  ScopeDriftWarning,
  StageId,
  TierId,
  TierPricingConfig,
  TierWorkspaceState,
  UnitEconomicsCostConfig,
  VerbatimParentQuote,
  WeeklyFunnelMetrics,
} from "@/types/database";

export const DEFAULT_UNIT_ECONOMICS_COSTS: UnitEconomicsCostConfig = {
  ai_api_cost_per_student_cad: 9.0,
  stripe_fee_pct: 2.9,
  stripe_fixed_fee_cad: 0.3,
  manager_hourly_loaded_cad: 29.12, // $26/hr + 12% statutory load
  tier2_manager_mins_avg: 60, // 30m async + 25m briefing + 5m notes
  tier2_manager_mins_max: 65, // 30m max briefing
  tutor_hourly_loaded_cad: 44.8, // $40/hr + 12% statutory load
  tier3_base_sessions_per_mo: 4, // 4 × 60-min live sessions/mo
  tier3_intensive_sessions_per_mo: 8, // 8 × 60-min live sessions/mo
  tier3_briefing_mins_avg: 25, // 25m avg tutor-integrated briefing
  tier3_briefing_mins_max: 30, // 30m max tutor-integrated briefing
};

export function computeTierUnitEconomics(
  tierWorkspaces: Record<TierId, TierWorkspaceState>,
  costConfig: UnitEconomicsCostConfig = DEFAULT_UNIT_ECONOMICS_COSTS
) {
  const ai = costConfig.ai_api_cost_per_student_cad;
  const stripeFor = (price: number) =>
    Number(
      ((price * costConfig.stripe_fee_pct) / 100 +
        costConfig.stripe_fixed_fee_cad).toFixed(2)
    );

  // Tier 1
  const t1Price = tierWorkspaces.TIER_1.pricing_config.base_monthly_cad;
  const t1Stripe = stripeFor(t1Price);
  const t1DirectCost = Number((ai + t1Stripe).toFixed(2));
  const t1CmAvg25 = Number((t1Price - t1DirectCost).toFixed(2));
  const t1CmPctAvg25 =
    t1Price > 0 ? Number(((t1CmAvg25 / t1Price) * 100).toFixed(1)) : 0;

  // Tier 2
  const t2Price = tierWorkspaces.TIER_2.pricing_config.base_monthly_cad;
  const t2Stripe = stripeFor(t2Price);
  const t2MgrAvg25 = Number(
    (
      (costConfig.manager_hourly_loaded_cad *
        costConfig.tier2_manager_mins_avg) /
      60
    ).toFixed(2)
  );
  const t2MgrMax30 = Number(
    (
      (costConfig.manager_hourly_loaded_cad *
        costConfig.tier2_manager_mins_max) /
      60
    ).toFixed(2)
  );
  const t2DirectAvg25 = Number((ai + t2MgrAvg25 + t2Stripe).toFixed(2));
  const t2DirectMax30 = Number((ai + t2MgrMax30 + t2Stripe).toFixed(2));
  const t2CmAvg25 = Number((t2Price - t2DirectAvg25).toFixed(2));
  const t2CmMax30 = Number((t2Price - t2DirectMax30).toFixed(2));
  const t2CmPctAvg25 =
    t2Price > 0 ? Number(((t2CmAvg25 / t2Price) * 100).toFixed(1)) : 0;
  const t2CmPctMax30 =
    t2Price > 0 ? Number(((t2CmMax30 / t2Price) * 100).toFixed(1)) : 0;

  // Tier 3 Base (4 x 60m)
  const t3Price = tierWorkspaces.TIER_3.pricing_config.base_monthly_cad;
  const t3Stripe = stripeFor(t3Price);
  const t3BriefingAvg25 = Number(
    (
      (costConfig.tutor_hourly_loaded_cad *
        costConfig.tier3_briefing_mins_avg) /
      60
    ).toFixed(2)
  );
  const t3BriefingMax30 = Number(
    (
      (costConfig.tutor_hourly_loaded_cad *
        costConfig.tier3_briefing_mins_max) /
      60
    ).toFixed(2)
  );
  const t3LiveTutorBase = Number(
    (
      costConfig.tutor_hourly_loaded_cad *
      costConfig.tier3_base_sessions_per_mo
    ).toFixed(2)
  );
  const t3DirectAvg25 = Number(
    (ai + t3BriefingAvg25 + t3LiveTutorBase + t3Stripe).toFixed(2)
  );
  const t3DirectMax30 = Number(
    (ai + t3BriefingMax30 + t3LiveTutorBase + t3Stripe).toFixed(2)
  );
  const t3CmAvg25 = Number((t3Price - t3DirectAvg25).toFixed(2));
  const t3CmMax30 = Number((t3Price - t3DirectMax30).toFixed(2));
  const t3CmPctAvg25 =
    t3Price > 0 ? Number(((t3CmAvg25 / t3Price) * 100).toFixed(1)) : 0;
  const t3CmPctMax30 =
    t3Price > 0 ? Number(((t3CmMax30 / t3Price) * 100).toFixed(1)) : 0;

  // Tier 3+ Intensive Add-on (8 x 60m)
  const t3PlusPrice =
    t3Price +
    (tierWorkspaces.TIER_3.pricing_config.intensive_addon_monthly_cad || 250);
  const t3PlusStripe = stripeFor(t3PlusPrice);
  const t3LiveTutorIntensive = Number(
    (
      costConfig.tutor_hourly_loaded_cad *
      costConfig.tier3_intensive_sessions_per_mo
    ).toFixed(2)
  );
  const t3PlusDirectAvg25 = Number(
    (ai + t3BriefingAvg25 + t3LiveTutorIntensive + t3PlusStripe).toFixed(2)
  );
  const t3PlusDirectMax30 = Number(
    (ai + t3BriefingMax30 + t3LiveTutorIntensive + t3PlusStripe).toFixed(2)
  );
  const t3PlusCmAvg25 = Number((t3PlusPrice - t3PlusDirectAvg25).toFixed(2));
  const t3PlusCmMax30 = Number((t3PlusPrice - t3PlusDirectMax30).toFixed(2));
  const t3PlusCmPctAvg25 =
    t3PlusPrice > 0
      ? Number(((t3PlusCmAvg25 / t3PlusPrice) * 100).toFixed(1))
      : 0;
  const t3PlusCmPctMax30 =
    t3PlusPrice > 0
      ? Number(((t3PlusCmMax30 / t3PlusPrice) * 100).toFixed(1))
      : 0;

  return {
    TIER_1: {
      price: t1Price,
      ai,
      managerOrBriefingAvg25: 0,
      managerOrBriefingMax30: 0,
      liveTutor: 0,
      stripe: t1Stripe,
      directCostAvg25: t1DirectCost,
      cmAvg25: t1CmAvg25,
      cmPctAvg25: t1CmPctAvg25,
      cmMax30: t1CmAvg25,
      cmPctMax30: t1CmPctAvg25,
    },
    TIER_2: {
      price: t2Price,
      ai,
      managerOrBriefingAvg25: t2MgrAvg25,
      managerOrBriefingMax30: t2MgrMax30,
      liveTutor: 0,
      stripe: t2Stripe,
      directCostAvg25: t2DirectAvg25,
      cmAvg25: t2CmAvg25,
      cmPctAvg25: t2CmPctAvg25,
      cmMax30: t2CmMax30,
      cmPctMax30: t2CmPctMax30,
    },
    TIER_3: {
      price: t3Price,
      ai,
      managerOrBriefingAvg25: t3BriefingAvg25,
      managerOrBriefingMax30: t3BriefingMax30,
      liveTutor: t3LiveTutorBase,
      stripe: t3Stripe,
      directCostAvg25: t3DirectAvg25,
      cmAvg25: t3CmAvg25,
      cmPctAvg25: t3CmPctAvg25,
      cmMax30: t3CmMax30,
      cmPctMax30: t3CmPctMax30,
    },
    TIER_3_INTENSIVE: {
      price: t3PlusPrice,
      ai,
      managerOrBriefingAvg25: t3BriefingAvg25,
      managerOrBriefingMax30: t3BriefingMax30,
      liveTutor: t3LiveTutorIntensive,
      stripe: t3PlusStripe,
      directCostAvg25: t3PlusDirectAvg25,
      cmAvg25: t3PlusCmAvg25,
      cmPctAvg25: t3PlusCmPctAvg25,
      cmMax30: t3PlusCmMax30,
      cmPctMax30: t3PlusCmPctMax30,
    },
  };
}

// ============================================================================
// 1. FINALIZED 3-TIER PRICING DEFAULTS & DYNAMIC REVENUE CALCULATORS (CAD)
// Never hardcode calculated totals—always derive MRR, Quarterly (MRR×3), ARR (MRR×12)
// ============================================================================

export const DEFAULT_TIER_PRICING: Record<TierId, TierPricingConfig> = {
  TIER_1: {
    base_monthly_cad: 39,
    semester_pass_5mo_cad: 165,
    sibling_addon_monthly_cad: 19,
  },
  TIER_2: {
    base_monthly_cad: 139,
    semester_pass_5mo_cad: 590,
    sibling_addon_monthly_cad: 79,
  },
  TIER_3: {
    base_monthly_cad: 399,
    semester_pass_5mo_cad: 1795,
    sibling_addon_monthly_cad: 349,
    intensive_addon_monthly_cad: 250, // +$250/mo = $649/mo (8 × 60-min live sessions/mo)
    intensive_semester_pass_5mo_cad: 2995,
  },
};

export function formatTierPriceSummary(
  tierId: TierId,
  pricing: TierPricingConfig
): string {
  if (tierId === "TIER_3") {
    const intensiveTotal =
      pricing.base_monthly_cad + (pricing.intensive_addon_monthly_cad || 250);
    return `$${pricing.base_monthly_cad}/mo base (4×60m) | +$${
      pricing.intensive_addon_monthly_cad || 250
    }/mo Intensive ($${intensiveTotal}/mo 8×60m) | 5-mo Pass $${pricing.semester_pass_5mo_cad.toLocaleString()}/$${(
      pricing.intensive_semester_pass_5mo_cad || 2995
    ).toLocaleString()} | Sibling +$${pricing.sibling_addon_monthly_cad}/mo`;
  }
  return `$${pricing.base_monthly_cad}/mo | 5-mo Semester Pass $${pricing.semester_pass_5mo_cad} | Sibling +$${pricing.sibling_addon_monthly_cad}/mo`;
}

export function computeStageExpectedRevenue(params: {
  targetPaidCount: number;
  baseMonthlyCad: number;
  siblingAddonCount?: number;
  siblingAddonMonthlyCad?: number;
  intensiveAddonCount?: number;
  intensiveAddonMonthlyCad?: number;
}) {
  const baseMrr = params.targetPaidCount * params.baseMonthlyCad;
  const siblingMrr =
    (params.siblingAddonCount || 0) * (params.siblingAddonMonthlyCad || 0);
  const intensiveMrr =
    (params.intensiveAddonCount || 0) * (params.intensiveAddonMonthlyCad || 0);
  const expectedMrr = baseMrr + siblingMrr + intensiveMrr;
  const expectedQuarterlyGross = expectedMrr * 3;
  const expectedArr = expectedMrr * 12;

  return {
    baseMrr,
    siblingMrr,
    intensiveMrr,
    expectedMrr,
    expectedQuarterlyGross,
    expectedArr,
  };
}

export function computeCombined3TierBenchmarks(
  tierWorkspaces: Record<TierId, TierWorkspaceState>,
  costConfig: UnitEconomicsCostConfig = DEFAULT_UNIT_ECONOMICS_COSTS
) {
  const unitEcon = computeTierUnitEconomics(tierWorkspaces, costConfig);
  const stages: StageId[] = ["STAGE_1", "STAGE_2", "STAGE_3"];
  return stages.map((stageId) => {
    const t1 = tierWorkspaces.TIER_1;
    const t2 = tierWorkspaces.TIER_2;
    const t3 = tierWorkspaces.TIER_3;

    const s1Count = t1.stage_goals[stageId].target_paid_count;
    const s2Count = t2.stage_goals[stageId].target_paid_count;
    const s3Count = t3.stage_goals[stageId].target_paid_count;

    const totalStudents = s1Count + s2Count + s3Count;
    const mrr =
      s1Count * t1.pricing_config.base_monthly_cad +
      s2Count * t2.pricing_config.base_monthly_cad +
      s3Count * t3.pricing_config.base_monthly_cad;
    const quarterlyGross = mrr * 3;
    const arr = mrr * 12;

    const t1UnitCm = Math.max(0, unitEcon.TIER_1.cmAvg25);
    const t2UnitCmAvg25 = Math.max(0, unitEcon.TIER_2.cmAvg25);
    const t2UnitCmMax30 = Math.max(0, unitEcon.TIER_2.cmMax30);
    const t3UnitCmAvg25 = Math.max(0, unitEcon.TIER_3.cmAvg25);
    const t3UnitCmMax30 = Math.max(0, unitEcon.TIER_3.cmMax30);

    const monthlyContributionMarginAvg25 = Math.round(
      s1Count * t1UnitCm + s2Count * t2UnitCmAvg25 + s3Count * t3UnitCmAvg25
    );
    const monthlyContributionMarginMax30 = Math.round(
      s1Count * t1UnitCm + s2Count * t2UnitCmMax30 + s3Count * t3UnitCmMax30
    );
    const contributionMarginPctAvg25 =
      mrr > 0 ? Number(((monthlyContributionMarginAvg25 / mrr) * 100).toFixed(1)) : 0;
    const blendedArpa =
      totalStudents > 0 ? Number((mrr / totalStudents).toFixed(2)) : 0;

    return {
      stageId,
      totalStudents,
      mrr,
      quarterlyGross,
      arr,
      monthlyContributionMarginAvg25,
      monthlyContributionMarginMax30,
      contributionMarginPctAvg25,
      blendedArpa,
      breakdown: {
        tier1: {
          students: s1Count,
          mrr: s1Count * t1.pricing_config.base_monthly_cad,
          contributionMargin: Math.round(s1Count * t1UnitCm),
        },
        tier2: {
          students: s2Count,
          mrr: s2Count * t2.pricing_config.base_monthly_cad,
          contributionMargin: Math.round(s2Count * t2UnitCmAvg25),
        },
        tier3: {
          students: s3Count,
          mrr: s3Count * t3.pricing_config.base_monthly_cad,
          contributionMargin: Math.round(s3Count * t3UnitCmAvg25),
        },
      },
    };
  });
}

export function recalculateLedgerEntryTotals(
  entry: MonthlyTierLedgerEntry,
  pricing: TierPricingConfig
): MonthlyTierLedgerEntry {
  const closingPaid = Math.max(
    0,
    entry.opening_paid_students +
      entry.new_paid_students -
      entry.churned_students
  );
  // Monthly subscribers paying standard monthly rate (excluding 5-mo semester pass holders who paid upfront)
  const standardMonthlySubscribers = Math.max(
    0,
    closingPaid - entry.semester_pass_5mo_count
  );
  // Amortized monthly MRR credit from 5-mo semester pass ($165/5, $590/5, $1795/5)
  const amortizedPassMrr =
    entry.semester_pass_5mo_count *
    Math.round(pricing.semester_pass_5mo_cad / 5);
  const siblingMrr =
    entry.sibling_addon_count * pricing.sibling_addon_monthly_cad;
  const intensiveMrr =
    entry.intensive_addon_count * (pricing.intensive_addon_monthly_cad || 0);

  const recognizedMrr =
    standardMonthlySubscribers * pricing.base_monthly_cad +
    amortizedPassMrr +
    siblingMrr +
    intensiveMrr;

  const semesterPassCash =
    entry.semester_pass_5mo_count * pricing.semester_pass_5mo_cad;
  const totalGrossCash =
    standardMonthlySubscribers * pricing.base_monthly_cad +
    semesterPassCash +
    siblingMrr +
    intensiveMrr;

  const blendedCac =
    entry.new_paid_students > 0
      ? Math.round(entry.ad_spend_cad / entry.new_paid_students)
      : 0;

  return {
    ...entry,
    closing_paid_students: closingPaid,
    recognized_mrr_cad: recognizedMrr,
    semester_pass_cash_collected_cad: semesterPassCash,
    total_gross_cash_cad: totalGrossCash,
    blended_cac_cad: blendedCac,
  };
}

// ============================================================================
// SECTION 3. FINANCE-READY MONTHLY ATOMIC LEDGER & DUAL-VIEW CLOSING ENGINE
// ============================================================================

export function recalculateMonthlyTierRecord(
  record: MonthlyTierRecord,
  pricing: TierPricingConfig
): MonthlyTierRecord {
  const endingPaid = Math.max(
    0,
    record.starting_paid_students +
      record.new_paid_students -
      record.churned_students
  );
  const semesterPassCount = record.semester_pass_5mo_count || 0;
  const siblingCount = record.sibling_addon_count || 0;
  const intensiveCount = record.tier3_intensive_addon_count || 0;
  const discountedCount = record.discounted_accounts_count || 0;
  const discountedPrice =
    record.discounted_promo_price_cad !== undefined
      ? record.discounted_promo_price_cad
      : record.unit_price_cad;

  // Custom promotional or multi-month cohorts (how many accounts sold, for how many months, at what total price)
  const promoCohorts = record.promo_cohorts || [];
  const cohortAccountsTotal = promoCohorts.reduce(
    (sum, c) => sum + (Number(c.accounts_sold) || 0),
    0
  );
  const cohortRecognizedMrr = promoCohorts.reduce((sum, c) => {
    const acc = Number(c.accounts_sold) || 0;
    const mos = Math.max(1, Number(c.months_duration) || 1);
    const totalPrice = Number(c.total_price_per_account_cad) || 0;
    return sum + Math.round((acc * totalPrice) / mos);
  }, 0);
  const cohortCashCollected = promoCohorts.reduce((sum, c) => {
    const acc = Number(c.accounts_sold) || 0;
    const totalPrice = Number(c.total_price_per_account_cad) || 0;
    return sum + acc * totalPrice;
  }, 0);

  const standardMonthlyCount = Math.max(
    0,
    endingPaid - semesterPassCount - discountedCount - cohortAccountsTotal
  );
  const amortizedPassMrr =
    semesterPassCount * Math.round(pricing.semester_pass_5mo_cad / 5);
  const discountedMrr = discountedCount * discountedPrice;
  const siblingMrr = siblingCount * pricing.sibling_addon_monthly_cad;
  const intensiveMrr =
    intensiveCount * (pricing.intensive_addon_monthly_cad || 250);

  const recognizedMrr =
    standardMonthlyCount * record.unit_price_cad +
    discountedMrr +
    amortizedPassMrr +
    cohortRecognizedMrr +
    siblingMrr +
    intensiveMrr;

  const cashCollected =
    standardMonthlyCount * record.unit_price_cad +
    discountedMrr +
    semesterPassCount * pricing.semester_pass_5mo_cad +
    cohortCashCollected +
    siblingMrr +
    intensiveMrr;

  return {
    ...record,
    ending_paid_students: endingPaid,
    recognized_mrr_cad: recognizedMrr,
    cash_collected_cad: cashCollected,
  };
}

export interface ReportingPeriodOption {
  id: string;
  label: string;
  mode: CalendarReportingMode;
  monthIds: string[];
}

export function getReportingPeriodOptions(
  mode: CalendarReportingMode,
  fiscalYearStartMonth: 1 | 9 = 1,
  maxAcademicStartYear = 2029
): ReportingPeriodOption[] {
  const startYears: number[] = [];
  for (let y = 2026; y <= Math.max(2027, maxAcademicStartYear); y++) {
    startYears.push(y);
  }

  if (mode === "ONTARIO_ACADEMIC") {
    const options: ReportingPeriodOption[] = [];
    for (const yr of startYears) {
      const nextYr = yr + 1;
      const shortNext = String(nextYr).slice(-2);
      options.push(
        {
          id: `${yr}-${shortNext}-SEM-1`,
          label: `${yr}–${shortNext} Sem 1 (Sep ${yr}–Jan ${nextYr} · 5 mo)`,
          mode,
          monthIds: [
            `${yr}-09`,
            `${yr}-10`,
            `${yr}-11`,
            `${yr}-12`,
            `${nextYr}-01`,
          ],
        },
        {
          id: `${yr}-${shortNext}-SEM-2`,
          label: `${yr}–${shortNext} Sem 2 (Feb–Jun ${nextYr} · 5 mo)`,
          mode,
          monthIds: [
            `${nextYr}-02`,
            `${nextYr}-03`,
            `${nextYr}-04`,
            `${nextYr}-05`,
            `${nextYr}-06`,
          ],
        },
        {
          id: `${nextYr}-SUMMER`,
          label: `${nextYr} Summer (Jul–Aug ${nextYr} · 2 mo)`,
          mode,
          monthIds: [`${nextYr}-07`, `${nextYr}-08`],
        }
      );
    }
    return options;
  }

  if (mode === "ACADEMIC_QUARTER") {
    const options: ReportingPeriodOption[] = [];
    for (const yr of startYears) {
      const nextYr = yr + 1;
      const shortNext = String(nextYr).slice(-2);
      options.push(
        {
          id: `${yr}-${shortNext}-AQ1`,
          label: `${yr}–${shortNext} AQ1 · Fall (Sep–Nov ${yr})`,
          mode,
          monthIds: [`${yr}-09`, `${yr}-10`, `${yr}-11`],
        },
        {
          id: `${yr}-${shortNext}-AQ2`,
          label: `${yr}–${shortNext} AQ2 · Winter (Dec ${yr}–Feb ${nextYr})`,
          mode,
          monthIds: [`${yr}-12`, `${nextYr}-01`, `${nextYr}-02`],
        },
        {
          id: `${yr}-${shortNext}-AQ3`,
          label: `${yr}–${shortNext} AQ3 · Spring (Mar–May ${nextYr})`,
          mode,
          monthIds: [`${nextYr}-03`, `${nextYr}-04`, `${nextYr}-05`],
        },
        {
          id: `${yr}-${shortNext}-AQ4`,
          label: `${yr}–${shortNext} AQ4 · Summer (Jun–Aug ${nextYr})`,
          mode,
          monthIds: [`${nextYr}-06`, `${nextYr}-07`, `${nextYr}-08`],
        }
      );
    }
    return options;
  }

  // FISCAL_QUARTER
  if (fiscalYearStartMonth === 9) {
    const options: ReportingPeriodOption[] = [];
    for (const yr of startYears) {
      const nextYr = yr + 1;
      const fyShort = String(nextYr).slice(-2);
      options.push(
        {
          id: `FY${fyShort}-Q1-SEP`,
          label: `FY${fyShort} Q1 (Sep–Nov ${yr} · Sep 1 Fiscal Start)`,
          mode,
          monthIds: [`${yr}-09`, `${yr}-10`, `${yr}-11`],
        },
        {
          id: `FY${fyShort}-Q2-DEC`,
          label: `FY${fyShort} Q2 (Dec ${yr}–Feb ${nextYr})`,
          mode,
          monthIds: [`${yr}-12`, `${nextYr}-01`, `${nextYr}-02`],
        },
        {
          id: `FY${fyShort}-Q3-MAR`,
          label: `FY${fyShort} Q3 (Mar–May ${nextYr})`,
          mode,
          monthIds: [`${nextYr}-03`, `${nextYr}-04`, `${nextYr}-05`],
        },
        {
          id: `FY${fyShort}-Q4-JUN`,
          label: `FY${fyShort} Q4 (Jun–Aug ${nextYr})`,
          mode,
          monthIds: [`${nextYr}-06`, `${nextYr}-07`, `${nextYr}-08`],
        }
      );
    }
    return options;
  }

  const calOptions: ReportingPeriodOption[] = [];
  for (let yr = 2026; yr <= Math.max(2027, maxAcademicStartYear + 1); yr++) {
    calOptions.push(
      {
        id: `${yr}-Q1`,
        label: `${yr} Q1 (Jan–Mar ${yr} · Jan 1 Fiscal Start)`,
        mode,
        monthIds: [`${yr}-01`, `${yr}-02`, `${yr}-03`],
      },
      {
        id: `${yr}-Q2`,
        label: `${yr} Q2 (Apr–Jun ${yr} · Jan 1 Fiscal Start)`,
        mode,
        monthIds: [`${yr}-04`, `${yr}-05`, `${yr}-06`],
      },
      {
        id: `${yr}-Q3`,
        label: `${yr} Q3 (Jul–Sep ${yr} · Jan 1 Fiscal Start)`,
        mode,
        monthIds: [`${yr}-07`, `${yr}-08`, `${yr}-09`],
      },
      {
        id: `${yr}-Q4`,
        label: `${yr} Q4 (Oct–Dec ${yr} · Jan 1 Fiscal Start)`,
        mode,
        monthIds: [`${yr}-10`, `${yr}-11`, `${yr}-12`],
      }
    );
  }
  return calOptions;
}

export interface AggregatedTierSide {
  starting_paid_students: number;
  ending_paid_students: number;
  new_leads: number;
  diagnostics_or_consults_completed: number;
  new_paid_students: number;
  referral_or_organic_new_students: number;
  upgraded_to_higher_tier: number;
  churned_students: number;
  cash_collected_cad: number;
  recognized_mrr_cad: number;
  ending_mrr_cad: number;
  tier3_intensive_addon_count: number;
}

export interface ComputedSideKpis {
  recognizedRevenueCad: number;
  cashCollectedCad: number;
  endingMrrCad: number;
  startingStudents: number;
  endingStudents: number;
  newLeads: number;
  diagnosticsCompleted: number;
  newPaidStudents: number;
  referralOrOrganicNew: number;
  upgradedStudents: number;
  churnedStudents: number;
  totalSpendCad: number;
  spendBreakdown: MonthlyMarketingSpend;
  blendedArpaCad: number;
  cplCad: number | null;
  blendedCacCad: number | null;
  organicReferralSharePct: number;
  leadToDiagRatePct: number;
  diagToPaidRatePct: number;
  tierUpgradeRatePct: number;
  avgMonthlyLogoChurnPct: number;
  ltvCad: number;
  ltvToCacRatio: number | null;
  cacPaybackMonths: number | null;
  merRatio: number | null;
}

export interface PeriodRollupResult {
  monthsIncluded: string[];
  monthsCount: number;
  statusLabel: "PLANNING" | "IN_PROGRESS" | "CLOSED";
  byTierTarget: Record<TierId, AggregatedTierSide>;
  byTierActual: Record<TierId, AggregatedTierSide>;
  targetKpis: ComputedSideKpis;
  actualKpis: ComputedSideKpis;
  revenueAttainmentPct: number;
  studentAttainmentPct: number;
}

function aggregateSideForRecords(
  records: MonthlyPerformanceRecord[],
  side: "targets" | "actuals"
): {
  byTier: Record<TierId, AggregatedTierSide>;
  kpis: ComputedSideKpis;
} {
  const tiers: TierId[] = ["TIER_1", "TIER_2", "TIER_3"];
  const monthsCount = Math.max(1, records.length);
  const firstRecord = records[0];
  const lastRecord = records[records.length - 1];

  const byTier = {} as Record<TierId, AggregatedTierSide>;

  for (const tid of tiers) {
    const startStudents = firstRecord
      ? firstRecord[side][tid].starting_paid_students
      : 0;
    const endStudents = lastRecord
      ? lastRecord[side][tid].ending_paid_students
      : 0;
    const endMrr = lastRecord ? lastRecord[side][tid].recognized_mrr_cad : 0;

    let newLeads = 0;
    let diagCompleted = 0;
    let newPaid = 0;
    let referralNew = 0;
    let upgraded = 0;
    let churned = 0;
    let cashCollected = 0;
    let recognizedRevenue = 0;
    let intensiveAddons = 0;

    for (const r of records) {
      const tr = r[side][tid];
      newLeads += tr.new_leads;
      diagCompleted += tr.diagnostics_or_consults_completed;
      newPaid += tr.new_paid_students;
      referralNew += tr.referral_or_organic_new_students;
      upgraded += tr.upgraded_to_higher_tier;
      churned += tr.churned_students;
      cashCollected += tr.cash_collected_cad;
      recognizedRevenue += tr.recognized_mrr_cad;
      intensiveAddons = tr.tier3_intensive_addon_count || intensiveAddons;
    }

    byTier[tid] = {
      starting_paid_students: startStudents,
      ending_paid_students: endStudents,
      new_leads: newLeads,
      diagnostics_or_consults_completed: diagCompleted,
      new_paid_students: newPaid,
      referral_or_organic_new_students: referralNew,
      upgraded_to_higher_tier: upgraded,
      churned_students: churned,
      cash_collected_cad: cashCollected,
      recognized_mrr_cad: recognizedRevenue,
      ending_mrr_cad: endMrr,
      tier3_intensive_addon_count: intensiveAddons,
    };
  }

  // Sum across all 3 tiers
  const startingStudents =
    byTier.TIER_1.starting_paid_students +
    byTier.TIER_2.starting_paid_students +
    byTier.TIER_3.starting_paid_students;
  const endingStudents =
    byTier.TIER_1.ending_paid_students +
    byTier.TIER_2.ending_paid_students +
    byTier.TIER_3.ending_paid_students;
  const endingMrrCad =
    byTier.TIER_1.ending_mrr_cad +
    byTier.TIER_2.ending_mrr_cad +
    byTier.TIER_3.ending_mrr_cad;
  const recognizedRevenueCad =
    byTier.TIER_1.recognized_mrr_cad +
    byTier.TIER_2.recognized_mrr_cad +
    byTier.TIER_3.recognized_mrr_cad;
  const cashCollectedCad =
    byTier.TIER_1.cash_collected_cad +
    byTier.TIER_2.cash_collected_cad +
    byTier.TIER_3.cash_collected_cad;

  const newLeads =
    byTier.TIER_1.new_leads +
    byTier.TIER_2.new_leads +
    byTier.TIER_3.new_leads;
  const diagnosticsCompleted =
    byTier.TIER_1.diagnostics_or_consults_completed +
    byTier.TIER_2.diagnostics_or_consults_completed +
    byTier.TIER_3.diagnostics_or_consults_completed;
  const newPaidStudents =
    byTier.TIER_1.new_paid_students +
    byTier.TIER_2.new_paid_students +
    byTier.TIER_3.new_paid_students;
  const referralOrOrganicNew =
    byTier.TIER_1.referral_or_organic_new_students +
    byTier.TIER_2.referral_or_organic_new_students +
    byTier.TIER_3.referral_or_organic_new_students;
  const upgradedStudents =
    byTier.TIER_1.upgraded_to_higher_tier +
    byTier.TIER_2.upgraded_to_higher_tier +
    byTier.TIER_3.upgraded_to_higher_tier;
  const churnedStudents =
    byTier.TIER_1.churned_students +
    byTier.TIER_2.churned_students +
    byTier.TIER_3.churned_students;

  // Spend breakdown
  const spendKey = side === "targets" ? "spend_target" : "spend_actual";
  const spendBreakdown: MonthlyMarketingSpend = {
    paid_ads_cad: 0,
    events_seminars_cad: 0,
    referral_credits_cad: 0,
    marketing_tools_cad: 0,
  };
  for (const r of records) {
    const sp = r[spendKey];
    spendBreakdown.paid_ads_cad += sp.paid_ads_cad;
    spendBreakdown.events_seminars_cad += sp.events_seminars_cad;
    spendBreakdown.referral_credits_cad += sp.referral_credits_cad;
    spendBreakdown.marketing_tools_cad += sp.marketing_tools_cad;
  }
  const totalSpendCad =
    spendBreakdown.paid_ads_cad +
    spendBreakdown.events_seminars_cad +
    spendBreakdown.referral_credits_cad +
    spendBreakdown.marketing_tools_cad;

  // Safe Ratio Recomputations (Zero-Division Guarded)
  const blendedArpaCad =
    endingStudents > 0
      ? Number((endingMrrCad / endingStudents).toFixed(2))
      : 0;
  const cplCad =
    newLeads > 0 ? Number((totalSpendCad / newLeads).toFixed(2)) : null;
  const blendedCacCad =
    newPaidStudents > 0
      ? Number((totalSpendCad / newPaidStudents).toFixed(2))
      : null;
  const organicReferralSharePct =
    newPaidStudents > 0
      ? Number(((referralOrOrganicNew / newPaidStudents) * 100).toFixed(1))
      : 0;
  const leadToDiagRatePct =
    newLeads > 0
      ? Number(((diagnosticsCompleted / newLeads) * 100).toFixed(1))
      : 0;
  const diagToPaidRatePct =
    diagnosticsCompleted > 0
      ? Number(((newPaidStudents / diagnosticsCompleted) * 100).toFixed(1))
      : 0;

  const startingLowerTierStudents =
    byTier.TIER_1.starting_paid_students +
    byTier.TIER_2.starting_paid_students;
  const tierUpgradeRatePct =
    startingLowerTierStudents > 0
      ? Number(
          ((upgradedStudents / startingLowerTierStudents) * 100).toFixed(1)
        )
      : 0;

  const avgActiveStudents = (startingStudents + endingStudents) / 2;
  const avgMonthlyLogoChurnPct =
    avgActiveStudents > 0
      ? Number(
          ((churnedStudents / avgActiveStudents / monthsCount) * 100).toFixed(
            2
          )
        )
      : 0;

  // LTV = Blended ARPA / Monthly Churn Rate, conservatively capped at 10 months (2 Ontario semesters) if churn is 0%
  const monthlyChurnDecimal = avgMonthlyLogoChurnPct / 100;
  const rawMonthsLifetime =
    monthlyChurnDecimal > 0 ? Math.min(10, 1 / monthlyChurnDecimal) : 10;
  const ltvCad = Number((blendedArpaCad * rawMonthsLifetime).toFixed(2));

  const ltvToCacRatio =
    blendedCacCad !== null && blendedCacCad > 0
      ? Number((ltvCad / blendedCacCad).toFixed(1))
      : null;

  const cacPaybackMonths =
    blendedCacCad !== null && blendedArpaCad > 0
      ? Number((blendedCacCad / blendedArpaCad).toFixed(1))
      : 0;

  const merRatio =
    totalSpendCad > 0
      ? Number((recognizedRevenueCad / totalSpendCad).toFixed(2))
      : null;

  return {
    byTier,
    kpis: {
      recognizedRevenueCad,
      cashCollectedCad,
      endingMrrCad,
      startingStudents,
      endingStudents,
      newLeads,
      diagnosticsCompleted,
      newPaidStudents,
      referralOrOrganicNew,
      upgradedStudents,
      churnedStudents,
      totalSpendCad,
      spendBreakdown,
      blendedArpaCad,
      cplCad,
      blendedCacCad,
      organicReferralSharePct,
      leadToDiagRatePct,
      diagToPaidRatePct,
      tierUpgradeRatePct,
      avgMonthlyLogoChurnPct,
      ltvCad,
      ltvToCacRatio,
      cacPaybackMonths,
      merRatio,
    },
  };
}

export function aggregateMonthlyPerformancePeriod(
  allRecords: MonthlyPerformanceRecord[],
  monthIds: string[]
): PeriodRollupResult {
  const matching = allRecords
    .filter((r) => monthIds.includes(r.month_id))
    .sort((a, b) => a.month_id.localeCompare(b.month_id));

  const activeRecords = matching.length > 0 ? matching : allRecords;
  const targetAgg = aggregateSideForRecords(activeRecords, "targets");
  const actualAgg = aggregateSideForRecords(activeRecords, "actuals");

  const allClosed =
    activeRecords.length > 0 &&
    activeRecords.every((r) => r.status === "CLOSED");
  const anyInProgress = activeRecords.some((r) => r.status === "IN_PROGRESS");
  const statusLabel = allClosed
    ? "CLOSED"
    : anyInProgress
    ? "IN_PROGRESS"
    : "PLANNING";

  const revenueAttainmentPct =
    targetAgg.kpis.recognizedRevenueCad > 0
      ? Number(
          (
            (actualAgg.kpis.recognizedRevenueCad /
              targetAgg.kpis.recognizedRevenueCad) *
            100
          ).toFixed(1)
        )
      : 0;

  const studentAttainmentPct =
    targetAgg.kpis.endingStudents > 0
      ? Number(
          (
            (actualAgg.kpis.endingStudents / targetAgg.kpis.endingStudents) *
            100
          ).toFixed(1)
        )
      : 0;

  return {
    monthsIncluded: activeRecords.map((r) => r.month_id),
    monthsCount: activeRecords.length,
    statusLabel,
    byTierTarget: targetAgg.byTier,
    byTierActual: actualAgg.byTier,
    targetKpis: targetAgg.kpis,
    actualKpis: actualAgg.kpis,
    revenueAttainmentPct,
    studentAttainmentPct,
  };
}

export function getRecommendedStageForTier(
  tierId: TierId,
  paidCount: number
): StageId {
  if (tierId === "TIER_1") {
    if (paidCount <= 50) return "STAGE_1";
    if (paidCount <= 150) return "STAGE_2";
    return "STAGE_3";
  }
  if (tierId === "TIER_2") {
    if (paidCount <= 25) return "STAGE_1";
    if (paidCount <= 60) return "STAGE_2";
    return "STAGE_3";
  }
  // TIER_3
  if (paidCount <= 5) return "STAGE_1";
  if (paidCount <= 15) return "STAGE_2";
  return "STAGE_3";
}

export const DEFAULT_TIER_STAGE_GOALS: Record<
  TierId,
  Record<StageId, EditableStageGoal>
> = {
  TIER_1: {
    STAGE_1: {
      stage_id: "STAGE_1",
      stage_title: "Activation & Self-Serve Conversion (0–50 Paid)",
      short_badge: "Stage 1: Self-Serve Diag → Paid ≥ 12% & Day-7 Return ≥ 50%",
      min_paid: 0,
      max_paid: 50,
      target_paid_count: 50,
      primary_kpi_name: "Diagnostic-to-Paid Conversion",
      primary_kpi_target_pct: 12,
      secondary_kpi_summary: "Day-7 student return >= 50% (Socratic voice + LaTeX HUD)",
      allowed_scope: [
        "Onboarding UX copy (Socratic voice + LaTeX HUD walkthrough)",
        "Diagnostic-to-checkout friction fixes",
        "Automated email/SMS self-serve nurture",
      ],
      blocked_scope: [
        "Broad paid ad scaling",
        "Human manager or 1:1 tutor promises (Tier 1 is 100% automated)",
      ],
      blocked_keywords: [
        "broad ad scaling",
        "scale cold ads",
        "$5,000 ad budget",
        "billboard",
      ],
    },
    STAGE_2: {
      stage_id: "STAGE_2",
      stage_title: "Organic Pull & Sibling/Peer Loop (51–150 Paid)",
      short_badge: "Stage 2: Organic Leads ≥ 200/mo & Sibling/Referral ≥ 15%",
      min_paid: 51,
      max_paid: 150,
      target_paid_count: 150,
      primary_kpi_name: "Sibling & Peer Referral Share",
      primary_kpi_target_pct: 15,
      secondary_kpi_summary: "Organic leads >= 200/mo via Ontario unit-test checklists",
      allowed_scope: [
        "Ontario unit-test checklists (MPM2D, MCR3U, MHF4U, SBI3U)",
        "Sibling add-on offers",
        "Parent & student peer-share prompts",
      ],
      blocked_scope: ["High-CAC cold ad bursts"],
      blocked_keywords: ["high-cac cold ad", "expensive agency ad burst"],
    },
    STAGE_3: {
      stage_id: "STAGE_3",
      stage_title: "Low-CAC Paid Scaling (151–300+ Paid)",
      short_badge: "Stage 3: Low-CAC Paid Scaling (Blended CAC ≤ $40 CAD)",
      min_paid: 151,
      max_paid: 300,
      target_paid_count: 300,
      primary_kpi_name: "Blended Self-Serve CAC <= $40 CAD",
      primary_kpi_target_pct: 15,
      secondary_kpi_summary: "Blended CAC <= $40 CAD on Ontario course-code search/short-form ads",
      allowed_scope: [
        "Search & short-form ads targeting Ontario course codes and exam prep",
        "Self-serve landing page A/B tests",
      ],
      blocked_scope: ["Unmeasured brand awareness campaigns above $40 CAC"],
      blocked_keywords: ["untracked brand awareness"],
    },
  },

  TIER_2: {
    STAGE_1: {
      stage_id: "STAGE_1",
      stage_title: "Diagnostic-to-Paid Proof (0–25 Paid)",
      short_badge: "Stage 1: Fix Diag → Paid (Target ≥ 25%)",
      min_paid: 0,
      max_paid: 25,
      target_paid_count: 25,
      primary_kpi_name: "Diagnostic Completed -> Paid Subscriptions",
      primary_kpi_target_pct: 25,
      secondary_kpi_summary: "10-min debrief call close rate >= 25% ($139 CAD/mo)",
      allowed_scope: [
        "Growing Success (K/T/C/A) Cognitive Report layout/copy",
        "10-min parent debrief call scripts",
        "Post-diagnostic 72-hr follow-up",
        "30-day active-habit guarantee framing",
      ],
      blocked_scope: [
        "Cold paid ads (Meta / Google cold traffic)",
        "Broad social media calendars",
      ],
      blocked_keywords: [
        "cold ad",
        "facebook ad",
        "meta ad",
        "google ad",
        "social calendar",
        "scale ads",
        "cold traffic",
      ],
    },
    STAGE_2: {
      stage_id: "STAGE_2",
      stage_title: "Community Trust & Parent Referrals (26–60 Paid)",
      short_badge: "Stage 2: Community → Diag ≥ 40% & Referrals ≥ 25%",
      min_paid: 26,
      max_paid: 60,
      target_paid_count: 60,
      primary_kpi_name: "Community & Seminar -> Diagnostic Booked",
      primary_kpi_target_pct: 40,
      secondary_kpi_summary: "Referral share >= 25% via Week 4–6 Learning Manager invites",
      allowed_scope: [
        "Week 4–6 parent referral invites",
        "Ontario parent info seminar kits",
        "Local parent group value posts",
      ],
      blocked_scope: ["High-budget cold ad scaling"],
      blocked_keywords: ["high-budget cold ad", "scale cold ads", "$5,000 ad"],
    },
    STAGE_3: {
      stage_id: "STAGE_3",
      stage_title: "Targeted GTA Paid Scaling (61–100 Paid)",
      short_badge: "Stage 3: GTA Paid Scaling (Blended CAC ≤ $150 CAD)",
      min_paid: 61,
      max_paid: 100,
      target_paid_count: 100,
      primary_kpi_name: "GTA Blended CAC <= $150 CAD",
      primary_kpi_target_pct: 25,
      secondary_kpi_summary: "Blended CAC <= $150 CAD across Mississauga, Oakville, Markham, Toronto",
      allowed_scope: [
        "Meta/Google ads to validated diagnostic landing page",
        "Creative A/B tests",
        "Budget reallocation alerts",
      ],
      blocked_scope: ["Unmeasured brand awareness spend without CAC stop-loss"],
      blocked_keywords: ["untracked brand awareness"],
    },
  },

  TIER_3: {
    STAGE_1: {
      stage_id: "STAGE_1",
      stage_title: "Consultative Closing & Tier 2 Upgrade Path (0–5 Paid)",
      short_badge: "Stage 1: Consultation → Prime Close ≥ 40%",
      min_paid: 0,
      max_paid: 5,
      target_paid_count: 5,
      primary_kpi_name: "Consultation Completed -> Prime Enrolled",
      primary_kpi_target_pct: 40,
      secondary_kpi_summary: "Tier 2 -> Tier 3 Flag A overload & MHF4U/MCV4U/SBI4U exam upgrades",
      allowed_scope: [
        "1:1 parent executive consultation scripts",
        "Tier 2-to-Tier 3 upgrade triggers (Flag A overload or upcoming MHF4U/MCV4U/SBI4U exams)",
        "Custom university-prep study plan templates",
      ],
      blocked_scope: [
        "Mass social media or cold ads",
        "Discount/cheap self-serve framing",
      ],
      blocked_keywords: [
        "mass social",
        "cold ad",
        "facebook ad",
        "discount",
        "coupon",
        "cheap",
        "flash sale",
      ],
    },
    STAGE_2: {
      stage_id: "STAGE_2",
      stage_title: "Case Studies & VIP Referral Circle (6–15 Paid)",
      short_badge: "Stage 2: ≥ 3 Turnaround Case Studies & VIP Referrals ≥ 30%",
      min_paid: 6,
      max_paid: 15,
      target_paid_count: 15,
      primary_kpi_name: "VIP Parent Referral Share",
      primary_kpi_target_pct: 30,
      secondary_kpi_summary: ">= 3 anonymized Grade 11–12 turnaround stories & Waterloo CEMC positioning",
      allowed_scope: [
        "Anonymized outcome briefs & turnaround stories",
        "Private VIP parent invitation notes",
        "Waterloo CEMC / OUAC university-prep positioning",
      ],
      blocked_scope: [
        "Discount promotions that erode premium positioning",
        "Mass cold ad blasts",
      ],
      blocked_keywords: ["discount", "coupon", "cheap", "50% off", "bogo"],
    },
    STAGE_3: {
      stage_id: "STAGE_3",
      stage_title: "Premium Inbound & Waitlist Positioning (16–30 Paid)",
      short_badge: "Stage 3: Tutor Utilization ≥ 85% + Active Waitlist",
      min_paid: 16,
      max_paid: 30,
      target_paid_count: 30,
      primary_kpi_name: "Educator 1:1 Utilization Rate",
      primary_kpi_target_pct: 85,
      secondary_kpi_summary: "Active waitlist intake for Grade 12 MHF4U/MCV4U/SCH4U/SBI4U exam seasons",
      allowed_scope: [
        "High-intent search funnels for Grade 12 math/science exam seasons",
        "Waitlist intake pages",
        "Exclusive consultation calendars",
      ],
      blocked_scope: ["Discount promotions that erode premium positioning"],
      blocked_keywords: ["discount", "cheap", "flash sale"],
    },
  },
};

export function computeFunnelRates(metrics: WeeklyFunnelMetrics) {
  const contactToBookedPct =
    metrics.reach_or_contacts > 0
      ? Math.round((metrics.diag_booked / metrics.reach_or_contacts) * 100)
      : 0;
  const bookedToCompletedPct =
    metrics.diag_booked > 0
      ? Math.round((metrics.diag_completed / metrics.diag_booked) * 100)
      : 0;
  const completedToPaidPct =
    metrics.diag_completed > 0
      ? Math.round((metrics.paid_conversions / metrics.diag_completed) * 100)
      : 0;
  return {
    contactToBookedPct,
    bookedToCompletedPct,
    completedToPaidPct,
  };
}

// ============================================================================
// 2. TIER-AWARE SCOPE DRIFT & CROSS-TIER TONE BLEED GUARDRAIL
// ============================================================================

export function checkTierAndStageGuardrail(params: {
  userCommand: string;
  tierWorkspace: TierWorkspaceState;
  funnelMetrics: WeeklyFunnelMetrics;
}): ScopeDriftWarning {
  const { userCommand, tierWorkspace, funnelMetrics } = params;
  const lower = userCommand.toLowerCase();
  const activeStage = tierWorkspace.active_stage;
  const stageGoal = tierWorkspace.stage_goals[activeStage];
  const rates = computeFunnelRates(funnelMetrics);

  // 0. Global Rule: Never mention "30-minute tutoring" anywhere — always 60-minute sessions (and strictly 4x60-min/mo or 8x60-min/mo in Tier 3)
  if (
    lower.includes("30-minute tutor") ||
    lower.includes("30-min tutor") ||
    lower.includes("30 min tutor") ||
    lower.includes("30 minute tutor") ||
    lower.includes("uncapped weekly tutor")
  ) {
    return {
      detected: true,
      violationType: "CROSS_TIER_TONE_BLEED",
      requestedCommand: userCommand,
      tierId: tierWorkspace.tier_id,
      activeStage,
      blockedReason: `Session Duration & Margin Guardrail Blocked: MindLC live tutoring sessions are strictly 60-minute sessions (4 × 60-minute sessions/month in Tier 3 base $399/mo, or 8 × 60-minute sessions/month with the +$250/mo Intensive Add-on at $649/mo). Never pitch 30-minute tutoring or uncapped weekly sessions (which cause 4.33-week calendar margin leakage).`,
      bottleneckMathExplanation: `Product Isolation Rule: Tier 3 caps monthly delivery at 4 × 60-minute live sessions/month (or 8 × 60-minute with the +$250/mo add-on) plus a tutor-integrated monthly 15-minute parent briefing.`,
      suggestedInScopeAlternative: `Specify 4 × 60-minute live 1:1 sessions/month ($399/mo base) or 8 × 60-minute live sessions/month ($649/mo Intensive) in Tier 3.`,
    };
  }

  // 1. Check Cross-Tier Tone Bleed FIRST
  const bleedKeyword = tierWorkspace.forbidden_cross_tier_keywords.find((kw) =>
    lower.includes(kw.toLowerCase())
  );

  if (bleedKeyword) {
    return {
      detected: true,
      violationType: "CROSS_TIER_TONE_BLEED",
      requestedCommand: userCommand,
      tierId: tierWorkspace.tier_id,
      activeStage,
      blockedReason: `Cross-Tier Tone Bleed Blocked in ${tierWorkspace.tier_name}: Your prompt triggered "${bleedKeyword}". ${tierWorkspace.tone_guardrail}`,
      bottleneckMathExplanation: `Product Isolation Rule: ${tierWorkspace.forbidden_cross_tier_claims.join(" · ")}`,
      suggestedInScopeAlternative: `Stay strictly within ${tierWorkspace.tier_short_name} (${tierWorkspace.price_label}): ${stageGoal.allowed_scope.join(", ")}.`,
    };
  }

  // 2. Check Active Stage Bottleneck Lock
  const blockedStageKeyword = stageGoal.blocked_keywords.find((kw) =>
    lower.includes(kw.toLowerCase())
  );

  if (blockedStageKeyword) {
    return {
      detected: true,
      violationType: "STAGE_BOTTLENECK_DRIFT",
      requestedCommand: userCommand,
      tierId: tierWorkspace.tier_id,
      activeStage,
      blockedReason: `Stage Bottleneck Drift Blocked (${tierWorkspace.tier_short_name} · ${activeStage} at ${tierWorkspace.current_paid_count}/${tierWorkspace.north_star_paid_goal} paid): "${blockedStageKeyword}" is outside ${stageGoal.stage_title}.`,
      bottleneckMathExplanation: `Current ${tierWorkspace.tier_short_name} Funnel Reality: ${funnelMetrics.diag_completed} ${tierWorkspace.funnel_labels[2]} → ${funnelMetrics.paid_conversions} ${tierWorkspace.funnel_labels[3]} (${rates.completedToPaidPct}% vs. ${stageGoal.primary_kpi_target_pct}% target for ${stageGoal.primary_kpi_name}). Secondary Goal: ${stageGoal.secondary_kpi_summary}.`,
      suggestedInScopeAlternative: `Focus on an allowed ${tierWorkspace.tier_short_name} ${activeStage} play: ${stageGoal.allowed_scope.join(" | ")}.`,
    };
  }

  return {
    detected: false,
    violationType: "STAGE_BOTTLENECK_DRIFT",
    requestedCommand: userCommand,
    tierId: tierWorkspace.tier_id,
    activeStage,
    blockedReason: "",
    bottleneckMathExplanation: "",
    suggestedInScopeAlternative: "",
  };
}

export function validateMandatoryProposalSchema(
  p: MandatoryProposalSchema
): { valid: boolean; missingFields: string[] } {
  const missing: string[] = [];
  if (!p.proposal_id?.trim()) missing.push("proposal_id");
  if (!p.tier_id) missing.push("tier_id");
  if (!p.stage_id) missing.push("stage_id");
  if (!p.title?.trim()) missing.push("title");
  if (!p.channel?.trim()) missing.push("channel");
  if (!p.target_metric?.trim()) missing.push("target_metric");
  if (!Array.isArray(p.cited_voc_quotes) || p.cited_voc_quotes.length === 0) {
    missing.push("cited_voc_quotes");
  }
  if (!p.single_cta?.trim()) missing.push("single_cta");
  if (!p.asset_body?.trim()) missing.push("asset_body");
  if (!p.devils_advocate?.primary_failure_hypothesis?.trim()) {
    missing.push("devils_advocate.primary_failure_hypothesis");
  }
  if (!p.devils_advocate?.blind_spot_question?.trim()) {
    missing.push("devils_advocate.blind_spot_question");
  }
  if (!p.kill_criteria?.sample_threshold?.trim()) {
    missing.push("kill_criteria.sample_threshold");
  }
  if (!p.kill_criteria?.stop_loss_metric?.trim()) {
    missing.push("kill_criteria.stop_loss_metric");
  }
  if (!p.kill_criteria?.pivot_action?.trim()) {
    missing.push("kill_criteria.pivot_action");
  }
  return { valid: missing.length === 0, missingFields: missing };
}

// ============================================================================
// 3. TIER-AWARE AGENT SYSTEM PROMPT BUILDER
// Injects ONLY the selected tier's value prop, active stage goal, latest log,
// and top 8 VoC quotes for that tier.
// ============================================================================

export function buildTierAwareSystemInstruction(params: {
  skill: MarketingSkill;
  tierWorkspace: TierWorkspaceState;
  detailLevel: DetailLevel;
  vocQuotesForTier: VerbatimParentQuote[];
}): string {
  const { skill, tierWorkspace, detailLevel, vocQuotesForTier } = params;
  const activeStage = tierWorkspace.active_stage;
  const stageGoal = tierWorkspace.stage_goals[activeStage];
  const latestLog = tierWorkspace.weekly_reality_logs[0];
  const metrics = latestLog?.funnel_metrics || {
    reach_or_contacts: 100,
    diag_booked: 30,
    diag_completed: 20,
    paid_conversions: 3,
  };
  const rates = computeFunnelRates(metrics);
  const top8Quotes = vocQuotesForTier.slice(0, 8);
  const [lbl1, lbl2, lbl3, lbl4] = tierWorkspace.funnel_labels;

  return `
[GEMINI TIER-ISOLATED CONTEXT CACHE: cache_key="mindlc_${tierWorkspace.tier_id.toLowerCase()}_${activeStage.toLowerCase()}_v3"]
Selected Product Tier: ${tierWorkspace.tier_name} (${tierWorkspace.price_label})
Offer Architecture: ${tierWorkspace.offer_summary}
Target Persona: ${tierWorkspace.target_persona}
North Star Progress: ${tierWorkspace.current_paid_count} / ${tierWorkspace.north_star_paid_goal} Paid Students

[CROSS-TIER TONE BLEED GUARDRAIL — STRICTLY ENFORCED]
• Tone Mandate: ${tierWorkspace.tone_guardrail}
• FORBIDDEN CROSS-TIER CLAIMS: ${tierWorkspace.forbidden_cross_tier_claims.join(" | ")}

[ACTIVE STAGE BOTTLENECK LOCK: ${activeStage} — ${stageGoal.stage_title}]
• Primary KPI Target: ${stageGoal.primary_kpi_name} >= ${stageGoal.primary_kpi_target_pct}%
• Secondary KPI Target: ${stageGoal.secondary_kpi_summary}
• ALLOWED PROPOSAL SCOPE: ${stageGoal.allowed_scope.join(" | ")}
• BLOCKED SCOPE: ${stageGoal.blocked_scope.join(" | ")}

[LATEST WEEKLY REALITY LOG (${tierWorkspace.tier_id} · Week of ${latestLog?.week_start_date || "Current"})]
• ${lbl1} (${metrics.reach_or_contacts}) -> ${lbl2} (${metrics.diag_booked} = ${rates.contactToBookedPct}%) -> ${lbl3} (${metrics.diag_completed} = ${rates.bookedToCompletedPct}%) -> ${lbl4} (${metrics.paid_conversions} = ${rates.completedToPaidPct}%)
• Top Winning Touchpoint: ${latestLog?.top_winning_touchpoint || "Direct diagnostic review"}

[TOP 8 RELEVANT VoC QUOTES (${tierWorkspace.tier_id} + ALL) — MUST CITE >= 1]
${top8Quotes
  .map(
    (q) =>
      `- [${q.id} · tier:${q.tier_id} · tag:${q.context_tag}]: "${q.quote_text}"`
  )
  .join("\n")}

[MANDATORY WRITING STYLE FOR asset_body — STOP AI-OUTLINE OVERFORMATTING]
• Write like a calm, credible Ontario STEM educator and human leader—NEVER like a robotic AI outline.
• Do NOT emit bracketed meta-headers (e.g., "## [Tier 1 · Stage 1]"), robotic label prefixes, or heavy markdown symbol clutter.
• Use natural conversational paragraphs, warm educator cadence, and clean bullet points only where a parent or Learning Manager genuinely benefits from a scannable list.
[/GEMINI TIER-ISOLATED CONTEXT CACHE]

[ACTIVE MARKETING SKILL: ${skill.skill_name} (Detail Level ${detailLevel})]
${skill.system_prompt}
`.trim();
}

// Keep backward-compatible helper signature for Persona preview
export function buildGeminiSystemInstruction(
  skill: MarketingSkill,
  _persona: BrandPersona,
  detailLevel: DetailLevel,
  tierWorkspace?: TierWorkspaceState,
  vocQuotes: VerbatimParentQuote[] = []
): string {
  if (tierWorkspace) {
    return buildTierAwareSystemInstruction({
      skill,
      tierWorkspace,
      detailLevel,
      vocQuotesForTier: vocQuotes,
    });
  }
  return `Skill: ${skill.skill_name} (Level ${detailLevel})`;
}

export interface GenerateMarketingRequest {
  userCommand: string;
  selectedSkill: MarketingSkill;
  detailLevel: DetailLevel;
  tierWorkspace: TierWorkspaceState;
  vocQuotesForTier: VerbatimParentQuote[];
  preferredPlatform?: AssetPlatform;
  existingProposalToRevise?: MandatoryProposalSchema;
  nextVersionNumber?: number;
}

export async function generateMarketingResponse(
  req: GenerateMarketingRequest
): Promise<MandatoryOutputProtocol> {
  const {
    userCommand,
    selectedSkill,
    detailLevel,
    tierWorkspace,
    vocQuotesForTier,
    preferredPlatform = "Parent Call",
    existingProposalToRevise,
    nextVersionNumber = 2,
  } = req;

  await new Promise((resolve) => setTimeout(resolve, 420));

  const tierId = tierWorkspace.tier_id;
  const stageId = tierWorkspace.active_stage;
  const stageGoal = tierWorkspace.stage_goals[stageId];
  const latestLog = tierWorkspace.weekly_reality_logs[0];
  const metrics = latestLog?.funnel_metrics || {
    reach_or_contacts: 80,
    diag_booked: 24,
    diag_completed: 16,
    paid_conversions: 3,
  };
  const rates = computeFunnelRates(metrics);
  const lowerCmd = userCommand.toLowerCase();

  const citedQuotesList =
    vocQuotesForTier.length > 0
      ? vocQuotesForTier
          .slice(0, 2)
          .map(
            (q) =>
              `[${q.id} · ${q.tier_id} · ${q.context_tag}] "${q.quote_text}"`
          )
      : [
          `[VOC-101 · ${tierId} · ai_cheating] "My teen uses ChatGPT to finish homework in 5 minutes and then gets 56% on closed-book MHF4U unit tests."`,
        ];

  // =========================================================================
  // CONVERSATIONAL HITL REVISION OF EXISTING PROPOSAL (Tier-Isolated)
  // =========================================================================
  if (existingProposalToRevise) {
    const previousAssetBody = existingProposalToRevise.asset_body;
    let revisedBody = existingProposalToRevise.asset_body;
    let revisedSingleCta = existingProposalToRevise.single_cta;
    let changeSummaryPill = `Updated v${nextVersionNumber} (${tierWorkspace.tier_short_name}): Applied CMO refinement & preserved tier isolation`;
    let devilsAdvocate = { ...existingProposalToRevise.devils_advocate };

    if (
      lowerCmd.includes("soften") ||
      lowerCmd.includes("calm") ||
      lowerCmd.includes("teacher")
    ) {
      changeSummaryPill = `Updated v${nextVersionNumber} (${tierWorkspace.tier_short_name}): Softened tone to calm Ontario STEM educator guidance & removed promotional pressure`;
      revisedBody = `${existingProposalToRevise.asset_body}\n\n### Calm Ontario Educator Framing\nWe keep our commitment simple and transparent (${tierWorkspace.price_label}): ${tierWorkspace.offer_summary}\n\nNext Step: ${revisedSingleCta}`;
    } else if (
      lowerCmd.includes("k/t/c/a") ||
      lowerCmd.includes("ktca") ||
      lowerCmd.includes("ontario") ||
      lowerCmd.includes("mhf4u") ||
      lowerCmd.includes("sbi3u")
    ) {
      changeSummaryPill = `Updated v${nextVersionNumber} (${tierWorkspace.tier_short_name}): Sharpened Ontario Growing Success (K/T/C/A) rubric alignment for MHF4U, MCR3U & SBI3U`;
      revisedBody = `${existingProposalToRevise.asset_body}\n\n### Ontario Growing Success (K/T/C/A) Rubric Alignment\nAs Ontario families often share with us: ${citedQuotesList[0]}.\n\n• We separate routine formula recall (Knowledge) from multi-step closed-book problem decomposition (Thinking & Application).\n• ${tierWorkspace.offer_summary}`;
    } else if (
      lowerCmd.includes("challenge") ||
      lowerCmd.includes("assumption") ||
      lowerCmd.includes("devil")
    ) {
      changeSummaryPill = `Updated v${nextVersionNumber} (${tierWorkspace.tier_short_name}): Stress-tested Devil's Advocate failure hypothesis for ${stageGoal.stage_title}`;
      devilsAdvocate = {
        primary_failure_hypothesis: `Critical ${tierWorkspace.tier_short_name} Risk: Even if the parent agrees with the diagnostic gap, conversion will stall below ${stageGoal.primary_kpi_target_pct}% if the friction between '${tierWorkspace.funnel_labels[2]}' and '${tierWorkspace.funnel_labels[3]}' takes more than 90 seconds.`,
        blind_spot_question: `Does this ${tierWorkspace.tier_short_name} asset answer ${citedQuotesList[0].split(" ")[0]} before asking for the ${tierWorkspace.price_label} commitment?`,
      };
      revisedBody = `${existingProposalToRevise.asset_body}\n\n### Pre-Emptive Parent Trust Bridge\nBefore you decide on anything, we address the exact concern parents raise most often: ${citedQuotesList[0]}.`;
    } else {
      changeSummaryPill = `Updated v${nextVersionNumber} (${tierWorkspace.tier_short_name}): "${userCommand.slice(0, 48)}"`;
      revisedBody = `${existingProposalToRevise.asset_body}\n\n### Refined Educator Note\n${userCommand}\n\n• ${tierWorkspace.offer_summary}\n• Next Step: ${revisedSingleCta}`;
    }

    const revisedSchema: MandatoryProposalSchema = {
      ...existingProposalToRevise,
      tier_id: tierId,
      stage_id: stageId,
      bottleneck_stage: stageId,
      status: "REFINING",
      version: nextVersionNumber,
      cited_voc_quotes: citedQuotesList,
      single_cta: revisedSingleCta,
      asset_body: revisedBody,
      previous_asset_body: previousAssetBody,
      devils_advocate: devilsAdvocate,
      revision_notes: changeSummaryPill,
    };

    return {
      protocolVersion: "3.0-MINDLC-3TIER",
      tierId,
      stageId,
      targetPlatform: preferredPlatform,
      assetTitle: revisedSchema.title,
      marketingContent: revisedSchema.asset_body,
      proposalSchema: revisedSchema,
      changeSummaryPill,
      strategicJustification: {
        detailLevel,
        levelLabel:
          detailLevel === 1
            ? "Level 1: Executive Summary (Fast)"
            : detailLevel === 2
            ? "Level 2: Standard Rationale"
            : "Level 3: Deep Mentorship (The Why & How)",
        headlineSummary: changeSummaryPill,
        rationaleBody: `1. **Tier & Stage Isolation:** Scoped strictly to **${tierWorkspace.tier_name}** (${stageGoal.short_badge}).\n2. **VoC Grounding:** Cites ${citedQuotesList[0]}.\n3. **Ready for 30s Approval:** Check the 3 verification boxes below to lock this ${tierWorkspace.tier_short_name} asset.`,
        frameworksApplied: [
          tierWorkspace.tier_short_name,
          stageGoal.stage_title,
          selectedSkill.skill_name,
        ],
        mentorshipTakeaway: `Toggle 'Show Changes Diff' in the Left Pane header to compare v${nextVersionNumber - 1} vs. v${nextVersionNumber}.`,
        contextCacheStatus: `Tier Cache HIT (${tierId} · ${stageId} · ${vocQuotesForTier.length} VoC quotes)`,
      },
    };
  }

  // =========================================================================
  // GENERATE NEW PROPOSAL SCOPED BY TIER_1, TIER_2, OR TIER_3
  // =========================================================================
  let proposalSchema: MandatoryProposalSchema;

  if (tierId === "TIER_1") {
    // TIER 1: Online Self-Coach ($39/mo | 5-mo Semester Pass $165 | Sibling +$19/mo)
    proposalSchema = {
      proposal_id: `PROP-T1-${stageId}-${Date.now().toString().slice(-4)}`,
      tier_id: "TIER_1",
      stage_id: stageId,
      bottleneck_stage: stageId,
      status: "IN_REVIEW",
      version: 1,
      title:
        stageId === "STAGE_1"
          ? `Self-Serve Diagnostic-to-Checkout Bridge & Day-7 Socratic Voice + LaTeX HUD Onboarding (${tierWorkspace.price_label})`
          : stageId === "STAGE_2"
          ? `Ontario Unit-Test Checklist (MPM2D · MCR3U · MHF4U · SBI3U) & +$19/mo Sibling Self-Coach Loop`
          : `Low-CAC Course-Code Search Ad Variant (MCR3U / MHF4U Exam Prep — Target CAC ≤ $40 CAD)`,
      channel:
        stageId === "STAGE_1"
          ? "Landing Page"
          : stageId === "STAGE_2"
          ? "Community"
          : "Social",
      target_metric: `${stageGoal.primary_kpi_name} ≥ ${stageGoal.primary_kpi_target_pct}% (Current: ${rates.completedToPaidPct}%)`,
      cited_voc_quotes: citedQuotesList,
      single_cta:
        stageId === "STAGE_1"
          ? "Unlock Instant 24/7 Socratic Voice + LaTeX HUD Access ($39 CAD/mo or $165 5-Mo Semester Pass — Cancel Anytime)"
          : stageId === "STAGE_2"
          ? "Download the Free MCR3U/MHF4U Unit-Test Checklist & Add a Sibling Seat for +$19/mo"
          : "Start Your Free 10-Minute Automated Socratic Voice + LaTeX HUD Diagnostic Now",
      asset_body: `### Instant Post-Diagnostic Result Summary
When your teen finishes their 10-minute diagnostic in MPM2D, MCR3U, MHF4U, or SBI3U, they immediately see their live LaTeX step trace on screen—no credit card wall required.

> "You solved 3 of 5 procedural steps accurately, but paused on the multi-step Thinking & Application chain. As Ontario parents tell us: ${citedQuotesList[0]}."

### Why Self-Serve Socratic Voice + LaTeX HUD Beats Generic ChatGPT
• Spoken Socratic Guidance + Visual LaTeX Step Board: Instead of dumping an instant answer key that causes closed-book test blanking, our voice coach asks one guiding question at a time while plotting the live equation on the LaTeX HUD.
• Built-In Evening Study Habit &Automated Weekly Email Summary: Short 15-minute unit-test warmup missions help Ontario Grade 9–12 students practice independently four nights a week ($39/mo self-serve, $165 5-month semester pass, or +$19/mo sibling add-on).`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Self-serve teenagers and parents abandon checkout if they have to create an account before seeing their personalized LaTeX HUD diagnostic result, or if Day-3 usage drops because there is no automated SMS unit-test reminder.",
        blind_spot_question:
          "Does the self-serve onboarding capture the student's next Ontario unit test date within 30 seconds so automated Day-3 and Day-7 Socratic reminders fire on time?",
      },
      kill_criteria: {
        sample_threshold: "100 completed free self-serve diagnostics",
        stop_loss_metric: `< ${stageGoal.primary_kpi_target_pct}% Diagnostic-to-Paid self-serve checkout OR < 50% Day-7 student return`,
        pivot_action:
          "Gate only the final step of the interactive LaTeX HUD diagnostic behind a '$1 CAD 7-Day Exam-Week Trial' that auto-renews at $39 CAD/mo.",
      },
      revision_notes: `v1 Initial ${tierWorkspace.tier_short_name} (${stageId}) proposal — strictly zero human-tutor claims.`,
    };
  } else if (tierId === "TIER_2") {
    // TIER 2: Managed Hybrid ($139/mo | 5-mo Semester Pass $590 | Sibling +$79/mo)
    proposalSchema = {
      proposal_id: `PROP-T2-${stageId}-${Date.now().toString().slice(-4)}`,
      tier_id: "TIER_2",
      stage_id: stageId,
      bottleneck_stage: stageId,
      status: "IN_REVIEW",
      version: 1,
      title:
        stageId === "STAGE_1"
          ? `10-Min Parent Debrief Script & Growing Success (K/T/C/A) Cognitive Report Close ($139/mo | $590 5-Mo Pass)`
          : stageId === "STAGE_2"
          ? `Week 4–6 Learning Manager Parent Referral Invite & +$79/mo Sibling Enrollment Kit`
          : `GTA Geo-Targeted (Mississauga · Oakville · Markham) Meta Ad Variant (Blended CAC ≤ $150 CAD)`,
      channel:
        stageId === "STAGE_1"
          ? "Parent Call"
          : stageId === "STAGE_2"
          ? "Community"
          : "Social",
      target_metric: `${stageGoal.primary_kpi_name} ≥ ${stageGoal.primary_kpi_target_pct}% (Current: ${rates.completedToPaidPct}%)`,
      cited_voc_quotes: citedQuotesList,
      single_cta:
        stageId === "STAGE_1"
          ? "Activate Your Teen's 30-Day Risk-Free Tier 2 Managed Hybrid Seat ($139/mo or $590 5-Mo Semester Pass) to Lock Tomorrow's Human Learning Manager Onboarding"
          : stageId === "STAGE_2"
          ? "Forward Your 2 VIP 'Growing Success K/T/C/A Diagnostic Guest Passes' to 2 GTA Parent Friends"
          : "Book Your Teen's Free 20-Minute Ontario K/T/C/A Diagnostic & Learning Manager Debrief",
      asset_body: `### First 90 Seconds: Growing Success (K/T/C/A) Diagnostic Walkthrough
> "When we looked at {{student_first_name}}'s diagnostic across Ontario's Growing Success Achievement Chart (Knowledge, Thinking, Communication, Application), we saw the exact pattern you mentioned: ${citedQuotesList[0]}. Formula recall (Knowledge) is 82%, while unassisted multi-step Thinking & Application is 44%."

### Why Tier 2 Managed Hybrid ($139/mo | $590 5-Mo Pass | Sibling +$79/mo) Solves What Self-Study & $380/mo Centres Miss
• 24/7 AI Socratic Coach: Available every evening at 9:45 PM to guide your teen with step-by-step hints without ever handing over the final answer.
• Dedicated Human Learning Manager + Monthly 20–30 Min Parent Briefings: Removes kitchen-table nagging by reviewing weekly Socratic logs and delivering a Growing Success K/T/C/A progress scorecard every Friday plus a monthly 20–30 minute parent briefing.
• 30-Day Active-Habit Guarantee: 3+ Socratic sessions per week established in Month 1, or a full 100% tuition refund.`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Ontario parents delay enrollment ('Let me ask my spouse') if the 10-minute debrief sounds like a feature overview instead of screen-sharing their child's exact K/T/C/A Thinking stall within the first 90 seconds.",
        blind_spot_question:
          "Does the Learning Manager show the student's actual timestamped diagnostic error trace before mentioning the $139 CAD/month price?",
      },
      kill_criteria: {
        sample_threshold: "12 completed 10-minute parent diagnostic debrief calls",
        stop_loss_metric: `< ${stageGoal.primary_kpi_target_pct}% conversion into $139 CAD/mo Tier 2 within 48 hours`,
        pivot_action:
          "Pivot call close offer immediately to a '$19 CAD 14-Day Midterm Rescue Sprint' that auto-upgrades to $139 CAD/mo Tier 2 on Day 15.",
      },
      revision_notes: `v1 Initial ${tierWorkspace.tier_short_name} (${stageId}) proposal grounded in Growing Success K/T/C/A reports.`,
    };
  } else {
    // TIER 3: Prime 1:1 Online Tutor ($399/mo base = 4×60-min live sessions/mo | +$250/mo Intensive Add-on = $649/mo for 8×60-min sessions/mo | 5-mo Pass $1,795/$2,995 | Sibling +$349/mo)
    proposalSchema = {
      proposal_id: `PROP-T3-${stageId}-${Date.now().toString().slice(-4)}`,
      tier_id: "TIER_3",
      stage_id: stageId,
      bottleneck_stage: stageId,
      status: "IN_REVIEW",
      version: 1,
      title:
        stageId === "STAGE_1"
          ? `1:1 Executive Parent Consultation Script & Tier 2 → Tier 3 Prime Upgrade Trigger ($399/mo Base 4×60m | $649/mo Intensive 8×60m)`
          : stageId === "STAGE_2"
          ? `Anonymized Grade 12 University-Prep Turnaround Brief & Waterloo CEMC / OUAC VIP Referral Circle Note`
          : `Grade 12 Exam-Season Waitlist Intake & Exclusive 1:1 Educator Consultation Calendar`,
      channel:
        stageId === "STAGE_1"
          ? "Consultation"
          : stageId === "STAGE_2"
          ? "Email"
          : "Landing Page",
      target_metric: `${stageGoal.primary_kpi_name} ≥ ${stageGoal.primary_kpi_target_pct}% (Current: ${rates.completedToPaidPct}%)`,
      cited_voc_quotes: citedQuotesList,
      single_cta:
        stageId === "STAGE_1"
          ? "Reserve 1 of 3 Remaining Prime 1:1 Educator Seats ($399/mo Base for 4×60-Min Live Sessions or $649/mo Intensive for 8×60-Min Sessions)"
          : stageId === "STAGE_2"
          ? "Request a Private VIP Introduction to Our Lead STEM Educator for a Trusted Grade 11/12 Family"
          : "Apply for Priority Placement on the Grade 12 MHF4U / MCV4U / SBI4U Prime 1:1 Educator Waitlist",
      asset_body: `### Flag A Overload Consultation Opening
When a Grade 11/12 student in MHF4U (Advanced Functions), MCV4U (Calculus & Vectors), SCH4U, or SBI4U stalls on 3+ consecutive Level 4 Thinking & Application problems within 21 days of a major exam or OUAC transmission window, our team schedules a private 1:1 syllabus review.

### Consultative Closing Script for University-Prep Families
> "In reviewing {{student_first_name}}'s MHF4U and MCV4U cognitive trace this week, we flagged what you noted earlier: ${citedQuotesList[0]}. When targeting 88%–93%+ top-6 averages for Engineering, Computer Science, or Business programs, Socratic AI practice works best alongside live surgical instruction."

### How the Prime 1:1 Online Tutor Hybrid Works ($399/mo Base | $649/mo Intensive)
• 4 × 60-Minute Live 1:1 Online STEM Tutoring Sessions per Month ($399/mo Base, or $1,795 5-Mo Pass): Tailored directly to their school teacher's unit test rubric and Waterloo CEMC extension problems (strictly 4 × 60-minute sessions/month, with an optional +$250/mo Intensive Add-on at $649/mo or $2,995 5-Mo Pass for 8 × 60-minute live sessions/month).
• 24/7 Guided Socratic AI Between Live Sessions: Reinforces what the educator taught so your teen never gets stuck on Tuesday or Thursday night homework.
• Tutor-Integrated Monthly 15-Minute Parent Briefing: Direct monthly OUAC prerequisite grade tracking with your lead educator (no duplicate manager handoffs; Sibling add-on +$349/mo).`,
      devils_advocate: {
        primary_failure_hypothesis:
          "Affluent Grade 11/12 university-prep parents will reject Tier 3 Prime if it is pitched with mass-market discount urgency rather than scarce educator capacity and clinical OUAC prerequisite protection.",
        blind_spot_question:
          "Does the consultation present a custom 6-week unit-by-unit MHF4U/MCV4U/SBI4U syllabus roadmap tailored to the student's exact high school before discussing tuition?",
      },
      kill_criteria: {
        sample_threshold: "8 completed 1:1 Prime parent consultations or Flag A upgrade briefings",
        stop_loss_metric: `< ${stageGoal.primary_kpi_target_pct}% Consultation-to-Prime enrollment close rate`,
        pivot_action:
          "Offer Tier 2 families a '2-Week Pre-Midterm Prime 1:1 Live Educator Intensive Add-On' that seamlessly converts into full-semester Prime enrollment after the unit test.",
      },
      revision_notes: `v1 Initial ${tierWorkspace.tier_short_name} (${stageId}) proposal — zero discount/mass-market tone bleed, strict 4×60-min / 8×60-min session cap.`,
    };
  }

  return {
    protocolVersion: "3.0-MINDLC-3TIER",
    tierId,
    stageId,
    targetPlatform: preferredPlatform,
    assetTitle: proposalSchema.title,
    marketingContent: proposalSchema.asset_body,
    proposalSchema,
    changeSummaryPill: `Created v1 (${tierWorkspace.tier_short_name} · ${stageId}): Citing ${proposalSchema.cited_voc_quotes.length} VoC quotes`,
    strategicJustification: {
      detailLevel,
      levelLabel:
        detailLevel === 1
          ? "Level 1: Executive Summary (Fast)"
          : detailLevel === 2
          ? "Level 2: Standard Rationale"
          : "Level 3: Deep Mentorship (The Why & How)",
      headlineSummary: `Drafted ${tierWorkspace.tier_short_name} (${stageId}) Proposal: "${proposalSchema.title}"`,
      rationaleBody: `1. **Strict Tier Isolation (${tierWorkspace.tier_name}):** ${tierWorkspace.offer_summary}\n2. **Active Stage Goal (${stageId}):** Locked to **${stageGoal.short_badge}** (${stageGoal.secondary_kpi_summary}).\n3. **VoC Grounding:** Cites ${proposalSchema.cited_voc_quotes.join(" ; ")}.`,
      frameworksApplied: [
        tierWorkspace.tier_short_name,
        stageGoal.stage_title,
        selectedSkill.skill_name,
      ],
      mentorshipTakeaway:
        "Use the 3 quick-steer chips below to refine this draft, then check all 3 boxes in the Sticky 30-Second Approval Dock to lock the asset.",
      contextCacheStatus: `Tier Cache HIT (${tierId} · ${stageId} · ${vocQuotesForTier.length} VoC quotes)`,
    },
  };
}

export async function executeAutonomousAgentTask(params: {
  activity: PlannedActivity;
  agent: MarketingAgent;
  brandPersona: BrandPersona;
  tierWorkspace: TierWorkspaceState;
  vocQuotesForTier: VerbatimParentQuote[];
}): Promise<{
  assetTitle: string;
  platform: AssetPlatform;
  content: string;
  proposalSchema: MandatoryProposalSchema;
  agentReport: string;
}> {
  const { activity, agent, tierWorkspace, vocQuotesForTier } = params;

  const mockSkill: MarketingSkill = {
    id: `skill-${activity.skillName}`,
    skill_name: activity.skillName,
    system_prompt: `Execute ${activity.title}`,
  };

  const generated = await generateMarketingResponse({
    userCommand: `${activity.title} — ${activity.tacticalExecution}`,
    selectedSkill: mockSkill,
    detailLevel: 3,
    tierWorkspace,
    vocQuotesForTier,
    preferredPlatform: activity.targetPlatform,
  });

  const customizedSchema: MandatoryProposalSchema = {
    ...generated.proposalSchema,
    proposal_id: `PROP-${tierWorkspace.tier_id}-${Date.now().toString().slice(-4)}`,
    title: `[${tierWorkspace.tier_short_name} · ${agent.codeName}] ${activity.title}`,
    channel: activity.targetPlatform,
    target_metric: activity.targetKpi,
  };

  return {
    assetTitle: customizedSchema.title,
    platform: activity.targetPlatform,
    content: customizedSchema.asset_body,
    proposalSchema: customizedSchema,
    agentReport: `${agent.codeName} drafted "${customizedSchema.title}" for ${tierWorkspace.tier_name} (${tierWorkspace.active_stage}).`,
  };
}

export async function evaluateCmoPlanQuestionAndAdjust(params: {
  question: string;
  activeHorizon: PlanHorizon;
  trends: OntarioTrendSignal[];
  competitors: CompetitorProfile[];
  brandPersona: BrandPersona;
  tierWorkspace: TierWorkspaceState;
}): Promise<{
  strategistAnswer: string;
  horizonAffected: PlanHorizon;
  newActivities: PlannedActivity[];
  adjustmentSummary: string[];
}> {
  const { question, activeHorizon, tierWorkspace } = params;
  await new Promise((r) => setTimeout(r, 380));

  const q = question.toLowerCase();
  const targetHorizon: PlanHorizon =
    q.includes("daily") || q.includes("today")
      ? "Daily"
      : q.includes("weekly") || q.includes("week")
      ? "Weekly"
      : q.includes("monthly") || q.includes("month")
      ? "Monthly"
      : q.includes("quarter") || q.includes("q1") || q.includes("q2")
      ? "Quarterly"
      : q.includes("annual") || q.includes("year")
      ? "Annual"
      : activeHorizon;

  const nowId = Date.now();
  const stageGoal = tierWorkspace.stage_goals[tierWorkspace.active_stage];

  const act1: PlannedActivity = {
    id: `plan-cmo-${nowId}-1`,
    tier_id: tierWorkspace.tier_id,
    horizon: targetHorizon,
    timeWindow: `${targetHorizon} Priority #1 (${tierWorkspace.tier_short_name} · ${tierWorkspace.active_stage})`,
    title: `[${tierWorkspace.tier_short_name}] ${question.slice(0, 68)}`,
    tacticalExecution: `1. Target Audience: ${tierWorkspace.target_persona}\n2. Concrete Action Steps: Execute ${stageGoal.allowed_scope.slice(0, 2).join(" and ")} tailored to "${question}". Ground the opening hook in our latest parent quote and Ontario Growing Success (K/T/C/A) Thinking & Application rubric.\n3. Closing Offer: Guide the family to one clear next step for ${tierWorkspace.tier_name} (${tierWorkspace.price_label}) to hit ${stageGoal.primary_kpi_name} ≥ ${stageGoal.primary_kpi_target_pct}%.`,
    deliverableSpec: `Complete ${stageGoal.allowed_scope[0]} Script & Parent Copy + Risk & Stop-Loss Guardrails`,
    marketTrigger: `CMO Strategic Directive ("${question.slice(0, 56)}")`,
    courseCodesTargeted: ["MHF4U", "MCV4U", "SBI3U", "MCR3U"],
    assignedAgentId: "agent-cro",
    skillName: "cro",
    targetPlatform: "Parent Call",
    funnelObjective: "Conversion Optimization",
    targetKpi: `${stageGoal.primary_kpi_name} ≥ ${stageGoal.primary_kpi_target_pct}%`,
    status: "Queued",
    adjustedByCmo: true,
    cmoAdjustmentNote: `Added to ${targetHorizon} schedule for ${tierWorkspace.tier_short_name} (${tierWorkspace.active_stage})`,
    requiredStage: tierWorkspace.active_stage,
  };

  return {
    horizonAffected: targetHorizon,
    strategistAnswer: `**CMO Plan Re-Calibration (${tierWorkspace.tier_name} · ${tierWorkspace.active_stage}):**\nLocked strictly to **${stageGoal.short_badge}** (${stageGoal.secondary_kpi_summary}). Added task to your ${targetHorizon} schedule.`,
    newActivities: [act1],
    adjustmentSummary: [
      `Added [${targetHorizon}] ${tierWorkspace.tier_short_name} Task: "${act1.title}"`,
    ],
  };
}
