"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { overlayMarkers } from "@/lib/chestRenderer";
import { clamp, formatNum } from "@/lib/number";
import {
  computeGeometry,
  DEFAULT_WINDOW,
  LATENT_HEIGHT,
  LATENT_WIDTH,
  paintLatentToCanvas,
} from "@/lib/rxPhysics";
import type {
  Analysis,
  ClinicalCase,
  ExposureShot,
  GrayWindow,
  Technique,
} from "@/types/rx";

type ViewerTool = "wl" | "pan";

type ViewerPanelProps = {
  clinical: ClinicalCase;
  technique: Technique;
  analysis: Analysis;
  shot: ExposureShot | null;
  dirty: boolean;
  acquiring: boolean;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  shots?: ExposureShot[];
  selectedIndex?: number;
  onSelectShot?: (index: number) => void;
  onGray: (patch: Partial<GrayWindow>) => void;
  onView: (patch: { zoom?: number; panX?: number; panY?: number; overlay?: boolean; tool?: ViewerTool }) => void;
  onReset: () => void;
  clean?: boolean;
};

const RESPIRATION_LABEL = {
  INSP: "APNEA INSPIRATORIA",
  ESP: "APNEA ESPIRATORIA",
  LIBERO: "RESPIRO LIBERO",
} as const;

