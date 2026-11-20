"use client";

import React from "react";
import { useMarketingStore, NavigationTab } from "@/store/useMarketingStore";
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Sliders,
  ShieldCheck,
  GraduationCap,
  Database,
  Radar,
  Bot,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    skills,
    campaigns,
    assets,
    plannedActivities,
    ontarioTrends,
  } = useMarketingStore();

  const queuedActivities = plannedActivities.filter(
    (a) => a.status === "Queued"
  ).length;

  const navItems: {
    id: NavigationTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      sublabel: "Campaigns & Ontario funnel",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: "planner",
      label: "CMO Planner & Agents",
      sublabel: "Daily–Annual plans & 5 agents",
      icon: <Bot className="w-5 h-5" />,
      badge: `${queuedActivities} Queued`,
    },
    {
      id: "intel",
      label: "Market & Competitor Intel",
      sublabel: "Ontario trends & URL scanner",
      icon: <Radar className="w-5 h-5" />,
      badge: `${ontarioTrends.length} Signals`,
    },
    {
      id: "copilot",
      label: "Campaign Co-Pilot",
      sublabel: "Dual-pane canvas & AI mentor",
      icon: <Sparkles className="w-5 h-5" />,
      badge: `${assets.length} Assets`,
    },
    {
      id: "skills",
      label: "Skill Library",
      sublabel: "CRUD marketing frameworks",
      icon: <BookOpen className="w-5 h-5" />,
      badge: `${skills.length}`,
    },
    {
      id: "settings",
      label: "AI Settings & Persona",
      sublabel: "MindLC guardrails & schema",
      icon: <Sliders className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-950/50">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white">
              MindLC
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Multi-Agent
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ontario Math Gr. 7–12 OS
          </p>
        </div>
      </div>

      {/* Active Positioning Pill */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-teal-400 mb-1">
          <span>Active Persona Guardrail</span>
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
          Human Learning Managers (Accountability) + 24/7 Socratic AI Math Hints
        </p>
      </div>

      {/* Navigation Links */}
      <div className="px-3 py-4 flex-1 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Command Workspace
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-teal-600 text-white shadow-md shadow-teal-950/40"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`${
                    isActive ? "text-white" : "text-teal-400"
                  } transition-colors shrink-0`}
                >
                  {item.icon}
                </div>
                <div className="truncate">
                  <div className="text-sm font-semibold leading-tight truncate">
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 truncate ${
                      isActive ? "text-teal-100" : "text-slate-400"
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-1 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Status & Admin User */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            {isSupabaseConfigured ? "Supabase Live" : "Supabase Local Store"}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
            {campaigns.length} Campaigns
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="truncate">
            <div className="text-xs font-semibold text-white truncate">
              {currentUser.email}
            </div>
            <div className="text-[11px] text-slate-400">
              Role:{" "}
              <span className="text-teal-400 font-medium">
                {currentUser.role}
              </span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-4 ring-teal-400/20" />
        </div>
      </div>
    </aside>
  );
}
