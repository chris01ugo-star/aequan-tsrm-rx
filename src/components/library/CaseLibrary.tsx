"use client";

import { useState } from "react";
import { QuickGuideDialog } from "@/components/sim/QuickGuideDialog";
import { BriefingDialog } from "@/components/library/BriefingDialog";
import { DrlDialog } from "@/components/library/DrlDialog";
import type { ClinicalCase, SimMode } from "@/types/rx";

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
  onStart: (mode: SimMode) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<"modalities" | "cases">("modalities");
  const [briefing, setBriefing] = useState(false);
  const [drl, setDrl] = useState(false);
  const [guide, setGuide] = useState(false);
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
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#6BA3DE] uppercase">
            Libreria casi TSRM
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#F8FAFC] md:text-[28px]">
            {mode === "cases" ? "Radiologia tradizionale" : "Modalità del pilota"}
          </h1>
          <p className="mt-1 max-w-[576px] text-sm leading-relaxed text-[#9FB3C8]">
            Scegli la modalità, poi il caso. La richiesta RIS si apre prima dell&apos;accettazione.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-[10px] py-1 text-[11px] font-medium ${
                  filter === item.id
                    ? "bg-[#F8FAFC] text-[#1E324E]"
                    : "border border-[#2A486D] bg-[#16253B] text-[#F8FAFC]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setGuide(true)} className="text-sm font-medium text-[#9FB3C8] hover:text-[#F8FAFC]">
            ? Guida
          </button>
          <button type="button" onClick={() => setDrl(true)} className="text-sm font-medium text-[#6BA3DE] hover:text-[#F8FAFC]">
            Linee guida & DRL
          </button>
        </div>
      </header>

      {mode === "modalities" ? (
        <div className="rounded-2xl border border-[#2A486D] bg-[#16253B] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9FB3C8] uppercase">Riferimenti</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["DRL Torace PA", "Criteri ALARA", "Qualità proiettiva"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setDrl(true)}
                className="rounded-lg border border-[#2A486D] bg-[#111D30] px-[10px] py-1 text-[11px] font-medium text-[#F8FAFC]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-[#2A486D] bg-[#16253B] p-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.55)] md:p-6">
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
                <span className="absolute top-0 left-0 h-[10px] w-11 rounded-t-md bg-[#6BA3DE]" />
                <span className="absolute inset-x-0 top-[10px] bottom-0 flex flex-col rounded-tr-xl rounded-b-xl border border-[#2A486D] bg-[#111D30] p-3">
                  <span className="font-display text-lg font-bold tracking-tight text-[#F8FAFC]">
                    {item.title}
                  </span>
                  <span
                    className={`mt-auto self-end rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                      item.locked ? "bg-[#1E324E] text-[#9FB3C8]" : "bg-[#F8FAFC] text-[#1E324E]"
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
              className="mb-4 text-sm font-medium text-[#6BA3DE] hover:text-[#F8FAFC]"
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
                  <span className="absolute top-0 left-0 h-[10px] w-11 rounded-t-md bg-[#1E324E]" />
                  <span className="absolute inset-x-0 top-[10px] bottom-0 rounded-tr-xl rounded-b-xl border border-[#2A486D] bg-[#111D30] p-3">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#F8FAFC]">{item.title}</span>
                      {item.done ? (
                        <span className="text-[15px] text-[#22C55E]" aria-label="Completato">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    {!item.ready ? (
                      <span className="absolute right-3 bottom-3 rounded-lg bg-[#1E324E] px-2 py-0.5 text-[11px] font-medium text-[#F39C12]">
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
      {guide ? <QuickGuideDialog onClose={() => setGuide(false)} /> : null}
    </div>
  );
}
