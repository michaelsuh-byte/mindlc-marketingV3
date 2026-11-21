"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { Asset, StageId } from "@/types/database";
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  Sparkles,
  X,
} from "lucide-react";

type ProposalFilter = "ALL" | "REVIEW" | "LIVE" | "KILL_ALERT";

const STAGE_BADGE: Record<StageId, string> = {
  STAGE_1: "S1",
  STAGE_2: "S2",
  STAGE_3: "S3",
};

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    activeTierId,
    tierWorkspaces,
    assets,
    selectedProposalId,
    setSelectedProposalId,
    realityGateStatus,
    setRealityGateModalOpen,
    sendCopilotCommand,
    isGenerating,
  } = useMarketingStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filter, setFilter] = useState<ProposalFilter>("ALL");
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [newProposalPrompt, setNewProposalPrompt] = useState("");
  const [showLockedPrompt, setShowLockedPrompt] = useState(false);

  const activeTier = tierWorkspaces[activeTierId];

  const getStatusDotColor = (asset: Asset) => {
    const state = asset.hitl_state || "DRAFT";
    if (state === "KILLED_BY_STOP_LOSS") {
      return "bg-rose-500";
    }
    if (
      state === "APPROVED_FOR_EXECUTION" ||
      state === "VALIDATED_WINNER"
    ) {
      return "bg-emerald-500";
    }
    return "bg-amber-500";
  };

  const filteredProposals = assets.filter((asset) => {
    const state = asset.hitl_state || "DRAFT";
    if (filter === "REVIEW") {
      return state === "DRAFT";
    }
    if (filter === "LIVE") {
      return (
        state === "APPROVED_FOR_EXECUTION" || state === "VALIDATED_WINNER"
      );
    }
    if (filter === "KILL_ALERT") {
      return state === "KILLED_BY_STOP_LOSS";
    }
    return true;
  });

  const handleNewProposalClick = () => {
    if (realityGateStatus === "LOCKED") {
      setShowLockedPrompt(true);
      return;
    }
    setShowNewProposalModal(true);
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText =
      newProposalPrompt.trim() ||
      `Draft a high-converting ${activeTier.tier_name} (${activeTier.active_stage}) proposal addressing our primary bottleneck.`;
    setShowNewProposalModal(false);
    setNewProposalPrompt("");
    if (activeTab !== "copilot") {
      setActiveTab("copilot");
    }
    await sendCopilotCommand(promptText, false, true);
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-3 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Expand Proposal Queue Rail"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <button
          onClick={handleNewProposalClick}
          className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
          title="+ New Proposal"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="h-[1px] w-6 bg-slate-200" />

        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto py-1">
          {filteredProposals.map((item) => {
            const isSelected = item.id === selectedProposalId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedProposalId(item.id);
                  if (activeTab !== "copilot") setActiveTab("copilot");
                }}
                title={item.title || "Untitled Proposal"}
                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-400"
                    : "bg-white border-transparent hover:bg-slate-100"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${getStatusDotColor(item)}`}
                />
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="w-[250px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between select-none">
        {/* Top Action + Filter Header */}
        <div className="p-3 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleNewProposalClick}
              disabled={isGenerating}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Proposal</span>
            </button>

            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Collapse Proposal Rail"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Friendly Locked Prompt if Reality Gate is Locked */}
          {showLockedPrompt && realityGateStatus === "LOCKED" && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Reality Gate Locked</span>
                </div>
                <button
                  onClick={() => setShowLockedPrompt(false)}
                  className="text-amber-700 hover:text-amber-950"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-amber-800 leading-normal">
                Log this week&apos;s funnel numbers &amp; 2 parent quotes for{" "}
                <strong>{activeTier.tier_name}</strong> before generating new
                drafts.
              </p>
              <button
                onClick={() => {
                  setShowLockedPrompt(false);
                  setRealityGateModalOpen(true);
                }}
                className="w-full py-1.5 px-2.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors"
              >
                Open 60-Second Reality Check
              </button>
            </div>
          )}

          {/* Compact Filter Pill Row: All / Review / Live / Kill Alert */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "REVIEW", label: "Review" },
                { id: "LIVE", label: "Live" },
                { id: "KILL_ALERT", label: "Kill" },
              ] as { id: ProposalFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filter === tab.id
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Vertical List of Proposals for the Active Tier ONLY */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredProposals.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              No proposals in this filter for {activeTier.tier_name}.
            </div>
          ) : (
            filteredProposals.map((item) => {
              const isSelected =
                item.id === selectedProposalId && activeTab === "copilot";
              const stageId: StageId =
                item.stage_id ||
                item.proposal_schema?.stage_id ||
                activeTier.active_stage;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedProposalId(item.id);
                    if (activeTab !== "copilot") {
                      setActiveTab("copilot");
                    }
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition-all border ${
                    isSelected
                      ? "bg-indigo-50/70 text-slate-900 border-indigo-200 font-semibold shadow-2xs"
                      : "bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {/* Status dot + single-line truncated title */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(
                        item
                      )}`}
                    />
                    <span className="text-xs truncate">
                      {item.title || "Untitled Proposal"}
                    </span>
                  </div>

                  {/* Subtle Stage badge (S1 / S2 / S3) */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-800 font-semibold"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {STAGE_BADGE[stageId]}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Subtle Tier Context Footer */}
        <div className="px-3 py-2.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate font-medium text-slate-600">
            {activeTier.tier_name}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {assets.length} drafts
          </span>
        </div>
      </aside>

      {/* Compact Modal to Draft a New Proposal for the Active Tier */}
      {showNewProposalModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setShowNewProposalModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  New Proposal · {activeTier.tier_name} (
                  {STAGE_BADGE[activeTier.active_stage]})
                </h3>
              </div>
              <button
                onClick={() => setShowNewProposalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  What conversion asset or experiment should the AI draft?
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Active Stage Goal:{" "}
                  <strong>
                    {
                      activeTier.stage_goals[activeTier.active_stage]
                        .primary_kpi_name
                    }{" "}
                    (≥{" "}
                    {
                      activeTier.stage_goals[activeTier.active_stage]
                        .primary_kpi_target_pct
                    }
                    %)
                  </strong>
                </p>
                <textarea
                  rows={3}
                  autoFocus
                  value={newProposalPrompt}
                  onChange={(e) => setNewProposalPrompt(e.target.value)}
                  placeholder={`e.g., Draft a ${activeTier.tier_name} outreach script addressing closed-book Ontario MHF4U unit-test anxiety...`}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProposalModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Draft</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
