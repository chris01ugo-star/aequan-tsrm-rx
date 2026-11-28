"use client";

import { formatNum } from "@/lib/number";
import { saveSessions, setProgressCase, type SavedSession } from "@/lib/sessionStore";
import { primaryBtn } from "@/components/ui/buttons";

export function ArchiveView({ sessions }: { sessions: SavedSession[] }) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <h2 className="font-display text-[30px] font-semibold text-[#1f2b3b]">Archivio sessioni</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Le simulazioni concluse restano su questo browser, senza nomi reali. Ogni scheda riporta voto, scatti, dose e orario.
      </p>
      {sessions.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
          Nessuna simulazione conclusa. Completa review e debriefing per salvarla in locale.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:grid-cols-[1.4fr_0.6fr_0.6fr_0.9fr_0.8fr] sm:items-center"
            >
              <span className="font-semibold text-[#1f2b3b]">{session.caseTitle}</span>
              <span className="tabular-nums text-[#2d4f7a]">
                {formatNum(session.score, 1)} / {session.max}
              </span>
              <span className="tabular-nums text-slate-600">{session.shots} scatti</span>
              <span className="tabular-nums text-slate-600">{formatNum(session.cumulativeDap, 2)} dGy·cm²</span>
              <span className="text-xs text-slate-400">{session.savedAt}</span>
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
    detail: "Sospetta polmonite lobare destra. Scenario eseguibile del pilota.",
    status: "Attivo",
    ready: true,
  },
  {
    id: "RX-02",
    title: "Caso 02 — Ginocchio / Trauma",
    detail: "Incidenze ortogonali e criteri di collimazione articolare.",
    status: "In preparazione",
    ready: false,
  },
  {
    id: "RX-03",
    title: "Caso 03 — Addome diretto",
    detail: "Addome in bianco, livelli idroaerei e radioprotezione.",
    status: "In preparazione",
    ready: false,
  },
];

export function CaseBankView() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <h2 className="font-display text-[30px] font-semibold text-[#1f2b3b]">Banca dati casi</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Pilota di radiologia tradizionale. In questa versione si esegue il torace PA.
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {BANK.map((item) => (
          <li key={item.id} className="rounded-2xl border border-[#e7eaef] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#1d4f91] uppercase">{item.id}</p>
            <h3 className="mt-1 font-display text-lg font-bold text-[#1f2b3b]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.detail}</p>
            <p className={`mt-3 text-xs font-semibold ${item.ready ? "text-emerald-600" : "text-amber-600"}`}>
              {item.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportHub({
  sessions,
  onOpenPractical,
}: {
  sessions: SavedSession[];
  onOpenPractical: () => void;
}) {
  const latest = sessions[0];
  const average =
    sessions.length === 0 ? 0 : sessions.reduce((sum, item) => sum + item.score, 0) / sessions.length;
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <h2 className="font-display text-[30px] font-semibold text-[#1f2b3b]">Report</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Sintesi delle sessioni salvate su questo browser. Il referto completo compare al termine della review.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Sessioni" value={String(sessions.length)} />
        <Stat label="Voto medio" value={sessions.length ? formatNum(average, 1) : "—"} />
        <Stat label="Ultimo DAP" value={latest ? `${formatNum(latest.cumulativeDap, 2)}` : "—"} />
      </div>
      {latest ? (
        <article className="mt-4 rounded-2xl border border-[#e7eaef] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Ultima sessione</p>
          <h3 className="mt-1 font-display text-xl font-bold">{latest.caseTitle}</h3>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums text-[#1f2b3b]">
            {formatNum(latest.score, 1)}
            <span className="text-xl text-slate-400"> / {latest.max}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {latest.shots} scatti · {formatNum(latest.cumulativeDap, 2)} dGy·cm² · {latest.savedAt}
          </p>
        </article>
      ) : (
        <article className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Nessun report ancora. Avvia lo scenario del torace e consegna la review.
          <button type="button" onClick={onOpenPractical} className={`${primaryBtn} mt-4`}>
            Apri simulazione
          </button>
        </article>
      )}
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h2 className="font-display text-[30px] font-semibold text-[#1f2b3b]">Impostazioni</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        AEQUAN Imaging & Clinical Simulation è un ambiente universitario. I dati di sessione e del quiz restano nel browser, senza account clinico.
      </p>
      <article className="mt-4 rounded-2xl border border-[#e7eaef] bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Dati locali</h3>
        <p className="mt-1 text-sm text-slate-500">Cancella archivio sessioni e avanzamento del caso in corso.</p>
        <button
          type="button"
          className={`${primaryBtn} mt-4`}
          onClick={() => {
            saveSessions([]);
            setProgressCase("");
            window.localStorage.removeItem("aequan.tirocinio.v2");
          }}
        >
          Azzera dati di questo browser
        </button>
      </article>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[#e7eaef] bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#1f2b3b]">{value}</p>
    </article>
  );
}

export function AnalyticsView() {
  return <ReportHub sessions={[]} onOpenPractical={() => undefined} />;
}
