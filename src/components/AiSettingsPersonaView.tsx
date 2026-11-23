"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { buildTierAwareSystemInstruction } from "@/services/marketingAi";
import {
  Sliders,
  ShieldCheck,
  Save,
  CheckCircle2,
  Database,
  Code2,
} from "lucide-react";

export function AiSettingsPersonaView() {
  const {
    brandPersona,
    updateBrandPersona,
    skills,
    detailLevel,
    activeTierId,
    tierWorkspaces,
    vocVault,
    setActiveTierId,
  } = useMarketingStore();

  const [formState, setFormState] = useState(brandPersona);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandPersona(formState);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const currentTierWs = tierWorkspaces[activeTierId];
  const tierVocQuotes = vocVault
    .filter((q) => q.tier_id === activeTierId || q.tier_id === "ALL")
    .slice(0, 8);

  const sampleCompiledPrompt = buildTierAwareSystemInstruction({
    skill: skills[0],
    tierWorkspace: currentTierWs,
    detailLevel,
    vocQuotesForTier: tierVocQuotes,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-1">
            <Sliders className="w-4 h-4" />
            Brand Positioning &amp; Tier Guardrails
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Brand Guardrails &amp; Tier Positioning
          </h1>
          <p className="text-sm text-slate-600">
            Configure product positioning, curriculum alignment, and messaging
            boundaries for Tier 1 (Online Self-Coach), Tier 2 (Managed Hybrid),
            and Tier 3 (Prime 1:1).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          {(["TIER_1", "TIER_2", "TIER_3"] as const).map((tid) => (
            <button
              key={tid}
              type="button"
              onClick={() => setActiveTierId(tid)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTierId === tid
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tierWorkspaces[tid].tier_short_name}
            </button>
          ))}
        </div>
      </div>

      {savedBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Saved MindLC Persona &amp; 3-Tier Guardrails!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Active Tier Profile & Brand Persona Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-base">
                Active Tier Isolation Profile: {currentTierWs.tier_name}
              </h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentTierWs.price_label}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div>
              <strong className="text-slate-900">Tier Offer Summary:</strong>{" "}
              <span className="text-slate-700">
                {currentTierWs.offer_summary}
              </span>
            </div>
            <div>
              <strong className="text-slate-900">Tier Target Persona:</strong>{" "}
              <span className="text-slate-700">
                {currentTierWs.target_persona}
              </span>
            </div>
            <div>
              <strong className="text-rose-800">
                Cross-Tier Tone Bleed Guardrail:
              </strong>{" "}
              <span className="text-rose-900 font-medium">
                {currentTierWs.tone_guardrail}
              </span>
            </div>
            <div>
              <strong className="text-slate-900">
                Tier-Specific Funnel Steps:
              </strong>{" "}
              <span className="font-mono text-indigo-700">
                {currentTierWs.funnel_labels.join(" → ")}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Global MindLC 3-Tier Architecture Summary
            </label>
            <textarea
              rows={3}
              value={formState.coreHook}
              onChange={(e) =>
                setFormState({ ...formState, coreHook: e.target.value })
              }
              className="w-full p-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Ontario Ministry Curriculum Focus &amp; Growing Success (K/T/C/A)
            </label>
            <textarea
              rows={2}
              value={formState.curriculumFocus}
              onChange={(e) =>
                setFormState({ ...formState, curriculumFocus: e.target.value })
              }
              className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition"
            >
              <Save className="w-4 h-4 text-indigo-400" />
              Save 3-Tier Persona Settings
            </button>
          </div>
        </form>

        {/* Right 5 Cols: Compiled Tier-Isolated Gemini System Prompt */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <Code2 className="w-4 h-4" />
                Compiled Prompt (`{activeTierId}` · `{currentTierWs.active_stage}`)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Zero Cross-Tier Bleed
              </span>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap max-h-96">
              {sampleCompiledPrompt}
            </pre>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Database className="w-4 h-4 text-indigo-600" />
                3-Tier × 3-Stage Isolation Model
              </span>
              <span className="text-[11px] font-semibold text-indigo-700">
                9 Independent Stage Cells
              </span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li>
                <strong className="text-slate-900">TIER_1 ($39/mo):</strong>{" "}
                S1 (0–50) · S2 (51–150) · S3 (151–300+)
              </li>
              <li>
                <strong className="text-slate-900">TIER_2 ($139/mo):</strong>{" "}
                S1 (0–25) · S2 (26–60) · S3 (61–100)
              </li>
              <li>
                <strong className="text-slate-900">TIER_3 ($399/mo):</strong>{" "}
                S1 (0–5) · S2 (6–15) · S3 (16–30)
              </li>
              <li>
                <strong className="text-slate-900">Shared VoC Vault:</strong>{" "}
                Tagged TIER_1 | TIER_2 | TIER_3 | ALL
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
