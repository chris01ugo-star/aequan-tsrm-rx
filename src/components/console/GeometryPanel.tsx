"use client";

import type { Decubitus, Projection, Respiration, Technique } from "@/types/rx";

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

export function GeometryPanel({
  technique,
  onChange,
  pane,
}: GeometryPanelProps & { pane: "room" | "position" }) {
  if (pane === "room") {
    return <RoomSchematic technique={technique} />;
  }
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
      <Segment
        label="Istruzione respiratoria"
        value={technique.respiration}
        options={RESPIRATION}
        onChange={(respiration) => onChange({ respiration })}
      />
      <p className="px-2 py-2 text-[11px] leading-relaxed text-muted">
        {geometryNote(technique)}
      </p>
    </div>
  );
}

function geometryNote(technique: Technique): string {
  if (technique.projection === "LL") {
    return "LL: incidenza complementare. Il quesito di questo caso chiede il PA.";
  }
  if (technique.decubitus === "SUPINO") {
    return "Clinostatismo: il tubo è sopra il tavolo. Anche con PA selezionato il fascio reale è AP.";
  }
  if (technique.projection === "AP") {
    return "AP eretto: cuore lontano dal detettore, magnificazione della silhouette.";
  }
  if (technique.respiration === "LIBERO") {
    return "Respiro libero: atteso mosso di diaframma e basi all'esposizione.";
  }
  if (technique.respiration === "ESP") {
    return "Espirio: volumi ridotti, cuore più trasverso. Il caso richiede inspirio.";
  }
  return "PA, ortostatismo, apnea inspiratoria: geometria di riferimento del torace.";
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
                  ? "border-sky-200 bg-sky-50 text-[#1e3a5f]"
                  : "border-slate-200 bg-white text-slate-500 hover:border-sky-200"
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
      <rect width="360" height="188" fill="#f8fafc" />
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
      <rect width="360" height="188" fill="#f8fafc" />
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
      <rect width="360" height="78" fill="#f8fafc" />
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
