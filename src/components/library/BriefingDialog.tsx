"use client";

import { useState } from "react";
import { RisSummary } from "@/components/library/RisSummary";
import { primaryBtn, ghostBtn } from "@/components/ui/buttons";
import type { ClinicalCase } from "@/types/rx";

const GATES = [
  "Verifica identità e quesito clinico",
  "Rimozione oggetti metallici radiopachi dal torace",
  "Verifica condizioni cliniche e radioprotezione",
];

export function BriefingDialog({
  clinical,
  onClose,
  onStart,
  readOnly = false,
}: {
  clinical: ClinicalCase;
  onClose: () => void;
  onStart?: () => void;
  readOnly?: boolean;
}) {
  const [checks, setChecks] = useState([false, false, false]);
  const ready = checks.every(Boolean);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B1320]/75 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="briefing-title"
        className="max-h-[calc(100dvh-32px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A486D] bg-[#16253B] rx-scroll"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#2A486D] px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#6BA3DE]">RICHIESTA RIS · {clinical.id}</p>
            <h2 id="briefing-title" className="font-display text-lg font-bold tracking-tight">
              Caso 01 — Torace, sospetta polmonite lobare dx
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Chiudi
          </button>
        </header>
        <div className="space-y-4 px-5 py-4 text-sm leading-relaxed">
          <RisSummary clinical={clinical} />
          <p>{clinical.history}</p>
          <p>{clinical.question}</p>
          {readOnly ? null : (
            <fieldset className="rounded-xl border border-[#2A486D] bg-[#111D30] p-3">
              <legend className="px-1 text-[11px] font-semibold tracking-[0.12em] text-[#9FB3C8] uppercase">
                Safety Gate pre-esame
              </legend>
              <ul className="mt-2 space-y-2">
                {GATES.map((label, index) => (
                  <li key={label}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 accent-[#6BA3DE]"
                        checked={checks[index]}
                        onChange={() =>
                          setChecks((current) => current.map((value, i) => (i === index ? !value : value)))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!ready}
                onClick={onStart}
                className={`${primaryBtn} mt-4 w-full`}
              >
                Avvia simulazione RX →
              </button>
            </fieldset>
          )}
        </div>
      </section>
    </div>
  );
}
