"use client";

interface KanbanFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  showActive: boolean;
  onToggleActive: () => void;
}

export function KanbanFilters({ search, onSearchChange, showActive, onToggleActive }: KanbanFiltersProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar por nome, empresa ou telefone..."
        className="input-field text-[13px] rounded-xl px-4 py-2 w-80"
      />
      <button
        onClick={onToggleActive}
        className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
          showActive
            ? "bg-[#1f1f1f] text-white"
            : "bg-[#f6f7ed] text-[#5f6368] border border-[#e5e5dc] hover:bg-[#e5e5dc]"
        }`}
      >
        Leads ativos
      </button>
    </div>
  );
}
