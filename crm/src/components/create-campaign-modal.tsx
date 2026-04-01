"use client";

import { useState, useEffect, useRef } from "react";
import { LeadSelector } from "@/components/lead-selector";
import type { Channel } from "@/lib/types";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [type, setType] = useState<"bot" | "seller">("bot");
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [intervalMin, setIntervalMin] = useState(3);
  const [intervalMax, setIntervalMax] = useState(8);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  // Step 2 fields
  const [leadTab, setLeadTab] = useState<"crm" | "csv">("crm");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ valid: number; invalid: number; invalidNumbers: string[] } | null>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch meta_cloud channels when modal opens
  useEffect(() => {
    if (!open) return;
    setChannelsLoading(true);
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data: Channel[]) => {
        const metaChannels = Array.isArray(data)
          ? data.filter((c) => c.provider === "meta_cloud" && c.is_active)
          : [];
        setChannels(metaChannels);
        if (metaChannels.length === 1) {
          setSelectedChannelId(metaChannels[0].id);
        }
      })
      .catch(() => {
        setChannels([]);
      })
      .finally(() => setChannelsLoading(false));
  }, [open]);

  function resetForm() {
    setStep(1);
    setType("bot");
    setName("");
    setTemplateName("");
    setIntervalMin(3);
    setIntervalMax(8);
    setSelectedChannelId("");
    setSelectedLeadIds(new Set());
    setCsvFile(null);
    setCsvPreview(null);
    setError(null);
    setLeadTab("crm");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const canProceed = name.trim() && templateName.trim() && selectedChannelId !== "";
  const canCreate = leadTab === "crm" ? selectedLeadIds.size > 0 : csvFile !== null;

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      // 1. Create campaign
      const res = await fetch(`${FASTAPI_URL}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          template_name: templateName,
          type,
          channel_id: selectedChannelId,
          send_interval_min: intervalMin,
          send_interval_max: intervalMax,
        }),
      });

      if (!res.ok) {
        setError("Erro ao criar campanha");
        setCreating(false);
        return;
      }

      const campaign = await res.json();

      // 2. Assign leads or import CSV
      if (leadTab === "crm" && selectedLeadIds.size > 0) {
        const assignRes = await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}/assign-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_ids: Array.from(selectedLeadIds) }),
        });

        if (!assignRes.ok) {
          setError("Campanha criada, mas erro ao vincular leads");
        }
      } else if (leadTab === "csv" && csvFile) {
        const formData = new FormData();
        formData.append("file", csvFile);
        const importRes = await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}/import`, {
          method: "POST",
          body: formData,
        });

        if (!importRes.ok) {
          setError("Campanha criada, mas erro ao importar CSV");
        }
      }

      handleClose();
    } catch {
      setError("Erro de conexao");
    }

    setCreating(false);
  }

  function handleCsvSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    // Preview: parse client-side for quick feedback
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      // Rough count: skip header, count lines with digits
      const dataLines = lines.slice(1);
      const phoneRegex = /\d{10,}/;
      let valid = 0;
      let invalid = 0;
      const invalidNumbers: string[] = [];
      dataLines.forEach((line) => {
        const firstCol = line.split(",")[0]?.trim().replace(/["\s]/g, "");
        if (firstCol && phoneRegex.test(firstCol)) {
          valid++;
        } else if (firstCol) {
          invalid++;
          if (invalidNumbers.length < 20) invalidNumbers.push(firstCol);
        }
      });
      setCsvPreview({ valid, invalid, invalidNumbers });
    };
    reader.readAsText(file);
  }

  if (!open) return null;

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ededea] flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#1f1f1f]">Nova Campanha</h2>
          <button onClick={handleClose} className="text-[#9ca3af] hover:text-[#1f1f1f] transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-[#ededea] flex items-center gap-3">
          <StepDot active={step === 1} done={step > 1} label="1. Configuracao" />
          <div className="w-8 h-px bg-[#ededea]" />
          <StepDot active={step === 2} done={false} label="2. Leads" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-5">
              {/* Channel selector — FIRST field */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
                  Canal WhatsApp (Meta Cloud)
                </label>
                {channelsLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-3 h-3 border-2 border-[#c8cc8e] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-[#5f6368]">Carregando canais...</span>
                  </div>
                ) : channels.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e5e5dc] bg-[#f4f4f0]">
                    <span className="w-2 h-2 bg-[#9ca3af] rounded-full" />
                    <span className="text-[13px] text-[#9ca3af]">Nenhum canal Meta Cloud disponivel</span>
                  </div>
                ) : (
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="bg-[#f6f7ed] border-none rounded-lg text-[13px] px-3 py-2 w-full outline-none focus:ring-1 focus:ring-[#c8cc8e]"
                  >
                    <option value="">Selecionar canal...</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} — {ch.phone}
                      </option>
                    ))}
                  </select>
                )}
                {selectedChannel && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#c8cc8e] text-[#1f1f1f] font-medium">
                      meta_cloud
                    </span>
                    <span className="text-[12px] text-[#5f6368]">{selectedChannel.phone}</span>
                  </div>
                )}
              </div>

              {/* Type selection */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
                  Tipo de campanha
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <TypeCard
                    selected={type === "bot"}
                    onClick={() => setType("bot")}
                    icon={<BotIcon />}
                    title="Bot (ValerIA)"
                    desc="Agente IA envia e responde"
                  />
                  <TypeCard
                    selected={type === "seller"}
                    onClick={() => setType("seller")}
                    icon={<PersonIcon />}
                    title="Vendedor"
                    desc="Cadencia automatica de vendas"
                  />
                </div>
              </div>

              {/* Name + Template */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
                    Nome da campanha
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full"
                    placeholder="Ex: Campanha Atacado Marco"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
                    Template
                  </label>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="input-field w-full"
                    placeholder="Nome do template"
                    required
                  />
                </div>
              </div>

              {/* Intervals */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
                    Intervalo min (s)
                  </label>
                  <input
                    type="number"
                    value={intervalMin}
                    onChange={(e) => setIntervalMin(Number(e.target.value))}
                    className="input-field w-full"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-2">
                    Intervalo max (s)
                  </label>
                  <input
                    type="number"
                    value={intervalMax}
                    onChange={(e) => setIntervalMax(Number(e.target.value))}
                    className="input-field w-full"
                    min={1}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {/* Tabs */}
              <div className="flex items-center gap-1 mb-5 border-b border-[#ededea]">
                <button
                  onClick={() => setLeadTab("crm")}
                  className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                    leadTab === "crm" ? "text-[#1f1f1f]" : "text-[#9ca3af] hover:text-[#5f6368]"
                  }`}
                >
                  Selecionar do CRM
                  {leadTab === "crm" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1f1f1f] rounded-full" />}
                </button>
                <button
                  onClick={() => setLeadTab("csv")}
                  className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                    leadTab === "csv" ? "text-[#1f1f1f]" : "text-[#9ca3af] hover:text-[#5f6368]"
                  }`}
                >
                  Importar CSV
                  {leadTab === "csv" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1f1f1f] rounded-full" />}
                </button>
              </div>

              {leadTab === "crm" && (
                <LeadSelector
                  selectedIds={selectedLeadIds}
                  onSelectionChange={setSelectedLeadIds}
                />
              )}

              {leadTab === "csv" && (
                <div>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#e5e5dc] rounded-xl cursor-pointer hover:border-[#c8cc8e] hover:bg-[#f6f7ed]/50 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-[13px] text-[#9ca3af] mt-2">
                      {csvFile ? csvFile.name : "Clique para selecionar um arquivo CSV"}
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvSelect}
                    />
                  </label>

                  {csvPreview && (
                    <div className="mt-4 p-4 rounded-xl bg-[#f4f4f0]">
                      <p className="text-[13px] text-[#1f1f1f]">
                        <strong className="text-green-600">{csvPreview.valid}</strong> numeros validos
                        {csvPreview.invalid > 0 && (
                          <>, <strong className="text-red-500">{csvPreview.invalid}</strong> invalidos</>
                        )}
                      </p>
                      {csvPreview.invalidNumbers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] text-[#9ca3af] mb-1">Numeros invalidos:</p>
                          <div className="flex flex-wrap gap-1">
                            {csvPreview.invalidNumbers.map((n, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[11px]">{n}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-500 text-[13px] mt-4">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#ededea] flex items-center justify-between">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="btn-secondary px-4 py-2 rounded-xl text-[13px] font-medium"
              >
                &larr; Voltar
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleClose} className="btn-secondary px-5 py-2.5 rounded-xl text-[13px] font-medium">
              Cancelar
            </button>
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="btn-primary px-5 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50"
              >
                Proximo &rarr;
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleCreate}
                disabled={creating || !canCreate}
                className="btn-primary px-5 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar Campanha"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
          active
            ? "bg-[#1f1f1f] text-white"
            : done
              ? "bg-[#c8cc8e] text-[#1f1f1f]"
              : "bg-[#ededea] text-[#9ca3af]"
        }`}
      >
        {done ? "\u2713" : label.charAt(0)}
      </div>
      <span className={`text-[12px] font-medium ${active ? "text-[#1f1f1f]" : "text-[#9ca3af]"}`}>
        {label}
      </span>
    </div>
  );
}

function TypeCard({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? "border-[#c8cc8e] bg-[#f2f3eb]"
          : "border-[#ededea] bg-white hover:border-[#e5e5dc]"
      }`}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-[14px] font-semibold text-[#1f1f1f]">{title}</p>
      <p className="text-[12px] text-[#5f6368]">{desc}</p>
    </button>
  );
}

function BotIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f1f1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <circle cx="8" cy="16" r="1" fill="#1f1f1f" />
      <circle cx="16" cy="16" r="1" fill="#1f1f1f" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f1f1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}
