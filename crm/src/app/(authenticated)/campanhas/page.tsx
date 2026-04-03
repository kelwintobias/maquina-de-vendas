"use client";

import { useState } from "react";
import { useRealtimeBroadcasts } from "@/hooks/use-realtime-broadcasts";
import { useRealtimeCadences } from "@/hooks/use-realtime-cadences";
import { CampaignsDashboard } from "@/components/campaigns/campaigns-dashboard";
import { CampaignsTabs } from "@/components/campaigns/campaigns-tabs";
import { CreateBroadcastModal } from "@/components/campaigns/create-broadcast-modal";

export default function CampanhasPage() {
  const { broadcasts, loading: bLoading } = useRealtimeBroadcasts();
  const { cadences, loading: cLoading } = useRealtimeCadences();
  const [period, setPeriod] = useState("30d");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCadenceModal, setShowCadenceModal] = useState(false);

  const handleCreateCadence = async () => {
    const name = prompt("Nome da cadencia:");
    if (!name) return;
    await fetch("/api/cadences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setShowCadenceModal(false);
  };

  if (bLoading || cLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-pulse" style={{ backgroundColor: "#e5e5dc" }} />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 h-20 animate-pulse" style={{ backgroundColor: "rgba(229,229,220,0.3)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Campanhas
          </h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>
            Disparos em massa e cadencias de follow-up
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#1f1f1f] text-white hover:bg-[#333] transition-colors"
          >
            + Disparo
          </button>
          <button
            onClick={handleCreateCadence}
            className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#f6f7ed] text-[#1f1f1f] border border-[#e5e5dc] hover:bg-[#eef0e0] transition-colors"
          >
            + Cadencia
          </button>
        </div>
      </div>

      <CampaignsDashboard period={period} onPeriodChange={setPeriod} />
      <CampaignsTabs broadcasts={broadcasts} cadences={cadences} onRefreshBroadcasts={() => {}} />

      <CreateBroadcastModal
        open={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        onCreated={() => {}}
      />
    </div>
  );
}
