"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  FolderKanban,
  FileText,
  BookOpen,
  ArrowRight,
  Plus,
  GraduationCap,
  BrainCircuit,
  Users,
} from "lucide-react";

export function DashboardView() {
  const {
    campaigns,
    assets,
    skills,
    brandPersona,
    activeCampaignId,
    setActiveCampaignId,
    setActiveTab,
    toggleCampaignStatus,
    createCampaign,
  } = useMarketingStore();

  const [newCampaignTitle, setNewCampaignTitle] = useState("");

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignTitle.trim()) return;
    createCampaign(newCampaignTitle.trim());
    setNewCampaignTitle("");
  };

  const approvedCount = campaigns.filter((c) => c.status === "Approved").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 rounded-2xl p-7 text-white shadow-lg border border-slate-700/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            MindLC Ontario Math Grades 7–12 Growth Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            AI Marketing Command Center & Mentorship Studio
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {brandPersona.coreHook} Generate high-converting parent campaigns on
            the left canvas while learning the underlying marketing psychology on
            the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => setActiveTab("copilot")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Launch Campaign Co-Pilot
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-600 transition-all"
          >
            <BookOpen className="w-4 h-4 text-teal-400" />
            Manage Skill Library ({skills.length})
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active Campaigns</span>
            <FolderKanban className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {campaigns.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="text-teal-700 font-semibold">
              {approvedCount} Approved
            </span>{" "}
            · {campaigns.length - approvedCount} in Draft
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Generated Assets</span>
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {assets.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Landing Pages, Facebook Ads & AI-SEO
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Embedded AI Skills</span>
            <BrainCircuit className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {skills.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {skills.map((s) => s.skill_name).slice(0, 3).join(", ")}...
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Target ICP Focus</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2 leading-snug">
            Ontario Parents (Gr. 7–12)
          </div>
          <div className="text-xs text-teal-700 font-medium mt-1">
            MTH1W · MCR3U · MHF4U · MCV4U
          </div>
        </div>
      </div>

      {/* Visual Funnel & Ontario Curriculum Positioning Map */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              MindLC Dual-Value Architecture & Ontario Math Funnel
            </h2>
            <p className="text-xs text-slate-500">
              How every marketing skill aligns our two core pillars with Ontario
              parent conversion stages
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            Mandatory Output Protocol Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Stage 1 · Attract (`ai-seo` & `social-content`)
            </div>
            <div className="font-bold text-slate-900 text-sm">
              Capture Late-Night Ontario Math Searches & Parent Scrolls
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Targets high-anxiety moments: Grade 9 EQAO prep, Grade 11 MCR3U
              Functions walls, and ChatGPT/Perplexity queries for Ontario math
              help.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Stage 2 · Differentiate (`copywriting` & `cro`)
            </div>
            <div className="font-bold text-slate-900 text-sm">
              Human Learning Manager + 24/7 Socratic AI
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Contrasts MindLC against $80/hr 1-hour weekly tutors (not there at
              9 PM) and generic AI chatbots (which hand over answers instead of
              teaching).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Stage 3 · Convert (`copy-editing` & Diagnostics)
            </div>
            <div className="font-bold text-slate-900 text-sm">
              Free Ontario Math Diagnostic & Parent Strategy Consult
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Replaces high-friction &ldquo;Buy Tutoring Package&rdquo; buttons with a
              zero-risk 20-minute curriculum diagnostic and personalized study
              plan.
            </p>
          </div>
        </div>
      </div>

      {/* Campaigns Table & Quick Creator */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Campaigns (`public.campaigns` Table)
            </h2>
            <p className="text-xs text-slate-500">
              Select a campaign to open its assets inside the Dual-Pane Campaign
              Co-Pilot
            </p>
          </div>

          <form onSubmit={handleCreateCampaign} className="flex gap-2">
            <input
              type="text"
              value={newCampaignTitle}
              onChange={(e) => setNewCampaignTitle(e.target.value)}
              placeholder="New campaign title (e.g., May EQAO Sprint)..."
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[260px]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {campaigns.map((camp) => {
            const campAssets = assets.filter((a) => a.campaign_id === camp.id);
            const isSelected = camp.id === activeCampaignId;
            return (
              <div
                key={camp.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition ${
                  isSelected ? "bg-teal-50/50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {camp.title}
                    </span>
                    <button
                      onClick={() => toggleCampaignStatus(camp.id)}
                      title="Click to toggle status between Draft and Approved"
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition ${
                        camp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {camp.status === "Approved" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {camp.status}
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    {campAssets.length} generated assets · Created{" "}
                    {new Date(camp.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveCampaignId(camp.id);
                      setActiveTab("copilot");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    Open in Co-Pilot
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
