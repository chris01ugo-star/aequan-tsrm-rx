"use client";

import { formatNum } from "@/lib/number";
import {
  CENTER_X_MAX_CM,
  CENTER_X_MIN_CM,
  CENTER_Y_MAX_CM,
  CENTER_Y_MIN_CM,
  computeRoomMetrics,
  ROTATION_MAX_DEG,
  ROTATION_MIN_DEG,
  toRoomGeometry,
  TUBE_CC_MAX_DEG,
  TUBE_CC_MIN_DEG,
  TUBE_ML_MAX_DEG,
  TUBE_ML_MIN_DEG,
} from "@/lib/rxGeometry";
import type { Decubitus, MarkerSide, Projection, Respiration, Technique } from "@/types/rx";

type GeometryPanelProps = {
  technique: Technique;
  onChange: (patch: Partial<Technique>) => void;
};

const PROJECTIONS: { value: Projection; label: string }[] = [
  { value: "PA", label: "PA" },
  { value: "AP", label: "AP" },
  { value: "LL", label: "LL" },
];

const DECUBITUS: { value: Decubitus; label: string }[] = [
  { value: "ORTOSTATISMO", label: "ORTOST." },
  { value: "SUPINO", label: "SUPINO" },
];

const RESPIRATION: { value: Respiration; label: string }[] = [
  { value: "INSP", label: "INSPIRIO" },
  { value: "ESP", label: "ESPIRIO" },
  { value: "LIBERO", label: "LIBERO" },
];

const MARKERS: { value: MarkerSide; label: string }[] = [
  { value: "none", label: "NESSUNO" },
  { value: "DX", label: "DX" },
  { value: "SX", label: "SX" },
];

