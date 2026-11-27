"use client";

import { ghostBtn } from "@/components/ui/buttons";
import { DRL_CHEST_PA } from "@/lib/rxPhysics";
import { formatNum } from "@/lib/number";

export function DrlDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B1320]/75 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drl-title"
        className="w-full max-w-lg rounded-2xl border border-[#2A486D] bg-[#16253B] p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="drl-title" className="font-display text-lg font-bold tracking-tight">
            Linee guida & DRL
          </h2>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Chiudi
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">
          Livelli diagnostici di riferimento del torace PA adulto usati dal modello didattico. Non sono
          una misura di un tubo reale.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-sm tabular-nums">
          <Cell k="DAP" v={`${formatNum(DRL_CHEST_PA.dapDGyCm2, 2)} dGy·cm²`} />
          <Cell k="ESD" v={`${formatNum(DRL_CHEST_PA.esdMgy, 2)} mGy`} />
          <Cell k="EI" v={`${DRL_CHEST_PA.eiMin}–${DRL_CHEST_PA.eiMax}`} />
        </dl>
        <ul className="mt-4 space-y-2 text-sm text-[#F8FAFC]">
          <li>ALARA: la dose minima che risponde ancora al quesito, non la dose più bassa in assoluto.</li>
          <li>Qualità proiettiva: PA, ortostatismo, apnea inspiratoria, DFF 180 cm, griglia 12:1, fuoco fine.</li>
        </ul>
      </section>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-[#111D30] px-2 py-2">
      <div className="text-[10px] tracking-[0.12em] text-[#9FB3C8]">{k}</div>
      <div className="text-[#F8FAFC]">{v}</div>
    </div>
  );
}
