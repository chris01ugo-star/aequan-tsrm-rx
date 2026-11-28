"use client";

import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Gauge,
  Hand,
  ImageIcon,
  Layers,
  Maximize2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SunMedium,
  Workflow,
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
const FLOW = ["Briefing", "Console", "Acquisizione", "Review", "Debriefing"];

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
  const flowIndex = shots.length ? 2 : 1;
  const reference = useMemo(() => renderLatent(REFERENCE, 7), []);
  const dap = analysis.dosimetry.dapDGyCm2;
  const ratio = dap / DRL_CHEST_PA.dapDGyCm2;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-8">
      <Stepper steps={["Briefing", "Acquisizione", "Review", "Debriefing / Valutazione"]} current={1} />

      <section className={`${card} p-4 sm:p-6`}>
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[26px] leading-tight font-semibold text-[#14233b] sm:text-[30px]">
                Caso 01 — {clinical.title}
              </h1>
              <span className="rounded-md bg-[#e8f0fa] px-2.5 py-1 text-[12px] font-medium text-[#123a6b]">Simulazione</span>
              <span className="rounded-md bg-[#e8f0fa] px-2.5 py-1 text-[12px] font-medium text-[#123a6b]">RX</span>
            </div>
            <p className="mt-1 font-display text-[16px] text-slate-500 italic">{clinical.indication}</p>
          </div>
          <button
            type="button"
            onClick={onBriefing}
            title="Scheda clinica"
            aria-label="Apri scheda clinica"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#123a6b]"
          >
            <Bookmark size={19} strokeWidth={1.75} />
          </button>
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div ref={viewerRef} className="rounded-xl border border-[#e3e9f1] bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-600">
              <span className="font-medium text-[#14233b]">
                {technique.projection === "LL" ? "Laterale" : technique.projection} ·{" "}
                {technique.decubitus === "ORTOSTATISMO" ? "Ortostatismo" : "Supino"}
              </span>
              <span className="hidden h-4 w-px bg-[#e3e9f1] sm:block" />
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
            <div className="overflow-hidden rounded-lg">
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
                        index === selectedIndex ? "border-[#123a6b]" : "border-transparent hover:border-[#9fb4cf]"
                      }`}
                    >
                      <LatentThumb latent={item.latent} />
                    </button>
                  ) : (
                    <span
                      key={index}
                      className="grid h-14 w-16 place-items-center rounded-md border border-dashed border-[#d5deea] text-[11px] text-slate-400 sm:w-20"
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

          <div className="grid gap-5">
            <Panel
              icon={<Settings2 size={18} strokeWidth={1.75} />}
              title="Parametri di acquisizione"
              action={
                <button type="button" onClick={onResetTechnique} className="text-[13px] font-medium text-[#2f6fb5] hover:text-[#123a6b]">
                  Ripristina
                </button>
              }
            >
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
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
                <Row label="Tensione (kV)">
                  <Num value={technique.kvp} min={50} max={140} step={2} digits={0} onChange={(kvp) => onTechnique({ kvp })} />
                </Row>
                <Row label="Carico (mAs)">
                  <Num value={technique.mas} min={0.5} max={40} step={0.5} digits={1} onChange={(mas) => onTechnique({ mas })} />
                </Row>
                <Row label="DFF (cm)">
                  <Num value={technique.dff} min={100} max={200} step={10} digits={0} onChange={(dff) => onTechnique({ dff })} />
                </Row>
                <Row label="Macchia focale">
                  <Select
                    value={technique.focal}
                    options={[["FINE", "Fine 0,6"], ["GROSSA", "Grossa 1,2"]]}
                    onChange={(focal) => onTechnique({ focal })}
                  />
                </Row>
                <Row label="Griglia">
                  <Select
                    value={technique.grid ? "IN" : "OUT"}
                    options={[["IN", "Inserita 12:1"], ["OUT", "Rimossa"]]}
                    onChange={(value) => onTechnique({ grid: value === "IN" })}
                  />
                </Row>
                <Row label="Coll. largh. (cm)">
                  <Num value={technique.collW} min={20} max={43} step={1} digits={0} onChange={(collW) => onTechnique({ collW })} />
                </Row>
                <Row label="Coll. alt. (cm)">
                  <Num value={technique.collH} min={20} max={43} step={1} digits={0} onChange={(collH) => onTechnique({ collH })} />
                </Row>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e3e9f1] pt-3 text-[13px]">
                <span className="flex items-center gap-2 text-slate-600">
                  <Gauge size={15} />
                  DAP stimato <strong className="font-semibold text-[#14233b] tabular-nums">{formatNum(dap, 2)} dGy·cm²</strong>
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${
                    ratio <= 0.75 ? "bg-emerald-50 text-emerald-700" : ratio <= 1 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {ratio <= 0.75 ? "Sotto DRL" : ratio <= 1 ? "Vicino al DRL" : "Sopra DRL"}
                </span>
              </div>
            </Panel>

            <Panel icon={<Workflow size={18} strokeWidth={1.75} />} title="Workflow del caso">
              <ol className="flex items-start">
                {FLOW.map((label, step) => (
                  <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
                    {step > 0 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute top-4 right-1/2 h-px w-full ${step <= flowIndex ? "bg-[#123a6b]" : "bg-[#d5deea]"}`}
                      />
                    ) : null}
                    <span
                      className={`relative grid h-8 w-8 place-items-center rounded-full border text-[12px] font-semibold ${
                        step < flowIndex
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : step === flowIndex
                            ? "border-[#123a6b] bg-white text-[#123a6b]"
                            : "border-[#d5deea] bg-white text-slate-400"
                      }`}
                    >
                      {step < flowIndex ? <Check size={14} strokeWidth={2.5} /> : step + 1}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] sm:text-[12px] ${
                        step === flowIndex ? "bg-[#e8f0fa] font-medium text-[#123a6b]" : "text-slate-500"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>

            <div className="grid gap-5 sm:grid-cols-2">
              <Panel icon={<Layers size={18} strokeWidth={1.75} />} title="Stato scenario">
                <div className="flex items-center justify-between text-[13px] text-slate-600">
                  <span>
                    {flowIndex} di {FLOW.length} passaggi completati
                  </span>
                  <span className="font-medium tabular-nums">{Math.round((flowIndex / FLOW.length) * 100)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6ecf3]">
                  <div className="h-full rounded-full bg-[#123a6b]" style={{ width: `${(flowIndex / FLOW.length) * 100}%` }} />
                </div>
              </Panel>
              <Panel icon={<ImageIcon size={18} strokeWidth={1.75} />} title="Riferimenti">
                <div className="grid grid-cols-2 gap-3 text-center text-[12px] text-slate-600">
                  <figure>
                    <div className="aspect-[4/3] overflow-hidden rounded-md bg-black">
                      {latest ? <LatentThumb latent={latest.latent} /> : <Empty />}
                    </div>
                    <figcaption className="mt-1.5">Immagine acquisita</figcaption>
                  </figure>
                  <figure>
                    <div className="aspect-[4/3] overflow-hidden rounded-md bg-black">
                      {latest ? <LatentThumb latent={reference} /> : <Empty />}
                    </div>
                    <figcaption className="mt-1.5">Riferimento ottimale</figcaption>
                  </figure>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </section>

      <footer className={`${card} sticky bottom-4 z-20 flex flex-col gap-2 px-3 py-2.5 sm:gap-3 sm:flex-row sm:py-3 sm:items-center sm:justify-between sm:px-6`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-600 sm:text-[14px]">
          <span className="flex items-center gap-2">
            <Layers size={17} strokeWidth={1.75} />
            Scatti <strong className="text-[16px] font-semibold text-[#14233b] tabular-nums">{shots.length}/{MAX_SHOTS}</strong>
          </span>
          <span className="hidden h-6 w-px bg-[#e3e9f1] sm:block" />
          <span className="flex items-center gap-2">
            <Gauge size={17} strokeWidth={1.75} />
            <span className="hidden sm:inline">Dose cumulativa</span><span className="sm:hidden">Dose</span>{" "}
            <strong className="text-[16px] font-semibold text-[#14233b] tabular-nums">{formatNum(cumulativeDap, 2)} dGy·cm²</strong>
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

function Panel({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e3e9f1] bg-white p-4 sm:p-5">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="text-[#123a6b]">{icon}</span>
        <h2 className="font-display text-[17px] font-semibold text-[#14233b]">{title}</h2>
        {action ? <span className="ml-auto">{action}</span> : null}
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] whitespace-nowrap text-slate-700">{label}</span>
      {children}
    </div>
  );
}

const pill = "h-9 w-[118px] shrink-0 rounded-md border border-transparent bg-[#f1f4f8] text-[14px] text-[#14233b] focus-within:border-[#9fb4cf]";

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
      <button type="button" aria-label="Diminuisci" onClick={() => nudge(-1)} className="grid h-full w-8 place-items-center text-slate-500 hover:text-[#123a6b]">
        <Minus size={14} />
      </button>
      <span className="flex-1 text-center font-medium tabular-nums">{formatNum(value, digits)}</span>
      <button type="button" aria-label="Aumenta" onClick={() => nudge(1)} className="grid h-full w-8 place-items-center text-slate-500 hover:text-[#123a6b]">
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
      className={`grid h-8 w-8 place-items-center rounded-md ${active ? "bg-[#e8f0fa] text-[#123a6b]" : "text-slate-500 hover:bg-slate-100"}`}
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
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#d5deea] text-slate-600 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Empty() {
  return <span className="grid h-full w-full place-items-center bg-[#f1f4f8] text-[11px] text-slate-400">Dopo il primo scatto</span>;
}

function LatentThumb({ latent }: { latent: LatentImage }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintLatentToCanvas(ref.current, latent, DEFAULT_WINDOW);
  }, [latent]);
  return <canvas ref={ref} className="h-full w-full object-contain" />;
}
