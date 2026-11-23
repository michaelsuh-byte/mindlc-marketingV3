"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { SafeguardTopBar } from "@/components/SafeguardTopBar";
import { DashboardView } from "@/components/DashboardView";
import { MarketIntelView } from "@/components/MarketIntelView";
import { CmoPlannerAgentsView } from "@/components/CmoPlannerAgentsView";
import { CampaignCoPilotView } from "@/components/CampaignCoPilotView";
import { ClosingAnalyticsView } from "@/components/ClosingAnalyticsView";
import { SkillLibraryView } from "@/components/SkillLibraryView";
import { AiSettingsPersonaView } from "@/components/AiSettingsPersonaView";
import { useMarketingStore } from "@/store/useMarketingStore";

export default function MindLCCommandCenterApp() {
  const { activeTab } = useMarketingStore();

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* TOP-LEVEL NAVIGATION BAR (All Workspace Tabs) + CAMPAIGNS & TIERS SUB-MENU */}
      <SafeguardTopBar />

      {activeTab === "copilot" ? (
        /* CAMPAIGNS & TIERS: Collapsible Left Proposal Rail + Center Focus Canvas */
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto">
            <CampaignCoPilotView />
          </main>
        </div>
      ) : (
        /* FULL-WIDTH WORKSPACE TABS: Closing & Analytics, CMO Planner, Market & Competitors, Playbook Skills, Brand Guardrails */
        <main className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === "closing" && <ClosingAnalyticsView />}
          {activeTab === "planner" && <CmoPlannerAgentsView />}
          {activeTab === "intel" && <MarketIntelView />}
          {activeTab === "skills" && <SkillLibraryView />}
          {activeTab === "settings" && <AiSettingsPersonaView />}
          {activeTab === "dashboard" && <DashboardView />}
        </main>
      )}
    </div>
  );
}
