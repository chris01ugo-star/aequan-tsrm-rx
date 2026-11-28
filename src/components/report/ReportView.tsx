"use client";

import { useState } from "react";
import Image from "next/image";
import { CHEST_PA_REFERENCE } from "@/data/cases";
import { primaryBtn, secondaryBtn } from "@/components/ui/buttons";
import { formatNum } from "@/lib/number";
import { DRL_CHEST_PA } from "@/lib/rxPhysics";
import type { Evaluation, ExposureShot, Finding, Technique } from "@/types/rx";

export function ReportView({
  evaluation,
  shot,
  shotCount,
  cumulativeDap,
  durationSec,
  onLibrary,
  onRepeat,
}: {
  evaluation: Evaluation;
  shot: ExposureShot;
  shotCount: number;
  cumulativeDap: number;
  durationSec: number;
  onLibrary: () => void;
  onRepeat: () => void;
}) {
  const [open, setOpen] = useState<string | null>(evaluation.sections[0]?.id ?? null);
  const idoneo = evaluation.total >= 18;
  const ratio = evaluation.total / evaluation.max;
  const drl = shot.dosimetry.dapDGyCm2 > DRL_CHEST_PA.dapDGyCm2 || cumulativeDap > DRL_CHEST_PA.dapDGyCm2;
  const wrong =
    shot.technique.projection !== "PA" || shot.technique.decubitus === "SUPINO";
  const strengths = evaluation.sections.flatMap((section) =>
    section.findings.filter((finding) => finding.level === "ok"),
  ).slice(0, 3);
  const fixes = evaluation.sections.flatMap((section) =>
    section.findings.filter((finding) => finding.level === "error"),
  ).slice(0, 4);
  const clock = `${String(Math.floor(durationSec / 60)).padStart(2, "0")}:${String(durationSec % 60).padStart(2, "0")}`;
  const doseRatio = Math.min(cumulativeDap / DRL_CHEST_PA.dapDGyCm2, 1.4);

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 text-[#0f2744] sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onLibrary} className={secondaryBtn}>
          ← Dashboard
        </button>
        <Image src="/aequan-logo-horizontal.png" alt="Aequan" width={140} height={28} className="h-7 w-auto" />
      </div>

      <article className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b-4 border-[#3b82f6] px-4 py-5 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.24em] text-[#1d4f91] uppercase">
            TSRM RX · Pre-valutazione
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Referto di valutazione tecnica</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Meta k="Caso" v="Caso 01 — Torace PA" />
            <Meta k="Scala" v="/30" />
            <Meta k="Soglia" v="18/30" />
            <Meta k="Esito" v={idoneo ? "Idoneo" : "Non idoneo"} />
          </dl>
        </header>

        <section className="border-b border-slate-100 px-4 py-5 sm:px-6">
          <p className="font-display text-[44px] leading-none font-semibold tabular-nums sm:text-[48px]">
            {formatNum(evaluation.total, 1)}
            <span className="text-2xl text-slate-400">/30</span>
          </p>
          <p className="mt-1 font-mono text-xs tracking-[0.12em] text-slate-500">{evaluation.verdict}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {evaluation.sections.map((section) => (
              <div key={section.id} className="rounded-xl bg-slate-50 px-2 py-2">
                <p className="text-[11px] text-slate-500">{section.title}</p>
                <p className="font-mono text-sm tabular-nums">
                  {formatNum(section.score, 1)}/{section.max}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-[#3b82f6]" style={{ width: `${ratio * 100}%` }} />
          </div>
          {drl || wrong ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {drl ? "Allerta critica: DAP oltre il DRL del torace PA. " : ""}
              {wrong ? "Proiezione o decubito non coerenti con il PA in ortostatismo." : ""}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-[#0f2744]">{evaluation.summary}</p>
        </section>

        <section>
          {evaluation.sections.map((section) => {
            const percent = Math.round((section.score / section.max) * 100);
            const pass = percent >= 70;
            const expanded = open === section.id;
            return (
              <div key={section.id} className="border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : section.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left sm:px-6"
                >
                  <span className="min-w-0 flex-1 font-display text-sm font-bold">{section.title}</span>
                  <span className="font-mono text-xs tabular-nums text-slate-500">{percent}/100</span>
                  <span className="font-mono text-xs tabular-nums">
                    {formatNum(section.score, 1)}/{section.max}
                  </span>
                  <span className="text-[11px] text-slate-400">soglia ≥70</span>
                  <span className={pass ? "text-xs text-[#22C55E]" : "text-xs text-[#EF4444]"}>
                    {pass ? "Idoneo" : "Non idoneo"}
                  </span>
                </button>
                {expanded ? (
                  <ul className="space-y-2 px-4 pb-4 sm:px-6">
                    {section.lines.map((line) => (
                      <li key={line.label}>
                        <div className="flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
                          <span className="max-w-[70%] truncate text-[#0f2744]">{line.label}</span>
                          <span>
                            {formatNum(line.points, 1)}/{formatNum(line.max, 1)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#3b82f6]"
                            style={{ width: `${Math.min(100, (line.points / line.max) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                    {section.findings.map((finding) => (
                      <FindingRow key={finding.text} finding={finding} />
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 md:grid-cols-3">
          <div>
            <p className="text-[11px] tracking-[0.12em] text-slate-400 uppercase">Budget dose DRL</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, doseRatio * 100)}%`,
                  background: doseRatio > 1 ? "#EF4444" : "#22C55E",
                }}
              />
            </div>
          </div>
          <p className="font-mono text-sm tabular-nums">Scatti {shotCount}</p>
          <p className="font-mono text-sm tabular-nums">
            DAP {formatNum(cumulativeDap, 2)} dGy·cm² · {clock}
          </p>
        </section>

        <section className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="font-display text-base font-bold">Delta tecnico</h2>
          <p className="mt-1 text-xs text-slate-500">Tuo settaggio vs standard di riferimento</p>
          <div className="mt-3 grid grid-cols-[1fr_1fr_1.2fr] text-[11px] text-slate-400">
            <span>Parametro</span><span>Eseguito</span><span>Riferimento</span>
          </div>
          {CHEST_PA_REFERENCE.map((row) => {
            const done = executedValue(row.parameter, shot.technique);
            return (
              <div key={row.parameter} className="grid grid-cols-[1fr_1fr_1.2fr] border-t border-slate-100 py-1 font-mono text-xs">
                <span className="text-slate-500">{row.parameter}</span>
                <span style={{ color: done.aligned ? "#22C55E" : "#EF4444" }}>{done.text}</span>
                <span>{row.standard}</span>
              </div>
            );
          })}
        </section>

        <section className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="font-display text-base font-bold">Coaching e debriefing</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold tracking-[0.12em] text-[#22C55E] uppercase">Punti di forza</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(strengths.length ? strengths : [{ text: "Nessun punto di forza tecnico marcato su questo scatto." }]).map((item) => (
                  <li key={item.text}>{item.text}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold tracking-[0.12em] text-[#F39C12] uppercase">Azioni correttive</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(fixes.length ? fixes : [{ text: "Nessuna correzione critica. Confronta comunque il delta tecnico." }]).map((item) => (
                  <li key={item.text}>{item.text}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap gap-2 px-4 py-4 sm:px-6">
          <button type="button" onClick={onLibrary} className={secondaryBtn}>Torna alla Libreria</button>
          <button type="button" onClick={onRepeat} className={primaryBtn}>Ripeti caso</button>
        </footer>
      </article>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const color = finding.level === "ok" ? "#22C55E" : finding.level === "warn" ? "#F39C12" : "#EF4444";
  return (
    <li className="flex gap-2 text-xs leading-snug text-[#0f2744]">
      <span className="mt-1 h-1.5 w-1.5 shrink-0" style={{ background: color }} />
      {finding.text}
    </li>
  );
}

function executedValue(parameter: string, technique: Technique): { text: string; aligned: boolean } {
  const breath =
    technique.respiration === "INSP"
      ? "Apnea inspiratoria"
      : technique.respiration === "ESP"
        ? "Apnea espiratoria"
        : "Respiro libero";
  switch (parameter) {
    case "Proiezione":
      return { text: technique.projection, aligned: technique.projection === "PA" };
    case "Decubito":
      return {
        text: technique.decubitus === "ORTOSTATISMO" ? "Ortostatismo" : "Supino",
        aligned: technique.decubitus === "ORTOSTATISMO",
      };
    case "Respiro":
      return { text: breath, aligned: technique.respiration === "INSP" };
    case "kVp":
      return { text: formatNum(technique.kvp, 0), aligned: technique.kvp >= 110 && technique.kvp <= 125 };
    case "DFF":
      return { text: `${formatNum(technique.dff, 0)} cm`, aligned: technique.dff >= 170 };
    case "Macchia focale":
      return {
        text: technique.focal === "FINE" ? "Fine 0,6 mm" : "Grossa 1,2 mm",
        aligned: technique.focal === "FINE",
      };
    case "Griglia":
      return { text: technique.grid ? "Inserita 12:1" : "Rimossa", aligned: technique.grid };
    default:
      return {
        text: `${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm`,
        aligned: technique.collW >= 32 && technique.collW <= 40 && technique.collH >= 36 && technique.collH <= 42,
      };
  }
}
