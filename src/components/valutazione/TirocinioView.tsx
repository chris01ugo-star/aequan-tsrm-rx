"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { card, primaryBtn, secondaryBtn } from "@/components/ui/buttons";
import { formatNum } from "@/lib/number";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  image?: boolean;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "Qual è la principale indicazione clinica per l’esecuzione di una TC del torace senza mezzo di contrasto?",
    options: [
      "Valutazione della dissezione aortica",
      "Ricerca di noduli polmonari",
      "Studio delle arterie polmonari",
      "Caratterizzazione di masse mediastiniche",
    ],
    answer: 1,
    image: true,
  },
  {
    id: "q2",
    prompt: "Osserva l’immagine e seleziona la descrizione corretta.",
    options: [
      "Opacità a vetro smerigliato nel lobo superiore destro",
      "Nodulo solido nel lobo inferiore sinistro",
      "Atelettasia del lobo medio",
      "Versamento pleurico bilaterale",
    ],
    answer: 1,
    image: true,
  },
  {
    id: "q3",
    prompt: "Nel paziente adulto deambulante, la proiezione di riferimento del torace è:",
    options: ["AP in clinostatismo", "PA in ortostatismo", "Laterale come unica incidenza", "AP lordotica di routine"],
    answer: 1,
  },
  {
    id: "q4",
    prompt: "Quale distanza fuoco-detettore è lo standard del torace PA?",
    options: ["100 cm", "120 cm", "150 cm", "180 cm"],
    answer: 3,
  },
  {
    id: "q5",
    prompt: "L’intervallo di tensione atteso per un torace PA digitale dell’adulto è:",
    options: ["50–70 kV", "80–90 kV", "110–125 kV", "140–150 kV"],
    answer: 2,
  },
  {
    id: "q6",
    prompt: "L’istruzione respiratoria del torace standard è:",
    options: ["Respiro libero", "Apnea espiratoria", "Apnea inspiratoria profonda", "Respirazione rapida durante l’esposizione"],
    answer: 2,
  },
  {
    id: "q7",
    prompt: "Sul torace PA dell’adulto la griglia antidiffusione va:",
    options: ["Sempre rimossa", "Inserita, con rapporto elevato (es. 12:1)", "Usata solo sotto i 60 kV", "Sostituita dal fuoco grosso"],
    answer: 1,
  },
  {
    id: "q8",
    prompt: "Per limitare la penombra geometrica sul parenchima polmonare si preferisce:",
    options: ["Macchia focale fine", "Macchia focale grossa", "Distanza fuoco-detettore di 100 cm", "Campo 43×43 sempre aperto"],
    answer: 0,
  },
  {
    id: "q9",
    prompt: "Con il paziente supino, anche se in console è selezionato «PA», il fascio reale è:",
    options: ["Ancora un PA", "Un’incidenza laterale", "Un AP, con ingrandimento cardiaco", "Indipendente dal decubito"],
    answer: 2,
  },
  {
    id: "q10",
    prompt: "Il principio ALARA, applicato alla radiografia del torace, indica:",
    options: [
      "La dose più bassa possibile, anche se l’immagine non risponde al quesito",
      "La dose minima che risponde ancora al quesito clinico",
      "Eseguire sempre tre esposizioni e conservare la migliore",
      "Rimuovere la griglia per ridurre il DAP in ogni caso",
    ],
    answer: 1,
  },
];

const COMPETENCES = [
  "Posizionamento del paziente",
  "Scelta dei parametri di esposizione",
  "Radioprotezione e principio ALARA",
  "Valutazione della qualità dell’immagine",
];

const STEPS = [
  { title: "Accesso", detail: "Codice tirocinio" },
  { title: "Valutazione teorica", detail: "10 domande" },
  { title: "Valutazione pratica", detail: "Casi clinici" },
  { title: "Autovalutazione", detail: "Competenze e obiettivi" },
  { title: "Valutazione finale", detail: "Riepilogo e invio" },
];

type Saved = {
  step: number;
  index: number;
  answers: Record<string, number>;
  self: number[];
  submitted: boolean;
};

