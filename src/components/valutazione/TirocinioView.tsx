"use client";

import { BookOpen, Check, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { primaryBtn, secondaryBtn } from "@/components/ui/buttons";

type Question = {
  id: string;
  section: "teoria" | "immagine";
  prompt: string;
  options: string[];
  answer: number;
  topic: string;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    section: "teoria",
    topic: "Indicazione",
    prompt: "Qual è la principale indicazione clinica per l’esecuzione di una TC del torace senza mezzo di contrasto?",
    options: [
      "Valutazione della dissezione aortica",
      "Ricerca di noduli polmonari",
      "Studio delle arterie polmonari",
      "Caratterizzazione di masse mediastiniche",
    ],
    answer: 1,
  },
  {
    id: "q2",
    section: "immagine",
    topic: "Interpretazione",
    prompt: "Osserva lo schema didattico e seleziona la descrizione corretta.",
    options: [
      "Opacità a vetro smerigliato nel lobo superiore destro",
      "Nodulo solido nel lobo inferiore sinistro",
      "Atelettasia del lobo medio",
      "Versamento pleurico bilaterale",
    ],
    answer: 1,
  },
  {
    id: "q3",
    section: "teoria",
    topic: "Proiezione",
    prompt: "Nel paziente adulto deambulante, la proiezione di riferimento del torace è:",
    options: ["AP in clinostatismo", "PA in ortostatismo", "LL come unica incidenza", "AP lordotica di routine"],
    answer: 1,
  },
  {
    id: "q4",
    section: "teoria",
    topic: "Geometria",
    prompt: "Quale distanza fuoco-detettore è lo standard didattico del torace PA?",
    options: ["100 cm", "120 cm", "150 cm", "180 cm"],
    answer: 3,
  },
  {
    id: "q5",
    section: "teoria",
    topic: "Esposizione",
    prompt: "L’intervallo di kVp atteso per un torace PA digitale dell’adulto è:",
    options: ["50–70", "80–90", "110–125", "140–150"],
    answer: 2,
  },
  {
    id: "q6",
    section: "teoria",
    topic: "Respiro",
    prompt: "L’istruzione respiratoria del torace standard è:",
    options: [
      "Respiro libero",
      "Apnea espiratoria",
      "Apnea inspiratoria profonda",
      "Respirazione rapida durante l’esposizione",
    ],
    answer: 2,
  },
  {
    id: "q7",
    section: "teoria",
    topic: "Griglia",
    prompt: "Sul torace PA dell’adulto la griglia antidiffusione va:",
    options: ["Sempre rimossa", "Inserita (rapporto alto, es. 12:1)", "Usata solo sotto i 60 kVp", "Sostituita dal fuoco grosso"],
    answer: 1,
  },
  {
    id: "q8",
    section: "teoria",
    topic: "Fuoco",
    prompt: "Per limitare la penombra sul parenchima polmonare si preferisce:",
    options: ["Macchia focale fine", "Macchia focale grossa", "DFF ridotta a 100 cm", "Campo 43×43 sempre aperto"],
    answer: 0,
  },
  {
    id: "q9",
    section: "teoria",
    topic: "Decubito",
    prompt: "Se il paziente è supino, anche con «PA» selezionato in console, il fascio reale è:",
    options: ["Ancora un PA", "Un’incidenza laterale", "Un AP con magnificazione cardiaca", "Indipendente dal decubito"],
    answer: 2,
  },
  {
    id: "q10",
    section: "teoria",
    topic: "Radioprotezione",
    prompt: "Il principio ALARA, in questo simulatore, significa:",
    options: [
      "La dose più bassa possibile, anche se l’immagine non risponde al quesito",
      "La dose minima che risponde ancora al quesito clinico",
      "Ripetere sempre tre scatti e tenere il migliore",
      "Escludere la griglia per ridurre il DAP a ogni costo",
    ],
    answer: 1,
  },
];

const KEY = "aequan.tsrm.quiz.v1";
const POINTS = 4;

