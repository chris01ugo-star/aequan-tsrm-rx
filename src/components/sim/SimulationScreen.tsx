"use client";

import {
  Check,
  FileText,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Gauge,
  Hand,
  Layers,
  Maximize2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  SunMedium,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { Stepper } from "@/components/ui/Stepper";
import { card, primaryBtn, secondaryBtn } from "@/components/ui/buttons";
import { clamp, formatNum } from "@/lib/number";
import { DEFAULT_WINDOW, DRL_CHEST_PA, paintLatentToCanvas, renderLatent, sameTechnique } from "@/lib/rxPhysics";
import type { Analysis, ClinicalCase, ExposureShot, GrayWindow, LatentImage, Technique } from "@/types/rx";

const MAX_SHOTS = 3;

const REFERENCE: Technique = {
  projection: "PA",
  decubitus: "ORTOSTATISMO",
  respiration: "INSP",
  kvp: 120,
  mas: 3,
  dff: 180,
  focal: "FINE",
  grid: true,
  collW: 36,
  collH: 40,
};

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
  onView: (patch: { zoom?: number; panX?: number; panY?: number; overlay?: boolean; tool?: ViewerTool }) => void;
  onResetView: () => void;
  onResetTechnique: () => void;
  onBriefing: () => void;
  onExpose: () => void;
  onReview: () => void;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const shot = shots[selectedIndex] ?? null;
  const latest = shots[shots.length - 1] ?? null;
  const dirty = Boolean(latest && shot === latest && !sameTechnique(latest.technique, technique));
  const atLimit = shots.length >= MAX_SHOTS;
  const reference = useMemo(() => renderLatent(REFERENCE, 7), []);
  const dap = analysis.dosimetry.dapDGyCm2;
  const ratio = dap / DRL_CHEST_PA.dapDGyCm2;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-8">
      <Stepper steps={["Briefing", "Acquisizione", "Review", "Debriefing / Valutazione"]} current={1} />

      <section className={`${card} p-4 sm:p-6`}>
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] text-slate-500">Caso 01 · Radiologia convenzionale</p>
            <h1 className="mt-1 font-display text-[26px] leading-tight font-semibold text-[#1f2b3b] sm:text-[30px]">{clinical.title}</h1>
            <p className="mt-1 text-[15px] text-slate-600">{clinical.indication}</p>
          </div>
          <button type="button" onClick={onBriefing} className={`${secondaryBtn} h-10 shrink-0 self-start px-4`}>
            <FileText size={16} strokeWidth={1.75} />
            Richiesta clinica
          </button>
        </header>

        <NextStep shots={shots.length} dirty={dirty} atLimit={atLimit} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div ref={viewerRef} className="rounded-2xl xl:sticky xl:top-4 border border-[#e7eaef] bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-600">
              <span className="font-medium text-[#1f2b3b]">
                {technique.projection === "LL" ? "Laterale" : technique.projection} ·{" "}
                {technique.decubitus === "ORTOSTATISMO" ? "Ortostatismo" : "Supino"}
              </span>
              <span className="hidden h-4 w-px bg-[#e7eaef] sm:block" />
              <span>{shot ? `Scatto ${shot.index}/${MAX_SHOTS}` : "Pre-esposizione"}</span>
              <div className="ml-auto flex items-center gap-0.5">
                <Tool label="Finestra/livello" active={tool === "wl"} onClick={() => onView({ tool: "wl" })}>
                  <SunMedium size={16} />
                </Tool>
                <Tool label="Sposta" active={tool === "pan"} onClick={() => onView({ tool: "pan" })}>
                  <Hand size={16} />
                </Tool>
                <Tool label="Riduci" onClick={() => onView({ zoom: clamp(Number((zoom / 1.15).toFixed(2)), 1, 5) })}>
                  <ZoomOut size={16} />
                </Tool>
                <Tool label="Ingrandisci" onClick={() => onView({ zoom: clamp(Number((zoom * 1.15).toFixed(2)), 1, 5) })}>
                  <ZoomIn size={16} />
                </Tool>
                <Tool label="Inverti" active={gray.invert} onClick={() => onGray({ invert: !gray.invert })}>
                  <Contrast size={16} />
                </Tool>
                <Tool label="Ripristina vista" onClick={onResetView}>
                  <RotateCcw size={16} />
                </Tool>
                <Tool label="Schermo intero" onClick={() => viewerRef.current?.requestFullscreen?.()}>
                  <Maximize2 size={16} />
                </Tool>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl">
              <ViewerPanel
                clean
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
                onGray={onGray}
                onView={onView}
                onReset={onResetView}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Arrow label="Scatto precedente" disabled={selectedIndex <= 0} onClick={() => onSelectShot(selectedIndex - 1)}>
                <ChevronLeft size={16} />
              </Arrow>
              <div className="flex flex-1 justify-center gap-2">
                {Array.from({ length: MAX_SHOTS }, (_, index) => {
                  const item = shots[index];
                  return item ? (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onSelectShot(index)}
                      aria-label={`Scatto ${index + 1}`}
                      className={`h-14 w-16 overflow-hidden rounded-md border-2 bg-black sm:w-20 ${
                        index === selectedIndex ? "border-[#2d4f7a]" : "border-transparent hover:border-[#9fb4cf]"
                      }`}
                    >
                      <LatentThumb latent={item.latent} />
                    </button>
                  ) : (
                    <span
                      key={index}
                      className="grid h-14 w-16 place-items-center rounded-md border border-dashed border-[#dde2e9] text-[11px] text-slate-400 sm:w-20"
                    >
                      {index + 1}
                    </span>
                  );
                })}
              </div>
              <Arrow label="Scatto successivo" disabled={selectedIndex >= shots.length - 1} onClick={() => onSelectShot(selectedIndex + 1)}>
                <ChevronRight size={16} />
              </Arrow>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#1f2b3b]">Impostazioni di acquisizione</h2>
              <button type="button" onClick={onResetTechnique} className="text-[13px] text-slate-500 underline-offset-4 hover:text-[#2d4f7a] hover:underline">
                Ripristina valori iniziali
              </button>
            </div>

            <Panel step={1} title="Paziente" hint="Come si presenta il paziente all’esposizione">
              <Row label="Proiezione">
                <Select
                  value={technique.projection}
                  options={[["PA", "PA"], ["AP", "AP"], ["LL", "Laterale"]]}
                  onChange={(projection) => onTechnique({ projection })}
                />
              </Row>
              <Row label="Decubito">
                <Select
                  value={technique.decubitus}
                  options={[["ORTOSTATISMO", "Ortostatismo"], ["SUPINO", "Supino"]]}
                  onChange={(decubitus) => onTechnique({ decubitus })}
                />
              </Row>
              <Row label="Respiro">
                <Select
                  value={technique.respiration}
                  options={[["INSP", "Inspirio"], ["ESP", "Espirio"], ["LIBERO", "Libero"]]}
                  onChange={(respiration) => onTechnique({ respiration })}
                />
              </Row>
            </Panel>

            <Panel step={2} title="Esposizione" hint="Qualità e quantità del fascio">
              <Row label="Tensione" unit="kV">
                <Num value={technique.kvp} min={50} max={140} step={2} digits={0} onChange={(kvp) => onTechnique({ kvp })} />
              </Row>
              <Row label="Carico" unit="mAs">
                <Num value={technique.mas} min={0.5} max={40} step={0.5} digits={1} onChange={(mas) => onTechnique({ mas })} />
              </Row>
              <Row label="Macchia focale">
                <Select
                  value={technique.focal}
                  options={[["FINE", "Fine 0,6"], ["GROSSA", "Grossa 1,2"]]}
                  onChange={(focal) => onTechnique({ focal })}
                />
              </Row>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-[#f6f7f9] px-3 py-2.5 text-[13px]">
                <span className="text-slate-600">
                  Dose stimata <strong className="font-semibold text-[#1f2b3b] tabular-nums">{formatNum(dap, 2)} dGy·cm²</strong>
                </span>
                <span
                  className={`text-[12px] font-medium ${
                    ratio <= 0.75 ? "text-emerald-700" : ratio <= 1 ? "text-amber-700" : "text-rose-700"
                  }`}
                >
                  {ratio <= 0.75 ? "Sotto il DRL" : ratio <= 1 ? "Vicino al DRL" : "Sopra il DRL"}
                </span>
              </div>
            </Panel>

            <Panel step={3} title="Geometria e campo" hint="Distanza, griglia e collimazione">
              <Row label="Distanza fuoco-detettore" unit="cm">
                <Num value={technique.dff} min={100} max={200} step={10} digits={0} onChange={(dff) => onTechnique({ dff })} />
              </Row>
              <Row label="Griglia">
                <Select
                  value={technique.grid ? "IN" : "OUT"}
                  options={[["IN", "Inserita 12:1"], ["OUT", "Rimossa"]]}
                  onChange={(value) => onTechnique({ grid: value === "IN" })}
                />
              </Row>
              <Row label="Campo, larghezza" unit="cm">
                <Num value={technique.collW} min={20} max={43} step={1} digits={0} onChange={(collW) => onTechnique({ collW })} />
              </Row>
              <Row label="Campo, altezza" unit="cm">
                <Num value={technique.collH} min={20} max={43} step={1} digits={0} onChange={(collH) => onTechnique({ collH })} />
              </Row>
            </Panel>

            {latest ? (
              <section className="rounded-2xl border border-[#e7eaef] p-4 sm:p-5">
                <h3 className="text-[15px] font-semibold text-[#1f2b3b]">Confronto con il riferimento</h3>
                <p className="mt-0.5 text-[13px] text-slate-500">L’ultimo scatto accanto a un torace PA eseguito correttamente.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-slate-600">
                  <figure>
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-black">
                      <LatentThumb latent={latest.latent} />
                    </div>
                    <figcaption className="mt-1.5">Il tuo scatto {latest.index}</figcaption>
                  </figure>
                  <figure>
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-black">
                      <LatentThumb latent={reference} />
                    </div>
                    <figcaption className="mt-1.5">Riferimento</figcaption>
                  </figure>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <footer className={`${card} sticky bottom-4 z-20 flex flex-col gap-2 px-3 py-2.5 sm:gap-3 sm:flex-row sm:py-3 sm:items-center sm:justify-between sm:px-6`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-600 sm:text-[14px]">
          <span className="flex items-center gap-2">
            <Layers size={17} strokeWidth={1.75} />
            Scatti <strong className="text-[16px] font-semibold text-[#1f2b3b] tabular-nums">{shots.length}/{MAX_SHOTS}</strong>
          </span>
          <span className="hidden h-6 w-px bg-[#e7eaef] sm:block" />
          <span className="flex items-center gap-2">
            <Gauge size={17} strokeWidth={1.75} />
            <span className="hidden sm:inline">Dose cumulativa</span><span className="sm:hidden">Dose</span>{" "}
            <strong className="text-[16px] font-semibold text-[#1f2b3b] tabular-nums">{formatNum(cumulativeDap, 2)} dGy·cm²</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <button type="button" onClick={onReview} disabled={shots.length < 1 || acquiring} className={secondaryBtn}>
            <Check size={16} />
            <span className="sm:hidden">Review</span>
            <span className="hidden sm:inline">Vai alla review</span>
          </button>
          <button type="button" onClick={onExpose} disabled={acquiring || atLimit} className={primaryBtn}>
            <Play size={16} fill="currentColor" />
            <span className="sm:hidden">{acquiring ? "Acquisizione…" : atLimit ? "Limite" : "Avvia"}</span>
            <span className="hidden sm:inline">{acquiring ? "Acquisizione…" : atLimit ? "Limite raggiunto" : "Avvia acquisizione"}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function Panel({ step, title, hint, children }: { step: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e7eaef] bg-white p-4 sm:p-5">
      <header className="mb-3 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf1f6] text-[13px] font-semibold text-[#2d4f7a]">{step}</span>
        <div>
          <h3 className="text-[15px] font-semibold text-[#1f2b3b]">{title}</h3>
          <p className="text-[13px] text-slate-500">{hint}</p>
        </div>
      </header>
      <div className="flex flex-col gap-2.5 sm:pl-10">{children}</div>
    </section>
  );
}

function Row({ label, unit, children }: { label: string; unit?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 text-[14px] text-slate-700">
        {label}
        {unit ? <span className="ml-1 text-slate-400">({unit})</span> : null}
      </span>
      {children}
    </div>
  );
}

function NextStep({ shots, dirty, atLimit }: { shots: number; dirty: boolean; atLimit: boolean }) {
  const text = atLimit
    ? "Hai usato tutti e tre gli scatti. Passa alla review per scegliere l’immagine da inviare."
    : dirty
      ? "Hai modificato i parametri dopo l’ultimo scatto: esegui un nuovo scatto per vederne l’effetto."
      : shots
        ? "Confronta lo scatto con il riferimento. Se risponde al quesito clinico passa alla review, altrimenti correggi i parametri."
        : "Leggi la richiesta clinica, imposta i parametri nelle tre sezioni a destra e avvia il primo scatto.";
  return (
    <p className="mb-5 flex flex-col gap-1 rounded-2xl sm:flex-row sm:items-start sm:gap-3 bg-[#f3f6f9] px-4 py-3 text-[14px] leading-relaxed text-slate-700">
      <span className="mt-0.5 shrink-0 text-[12px] font-semibold text-[#2d4f7a]">Prossimo passo</span>
      <span>{text}</span>
    </p>
  );
}

const pill = "h-9 w-[132px] shrink-0 rounded-xl border border-[#e3e7ed] bg-white text-[14px] text-[#1f2b3b] focus-within:border-[#9fb4cf]";

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as T)} className={`${pill} cursor-pointer px-2.5 outline-none`}>
      {options.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Num({
  value,
  min,
  max,
  step,
  digits,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  digits: number;
  onChange: (value: number) => void;
}) {
  const nudge = (direction: number) => onChange(Number(clamp(value + direction * step, min, max).toFixed(digits)));
  return (
    <span className={`${pill} flex items-center`}>
      <button type="button" aria-label="Diminuisci" onClick={() => nudge(-1)} className="grid h-full w-8 place-items-center text-slate-500 hover:text-[#2d4f7a]">
        <Minus size={14} />
      </button>
      <span className="flex-1 text-center font-medium tabular-nums">{formatNum(value, digits)}</span>
      <button type="button" aria-label="Aumenta" onClick={() => nudge(1)} className="grid h-full w-8 place-items-center text-slate-500 hover:text-[#2d4f7a]">
        <Plus size={14} />
      </button>
    </span>
  );
}

function Tool({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md ${active ? "bg-[#edf1f6] text-[#2d4f7a]" : "text-slate-500 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function Arrow({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#dde2e9] text-slate-600 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function LatentThumb({ latent }: { latent: LatentImage }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintLatentToCanvas(ref.current, latent, DEFAULT_WINDOW);
  }, [latent]);
  return <canvas ref={ref} className="h-full w-full object-contain" />;
}
