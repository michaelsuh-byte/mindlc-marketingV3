"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { CampaignCoPilotView } from "@/components/CampaignCoPilotView";
import { SkillLibraryView } from "@/components/SkillLibraryView";
import { AiSettingsPersonaView } from "@/components/AiSettingsPersonaView";
import { useMarketingStore } from "@/store/useMarketingStore";

export default function MindLCCommandCenterApp() {
  const { activeTab } = useMarketingStore();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Persistent Sidebar Navigation */}
      <Sidebar />

      {/* Main Dynamic Workspace */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "copilot" && <CampaignCoPilotView />}
        {activeTab === "skills" && <SkillLibraryView />}
        {activeTab === "settings" && <AiSettingsPersonaView />}
      </main>
    </div>
  );
}
