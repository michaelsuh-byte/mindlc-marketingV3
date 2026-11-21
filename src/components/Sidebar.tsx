"use client";

import React, { useState } from "react";
import { useMarketingStore, NavigationTab } from "@/store/useMarketingStore";
import { Asset, VoCContextTag, VoCTierTag } from "@/types/database";
import {
  Plus,
  Quote,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  X,
  Bot,
  Radar,
  BookOpen,
  Sliders,
  Layers,
} from "lucide-react";

const TAG_META: { tag: VoCContextTag; label: string; badgeClass: string }[] = [
  {
    tag: "ai_cheating",
    label: "AI Cheating",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    tag: "curriculum",
    label: "Curriculum (K/T/C/A)",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  {
    tag: "price",
    label: "Price & Value",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    tag: "trust",
    label: "Trust",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
  },
  {
    tag: "student_motivation",
    label: "Student Motivation",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
];

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    activeTierId,
    tierWorkspaces,
    vocVault,
    assets,
    selectedProposalId,
    setSelectedProposalId,
    realityGateStatus,
    isVocVaultOpen,
    setVocVaultOpen,
    setRealityGateModalOpen,
    sendCopilotCommand,
    activeBottleneckStage,
    isGenerating,
  } = useMarketingStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [vocTierFilter, setVocTierFilter] = useState<VoCTierTag | "ACTIVE_PLUS_ALL">(
    "ACTIVE_PLUS_ALL"
  );

  const currentTierWs = tierWorkspaces[activeTierId];
  const isLocked = realityGateStatus === "LOCKED";

  // Group active tier's proposals into the 4 prioritized urgency buckets
  const killTriggered = assets.filter(
    (a) => a.hitl_state === "KILLED_BY_STOP_LOSS"
  );
  const awaitingDecision = assets.filter(
    (a) => !a.hitl_state || a.hitl_state === "DRAFT"
  );
  const approvedLive = assets.filter(
    (a) =>
      a.hitl_state === "APPROVED_FOR_EXECUTION" ||
      a.hitl_state === "VALIDATED_WINNER"
  );
  const archivedKilled = assets.filter((a) => a.hitl_state === "ARCHIVED");

  const filteredVocQuotes = vocVault.filter((q) => {
    if (vocTierFilter === "ACTIVE_PLUS_ALL") {
      return q.tier_id === activeTierId || q.tier_id === "ALL";
    }
    if (vocTierFilter === "ALL") return true;
    return q.tier_id === vocTierFilter;
  });

  const handleNewProposalClick = async () => {
    if (isLocked) {
      setRealityGateModalOpen(true);
      return;
    }
    setActiveTab("copilot");
    const defaultPrompt =
      activeTierId === "TIER_1"
        ? `Draft a new ${currentTierWs.tier_short_name} (${activeBottleneckStage}) self-serve onboarding and Socratic voice + LaTeX HUD conversion asset.`
        : activeTierId === "TIER_2"
        ? `Draft a new ${currentTierWs.tier_short_name} (${activeBottleneckStage}) Growing Success K/T/C/A parent debrief and Learning Manager close asset.`
        : `Draft a new ${currentTierWs.tier_short_name} (${activeBottleneckStage}) 1:1 executive parent consultation and Flag A upgrade asset.`;
    await sendCopilotCommand(defaultPrompt, false, true);
  };

  const renderQueueCard = (
    item: Asset,
    dotColor: string,
    activeBorder: string
  ) => {
    const isSelected =
      activeTab === "copilot" && selectedProposalId === item.id;
    const channelLabel =
      item.channel_badge ||
      item.proposal_schema?.channel?.split("(")[0]?.trim() ||
      item.platform;
    const verCount = item.versions?.length || item.revision_count || 1;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setSelectedProposalId(item.id);
          setActiveTab("copilot");
        }}
        className={`w-full text-left p-2.5 rounded-xl border transition-all group ${
          isSelected
            ? `bg-white ${activeBorder} shadow-xs`
            : "bg-white/60 hover:bg-white border-slate-200/90"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
              {item.title || item.proposal_schema?.title}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 mt-2 pl-3.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate">
            {channelLabel}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-semibold text-indigo-700">
              {item.stage_id || "STAGE_1"}
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-400">
              v{verCount}
            </span>
          </div>
        </div>
      </button>
    );
  };

  const navTabs: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "copilot",
      label: "Micro Cockpit",
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
      label: "Persona",
      icon: <Sliders className="w-3.5 h-3.5" />,
    },
  ];

  if (isCollapsed) {
    return (
      <aside className="w-14 bg-slate-100 border-r border-slate-200 flex flex-col items-center py-3 justify-between shrink-0 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Meso Pipeline & VoC Rail"
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <span
            className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold flex items-center justify-center tabular-nums"
            title="Kill-Criteria Triggered"
          >
            {killTriggered.length}
          </span>
          <span
            className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold flex items-center justify-center tabular-nums"
            title="Awaiting CMO Decision"
          >
            {awaitingDecision.length}
          </span>
          <span
            className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold flex items-center justify-center tabular-nums"
            title="Approved / Live"
          >
            {approvedLive.length}
          </span>
        </div>

        <button
          onClick={() => setVocVaultOpen(true)}
          title="Open Shared VoC Verbatim Vault Drawer"
          className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200"
        >
          <Quote className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="w-[296px] bg-slate-100/80 border-r border-slate-200 flex flex-col shrink-0 select-none h-[calc(100vh-72px)] sticky top-[72px]">
        {/* Top Module Switcher + Collapse Toggle */}
        <div className="px-3.5 pt-3 pb-2 border-b border-slate-200 bg-white flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {navTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition shrink-0 ${
                  activeTab === t.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse Meso Rail"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Active Tier Workspace Header + Primary Action: + New Proposal */}
        <div className="p-3.5 border-b border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-extrabold text-slate-900">
              {currentTierWs.tier_short_name} Queue
            </span>
            <span className="font-mono font-semibold text-indigo-700">
              {currentTierWs.price_label}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNewProposalClick}
            disabled={isGenerating}
            title={
              isLocked
                ? "Complete Weekly Reality Gate first"
                : `Draft a new ${currentTierWs.tier_short_name} (${activeBottleneckStage}) proposal`
            }
            className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              isLocked
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>+ New Proposal (Gate Locked)</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>
                  {isGenerating
                    ? "Drafting..."
                    : `+ New ${currentTierWs.tier_short_name} Proposal`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Prioritized Proposal Queue Scoped to Active Tier */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
          {/* 🔴 Group 1: Kill-Criteria Triggered */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800">
                🔴 Kill-Criteria Triggered
              </span>
              <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-200 tabular-nums">
                {killTriggered.length}
              </span>
            </div>
            {killTriggered.length === 0 ? (
              <div className="text-[11px] text-slate-400 px-2 py-1">
                Zero live stop-loss breaches
              </div>
            ) : (
              <div className="space-y-2">
                {killTriggered.map((item) =>
                  renderQueueCard(
                    item,
                    "bg-rose-600 ring-2 ring-rose-200",
                    "border-rose-500 ring-2 ring-rose-500/15"
                  )
                )}
              </div>
            )}
          </div>

          {/* 🟡 Group 2: Awaiting CMO Decision */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                🟡 Awaiting CMO Decision
              </span>
              <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200 tabular-nums">
                {awaitingDecision.length}
              </span>
            </div>
            {awaitingDecision.length === 0 ? (
              <div className="text-[11px] text-slate-400 px-2 py-1">
                All drafts reviewed
              </div>
            ) : (
              <div className="space-y-2">
                {awaitingDecision.map((item) =>
                  renderQueueCard(
                    item,
                    "bg-amber-500",
                    "border-indigo-600 ring-2 ring-indigo-600/15"
                  )
                )}
              </div>
            )}
          </div>

          {/* 🟢 Group 3: Approved / Live */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                🟢 Approved / Live
              </span>
              <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 tabular-nums">
                {approvedLive.length}
              </span>
            </div>
            {approvedLive.length === 0 ? (
              <div className="text-[11px] text-slate-400 px-2 py-1">
                No approved assets live yet
              </div>
            ) : (
              <div className="space-y-2">
                {approvedLive.map((item) =>
                  renderQueueCard(
                    item,
                    "bg-emerald-500",
                    "border-emerald-600 ring-2 ring-emerald-600/15"
                  )
                )}
              </div>
            )}
          </div>

          {/* ⚪ Group 4: Archived / Killed */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
              className="w-full flex items-center justify-between px-1 py-1 text-left"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                {isArchivedExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>⚪ Archived / Killed</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 text-slate-600 tabular-nums">
                {archivedKilled.length}
              </span>
            </button>

            {isArchivedExpanded && (
              <div className="space-y-2">
                {archivedKilled.map((item) =>
                  renderQueueCard(
                    item,
                    "bg-slate-400",
                    "border-slate-500 ring-2 ring-slate-400/20"
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shared VoC Verbatim Vault Drawer Toggle (Pinned Bottom) */}
        <div className="p-3.5 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setVocVaultOpen(true)}
            className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                <Quote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">
                  Shared VoC Vault
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {vocVault.length} Quotes (Tagged T1/T2/T3/ALL)
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>
        </div>
      </aside>

      {/* =====================================================================
          SLIDE-OVER DRAWER: SHARED VOC VERBATIM VAULT WITH TIER TAGGING
          ===================================================================== */}
      {isVocVaultOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-2xs flex justify-start">
          <div className="w-full max-w-md bg-white h-full border-r border-slate-200 shadow-2xl flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Quote className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="font-bold text-sm">
                    Shared VoC Verbatim Vault (`TIER_1` · `TIER_2` · `TIER_3` · `ALL`)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Insights tagged `ALL` or `{activeTierId}` auto-inject into{" "}
                    {currentTierWs.tier_short_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVocVaultOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tier Scope Filter Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5">
              {(
                [
                  {
                    id: "ACTIVE_PLUS_ALL",
                    label: `Active (${activeTierId} + ALL)`,
                  },
                  { id: "ALL", label: "All Quotes" },
                  { id: "TIER_1", label: "T1 Self-Coach" },
                  { id: "TIER_2", label: "T2 Hybrid" },
                  { id: "TIER_3", label: "T3 Prime 1:1" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setVocTierFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    vocTierFilter === f.id
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {TAG_META.map((group) => {
                const groupQuotes = filteredVocQuotes.filter(
                  (q) => q.context_tag === group.tag
                );
                if (groupQuotes.length === 0) return null;

                return (
                  <div key={group.tag} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${group.badgeClass}`}
                      >
                        {group.label}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {groupQuotes.length} quote
                        {groupQuotes.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {groupQuotes.map((q) => {
                        const allProposals = [
                          ...tierWorkspaces.TIER_1.proposals,
                          ...tierWorkspaces.TIER_2.proposals,
                          ...tierWorkspaces.TIER_3.proposals,
                        ];
                        const addressedCount = allProposals.filter((a) =>
                          a.proposal_schema?.cited_voc_quotes?.some((c) =>
                            c.includes(q.id)
                          )
                        ).length;

                        return (
                          <div
                            key={q.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-indigo-700">
                                  [{q.id}]
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                                  tier: {q.tier_id}
                                </span>
                              </div>
                              <span className="font-semibold text-emerald-700 tabular-nums">
                                Addressed by {addressedCount} proposal
                                {addressedCount === 1 ? "" : "s"}
                              </span>
                            </div>
                            <p className="text-slate-800 italic leading-relaxed">
                              &ldquo;{q.quote_text}&rdquo;
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setVocVaultOpen(false);
                  setRealityGateModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
              >
                + Log New Parent Verbatim Quotes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
