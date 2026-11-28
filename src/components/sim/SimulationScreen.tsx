"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ViewerTool } from "@/components/console/ViewerPanel";
import { MODE_LABEL, type Acceptance, type QualityReview, type StationId } from "@/components/sim/examSession";
import { QuickGuideDialog } from "@/components/sim/QuickGuideDialog";
import { StationAcceptance } from "@/components/sim/stations/StationAcceptance";
import { StationConsole } from "@/components/sim/stations/StationConsole";
import { StationQuality } from "@/components/sim/stations/StationQuality";
import { StationRoom } from "@/components/sim/stations/StationRoom";
import { ghostBtn } from "@/components/ui/buttons";
import { Stepper } from "@/components/ui/Stepper";
import { warmupDrr } from "@/lib/drrEngine";
import { isRxAudioEnabled, setRxAudioEnabled, subscribeRxAudio } from "@/lib/rxAudio";
import type { Analysis, ClinicalCase, ExposureShot, GrayWindow, RejectReason, SimMode, Technique } from "@/types/rx";

const STEPS = ["Accettazione", "Sala RX", "Sala comandi", "Qualità e PACS"];

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

  const [guide, setGuide] = useState(false);
  const audioOn = useSyncExternalStore(subscribeRxAudio, isRxAudioEnabled, () => true);
  const seconds = mode === "exam" ? Math.max(0, 600 - elapsedSec) : elapsedSec;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const view = { gray, zoom, panX, panY, overlay, tool, onGray, onView, onResetView };

  const stationBody =
    station >= 3
      ? "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-[10px] overflow-hidden"
      : "flex min-h-0 flex-1 flex-col overflow-hidden";

  return (
    <div className="flex h-dvh flex-col gap-2 overflow-hidden bg-[#f6f7f9] p-2 text-[#1f2b3b]">
      <header className="flex shrink-0 items-center gap-2 px-1">
        <h1 className="min-w-0 truncate font-display text-base font-semibold">Caso 01 · {STEPS[station - 1]}</h1>
        <span className="rounded-full bg-[#edf1f6] px-2 py-0.5 text-[11px] font-semibold text-[#2d4f7a]">
          {MODE_LABEL[mode]}
        </span>
        <span className="ml-auto font-mono text-sm tabular-nums">
          {mode === "exam" && seconds === 0 ? "Tempo scaduto" : clock}
        </span>
        <button type="button" aria-pressed={audioOn} onClick={() => setRxAudioEnabled(!audioOn)} className={ghostBtn}>
          {audioOn ? "Audio on" : "Audio off"}
        </button>
        <button type="button" onClick={() => setGuide(true)} className={ghostBtn}>
          ? Guida
        </button>
        <button type="button" onClick={onExit} className={ghostBtn}>
          Esci
        </button>
      </header>
      <div className="shrink-0">
        <Stepper steps={STEPS} current={station - 1} />
      </div>
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
      {guide ? <QuickGuideDialog onClose={() => setGuide(false)} /> : null}
    </div>
  );
}
