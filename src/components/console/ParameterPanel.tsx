"use client";

import { formatNum } from "@/lib/number";
import { DRL_CHEST_PA } from "@/lib/rxPhysics";
import type { Analysis, Technique } from "@/types/rx";

type ParameterPanelProps = {
  technique: Technique;
  analysis: Analysis;
  onChange: (patch: Partial<Technique>) => void;
};

export function ParameterPanel({ technique, analysis, onChange }: ParameterPanelProps) {
  const dose = analysis.dosimetry;
  return (
    <aside className="mt-3 w-full">
      <div className="grid gap-2 sm:grid-cols-2">
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
        <Stepper
          label="DFF"
          unit="cm"
          value={technique.dff}
          min={100}
          max={200}
          step={10}
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
          value={technique.grid ? "IN" : "OUT"}
          options={[
            { value: "IN" as const, label: "INSERITA 12:1" },
            { value: "OUT" as const, label: "RIMOSSA" },
          ]}
          onChange={(value) => onChange({ grid: value === "IN" })}
        />
        <Stepper
          label="Collimazione larghezza"
          unit="cm"
          value={technique.collW}
          min={20}
          max={43}
          step={1}
          digits={0}
          onChange={(collW) => onChange({ collW })}
        />
        <Stepper
          label="Collimazione altezza"
          unit="cm"
          value={technique.collH}
          min={20}
          max={43}
          step={1}
          digits={0}
          onChange={(collH) => onChange({ collH })}
        />

        <section className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="font-display text-[12px] font-semibold text-[#1e3a5f]">
            Radioprotezione ALARA
          </div>
          <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
            Modello didattico — non è una misura dosimetrica. DAP = kerma in aria × area.
            ESD = kerma × BSF {formatNum(dose.bsf, 2)}.
          </p>
          <DoseReadout
            label="DAP"
            value={formatNum(dose.dapDGyCm2, 2)}
            unit="dGy·cm²"
            ratio={dose.dapDGyCm2 / DRL_CHEST_PA.dapDGyCm2}
            limitLabel={`DRL ${formatNum(DRL_CHEST_PA.dapDGyCm2, 2)}`}
          />
          <DoseReadout
            label="ESD"
            value={formatNum(dose.esdMgy, 3)}
            unit="mGy"
            ratio={dose.esdMgy / DRL_CHEST_PA.esdMgy}
            limitLabel={`DRL ${formatNum(DRL_CHEST_PA.esdMgy, 2)}`}
          />
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[9px] tracking-[0.14em] text-muted">EI</span>
            <span className="font-mono text-[13px] tabular-nums text-cyan-clin">
              {formatNum(dose.ei, 0)}
              <span className="ml-2 text-[9px] text-muted">
                BANDA {DRL_CHEST_PA.eiMin}–{DRL_CHEST_PA.eiMax}
              </span>
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {analysis.warnings.slice(0, 3).map((warning) => (
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
    <label className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuisci ${label}`}
          onClick={() => nudge(-1)}
          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-sm text-[#1e3a5f]"
        >
          −
        </button>
        <span className="min-w-0 flex-1 font-semibold tabular-nums text-[#0f2744]">
          {formatNum(value, digits)}
          <span className="ml-1 text-[11px] font-medium text-slate-400">{unit}</span>
        </span>
        <button
          type="button"
          aria-label={`Aumenta ${label}`}
          onClick={() => nudge(1)}
          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-sm text-[#1e3a5f]"
        >
          +
        </button>
      </span>
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
    </label>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
      <div className="mb-1 text-[11px] font-medium text-slate-500">{label}</div>
      <div className="flex gap-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`h-9 flex-1 rounded-lg border text-[11px] font-semibold ${
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
