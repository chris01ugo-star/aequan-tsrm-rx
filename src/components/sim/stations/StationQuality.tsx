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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-[10px] overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-[10px] overflow-hidden lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,420px)]">
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
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
        <aside className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto rounded-xl border border-[#e7eaef] bg-white p-2 rx-scroll">
          <Card
            index="1"
            title="Qualità immagine"
            done={gradesReady && quality.acceptable !== null}
          >
            {AXES.map((axis) => (
              <div key={axis.key} className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
                <p className="truncate text-[11px] text-slate-500" title={axis.label}>{axis.label}</p>
                <div className="grid w-[210px] grid-cols-3 gap-1">
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
            <p className="mt-2 text-[11px] text-slate-500">Accettabilità diagnostica dello scatto selezionato</p>
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
            <Card index="R" title="Reject Analysis" done={rejectsReady}>
              <ul className="mt-1 space-y-2">
                {shots.map((item, index) =>
                  index === selectedIndex ? null : (
                    <li key={item.index}>
                      <p className="text-[11px] text-slate-500">Scatto {item.index} non consegnato</p>
                      <select
                        value={item.rejectReason ?? ""}
                        onChange={(event) => onReject(index, event.target.value as RejectReason)}
                        className="mt-1 h-8 w-full rounded-md border border-[#e7eaef] bg-[#f4f6f9] px-2 text-[12px] text-[#1f2b3b]"
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
          <Card
            index="2"
            title="Anatomia radiologica (Item F)"
            done={quality.bone && quality.visceral && quality.landmarks && quality.vascular && quality.pathology !== null}
          >
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[12px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={quality.bone} onChange={(event) => onQuality({ bone: event.target.checked })} />
                Ossea
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={quality.visceral} onChange={(event) => onQuality({ visceral: event.target.checked })} />
                Viscerale
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={quality.landmarks} onChange={(event) => onQuality({ landmarks: event.target.checked })} />
                Reperi
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={quality.vascular} onChange={(event) => onQuality({ vascular: event.target.checked })} />
                Vascolare
              </label>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
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
          <Card index="3" title="Radioprotezione (Item G)" done={quality.quiz !== null}>
            <p className="text-[12px] leading-snug">
              Sul torace PA dell&apos;adulto, aumentare il kVp del 15% a parità di annerimento permette di:
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1">
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

function Card({
  index,
  title,
  done,
  children,
}: {
  index: string;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="shrink-0 rounded-lg border border-[#e7eaef] bg-[#f4f6f9] p-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[12px] font-bold">
          {index}. {title}
        </h3>
        <span className={`shrink-0 text-[10px] ${done ? "text-[#2d4f7a]" : "text-amber-700"}`}>
          {done ? "Completato ✓" : "Da compilare"}
        </span>
      </div>
      {children}
    </section>
  );
}
