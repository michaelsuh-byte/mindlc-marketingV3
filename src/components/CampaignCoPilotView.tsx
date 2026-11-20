"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import { AssetPlatform, DetailLevel } from "@/types/database";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Trash2,
  Plus,
  Layers,
  CheckCircle2,
  Clock,
  GraduationCap,
  Wand2,
  ArrowLeftRight,
  ShieldAlert,
  AlertTriangle,
  Quote,
  Skull,
  Lock,
  MessageSquareEdit,
  XCircle,
  Trophy,
} from "lucide-react";

const PLATFORMS: AssetPlatform[] = [
  "Cognitive Report & Debrief Script",
  "Email Sequence",
  "Parent Referral & Seminar Kit",
  "Landing Page",
  "Facebook",
  "SEO Meta",
  "Blog",
];

const DETAIL_LEVELS: {
  level: DetailLevel;
  short: string;
  full: string;
  desc: string;
}[] = [
  {
    level: 1,
    short: "Lvl 1 · Executive",
    full: "Level 1: Executive Summary (Fast)",
    desc: "Fast 2-bullet conversion summary",
  },
  {
    level: 2,
    short: "Lvl 2 · Standard",
    full: "Level 2: Standard Rationale",
    desc: "VoC alignment & kill criteria logic",
  },
  {
    level: 3,
    short: "Lvl 3 · Deep Mentor",
    full: "Level 3: Deep Mentorship (The Why & How)",
    desc: "Unit economics ($139/mo), VoC & stop-loss theory",
  },
];

const QUICK_PROMPTS = [
  {
    label: "🎯 Stage 1: 10-Min Debrief & $139/mo Close Script",
    skillName: "cro",
    platform: "Cognitive Report & Debrief Script" as AssetPlatform,
    prompt:
      "Draft a 10-minute parent diagnostic debrief call script and Cognitive Report close for our $139 CAD/mo Tier 2 Managed Hybrid Plan resolving VOC-101 and VOC-102.",
  },
  {
    label: "📧 Stage 1: 72-Hr Post-Diagnostic Follow-Up",
    skillName: "copywriting",
    platform: "Email Sequence" as AssetPlatform,
    prompt:
      "Write a 72-hour post-diagnostic follow-up sequence with our 30-Day Active-Habit Guarantee for undecided MCR3U & MPM2D parents.",
  },
  {
    label: "🤝 Stage 2: Week 4–6 Parent Referral & Seminar Kit",
    skillName: "copywriting",
    platform: "Parent Referral & Seminar Kit" as AssetPlatform,
    prompt:
      "Create a Week 4 unit-test win parent referral invite flow and MCR3U/SBI3U seminar kit.",
  },
  {
    label: "⚠️ Test Scope-Drift Guardrail (Try Cold Meta Ad in S1)",
    skillName: "social-content",
    platform: "Facebook" as AssetPlatform,
    prompt:
      "Launch a cold Facebook ad campaign and SEO blog cluster for broad GTA brand awareness.",
  },
];

