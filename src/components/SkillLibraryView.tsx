"use client";

import React, { useState } from "react";
import { useMarketingStore } from "@/store/useMarketingStore";
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Sparkles,
  CheckCircle2,
  Terminal,
} from "lucide-react";

export function SkillLibraryView() {
  const {
    skills,
    selectedSkillId,
    setSelectedSkillId,
    createSkill,
    updateSkill,
    deleteSkill,
    setActiveTab,
  } = useMarketingStore();

  const activeSkill =
    skills.find((s) => s.id === selectedSkillId) || skills[0];

  const [editName, setEditName] = useState(activeSkill?.skill_name || "");
  const [editCategory, setEditCategory] = useState(
    activeSkill?.category || "Conversion & Messaging"
  );
  const [editPrompt, setEditPrompt] = useState(
    activeSkill?.system_prompt || ""
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSelectSkill = (id: string) => {
    setIsCreatingNew(false);
    setSelectedSkillId(id);
    const found = skills.find((s) => s.id === id);
    if (found) {
      setEditName(found.skill_name);
      setEditCategory(found.category || "Custom Framework");
      setEditPrompt(found.system_prompt);
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setEditName("parent-webinar-funnel");
    setEditCategory("Lead Generation & Events");
    setEditPrompt(
      "You are an EdTech Webinar & Parent Workshop Architect for MindLC. Design high-attendance parent workshops focused on Ontario Grade 9 EQAO and Grade 11/12 University Math readiness, highlighting live Q&A with a Human Learning Manager and a live demo of MindLC's 24/7 Socratic AI math coach."
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPrompt.trim()) return;

    if (isCreatingNew) {
      createSkill(editName, editPrompt, editCategory);
      setIsCreatingNew(false);
      setSavedNotice(`Created new skill "${editName}" in marketing_skills!`);
    } else if (activeSkill) {
      updateSkill(activeSkill.id, editName, editPrompt, editCategory);
      setSavedNotice(
        `Updated system_prompt for "${editName}" in marketing_skills!`
      );
    }

    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (skills.length <= 1) return;
    deleteSkill(id);
    const nextSkill = skills.find((s) => s.id !== id);
    if (nextSkill) {
      setEditName(nextSkill.skill_name);
      setEditCategory(nextSkill.category || "Conversion & Messaging");
      setEditPrompt(nextSkill.system_prompt);
    }
    setSavedNotice(`Deleted skill "${name}" from library.`);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            <BookOpen className="w-4 h-4" />
            Page 2 · CRUD Management (`public.marketing_skills`)
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Marketing Skill Library & System Prompts
          </h1>
          <p className="text-sm text-slate-600">
            Create, inspect, edit, and delete the underlying AI marketing
            frameworks (`ai-seo`, `social-content`, `copywriting`,
            `copy-editing`, `cro`) that power the Campaign Co-Pilot dropdown.
          </p>
        </div>

        <button
          onClick={handleStartNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create New Marketing Skill
        </button>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {savedNotice}
        </div>
      )}

      {/* Split Layout: Left List of Skills + Right System Prompt CRUD Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Skills Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <span className="font-bold text-sm">
              Embedded Skills ({skills.length})
            </span>
            <span className="text-[11px] text-teal-300 font-mono">
              marketing_skills
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {skills.map((skill) => {
              const isSelected =
                !isCreatingNew && skill.id === activeSkill?.id;
              return (
                <div
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill.id)}
                  className={`p-4 cursor-pointer transition ${
                    isSelected
                      ? "bg-teal-50/80 border-l-4 border-l-teal-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {skill.skill_name}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {skill.category || "Framework"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                    {skill.system_prompt}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: CRUD System Prompt Editor */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-teal-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-lg">
                  {isCreatingNew
                    ? "Create New Marketing Skill"
                    : `Edit Skill: ${activeSkill?.skill_name}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Changes immediately update the Campaign Co-Pilot skill
                  selector
                </p>
              </div>
            </div>

            {!isCreatingNew && activeSkill && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSkillId(activeSkill.id);
                    setActiveTab("copilot");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use in Co-Pilot
                </button>
                {skills.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(activeSkill.id, activeSkill.skill_name)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Skill Slug (`skill_name`)
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., ai-seo, social-content, copy-editing"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Skill Category
              </label>
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g., Organic & AI Search (AEO/GEO)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Underlying System Prompt (`system_prompt`)
              </label>
              <span className="text-xs text-slate-400">
                Injected into Google Gemini systemInstruction
              </span>
            </div>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={9}
              required
              className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {isCreatingNew && (
              <button
                type="button"
                onClick={() =>
                   activeSkill && handleSelectSkill(activeSkill.id)
                }
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition"
            >
              <Save className="w-4 h-4 text-teal-400" />
              {isCreatingNew ? "Save New Skill" : "Save System Prompt Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
