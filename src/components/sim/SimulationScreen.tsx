"use client";

import { useState } from "react";
import { GeometryPanel } from "@/components/console/GeometryPanel";
import { ParameterPanel } from "@/components/console/ParameterPanel";
import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { RisSummary } from "@/components/library/RisSummary";
import { exposeBtn, primaryBtn } from "@/components/ui/buttons";
import { formatNum } from "@/lib/number";
import { sameTechnique } from "@/lib/rxPhysics";
import type { Analysis, ClinicalCase, ExposureShot, GrayWindow, Technique } from "@/types/rx";

const MAX_SHOTS = 3;

export function SimulationScreen({
  clinical,
  technique,
  analysis,
  shots,
  selectedIndex,
  acquiring,
  elapsedSec,
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
  const [tab, setTab] = useState<"room" | "position">("room");
  const shot = shots[selectedIndex] ?? null;
  const latest = shots[shots.length - 1] ?? null;
  const dirty = Boolean(latest && shot === latest && !sameTechnique(latest.technique, technique));
  const atLimit = shots.length >= MAX_SHOTS;
  const clock = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-dvh flex-col gap-[10px] overflow-hidden bg-[#0B1320] p-[10px] text-[#F8FAFC]">
      <header className="sticky top-0 z-10 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-[#2A486D] bg-[#16253B]/95 px-4 py-2.5 shadow-sm backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
            {clinical.title}
          </h1>
          <span className="shrink-0 rounded-full bg-[#F8FAFC] px-[10px] py-1 text-[11px] font-semibold text-[#1E324E]">
            Sala RX · Torace
          </span>
        </div>
        <div className="rounded-2xl border border-[#2A486D] bg-[#111D30] px-3.5 py-1.5 font-mono text-sm tabular-nums">
          {clock}
        </div>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onBriefing} className="rounded-md px-[10px] py-[6px] text-[13px] text-[#9FB3C8] hover:bg-[#1E324E] hover:text-[#F8FAFC]">
            Briefing RIS
          </button>
          <button type="button" onClick={onResetTechnique} className="rounded-md px-[10px] py-[6px] text-[13px] text-[#9FB3C8] hover:bg-[#1E324E] hover:text-[#F8FAFC]">
            Reset parametri
          </button>
          <button
            type="button"
            disabled={shots.length < 1}
            onClick={onReview}
            className="rounded-md px-[10px] py-[6px] text-[13px] font-medium text-[#F8FAFC] hover:bg-[#1E324E] disabled:text-[#9FB3C8]"
          >
            Review & Termina
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-[10px] lg:grid-cols-[1.15fr_1.55fr_1.15fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#2A486D] bg-[#16253B] shadow-sm">
          <div className="m-2 flex rounded-2xl border border-[#2A486D] bg-[#111D30] p-1">
            <Tab on={tab === "room"} onClick={() => setTab("room")}>Sala & Paziente</Tab>
            <Tab on={tab === "position"} onClick={() => setTab("position")}>Posizionamento</Tab>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rx-scroll px-2 pb-2">
            {tab === "room" ? (
              <>
                <div className="mb-2 rounded-xl bg-[#111D30] p-2">
                  <RisSummary clinical={clinical} />
                  <p className="mt-2 text-xs text-[#F8FAFC]">{clinical.indication}</p>
                </div>
                <GeometryPanel technique={technique} onChange={onTechnique} pane="room" />
              </>
            ) : (
              <GeometryPanel technique={technique} onChange={onTechnique} pane="position" />
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#2A486D] bg-[#16253B] shadow-sm">
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
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-[#2A486D] bg-[#16253B] shadow-sm">
          <ParameterPanel technique={technique} analysis={analysis} onChange={onTechnique} />
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-[#2A486D] bg-[#16253B]/90 px-4 py-2.5">
        <div className="font-mono text-xs tabular-nums text-[#F8FAFC]">
          Scatti {shots.length} / {MAX_SHOTS}
          <span className="ml-3">Dose cumulativa {formatNum(cumulativeDap, 2)} dGy·cm²</span>
        </div>
        <p className="hidden text-center text-[11px] text-[#9FB3C8] sm:block">
          Solo uso didattico · Non dispositivo medico
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onExpose} disabled={acquiring || atLimit} className={exposeBtn}>
            {acquiring ? "Acquisizione…" : atLimit ? "Limite 3 scatti" : "Avvia acquisizione RX"}
          </button>
          <button type="button" onClick={onReview} disabled={shots.length < 1 || acquiring} className={primaryBtn}>
            Procedi a Review →
          </button>
        </div>
      </footer>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-[14px] py-[6px] text-xs font-medium ${
        on ? "bg-[#F8FAFC] text-[#1E324E]" : "text-[#9FB3C8] hover:text-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}