export function ViewerPanel({
  clinical,
  technique,
  analysis,
  shot,
  dirty,
  acquiring,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  shots = [],
  selectedIndex = 0,
  onSelectShot,
  onGray,
  onView,
  onReset,
  clean = false,
}: ViewerPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    mode: ViewerTool;
    ww: number;
    wl: number;
    px: number;
    py: number;
  } | null>(null);

  const shown = shot?.technique ?? technique;
  const dose = shot?.dosimetry ?? analysis.dosimetry;
  const markers = overlayMarkers(computeGeometry(shown));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shot) return;
    paintLatentToCanvas(canvas, shot.latent, gray);
  }, [shot, gray]);

  const fieldLeft = ((1 - technique.collW / 43) / 2) * 100;
  const fieldTop = ((1 - technique.collH / 43) / 2) * 100;

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!shot) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      mode: tool,
      ww: gray.windowWidth,
      wl: gray.windowLevel,
      px: panX,
      py: panY,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (state.mode === "wl") {
      onGray({
        windowWidth: clamp(Math.round(state.ww + dx * 6), 200, 4095),
        windowLevel: clamp(Math.round(state.wl - dy * 4), 0, 4095),
      });
      return;
    }
    onView({ panX: state.px + dx, panY: state.py + dy });
  }

  function onPointerUp() {
    drag.current = null;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="relative h-[min(56vh,520px)] min-h-[300px] w-full bg-black">
        <div
          className="absolute top-1/2 left-1/2 h-full max-w-full"
          style={{
            aspectRatio: `${LATENT_WIDTH} / ${LATENT_HEIGHT}`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`absolute inset-0 overflow-hidden bg-black ${shot ? "cursor-crosshair" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={(event) => {
              const next = clamp(zoom * (event.deltaY > 0 ? 0.9 : 1.1), 1, 5);
              onView({ zoom: Number(next.toFixed(2)) });
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {shot ? (
                <canvas ref={canvasRef} className="h-full w-full" />
              ) : (
                <CenteringField
                  left={fieldLeft}
                  top={fieldTop}
                  lateral={technique.projection === "LL"}
                />
              )}
              {shot && overlay ? (
                <svg
                  viewBox={`0 0 ${LATENT_WIDTH} ${LATENT_HEIGHT}`}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  {markers.map((marker) => {
                    const rightSide = marker.x > 0.58;
                    return (
                      <g key={marker.id}>
                        <circle
                          cx={marker.x * LATENT_WIDTH}
                          cy={marker.y * LATENT_HEIGHT}
                          r="4"
                          fill="none"
                          stroke="#6BA3DE"
                        />
                        <text
                          x={marker.x * LATENT_WIDTH + (rightSide ? -8 : 8)}
                          y={marker.y * LATENT_HEIGHT - 8}
                          fill="#6BA3DE"
                          fontSize="13"
                          fontFamily="ui-monospace, monospace"
                          textAnchor={rightSide ? "end" : "start"}
                        >
                          {marker.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : null}
            </div>
          </div>
        </div>

        {clean ? (
          <>
            <Orientation side={shown.projection === "LL" ? "SX" : "DX"} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-5 gap-y-1 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2 font-sans text-[11px] text-white/85">
              <span>kV {formatNum(shown.kvp, 0)}</span>
              <span>mAs {formatNum(shown.mas, 1)}</span>
              <span>DFF {formatNum(shown.dff, 0)} cm</span>
              <span>{shown.grid ? "Griglia 12:1" : "Senza griglia"}</span>
              <span>EI {shot ? formatNum(dose.ei, 0) : "—"}</span>
            </div>
          </>
        ) : (
          <>
            <Corner className="top-2 left-2" lines={topLeft(clinical, shot)} />
            <Corner className="top-2 right-2 text-right" lines={topRight(shown)} />
            <Corner className="bottom-2 left-2" lines={bottomLeft(shown, shot)} />
            <Corner
              className="right-2 bottom-2 text-right"
              lines={bottomRight(gray, zoom, dose.ei, Boolean(shot))}
            />
          </>
        )}

        {dirty && shot ? (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-amber-700">
            GENERATORE MODIFICATO — IMMAGINE NON AGGIORNATA
          </div>
        ) : null}

        {acquiring ? (
          <>
            <div className="rx-flash pointer-events-none absolute inset-0" />
            <div className="rx-acquire pointer-events-none absolute top-0 right-0 left-0 h-px bg-amber-rx" />
            <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.22em] text-obsidian">
              RAGGI X
            </div>
          </>
        ) : null}
      </div>

      <div className={`${clean ? "hidden" : "flex"} h-9 shrink-0 items-center gap-1.5 overflow-x-auto border-t border-line bg-panel px-2`}>
        <span className="text-[9px] tracking-[0.14em] text-muted">W</span>
        <input
          className="rx-range w-16"
          type="range"
          min={200}
          max={4095}
          step={10}
          value={gray.windowWidth}
          aria-label="Window width"
          onChange={(event) => onGray({ windowWidth: Number(event.target.value) })}
        />
        <span className="w-12 font-mono text-[11px] tabular-nums text-cyan-clin">
          {formatNum(gray.windowWidth, 0)}
        </span>
        <span className="text-[9px] tracking-[0.14em] text-muted">L</span>
        <input
          className="rx-range w-16"
          type="range"
          min={0}
          max={4095}
          step={10}
          value={gray.windowLevel}
          aria-label="Window level"
          onChange={(event) => onGray({ windowLevel: Number(event.target.value) })}
        />
        <span className="w-12 font-mono text-[11px] tabular-nums text-cyan-clin">
          {formatNum(gray.windowLevel, 0)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ToolButton active={tool === "wl"} onClick={() => onView({ tool: "wl" })}>
            W/L
          </ToolButton>
          <ToolButton active={tool === "pan"} onClick={() => onView({ tool: "pan" })}>
            PAN
          </ToolButton>
          <ToolButton onClick={() => onView({ zoom: clamp(Number((zoom / 1.15).toFixed(2)), 1, 5) })}>
            ZOOM −
          </ToolButton>
          <ToolButton onClick={() => onView({ zoom: clamp(Number((zoom * 1.15).toFixed(2)), 1, 5) })}>
            ZOOM +
          </ToolButton>
          <ToolButton onClick={onReset}>RESET</ToolButton>
          <ToolButton active={gray.invert} onClick={() => onGray({ invert: !gray.invert })}>
            INVERTI
          </ToolButton>
          <ToolButton
            active={overlay}
            disabled={!shot}
            onClick={() => onView({ overlay: !overlay })}
          >
            {overlay ? "NASCONDI OVERLAY" : "OVERLAY ANAT."}
          </ToolButton>
        </div>
      </div>
      {onSelectShot ? (
        <Filmstrip
          shots={shots}
          selectedIndex={selectedIndex}
          onSelectShot={onSelectShot}
        />
      ) : null}
    </section>
  );
}

function Filmstrip({
  shots,
  selectedIndex,
  onSelectShot,
}: {
  shots: ExposureShot[];
  selectedIndex: number;
  onSelectShot: (index: number) => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-t border-line bg-panel px-2">
      <span className="shrink-0 text-[9px] tracking-[0.14em] text-muted uppercase">Scatti</span>
      {shots.length === 0 ? (
        <span className="text-[11px] text-muted">Nessuna esposizione in sessione</span>
      ) : (
        shots.map((item, index) => (
          <Thumb
            key={`${item.index}-${item.timestampLabel}`}
            shot={item}
            active={index === selectedIndex}
            onClick={() => onSelectShot(index)}
          />
        ))
      )}
    </div>
  );
}

function Thumb({
  shot,
  active,
  onClick,
}: {
  shot: ExposureShot;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paintLatentToCanvas(canvas, shot.latent, DEFAULT_WINDOW);
  }, [shot]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-black ${
        active ? "border-[#1e3a5f]" : "border-slate-200 hover:border-sky-300"
      }`}
      aria-label={`Rivedi scatto ${shot.index}`}
    >
      <canvas ref={ref} className="h-full w-full object-contain" />
      <span className="absolute right-0 bottom-0 bg-black/70 px-1 font-mono text-[9px] tabular-nums text-white">
        {shot.index}
      </span>
    </button>
  );
}

