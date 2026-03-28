"use client";

import { useState, useEffect, useCallback } from "react";
import type { CadenceStep, Campaign } from "@/lib/types";
import { AGENT_STAGES } from "@/lib/constants";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

interface CadenceStepsModalProps {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
}

export function CadenceStepsModal({ campaign, open, onClose }: CadenceStepsModalProps) {
  const [steps, setSteps] = useState<CadenceStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const [intervalHours, setIntervalHours] = useState(campaign.cadence_interval_hours || 24);
  const [startHour, setStartHour] = useState(campaign.cadence_send_start_hour || 7);
  const [endHour, setEndHour] = useState(campaign.cadence_send_end_hour || 18);
  const [cooldownHours, setCooldownHours] = useState(campaign.cadence_cooldown_hours || 48);
  const [maxMessages, setMaxMessages] = useState(campaign.cadence_max_messages || 8);

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}/cadence`);
    if (res.ok) {
      const data = await res.json();
      setSteps(data.steps || []);
    }
    setLoading(false);
  }, [campaign.id]);

  useEffect(() => {
    if (open) fetchSteps();
  }, [open, fetchSteps]);

  const stages = AGENT_STAGES.filter((s) => s.key !== "secretaria");

  function getStageSteps(stage: string) {
    return steps
      .filter((s) => s.stage === stage)
      .sort((a, b) => a.step_order - b.step_order);
  }

  function updateStepText(stepId: string, text: string) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, message_text: text } : s)));
  }

  function addStep(stage: string) {
    const stageSteps = getStageSteps(stage);
    const newStep: CadenceStep = {
      id: `new-${Date.now()}`,
      campaign_id: campaign.id,
      stage,
      step_order: stageSteps.length + 1,
      message_text: "",
      created_at: new Date().toISOString(),
    };
    setSteps((prev) => [...prev, newStep]);
  }

  function removeStep(stepId: string) {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }

  async function handleSave() {
    setSaving(true);

    for (const stage of stages) {
      const stageSteps = getStageSteps(stage.key);
      for (let i = 0; i < stageSteps.length; i++) {
        const step = stageSteps[i];
        const body = {
          stage: step.stage,
          step_order: i + 1,
          message_text: step.message_text,
        };

        if (step.id.startsWith("new-")) {
          await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}/cadence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}/cadence/${step.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      }
    }

    await fetch(`${FASTAPI_URL}/api/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cadence_interval_hours: intervalHours,
        cadence_send_start_hour: startHour,
        cadence_send_end_hour: endHour,
        cadence_cooldown_hours: cooldownHours,
        cadence_max_messages: maxMessages,
      }),
    });

    setSaving(false);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#ededea] flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#1f1f1f]">Configurar Cadencia</h2>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#1f1f1f] transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-4 h-4 border-2 border-[#c8cc8e] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-[#5f6368]">Carregando...</span>
            </div>
          ) : (
            <>
              {stages.map((stage) => {
                const stageSteps = getStageSteps(stage.key);
                const isExpanded = expandedStage === stage.key;

                return (
                  <div key={stage.key} className="mb-4">
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#f4f4f0] hover:bg-[#e5e5dc] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: stage.dotColor }} />
                        <span className="text-[14px] font-medium text-[#1f1f1f]">{stage.label}</span>
                        <span className="text-[12px] text-[#9ca3af]">({stageSteps.length} steps)</span>
                      </div>
                      <svg
                        width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="4 6 8 10 12 6" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 pl-4 space-y-3">
                        {stageSteps.map((step, idx) => (
                          <div key={step.id} className="flex gap-3 items-start">
                            <span className="text-[12px] font-medium text-[#9ca3af] mt-2.5 w-6 shrink-0">
                              #{idx + 1}
                            </span>
                            <textarea
                              value={step.message_text}
                              onChange={(e) => updateStepText(step.id, e.target.value)}
                              className="input-field flex-1 text-[13px] min-h-[60px] resize-y"
                              placeholder="Texto da mensagem..."
                            />
                            <button
                              onClick={() => removeStep(step.id)}
                              className="mt-2 text-[#f87171] hover:text-[#dc2626] transition-colors shrink-0"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="4" y1="4" x2="12" y2="12" />
                                <line x1="12" y1="4" x2="4" y2="12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addStep(stage.key)}
                          className="text-[12px] font-medium text-[#5f6368] hover:text-[#1f1f1f] transition-colors flex items-center gap-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="7" y1="3" x2="7" y2="11" />
                            <line x1="3" y1="7" x2="11" y2="7" />
                          </svg>
                          Adicionar step
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-6 pt-6 border-t border-[#ededea]">
                <h3 className="text-[14px] font-semibold text-[#1f1f1f] mb-4">Configuracao Geral</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-1.5">
                      Intervalo entre msgs (horas)
                    </label>
                    <input
                      type="number"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(Number(e.target.value))}
                      className="input-field w-full text-[13px]"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-1.5">
                      Max mensagens por lead
                    </label>
                    <input
                      type="number"
                      value={maxMessages}
                      onChange={(e) => setMaxMessages(Number(e.target.value))}
                      className="input-field w-full text-[13px]"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-1.5">
                      Janela de envio (inicio)
                    </label>
                    <input
                      type="number"
                      value={startHour}
                      onChange={(e) => setStartHour(Number(e.target.value))}
                      className="input-field w-full text-[13px]"
                      min={0}
                      max={23}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-1.5">
                      Janela de envio (fim)
                    </label>
                    <input
                      type="number"
                      value={endHour}
                      onChange={(e) => setEndHour(Number(e.target.value))}
                      className="input-field w-full text-[13px]"
                      min={0}
                      max={23}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#5f6368] mb-1.5">
                      Cooldown apos resposta (horas)
                    </label>
                    <input
                      type="number"
                      value={cooldownHours}
                      onChange={(e) => setCooldownHours(Number(e.target.value))}
                      className="input-field w-full text-[13px]"
                      min={1}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#ededea] flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary px-5 py-2.5 rounded-xl text-[13px] font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
