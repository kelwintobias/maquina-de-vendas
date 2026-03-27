import type { Lead } from "@/lib/types";

interface KanbanMetricsBarProps {
  leads: Lead[];
}

export function KanbanMetricsBar({ leads }: KanbanMetricsBarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const totalValue = leads.reduce((sum, l) => sum + (l.sale_value || 0), 0);
  const leadsToday = leads.filter((l) => new Date(l.created_at) >= today).length;
  const leadsYesterday = leads.filter((l) => {
    const d = new Date(l.created_at);
    return d >= yesterday && d < today;
  }).length;
  const potentialValue = leads
    .filter((l) => l.seller_stage !== "perdido" && l.seller_stage !== "fechado")
    .reduce((sum, l) => sum + (l.sale_value || 0), 0);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div className="flex items-center gap-6 px-4 py-3 mb-4 rounded-xl bg-white border border-[#e5e5dc]">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#9ca3af] uppercase tracking-wider">Total</span>
        <span className="text-[14px] font-bold text-[#1f1f1f]">{leads.length} leads</span>
        <span className="text-[13px] font-medium text-[#5f6368]">{fmt(totalValue)}</span>
      </div>
      <div className="w-px h-5 bg-[#e5e5dc]" />
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#9ca3af] uppercase tracking-wider">Novo hoje / ontem</span>
        <span className="text-[14px] font-bold text-[#1f1f1f]">{leadsToday} / {leadsYesterday}</span>
      </div>
      <div className="w-px h-5 bg-[#e5e5dc]" />
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#9ca3af] uppercase tracking-wider">Vendas em potencial</span>
        <span className="text-[14px] font-bold text-[#2d6a3f]">{fmt(potentialValue)}</span>
      </div>
    </div>
  );
}
