"use client";

import { formatNum } from "@/lib/number";

export function Pick({
  on,
  onClick,
  children,
  title,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] leading-snug ${
        on
          ? "border-[#F8FAFC] bg-[#F8FAFC] font-medium text-[#1E324E]"
          : "border-[#2A486D] text-[#F8FAFC] hover:border-[#6BA3DE]"
      }`}
    >
      {children}
    </button>
  );
}

export function FieldStep({
  label,
  value,
  unit,
  digits,
  step,
  min,
  max,
  onChange,
  resetLabel,
  onReset,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  digits: number;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  resetLabel?: string;
  onReset?: () => void;
  hint?: string;
}) {
  const next = (dir: number) => {
    const raw = Math.round((value + dir * step) * 10) / 10;
    onChange(Math.min(max, Math.max(min, raw)));
  };
  return (
    <div className="border-b border-[#2A486D] py-1.5" title={hint}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#9FB3C8]">{label}</span>
        <span className="font-mono text-[13px] tabular-nums">
          {formatNum(value, digits)} {unit}
        </span>
      </div>
      <div className="mt-1 flex gap-1">
        <StepButton label="−" onClick={() => next(-1)} />
        <StepButton label="+" onClick={() => next(1)} />
        {resetLabel && onReset ? <StepButton label={resetLabel} onClick={onReset} wide /> : null}
      </div>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-[#6BA3DE]">{hint}</p> : null}
    </div>
  );
}

function StepButton({ label, onClick, wide = false }: { label: string; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-md border border-[#2A486D] bg-[#111D30] text-[12px] text-[#F8FAFC] hover:border-[#6BA3DE] ${
        wide ? "px-2" : "w-8"
      }`}
    >
      {label}
    </button>
  );
}

export function Guide({ text }: { text: string }) {
  return (
    <p className="shrink-0 rounded-lg border border-[#2A486D] bg-[#111D30] px-3 py-1.5 text-[12px] leading-snug text-[#9FB3C8]">
      {text}
    </p>
  );
}
