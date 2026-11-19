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
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  Clock,
  GraduationCap,
  Wand2,
  ArrowLeftRight,
} from "lucide-react";

const PLATFORMS: AssetPlatform[] = [
  "Landing Page",
  "Facebook",
  "SEO Meta",
  "Blog",
  "Email Sequence",
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
    desc: "Audience psychology & framework alignment",
  },
  {
    level: 3,
    short: "Lvl 3 · Deep Mentor",
    full: "Level 3: Deep Mentorship (The Why & How)",
    desc: "JTBD Four Forces, behavioral theory & A/B tests",
  },
];

const QUICK_PROMPTS = [
  {
    label: "📣 Grade 11 Functions (MCR3U) Facebook Ad",
    skillName: "social-content",
    platform: "Facebook" as AssetPlatform,
    prompt:
      "Write a high-converting Facebook ad for Ontario parents whose teens are struggling with Grade 11 Functions (MCR3U) homework at night.",
  },
  {
    label: "🔍 Grade 9 EQAO AI-SEO & Meta Strategy",
    skillName: "ai-seo",
    platform: "SEO Meta" as AssetPlatform,
    prompt:
      "Generate SEO Meta tags and an AI-SEO citation answer block for Grade 9 De-Streamed Math (MTH1W) and EQAO preparation in Ontario.",
  },
  {
    label: "🎯 Rewrite Hero Landing Page (PAS + CRO)",
    skillName: "copywriting",
    platform: "Landing Page" as AssetPlatform,
    prompt:
      "Write a Landing Page Hero and PAS section contrasting $80/hr weekly tutors and generic chatbots against MindLC's Human Learning Managers + Socratic AI.",
  },
  {
    label: "📝 Parent Blog: Socratic AI vs. ChatGPT",
    skillName: "copy-editing",
    platform: "Blog" as AssetPlatform,
    prompt:
      "Write a persuasive blog post for Ontario parents explaining why Socratic AI guided hints build real math exam confidence while generic chatbots cause test-day blanking.",
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
    setActiveCampaignId,
    setSelectedSkillId,
    setDetailLevel,
    setPreferredPlatform,
    sendCopilotCommand,
    updateAssetContent,
    deleteAsset,
    createManualAsset,
    toggleCampaignStatus,
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isGenerating) return;
    const text = commandInput.trim();
    setCommandInput("");
    await sendCopilotCommand(text);
  };

  const handleQuickPrompt = async (qp: (typeof QUICK_PROMPTS)[number]) => {
    if (isGenerating) return;
    const matchedSkill = skills.find((s) => s.skill_name === qp.skillName);
    if (matchedSkill) setSelectedSkillId(matchedSkill.id);
    setPreferredPlatform(qp.platform);
    await sendCopilotCommand(qp.prompt);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const platformBadgeColors: Record<AssetPlatform, string> = {
    "Landing Page": "bg-indigo-50 text-indigo-700 border-indigo-200",
    Facebook: "bg-blue-50 text-blue-700 border-blue-200",
    "SEO Meta": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Blog: "bg-amber-50 text-amber-700 border-amber-200",
    "Email Sequence": "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className="h-[calc(100vh)] flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Workspace Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-base">
                Campaign Co-Pilot — Dual-Pane Workspace
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Mandatory Output Protocol
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Left Pane: Editable Marketing Asset Canvas · Right Pane: AI
              Command & Strategic Mentorship
            </p>
          </div>
        </div>

        {/* Active Campaign Selector & Status Badge */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Campaign:
          </label>
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
              title="Click to toggle campaign status"
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
            LEFT PANE (7 Cols): ASSET CANVAS (Editable Preview Cards)
            =============================================================== */}
        <section className="lg:col-span-7 flex flex-col border-r border-slate-200 bg-slate-50/70 overflow-hidden">
          <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-slate-800 text-sm">
                Left Pane: Asset Canvas
              </span>
              <span className="text-xs text-slate-500">
                ({campaignAssets.length} editable cards in campaign)
              </span>
            </div>

            <button
              onClick={() =>
                createManualAsset(
                  preferredPlatform,
                  `New ${preferredPlatform} Draft — MindLC`,
                  `Edit your ${preferredPlatform} copy here or command the AI Co-Pilot on the right...`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Blank Asset Card
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {campaignAssets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-teal-600 mx-auto" />
                <h3 className="font-bold text-slate-800 text-base">
                  No Assets in This Campaign Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Use the AI Chat Window on the right (or click one of the quick
                  prompts) to generate your first Landing Page, Facebook Ad, or
                  AI-SEO asset.
                </p>
              </div>
            ) : (
              campaignAssets.map((asset) => {
                const isJustUpdated = asset.id === lastHighlightedAssetId;
                return (
                  <div
                    key={asset.id}
                    className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                      isJustUpdated
                        ? "border-teal-500 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            platformBadgeColors[asset.platform] ||
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {asset.platform}
                        </span>
                        {asset.skill_used && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            skill: {asset.skill_used}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          Detail Level {asset.detail_level_used}
                        </span>
                        {isJustUpdated && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white animate-pulse">
                            ★ Latest AI Output
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 mr-1">
                          {asset.updated_at || "Saved"}
                        </span>
                        <button
                          onClick={() => handleCopy(asset.id, asset.content)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                        >
                          {copiedId === asset.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
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
                          title="Delete Asset"
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Editable Title & Content */}
                    <div className="p-5 space-y-3">
                      <input
                        type="text"
                        value={asset.title || `${asset.platform} Asset`}
                        onChange={(e) =>
                          updateAssetContent(
                            asset.id,
                            asset.content,
                            e.target.value
                          )
                        }
                        className="w-full font-bold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-200 focus:border-teal-500 focus:outline-none pb-1"
                      />
                      <textarea
                        value={asset.content}
                        onChange={(e) =>
                          updateAssetContent(asset.id, e.target.value)
                        }
                        rows={10}
                        className="w-full text-sm text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 font-sans leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 resize-y"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Editable Canvas — changes sync automatically via
                          Zustand
                        </span>
                        <span>
                          {asset.content.split(/\s+/).filter(Boolean).length}{" "}
                          words · {asset.content.length} chars
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ===============================================================
            RIGHT PANE (5 Cols): AI CHAT & STRATEGIC MENTORSHIP WINDOW
            =============================================================== */}
        <section className="lg:col-span-5 flex flex-col bg-white overflow-hidden">
          {/* Chat Pane Header */}
          <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-400" />
              <div>
                <div className="text-sm font-bold leading-tight">
                  Right Pane: AI Mentor & Command Feed
                </div>
                <div className="text-[11px] text-slate-400">
                  Outputs Strategic Justification (Levels 1–3) while updating
                  Left Canvas
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {selectedSkill?.skill_name}
            </span>
          </div>

          {/* Quick-Launch Prompt Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">
              Try:
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

          {/* Chat Feed (Strategic Justifications) */}
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

              const sj = msg.strategicJustification;
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="w-full bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-4 shadow-xs space-y-3">
                    {/* AI Mentor Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                          AI
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Strategic Justification
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {msg.skillName}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        {sj?.levelLabel}
                      </span>
                    </div>

                    {/* Linked Asset Notification */}
                    {msg.linkedPlatform && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs">
                        <span className="font-semibold">
                          ✓ Marketing Copy routed to Left Canvas (
                          {msg.linkedPlatform})
                        </span>
                        <span className="text-[10px] font-mono uppercase">
                          Protocol Verified
                        </span>
                      </div>
                    )}

                    {/* Headline Summary */}
                    {sj?.headlineSummary && (
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {sj.headlineSummary}
                      </div>
                    )}

                    {/* Rationale Body */}
                    {sj?.rationaleBody && (
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                        {sj.rationaleBody}
                      </div>
                    )}

                    {/* Frameworks Applied */}
                    {sj?.frameworksApplied && sj.frameworksApplied.length > 0 && (
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

                    {/* Deep Mentorship Takeaway (Levels 2 & 3) */}
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
                  <strong>Enforcing Mandatory Output Protocol...</strong>{" "}
                  Separating <code className="text-teal-700">marketingContent</code>{" "}
                  (Left Canvas) from{" "}
                  <code className="text-teal-700">strategicJustification</code>{" "}
                  (Detail Level {detailLevel}).
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* =============================================================
              CRUCIAL CHAT UI CONTROLS:
              1. Dropdown Menu: "Select Marketing Skill" (from marketing_skills)
              2. Target Platform Selector
              3. Toggle Array / Slider: "Explanation Detail Level (1-3)"
              ============================================================= */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0 shadow-lg">
            {/* Control Row 1: Select Marketing Skill Dropdown + Target Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  1. Select Marketing Skill
                </label>
                <div className="relative">
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        ⚡ {skill.skill_name} ({skill.category || "Skill"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Asset Type (Left Canvas)
                </label>
                <select
                  value={preferredPlatform}
                  onChange={(e) =>
                    setPreferredPlatform(e.target.value as AssetPlatform)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      📄 {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Control Row 2: Explanation Detail Level (1-3) Toggle Array & Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  2. Explanation Detail Level (1–3)
                </label>
                <span className="text-[11px] font-semibold text-teal-700">
                  {DETAIL_LEVELS.find((d) => d.level === detailLevel)?.full}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                {DETAIL_LEVELS.map((item) => {
                  const active = detailLevel === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setDetailLevel(item.level)}
                      className={`py-2 px-2 rounded-lg text-center transition-all ${
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

            {/* Control Row 3: Chat Command Input */}
            <form onSubmit={handleSend} className="flex gap-2 pt-1">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={`Command [${selectedSkill?.skill_name}] for MindLC (e.g., "Write a Grade 9 EQAO parent Facebook ad")...`}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isGenerating || !commandInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition shrink-0"
              >
                <Send className="w-4 h-4" />
                Generate
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
