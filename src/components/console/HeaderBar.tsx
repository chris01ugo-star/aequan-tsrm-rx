"use client";

import type { ClinicalCase } from "@/types/rx";

type HeaderBarProps = {
  cases: ClinicalCase[];
  caseId: string;
  onCaseChange: (id: string) => void;
  onOpenSheet: () => void;
  acquiring: boolean;
  hasImage: boolean;
  sessionId: string;
};

export function HeaderBar({
  cases,
  caseId,
  onCaseChange,
  onOpenSheet,
  acquiring,
  hasImage,
  sessionId,
}: HeaderBarProps) {
  const status = acquiring
    ? "ESPOSIZIONE"
    : hasImage
      ? "IMMAGINE IN MEMORIA"
      : "PRONTO";

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
      <div className="flex shrink-0 items-baseline gap-2">
        <span className="text-[13px] tracking-[0.18em] text-ice">AEQUAN</span>
        <span className="text-[11px] text-cyan-clin">{"//"}</span>
        <span className="text-[11px] tracking-[0.16em] text-muted">
          TSRM RX CONSOLE
        </span>
      </div>
      <span className="hidden shrink-0 border border-[#5A4630] px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-[#C4A06A] xl:inline">
        SOLO USO DIDATTICO — NON DISPOSITIVO MEDICO
      </span>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Caso attivo</span>
        <select
          className="rx-select h-7 w-full truncate px-2 font-mono text-[11px] tracking-wide"
          value={caseId}
          onChange={(event) => onCaseChange(event.target.value)}
        >
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.selectLabel}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onOpenSheet}
        className="h-7 shrink-0 border border-line bg-raised px-2 text-[10px] tracking-[0.14em] text-ice hover:border-cyan-clin hover:text-cyan-clin"
      >
        SCHEDA CLINICA
      </button>
      <div className="hidden shrink-0 items-center gap-3 lg:flex">
        <span className="text-[10px] tracking-[0.14em] text-muted">
          STATO{" "}
          <span className={acquiring ? "text-amber-rx" : "text-cyan-clin"}>
            {status}
          </span>
        </span>
        <span className="font-mono text-[11px] tabular-nums tracking-wide text-ice">
          ID: {sessionId}
        </span>
      </div>
    </header>
  );
}
