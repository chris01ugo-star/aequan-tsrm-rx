"use client";

import { useEffect, useRef, useState } from "react";
import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { Room3DViewport } from "@/components/sim/Room3DViewport";
import { FieldStep, Guide, Pick } from "@/components/sim/stations/controls";
import { exposeBtn, primaryBtn, secondaryBtn } from "@/components/ui/buttons";
import { formatNum } from "@/lib/number";
import { playExposureCue } from "@/lib/rxAudio";
import { aecBlocksExposure, DRL_CHEST_PA } from "@/lib/rxPhysics";
import type {
  AecDensityStep,
  Analysis,
  ClinicalCase,
  ExposureShot,
  FocalSpot,
  GrayWindow,
  GridMode,
  SimMode,
  Technique,
} from "@/types/rx";

const DENSITY: AecDensityStep[] = [-2, -1, 0, 1, 2];

export function StationConsole({
  mode,
  clinical,
  technique,
  analysis,
  shots,
  selectedIndex,
  acquiring,
  doorClosed,
  cumulativeDap,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  onTechnique,
  onSelectShot,
  onGray,
  onView,
  onResetView,
  onDoor,
  onBack,
  onExpose,
  onNext,
}: {
  mode: SimMode;
  clinical: ClinicalCase;
  technique: Technique;
  analysis: Analysis;
  shots: ExposureShot[];
  selectedIndex: number;
  acquiring: boolean;
  doorClosed: boolean;
  cumulativeDap: number;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  onTechnique: (patch: Partial<Technique>) => void;
  onSelectShot: (index: number) => void;
  onGray: (patch: Partial<GrayWindow>) => void;
  onView: (patch: { zoom?: number; panX?: number; panY?: number; overlay?: boolean; tool?: ViewerTool }) => void;
  onResetView: () => void;
  onDoor: (closed: boolean) => void;
  onBack: () => void;
  onExpose: () => void;
  onNext: () => void;
}) {
  const [camera, setCamera] = useState(false);
  const [phase, setPhase] = useState<"idle" | "prep" | "beam">("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  const shot = shots[selectedIndex] ?? null;
  const aec = technique.exposureMode === "aec";
  const atLimit = shots.length >= 3;
  const blocked = !doorClosed || aecBlocksExposure(technique) || atLimit || acquiring || phase !== "idle";
  const reason = !doorClosed
    ? "Chiudi porta sala per abilitare"
    : aecBlocksExposure(technique)
      ? "Seleziona almeno una camera AEC"
      : atLimit
        ? "Limite di tre scatti raggiunto"
        : phase === "prep"
          ? "Preparazione anodo…"
          : phase === "beam" || acquiring
            ? "RAGGI X IN CORSO"
            : "Eroga RX";
  const dose = shot?.dosimetry ?? null;
  const drl = shot?.drlDapDGyCm2 ?? DRL_CHEST_PA.dapDGyCm2;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-[10px] overflow-hidden">
      {mode === "guided" ? (
        <Guide text="Regola del 15%: +15% di kVp permette di dimezzare circa i mAs. Ogni 5 cm di spessore in più chiedono un aggiustamento di esposizione." />
      ) : null}
      <div className="grid min-h-0 flex-1 gap-[10px] overflow-hidden lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,340px)]">
        <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
          {phase !== "idle" ? (
            <div
              className={`pointer-events-none absolute top-14 left-1/2 z-30 -translate-x-1/2 rounded-md px-3 py-1 font-mono text-[12px] tracking-[0.14em] ${
                phase === "beam" ? "bg-[#F39C12] text-[#0B1320]" : "border border-[#2A486D] bg-[#111D30] text-[#F8FAFC]"
              }`}
            >
              {phase === "prep" ? "Preparazione anodo…" : "RAGGI X IN CORSO"}
            </div>
          ) : null}
          <ViewerPanel
            clinical={clinical}
            technique={technique}
            analysis={analysis}
            shot={shot}
            dirty={false}
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
        <aside className="h-full min-h-0 overflow-y-auto rounded-xl border border-[#2A486D] bg-[#16253B] pr-1 rx-scroll">
          <div className={`shrink-0 px-3 py-2 text-[12px] ${doorClosed ? "text-[#22C55E]" : "text-[#F39C12]"}`}>
            <p>{doorClosed ? "Porta chiusa · Sala in sicurezza" : "Porta aperta · Erogazione bloccata"}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {doorClosed ? null : (
                <button type="button" onClick={() => onDoor(true)} className="rounded-md bg-[#F8FAFC] px-2 py-1 text-[11px] font-medium text-[#1E324E]">
                  Chiudi porta sala
                </button>
              )}
              <button
                type="button"
                onClick={() => setCamera((value) => !value)}
                className="rounded-md border border-[#2A486D] px-2 py-1 text-[11px] text-[#F8FAFC]"
              >
                Telecamera Sala 3D
              </button>
            </div>
          </div>
          {camera ? (
            <div className="h-36 shrink-0 border-y border-[#2A486D]">
              <Room3DViewport technique={technique} roomMode={mode === "guided" ? "training" : "exam"} />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 rx-scroll">
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Consolle generatore DR</p>
            <div className="grid grid-cols-2 gap-1">
              <Pick on={!aec} onClick={() => onTechnique({ exposureMode: "manual" })}>
                Manuale (kVp + mAs)
              </Pick>
              <Pick on={aec} onClick={() => onTechnique({ exposureMode: "aec" })}>
                AEC a 3 camere
              </Pick>
            </div>
            {aec ? (
              <div>
                <div className="grid grid-cols-3 gap-1">
                  <Pick on={technique.aecChambers.left} onClick={() => onTechnique({ aecChambers: { ...technique.aecChambers, left: !technique.aecChambers.left } })}>
                    SX
                  </Pick>
                  <Pick on={technique.aecChambers.center} onClick={() => onTechnique({ aecChambers: { ...technique.aecChambers, center: !technique.aecChambers.center } })}>
                    C
                  </Pick>
                  <Pick on={technique.aecChambers.right} onClick={() => onTechnique({ aecChambers: { ...technique.aecChambers, right: !technique.aecChambers.right } })}>
                    DX
                  </Pick>
                </div>
                <div className="mt-1 grid grid-cols-5 gap-1">
                  {DENSITY.map((step) => (
                    <Pick key={step} on={technique.aecDensityStep === step} onClick={() => onTechnique({ aecDensityStep: step })}>
                      {step > 0 ? `+${step}` : `${step}`}
                    </Pick>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[#9FB3C8]">mAs · terminazione automatica</p>
              </div>
            ) : null}
            <FieldStep
              label="kVp"
              value={technique.kvp}
              unit="kVp"
              digits={0}
              step={2}
              min={50}
              max={140}
              onChange={(kvp) => onTechnique({ kvp })}
              hint={mode === "guided" ? "+15% di kVp ≈ metà dei mAs, a parità di annerimento." : undefined}
            />
            {aec ? null : (
              <FieldStep
                label="mAs"
                value={technique.mas}
                unit="mAs"
                digits={1}
                step={0.5}
                min={0.5}
                max={40}
                onChange={(mas) => onTechnique({ mas })}
                hint={mode === "guided" ? "Oltre 5 cm di spessore serve più esposizione, non solo più kVp." : undefined}
              />
            )}
            <div className="grid gap-1">
              {(
                [
                  ["none", "Griglia rimossa"],
                  ["focused_100", "Focalizzata 100 cm"],
                  ["focused_180", "Focalizzata 180 cm"],
                ] as [GridMode, string][]
              ).map(([id, label]) => (
                <Pick
                  key={id}
                  on={technique.gridMode === id}
                  title={mode === "guided" && id === "focused_180" ? "Sul torace PA eretto la griglia è focalizzata a 180 cm." : undefined}
                  onClick={() => onTechnique({ gridMode: id, grid: id !== "none" })}
                >
                  {label}
                </Pick>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ["FINE", "Fine 0,6 mm"],
                  ["GROSSA", "Grossa 1,2 mm"],
                ] as [FocalSpot, string][]
              ).map(([id, label]) => (
                <Pick key={id} on={technique.focal === id} onClick={() => onTechnique({ focal: id })}>
                  {label}
                </Pick>
              ))}
            </div>
            <div className="rounded-lg bg-[#111D30] px-2 py-2 font-mono text-[12px] tabular-nums">
              <p>EI {dose ? formatNum(dose.ei, 0) : "—"} · DI {dose ? `${dose.di > 0 ? "+" : ""}${formatNum(dose.di, 1)}` : "—"}</p>
              <p className="text-[#9FB3C8]">{dose ? "post-esposizione" : "— (post-esposizione)"}</p>
              {dose ? (
                <p className="mt-1 text-[#F8FAFC]">
                  mAs {formatNum(shot?.technique.mas ?? technique.mas, 1)} · t {formatNum(dose.exposureTimeMs, 0)} ms
                  <br />
                  DAP {formatNum(dose.dapDGyCm2, 2)} / DRL {formatNum(drl, 2)} · ESD {formatNum(dose.esdMgy, 3)} mGy
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#9FB3C8]">
          <span className="font-mono tabular-nums">Scatti {shots.length} / 3</span>
          <span className="font-mono tabular-nums">DAP {formatNum(cumulativeDap, 2)} dGy·cm²</span>
          <button type="button" onClick={onBack} className={secondaryBtn}>
            ← Torna in Sala (Riposiziona)
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              playExposureCue();
              setPhase("prep");
              timers.current.push(window.setTimeout(() => setPhase("beam"), 180));
              timers.current.push(
                window.setTimeout(() => {
                  setPhase("idle");
                  onExpose();
                }, 350),
              );
            }}
            className={exposeBtn}
          >
            {reason}
          </button>
          <button type="button" disabled={shots.length < 1} onClick={onNext} className={primaryBtn}>
            Controllo Qualità & Anatomia (Stazione 4) →
          </button>
        </div>
      </footer>
    </div>
  );
}