const KEY = "aequan.tirocinio.v2";
const EMPTY: Saved = { step: 1, index: 0, answers: {}, self: [0, 0, 0, 0], submitted: false };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parse(raw: string): Saved {
  if (!raw) return EMPTY;
  try {
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    return EMPTY;
  }
}

export function TirocinioView({
  practical,
  onStartPractical,
}: {
  practical: { score: number; max: number } | null;
  onStartPractical: () => void;
}) {
  const raw = useSyncExternalStore(subscribe, () => window.localStorage.getItem(KEY) ?? "", () => "");
  const state = useMemo(() => parse(raw), [raw]);
  const patch = (next: Partial<Saved>) => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...state, ...next }));
    listeners.forEach((listener) => listener());
  };
  const answered = QUESTIONS.filter((item) => state.answers[item.id] !== undefined).length;
  const theoryDone = answered === QUESTIONS.length;
  const selfDone = state.self.every((value) => value > 0);
  const completed = [true, theoryDone, Boolean(practical), selfDone, state.submitted];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <Hero done={completed.filter(Boolean).length} />

      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${card} p-5`}>
          <div className="flex items-start gap-3 border-b border-[#e7eaef] pb-4">
            <div>
              <p className="text-[15px] font-semibold">Tirocinio in Radiologia</p>
              <p className="text-[13px] text-slate-500">A.A. 2026/2027</p>
            </div>
          </div>
          <ol className="mt-4 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {STEPS.map((step, index) => {
              const on = state.step === index;
              const done = completed[index] && !on;
              return (
                <li key={step.title} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => patch({ step: index })}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${
                      on ? "bg-[#edf1f6]" : "hover:bg-[#f4f6f9]"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold ${
                        on
                          ? "border-[#2d4f7a] bg-[#2d4f7a] text-white"
                          : done
                            ? "border-[#2d4f7a] bg-[#2d4f7a] text-white"
                            : "border-[#c7d3e2] bg-white text-slate-500"
                      }`}
                    >
                      {done ? <Check size={15} strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      <span className={`block text-[14px] font-semibold ${on ? "text-[#2d4f7a]" : "text-[#1f2b3b]"}`}>
                        {step.title}
                      </span>
                      <span className="block text-[12px] text-slate-500">{step.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className={`${card} p-5 sm:p-7`}>
          {state.step === 0 ? (
            <Section step={0} title="Accesso" subtitle="Il codice di tirocinio è stato verificato.">
              <div className="rounded-xl border border-[#e7eaef] bg-[#f8fafd] p-5">
                <dl className="grid gap-4 text-sm sm:grid-cols-3">
                  <Field k="Codice tirocinio" v="RAD-TSRM-2026-014" />
                  <Field k="Sede" v="Radiologia · Polo didattico" />
                  <Field k="Tutor" v="Dott.ssa R. Conti" />
                </dl>
              </div>
              <Footer onNext={() => patch({ step: 1 })} />
            </Section>
          ) : null}

          {state.step === 1 ? (
            <Theory
              index={state.index}
              answers={state.answers}
              onAnswer={(id, option) => patch({ answers: { ...state.answers, [id]: option } })}
              onIndex={(index) => patch({ index })}
              onBack={() => patch({ step: 0 })}
              onDone={() => patch({ step: 2 })}
            />
          ) : null}

          {state.step === 2 ? (
            <Section step={2} title="Valutazione pratica" subtitle="Esegui il caso clinico in simulazione. Il punteggio viene acquisito al termine del debriefing.">
              <div className="flex flex-col gap-4 rounded-xl border border-[#e7eaef] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-[18px] font-semibold">Caso 01 — Torace PA</p>
                  <p className="mt-0.5 text-sm text-slate-500 italic">Sospetta polmonite lobare destra</p>
                  <p className="mt-3 text-sm">
                    {practical ? (
                      <>
                        Ultimo esito:{" "}
                        <strong className="text-[#2d4f7a]">
                          {formatNum(practical.score, 1)} / {practical.max}
                        </strong>
                      </>
                    ) : (
                      <span className="text-slate-500">Non ancora svolto</span>
                    )}
                  </p>
                </div>
                <button type="button" onClick={onStartPractical} className={primaryBtn}>
                  {practical ? "Ripeti simulazione" : "Avvia simulazione"}
                  <ArrowRight size={16} />
                </button>
              </div>
              <Footer onBack={() => patch({ step: 1 })} onNext={() => patch({ step: 3 })} />
            </Section>
          ) : null}

          {state.step === 3 ? (
            <Section step={3} title="Autovalutazione" subtitle="Indica il livello di autonomia raggiunto per ciascuna competenza (1 = guidato, 5 = autonomo).">
              <ul className="divide-y divide-[#e7eaef] rounded-xl border border-[#e7eaef]">
                {COMPETENCES.map((label, index) => (
                  <li key={label} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[15px]">{label}</span>
                    <span className="flex gap-1.5" role="radiogroup" aria-label={label}>
                      {[1, 2, 3, 4, 5].map((value) => {
                        const on = state.self[index] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => patch({ self: state.self.map((item, i) => (i === index ? value : item)) })}
                            className={`h-9 w-9 rounded-lg border text-sm font-medium ${
                              on ? "border-[#2d4f7a] bg-[#2d4f7a] text-white" : "border-[#dde2e9] bg-white text-slate-600 hover:border-[#2d4f7a]"
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </span>
                  </li>
                ))}
              </ul>
              <Footer onBack={() => patch({ step: 2 })} onNext={() => patch({ step: 4 })} />
            </Section>
          ) : null}

          {state.step === 4 ? (
            <Final
              answers={state.answers}
              practical={practical}
              self={state.self}
              submitted={state.submitted}
              ready={theoryDone && Boolean(practical) && selfDone}
              onSubmit={() => patch({ submitted: true })}
              onBack={() => patch({ step: 3 })}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Theory({
  index,
  answers,
  onAnswer,
  onIndex,
  onBack,
  onDone,
}: {
  index: number;
  answers: Record<string, number>;
  onAnswer: (id: string, option: number) => void;
  onIndex: (index: number) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const question = QUESTIONS[index];
  const answeredCount = QUESTIONS.filter((item) => answers[item.id] !== undefined).length;
  const last = index === QUESTIONS.length - 1;

  return (
    <div>
      <header className="border-b border-[#eef0f3] pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] text-slate-500">Sezione 2 di {STEPS.length}</p>
          <p className="text-[13px] text-slate-500">
            {answeredCount} di {QUESTIONS.length} risposte date
          </p>
        </div>
        <h2 className="mt-1 font-display text-[24px] font-semibold text-[#1f2b3b]">Valutazione teorica</h2>
        <p className="mt-1 text-[15px] text-slate-600">Dieci domande sugli argomenti del tirocinio. Puoi tornare indietro e cambiare risposta fino all’invio finale.</p>
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Domande">
          {QUESTIONS.map((item, i) => {
            const on = i === index;
            const done = answers[item.id] !== undefined;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Domanda ${i + 1}`}
                aria-current={on ? "step" : undefined}
                className={`h-8 w-8 rounded-lg text-[13px] font-medium tabular-nums transition ${
                  on
                    ? "bg-[#2d4f7a] text-white"
                    : done
                      ? "bg-[#edf1f6] text-[#2d4f7a] hover:bg-[#e2e8f0]"
                      : "border border-[#e3e7ed] text-slate-500 hover:border-[#c3cddb]"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mt-6">
        <div className={`grid gap-6 ${question.image ? "md:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
          <fieldset>
            <legend className="text-[18px] leading-snug font-semibold text-[#1f2b3b]">
              <span className="mr-2 text-slate-400 tabular-nums">{index + 1}.</span>
              {question.prompt}
            </legend>
            <div className="mt-5 space-y-3">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                return (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition ${
                      selected ? "border-[#bcd2ee] bg-[#edf1f6]" : "border-[#dfe6ef] bg-white hover:bg-[#f8fafd]"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={selected}
                      onChange={() => onAnswer(question.id, optionIndex)}
                      className="h-[18px] w-[18px] accent-[#2d4f7a]"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {question.image ? <CtImage /> : null}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" className={secondaryBtn} onClick={() => (index === 0 ? onBack() : onIndex(index - 1))}>
          <ArrowLeft size={16} />
          Indietro
        </button>
        <button
          type="button"
          className={primaryBtn}
          disabled={answers[question.id] === undefined}
          onClick={() => (last ? onDone() : onIndex(index + 1))}
        >
          {last ? "Concludi sezione" : "Avanti"}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Final({
  answers,
  practical,
  self,
  submitted,
  ready,
  onSubmit,
  onBack,
}: {
  answers: Record<string, number>;
  practical: { score: number; max: number } | null;
  self: number[];
  submitted: boolean;
  ready: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const correct = QUESTIONS.filter((item) => answers[item.id] === item.answer).length;
  const theory = correct * 2;
  const practice = practical ? Math.round((practical.score / practical.max) * 20) : 0;
  const total = theory + practice;
  const positive = total >= 24;
  const selfAvg = self.filter(Boolean).length ? self.reduce((a, b) => a + b, 0) / self.filter(Boolean).length : 0;
  const rows = [
    { label: "Conoscenze teoriche", value: correct, max: 10 },
    { label: "Interpretazione immagini", value: QUESTIONS.filter((q) => q.image && answers[q.id] === q.answer).length * 5, max: 10 },
    { label: "Procedure e protocolli", value: practical ? Math.round((practical.score / practical.max) * 10) : 0, max: 10 },
    { label: "Competenze trasversali", value: Math.round(selfAvg * 2), max: 10 },
  ];

  return (
    <Section step={4} title="Valutazione finale" subtitle="Riepilogo delle sezioni. L’invio consolida la valutazione su questo dispositivo.">
      <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="rounded-xl border border-[#e7eaef] bg-[#f8fafd] p-5">
          <p className="text-[13px] text-slate-500">Punteggio complessivo</p>
          <p className="mt-1 font-display text-[44px] leading-none font-semibold tabular-nums">
            {total}
            <span className="text-[22px] text-slate-400"> / 40</span>
          </p>
          <p
            className={`mt-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
              !ready
                ? "border-slate-200 bg-white text-slate-500"
                : positive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {ready && positive ? <Check size={15} /> : null}
            {!ready ? "Sezioni incomplete" : positive ? "Positivo" : "Da consolidare"}
          </p>
        </div>
        <div>
          <p className="text-[14px] font-semibold">Dettaglio per ambito</p>
          <ul className="mt-3 space-y-4">
            {rows.map((row) => (
              <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 text-sm">
                <span>{row.label}</span>
                <span className="font-medium tabular-nums">
                  {row.value} / {row.max}
                </span>
                <span className="col-span-2 h-2 overflow-hidden rounded-full bg-[#e6ecf3]">
                  <span className="block h-full rounded-full bg-[#2d4f7a]" style={{ width: `${(row.value / row.max) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {submitted ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Valutazione inviata. Il riepilogo resta consultabile in questa sezione.
        </p>
      ) : null}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" className={secondaryBtn} onClick={onBack}>
          <ArrowLeft size={16} />
          Indietro
        </button>
        <button type="button" className={primaryBtn} disabled={!ready || submitted} onClick={onSubmit}>
          {submitted ? "Inviata" : "Invia valutazione"}
          {submitted ? <Check size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
    </Section>
  );
}

function Section({ step, title, subtitle, children }: { step: number; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div>
      <header className="mb-6 border-b border-[#eef0f3] pb-5">
        <p className="text-[13px] text-slate-500">
          Sezione {step + 1} di {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-[24px] font-semibold text-[#1f2b3b]">{title}</h2>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-slate-600">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

function Footer({ onBack, onNext }: { onBack?: () => void; onNext: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {onBack ? (
        <button type="button" className={secondaryBtn} onClick={onBack}>
          <ArrowLeft size={16} />
          Indietro
        </button>
      ) : (
        <span />
      )}
      <button type="button" className={primaryBtn} onClick={onNext}>
        Avanti
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[12px] text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}

function Hero({ done }: { done: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#e7eaef] bg-gradient-to-r from-[#fafbfc] via-[#f1f4f8] to-[#e6ecf3]">
      <Colonnade />
      <div className="relative flex items-center gap-5 px-6 py-8 sm:px-10 sm:py-10">
        <span className="hidden h-16 w-[2px] bg-[#c9a35c] sm:block" />
        <div className="max-w-xl">
          <h1 className="font-display text-[30px] leading-tight font-semibold text-[#1f2b3b] sm:text-[36px]">
            Valutazione del tirocinio
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Completa le cinque sezioni nell’ordine indicato. I progressi vengono salvati automaticamente.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/80">
              <div className="h-full rounded-full bg-[#2d4f7a]" style={{ width: `${(done / STEPS.length) * 100}%` }} />
            </div>
            <span className="text-[13px] text-slate-600">
              {done} di {STEPS.length} sezioni completate
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Colonnade() {
  return (
    <svg
      viewBox="0 0 520 200"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[62%] opacity-50 [mask-image:linear-gradient(to_right,transparent,black_35%)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="stone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f4f7fb" />
          <stop offset="1" stopColor="#c6d4e6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="520" height="200" fill="#dbe5f1" />
      <rect x="0" y="14" width="520" height="14" fill="url(#stone)" />
      {Array.from({ length: 7 }, (_, i) => {
        const x = 20 + i * 74;
        return (
          <g key={i}>
            <path d={`M${x + 14} 200 V82 A30 30 0 0 1 ${x + 74} 82 V200`} fill="#9fb4cf" opacity="0.55" />
            <rect x={x} y="40" width="16" height="160" fill="url(#stone)" />
            <rect x={x - 3} y="36" width="22" height="8" fill="#eef3f9" />
          </g>
        );
      })}
      <rect x="0" y="184" width="520" height="16" fill="#e9eff7" />
      {Array.from({ length: 26 }, (_, i) => (
        <rect key={i} x={8 + i * 20} y="168" width="6" height="16" rx="3" fill="#cfdbea" />
      ))}
      <rect x="0" y="164" width="520" height="5" fill="#eef3f9" />
    </svg>
  );
}

function CtImage() {
  return (
    <figure className="relative self-start overflow-hidden rounded-2xl bg-black">
      <svg viewBox="0 0 280 210" className="h-auto w-full" role="img" aria-label="TC del torace, finestra polmonare, con nodulo nel lobo inferiore sinistro">
        <rect width="280" height="210" fill="#000" />
        <ellipse cx="140" cy="112" rx="128" ry="88" fill="#6b6b6b" />
        <ellipse cx="140" cy="112" rx="118" ry="80" fill="#8a8a8a" />
        <path d="M44 112 C44 62 78 40 112 46 C126 50 128 70 126 96 C124 130 126 160 112 170 C80 182 44 160 44 112 Z" fill="#0b0b0b" />
        <path d="M236 112 C236 62 202 40 168 46 C154 50 152 70 154 96 C156 130 154 160 168 170 C200 182 236 160 236 112 Z" fill="#0b0b0b" />
        <g stroke="#6f6f6f" strokeWidth="1.2" fill="none" opacity="0.9">
          <path d="M112 100 L84 80 M100 92 L80 104 M108 120 L76 132 M96 126 L84 150" />
          <path d="M168 100 L196 80 M180 92 L202 106 M172 120 L204 134 M184 128 L196 150" />
        </g>
        <ellipse cx="140" cy="104" rx="26" ry="30" fill="#bdbdbd" />
        <circle cx="140" cy="62" r="9" fill="#d6d6d6" />
        <circle cx="152" cy="132" r="9" fill="#cfcfcf" />
        <rect x="128" y="160" width="24" height="22" rx="6" fill="#efefef" />
        <circle cx="194" cy="140" r="11" fill="#e4e4e4" />
        <circle cx="194" cy="140" r="11" fill="none" stroke="#f5f5f5" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
      <figcaption className="bg-[#111] px-3 py-1.5 text-[12px] text-white/70">TC torace, finestra polmonare</figcaption>
    </figure>
  );
}