export function GeometryPanel({
  technique,
  onChange,
  pane,
  onOpenRoom,
}: GeometryPanelProps & { pane: "room" | "position"; onOpenRoom?: () => void }) {
  if (pane === "room") {
    return <RoomSchematic technique={technique} />;
  }
  const metrics = computeRoomMetrics(toRoomGeometry(technique));
  return (
    <div>
      <Segment
        label="Proiezione"
        value={technique.projection}
        options={PROJECTIONS}
        onChange={(projection) => onChange({ projection })}
      />
      <Segment
        label="Decubito"
        value={technique.decubitus}
        options={DECUBITUS}
        onChange={(decubitus) => onChange({ decubitus })}
      />
      <Slider
        label="Rotazione assiale"
        unit="°"
        value={technique.patientRotationDeg}
        min={ROTATION_MIN_DEG}
        max={ROTATION_MAX_DEG}
        step={1}
        digits={0}
        signed
        onChange={(patientRotationDeg) => onChange({ patientRotationDeg })}
      />
      <Toggle
        label="Spalle"
        on={technique.shouldersRolledForward}
        onLabel="RUOTATE AVANTI"
        offLabel="NEUTRE"
        onChange={(shouldersRolledForward) => onChange({ shouldersRolledForward })}
      />
      <Slider
        label="Centratura X"
        unit="cm"
        value={technique.centeringOffsetXCm}
        min={CENTER_X_MIN_CM}
        max={CENTER_X_MAX_CM}
        step={0.5}
        digits={1}
        signed
        onChange={(centeringOffsetXCm) => onChange({ centeringOffsetXCm })}
      />
      <Slider
        label="Centratura Y"
        unit="cm"
        value={technique.centeringOffsetYCm}
        min={CENTER_Y_MIN_CM}
        max={CENTER_Y_MAX_CM}
        step={0.5}
        digits={1}
        signed
        onChange={(centeringOffsetYCm) => onChange({ centeringOffsetYCm })}
      />
      <Slider
        label="Angolazione tubo CC"
        unit="°"
        value={technique.tubeAngulationCCDeg}
        min={TUBE_CC_MIN_DEG}
        max={TUBE_CC_MAX_DEG}
        step={1}
        digits={0}
        signed
        onChange={(tubeAngulationCCDeg) => onChange({ tubeAngulationCCDeg })}
      />
      <Slider
        label="Angolazione tubo ML"
        unit="°"
        value={technique.tubeAngulationMLDeg}
        min={TUBE_ML_MIN_DEG}
        max={TUBE_ML_MAX_DEG}
        step={1}
        digits={0}
        signed
        onChange={(tubeAngulationMLDeg) => onChange({ tubeAngulationMLDeg })}
      />
      <Segment
        label="Respiro"
        value={technique.respiration}
        options={RESPIRATION}
        onChange={(respiration) => onChange({ respiration })}
      />
      <Segment
        label="Marker"
        value={technique.markerSide}
        options={MARKERS}
        onChange={(markerSide) => onChange({ markerSide })}
      />
      <p className="px-2 py-2 font-mono text-[10px] leading-relaxed text-[#9FB3C8] tabular-nums">
        OID {formatNum(metrics.oidCm, 1)} cm · M {formatNum(metrics.magnification, 2)} · Ug{" "}
        {formatNum(metrics.ugMm, 2)} mm
      </p>
      {onOpenRoom ? (
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={onOpenRoom}
            className="h-8 w-full rounded-lg border border-[#2A486D] bg-[#111D30] text-[11px] text-[#F8FAFC] hover:border-[#6BA3DE]"
          >
            Apri sala 3D
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="border-b border-line px-2 py-1.5">
      <div className="mb-1 text-[9px] tracking-[0.16em] text-muted uppercase">
        {label}
      </div>
      <div className="flex">
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`h-8 flex-1 rounded-lg border text-[10px] tracking-[0.04em] ${
                index > 0 ? "ml-1" : ""
              } ${
                active
                  ? "border-[#F8FAFC] bg-[#F8FAFC] text-[#1E324E]"
                  : "border-[#2A486D] bg-[#111D30] text-[#F8FAFC] hover:border-[#345884]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  digits,
  signed,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  digits: number;
  signed?: boolean;
  onChange: (value: number) => void;
}) {
  const shown = formatNum(value, digits);
  const text = signed && value > 0 ? `+${shown}` : shown;
  return (
    <div className="border-b border-[#2A486D] px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] tracking-[0.14em] text-[#9FB3C8] uppercase">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-[#6BA3DE]">
          {text}
          <span className="ml-1 text-[9px] text-[#9FB3C8]">{unit}</span>
        </span>
      </div>
      <input
        className="rx-range mt-1 w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Toggle({
  label,
  on,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="border-b border-[#2A486D] px-2 py-1.5">
      <div className="mb-1 text-[9px] tracking-[0.14em] text-[#9FB3C8] uppercase">{label}</div>
      <div className="flex">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`h-8 flex-1 rounded-lg border text-[10px] ${
            on
              ? "border-[#2A486D] bg-[#111D30] text-[#F8FAFC]"
              : "border-[#F8FAFC] bg-[#F8FAFC] text-[#1E324E]"
          }`}
        >
          {offLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`ml-1 h-8 flex-1 rounded-lg border text-[10px] ${
            on
              ? "border-[#F8FAFC] bg-[#F8FAFC] text-[#1E324E]"
              : "border-[#2A486D] bg-[#111D30] text-[#F8FAFC]"
          }`}
        >
          {onLabel}
        </button>
      </div>
    </div>
  );
}

function RoomSchematic({ technique }: { technique: Technique }) {
  const supine = technique.decubitus === "SUPINO";
  return (
    <div className="border-b border-line">
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span className="text-[9px] tracking-[0.16em] text-muted">
          {supine ? "VISTA LATERALE — CLINOSTATISMO" : "VISTA LATERALE SALA"}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-cyan-clin">
          {technique.collH.toFixed(0)} cm CC
        </span>
      </div>
      <svg
        viewBox="0 0 360 188"
        className="h-[118px] w-full"
        role="img"
        aria-label={`Schema sala radiologica, DFF ${technique.dff} centimetri, collimazione ${technique.collW} per ${technique.collH} centimetri`}
      >
        {supine ? (
          <SupineView dff={technique.dff} collH={technique.collH} />
        ) : (
          <ErectView dff={technique.dff} collH={technique.collH} lateral={technique.projection === "LL"} />
        )}
      </svg>
      <div className="flex items-center justify-between border-t border-line px-2 pt-1">
        <span className="text-[9px] tracking-[0.16em] text-muted">VISTA ASSIALE</span>
        <span className="font-mono text-[10px] tabular-nums text-cyan-clin">
          {technique.collW.toFixed(0)} cm LL
        </span>
      </div>
      <svg viewBox="0 0 360 78" className="h-[56px] w-full" aria-hidden="true">
        <AxialView dff={technique.dff} collW={technique.collW} supine={supine} />
      </svg>
    </div>
  );
}

function ErectView({
  dff,
  collH,
  lateral,
}: {
  dff: number;
  collH: number;
  lateral: boolean;
}) {
  const detX = 312;
  const detTop = 22;
  const detBot = 150;
  const detH = detBot - detTop;
  const focalX = detX - (dff / 200) * 214;
  const focalY = (detTop + detBot) / 2;
  const open = (collH / 43) * detH;
  const y1 = focalY - open / 2;
  const y2 = focalY + open / 2;
  const tubeX = focalX - 28;

  return (
    <g>
      <rect width="360" height="188" fill="#0C1526" />
      <line x1="8" y1="164" x2="352" y2="164" stroke="#94A3B8" />
      <line x1="8" y1="18" x2="8" y2="164" stroke="#94A3B8" />
      <polygon
        points={`${focalX},${focalY} ${detX},${y1} ${detX},${y2}`}
        fill="rgba(107,163,222,0.13)"
        stroke="#6BA3DE"
        strokeWidth="1"
      />
      <g>
        <rect x={tubeX} y={focalY - 16} width="26" height="32" fill="#16253B" stroke="#94A3B8" />
        <rect x={tubeX + 26} y={focalY - 7} width="10" height="14" fill="#1A1208" stroke="#F39C12" />
        <circle cx={focalX} cy={focalY} r="1.6" fill="#6BA3DE" />
        <text x={tubeX + 13} y={focalY - 22} textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">
          TUBO
        </text>
      </g>
      <g>
        {lateral ? (
          <ellipse cx="268" cy="108" rx="16" ry="46" fill="#1E324E" stroke="#6BA3DE" />
        ) : (
          <>
            <circle cx="286" cy="46" r="8" fill="#1E324E" stroke="#6BA3DE" />
            <path
              d="M258 70 L278 62 L292 66 L300 92 L296 150 L262 150 L258 100 Z"
              fill="#1E324E"
              stroke="#6BA3DE"
            />
          </>
        )}
        <text x="268" y="176" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">
          PAZIENTE
        </text>
      </g>
      <g>
        <rect x={detX} y={detTop} width="14" height={detH} fill="#0E141C" stroke="#94A3B8" />
        <line x1={detX + 4} y1={y1} x2={detX + 10} y2={y1} stroke="#F39C12" />
        <line x1={detX + 4} y1={y2} x2={detX + 10} y2={y2} stroke="#F39C12" />
        <text x={detX + 7} y="16" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">
          DET.
        </text>
      </g>
      <line x1={focalX} y1="176" x2={detX} y2="176" stroke="#6BA3DE" />
      <line x1={focalX} y1="172" x2={focalX} y2="180" stroke="#6BA3DE" />
      <line x1={detX} y1="172" x2={detX} y2="180" stroke="#6BA3DE" />
      <text
        x={(focalX + detX) / 2}
        y="174"
        textAnchor="middle"
        fill="#6BA3DE"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
      >
        {dff.toFixed(0)} cm
      </text>
    </g>
  );
}

function SupineView({ dff, collH }: { dff: number; collH: number }) {
  const tableY = 132;
  const focalY = tableY - 22 - ((dff - 100) / 100) * 78;
  const focalX = 180;
  const field = (collH / 43) * 150;
  const x1 = focalX - field / 2;
  const x2 = focalX + field / 2;

  return (
    <g>
      <rect width="360" height="188" fill="#0C1526" />
      <polygon
        points={`${focalX},${focalY} ${x1},${tableY} ${x2},${tableY}`}
        fill="rgba(107,163,222,0.13)"
        stroke="#6BA3DE"
      />
      <rect x={focalX - 16} y={focalY - 22} width="32" height="20" fill="#16253B" stroke="#94A3B8" />
      <rect x={focalX - 7} y={focalY - 2} width="14" height="8" fill="#1A1208" stroke="#F39C12" />
      <circle cx={focalX} cy={focalY} r="1.6" fill="#6BA3DE" />
      <text x={focalX} y={focalY - 28} textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">
        TUBO
      </text>
      <rect x="78" y={tableY} width="204" height="6" fill="#233044" />
      <rect x="86" y={tableY + 8} width="188" height="8" fill="#0E141C" stroke="#94A3B8" />
      <ellipse cx="180" cy={tableY - 10} rx="78" ry="12" fill="#1E324E" stroke="#6BA3DE" />
      <circle cx="96" cy={tableY - 16} r="8" fill="#1E324E" stroke="#6BA3DE" />
      <line x1={x1} y1={tableY + 8} x2={x1} y2={tableY + 16} stroke="#F39C12" />
      <line x1={x2} y1={tableY + 8} x2={x2} y2={tableY + 16} stroke="#F39C12" />
      <text x="180" y="176" textAnchor="middle" fill="#6BA3DE" fontSize="10" fontFamily="ui-monospace, monospace">
        DFF {dff.toFixed(0)} cm
      </text>
    </g>
  );
}

function AxialView({
  dff,
  collW,
  supine,
}: {
  dff: number;
  collW: number;
  supine: boolean;
}) {
  const detX = 312;
  const focalX = detX - (dff / 200) * 214;
  const midY = 36;
  const open = (collW / 43) * 52;
  const y1 = midY - open / 2;
  const y2 = midY + open / 2;

  return (
    <g>
      <rect width="360" height="78" fill="#0C1526" />
      <polygon
        points={`${focalX},${midY} ${detX},${y1} ${detX},${y2}`}
        fill="rgba(107,163,222,0.12)"
        stroke="#6BA3DE"
      />
      <rect x={focalX - 16} y={midY - 8} width="16" height="16" fill="#16253B" stroke="#94A3B8" />
      <ellipse cx="270" cy={midY} rx={supine ? 18 : 14} ry={supine ? 10 : 16} fill="#1E324E" stroke="#6BA3DE" />
      <rect x={detX} y="12" width="10" height="48" fill="#0E141C" stroke="#94A3B8" />
      <text x="20" y="16" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">
        LARGH. FASCIO
      </text>
    </g>
  );
}
