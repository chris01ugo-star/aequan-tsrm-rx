"use client";

import { useState } from "react";
import { BriefingDialog } from "@/components/library/BriefingDialog";
import { DrlDialog } from "@/components/library/DrlDialog";
import type { ClinicalCase } from "@/types/rx";

type Filter = "all" | "todo" | "active" | "done";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "todo", label: "Da svolgere" },
  { id: "active", label: "In corso" },
  { id: "done", label: "Completati" },
];

const MODALITIES = [
  { id: "rx", title: "Radiologia Tradizionale (RX)", badge: "Pilota Livello 1 · 3 casi", locked: false },
  { id: "ct", title: "TC & Neuroradiologia", badge: "Bloccato", locked: true },
  { id: "mr", title: "Risonanza Magnetica (RM)", badge: "Bloccato", locked: true },
  { id: "mg", title: "Senologia & Radioprotezione", badge: "Bloccato", locked: true },
];

export function CaseLibrary({
  clinical,
  query,
  completed,
  inProgress,
  onStart,
}: {
  clinical: ClinicalCase;
  query: string;
  completed: boolean;
  inProgress: boolean;
  onStart: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<"modalities" | "cases">("modalities");
  const [briefing, setBriefing] = useState(false);
  const [drl, setDrl] = useState(false);
  const needle = query.trim().toLowerCase();

  const cases = [
    {
      id: "RX-01",
      title: "Caso 01 — Torace PA (Sospetta polmonite lobare dx)",
      ready: true,
      done: completed,
      active: inProgress && !completed,
    },
    {
      id: "RX-02",
      title: "Caso 02 — Ginocchio AP/LL (Trauma distorsivo)",
      ready: false,
      done: false,
      active: false,
    },
    {
      id: "RX-03",
      title: "Caso 03 — Addome diretto (Sospetta occlusione)",
      ready: false,
      done: false,
      active: false,
    },
  ].filter((item) => {
    if (needle && !item.title.toLowerCase().includes(needle)) return false;
    if (filter === "done") return item.done;
    if (filter === "active") return item.active;
    if (filter === "todo") return item.ready && !item.done && !item.active;
    return true;
  });

  const showRx =
    filter === "all" ||
    (filter === "done" && completed) ||
    (filter === "active" && inProgress && !completed) ||
    (filter === "todo" && !completed && !(inProgress && !completed));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#1d4f91] uppercase">
            Scenari clinici
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#16304f] md:text-[28px]">
            {mode === "cases" ? "Radiologia tradizionale" : "Scegli la modalità"}
          </h1>
          <p className="mt-1 max-w-[576px] text-sm leading-relaxed text-slate-500">
            Scegli la modalità, poi il caso. Il briefing clinico si apre prima della sala: i parametri
            tecnici restano da calibrare.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  filter === item.id
                    ? "bg-[#1e3a5f] text-white"
                    : "border border-slate-200 bg-white text-slate-500"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setDrl(true)} className="text-sm font-semibold text-[#1d4f91] hover:text-[#16304f]">
          Linee guida & DRL
        </button>
      </header>

      {mode === "modalities" ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">Riferimenti</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["DRL Torace PA", "Criteri ALARA", "Qualità proiettiva"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setDrl(true)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-[#1e3a5f]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        {mode === "modalities" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MODALITIES.filter((item) => {
              if (needle && !item.title.toLowerCase().includes(needle) && item.id !== "rx") return false;
              if (item.locked) return filter === "all" && (!needle || item.title.toLowerCase().includes(needle));
              return showRx && (!needle || item.title.toLowerCase().includes(needle) || "rx".includes(needle));
            }).map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.locked}
                onClick={() => setMode("cases")}
                className="relative h-36 text-left disabled:cursor-not-allowed"
              >
                <span className="absolute top-0 left-0 h-[10px] w-11 rounded-t-md bg-[#93c5fd]" />
                <span className="absolute inset-x-0 top-[10px] bottom-0 flex flex-col rounded-tr-2xl rounded-b-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="font-display text-lg font-bold tracking-tight text-[#16304f]">
                    {item.title}
                  </span>
                  <span
                    className={`mt-auto self-end rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                      item.locked ? "bg-slate-200 text-slate-500" : "bg-[#1e3a5f] text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMode("modalities")}
              className="mb-4 text-sm font-semibold text-[#1d4f91]"
            >
              ← Tutte le modalità
            </button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.ready}
                  onClick={() => item.ready && setBriefing(true)}
                  className="relative h-[116px] text-left disabled:cursor-not-allowed"
                >
                  <span className="absolute top-0 left-0 h-[10px] w-11 rounded-t-md bg-[#1e3a5f]" />
                  <span className="absolute inset-x-0 top-[10px] bottom-0 rounded-tr-2xl rounded-b-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#16304f]">{item.title}</span>
                      {item.done ? (
                        <span className="text-[15px] text-[#22C55E]" aria-label="Completato">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    {!item.ready ? (
                      <span className="absolute right-3 bottom-3 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        In preparazione
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      {briefing ? (
        <BriefingDialog clinical={clinical} onClose={() => setBriefing(false)} onStart={onStart} />
      ) : null}
      {drl ? <DrlDialog onClose={() => setDrl(false)} /> : null}
    </div>
  );
}
