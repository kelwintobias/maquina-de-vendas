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

  const withResponse = leads.filter((l) => l.first_response_at);
  const avgResponseMs =
    withResponse.length > 0
      ? withResponse.reduce(
          (sum, l) =>
            sum + (new Date(l.first_response_at!).getTime() - new Date(l.created_at).getTime()),
          0
        ) / withResponse.length
      : 0;
  const avgResponseMin = Math.round(avgResponseMs / 60000);
  const responseStr = avgResponseMin > 0 ? `${avgResponseMin}m` : "\u2014";

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const pipelinePct = totalValue > 0 ? Math.round((potentialValue / totalValue) * 100) : 0;

  return (
    <div className="flex gap-3.5 mb-5">
      {/* Total */}
      <div className="flex-1 min-w-0 bg-[#1f1f1f] rounded-xl px-4 py-3.5">
        <p className="text-[10px] text-[#9ca3af] uppercase font-semibold tracking-wider">
          Total no funil
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[24px] font-bold text-white leading-none">
            {leads.length}
          </span>
          <span className="text-[12px] text-[#9ca3af]">leads</span>
        </div>
        <p className="text-[11px] text-[#c8cc8e] mt-1.5">{fmt(totalValue)} em pipeline</p>
      </div>

      {/* Novos */}
      <div className="flex-1 min-w-0 bg-[#1f1f1f] rounded-xl px-4 py-3.5">
        <p className="text-[10px] text-[#9ca3af] uppercase font-semibold tracking-wider">
          Novos hoje / ontem
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[24px] font-bold text-white leading-none">
            {leadsToday}
          </span>
          <span className="text-[12px] text-[#9ca3af]">/ {leadsYesterday}</span>
        </div>
        {leadsToday > leadsYesterday && (
          <p className="text-[11px] text-[#5aad65] mt-1.5">↑ crescendo</p>
        )}
        {leadsToday <= leadsYesterday && leadsToday > 0 && (
          <p className="text-[11px] text-[#9ca3af] mt-1.5">→ estavel</p>
        )}
        {leadsToday === 0 && (
          <p className="text-[11px] text-[#9ca3af] mt-1.5">nenhum hoje</p>
        )}
      </div>

      {/* Vendas em potencial */}
      <div className="flex-1 min-w-0 bg-[#1f1f1f] rounded-xl px-4 py-3.5">
        <p className="text-[10px] text-[#9ca3af] uppercase font-semibold tracking-wider">
          Vendas em potencial
        </p>
        <div className="mt-1">
          <span className="text-[24px] font-bold text-[#5aad65] leading-none">
            {fmt(potentialValue)}
          </span>
        </div>
        <div className="mt-2 h-[3px] bg-[#333] rounded-full">
          <div
            className="h-full bg-[#5aad65] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pipelinePct, 100)}%` }}
          />
        </div>
      </div>

      {/* Tempo medio */}
      <div className="flex-1 min-w-0 bg-[#1f1f1f] rounded-xl px-4 py-3.5">
        <p className="text-[10px] text-[#9ca3af] uppercase font-semibold tracking-wider">
          Tempo medio resp.
        </p>
        <div className="mt-1">
          <span className="text-[24px] font-bold text-white leading-none">
            {responseStr}
          </span>
        </div>
        <p className="text-[11px] text-[#c8cc8e] mt-1.5">agente IA</p>
      </div>
    </div>
  );
}
