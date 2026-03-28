"use client";

import { useState, useRef } from "react";
import { useRealtimeCampaigns } from "@/hooks/use-realtime-campaigns";
import { CampaignCard } from "@/components/campaign-card";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

export default function CampanhasPage() {
  const { campaigns, loading } = useRealtimeCampaigns();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [intervalMin, setIntervalMin] = useState(3);
  const [intervalMax, setIntervalMax] = useState(8);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const res = await fetch(`${FASTAPI_URL}/api/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        template_name: templateName,
        send_interval_min: intervalMin,
        send_interval_max: intervalMax,
      }),
    });

    if (res.ok) {
      const campaign = await res.json();

      const file = fileRef.current?.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}/import`, {
          method: "POST",
          body: formData,
        });
      }

      setShowForm(false);
      setName("");
      setTemplateName("");
    }
    setCreating(false);
  }

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
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Nova Campanha
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="card p-6 mb-6 grid grid-cols-2 gap-5"
        >
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
              Template
            </label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
              Intervalo min (s)
            </label>
            <input
              type="number"
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
              Intervalo max (s)
            </label>
            <input
              type="number"
              value={intervalMax}
              onChange={(e) => setIntervalMax(Number(e.target.value))}
              className="input-field w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[12px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
              CSV de leads
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#e5e5dc] rounded-xl cursor-pointer hover:border-[#c8cc8e] hover:bg-[#f6f7ed]/50 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-[13px] text-[#9ca3af] mt-2">
                {fileRef.current?.files?.[0]?.name || "Clique para selecionar um arquivo CSV"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
              />
            </label>
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary px-5 py-2.5 rounded-xl text-[13px] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary px-5 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50"
            >
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      )}

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
    </div>
  );
}
