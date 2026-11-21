"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import {
  CMOApprovalChecklist,
  ProposalVersionSnapshot,
  TierId,
} from "@/types/database";
import {
  ChannelAwareDraftRenderer,
  convertDraftToCleanHtml,
  stripMarkdownToCleanText,
} from "@/components/ChannelAwareDraftRenderer";
import {
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  FileText,
  MessageSquareQuote,
  X,
  CheckCircle2,
  Send,
  Edit3,
  Save,
  RotateCcw,
  Lock,
  FileCode2,
} from "lucide-react";

type FocusSubView = "draft" | "risks" | "voc_diff";

const QUICK_STEER_CHIPS_BY_TIER: Record<TierId, string[]> = {
  TIER_1: [
    "Sharp Ontario MHF4U/MCR3U closed-book test hook",
    "Remove human manager mention (100% self-serve)",
    "Shorten under 120 words with instant Free Diagnostic CTA",
  ],
  TIER_2: [
    "Emphasize weekly human Learning Manager check-in ($139/mo)",
    "Contrast against $380/mo franchise tutoring centers",
    "Tie hook to Ontario Growing Success (K/T/C/A) rubric",
  ],
  TIER_3: [
    "Executive concierge tone — strictly 5 seats per semester",
    "Direct 1:1 Principal Academic Strategist Audit CTA",
    "Remove any cheap discount or mass trial language",
  ],
};

