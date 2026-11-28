"use client";

import { useState } from "react";
import { RisSummary } from "@/components/library/RisSummary";
import { primaryBtn, ghostBtn } from "@/components/ui/buttons";
import type { ClinicalCase, SimMode } from "@/types/rx";

export function BriefingDialog({
  clinical,
  onClose,
  onStart,
  readOnly = false,
}: {
  clinical: ClinicalCase;
  onClose: () => void;
  onStart?: (mode: SimMode) => void;
  readOnly?: boolean;
}) {
  const [mode, setMode] = useState<SimMode>("guided");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1f2b3b]/40 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="briefing-title"
        className="max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#e7eaef] bg-white rx-scroll"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#e7eaef] px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#2d4f7a]">ACCETTAZIONE RIS · {clinical.id}</p>
            <h2 id="briefing-title" className="font-display text-lg font-bold tracking-tight">
              Quesito di accesso alla stazione
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Chiudi
          </button>
        </header>
        <div className="space-y-4 px-5 py-4 text-sm leading-relaxed">
          <RisSummary clinical={clinical} />
          <p>{clinical.history}</p>
          <p className="text-slate-500">{clinical.question}</p>
          {readOnly ? null : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <ModeCard
                  on={mode === "guided"}
                  title="Modalità Guidata"
                  text="Tirocinio 1° anno. Obiettivi in ogni stazione, fantoccio semitrasparente, cronometro libero."
                  onClick={() => setMode("guided")}
                />
                <ModeCard
                  on={mode === "exam"}
                  title="Modalità Esame a Stazioni"
                  text="10:00, nessun aiuto, fantoccio opaco. Gli errori critici dell'Item A non si recuperano."
                  onClick={() => setMode("exam")}
                />
              </div>
              <button type="button" onClick={() => onStart?.(mode)} className={`${primaryBtn} w-full`}>
                Entra in Accettazione (Stazione 1) →
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ModeCard({
  on,
  title,
  text,
  onClick,
}: {
  on: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left ${
        on ? "border-[#F8FAFC] bg-[#2d4f7a] text-white" : "border-[#e7eaef] bg-[#f4f6f9] text-[#1f2b3b]"
      }`}
    >
      <span className="block font-display text-sm font-bold">{title}</span>
      <span className={`mt-1 block text-[12px] leading-snug ${on ? "text-[#2d4f7a]" : "text-slate-500"}`}>{text}</span>
    </button>
  );
}
