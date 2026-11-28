import { CHEST_PA_REFERENCE } from "@/data/cases";
import { formatNum } from "@/lib/number";
import type { Evaluation, ExposureShot, Technique } from "@/types/rx";

export function DebriefPhase({
  evaluation,
  shot,
  shotCount,
  cumulativeDap,
  onRestart,
}: {
  evaluation: Evaluation;
  shot: ExposureShot;
  shotCount: number;
  cumulativeDap: number;
  onRestart: () => void;
}) {
  const tone =
    evaluation.total >= 24 ? "#22C55E" : evaluation.total >= 18 ? "#F39C12" : "#EF4444";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rx-scroll">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4">
        <header className="flex flex-wrap items-end justify-between gap-3 border border-line bg-panel px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-cyan-clin">
              DEBRIEFING · SCATTO {String(shot.index).padStart(2, "0")}
            </p>
            <h2 className="font-display text-[20px] text-ice">Pre-valutazione in trentesimi</h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-[28px] leading-none tabular-nums" style={{ color: tone }}>
              {formatNum(evaluation.total, 1)}
              <span className="text-[14px] text-muted"> / 30</span>
            </p>
            <p className="font-mono text-[11px] tracking-[0.12em]" style={{ color: tone }}>
              {evaluation.verdict}
            </p>
          </div>
        </header>

        <p className="text-[13px] leading-relaxed text-ice">{evaluation.summary}</p>

        <section className="border border-line bg-raised">
          <header className="border-b border-line px-3 py-1.5 text-[10px] tracking-[0.14em] text-muted">
            TUO SETTAGGIO VS STANDARD DI RIFERIMENTO
          </header>
          <div className="grid grid-cols-[1.1fr_1fr_1.3fr] px-3 py-1 font-mono text-[9px] tracking-[0.12em] text-muted">
            <span>Parametro</span>
            <span>Eseguito</span>
            <span>Riferimento</span>
          </div>
          {CHEST_PA_REFERENCE.map((row) => {
            const done = executedValue(row.parameter, shot.technique);
            return (
              <div
                key={row.parameter}
                className="grid grid-cols-[1.1fr_1fr_1.3fr] border-t border-line px-3 py-1 font-mono text-[12px]"
              >
                <span className="text-muted">{row.parameter}</span>
                <span style={{ color: done.aligned ? "#22C55E" : "#EF4444" }}>{done.text}</span>
                <span className="text-ice">{row.standard}</span>
              </div>
            );
          })}
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          {evaluation.sections.map((section) => {
            const ratio = section.score / section.max;
            const sectionTone = ratio >= 0.8 ? "#22C55E" : ratio >= 0.55 ? "#F39C12" : "#EF4444";
            return (
              <article key={section.id} className="border border-line bg-panel">
                <header className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-1.5">
                  <h3 className="font-display text-[12px] leading-snug text-ice">{section.title}</h3>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums" style={{ color: sectionTone }}>
                    {formatNum(section.score, 1)}
                    <span className="text-[10px] text-muted"> / {section.max}</span>
                  </span>
                </header>
                <ul>
                  {section.findings.map((finding) => (
                    <li
                      key={finding.text}
                      className="flex gap-2 border-t border-line px-3 py-1.5 first:border-t-0"
                    >
                      <span
                        className="mt-1 h-1.5 w-1.5 shrink-0"
                        style={{
                          background:
                            finding.level === "ok"
                              ? "#22C55E"
                              : finding.level === "warn"
                                ? "#F39C12"
                                : "#EF4444",
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

        <p className="font-mono text-[11px] text-muted">
          Scatti in sessione {shotCount} · DAP cumulativo {formatNum(cumulativeDap, 2)} dGy·cm² ·
          scatto valutato {formatNum(shot.dosimetry.dapDGyCm2, 2)} dGy·cm²
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="h-10 self-start bg-ice px-4 text-[13px] font-semibold text-raised hover:bg-[#E2E8F0]"
        >
          Nuova simulazione
        </button>
      </div>
    </div>
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
        aligned:
          technique.collW >= 32 &&
          technique.collW <= 40 &&
          technique.collH >= 36 &&
          technique.collH <= 42,
      };
  }
}
