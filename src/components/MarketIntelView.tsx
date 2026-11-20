"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { CompetitorProfile } from "@/types/database";
import {
  Radar,
  Globe,
  TrendingUp,
  AlertTriangle,
  Swords,
  Bot,
  ArrowRight,
  Search,
  CheckCircle2,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";

export function MarketIntelView() {
  const {
    ontarioTrends,
    competitors,
    agents,
    addScannedCompetitor,
    spawnCounterActivityFromCompetitor,
    spawnActivityFromTrend,
  } = useMarketingStore();

  const [scanUrl, setScanUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [latestScanResult, setLatestScanResult] = useState<{
    hostname: string;
    primaryH1: string;
    priceSignals: string[];
    gapsDetected: string[];
    wedgeAngle: string;
    compId: string;
  } | null>(null);

  const handleLiveCompetitorScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUrl.trim() || isScanning) return;

    setIsScanning(true);
    setScanError(null);
    setLatestScanResult(null);

    try {
      const res = await fetch("/api/market-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl.trim() }),
      });
      const data = await res.json();
      setIsScanning(false);

      if (!data.ok) {
        setScanError(data.error || "Could not scan competitor URL.");
        return;
      }

      const compId = `comp-live-${Date.now()}`;
      const newComp: CompetitorProfile = {
        id: compId,
        name: `${data.hostname} (Live Scanned)`,
        archetype: "Live Scanned Competitor",
        websiteUrl: data.url,
        pricingModel:
          data.extracted.priceSignals?.length > 0
            ? `Detected pricing: ${data.extracted.priceSignals.join(", ")}`
            : "Custom / Unlisted pricing on landing page",
        theirPrimaryPitch: data.extracted.primaryH1 || data.extracted.title,
        ontarioParentComplaint:
          "Parents comparing options find generic claims without Ontario course-code accountability or Socratic AI guardrails.",
        structuralWeakness: data.gapsDetected.join(" "),
        mindlcCounterWedge: data.counterStrategy.wedgeAngle,
        recommendedConversionPlay: data.counterStrategy.recommendedAgentTask,
        lastScannedAt: `Live scanned (${data.responseTimeMs}ms)`,
      };

      addScannedCompetitor(newComp);
      setLatestScanResult({
        hostname: data.hostname,
        primaryH1: data.extracted.primaryH1,
        priceSignals: data.extracted.priceSignals || [],
        gapsDetected: data.gapsDetected,
        wedgeAngle: data.counterStrategy.wedgeAngle,
        compId,
      });
      setScanUrl("");
    } catch (err: unknown) {
      setIsScanning(false);
      setScanError(
        err instanceof Error ? err.message : "Network error during scan"
      );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            <Radar className="w-4 h-4" />
            Real-Time Ontario EdTech Market & Competitive Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Ontario Education Trend Radar & Competitor Matrix
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl mt-1">
            Monitors Ontario school board exam calendars (TDSB, YRDSB, PDSB,
            HDSB), EQAO/OUAC windows, and competitor vulnerabilities—turning
            live market signals directly into multi-agent lead generation and
            conversion tasks.
          </p>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: LIVE COMPETITOR URL SCANNER & BATTLECARD GENERATOR
          ===================================================================== */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400">
              <Globe className="w-4 h-4" />
              Agent-01 Live Competitor Website Scanner (`/api/market-intel`)
            </div>
            <h2 className="text-lg font-bold">
              Inspect Any Competitor URL & Generate a MindLC Counter-Battlecard
            </h2>
            <p className="text-xs text-slate-400">
              Enter any tutoring or EdTech URL (e.g.,{" "}
              <code className="text-teal-300">mathnasium.ca</code>,{" "}
              <code className="text-teal-300">kumon.com</code>,{" "}
              <code className="text-teal-300">varsitytutors.com</code>,{" "}
              <code className="text-teal-300">tvolearn.com</code>) to extract
              their live H1 pitch, pricing signals, and Ontario curriculum gaps.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleLiveCompetitorScan}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="Enter competitor URL (e.g., https://www.mathnasium.ca or https://tvolearn.com)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning || !scanUrl.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition shrink-0"
          >
            <Swords className="w-4 h-4" />
            {isScanning ? "Scanning Live HTML..." : "Analyze Competitor & Build Wedge →"}
          </button>
        </form>

        {scanError && (
          <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs font-medium">
            {scanError}
          </div>
        )}

        {latestScanResult && (
          <div className="p-5 rounded-xl bg-slate-800/90 border border-teal-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-sm text-white">
                  Live Teardown Complete: {latestScanResult.hostname}
                </span>
              </div>
              <button
                onClick={() =>
                  spawnCounterActivityFromCompetitor(latestScanResult.compId)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
              >
                <Bot className="w-3.5 h-3.5" />
                Dispatch Agent-02 to Execute Counter-Campaign →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-700 space-y-1.5">
                <div className="text-slate-400 font-semibold uppercase">
                  Extracted Primary H1 Pitch:
                </div>
                <div className="text-white font-bold text-sm">
                  &ldquo;{latestScanResult.primaryH1}&rdquo;
                </div>
                <div className="text-amber-300 pt-1">
                  <strong>Ontario Positioning Gaps Detected:</strong>{" "}
                  {latestScanResult.gapsDetected.join(" · ")}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-teal-950/50 border border-teal-500/30 space-y-1.5">
                <div className="text-teal-300 font-semibold uppercase">
                  MindLC Counter-Positioning Wedge:
                </div>
                <div className="text-slate-100 leading-relaxed">
                  {latestScanResult.wedgeAngle}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          SECTION 2: ONTARIO EDUCATION TREND & ACADEMIC CALENDAR RADAR
          ===================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Active Ontario Education Trends & Ministry Calendar Signals
            </h2>
            <p className="text-xs text-slate-500">
              Real-time parent demand drivers across Ontario Grades 7–12 Math
              (EQAO, De-Streamed MTH1W, Functions MCR3U, Advanced Functions
              MHF4U, Calculus MCV4U)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ontarioTrends.map((trend) => {
            const assignedAgent = agents.find(
              (a) => a.id === trend.recommendedAgentId
            );
            const urgencyColors =
              trend.urgency === "Critical Now"
                ? "bg-red-50 text-red-700 border-red-200"
                : trend.urgency === "High (Next 14 Days)"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-teal-50 text-teal-700 border-teal-200";

            return (
              <div
                key={trend.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-teal-500/60 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {trend.category}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${urgencyColors}`}
                    >
                      ● {trend.urgency}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {trend.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {trend.courseCodes.map((code) => (
                      <span
                        key={code}
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200"
                      >
                        {code}
                      </span>
                    ))}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {trend.searchMomentum}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Ontario Parent Pain Trigger:
                    </div>
                    <p className="leading-relaxed">{trend.parentPainSummary}</p>
                  </div>

                  <div className="text-xs text-slate-700">
                    <strong className="text-teal-800">
                      CMO Recommended Action:
                    </strong>{" "}
                    {trend.recommendedCmoAction}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Owner:{" "}
                    <strong className="text-slate-800">
                      {assignedAgent?.codeName || "Agent-03"}
                    </strong>
                  </span>
                  <button
                    onClick={() => spawnActivityFromTrend(trend.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold transition"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Dispatch Agent on Signal
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 3: ONTARIO COMPETITOR INTELLIGENCE MATRIX & BATTLECARDS
          ===================================================================== */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Swords className="w-5 h-5 text-teal-600" />
            Ontario Math Competitor Teardown & Counter-Positioning Matrix
          </h2>
          <p className="text-xs text-slate-500">
            How MindLC wins against the 4 entrenched alternatives competing for
            Ontario Grades 7–12 families
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                      {comp.archetype}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">
                      {comp.name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                    {comp.pricingModel}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-red-50/60 border border-red-200/70 text-xs text-red-950 space-y-1">
                  <div className="font-bold text-red-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Verbatim Ontario Parent Frustration & Structural Weakness:
                  </div>
                  <p className="italic text-red-900">
                    {comp.ontarioParentComplaint}
                  </p>
                  <p className="text-slate-700 pt-1">
                    <strong>Gap:</strong> {comp.structuralWeakness}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-1">
                  <div className="font-bold text-teal-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    MindLC Counter-Positioning Wedge:
                  </div>
                  <p className="leading-relaxed">{comp.mindlcCounterWedge}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500 truncate">
                  Play: <strong>{comp.recommendedConversionPlay}</strong>
                </span>
                <button
                  onClick={() => spawnCounterActivityFromCompetitor(comp.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0 transition"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Launch Counter-Play →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
