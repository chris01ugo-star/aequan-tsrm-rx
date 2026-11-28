"use client";

import { useEffect, useRef } from "react";
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
      className={`rounded-md border px-2 py-1 text-left text-[11px] leading-tight ${
        on
          ? "border-[#2d4f7a] bg-[#edf1f6] font-medium text-[#2d4f7a]"
          : "border-[#e7eaef] text-[#334155] hover:border-[#2d4f7a]"
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
  center,
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
  center?: number;
  onChange: (value: number) => void;
  resetLabel?: string;
  onReset?: () => void;
  hint?: string;
}) {
  const next = (dir: number) => {
    const raw = Math.round((value + dir * step) * 10) / 10;
    onChange(Math.min(max, Math.max(min, raw)));
  };
  const span = Math.max(0.001, max - min);
  const marker = ((value - min) / span) * 100;
  const origin = center === undefined ? null : ((center - min) / span) * 100;
  return (
    <div className="flex h-[34px] items-center gap-1" title={hint}>
      <span className="w-14 shrink-0 truncate text-[11px] text-slate-500">{label}</span>
      <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#1f2b3b]">
        {formatNum(value, digits)}
        {unit}
      </span>
      <span className="relative mx-0.5 h-1 min-w-6 flex-1 rounded-full bg-[#e7eaef]">
        {origin !== null ? (
          <span className="absolute top-[-2px] h-2 w-px bg-[#94a3b8]" style={{ left: `${origin}%` }} />
        ) : null}
        <span className="absolute top-[-1px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#2d4f7a]" style={{ left: `${marker}%` }} />
      </span>
      <HoldButton label="−" title={`Diminuisci ${label}`} onStep={() => next(-1)} />
      <HoldButton label="+" title={`Aumenta ${label}`} onStep={() => next(1)} />
      {onReset ? (
        <button
          type="button"
          title={resetLabel ?? "Reset"}
          onClick={onReset}
          className="h-7 shrink-0 rounded-md border border-[#e7eaef] bg-[#f4f6f9] px-1.5 text-[11px] text-[#1f2b3b] hover:border-[#2d4f7a]"
        >
          ↺
        </button>
      ) : null}
    </div>
  );
}

function HoldButton({ label, title, onStep }: { label: string; title: string; onStep: () => void }) {
  const step = useRef(onStep);
  const delay = useRef<number | null>(null);
  const repeat = useRef<number | null>(null);
  useEffect(() => {
    step.current = onStep;
  }, [onStep]);
  const stop = () => {
    if (delay.current !== null) window.clearTimeout(delay.current);
    if (repeat.current !== null) window.clearInterval(repeat.current);
    delay.current = null;
    repeat.current = null;
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onPointerDown={(event) => {
        event.preventDefault();
        step.current();
        delay.current = window.setTimeout(() => {
          repeat.current = window.setInterval(() => step.current(), 70);
        }, 260);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      className="h-6 w-6 shrink-0 rounded-md border border-[#e7eaef] bg-[#f4f6f9] text-[13px] text-[#1f2b3b] hover:border-[#2d4f7a]"
    >
      {label}
    </button>
  );
}

export function Guide({ text }: { text: string }) {
  return (
    <p className="shrink-0 rounded-lg border border-[#e7eaef] bg-[#f4f6f9] px-3 py-1.5 text-[12px] leading-snug text-slate-500">
      {text}
    </p>
  );
}
