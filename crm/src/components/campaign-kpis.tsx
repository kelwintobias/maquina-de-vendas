import type { Campaign } from "@/lib/types";

interface CampaignKpisProps {
  campaign: Campaign;
}

export function CampaignKpis({ campaign: c }: CampaignKpisProps) {
  const activeCadence = c.sent - (c.cadence_responded || 0) - (c.cadence_exhausted || 0) - (c.cadence_cooled || 0);
  const sentPct = c.total_leads > 0 ? Math.round((c.sent / c.total_leads) * 100) : 0;
  const respondedPct = c.sent > 0 ? Math.round(((c.cadence_responded || 0) / c.sent) * 100) : 0;
  const activePct = c.sent > 0 ? Math.round((Math.max(0, activeCadence) / c.sent) * 100) : 0;

  return (
    <div className="grid grid-cols-6 gap-4">
      <KpiCard label="Total Leads" value={c.total_leads} />
      <KpiCard label="Templates Enviados" value={c.sent} subtitle={`${sentPct}% do total`} />
      <KpiCard label="Responderam" value={c.cadence_responded || 0} valueColor="#4ade80" subtitle={`${respondedPct}% dos enviados`} />
      <KpiCard label="Em Cadencia" value={Math.max(0, activeCadence)} valueColor="#f59e0b" subtitle={`${activePct}% ativos`} />
      <KpiCard label="Esgotados" value={c.cadence_exhausted || 0} valueColor="#f87171" subtitle="bateram limite" />
      <KpiCard label="Esfriados" value={c.cadence_cooled || 0} valueColor="#888" subtitle="sem mais steps" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  valueColor,
  subtitle,
}: {
  label: string;
  value: number;
  valueColor?: string;
  subtitle?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--bg-dark)" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "#888" }}>
        {label}
      </p>
      <p
        className="text-[28px] font-bold"
        style={{ color: valueColor || "#ffffff" }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] mt-1" style={{ color: "#888" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
