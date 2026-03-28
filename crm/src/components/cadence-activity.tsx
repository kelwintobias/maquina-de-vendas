"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ActivityItem {
  id: string;
  type: "sent" | "responded" | "exhausted" | "cooled";
  leadName: string;
  detail: string;
  timestamp: string;
}

interface CadenceActivityProps {
  campaignId: string;
}

export function CadenceActivity({ campaignId }: CadenceActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchActivity = useCallback(async () => {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, content, created_at, sent_by, leads!inner(name, phone, campaign_id)")
      .eq("sent_by", "cadence")
      .eq("leads.campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: states } = await supabase
      .from("cadence_state")
      .select("id, status, created_at, responded_at, leads(name, phone)")
      .eq("campaign_id", campaignId)
      .in("status", ["responded", "exhausted", "cooled"])
      .order("created_at", { ascending: false })
      .limit(50);

    const items: ActivityItem[] = [];

    if (messages) {
      for (const msg of messages) {
        const lead = msg.leads as unknown as { name: string | null; phone: string };
        items.push({
          id: `msg-${msg.id}`,
          type: "sent",
          leadName: lead?.name || lead?.phone || "Lead",
          detail: msg.content.substring(0, 80) + (msg.content.length > 80 ? "..." : ""),
          timestamp: msg.created_at,
        });
      }
    }

    if (states) {
      for (const state of states) {
        const lead = state.leads as unknown as { name: string | null; phone: string } | null;
        const name = lead?.name || lead?.phone || "Lead";
        const ts = state.status === "responded" && state.responded_at ? state.responded_at : state.created_at;

        items.push({
          id: `state-${state.id}`,
          type: state.status as "responded" | "exhausted" | "cooled",
          leadName: name,
          detail:
            state.status === "responded"
              ? "respondeu a cadencia"
              : state.status === "exhausted"
                ? "esgotou limite de mensagens"
                : "sem mais steps disponiveis",
          timestamp: ts,
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(items.slice(0, 50));
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const typeIcons: Record<string, { color: string }> = {
    sent: { color: "#1f1f1f" },
    responded: { color: "#4ade80" },
    exhausted: { color: "#f87171" },
    cooled: { color: "#9ca3af" },
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="w-4 h-4 border-2 border-[#c8cc8e] border-t-transparent rounded-full animate-spin" />
        <span className="text-[13px] text-[#5f6368]">Carregando atividade...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[13px] text-[#9ca3af]">Nenhuma atividade registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="space-y-0">
        {activities.map((item, idx) => {
          const icon = typeIcons[item.type];
          const isLast = idx === activities.length - 1;

          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: icon.color }}
                />
                {!isLast && <div className="w-px flex-1 bg-[#ededea]" />}
              </div>

              <div className="pb-4">
                <p className="text-[13px] text-[#1f1f1f]">
                  <strong>{item.leadName}</strong>{" "}
                  <span className="text-[#5f6368]">{item.detail}</span>
                </p>
                <p className="text-[11px] text-[#9ca3af] mt-0.5">
                  {new Date(item.timestamp).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
