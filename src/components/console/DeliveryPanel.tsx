"use client";

import { CHEST_PA_REFERENCE } from "@/data/cases";
import { formatNum } from "@/lib/number";
import type { Evaluation, ExposureShot, Technique } from "@/types/rx";

type DeliveryPanelProps = {
  evaluation: Evaluation;
  shot: ExposureShot;
  shotCount: number;
  cumulativeDap: number;
  onClose: () => void;
};

export function DeliveryPanel({
  evaluation,
  shot,
  shotCount,
  cumulativeDap,
  onClose,
}: DeliveryPanelProps) {
  const ratio = evaluation.total / evaluation.max;
  const tone = ratio >= 0.8 ? "#3DDC97" : ratio >= 0.6 ? "#E6C15A" : "#E85D4C";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Chiudi pre-valutazione"
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-title"
        className="relative z-10 flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col border border-line bg-panel"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-cyan-clin">
              PRE-VALUTAZIONE TECNICA · ESPOSIZIONE {String(shot.index).padStart(2, "0")}
            </div>
            <h2 id="delivery-title" className="text-[15px] tracking-wide text-ice">
              Consegna esame
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-[22px] tabular-nums leading-none" style={{ color: tone }}>
                {formatNum(evaluation.total, 1)}
                <span className="text-[12px] text-muted"> / {evaluation.max}</span>
              </div>
              <div className="font-mono text-[10px] tracking-[0.14em]" style={{ color: tone }}>
                {evaluation.verdict}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-7 border border-line bg-raised px-2 text-[10px] tracking-[0.14em] text-ice hover:border-cyan-clin hover:text-cyan-clin"
            >
              CHIUDI
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 rx-scroll select-text">
          <p className="mb-3 font-mono text-[11px] leading-relaxed text-ice">
            {evaluation.summary}
          </p>
          <ReferenceCompare technique={shot.technique} />
          <div className="mb-3 grid grid-cols-4 gap-px border border-line bg-line font-mono text-[10px] tabular-nums">
            <Meta k="kVp" v={formatNum(shot.technique.kvp, 0)} />
            <Meta k="mAs" v={formatNum(shot.technique.mas, 1)} />
            <Meta k="DFF" v={`${formatNum(shot.technique.dff, 0)} cm`} />
            <Meta k="EI" v={formatNum(shot.dosimetry.ei, 0)} />
            <Meta k="DAP scatto" v={`${formatNum(shot.dosimetry.dapDGyCm2, 2)} dGy·cm²`} />
            <Meta k="ESD" v={`${formatNum(shot.dosimetry.esdMgy, 3)} mGy`} />
            <Meta k="Scatti" v={String(shotCount).padStart(2, "0")} />
            <Meta k="DAP sessione" v={`${formatNum(cumulativeDap, 2)} dGy·cm²`} />
          </div>
          <div className="space-y-3">
            {evaluation.sections.map((section) => {
              const sectionTone =
                section.score / section.max >= 0.8
                  ? "#3DDC97"
                  : section.score / section.max >= 0.6
                    ? "#E6C15A"
                    : "#E85D4C";
              return (
                <article key={section.id} className="border border-line">
                  <header className="flex items-baseline justify-between border-b border-line px-2 py-1">
                    <h3 className="text-[11px] tracking-[0.12em] text-ice uppercase">
                      {section.title}
                    </h3>
                    <span className="font-mono text-[13px] tabular-nums" style={{ color: sectionTone }}>
                      {formatNum(section.score, 1)}
                      <span className="text-[10px] text-muted"> / {section.max}</span>
                    </span>
                  </header>
                  <ul>
                    {section.findings.map((finding) => (
                      <li
                        key={finding.text}
                        className="flex gap-2 border-t border-[#16202C] px-2 py-1 first:border-t-0"
                      >
                        <span
                          className="mt-1 h-1.5 w-1.5 shrink-0"
                          style={{
                            background:
                              finding.level === "ok"
                                ? "#3DDC97"
                                : finding.level === "warn"
                                  ? "#E6C15A"
                                  : "#E85D4C",
                          }}
                        />
                        <span className="text-[12px] leading-snug text-ice">{finding.text}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted">
            La consegna non chiude la sessione: puoi correggere la tecnica, riesporre e
            rivalutare. Il punteggio riguarda l&apos;ultima immagine, la dose di sessione
            somma tutte le esposizioni. Uso esclusivamente didattico.
          </p>
        </div>
      </section>
    </div>
  );
}

function ReferenceCompare({ technique }: { technique: Technique }) {
  return (
    <section className="mb-3 border border-line bg-raised">
      <header className="border-b border-line px-2 py-1 text-[10px] tracking-[0.14em] text-muted">
        STANDARD DI RIFERIMENTO — TORACE PA ADULTO
      </header>
      <div className="grid grid-cols-[1.1fr_1fr_1.4fr] border-b border-line px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-muted">
        <span>PARAMETRO</span>
        <span>ESEGUITO</span>
        <span>RIFERIMENTO</span>
      </div>
      {CHEST_PA_REFERENCE.map((row) => {
        const done = executedValue(row.parameter, technique);
        return (
          <div
            key={row.parameter}
            className="grid grid-cols-[1.1fr_1fr_1.4fr] border-b border-line px-2 py-1 font-mono text-[11px] last:border-b-0"
          >
            <span className="text-muted">{row.parameter}</span>
            <span style={{ color: done.aligned ? "#3DDC97" : "#E85D4C" }}>{done.text}</span>
            <span className="text-ice">{row.standard}</span>
          </div>
        );
      })}
    </section>
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
      return {
        text: formatNum(technique.kvp, 0),
        aligned: technique.kvp >= 110 && technique.kvp <= 125,
      };
    case "DFF":
      return {
        text: `${formatNum(technique.dff, 0)} cm`,
        aligned: technique.dff >= 170,
      };
    case "Macchia focale":
      return {
        text: technique.focal === "FINE" ? "Fine 0,6 mm" : "Grossa 1,2 mm",
        aligned: technique.focal === "FINE",
      };
    case "Griglia":
      return {
        text: technique.grid ? "Inserita 12:1" : "Rimossa",
        aligned: technique.grid,
      };
    default:
      return {
        text: `${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm`,
        aligned:
          technique.collW >= 32 &&
          technique.collW <= 40 &&
          technique.collH >= 36 &&
          technique.collH <= 42,
      };
  }
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-raised px-2 py-1">
      <div className="text-[9px] tracking-[0.12em] text-muted">{k}</div>
      <div className="text-[12px] text-ice">{v}</div>
    </div>
  );
}
