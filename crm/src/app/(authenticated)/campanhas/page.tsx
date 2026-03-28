"use client";

import { useState } from "react";
import { useRealtimeCampaigns } from "@/hooks/use-realtime-campaigns";
import { CampaignCard } from "@/components/campaign-card";
import { CreateCampaignModal } from "@/components/create-campaign-modal";

export default function CampanhasPage() {
  const { campaigns, loading } = useRealtimeCampaigns();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div className="w-5 h-5 border-2 border-[#c8cc8e] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#5f6368] text-[14px]">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[28px] font-bold text-[#1f1f1f]">Campanhas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Nova Campanha
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
        {campaigns.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-[14px] text-[#5f6368]">Nenhuma campanha criada ainda.</p>
          </div>
        )}
      </div>

      <CreateCampaignModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
