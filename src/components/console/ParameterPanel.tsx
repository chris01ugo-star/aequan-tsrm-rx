"use client";

import { formatNum } from "@/lib/number";
import { analyzeTechnique, describeDeviationIndex, DRL_CHEST_PA } from "@/lib/rxPhysics";
import { COLL_MAX_CM, COLL_MIN_CM, SID_MAX_CM, SID_MIN_CM, SID_STEP_CM } from "@/lib/rxGeometry";
import type { AecDensityStep, ExposureShot, Technique } from "@/types/rx";

type ParameterPanelProps = {
  technique: Technique;
  shot?: ExposureShot | null;
  onChange: (patch: Partial<Technique>) => void;
};

const DENSITY_STEPS: AecDensityStep[] = [-2, -1, 0, 1, 2];

export function ParameterPanel({ technique, shot = null, onChange }: ParameterPanelProps) {
  const acquired = shot?.dosimetry ?? null;
  const post = shot ? analyzeTechnique(shot.technique) : null;
  const di = acquired ? describeDeviationIndex(acquired.di) : null;
  const diText = acquired ? `${acquired.di > 0 ? "+" : ""}${formatNum(acquired.di, 1)}` : "—";
  const diColor = !di ? "#9FB3C8" : di.tone === "ok" ? "#6BA3DE" : di.tone === "warn" ? "#F39C12" : "#EF4444";
  const aec = technique.exposureMode === "aec";
  const noChamber = aec && !technique.aecChambers.left && !technique.aecChambers.center && !technique.aecChambers.right;
  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-panel">
      <div className="flex h-8 shrink-0 items-center border-b border-line px-2">
        <span className="text-[10px] tracking-[0.14em] text-muted uppercase">
          Console di acquisizione
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rx-scroll">
        <Stepper
          label="kVp"
          unit="kVp"
          value={technique.kvp}
          min={50}
          max={140}
          step={2}
          digits={0}
          onChange={(kvp) => onChange({ kvp })}
        />
        {aec ? (
          <div className="border-b border-line px-2 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[9px] tracking-[0.14em] text-muted uppercase">mAs</span>
              <span className="font-mono text-[11px] text-ice">AUTO — terminazione AEC</span>
            </div>
          </div>
        ) : (
          <Stepper
            label="mAs"
            unit="mAs"
            value={technique.mas}
            min={0.5}
            max={40}
            step={0.5}
            digits={1}
            onChange={(mas) => onChange({ mas })}
          />
        )}
        <div className="border-b border-line px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] tracking-[0.14em] text-muted uppercase">Esposizione</span>
            <div className="flex gap-1">
              <Mini on={technique.exposureMode === "manual"} onClick={() => onChange({ exposureMode: "manual" })}>
                MANUALE
              </Mini>
              <Mini on={aec} onClick={() => onChange({ exposureMode: "aec" })}>
                AEC
              </Mini>
            </div>
          </div>
          {aec ? (
            <>
              <div className="mt-1.5 flex gap-1">
                <Mini
                  on={technique.aecChambers.right}
                  onClick={() => onChange({ aecChambers: { ...technique.aecChambers, right: !technique.aecChambers.right } })}
                >
                  DX
                </Mini>
                <Mini
                  on={technique.aecChambers.center}
                  onClick={() => onChange({ aecChambers: { ...technique.aecChambers, center: !technique.aecChambers.center } })}
                >
                  C
                </Mini>
                <Mini
                  on={technique.aecChambers.left}
                  onClick={() => onChange({ aecChambers: { ...technique.aecChambers, left: !technique.aecChambers.left } })}
                >
                  SX
                </Mini>
              </div>
              <div className="mt-1 flex gap-1">
                {DENSITY_STEPS.map((step) => (
                  <Mini
                    key={step}
                    on={technique.aecDensityStep === step}
                    onClick={() => onChange({ aecDensityStep: step })}
                  >
                    {step > 0 ? `+${step}` : `${step}`}
                  </Mini>
                ))}
              </div>
              {noChamber ? (
                <p className="mt-1 text-[10px] leading-snug text-amber-rx">Seleziona almeno una camera AEC.</p>
              ) : null}
            </>
          ) : null}
        </div>
        <Stepper
          label="DFF"
          unit="cm"
          value={technique.dff}
          min={SID_MIN_CM}
          max={SID_MAX_CM}
          step={SID_STEP_CM}
          digits={0}
          onChange={(dff) => onChange({ dff })}
        />
        <ToggleRow
          label="Macchia focale"
          value={technique.focal}
          options={[
            { value: "FINE" as const, label: "FINE 0,6 mm" },
            { value: "GROSSA" as const, label: "GROSSA 1,2 mm" },
          ]}
          onChange={(focal) => onChange({ focal })}
        />
        <ToggleRow
          label="Griglia antidiffusione"
          value={technique.gridMode}
          options={[
            { value: "none" as const, label: "RIMOSSA" },
            { value: "focused_100" as const, label: "FOC. 100" },
            { value: "focused_180" as const, label: "FOC. 180" },
          ]}
          onChange={(gridMode) => onChange({ gridMode, grid: gridMode !== "none" })}
        />
        <Stepper
          label="Collimazione larghezza"
          unit="cm"
          value={technique.collW}
          min={COLL_MIN_CM}
          max={COLL_MAX_CM}
          step={1}
          digits={0}
          onChange={(collW) => onChange({ collW })}
        />
        <Stepper
          label="Collimazione altezza"
          unit="cm"
          value={technique.collH}
          min={COLL_MIN_CM}
          max={COLL_MAX_CM}
          step={1}
          digits={0}
          onChange={(collH) => onChange({ collH })}
        />

        <section className="border-b border-line px-2 py-2">
          <div className="font-display text-[11px] tracking-[0.12em] text-ice uppercase">
            Radioprotezione ALARA
          </div>
          <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
            Campo {formatNum(technique.collW, 0)}×{formatNum(technique.collH, 0)} cm ·{" "}
            {technique.gridMode === "none"
              ? "griglia rimossa"
              : technique.gridMode === "focused_100"
                ? "griglia 100 cm"
                : "griglia 180 cm"}{" "}
            · fuoco {technique.focal === "FINE" ? "0,6 mm" : "1,2 mm"}
          </p>
          {acquired && shot ? (
            <>
              <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
                Modello didattico. DAP = kerma in aria × area. ESD = kerma × BSF {formatNum(acquired.bsf, 2)}.
              </p>
              <DoseReadout
                label="DAP"
                value={formatNum(acquired.dapDGyCm2, 2)}
                unit="dGy·cm²"
                ratio={acquired.dapDGyCm2 / DRL_CHEST_PA.dapDGyCm2}
                limitLabel={`DRL ${formatNum(DRL_CHEST_PA.dapDGyCm2, 2)}`}
              />
              <DoseReadout
                label="ESD"
                value={formatNum(acquired.esdMgy, 3)}
                unit="mGy"
                ratio={acquired.esdMgy / DRL_CHEST_PA.esdMgy}
                limitLabel={`DRL ${formatNum(DRL_CHEST_PA.esdMgy, 2)}`}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] tracking-[0.14em] text-muted">EI</span>
                    <span className="font-mono text-[13px] tabular-nums text-cyan-clin">
                      {formatNum(acquired.ei, 0)}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] text-muted">target {acquired.eiTarget}</p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] tracking-[0.14em] text-muted">DI</span>
                    <span className="font-mono text-[13px] tabular-nums" style={{ color: diColor }}>
                      {diText}
                    </span>
                  </div>
                  <p className="font-mono text-[9px]" style={{ color: diColor }}>
                    {di?.label} · IEC 62494-1
                  </p>
                </div>
              </div>
              <p className="mt-1 font-mono text-[9px] text-muted">
                mAs erogati {formatNum(shot.technique.mas, 1)} · t {formatNum(acquired.exposureTimeMs, 0)} ms
              </p>
              <ul className="mt-2 space-y-1">
                {post?.warnings.slice(0, 3).map((warning) => (
                  <li
                    key={warning.text}
                    className={`text-[10px] leading-snug ${
                      warning.level === "alert"
                        ? "text-risk"
                        : warning.level === "warn"
                          ? "text-amber-rx"
                          : "text-muted"
                    }`}
                  >
                    {warning.text}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] tracking-[0.14em] text-muted">EI</span>
                <p className="font-mono text-[13px] text-ice">—</p>
              </div>
              <div>
                <span className="text-[9px] tracking-[0.14em] text-muted">DI</span>
                <p className="font-mono text-[13px] text-ice">—</p>
                <p className="font-mono text-[9px] text-muted">post-esposizione</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function DoseReadout({
  label,
  value,
  unit,
  ratio,
  limitLabel,
}: {
  label: string;
  value: string;
  unit: string;
  ratio: number;
  limitLabel: string;
}) {
  const color = ratio <= 0.75 ? "#22C55E" : ratio <= 1 ? "#F39C12" : "#EF4444";
  const state = ratio <= 0.75 ? "SOTTO DRL" : ratio <= 1 ? "VICINO AL DRL" : "SOPRA DRL";
  const width = Math.min(ratio / 1.6, 1) * 100;
  const limitMark = (1 / 1.6) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] tracking-[0.14em] text-muted">{label}</span>
        <span className="font-mono text-[15px] tabular-nums leading-none text-ice">
          {value}
          <span className="ml-1 text-[9px] text-muted">{unit}</span>
        </span>
      </div>
      <div className="relative mt-1 h-2 border border-line">
        <div className="absolute top-0 left-0 h-full" style={{ width: `${width}%`, background: color }} />
        <div
          className="absolute top-[-2px] h-3 w-px bg-muted"
          style={{ left: `${limitMark}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[9px] tabular-nums">
        <span style={{ color }}>{state}</span>
        <span className="text-muted">{limitLabel}</span>
      </div>
    </div>
  );
}

function Mini({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 min-w-0 flex-1 rounded-md border px-1 font-mono text-[10px] ${
        on ? "border-[#F8FAFC] bg-[#F8FAFC] text-[#1E324E]" : "border-line bg-raised text-ice"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  unit,
  value,
  min,
  max,
  step,
  digits,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  digits: number;
  onChange: (value: number) => void;
}) {
  const nudge = (direction: number) => {
    const next = Math.round((value + direction * step) / step) * step;
    const clamped = Math.min(max, Math.max(min, next));
    onChange(Number(clamped.toFixed(digits)));
  };

  return (
    <div className="border-b border-line px-2 py-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] tracking-[0.14em] text-muted uppercase">{label}</span>
        <span className="font-mono text-[13px] tabular-nums text-cyan-clin">
          {formatNum(value, digits)}
          <span className="ml-1 text-[9px] text-muted">{unit}</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <button
          type="button"
          aria-label={`Diminuisci ${label}`}
          onClick={() => nudge(-1)}
          className="h-5 w-5 border border-line bg-raised font-mono text-[12px] text-ice hover:border-cyan-clin hover:text-cyan-clin"
        >
          −
        </button>
        <input
          className="rx-range min-w-0 flex-1"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <button
          type="button"
          aria-label={`Aumenta ${label}`}
          onClick={() => nudge(1)}
          className="h-5 w-5 border border-line bg-raised font-mono text-[12px] text-ice hover:border-cyan-clin hover:text-cyan-clin"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleRow<T extends string>({
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
      <div className="mb-1 text-[9px] tracking-[0.14em] text-muted uppercase">{label}</div>
      <div className="flex">
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`h-8 flex-1 rounded-lg border font-mono text-[10px] ${
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
