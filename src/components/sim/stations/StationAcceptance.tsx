"use client";

import { RisSummary } from "@/components/library/RisSummary";
import { primaryBtn } from "@/components/ui/buttons";
import { Guide, Pick } from "@/components/sim/stations/controls";
import { guidedGap, type Acceptance } from "@/components/sim/examSession";
import type { ClinicalCase, SimMode } from "@/types/rx";

const REPLIES = {
  identity:
    "Confermo: sono il paziente della richiesta PT-AEQ-01, 54 anni, maschio. I dati del braccialetto coincidono con il RIS.",
  documents:
    "Ho una radiografia del torace di due anni fa, già in archivio. Non ho referti cartacei con me.",
  pregnancy:
    "Non applicabile: paziente di sesso maschile. Non si prescrive un test di gravidanza.",
  tolerance:
    "Riesco a stare in piedi. Il dolore è lieve e trattengo il respiro per alcuni secondi.",
};

export function StationAcceptance({
  clinical,
  mode,
  acceptance,
  onChange,
  onNext,
}: {
  clinical: ClinicalCase;
  mode: SimMode;
  acceptance: Acceptance;
  onChange: (patch: Partial<Acceptance>) => void;
  onNext: () => void;
}) {
  const wrong =
    acceptance.modality !== null &&
    acceptance.district !== null &&
    (acceptance.modality !== "RX" || acceptance.district !== "TORACE");
  const gap = mode === "guided" ? guidedGap(acceptance) : !acceptance.modality || !acceptance.district ? "Seleziona metodica e distretto" : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {mode === "guided" ? (
        <Guide text="Obiettivo: riconoscere l'esame sulla richiesta, identificare il paziente, togliere i metalli dal torace e spiegare cosa farà." />
      ) : null}
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-2">
        <section className="min-h-0 overflow-y-auto rounded-xl border border-[#2A486D] bg-[#16253B] p-4 rx-scroll">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#6BA3DE]">RICHIESTA RIS · {clinical.id}</p>
          <h2 className="mt-1 font-display text-lg font-bold">Accettazione paziente</h2>
          <div className="mt-3">
            <RisSummary clinical={clinical} />
          </div>
          <p className="mt-3 text-sm leading-relaxed">{clinical.history}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">{clinical.question}</p>
        </section>
        <section className="min-h-0 space-y-3 overflow-y-auto rounded-xl border border-[#2A486D] bg-[#16253B] p-4 rx-scroll">
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Metodica</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(
                [
                  ["RX", "RX Convenzionale"],
                  ["TC", "TC"],
                  ["RM", "RM"],
                  ["MN", "Medicina Nucleare"],
                ] as const
              ).map(([id, label]) => (
                <Pick key={id} on={acceptance.modality === id} onClick={() => onChange({ modality: id })}>
                  {label}
                </Pick>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Distretto / esame</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(
                [
                  ["TORACE", "Torace"],
                  ["GINOCCHIO", "Ginocchio"],
                  ["ADDOME", "Addome"],
                  ["RACHIDE", "Rachide"],
                ] as const
              ).map(([id, label]) => (
                <Pick key={id} on={acceptance.district === id} onClick={() => onChange({ district: id })}>
                  {label}
                </Pick>
              ))}
            </div>
            {wrong && mode === "guided" ? (
              <p className="mt-2 rounded-lg border border-[#F39C12] bg-[#2A2110] px-2 py-1.5 text-[12px] leading-snug">
                La richiesta descrive tosse, febbre e dolore toracico: la metodica è la radiografia convenzionale del torace, non un altro distretto.
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Dialogo con il paziente</p>
            <div className="mt-1 space-y-1">
              <Ask
                asked={acceptance.identity}
                label="Può confermarmi nome, cognome e data di nascita?"
                reply={REPLIES.identity}
                onClick={() => onChange({ identity: true })}
              />
              <Ask
                asked={acceptance.documents}
                label="Ha con sé esami radiologici precedenti o documentazione clinica?"
                reply={REPLIES.documents}
                onClick={() => onChange({ documents: true })}
              />
              <Ask
                asked={acceptance.pregnancy}
                label="Verifica controindicazioni / stato di gravidanza (se applicabile)"
                reply={REPLIES.pregnancy}
                onClick={() => onChange({ pregnancy: true })}
              />
              <Ask
                asked={acceptance.tolerance}
                label="Riesce a stare in piedi e a trattenere il respiro per alcuni secondi?"
                reply={REPLIES.tolerance}
                onClick={() => onChange({ tolerance: true })}
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Rimozione corpi estranei</p>
            <Silhouette acceptance={acceptance} onChange={onChange} />
          </div>
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Radioprotezione del paziente</p>
            <div className="mt-1 grid gap-1">
              <Pick
                on={acceptance.protection === "collimation"}
                onClick={() => onChange({ protection: "collimation" })}
              >
                Collimazione mirata, senza schermatura a contatto di routine
              </Pick>
              <Pick
                on={acceptance.protection === "contact"}
                onClick={() => onChange({ protection: "contact" })}
              >
                Schermatura a contatto sul campo
              </Pick>
            </div>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">Istruzione prima del posizionamento</p>
            <div className="mt-1 grid gap-1">
              <Pick
                on={acceptance.instruction === "posture"}
                onClick={() => onChange({ instruction: "posture" })}
              >
                Spiegare postura, antiversione delle spalle e apnea inspiratoria
              </Pick>
              <Pick
                on={acceptance.instruction === "none"}
                onClick={() => onChange({ instruction: "none" })}
              >
                Nessuna istruzione: il paziente si sistema da solo
              </Pick>
            </div>
          </div>
        </section>
      </div>
      <footer className="flex shrink-0 justify-end">
        <button type="button" disabled={gap !== null} onClick={onNext} className={primaryBtn}>
          {gap ?? "Accompagna il paziente in Sala RX (Stazione 2) →"}
        </button>
      </footer>
    </div>
  );
}

function Ask({
  asked,
  label,
  reply,
  onClick,
}: {
  asked: boolean;
  label: string;
  reply: string;
  onClick: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg border px-2 py-1.5 text-left text-[12px] ${
          asked ? "border-[#6BA3DE] text-[#F8FAFC]" : "border-[#2A486D] text-[#9FB3C8] hover:text-[#F8FAFC]"
        }`}
      >
        {label}
      </button>
      {asked ? <p className="mt-1 rounded-md bg-[#111D30] px-2 py-1.5 text-[12px] leading-snug">{reply}</p> : null}
    </div>
  );
}

function Silhouette({
  acceptance,
  onChange,
}: {
  acceptance: Acceptance;
  onChange: (patch: Partial<Acceptance>) => void;
}) {
  return (
    <div className="relative mx-auto mt-2 h-48 w-40">
      <div className="absolute top-0 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border border-[#2A486D] bg-[#111D30]" />
      <div className="absolute top-9 left-1/2 h-32 w-24 -translate-x-1/2 rounded-t-[28px] border border-[#2A486D] bg-[#111D30]" />
      <div className="absolute top-16 left-1 h-3 w-6 rounded-full border border-[#2A486D] bg-[#111D30]" />
      <Hotspot
        className="top-7 left-1/2 -translate-x-1/2"
        removed={acceptance.necklace}
        label="Catenina metallica al collo"
        onClick={() => onChange({ necklace: true })}
      />
      <Hotspot
        className="top-20 left-[58%]"
        removed={acceptance.buttons}
        label="Bottoni metallici taschino"
        onClick={() => onChange({ buttons: true })}
      />
      <Hotspot
        className="top-[68px] left-0"
        removed={acceptance.watch}
        label="Orologio da polso"
        onClick={() => onChange({ watch: true })}
      />
    </div>
  );
}

function Hotspot({
  className,
  removed,
  label,
  onClick,
}: {
  className: string;
  removed: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute z-10 max-w-28 rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight ${className} ${
        removed
          ? "border-[#6BA3DE] bg-[#16253B] text-[#6BA3DE]"
          : "border-[#F39C12] bg-[#2A2110] text-[#F8FAFC]"
      }`}
    >
      {removed ? "Rimosso" : label}
    </button>
  );
}