export function TirocinioView({ onStartPractical }: { onStartPractical: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { index: number; answers: Record<string, number> };
      setIndex(parsed.index ?? 0);
      setAnswers(parsed.answers ?? {});
    } catch {
      /* ignore broken local quiz */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify({ index, answers }));
  }, [index, answers]);

  const question = QUESTIONS[index];
  const answered = Object.keys(answers).length;
  const correct = QUESTIONS.filter((item) => answers[item.id] === item.answer).length;
  const score = correct * POINTS;
  const max = QUESTIONS.length * POINTS;
  const theory = QUESTIONS.filter((item) => item.section === "teoria");
  const images = QUESTIONS.filter((item) => item.section === "immagine");
  const theoryScore = theory.filter((item) => answers[item.id] === item.answer).length;
  const imageScore = images.filter((item) => answers[item.id] === item.answer).length;
  const done = answered === QUESTIONS.length;
  const positive = score >= 24;

  const bars = useMemo(
    () => [
      { label: "Conoscenze teoriche", value: theoryScore, max: theory.length },
      { label: "Interpretazione immagini", value: imageScore, max: images.length },
      { label: "Procedure e protocolli", value: Math.min(theoryScore, 7), max: 10 },
      { label: "Competenze trasversali", value: Math.min(correct, 6), max: 10 },
    ],
    [theoryScore, imageScore, theory.length, images.length, correct],
  );

  function choose(option: number) {
    setAnswers((current) => ({ ...current, [question.id]: option }));
    setRevealed(true);
  }

  function go(next: number) {
    setIndex(Math.min(QUESTIONS.length - 1, Math.max(0, next)));
    setRevealed(false);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <ol className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white px-3 py-3 shadow-sm sm:px-5">
        <Step n="1" label="Tirocinio" state="done" />
        <Rail />
        <Step n="2" label="Valutazione" state="current" />
        <Rail />
        <Step n="3" label="Risultati" state={done ? "current" : "todo"} />
      </ol>

      <section className="overflow-hidden rounded-3xl border border-white bg-white shadow-[0_18px_50px_-28px_rgba(30,58,95,0.45)]">
        <div className="grid items-center gap-4 bg-gradient-to-r from-white via-white to-sky-50 px-4 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-[#1e3a5f]">
              <GraduationCap size={22} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#16304f] sm:text-[28px]">
                Valutazione del tirocinio
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
                Verifica le conoscenze trattate nel tirocinio e confrontale con la simulazione pratica del torace.
              </p>
            </div>
          </div>
          <ArchBanner />
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4">
          <article className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-[#1e3a5f]">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold">
                    {question.section === "immagine" ? "Interpretazione dell’immagine" : "Conoscenze teoriche"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {question.section === "immagine"
                      ? "Osserva lo schema e seleziona la descrizione corretta."
                      : "Verifica le conoscenze sui principali argomenti del tirocinio."}
                  </p>
                </div>
              </div>
              <div className="min-w-[140px] text-right">
                <p className="text-xs font-medium text-slate-500">
                  Domanda {index + 1} di {QUESTIONS.length}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#3b82f6]"
                    style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>
            </header>

            <div className={`mt-5 grid gap-4 ${question.section === "immagine" ? "lg:grid-cols-[220px_minmax(0,1fr)]" : ""}`}>
              {question.section === "immagine" ? <LungSchema /> : null}
              <div>
                <p className="text-[15px] font-semibold leading-snug text-[#16304f]">{question.prompt}</p>
                <ul className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    const show = revealed || answers[question.id] !== undefined;
                    const good = show && optionIndex === question.answer;
                    const bad = show && selected && optionIndex !== question.answer;
                    return (
                      <li key={option}>
                        <button
                          type="button"
                          onClick={() => choose(optionIndex)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                            good
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : bad
                                ? "border-rose-200 bg-rose-50 text-rose-900"
                                : selected
                                  ? "border-sky-200 bg-sky-50 text-[#1e3a5f]"
                                  : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                              selected ? "border-[#1e3a5f]" : "border-slate-300"
                            }`}
                          >
                            {selected ? <span className="h-2 w-2 rounded-full bg-[#1e3a5f]" /> : null}
                          </span>
                          {option}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={secondaryBtn}>
                <ChevronLeft size={16} />
                Domanda precedente
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index === QUESTIONS.length - 1}
                className={primaryBtn}
              >
                Domanda successiva
                <ChevronRight size={16} />
              </button>
            </footer>
          </article>
        </div>

        <aside className="grid gap-4">
          <article className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[#16304f]">Avanzamento valutazione</h3>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
              </div>
              <span className="font-display text-2xl font-bold tabular-nums text-[#1e3a5f]">
                {Math.round((answered / QUESTIONS.length) * 100)}%
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {answered} di {QUESTIONS.length} domande completate
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Valutazione finale (provvisoria)</h3>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <p className="font-display text-4xl font-bold tracking-tight text-[#16304f] tabular-nums">
                {score}
                <span className="text-xl font-semibold text-slate-400"> / {max}</span>
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  answered === 0
                    ? "bg-slate-100 text-slate-500"
                    : positive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                <Check size={12} />
                {answered === 0 ? "In corso" : positive ? "Positivo" : "Da consolidare"}
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Dettaglio per ambito</p>
            <ul className="mt-2 space-y-2">
              {bars.map((bar) => (
                <li key={bar.label} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                  <span className="text-slate-600">{bar.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {bar.value}/{bar.max}
                  </span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-[#60a5fa]"
                      style={{ width: `${bar.max ? (bar.value / bar.max) * 100 : 0}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onStartPractical} className={`${primaryBtn} mt-4 w-full`}>
              Vai alla simulazione pratica
            </button>
          </article>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, label, state }: { n: string; label: string; state: "done" | "current" | "todo" }) {
  return (
    <li className="flex shrink-0 items-center gap-2 text-sm font-semibold">
      <span
        className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "current"
              ? "bg-[#1e3a5f] text-white"
              : "bg-slate-100 text-slate-400"
        }`}
      >
        {state === "done" ? <Check size={14} /> : n}
      </span>
      <span className={state === "todo" ? "text-slate-400" : "text-[#1e3a5f]"}>{label}</span>
    </li>
  );
}

function Rail() {
  return <span className="h-px w-8 shrink-0 bg-slate-200 sm:w-16" />;
}

function ArchBanner() {
  return (
    <svg viewBox="0 0 280 92" className="hidden h-[92px] w-[280px] sm:block" aria-hidden="true">
      <rect width="280" height="92" rx="16" fill="#eaf2fb" />
      {[0, 1, 2, 3, 4].map((column) => (
        <g key={column} transform={`translate(${18 + column * 52} 18)`}>
          <path d="M8 58 V28 Q26 8 44 28 V58" fill="none" stroke="#9db7d6" strokeWidth="3" />
          <rect x="6" y="56" width="40" height="8" fill="#c5d5ea" />
        </g>
      ))}
    </svg>
  );
}

function LungSchema() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <svg viewBox="0 0 220 180" className="h-auto w-full" role="img" aria-label="Schema didattico del torace con nodulo nel lobo inferiore sinistro">
        <rect width="220" height="180" fill="#05070b" />
        <ellipse cx="78" cy="96" rx="48" ry="62" fill="#1c2430" stroke="#4b5563" />
        <ellipse cx="142" cy="96" rx="48" ry="62" fill="#1c2430" stroke="#4b5563" />
        <path d="M110 40 L110 150" stroke="#374151" />
        <circle cx="156" cy="128" r="11" fill="#d1d5db" />
        <circle cx="156" cy="128" r="18" fill="none" stroke="#38bdf8" strokeWidth="2" />
        <text x="12" y="18" fill="#94a3b8" fontSize="9" fontFamily="ui-sans-serif">
          SCHEMA DIDATTICO
        </text>
        <text x="12" y="168" fill="#94a3b8" fontSize="9" fontFamily="ui-sans-serif">
          L · nodulo LLS
        </text>
      </svg>
    </div>
  );
}
