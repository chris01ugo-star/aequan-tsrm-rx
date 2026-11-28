import { formatNum } from "@/lib/number";
import type { SavedSession } from "@/lib/sessionStore";

export function ArchiveView({ sessions }: { sessions: SavedSession[] }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
      <h2 className="font-display text-2xl font-bold tracking-tight text-[#F8FAFC]">Archivio sessioni</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-muted">
        Le simulazioni concluse restano su questo browser, senza nomi reali. Ogni scheda riporta
        voto, scatti, dose cumulativa e data.
      </p>
      {sessions.length === 0 ? (
        <p className="mt-6 border border-line bg-panel px-4 py-6 text-[13px] text-muted">
          Nessuna simulazione conclusa. Completa il debriefing per salvarla in locale.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border border-line bg-panel">
          {sessions.map((session) => (
            <li key={session.id} className="grid grid-cols-[1.4fr_0.6fr_0.5fr_0.9fr_1fr] gap-2 px-3 py-2 text-[13px]">
              <span className="text-ice">{session.caseTitle}</span>
              <span className="font-mono tabular-nums text-cyan-clin">
                {formatNum(session.score, 1)} / {session.max}
              </span>
              <span className="font-mono tabular-nums text-ice">{session.shots} scatti</span>
              <span className="font-mono tabular-nums text-ice">
                {formatNum(session.cumulativeDap, 2)} dGy·cm²
              </span>
              <span className="font-mono text-[12px] text-muted">{session.savedAt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const BANK = [
  {
    id: "RX-01",
    title: "Caso 01 — Torace PA",
    detail: "Sospetta polmonite lobare destra. Scenario attivo del pilota.",
    status: "Attivo",
    ready: true,
  },
  {
    id: "RX-02",
    title: "Caso 02 — Ginocchio / Trauma",
    detail: "Incidenze ortogonali e criteri di collimazione articolare.",
    status: "In preparazione — Livello 1",
    ready: false,
  },
  {
    id: "RX-03",
    title: "Caso 03 — Addome diretto",
    detail: "Addome in bianco, livelli idroaerei e radioprotezione gonadica.",
    status: "In preparazione — Livello 1",
    ready: false,
  },
];

export function CaseBankView() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
      <h2 className="font-display text-2xl font-bold tracking-tight text-[#F8FAFC]">Banca dati casi</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-muted">
        Pilota RX tradizionale. Solo il torace è eseguibile in questa versione.
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {BANK.map((item) => (
          <li key={item.id} className="border border-line bg-panel p-3">
            <p className="font-mono text-[10px] tracking-[0.14em] text-cyan-clin">{item.id}</p>
            <h3 className="mt-1 font-display text-[16px] text-ice">{item.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.detail}</p>
            <p className={`mt-3 text-[12px] ${item.ready ? "text-ok" : "text-amber-rx"}`}>
              {item.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsView() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-[20px] text-ice">Analytics Aula</h2>
        <span className="border border-[#345884] px-2 py-0.5 text-[10px] tracking-[0.12em] text-cyan-clin">
          Disponibile in Livello 2
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
        Vista docente in anteprima. Al Livello 2 raccoglierà, in forma aggregata e pseudonimizzata,
        distribuzione dei voti, scatti medi e superamenti del DRL.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {["Voto medio d'aula", "Scatti medi per esame", "Sessioni sopra DRL"].map((label) => (
          <article key={label} className="border border-dashed border-line bg-panel px-3 py-4">
            <p className="text-[12px] text-muted">{label}</p>
            <p className="mt-2 font-mono text-[22px] text-line">—</p>
          </article>
        ))}
      </div>
    </div>
  );
}
