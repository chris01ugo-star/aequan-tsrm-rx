"use client";

import { useState } from "react";
import { ghostBtn } from "@/components/ui/buttons";

const TABS = [
  {
    id: "accettazione",
    label: "Accettazione",
    title: "Accettazione e paziente",
    points: [
      "Confronta identità e richiesta RIS prima di entrare in sala.",
      "Togli collane, bottoni e orologi dal campo del torace.",
      "Spiega postura e apnea: il paziente deve sapere cosa fare.",
    ],
  },
  {
    id: "sala",
    label: "Sala e consolle",
    title: "Sala 3D e consolle",
    points: [
      "Posiziona, centra e collima. La croce laser indica il punto di centratura.",
      "Esci e chiudi la porta piombata: a porta aperta l'erogazione resta bloccata.",
      "Scegli tecnica manuale oppure AEC, poi premi Eroga RX.",
    ],
  },
  {
    id: "pacs",
    label: "PACS e referto",
    title: "Controllo PACS e referto",
    points: [
      "Leggi la lastra con i preset Polmone, Mediastino e Osso.",
      "Compila qualità immagine, anatomia e radioprotezione.",
      "Archivia solo quando i criteri Item A–G sono compilati.",
    ],
  },
] as const;

export function QuickGuideDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("accettazione");
  const current = TABS.find((item) => item.id === tab) ?? TABS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1320]/75 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-guide-title"
        className="w-full max-w-lg rounded-xl border border-[#2A486D] bg-[#16253B]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#2A486D] px-4 py-3">
          <h2 id="quick-guide-title" className="font-display text-base font-bold">
            Guida rapida
          </h2>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Chiudi
          </button>
        </header>
        <div className="flex gap-1 px-4 pt-3">
          {TABS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md border px-2 py-1 text-[12px] ${
                tab === item.id
                  ? "border-[#6BA3DE] bg-[#1E3A5F] text-white"
                  : "border-[#2A486D] text-[#C5D4E4]"
              }`}
            >
              {index + 1}. {item.label}
            </button>
          ))}
        </div>
        <div className="px-4 py-4">
          <p className="text-[13px] font-medium text-[#F8FAFC]">{current.title}</p>
          <ol className="mt-2 space-y-1.5 text-[13px] leading-snug text-[#C5D4E4]">
            {current.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
