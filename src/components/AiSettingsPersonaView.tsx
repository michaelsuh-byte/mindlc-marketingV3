"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { buildGeminiSystemInstruction } from "@/services/marketingAi";
import {
  Sliders,
  ShieldCheck,
  Save,
  CheckCircle2,
  Database,
  Code2,
} from "lucide-react";

export function AiSettingsPersonaView() {
  const { brandPersona, updateBrandPersona, skills, detailLevel } =
    useMarketingStore();

  const [formState, setFormState] = useState(brandPersona);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandPersona(formState);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const sampleCompiledPrompt = buildGeminiSystemInstruction(
    skills[0],
    formState,
    detailLevel
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
          <Sliders className="w-4 h-4" />
          Page 3 · Persistent Brand Memory & Guardrails
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          AI Settings, MindLC Persona & Database Schema
        </h1>
        <p className="text-sm text-slate-600">
          Define MindLC&apos;s core value proposition so the AI never forgets
          your Ontario Grades 7–12 positioning across every skill and campaign.
        </p>
      </div>

      {savedBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Saved MindLC Persona! All future Campaign Co-Pilot generations will
          automatically enforce these guardrails.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Editable Brand Persona Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-900 text-base">
                MindLC Core Positioning & Value Proposition
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Always Injected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formState.companyName}
                onChange={(e) =>
                  setFormState({ ...formState, companyName: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Google Gemini Model Target
              </label>
              <input
                type="text"
                value={formState.geminiModel}
                onChange={(e) =>
                  setFormState({ ...formState, geminiModel: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              Core Positioning Hook (Primary Guardrail)
            </label>
            <textarea
              rows={3}
              value={formState.coreHook}
              onChange={(e) =>
                setFormState({ ...formState, coreHook: e.target.value })
              }
              className="w-full p-3.5 rounded-xl border-2 border-teal-500/50 bg-teal-50/30 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Target Audience (Ontario Parents & Grades 7–12 Students)
            </label>
            <textarea
              rows={2}
              value={formState.targetAudience}
              onChange={(e) =>
                setFormState({ ...formState, targetAudience: e.target.value })
              }
              className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Ontario Ministry Curriculum Focus & Course Codes
            </label>
            <textarea
              rows={2}
              value={formState.curriculumFocus}
              onChange={(e) =>
                setFormState({ ...formState, curriculumFocus: e.target.value })
              }
              className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Parent Objections & Socratic AI Guardrails
            </label>
            <textarea
              rows={3}
              value={formState.antiPersonaObjections}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  antiPersonaObjections: e.target.value,
                })
              }
              className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition"
            >
              <Save className="w-4 h-4 text-teal-400" />
              Save Persona & Guardrails
            </button>
          </div>
        </form>

        {/* Right 5 Cols: Compiled Gemini System Prompt Preview + Supabase Schema Reference */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400">
                <Code2 className="w-4 h-4" />
                Compiled Gemini System Instruction
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                services/marketingAi.ts
              </span>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap max-h-64">
              {sampleCompiledPrompt}
            </pre>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Database className="w-4 h-4 text-teal-600" />
                PostgreSQL Schema (`supabase/schema.sql`)
              </span>
              <span className="text-[11px] font-semibold text-teal-700">
                4 Core Tables
              </span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li>
                <strong className="text-slate-900">users:</strong> id (PK),
                email, role (&apos;Admin&apos;)
              </li>
              <li>
                <strong className="text-slate-900">marketing_skills:</strong> id
                (PK), skill_name, system_prompt
              </li>
              <li>
                <strong className="text-slate-900">campaigns:</strong> id (PK),
                title, status (&apos;Draft&apos; | &apos;Approved&apos;),
                created_at
              </li>
              <li>
                <strong className="text-slate-900">assets:</strong> id (PK),
                campaign_id (FK), platform, content, detail_level_used (1–3)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