export function CampaignCoPilotView() {
  const {
    activeTierId,
    tierWorkspaces,
    assets,
    selectedProposalId,
    chatMessages,
    isGenerating,
    isAiDrawerOpen,
    setAiDrawerOpen,
    inspectedRiskProposalIds,
    markProposalRiskInspected,
    toggleCmoChecklistItem,
    approveAndLockProposal,
    rejectOrKillProposal,
    sendCopilotCommand,
    updateAssetContent,
    realityGateStatus,
    setRealityGateModalOpen,
    diagnosticToast,
    clearDiagnosticToast,
    pendingScopeDriftCommand,
  } = useMarketingStore();

  const activeTier = tierWorkspaces[activeTierId];
  const selectedProposal =
    assets.find((a) => a.id === selectedProposalId) || assets[0];

  const [activeSubView, setActiveSubView] = useState<FocusSubView>("draft");
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);
  const [copiedMode, setCopiedMode] = useState<"clean" | "formatted" | null>(
    null
  );

  // Direct inline copy edit mode inside Draft view (human-clean text without raw markdown)
  const [isEditingCopy, setIsEditingCopy] = useState(false);
  const [editableText, setEditableText] = useState("");
  const [editableTitle, setEditableTitle] = useState("");

  // Minimal Bottom Action Bar Popovers
  const [showApprovePopover, setShowApprovePopover] = useState(false);
  const [showRejectPopover, setShowRejectPopover] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // AI Co-Pilot Slide-Over Drawer input
  const [chatInput, setChatInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset subview, edit state, popovers, and scroll position when switching Tier or Proposal
  useEffect(() => {
    setActiveSubView("draft");
    setIsEditingCopy(false);
    setShowApprovePopover(false);
    setShowRejectPopover(false);
    setRejectReason("");
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTierId, selectedProposalId]);

  useEffect(() => {
    if (selectedProposal) {
      setEditableText(stripMarkdownToCleanText(selectedProposal.content));
      setEditableTitle(selectedProposal.title || "Untitled Proposal");
    }
  }, [selectedProposal]);

  if (!selectedProposal) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-medium text-slate-600">
            No active proposal selected for {activeTier.tier_name}.
          </p>
          <p className="text-xs text-slate-400">
            Use the <strong>+ New Proposal</strong> button in the left rail to
            generate a new conversion asset.
          </p>
        </div>
      </div>
    );
  }

  const schema = selectedProposal.proposal_schema;
  const hitlState = selectedProposal.hitl_state || "DRAFT";
  const isApproved =
    hitlState === "APPROVED_FOR_EXECUTION" ||
    hitlState === "VALIDATED_WINNER";
  const isKilled = hitlState === "KILLED_BY_STOP_LOSS";
  const hasInspectedRisks = Boolean(
    inspectedRiskProposalIds[selectedProposal.id]
  );

  const checklist: CMOApprovalChecklist = selectedProposal.cmo_checklist || {
    ontario_context: false,
    single_cta: false,
    brand_trust: false,
  };
  const allThreeChecked =
    checklist.ontario_context &&
    checklist.single_cta &&
    checklist.brand_trust;

  const citedQuoteStrings: string[] = schema?.cited_voc_quotes || [];
  const versionHistory: ProposalVersionSnapshot[] =
    selectedProposal.versions || [];
  const latestVersion = versionHistory[versionHistory.length - 1];
  const previousVersion =
    versionHistory.length >= 2
      ? versionHistory[versionHistory.length - 2]
      : null;

  // 1. Copy Clean Text (Primary — for Facebook groups, Instagram, WhatsApp, SMS)
  const handleCopyCleanText = async () => {
    const cleanText = stripMarkdownToCleanText(selectedProposal.content);
    const ctaSuffix = schema?.single_cta
      ? `\n\n${stripMarkdownToCleanText(schema.single_cta)}`
      : "";
    await navigator.clipboard.writeText(`${cleanText}${ctaSuffix}`.trim());
    setCopiedMode("clean");
    setCopyToastMessage("Copied clean text!");
    setTimeout(() => {
      setCopiedMode(null);
      setCopyToastMessage(null);
    }, 2000);
  };

  // 2. Copy Formatted (Secondary — for Gmail, Google Docs, Notion)
  const handleCopyFormatted = async () => {
    const cleanText = stripMarkdownToCleanText(selectedProposal.content);
    const htmlString = convertDraftToCleanHtml(
      selectedProposal.content,
      schema?.single_cta
    );

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const htmlBlob = new Blob([htmlString], { type: "text/html" });
        const textBlob = new Blob([cleanText], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(cleanText);
      }
    } catch {
      await navigator.clipboard.writeText(cleanText);
    }

    setCopiedMode("formatted");
    setCopyToastMessage("Copied formatted copy for Gmail / Docs!");
    setTimeout(() => {
      setCopiedMode(null);
      setCopyToastMessage(null);
    }, 2000);
  };

  const handleSaveInlineEdit = () => {
    if (!editableText.trim()) return;
    updateAssetContent(
      selectedProposal.id,
      editableText,
      editableTitle.trim() || selectedProposal.title || "Untitled Proposal"
    );
    setIsEditingCopy(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    const command = chatInput.trim();
    setChatInput("");
    await sendCopilotCommand(command);
  };

  const handleQuickSteer = async (chipPrompt: string) => {
    if (isGenerating) return;
    await sendCopilotCommand(chipPrompt);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    rejectOrKillProposal(
      selectedProposal.id,
      rejectReason.trim() || "Stopped by Acting CMO during review",
      "KILLED_BY_STOP_LOSS"
    );
    setShowRejectPopover(false);
    setRejectReason("");
  };

  const handleConfirmApprove = () => {
    if (!allThreeChecked) return;
    approveAndLockProposal(selectedProposal.id);
    setShowApprovePopover(false);
  };

  const effectiveChannel =
    schema?.channel ||
    selectedProposal.channel_badge ||
    selectedProposal.platform;

  return (
    <div
      ref={scrollContainerRef}
      className="relative min-h-[calc(100vh-60px)] flex flex-col justify-between bg-slate-50/60"
    >
      {/* Crisp Floating Copy Confirmation Toast */}
      {copyToastMessage && (
        <div className="fixed top-[72px] right-6 z-50 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{copyToastMessage}</span>
        </div>
      )}

      {/* Optional subtle toast if a stage/tier guardrail notification fired */}
      {diagnosticToast && (
        <div className="max-w-[820px] w-full mx-auto px-6 pt-4">
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

      {/* =================================================================== */}
      {/* CENTER FOCUS CANVAS (Centered Document Container max-width: 820px)   */}
      {/* =================================================================== */}
      <div className="max-w-[820px] w-full mx-auto px-6 pt-7 pb-28 flex-1">
        {/* 1. MINIMAL PROPOSAL HEADER (Title + Channel Tag + Single CTA Pill) */}
        <div className="space-y-3 pb-5 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isApproved
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : isKilled
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isApproved
                      ? "bg-emerald-500"
                      : isKilled
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                />
                {isApproved
                  ? "Approved & Locked"
                  : isKilled
                  ? "Killed / Stop-Loss"
                  : "In Review"}
              </span>

              {/* Channel Tag */}
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {effectiveChannel}
              </span>

              {/* Stage Pill */}
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200">
                {selectedProposal.stage_id ||
                  schema?.stage_id ||
                  activeTier.active_stage}
              </span>
            </div>

            {/* Single CTA Pill */}
            {schema?.single_cta && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 max-w-xs truncate"
                title={`Single CTA: ${stripMarkdownToCleanText(
                  schema.single_cta
                )}`}
              >
                <span className="font-semibold text-slate-800">CTA:</span>
                <span className="truncate">
                  {stripMarkdownToCleanText(schema.single_cta)}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-snug">
            {stripMarkdownToCleanText(
              selectedProposal.title || "Untitled Proposal"
            )}
          </h1>
        </div>

        {/* 2. FOUR CLEAN VIEW/ACTION PILLS RIGHT BELOW THE TITLE */}
        <div className="py-4 flex flex-wrap items-center justify-between gap-2">
          {/* Left 3 View Pills */}
          <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200">
            {/* Pill 1: 📄 Draft (Default active view) */}
            <button
              onClick={() => setActiveSubView("draft")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubView === "draft"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Draft</span>
            </button>

            {/* Pill 2: ⚠️ Risks & Kill (Tiny amber dot until clicked once) */}
            <button
              onClick={() => {
                setActiveSubView("risks");
                markProposalRiskInspected(selectedProposal.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubView === "risks"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Risks &amp; Kill</span>
              {!hasInspectedRisks && (
                <span
                  className="w-2 h-2 rounded-full bg-amber-500"
                  title="Uninspected risk & stop-loss criteria"
                />
              )}
            </button>

            {/* Pill 3: 🗣️ VoC & Diff */}
            <button
              onClick={() => setActiveSubView("voc_diff")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubView === "voc_diff"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-600" />
              <span>VoC &amp; Diff</span>
              <span className="text-[10px] font-mono text-slate-400">
                v{versionHistory.length || 1}
              </span>
            </button>
          </div>

          {/* Pill 4 (Right Action Button): ✨ Refine with AI */}
          <button
            onClick={() => setAiDrawerOpen(!isAiDrawerOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
              isAiDrawerOpen
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white hover:bg-indigo-50/60 text-indigo-700 border-indigo-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Refine with AI</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* 3. SUB-VIEW CANVAS CONTENT (Strict Progressive Disclosure)        */}
        {/* ================================================================= */}

        {/* SUB-VIEW A: 📄 DRAFT (Clean Typography + Channel-Aware Preview + Smart Copy Buttons) */}
        {activeSubView === "draft" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Document Toolbar with Smart Copy Buttons */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                {activeTier.tier_name} · {effectiveChannel}
              </span>

              <div className="flex items-center gap-2">
                {!isEditingCopy ? (
                  <>
                    {/* Subtle Edit Toggle (edits clean text without raw markdown) */}
                    <button
                      onClick={() => {
                        setEditableText(
                          stripMarkdownToCleanText(selectedProposal.content)
                        );
                        setIsEditingCopy(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Directly edit wording in clean plain text"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Secondary Smart Copy: Copy Formatted (for Gmail, Google Docs, Notion) */}
                    <button
                      onClick={handleCopyFormatted}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                      title="Copy rich HTML formatting for Gmail, Google Docs, or Notion (zero raw ### or **)"
                    >
                      {copiedMode === "formatted" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">
                            Copied Formatted
                          </span>
                        </>
                      ) : (
                        <>
                          <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Formatted</span>
                        </>
                      )}
                    </button>

                    {/* Primary Smart Copy: Copy Clean Text (for Facebook groups, WhatsApp, SMS) */}
                    <button
                      onClick={handleCopyCleanText}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors"
                      title="Copy 100% clean plain text with • bullets and zero raw Markdown characters"
                    >
                      {copiedMode === "clean" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Clean Text!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Clean Text</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingCopy(false);
                        setEditableText(
                          stripMarkdownToCleanText(selectedProposal.content)
                        );
                        setEditableTitle(
                          selectedProposal.title || "Untitled Proposal"
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveInlineEdit}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Revision</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Clean Editorial Document Body (Zero Raw Markdown Symbols) */}
            <div className="p-7 sm:p-8">
              {isEditingCopy ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400">
                      Proposal Title
                    </label>
                    <input
                      type="text"
                      value={editableTitle}
                      onChange={(e) => setEditableTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400">
                      Clean Human-Readable Copy (No Markdown Syntax Needed)
                    </label>
                    <textarea
                      rows={15}
                      value={editableText}
                      onChange={(e) => setEditableText(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-4 text-[15px] leading-[1.7] text-slate-800 font-sans focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <ChannelAwareDraftRenderer
                  content={selectedProposal.content}
                  title={selectedProposal.title || "Untitled Proposal"}
                  channel={effectiveChannel}
                  tierName={activeTier.tier_name}
                  singleCta={schema?.single_cta}
                />
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW B: ⚠️ RISKS & KILL (2-column Devil's Advocate & Kill Criteria cards) */}
        {activeSubView === "risks" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Devil's Advocate Failure Mode */}
              <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Devil&apos;s Advocate Critique (Why This Could Fail)
                  </h3>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {schema?.devils_advocate?.primary_failure_hypothesis ||
                    "Ontario parents may ignore this message if it sounds like generic automated AI tutoring rather than structured closed-book test preparation."}
                </p>
                {schema?.devils_advocate?.blind_spot_question && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <strong className="text-amber-900">
                      Blind-Spot Question:{" "}
                    </strong>
                    {schema.devils_advocate.blind_spot_question}
                  </div>
                )}
              </div>

              {/* Card 2: Kill / Stop-Loss Criteria */}
              <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Hard Kill / Stop-Loss Criteria
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Sample Threshold:{" "}
                    </span>
                    <span>
                      {schema?.kill_criteria?.sample_threshold ||
                        "40 qualified touches or 7 days"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-rose-800">
                      Stop-Loss Trigger:{" "}
                    </span>
                    <span className="font-medium">
                      {schema?.kill_criteria?.stop_loss_metric ||
                        "Conversion falls below active stage target"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-900">
                      Mandatory Pivot Action:{" "}
                    </span>
                    <span>
                      {schema?.kill_criteria?.pivot_action ||
                        "Pause immediately and pivot offer hook."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Metric & Revision Notes Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Stage Metric &amp; Revision Audit
              </div>
              <p className="text-sm text-slate-800 font-semibold">
                {schema?.target_metric ||
                  activeTier.stage_goals[activeTier.active_stage]
                    .primary_kpi_name}
              </p>
              {schema?.revision_notes && (
                <p className="text-xs text-slate-500">
                  {schema.revision_notes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW C: 🗣️ VoC & DIFF (Cited Real Parent Quotes & Clean v1/v2 Version Diff) */}
        {activeSubView === "voc_diff" && (
          <div className="space-y-5">
            {/* Cited Real Parent Quotes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cited Verbatim Parent Quotes (VoC Grounding)
                </h3>
                <span className="text-xs font-mono text-indigo-600">
                  {citedQuoteStrings.length} cited
                </span>
              </div>

              {citedQuoteStrings.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No specific VoC quotes attached to this draft yet. Open the{" "}
                  <strong>VoC Vault</strong> in the top bar to inject a parent
                  quote.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {citedQuoteStrings.map((quoteStr, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed"
                    >
                      {stripMarkdownToCleanText(quoteStr)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Version History & Clean v1 / v2 Diff (Zero Raw Markdown) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Version History &amp; Revision Diff
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {versionHistory.length} snapshot(s)
                </span>
              </div>

              {previousVersion && latestVersion ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-mono font-semibold text-slate-600 shrink-0">
                        v{previousVersion.version} (Previous)
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {previousVersion.change_summary}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                      {stripMarkdownToCleanText(previousVersion.content)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-mono font-semibold text-indigo-700 shrink-0">
                        v{latestVersion.version} (Active)
                      </span>
                      <span className="text-[11px] text-indigo-600 font-medium truncate">
                        {latestVersion.change_summary}
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                      {stripMarkdownToCleanText(latestVersion.content)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Currently on initial snapshot (<strong>v1</strong>). Use{" "}
                  <strong>✨ Refine with AI</strong> or{" "}
                  <strong>Edit</strong> to create{" "}
                  <span className="font-mono">v2</span> and compare side-by-side
                  diffs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4. MINIMAL BOTTOM ACTION BAR (Floating/Sticky Footer under Document)*/}
      {/* =================================================================== */}
      <footer className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-6 py-3">
        <div className="max-w-[820px] mx-auto flex items-center justify-between gap-4 relative">
          {/* Left Subtle Status Summary */}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>
              {isApproved
                ? "Proposal locked and ready for execution."
                : isKilled
                ? `Stopped: ${
                    selectedProposal.kill_or_reject_reason ||
                    "Kill criteria triggered"
                  }`
                : "Review draft, then approve or kill."}
            </span>
          </div>

          {/* Right Two Clean Buttons ONLY: [Reject / Kill] and [Approve Proposal] */}
          <div className="flex items-center gap-2.5">
            {/* Secondary: Reject / Kill */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRejectPopover((prev) => !prev);
                  setShowApprovePopover(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
              >
                Reject / Kill
              </button>

              {/* 1-Line Reason Popover for Reject / Kill */}
              {showRejectPopover && (
                <div className="absolute bottom-12 right-0 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      Kill / Reject Proposal
                    </span>
                    <button
                      onClick={() => setShowRejectPopover(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <form onSubmit={handleConfirmReject} className="space-y-2.5">
                    <input
                      type="text"
                      autoFocus
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="1-line stop-loss or rejection reason..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectPopover(false)}
                        className="px-2.5 py-1 rounded-md text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Confirm Kill
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Primary: Approve Proposal (Opens 30-Second Approval Popover) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowApprovePopover((prev) => !prev);
                  setShowRejectPopover(false);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                  isApproved
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isApproved ? "Approved & Locked" : "Approve Proposal"}
                </span>
              </button>

              {/* 30-SECOND APPROVAL POPOVER (Appears ONLY when clicking Approve Proposal) */}
              {showApprovePopover && (
                <div className="absolute bottom-12 right-0 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 z-30 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        30-Second CMO Approval Gate
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Verify all 3 safeguards to lock this asset for launch.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowApprovePopover(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {/* Checkbox 1: Ontario Context */}
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.ontario_context}
                        onChange={() =>
                          toggleCmoChecklistItem(
                            selectedProposal.id,
                            "ontario_context"
                          )
                        }
                        className="mt-0.5 rounded border-slate-300 text-indigo-600"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">
                          1. Ontario Context &amp; VoC Alignment
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Reflects real Ontario Gr 9–12 courses (K/T/C/A, EQAO,
                          MHF4U/MCR3U) &amp; parent VoC.
                        </div>
                      </div>
                    </label>

                    {/* Checkbox 2: Single CTA */}
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.single_cta}
                        onChange={() =>
                          toggleCmoChecklistItem(
                            selectedProposal.id,
                            "single_cta"
                          )
                        }
                        className="mt-0.5 rounded border-slate-300 text-indigo-600"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">
                          2. Single Frictionless CTA
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Drives one clear next action aligned with{" "}
                          {activeTier.tier_name} ({activeTier.active_stage}).
                        </div>
                      </div>
                    </label>

                    {/* Checkbox 3: Brand Trust */}
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.brand_trust}
                        onChange={() =>
                          toggleCmoChecklistItem(
                            selectedProposal.id,
                            "brand_trust"
                          )
                        }
                        className="mt-0.5 rounded border-slate-300 text-indigo-600"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">
                          3. Brand Trust &amp; Tier Tone Purity
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Zero fake mark guarantees, zero cross-tier tone bleed,
                          honest Socratic positioning.
                        </div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={!allThreeChecked}
                    onClick={handleConfirmApprove}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors"
                  >
                    Confirm &amp; Lock Asset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* 5. ON-DEMAND DRAWER D: AI CO-PILOT RIGHT SLIDE-OVER (`width: 400px`)*/}
      {/* =================================================================== */}
      {isAiDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[400px] bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  AI Co-Pilot · {activeTier.tier_name}
                </h3>
                <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                  Refining: {selectedProposal.title || "Active Draft"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reality Gate Warning Banner inside Drawer if Locked */}
          {realityGateStatus === "LOCKED" && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Reality Gate locked for this tier.</span>
              </div>
              <button
                onClick={() => setRealityGateModalOpen(true)}
                className="font-semibold underline text-amber-950"
              >
                Unlock
              </button>
            </div>
          )}

          {/* Chat Thread & Change-Summary Pills */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Version Change Summary Pills */}
            {versionHistory.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Revision Trail
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {versionHistory.map((v: ProposalVersionSnapshot) => (
                    <span
                      key={v.version}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <strong className="font-mono text-indigo-700">
                        v{v.version}
                      </strong>
                      <span className="truncate max-w-[220px]">
                        {v.change_summary}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {chatMessages.map((msg) => {
              const displayBody =
                msg.sender === "user"
                  ? msg.userPrompt
                  : msg.sender === "guardrail"
                  ? msg.scopeDriftWarning?.blockedReason ||
                    msg.changeSummaryPill
                  : msg.changeSummaryPill ||
                    msg.strategicJustification?.headlineSummary ||
                    "Updated active draft.";

              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white ml-6"
                      : msg.sender === "guardrail"
                      ? "bg-amber-50 text-amber-950 mr-4 border border-amber-300"
                      : "bg-slate-100 text-slate-800 mr-4 border border-slate-200/80"
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {stripMarkdownToCleanText(displayBody || "")}
                  </div>
                  {msg.strategicJustification?.rationaleBody && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 text-[11px] text-slate-500 whitespace-pre-wrap">
                      {stripMarkdownToCleanText(
                        msg.strategicJustification.rationaleBody
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Scope-Drift / Cross-Tier Override Prompt if Triggered */}
            {pendingScopeDriftCommand && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
                <div className="font-semibold">
                  Guardrail Hold: Confirm Explicit CMO Override?
                </div>
                <button
                  onClick={() =>
                    sendCopilotCommand(pendingScopeDriftCommand, true)
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px]"
                >
                  Override Guardrail &amp; Apply Change
                </button>
              </div>
            )}
          </div>

          {/* 3 Context-Aware Quick-Steer Chips + Input Box */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Quick-Steer ({activeTier.tier_name})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_STEER_CHIPS_BY_TIER[activeTierId].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleQuickSteer(chip)}
                    className="text-left px-2.5 py-1 rounded-lg text-[11px] bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                disabled={isGenerating}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask AI to sharpen hook, cite VoC, or adjust tone..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isGenerating || !chatInput.trim()}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
