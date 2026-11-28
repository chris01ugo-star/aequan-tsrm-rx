import type { ClinicalCase } from "@/types/rx";
import { TickMeter } from "@/components/ui/TickMeter";

const GATES = [
  "Verifica identità e quesito clinico",
  "Rimozione oggetti metallici radiopachi dal torace",
  "Verifica condizioni cliniche e radioprotezione",
];

export function BriefingPhase({
  clinical,
  checks,
  onToggle,
  onEnter,
}: {
  clinical: ClinicalCase;
  checks: boolean[];
  onToggle: (index: number) => void;
  onEnter: () => void;
}) {
  const ready = checks.every(Boolean);
  const bmi = clinical.weightKg / (clinical.heightCm / 100) ** 2;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rx-scroll">
      <div className="mx-auto grid max-w-5xl gap-3 p-4 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="border border-line bg-panel">
          <header className="border-b border-line bg-raised px-4 py-2">
            <p className="font-mono text-[10px] tracking-[0.16em] text-cyan-clin">
              RICHIESTA RIS · {clinical.id}
            </p>
            <h2 className="font-display text-[18px] text-ice">
              Caso 01 — Torace, sospetta polmonite lobare dx
            </h2>
          </header>
          <dl className="grid grid-cols-[140px_1fr] text-[13px]">
            <Row k="ID paziente" v={clinical.pseudoId} />
            <Row
              k="Habitus"
              v={`${clinical.ageYears} anni · ${clinical.sex} · ${clinical.weightKg} kg · ${clinical.heightCm} cm`}
            />
            <Row k="BMI" v={bmi.toLocaleString("it-IT", { maximumFractionDigits: 1 })} />
            <Row k="Mobilità" v={clinical.mobility} />
          </dl>
          <div className="space-y-3 px-4 py-3 text-[13px] leading-relaxed text-ice">
            <section>
              <h3 className="mb-1 text-[10px] tracking-[0.14em] text-muted uppercase">Anamnesi</h3>
              <p>{clinical.history}</p>
            </section>
            <section>
              <h3 className="mb-1 text-[10px] tracking-[0.14em] text-muted uppercase">
                Quesito clinico
              </h3>
              <p>{clinical.question}</p>
            </section>
          </div>
        </article>

        <div className="flex flex-col gap-3">
          <article className="border border-line bg-panel p-3">
            <h3 className="font-display text-[13px] text-ice">Indicatori per il TSRM</h3>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-muted">Collaborazione</span>
                <span className="font-mono tabular-nums text-ok">4/5</span>
              </div>
              <TickMeter value={4} />
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-muted">Dolore</span>
                <span className="font-mono tabular-nums text-amber-rx">2/5</span>
              </div>
              <TickMeter value={2} mixed />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Paziente vigile e deambulante: l’ortostatismo e l’apnea inspiratoria sono perseguibili,
              con attenzione al dolore basale.
            </p>
          </article>

          <article className="border border-line bg-raised p-3">
            <h3 className="font-display text-[13px] text-ice">Safety Gate pre-esame</h3>
            <ul className="mt-2 space-y-2">
              {GATES.map((label, index) => (
                <li key={label}>
                  <label className="flex cursor-pointer items-start gap-2 text-[13px] text-ice">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#6BA3DE]"
                      checked={checks[index]}
                      onChange={() => onToggle(index)}
                    />
                    <span>{label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={!ready}
              onClick={onEnter}
              className="mt-4 h-10 w-full bg-ice text-[13px] font-semibold text-raised hover:bg-[#E2E8F0] disabled:bg-panel disabled:text-muted"
            >
              Entra in Sala RX →
            </button>
          </article>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="border-t border-line bg-raised px-4 py-1.5 text-[10px] tracking-[0.12em] text-muted">
        {k}
      </dt>
      <dd className="border-t border-line px-3 py-1.5 text-ice">{v}</dd>
    </>
  );
}
