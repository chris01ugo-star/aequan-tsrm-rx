"use client";

import { Bookmark, Check, Play, RotateCcw } from "lucide-react";
import { GeometryPanel } from "@/components/console/GeometryPanel";
import { ParameterPanel } from "@/components/console/ParameterPanel";
import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { exposeBtn, secondaryBtn } from "@/components/ui/buttons";
import { formatNum } from "@/lib/number";
import { sameTechnique } from "@/lib/rxPhysics";
import type { Analysis, ClinicalCase, ExposureShot, GrayWindow, Technique } from "@/types/rx";

const MAX_SHOTS = 3;

const FLOW = ["Briefing", "Console", "Acquisizione", "Review", "Debriefing"];

export function SimulationScreen({
  clinical,
  technique,
  analysis,
  shots,
  selectedIndex,
  acquiring,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  cumulativeDap,
  onTechnique,
  onSelectShot,
  onGray,
  onView,
  onResetView,
  onResetTechnique,
  onBriefing,
  onExpose,
  onReview,
}: {
  clinical: ClinicalCase;
  technique: Technique;
  analysis: Analysis;
  shots: ExposureShot[];
  selectedIndex: number;
  acquiring: boolean;
  elapsedSec: number;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  cumulativeDap: number;
  onTechnique: (patch: Partial<Technique>) => void;
  onSelectShot: (index: number) => void;
  onGray: (patch: Partial<GrayWindow>) => void;
  onView: (patch: {
    zoom?: number;
    panX?: number;
    panY?: number;
    overlay?: boolean;
    tool?: ViewerTool;
  }) => void;
  onResetView: () => void;
  onResetTechnique: () => void;
  onBriefing: () => void;
  onExpose: () => void;
  onReview: () => void;
}) {
  const shot = shots[selectedIndex] ?? null;
  const latest = shots[shots.length - 1] ?? null;
  const dirty = Boolean(latest && shot === latest && !sameTechnique(latest.technique, technique));
  const atLimit = shots.length >= MAX_SHOTS;
  const flowIndex = shots.length === 0 ? 1 : 2;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5">
      <ol className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white px-3 py-3 shadow-sm sm:px-5">
        <Phase n="1" label="Briefing" state="done" />
        <span className="h-px w-6 shrink-0 bg-slate-200 sm:w-10" />
        <Phase n="2" label="Acquisizione" state="current" />
        <span className="h-px w-6 shrink-0 bg-slate-200 sm:w-10" />
        <Phase n="3" label="Review" state={shots.length ? "todo" : "todo"} />
        <span className="hidden h-px w-10 shrink-0 bg-slate-200 md:block" />
        <Phase n="4" label="Debriefing / Valutazione" state="todo" />
      </ol>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#16304f] sm:text-[28px]">
              Caso 01 — {clinical.title}
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              Simulazione
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-[#1e3a5f]">
              RX
            </span>
          </div>
          <p className="mt-1 text-sm italic text-slate-500">{clinical.indication}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onBriefing} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#1e3a5f]" aria-label="Apri briefing">
            <Bookmark size={16} />
          </button>
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            <span className="font-medium text-[#1e3a5f]">
              {technique.projection === "LL" ? "Laterale" : technique.projection} ·{" "}
              {technique.decubitus === "ORTOSTATISMO" ? "Ortostatismo" : "Supino"}
            </span>
            <span>
              {shot ? `Scatto ${shot.index}` : "Pre-esposizione"} · {clinical.pseudoId}
            </span>
          </div>
          <div className="min-h-[320px] sm:min-h-[460px]">
            <ViewerPanel
              clinical={clinical}
              technique={technique}
              analysis={analysis}
              shot={shot}
              dirty={dirty}
              acquiring={acquiring}
              gray={gray}
              zoom={zoom}
              panX={panX}
              panY={panY}
              overlay={overlay}
              tool={tool}
              shots={shots}
              selectedIndex={selectedIndex}
              onSelectShot={onSelectShot}
              onGray={onGray}
              onView={onView}
              onReset={onResetView}
            />
          </div>
          <p className="border-t border-slate-100 px-3 py-2 font-mono text-[11px] text-slate-500">
            {formatNum(technique.kvp, 0)} kV · {formatNum(technique.mas, 1)} mAs · DFF {formatNum(technique.dff, 0)} cm ·{" "}
            {technique.focal === "FINE" ? "Fuoco fine" : "Fuoco grosso"} · {technique.grid ? "Griglia 12:1" : "No griglia"} ·{" "}
            Coll {formatNum(technique.collW, 0)}×{formatNum(technique.collH, 0)} cm
          </p>
        </section>

        <div className="grid gap-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="font-display text-base font-bold">Parametri di acquisizione</h2>
            <div className="mt-3">
              <GeometryPanel technique={technique} onChange={onTechnique} pane="position" />
            </div>
            <ParameterPanel technique={technique} analysis={analysis} onChange={onTechnique} />
            <button type="button" onClick={onResetTechnique} className={`${secondaryBtn} mt-3 h-9 w-full text-xs`}>
              <RotateCcw size={14} />
              Ripristina parametri di sala
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Workflow del caso</h2>
            <ol className="mt-3 flex items-center justify-between gap-1">
              {FLOW.map((label, step) => {
                const on = step <= flowIndex;
                return (
                  <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${
                        step < flowIndex
                          ? "bg-emerald-500 text-white"
                          : on
                            ? "bg-[#1e3a5f] text-white"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {step < flowIndex ? <Check size={12} /> : step + 1}
                    </span>
                    <span className="truncate text-[10px] text-slate-500">{label}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Stato scenario</h2>
              <p className="mt-2 text-xs text-slate-500">
                {shots.length} di {MAX_SHOTS} scatti completati
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${(shots.length / MAX_SHOTS) * 100}%` }} />
              </div>
              <p className="mt-1 text-right text-xs font-semibold text-[#1e3a5f]">
                {Math.round((shots.length / MAX_SHOTS) * 100)}%
              </p>
            </section>
            <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Geometria di sala</h2>
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-100">
                <GeometryPanel technique={technique} onChange={onTechnique} pane="room" />
              </div>
            </section>
          </div>
        </div>
      </div>

      <footer className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>
            Scatti <strong className="text-[#1e3a5f]">{shots.length}/{MAX_SHOTS}</strong>
          </span>
          <span>
            Dose cumulativa{" "}
            <strong className="text-[#1e3a5f]">{formatNum(cumulativeDap, 2)} dGy·cm²</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onResetTechnique} className={secondaryBtn}>
            <RotateCcw size={15} />
            Ripeti acquisizione
          </button>
          <button type="button" onClick={onExpose} disabled={acquiring || atLimit} className={exposeBtn}>
            <Play size={15} />
            {acquiring ? "Acquisizione…" : atLimit ? "Limite 3 scatti" : "Avvia acquisizione"}
          </button>
          <button type="button" onClick={onReview} disabled={shots.length < 1 || acquiring} className={secondaryBtn}>
            Review
          </button>
        </div>
      </footer>
    </div>
  );
}

function Phase({ n, label, state }: { n: string; label: string; state: "done" | "current" | "todo" }) {
  return (
    <li className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
      <span
        className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
          state === "done" ? "bg-emerald-500 text-white" : state === "current" ? "bg-[#1e3a5f] text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        {state === "done" ? <Check size={14} /> : n}
      </span>
      <span className={state === "todo" ? "text-slate-400" : ""}>{label}</span>
    </li>
  );
}
