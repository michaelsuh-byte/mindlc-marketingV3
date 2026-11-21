"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { SafeguardTopBar } from "@/components/SafeguardTopBar";
import { DashboardView } from "@/components/DashboardView";
import { MarketIntelView } from "@/components/MarketIntelView";
import { CmoPlannerAgentsView } from "@/components/CmoPlannerAgentsView";
import { CampaignCoPilotView } from "@/components/CampaignCoPilotView";
import { SkillLibraryView } from "@/components/SkillLibraryView";
import { AiSettingsPersonaView } from "@/components/AiSettingsPersonaView";
import { useMarketingStore } from "@/store/useMarketingStore";

export default function MindLCCommandCenterApp() {
  const { activeTab } = useMarketingStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* LEVEL 1: MACRO COMMAND STRIP (Sticky Top Bar — Height ~72px) */}
      <SafeguardTopBar />

      {/* LEVEL 2 (Left Meso Pipeline & VoC Rail) + LEVEL 3 (Micro Decision & Refinement Stage) */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === "copilot" && <CampaignCoPilotView />}
          {activeTab === "planner" && <CmoPlannerAgentsView />}
          {activeTab === "intel" && <MarketIntelView />}
          {activeTab === "skills" && <SkillLibraryView />}
          {activeTab === "settings" && <AiSettingsPersonaView />}
          {activeTab === "dashboard" && <DashboardView />}
        </main>
      </div>
    </div>
  );
}
