"use client";

import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { primaryBtn, ghostBtn } from "@/components/ui/buttons";
import { ARTIFACT_OPTIONS } from "@/components/phases/ReviewPhase";
import type {
  Analysis,
  ArtifactClaim,
  ClinicalCase,
  ExposureShot,
  GrayWindow,
} from "@/types/rx";

export function ReviewDialog({
  clinical,
  analysis,
  shots,
  selectedIndex,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  adequate,
  claims,
  onSelectShot,
  onGray,
  onView,
  onReset,
  onAdequate,
  onClaims,
  onClose,
  onDeliver,
}: {
  clinical: ClinicalCase;
  analysis: Analysis;
  shots: ExposureShot[];
  selectedIndex: number;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  adequate: boolean | null;
  claims: ArtifactClaim[];
  onSelectShot: (index: number) => void;
  onGray: (patch: Partial<GrayWindow>) => void;
  onView: (patch: {
    zoom?: number;
    panX?: number;
    panY?: number;
    overlay?: boolean;
    tool?: ViewerTool;
  }) => void;
  onReset: () => void;
  onAdequate: (value: boolean) => void;
  onClaims: (claims: ArtifactClaim[]) => void;
  onClose: () => void;
  onDeliver: () => void;
}) {
  const shot = shots[selectedIndex] ?? shots[shots.length - 1];
  const ready = adequate !== null && claims.length > 0 && Boolean(shot);

  function toggle(id: ArtifactClaim) {
    if (id === "none") {
      onClaims(claims.includes("none") ? [] : ["none"]);
      return;
    }
    const rest = claims.filter((item) => item !== "none");
    onClaims(rest.includes(id) ? rest.filter((item) => item !== id) : [...rest, id]);
  }

  if (!shot) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B1320]/75 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#2A486D] bg-[#16253B]"
      >
        <header className="flex items-center justify-between border-b border-[#2A486D] px-4 py-3">
          <h2 id="review-title" className="font-display text-base font-bold">
            Review e artefatti
          </h2>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Chiudi
          </button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-2">
          <div className="min-h-[220px] border-b border-[#2A486D] md:border-r md:border-b-0">
            <ViewerPanel
              clinical={clinical}
              technique={shot.technique}
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
              onReset={onReset}
            />
          </div>
          <div className="min-h-0 overflow-y-auto rx-scroll px-4 py-3">
            <p className="text-xs leading-relaxed text-[#9FB3C8]">
              Scegli lo scatto dalla striscia, poi dichiara se è adeguato e quali difetti riconosci.
            </p>
            <div className="mt-3 flex gap-2">
              <Choice on={adequate === true} onClick={() => onAdequate(true)}>Adeguata</Choice>
              <Choice on={adequate === false} onClick={() => onAdequate(false)}>Non adeguata</Choice>
            </div>
            <ul className="mt-3 space-y-1.5">
              {ARTIFACT_OPTIONS.map((option) => (
                <li key={option.id}>
                  <label className="flex items-start gap-2 text-xs leading-snug">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#6BA3DE]"
                      checked={claims.includes(option.id)}
                      onChange={() => toggle(option.id)}
                    />
                    {option.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-[#2A486D] p-3">
          <button type="button" disabled={!ready} onClick={onDeliver} className={`${primaryBtn} w-full`}>
            Consegna e genera Referto →
          </button>
        </div>
      </section>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 flex-1 rounded-xl text-xs font-medium ${
        on ? "bg-[#F8FAFC] text-[#1E324E]" : "border border-[#2A486D] bg-[#111D30] text-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}
