"use client";

import type { ReactNode } from "react";
import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { Pick } from "@/components/sim/stations/controls";
import { primaryBtn, secondaryBtn } from "@/components/ui/buttons";
import { REJECT_OPTIONS } from "@/lib/rejectAnalysis";
import type { QualityReview } from "@/components/sim/examSession";
import type {
  Analysis,
  ClinicalCase,
  ExposureShot,
  GrayWindow,
  QualityGrade,
  RejectReason,
  Technique,
} from "@/types/rx";

const GRADES: { id: QualityGrade; label: string }[] = [
  { id: "adeguato", label: "Adeguato" },
  { id: "subottimale", label: "Subottimale" },
  { id: "inadeguato", label: "Inadeguato" },
];

const AXES: { key: "density" | "contrast" | "sharpness" | "artifacts"; label: string }[] = [
  { key: "density", label: "Densità / livello di grigio" },
  { key: "contrast", label: "Contrasto" },
  { key: "sharpness", label: "Nitidezza e distorsione" },
  { key: "artifacts", label: "Artefatti" },
];

export function StationQuality({
  clinical,
  technique,
  analysis,
  shots,
  selectedIndex,
  quality,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  onQuality,
  onSelectShot,
  onGray,
  onView,
  onResetView,
  onReject,
  onBack,
  onDeliver,
}: {
  clinical: ClinicalCase;
  technique: Technique;
  analysis: Analysis;
  shots: ExposureShot[];
  selectedIndex: number;
  quality: QualityReview;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  onQuality: (patch: Partial<QualityReview>) => void;
  onSelectShot: (index: number) => void;
  onGray: (patch: Partial<GrayWindow>) => void;
  onView: (patch: { zoom?: number; panX?: number; panY?: number; overlay?: boolean; tool?: ViewerTool }) => void;
  onResetView: () => void;
  onReject: (index: number, reason: RejectReason) => void;
  onBack: () => void;
  onDeliver: () => void;
}) {
  const shot = shots[selectedIndex] ?? null;
  const gradesReady = AXES.every((axis) => quality[axis.key] !== null);
  const rejectsReady = shots.every((item, index) => index === selectedIndex || Boolean(item.rejectReason));
  const ready =
    gradesReady &&
    quality.acceptable !== null &&
    quality.pathology !== null &&
    quality.quiz !== null &&
    (shots.length < 2 || rejectsReady);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,420px)]">
        <section className="min-h-0 overflow-hidden rounded-xl border border-[#2A486D]">
          <ViewerPanel
            clinical={clinical}
            technique={shot?.technique ?? technique}
            analysis={analysis}
            shot={shot}
            dirty={false}
            acquiring={false}
            gray={gray}
            zoom={zoom}
            panX={panX}
            panY={panY}
            overlay={overlay}
            tool={tool}
            shots={shots}
            selectedIndex={selectedIndex}
            onSelectShot={onSelectShot}
            onGray={onGray}
            onView={onView}
            onReset={onResetView}
          />
        </section>
        <aside className="min-h-0 space-y-3 overflow-y-auto rounded-xl border border-[#2A486D] bg-[#16253B] p-3 rx-scroll">
          <Card title="Criteri di qualità immagine">
            {AXES.map((axis) => (
              <div key={axis.key} className="mt-2">
                <p className="text-[11px] text-[#9FB3C8]">{axis.label}</p>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {GRADES.map((grade) => (
                    <Pick
                      key={grade.id}
                      on={quality[axis.key] === grade.id}
                      onClick={() => onQuality({ [axis.key]: grade.id })}
                    >
                      {grade.label}
                    </Pick>
                  ))}
                </div>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-[#9FB3C8]">Accettabilità diagnostica dello scatto selezionato</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <Pick on={quality.acceptable === true} onClick={() => onQuality({ acceptable: true })}>
                Accettabile
              </Pick>
              <Pick on={quality.acceptable === false} onClick={() => onQuality({ acceptable: false })}>
                Non accettabile
              </Pick>
            </div>
          </Card>
          {shots.length > 1 ? (
            <Card title="Reject Analysis">
              <ul className="mt-1 space-y-2">
                {shots.map((item, index) =>
                  index === selectedIndex ? null : (
                    <li key={item.index}>
                      <p className="text-[11px] text-[#9FB3C8]">Scatto {item.index} non consegnato</p>
                      <select
                        value={item.rejectReason ?? ""}
                        onChange={(event) => onReject(index, event.target.value as RejectReason)}
                        className="mt-1 h-8 w-full rounded-md border border-[#2A486D] bg-[#111D30] px-2 text-[12px] text-[#F8FAFC]"
                      >
                        <option value="">Motivo del rifiuto</option>
                        {REJECT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ),
                )}
              </ul>
            </Card>
          ) : null}
          <Card title="Anatomia radiologica">
            <label className="mt-1 flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={quality.bone} onChange={(event) => onQuality({ bone: event.target.checked })} />
              Componente ossea
            </label>
            <label className="mt-1 flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={quality.visceral} onChange={(event) => onQuality({ visceral: event.target.checked })} />
              Componente viscerale
            </label>
            <label className="mt-1 flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={quality.landmarks} onChange={(event) => onQuality({ landmarks: event.target.checked })} />
              Strutture di riferimento
            </label>
            <label className="mt-1 flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={quality.vascular} onChange={(event) => onQuality({ vascular: event.target.checked })} />
              Componente vascolare
            </label>
            <div className="mt-2 grid gap-1">
              {(
                [
                  ["addensamento", "Addensamento parenchimale lobare inferiore/medio destro"],
                  ["nei_limiti", "Quadro polmonare nei limiti"],
                  ["pneumotorace", "Pneumotorace"],
                  ["versamento", "Versamento pleurico massivo"],
                ] as const
              ).map(([id, label]) => (
                <Pick key={id} on={quality.pathology === id} onClick={() => onQuality({ pathology: id })}>
                  {label}
                </Pick>
              ))}
            </div>
          </Card>
          <Card title="Radioprotezione contestuale">
            <p className="text-[12px] leading-snug">
              Sul torace PA dell&apos;adulto, aumentare il kVp del 15% a parità di annerimento permette di:
            </p>
            <div className="mt-1 grid gap-1">
              <Pick on={quality.quiz === "rule15"} onClick={() => onQuality({ quiz: "rule15" })}>
                Dimezzare circa i mAs
              </Pick>
              <Pick on={quality.quiz === "dff"} onClick={() => onQuality({ quiz: "dff" })}>
                Dimezzare la DFF senza effetto sulla dose
              </Pick>
              <Pick on={quality.quiz === "grid"} onClick={() => onQuality({ quiz: "grid" })}>
                Togliere la griglia sul PA e lasciarla solo sulla LL
              </Pick>
              <Pick on={quality.quiz === "test"} onClick={() => onQuality({ quiz: "test" })}>
                Prescrivere un test di gravidanza a questo paziente
              </Pick>
            </div>
          </Card>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className={secondaryBtn}>
          ← Sala Comandi
        </button>
        <button type="button" disabled={!ready || !shot} onClick={onDeliver} className={primaryBtn}>
          Archivia e Invia a PACS (A8) → Genera Referto
        </button>
      </footer>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#2A486D] bg-[#111D30] p-2">
      <h3 className="font-display text-[13px] font-bold">{title}</h3>
      {children}
    </section>
  );
}