export function CampaignCoPilotView() {
  const {
    campaigns,
    assets,
    skills,
    activeCampaignId,
    selectedSkillId,
    detailLevel,
    preferredPlatform,
    chatMessages,
    isGenerating,
    lastHighlightedAssetId,
    realityGateStatus,
    activeBottleneckStage,
    activeRevisionAssetId,
    setActiveCampaignId,
    setSelectedSkillId,
    setDetailLevel,
    setPreferredPlatform,
    setActiveRevisionAssetId,
    setRealityGateModalOpen,
    sendCopilotCommand,
    updateAssetContent,
    deleteAsset,
    createManualAsset,
    toggleCampaignStatus,
    toggleProposalVerification,
    transitionProposalHitlState,
  } = useMarketingStore();

  const [commandInput, setCommandInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeCampaign =
    campaigns.find((c) => c.id === activeCampaignId) || campaigns[0];
  const campaignAssets = assets.filter(
    (a) => a.campaign_id === activeCampaign?.id
  );
  const selectedSkill =
    skills.find((s) => s.id === selectedSkillId) || skills[0];
  const targetRevisionAsset = activeRevisionAssetId
    ? assets.find((a) => a.id === activeRevisionAssetId)
    : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isGenerating) return;
    const text = commandInput.trim();
    setCommandInput("");
    await sendCopilotCommand(text, false);
  };

  const handleQuickPrompt = async (qp: (typeof QUICK_PROMPTS)[number]) => {
    if (isGenerating) return;
    setActiveRevisionAssetId(null);
    const matchedSkill = skills.find((s) => s.skill_name === qp.skillName);
    if (matchedSkill) setSelectedSkillId(matchedSkill.id);
    setPreferredPlatform(qp.platform);
    await sendCopilotCommand(qp.prompt, false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isNewGenerationBlockedByRealityGate =
    realityGateStatus === "LOCKED" && !targetRevisionAsset;

  return (
    <div className="h-[calc(100vh-88px)] flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Workspace Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-slate-900 text-base">
                HITL Campaign Co-Pilot ($139 CAD/mo Tier 2 Managed Hybrid)
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Mandatory Proposal Schema + HITL State Machine
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Left Canvas: VoC-Cited Proposals, Devil&apos;s Advocate &amp; Kill
              Criteria · Right Chat: Conversational Refinement &amp; Guardrails
            </p>
          </div>
        </div>

        {/* Active Campaign Selector */}
        <div className="flex items-center gap-3">
          <select
            value={activeCampaign?.id || ""}
            onChange={(e) => setActiveCampaignId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status})
              </option>
            ))}
          </select>

          {activeCampaign && (
            <button
              onClick={() => toggleCampaignStatus(activeCampaign.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeCampaign.status === "Approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {activeCampaign.status === "Approved" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              {activeCampaign.status}
            </button>
          )}
        </div>
      </header>

      {/* Dual-Pane Split Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ===============================================================
            LEFT PANE (7 Cols): HITL PROPOSAL CANVAS (Mandatory Proposal Schema)
            =============================================================== */}
        <section className="lg:col-span-7 flex flex-col border-r border-slate-200 bg-slate-50/70 overflow-hidden">
          <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-slate-800 text-sm">
                Left Pane: HITL Proposal Canvas ({campaignAssets.length})
              </span>
            </div>

            <button
              onClick={() =>
                createManualAsset(
                  preferredPlatform,
                  `Manual ${preferredPlatform} Draft`,
                  `Edit your ${preferredPlatform} copy here or click "Refine in Chat" to revise via AI...`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Manual Proposal
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {campaignAssets.map((asset) => {
              const isJustUpdated = asset.id === lastHighlightedAssetId;
              const isBeingRevised = asset.id === activeRevisionAssetId;
              const ps = asset.proposal_schema;
              const hitlState = asset.hitl_state || "DRAFT";
              const canApprove =
                Boolean(asset.devils_advocate_verified) &&
                Boolean(asset.kill_criteria_acknowledged);

              const hitlBadgeStyle =
                hitlState === "APPROVED_FOR_EXECUTION"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : hitlState === "VALIDATED_WINNER"
                  ? "bg-teal-600 text-white border-teal-700"
                  : hitlState === "KILLED_BY_STOP_LOSS"
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-amber-50 text-amber-800 border-amber-300";

              return (
                <div
                  key={asset.id}
                  className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                    isBeingRevised
                      ? "border-indigo-600 ring-2 ring-indigo-500/30"
                      : isJustUpdated
                      ? "border-teal-500 ring-2 ring-teal-500/20"
                      : "border-slate-200"
                  }`}
                >
                  {/* Top Metadata Bar */}
                  <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                        {ps?.proposal_id || asset.id}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {ps?.bottleneck_stage || activeBottleneckStage}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${hitlBadgeStyle}`}
                      >
                        HITL: {hitlState}
                      </span>
                      {asset.revision_count && asset.revision_count > 1 && (
                        <span className="text-[10px] font-mono text-slate-300">
                          v{asset.revision_count}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setActiveRevisionAssetId(
                            isBeingRevised ? null : asset.id
                          )
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                          isBeingRevised
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700"
                        }`}
                        title="Conversational refinement works even when Weekly Reality Gate is LOCKED"
                      >
                        <MessageSquareEdit className="w-3.5 h-3.5" />
                        {isBeingRevised
                          ? "Refining in Chat..."
                          : "Refine in Chat"}
                      </button>

                      <button
                        onClick={() => handleCopy(asset.id, asset.content)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                      >
                        {copiedId === asset.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => deleteAsset(asset.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Proposal Title, Channel & Target Metric */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={asset.title || ps?.title || "Proposal"}
                        onChange={(e) =>
                          updateAssetContent(
                            asset.id,
                            asset.content,
                            e.target.value
                          )
                        }
                        className="w-full font-extrabold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-200 focus:border-teal-500 focus:outline-none pb-1"
                      />
                      {ps && (
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                          <span>
                            <strong>Channel:</strong> {ps.channel}
                          </span>
                          <span>·</span>
                          <span className="text-teal-800 font-semibold">
                            <strong>Target Metric:</strong> {ps.target_metric}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* SAFEGUARD 1: Cited Verbatim Parent Quotes (VoC) */}
                    {ps?.cited_voc_quotes && ps.cited_voc_quotes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                          <Quote className="w-3.5 h-3.5 text-indigo-600" />
                          Cited Ground-Truth VoC Quotes Resolved (`WeeklyRealityLog`):
                        </div>
                        <ul className="space-y-1 text-xs text-indigo-950 font-medium">
                          {ps.cited_voc_quotes.map((q, idx) => (
                            <li key={idx}>• {q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Editable Asset Body (`asset_body`) */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Proposal Asset Body (`asset_body` — Editable Markdown)
                      </label>
                      <textarea
                        value={asset.content}
                        onChange={(e) =>
                          updateAssetContent(asset.id, e.target.value)
                        }
                        rows={9}
                        className="w-full text-xs text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 font-sans leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-y"
                      />
                    </div>

                    {/* Single Lock-Step Parent CTA (`single_cta`) */}
                    {ps?.single_cta && (
                      <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs">
                        <span className="font-bold text-teal-900 uppercase tracking-wider text-[11px] block">
                          Single Lock-Step Parent CTA (`single_cta`):
                        </span>
                        <span className="font-bold text-slate-900">
                          👉 {ps.single_cta}
                        </span>
                      </div>
                    )}

                    {/* SAFEGUARD 3: Devil's Advocate + Pre-Registered Kill Criteria Grid */}
                    {ps && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Devil's Advocate Box */}
                        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2 text-xs">
                          <div className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Devil&apos;s Advocate Red-Team Check
                          </div>
                          <p className="text-slate-800 leading-relaxed">
                            <strong>Primary Failure Hypothesis:</strong>{" "}
                            {ps.devils_advocate.primary_failure_hypothesis}
                          </p>
                          <p className="text-amber-950 font-semibold bg-amber-100/70 p-2 rounded-lg border border-amber-300/60">
                            <strong>Blind-Spot Question to Verify:</strong>{" "}
                            {ps.devils_advocate.blind_spot_question}
                          </p>
                        </div>

                        {/* Kill Criteria & Stop-Loss Box */}
                        <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200/90 space-y-2 text-xs">
                          <div className="font-bold text-red-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Skull className="w-3.5 h-3.5 text-red-600" />
                            Pre-Committed Kill Criteria &amp; Stop-Loss
                          </div>
                          <p className="text-slate-800">
                            <strong>Sample Threshold:</strong>{" "}
                            {ps.kill_criteria.sample_threshold}
                          </p>
                          <p className="text-red-900 font-semibold">
                            <strong>Stop-Loss Breach Metric:</strong>{" "}
                            {ps.kill_criteria.stop_loss_metric}
                          </p>
                          <p className="text-slate-800 bg-white/80 p-2 rounded-lg border border-red-200">
                            <strong>Immediate Pivot Action:</strong>{" "}
                            {ps.kill_criteria.pivot_action}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Revision Notes */}
                    {ps?.revision_notes && (
                      <div className="text-[11px] text-slate-500 italic">
                        <strong>Revision Notes:</strong> {ps.revision_notes}
                      </div>
                    )}

                    {/* SAFEGUARD 4: HITL State Machine Gate */}
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 -mx-5 -mb-5 px-5 py-3.5">
                      <div className="space-y-1.5 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(asset.devils_advocate_verified)}
                            onChange={() =>
                              toggleProposalVerification(
                                asset.id,
                                "devils_advocate_verified"
                              )
                            }
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>
                            1. Verified Devil&apos;s Advocate Blind-Spot Question
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(asset.kill_criteria_acknowledged)}
                            onChange={() =>
                              toggleProposalVerification(
                                asset.id,
                                "kill_criteria_acknowledged"
                              )
                            }
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>
                            2. Committed to Stop-Loss Kill Criteria &amp; Pivot
                          </span>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {hitlState === "DRAFT" && (
                          <button
                            onClick={() =>
                              transitionProposalHitlState(
                                asset.id,
                                "APPROVED_FOR_EXECUTION"
                              )
                            }
                            disabled={!canApprove}
                            title={
                              canApprove
                                ? "Approve proposal for field execution"
                                : "Check both Devil's Advocate and Kill Criteria verification boxes first"
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold shadow-xs transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {canApprove
                              ? "Approve Proposal (HITL Sign-Off)"
                              : "Check Both Safeguards to Approve"}
                          </button>
                        )}

                        {hitlState === "APPROVED_FOR_EXECUTION" && (
                          <>
                            <button
                              onClick={() =>
                                transitionProposalHitlState(
                                  asset.id,
                                  "VALIDATED_WINNER"
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Mark Validated Winner
                            </button>
                            <button
                              onClick={() =>
                                transitionProposalHitlState(
                                  asset.id,
                                  "KILLED_BY_STOP_LOSS"
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Breached Stop-Loss (Kill &amp; Pivot)
                            </button>
                          </>
                        )}

                        {(hitlState === "VALIDATED_WINNER" ||
                          hitlState === "KILLED_BY_STOP_LOSS") && (
                          <button
                            onClick={() =>
                              transitionProposalHitlState(asset.id, "DRAFT")
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white"
                          >
                            Re-Open as Draft
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===============================================================
            RIGHT PANE (5 Cols): AI CHAT, GUARDRAILS & HITL REFINEMENT
            =============================================================== */}
        <section className="lg:col-span-5 flex flex-col bg-white overflow-hidden">
          <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-400" />
              <div>
                <div className="text-sm font-bold leading-tight">
                  Right Pane: HITL Mentor &amp; Guardrail Feed
                </div>
                <div className="text-[11px] text-slate-400">
                  Enforces Reality Gate, Bottleneck Lock ({activeBottleneckStage}
                  ) &amp; VoC Caching
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {selectedSkill?.skill_name}
            </span>
          </div>

          {/* Quick-Launch Prompt Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">
              Test Safeguards:
            </span>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(qp)}
                disabled={isGenerating}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 text-slate-700 shrink-0 transition shadow-2xs"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Active Revision Target Banner */}
          {targetRevisionAsset && (
            <div className="px-4 py-2.5 bg-indigo-600 text-white flex items-center justify-between text-xs shrink-0">
              <div className="truncate">
                <strong>🔄 Refining Existing Proposal:</strong>{" "}
                {targetRevisionAsset.title} (Allowed even while Reality Gate is
                LOCKED)
              </div>
              <button
                onClick={() => setActiveRevisionAssetId(null)}
                className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-bold shrink-0 ml-2"
              >
                Switch to New Proposal Mode
              </button>
            </div>
          )}

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
            {chatMessages.map((msg) => {
              if (msg.sender === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] bg-slate-900 text-white rounded-2xl rounded-br-xs px-4 py-3 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
                        <span>Skill: {msg.skillName}</span>
                        <span>Detail Level {msg.detailLevel}</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {msg.userPrompt}
                      </p>
                      <div className="text-[10px] text-slate-400 text-right">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              }

              // SAFEGUARD 2: Scope-Drift Guardrail Warning Card
              if (msg.sender === "guardrail" && msg.scopeDriftWarning) {
                const sw = msg.scopeDriftWarning;
                return (
                  <div
                    key={msg.id}
                    className="w-full bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-red-900 font-extrabold text-sm">
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-600" />
                        Scope Drift Blocked ({sw.activeStage})
                      </span>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-red-200 text-red-900">
                        Safeguard 2
                      </span>
                    </div>

                    <p className="text-red-950 font-semibold leading-relaxed">
                      {sw.blockedReason}
                    </p>

                    <div className="p-3 rounded-xl bg-white border border-red-200 text-slate-800 space-y-1">
                      <div className="font-bold text-slate-900">
                        📊 Current Bottleneck Math:
                      </div>
                      <p className="leading-relaxed">
                        {sw.bottleneckMathExplanation}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                      <strong>Recommended In-Scope Play:</strong>{" "}
                      {sw.suggestedInScopeAlternative}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() =>
                          sendCopilotCommand(sw.requestedCommand, true)
                        }
                        className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition"
                      >
                        ⚠️ Confirm Explicit CMO Stage Override &amp; Generate
                        Anyway
                      </button>
                    </div>
                  </div>
                );
              }

              const sj = msg.strategicJustification;
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="w-full bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                          AI
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Strategic Justification
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        {sj?.levelLabel}
                      </span>
                    </div>

                    {sj?.contextCacheStatus && (
                      <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        ⚡ {sj.contextCacheStatus}
                      </div>
                    )}

                    {sj?.headlineSummary && (
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {sj.headlineSummary}
                      </div>
                    )}

                    {sj?.rationaleBody && (
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                        {sj.rationaleBody}
                      </div>
                    )}

                    {sj?.frameworksApplied &&
                      sj.frameworksApplied.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sj.frameworksApplied.map((fw, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              📐 {fw}
                            </span>
                          ))}
                        </div>
                      )}

                    {sj?.mentorshipTakeaway && (
                      <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-1">
                        <div className="font-bold text-teal-800 flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5" />
                          CMO Mentor Takeaway:
                        </div>
                        <p className="leading-relaxed">
                          {sj.mentorshipTakeaway}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className="bg-white border border-teal-300 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-teal-600 border-t-transparent animate-spin shrink-0" />
                <div className="text-xs text-slate-600">
                  <strong>Validating MandatoryProposalSchema...</strong>{" "}
                  Injecting VoC quotes, Devil&apos;s Advocate failure hypothesis,
                  and Kill Criteria stop-loss.
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Controls */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  1. Select Marketing Skill
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      ⚡ {skill.skill_name} ({skill.category || "Skill"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Proposal Type
                </label>
                <select
                  value={preferredPlatform}
                  onChange={(e) =>
                    setPreferredPlatform(e.target.value as AssetPlatform)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      📄 {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Explanation Detail Level (1-3) */}
            <div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                {DETAIL_LEVELS.map((item) => {
                  const active = detailLevel === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setDetailLevel(item.level)}
                      className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <div className="text-xs">{item.short}</div>
                      <div
                        className={`text-[10px] truncate ${
                          active ? "text-teal-300" : "text-slate-400"
                        }`}
                      >
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Command Input or Reality Gate Lock Button */}
            {isNewGenerationBlockedByRealityGate ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
                <div className="text-xs text-red-900">
                  <strong>🔒 Weekly Reality Gate is LOCKED:</strong> Submit your
                  60-second weekly log (or click{" "}
                  <em>&ldquo;Refine in Chat&rdquo;</em> on an existing card on
                  the left).
                </div>
                <button
                  type="button"
                  onClick={() => setRealityGateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Submit Weekly Log →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder={
                    targetRevisionAsset
                      ? `Refine "${targetRevisionAsset.title}" (e.g., "Make the 30-day guarantee bolder")...`
                      : `Draft new ${activeBottleneckStage} proposal (or try an out-of-scope request to test the guardrail)...`
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !commandInput.trim()}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl disabled:opacity-50 text-white font-bold text-sm shadow-sm transition shrink-0 ${
                    targetRevisionAsset
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-teal-600 hover:bg-teal-700"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {targetRevisionAsset ? "Revise Card" : "Generate"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
