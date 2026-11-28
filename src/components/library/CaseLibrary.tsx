"use client";

import { ArrowRight, BookMarked, Check, Lock } from "lucide-react";
import { useState } from "react";
import { BriefingDialog } from "@/components/library/BriefingDialog";
import { DrlDialog } from "@/components/library/DrlDialog";
import { card, secondaryBtn } from "@/components/ui/buttons";
import type { ClinicalCase, SimMode } from "@/types/rx";

type Filter = "all" | "todo" | "done";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "todo", label: "Da svolgere" },
  { id: "done", label: "Completati" },
];

const OTHER_MODALITIES = ["Tomografia computerizzata (TC)", "Risonanza magnetica (RM)", "Senologia e radioprotezione"];

export function CaseLibrary({
  clinical,
  completed,
  inProgress,
  onStart,
}: {
  clinical: ClinicalCase;
  query?: string;
  completed: boolean;
  inProgress: boolean;
  onStart: (mode: SimMode) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [briefing, setBriefing] = useState(false);
  const [drl, setDrl] = useState(false);

  const cases = [
    { id: "RX-01", title: "Caso 01 — Torace PA", detail: "Sospetta polmonite lobare destra", ready: true, done: completed },
    { id: "RX-02", title: "Caso 02 — Ginocchio AP/LL", detail: "Trauma distorsivo", ready: false, done: false },
    { id: "RX-03", title: "Caso 03 — Addome diretto", detail: "Sospetta occlusione intestinale", ready: false, done: false },
  ].filter((item) => (filter === "done" ? item.done : filter === "todo" ? !item.done : true));

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[30px] font-semibold text-[#1f2b3b]">Scenari clinici</h1>
          <p className="mt-1 max-w-xl text-[15px] text-slate-500">
            Radiologia tradizionale. Leggi la richiesta clinica, completa le verifiche di sicurezza ed esegui l’esame in sala simulata.
          </p>
        </div>
        <button type="button" onClick={() => setDrl(true)} className={secondaryBtn}>
          <BookMarked size={16} />
          Linee guida e DRL
        </button>
      </header>

      <div className="flex gap-1 border-b border-[#e7eaef]">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] ${
              filter === item.id ? "border-[#2d4f7a] font-medium text-[#2d4f7a]" : "border-transparent text-slate-500 hover:text-[#2d4f7a]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {cases.length === 0 ? (
        <p className={`${card} px-6 py-10 text-center text-sm text-slate-500`}>Nessun caso in questa categoria.</p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((item) => (
            <li key={item.id} className={`${card} flex flex-col p-5`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium tracking-wide text-slate-500">{item.id} · RX</span>
                {item.done ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                    <Check size={13} /> Completato
                  </span>
                ) : item.ready && inProgress ? (
                  <span className="rounded-md bg-[#edf1f6] px-2 py-0.5 text-[12px] font-medium text-[#2d4f7a]">In corso</span>
                ) : !item.ready ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[12px] text-slate-500">
                    <Lock size={12} /> In preparazione
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 font-display text-[20px] font-semibold text-[#1f2b3b]">{item.title}</h2>
              <p className="mt-1 font-display text-[15px] text-slate-500 italic">{item.detail}</p>
              <button
                type="button"
                disabled={!item.ready}
                onClick={() => setBriefing(true)}
                className="mt-6 inline-flex items-center gap-2 self-start text-[14px] font-medium text-[#2d4f7a] disabled:text-slate-400"
              >
                {item.ready ? "Apri richiesta clinica" : "Non ancora disponibile"}
                {item.ready ? <ArrowRight size={15} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className={`${card} p-5`}>
        <h2 className="font-display text-[17px] font-semibold">Altre modalità</h2>
        <p className="mt-1 text-sm text-slate-500">Disponibili nei prossimi livelli del percorso.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {OTHER_MODALITIES.map((label) => (
            <li key={label} className="inline-flex items-center gap-1.5 rounded-md border border-[#e7eaef] px-3 py-1.5 text-[13px] text-slate-500">
              <Lock size={12} />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {briefing ? <BriefingDialog clinical={clinical} onClose={() => setBriefing(false)} onStart={onStart} /> : null}
      {drl ? <DrlDialog onClose={() => setDrl(false)} /> : null}
    </div>
  );
}
