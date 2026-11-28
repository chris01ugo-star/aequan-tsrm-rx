"use client";

import { useEffect } from "react";
import type { ViewerTool } from "@/components/console/ViewerPanel";
import { MODE_LABEL, type Acceptance, type QualityReview, type StationId } from "@/components/sim/examSession";
import { StationAcceptance } from "@/components/sim/stations/StationAcceptance";
import { StationConsole } from "@/components/sim/stations/StationConsole";
import { StationQuality } from "@/components/sim/stations/StationQuality";
import { StationRoom } from "@/components/sim/stations/StationRoom";
import { ghostBtn } from "@/components/ui/buttons";
import { warmupDrr } from "@/lib/drrEngine";
import type { Analysis, ClinicalCase, ExposureShot, GrayWindow, RejectReason, SimMode, Technique } from "@/types/rx";

const STEPS = [
  "1. Accettazione & Paziente",
  "2. Sala RX & Posizionamento 3D",
  "3. Sala Comandi & Acquisizione",
  "4. Qualità, Anatomia & PACS",
];

export function SimulationScreen({
  clinical,
  mode,
  station,
  technique,
  analysis,
  shots,
  selectedIndex,
  acquiring,
  elapsedSec,
  doorClosed,
  acceptance,
  quality,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  cumulativeDap,
  onTechnique,
  onAcceptance,
  onQuality,
  onStation,
  onDoor,
  onSelectShot,
  onGray,
  onView,
  onResetView,
  onReject,
  onExpose,
  onDeliver,
  onExit,
}: {
  clinical: ClinicalCase;
  mode: SimMode;
  station: StationId;
  technique: Technique;
  analysis: Analysis;
  shots: ExposureShot[];
  selectedIndex: number;
  acquiring: boolean;
  elapsedSec: number;
  doorClosed: boolean;
  acceptance: Acceptance;
  quality: QualityReview;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  cumulativeDap: number;
  onTechnique: (patch: Partial<Technique>) => void;
  onAcceptance: (patch: Partial<Acceptance>) => void;
  onQuality: (patch: Partial<QualityReview>) => void;
  onStation: (station: StationId) => void;
  onDoor: (closed: boolean) => void;
  onSelectShot: (index: number) => void;
  onGray: (patch: Partial<GrayWindow>) => void;
  onView: (patch: { zoom?: number; panX?: number; panY?: number; overlay?: boolean; tool?: ViewerTool }) => void;
  onResetView: () => void;
  onReject: (index: number, reason: RejectReason) => void;
  onExpose: () => void;
  onDeliver: () => void;
  onExit: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(() => warmupDrr(), 60);
    return () => window.clearTimeout(id);
  }, []);

  const seconds = mode === "exam" ? Math.max(0, 600 - elapsedSec) : elapsedSec;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const view = { gray, zoom, panX, panY, overlay, tool, onGray, onView, onResetView };

  const stationBody =
    station >= 3
      ? "mt-2 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-[10px] overflow-hidden"
      : "mt-2 flex min-h-0 flex-1 flex-col overflow-hidden";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0B1320] p-2 text-[#F8FAFC]">
      <header className="sticky top-0 z-30 shrink-0 rounded-xl border border-[#2A486D] bg-[#16253B] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 truncate font-display text-base font-bold">
            Caso 01 · {STEPS[station - 1].replace(/^\d+\.\s*/, "")}
          </h1>
          <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#1E324E]">
            {MODE_LABEL[mode]}
          </span>
          <span className="ml-auto font-mono text-sm tabular-nums">
            {mode === "exam" && seconds === 0 ? "Tempo scaduto" : clock}
          </span>
          <button type="button" onClick={onExit} className={ghostBtn}>
            Esci
          </button>
        </div>
        <ol className="mt-2 flex flex-wrap gap-1">
          {STEPS.map((label, index) => {
            const id = (index + 1) as StationId;
            const on = station === id;
            return (
              <li
                key={label}
                className={`rounded-md px-2 py-1 text-[11px] ${
                  on ? "bg-[#F8FAFC] font-medium text-[#1E324E]" : "text-[#9FB3C8]"
                }`}
              >
                {label}
              </li>
            );
          })}
        </ol>
      </header>
      <div className={stationBody}>
      {station === 1 ? (
        <StationAcceptance
          clinical={clinical}
          mode={mode}
          acceptance={acceptance}
          onChange={onAcceptance}
          onNext={() => {
            if (mode === "exam" && (acceptance.modality !== "RX" || acceptance.district !== "TORACE")) {
              onAcceptance({ itemAFailed: true });
            }
            onStation(2);
          }}
        />
      ) : null}
      {station === 2 ? (
        <StationRoom
          mode={mode}
          technique={technique}
          onTechnique={onTechnique}
          onNext={() => {
            onDoor(true);
            onStation(3);
          }}
        />
      ) : null}
      {station === 3 ? (
        <StationConsole
          mode={mode}
          clinical={clinical}
          technique={technique}
          analysis={analysis}
          shots={shots}
          selectedIndex={selectedIndex}
          acquiring={acquiring}
          doorClosed={doorClosed}
          cumulativeDap={cumulativeDap}
          {...view}
          onTechnique={onTechnique}
          onSelectShot={onSelectShot}
          onDoor={onDoor}
          onBack={() => {
            onDoor(false);
            onStation(2);
          }}
          onExpose={onExpose}
          onNext={() => onStation(4)}
        />
      ) : null}
      {station === 4 ? (
        <StationQuality
          clinical={clinical}
          technique={technique}
          analysis={analysis}
          shots={shots}
          selectedIndex={selectedIndex}
          quality={quality}
          {...view}
          onQuality={onQuality}
          onSelectShot={onSelectShot}
          onReject={onReject}
          onBack={() => onStation(3)}
          onDeliver={onDeliver}
        />
      ) : null}
      </div>
    </div>
  );
}
