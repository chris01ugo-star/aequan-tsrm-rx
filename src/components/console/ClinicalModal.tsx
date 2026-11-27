"use client";

import type { ClinicalCase } from "@/types/rx";

type ClinicalModalProps = {
  clinical: ClinicalCase;
  onClose: () => void;
};

export function ClinicalModal({ clinical, onClose }: ClinicalModalProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090C10]/80 p-6">
      <button
        type="button"
        aria-label="Chiudi scheda clinica"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinical-sheet-title"
        className="relative z-10 max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto border border-line bg-panel rx-scroll"
      >
        <header className="flex items-center justify-between border-b border-line bg-raised px-4 py-2">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-cyan-clin">
              RICHIESTA RIS · {clinical.id}
            </div>
            <h2 id="clinical-sheet-title" className="text-[15px] tracking-wide text-ice">
              {clinical.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 border border-line bg-panel px-2 text-[10px] tracking-[0.14em] text-ice hover:border-cyan-clin hover:text-cyan-clin"
          >
            CHIUDI
          </button>
        </header>
        <div className="grid grid-cols-[180px_1fr] border-b border-line font-mono text-[12px]">
          <Field k="ID paziente" v={clinical.pseudoId} />
          <Field
            k="Habitus"
            v={`${clinical.ageYears} anni · ${clinical.sex} · ${clinical.weightKg} kg · ${clinical.heightCm} cm`}
          />
          <Field k="Mobilità" v={clinical.mobility} />
          <Field k="Quesito" v={clinical.indication} />
        </div>
        <div className="space-y-4 bg-panel px-4 py-3 text-[13px] leading-relaxed text-ice select-text">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#E6C15A]">
            RICHIESTA SIMULATA · NESSUN DATO REALE · NON È UN REFERTO
          </p>
          <Block title="Anamnesi">{clinical.history}</Block>
          <Block title="Collaborazione">{clinical.mobility}</Block>
          <Block title="Quesito diagnostico">{clinical.question}</Block>
        </div>
      </section>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <>
      <div className="border-t border-line bg-raised px-4 py-1.5 text-[10px] tracking-[0.12em] text-muted">
        {k}
      </div>
      <div className="border-t border-line bg-panel px-3 py-1.5 text-ice">{v}</div>
    </>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <h3 className="mb-1 text-[10px] tracking-[0.16em] text-muted">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
