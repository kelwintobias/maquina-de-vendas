"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { useRealtimeLeads } from "@/hooks/use-realtime-leads";
import { SELLER_STAGES } from "@/lib/constants";
import { LeadCard } from "@/components/lead-card";
import { KanbanMetricsBar } from "@/components/kanban-metrics-bar";
import { KanbanFilters } from "@/components/kanban-filters";
import { QuickAddLead } from "@/components/quick-add-lead";
import { ChatActive } from "@/components/chat-active";
import { LeadDetailSidebar } from "@/components/lead-detail-sidebar";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Tag } from "@/lib/types";

function DroppableColumn({
  id,
  title,
  colorClass,
  leads,
  onLeadClick,
  leadTagsMap,
}: {
  id: string;
  title: string;
  colorClass: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  leadTagsMap: Record<string, Tag[]>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalValue = leads.reduce((sum, l) => sum + (l.sale_value || 0), 0);
  const valueStr = totalValue > 0
    ? `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
    : null;

  return (
    <div className="flex-shrink-0 w-[280px]">
      <div className="px-3 py-3 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
            <h3 className="text-[14px] font-semibold text-[#1f1f1f]">{title}</h3>
          </div>
          <span className="text-[12px] font-medium text-[#5f6368] border border-[#e5e5dc] rounded-full px-2.5 py-0.5">
            {leads.length}
          </span>
        </div>
        {valueStr && (
          <p className="text-[11px] text-[#2d6a3f] font-medium mt-1 pl-4">{valueStr}</p>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`rounded-xl p-2 min-h-[calc(100vh-260px)] space-y-2.5 overflow-y-auto transition-all duration-200 ${
          isOver
            ? "border-2 border-dashed border-[#c8cc8e] bg-[#c8cc8e]/5"
            : "border-2 border-transparent"
        }`}
      >
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            onClick={onLeadClick}
            tags={leadTagsMap[lead.id]}
          />
        ))}
        <QuickAddLead stage="secretaria" sellerStage={id} humanControl />
      </div>
    </div>
  );
}

function DraggableLeadCard({
  lead,
  onClick,
  tags,
}: {
  lead: Lead;
  onClick: (lead: Lead) => void;
  tags?: Tag[];
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-30" : ""}
    >
      <LeadCard lead={lead} onClick={onClick} showAgentStage tags={tags} />
    </div>
  );
}

export default function VendasPage() {
  const { leads, loading } = useRealtimeLeads({ human_control: true });
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [activeDrag, setActiveDrag] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [leadTagsMap, setLeadTagsMap] = useState<Record<string, Tag[]>>({});
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    async function loadTags() {
      const { data: tagsData } = await supabase.from("tags").select("*");
      if (!tagsData) return;

      const { data: ltData } = await supabase.from("lead_tags").select("lead_id, tag_id");
      if (!ltData) return;

      const map: Record<string, Tag[]> = {};
      ltData.forEach((row: { lead_id: string; tag_id: string }) => {
        const tag = tagsData.find((t: Tag) => t.id === row.tag_id);
        if (tag) {
          if (!map[row.lead_id]) map[row.lead_id] = [];
          map[row.lead_id].push(tag);
        }
      });
      setLeadTagsMap(map);
    }
    loadTags();
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(event.active.data.current as Lead);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const lead = active.data.current as Lead;
    const newStage = over.id as string;

    if (lead.seller_stage === newStage) return;

    await supabase
      .from("leads")
      .update({ seller_stage: newStage })
      .eq("id", lead.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#c8cc8e] border-t-transparent rounded-full animate-spin" />
          <span className="text-[14px] text-[#5f6368]">Carregando...</span>
        </div>
      </div>
    );
  }

  const filteredLeads = leads.filter((l) => {
    if (showActive && (l.seller_stage === "perdido" || l.seller_stage === "fechado")) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        (l.name || "").toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q) ||
        (l.nome_fantasia || "").toLowerCase().includes(q) ||
        l.phone.includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[28px] font-bold text-[#1f1f1f]">Vendas</h1>
        <p className="text-[14px] text-[#5f6368] mt-1">Pipeline de vendas</p>
      </div>

      <KanbanMetricsBar leads={filteredLeads} />
      <KanbanFilters
        search={search}
        onSearchChange={setSearch}
        showActive={showActive}
        onToggleActive={() => setShowActive(!showActive)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-4">
          {SELLER_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(
              (l) => l.seller_stage === stage.key
            );
            return (
              <DroppableColumn
                key={stage.key}
                id={stage.key}
                title={stage.label}
                colorClass={stage.color}
                leads={stageLeads}
                onLeadClick={setChatLead}
                leadTagsMap={leadTagsMap}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeDrag ? (
            <div className="w-[280px] opacity-90 rotate-[2deg] shadow-xl">
              <LeadCard lead={activeDrag} onClick={() => {}} showAgentStage />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {chatLead && !detailLead && (
        <ChatActive
          lead={chatLead}
          onClose={() => setChatLead(null)}
          onOpenDetails={() => setDetailLead(chatLead)}
        />
      )}

      {detailLead && (
        <LeadDetailSidebar
          lead={detailLead}
          onClose={() => setDetailLead(null)}
        />
      )}
    </div>
  );
}