function topLeft(clinical: ClinicalCase, shot: ExposureShot | null): string[] {
  return [
    "AEQUAN DIDATTICA",
    clinical.pseudoId,
    clinical.demographics,
    `${clinical.weightKg} kg   ${clinical.heightCm} cm`,
    clinical.bodyPart,
    shot ? shot.timestampLabel : "NON ACQUISITO",
  ];
}

function topRight(technique: Technique): string[] {
  const side = technique.projection === "LL" ? "SX" : "DX";
  return [
    side,
    `${technique.projection}  ${technique.decubitus === "ORTOSTATISMO" ? "ORTOSTATISMO" : "SUPINO"}`,
    RESPIRATION_LABEL[technique.respiration],
  ];
}

function bottomLeft(technique: Technique, shot: ExposureShot | null): string[] {
  return [
    shot ? "ACQUISIZIONE" : "PRE-ESPOSIZIONE / CENTRATURA",
    `${formatNum(technique.kvp, 0)} kVp    ${formatNum(technique.mas, 1)} mAs`,
    `DFF ${formatNum(technique.dff, 0)} cm`,
    `${technique.focal === "FINE" ? "FF 0,6 mm" : "FF 1,2 mm"}   ${technique.grid ? "GRIGLIA 12:1" : "NO GRIGLIA"}`,
    `COLL ${formatNum(technique.collW, 0)} × ${formatNum(technique.collH, 0)} cm`,
  ];
}

function bottomRight(
  gray: GrayWindow,
  zoom: number,
  ei: number,
  acquired: boolean,
): string[] {
  return [
    `W ${formatNum(gray.windowWidth, 0)}   L ${formatNum(gray.windowLevel, 0)}`,
    `ZOOM ${formatNum(zoom, 1)}×`,
    acquired ? `EI ${formatNum(ei, 0)}` : "EI —",
    gray.invert ? "INVERSIONE ON" : "MONOCHROME2",
    "NON DIAGNOSTICO",
  ];
}

function Corner({ className, lines }: { className: string; lines: string[] }) {
  return (
    <div
      className={`pointer-events-none absolute font-mono text-[10px] leading-[1.35] tracking-wide text-white drop-shadow ${className}`}
    >
      {lines.map((line, index) => (
        <div key={`${line}-${index}`}>{line}</div>
      ))}
    </div>
  );
}

function Orientation({ side }: { side: "DX" | "SX" }) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 rounded bg-black/50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-white">
      {side === "DX" ? "R" : "L"}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-7 shrink-0 rounded-lg border px-2 text-[10px] font-semibold disabled:text-slate-300 ${
        active
          ? "border-sky-200 bg-sky-50 text-[#1e3a5f]"
          : "border-slate-200 bg-white text-slate-500 hover:border-sky-200"
      }`}
    >
      {children}
    </button>
  );
}

function CenteringField({
  left,
  top,
  lateral,
}: {
  left: number;
  top: number;
  lateral: boolean;
}) {
  const clip = `inset(${top}% ${left}% ${top}% ${left}%)`;
  return (
    <div className="absolute inset-0 bg-black">
      <ChestGuide lateral={lateral} className="opacity-20" />
      <div
        className="absolute border border-[#F39C12] bg-[rgba(243,156,18,0.08)]"
        style={{ left: `${left}%`, top: `${top}%`, right: `${left}%`, bottom: `${top}%` }}
      >
        <div className="absolute top-1/2 right-0 left-0 h-px bg-[rgba(107,163,222,0.85)]" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[rgba(107,163,222,0.85)]" />
      </div>
      <ChestGuide lateral={lateral} className="opacity-80" style={{ clipPath: clip }} />
          <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center px-6">
            <div className="max-w-md rounded-xl border border-white/15 bg-black/70 px-3 py-1.5 text-center">
              <p className="font-display text-[12px] leading-snug text-white">
            Imposta i parametri di acquisizione, poi avvia l’esposizione
          </p>
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-amber-rx">
            LUCE DI COLLIMAZIONE
          </p>
        </div>
      </div>
    </div>
  );
}

function ChestGuide({
  lateral,
  className,
  style,
}: {
  lateral: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 116"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    >
      {lateral ? (
        <ellipse cx="50" cy="58" rx="22" ry="40" fill="none" stroke="#6BA3DE" strokeWidth="0.6" />
      ) : (
        <g fill="none" stroke="#6BA3DE" strokeWidth="0.6">
          <path d="M50 8 C62 8 78 14 84 22 C90 32 88 48 86 70 C84 88 80 102 74 108 L26 108 C20 102 16 88 14 70 C12 48 10 32 16 22 C22 14 38 8 50 8 Z" />
          <path d="M42 22 C32 24 24 34 22 52 C20 70 24 86 32 92 C40 86 44 70 44 52 C44 36 44 26 42 22 Z" />
          <path d="M58 22 C68 24 76 34 78 52 C80 72 76 90 66 96 C58 88 56 70 56 54 C56 40 56 28 58 22 Z" />
        </g>
      )}
    </svg>
  );
}

export type { ViewerTool };
