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
  const idoneo = !evaluation.blocked && evaluation.total >= 18;
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
    <div className="min-h-dvh overflow-y-auto bg-[#f6f7f9] text-[#1f2b3b] rx-scroll">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 pb-4 sm:px-6">
        <button
          type="button"
          onClick={onLibrary}
          className="rounded-full border border-[#e7eaef] bg-white/90 px-4 py-2 text-xs font-medium backdrop-blur-md"
        >
          ← Dashboard
        </button>
        <Image
          src="/aequan-logo-horizontal.png"
          alt="Aequan"
          width={140}
          height={28}
          className="h-7 w-auto "
        />
      </div>

      <article className="mx-auto mb-10 max-w-5xl rounded-none border border-[#e7eaef] bg-white shadow-[0_14px_40px_-20px_rgba(0,0,0,0.65)]">
        <header className="border-b-[6px] border-[#2d4f7a] px-4 py-5 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.24em] text-[#2d4f7a] uppercase">
            TSRM RX · Item A–G
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Referto di tirocinio</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Meta k="Caso" v="Caso 01 — Torace PA" />
            <Meta k="Scala" v="/30" />
            <Meta k="Soglia" v="18/30" />
            <Meta k="Esito" v={evaluation.blocked ? "Non Superato" : idoneo ? "Superato" : "Non Superato"} />
          </dl>
        </header>

        <section className="border-b border-[#e7eaef] px-4 py-5 sm:px-6">
          <p className="font-display text-[44px] leading-none font-semibold tabular-nums sm:text-[48px]">
            {formatNum(evaluation.total, 1)}
            <span className="text-2xl text-slate-500">/30</span>
            <span className="ml-3 align-middle font-mono text-sm tracking-normal text-[#2d4f7a]">{evaluation.band}</span>
          </p>
          <p className="mt-1 font-mono text-xs tracking-[0.12em] text-slate-500">{evaluation.verdict}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {evaluation.sections.map((section) => (
              <div key={section.id} className="rounded-xl bg-[#f4f6f9] px-2 py-2">
                <p className="text-[11px] text-slate-500">{section.title}</p>
                <p className="font-mono text-sm tabular-nums">
                  {formatNum(section.score, 1)}/{section.max}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#f4f6f9]">
            <div className="h-full bg-[#2d4f7a]" style={{ width: `${ratio * 100}%` }} />
          </div>
          {evaluation.blocking.length > 0 ? (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm">
              <p className="font-semibold">Criticità bloccanti</p>
              <ul className="mt-1 space-y-1">
                {evaluation.blocking.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {drl || wrong ? (
            <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-[#1f2b3b]">
              {drl ? "DAP oltre il DRL del torace PA. " : ""}
              {wrong ? "Proiezione o decubito non coerenti con il PA in ortostatismo." : ""}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-[#1f2b3b]">{evaluation.summary}</p>
        </section>

        <section className="border-b border-[#e7eaef] px-4 py-4 sm:px-6">
          <h2 className="font-display text-base font-bold">Delta tecnico</h2>
          <p className="mt-1 text-xs text-slate-500">Causa geometrica o fisica → evidenza radiografica</p>
          <ul className="mt-3 space-y-2">
            {evaluation.geometryEvidence.map((row) => (
              <li key={row.cause} className="text-sm leading-snug">
                <span className="text-[#2d4f7a]">{row.cause}</span>
                <span className="text-slate-500"> → </span>
                <span>{row.evidence}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          {evaluation.sections.map((section) => {
            const percent = Math.round((section.score / section.max) * 100);
            const pass = percent >= 70;
            const expanded = open === section.id;
            return (
              <div key={section.id} className="border-b border-[#e7eaef]">
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
                  <span className="text-[11px] text-slate-500">soglia ≥70</span>
                  <span className={pass ? "text-xs text-emerald-600" : "text-xs text-[#EF4444]"}>
                    {pass ? "Idoneo" : "Non idoneo"}
                  </span>
                </button>
                {expanded ? (
                  <ul className="space-y-2 px-4 pb-4 sm:px-6">
                    {section.lines.map((line) => (
                      <li key={line.label}>
                        <div className="flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
                          <span className="max-w-[70%] truncate text-[#1f2b3b]">{line.label}</span>
                          <span>
                            {formatNum(line.points, 1)}/{formatNum(line.max, 1)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-[#f4f6f9]">
                          <div
                            className="h-full bg-[#2d4f7a]"
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

        <section className="grid gap-4 border-b border-[#e7eaef] px-4 py-4 sm:px-6 md:grid-cols-3">
          <div>
            <p className="text-[11px] tracking-[0.12em] text-slate-500 uppercase">Budget dose DRL</p>
            <div className="mt-2 h-1.5 bg-[#f4f6f9]">
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

        <section className="border-b border-[#e7eaef] px-4 py-4 sm:px-6">
          <h2 className="font-display text-base font-bold">Confronto con il riferimento</h2>
          <p className="mt-1 text-xs text-slate-500">Settaggio eseguito rispetto allo standard del torace PA</p>
          <div className="mt-3 grid grid-cols-[1fr_1fr_1.2fr] text-[11px] text-slate-500">
            <span>Parametro</span><span>Eseguito</span><span>Riferimento</span>
          </div>
          {CHEST_PA_REFERENCE.map((row) => {
            const done = executedValue(row.parameter, shot.technique, shot.dosimetry.di);
            return (
              <div key={row.parameter} className="grid grid-cols-[1fr_1fr_1.2fr] border-t border-[#e7eaef] py-1 font-mono text-xs">
                <span className="text-slate-500">{row.parameter}</span>
                <span style={{ color: done.aligned ? "#22C55E" : "#EF4444" }}>{done.text}</span>
                <span>{row.standard}</span>
              </div>
            );
          })}
        </section>

        <section className="border-b border-[#e7eaef] px-4 py-4 sm:px-6">
          <h2 className="font-display text-base font-bold">Coaching e debriefing</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold tracking-[0.12em] text-emerald-600 uppercase">Punti di forza</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(strengths.length ? strengths : [{ text: "Nessun punto di forza tecnico marcato su questo scatto." }]).map((item) => (
                  <li key={item.text}>{item.text}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold tracking-[0.12em] text-amber-700 uppercase">Azioni correttive</h3>
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
    <li className="flex gap-2 text-xs leading-snug text-[#1f2b3b]">
      <span className="mt-1 h-1.5 w-1.5 shrink-0" style={{ background: color }} />
      {finding.text}
    </li>
  );
}

function executedValue(
  parameter: string,
  technique: Technique,
  di: number,
): { text: string; aligned: boolean } {
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
    case "Griglia": {
      const text =
        technique.gridMode === "focused_180"
          ? "Focalizzata 180 cm"
          : technique.gridMode === "focused_100"
            ? "Focalizzata 100 cm"
            : "Rimossa";
      return { text, aligned: technique.gridMode === "focused_180" && technique.dff >= 160 };
    }
    case "Rotazione":
      return {
        text: `${technique.patientRotationDeg > 0 ? "+" : ""}${formatNum(technique.patientRotationDeg, 0)}°`,
        aligned: Math.abs(technique.patientRotationDeg) <= 3,
      };
    case "Spalle":
      return {
        text: technique.shouldersRolledForward ? "Ruotate avanti" : "Neutre",
        aligned: technique.shouldersRolledForward,
      };
    case "Marker":
      return { text: technique.markerSide === "none" ? "Assente" : technique.markerSide, aligned: technique.markerSide === "DX" };
    case "DI":
      return {
        text: `${di > 0 ? "+" : ""}${formatNum(di, 1)}`,
        aligned: di >= -1 && di <= 1,
      };
    case "AEC": {
      if (technique.exposureMode !== "aec") {
        return { text: `Manuale ${formatNum(technique.mas, 1)} mAs`, aligned: di >= -1 && di <= 1 };
      }
      const laterals = technique.aecChambers.left && technique.aecChambers.right && !technique.aecChambers.center;
      return {
        text: laterals ? "Camere DX+SX" : "Selezione non standard",
        aligned: laterals && di >= -1 && di <= 1,
      };
    }
    default:
      return {
        text: `${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm`,
        aligned: technique.collW >= 32 && technique.collW <= 40 && technique.collH >= 36 && technique.collH <= 42,
      };
  }
}
