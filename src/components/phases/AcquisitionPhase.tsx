import { useState } from "react";
import { GeometryPanel } from "@/components/console/GeometryPanel";
import { ParameterPanel } from "@/components/console/ParameterPanel";
import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { TickMeter } from "@/components/ui/TickMeter";
import { formatNum } from "@/lib/number";
import type {
  Analysis,
  ClinicalCase,
  ExposureShot,
  GrayWindow,
  Technique,
} from "@/types/rx";

const MAX_SHOTS = 3;

export function AcquisitionPhase({
  clinical,
  technique,
  analysis,
  shots,
  selectedIndex,
  acquiring,
  gray,
  zoom,
  panX,
  panY,
  overlay,
  tool,
  cumulativeDap,
  onTechnique,
  onSelectShot,
  onGray,
  onView,
  onReset,
  onExpose,
  onReview,
}: {
  clinical: ClinicalCase;
  technique: Technique;
  analysis: Analysis;
  shots: ExposureShot[];
  selectedIndex: number;
  acquiring: boolean;
  gray: GrayWindow;
  zoom: number;
  panX: number;
  panY: number;
  overlay: boolean;
  tool: ViewerTool;
  cumulativeDap: number;
  onTechnique: (patch: Partial<Technique>) => void;
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
  onExpose: () => void;
  onReview: () => void;
}) {
  const [tab, setTab] = useState<"patient" | "position">("patient");
  const shot = shots[selectedIndex] ?? null;
  const latest = shots[shots.length - 1] ?? null;
  const dirty = Boolean(latest && shot === latest && (
    latest.technique.kvp !== technique.kvp ||
    latest.technique.mas !== technique.mas ||
    latest.technique.dff !== technique.dff ||
    latest.technique.focal !== technique.focal ||
    latest.technique.grid !== technique.grid ||
    latest.technique.collW !== technique.collW ||
    latest.technique.collH !== technique.collH ||
    latest.technique.projection !== technique.projection ||
    latest.technique.decubitus !== technique.decubitus ||
    latest.technique.respiration !== technique.respiration
  ));
  const atLimit = shots.length >= MAX_SHOTS;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-panel">
          <div className="flex shrink-0 border-b border-line">
            <TabButton active={tab === "patient"} onClick={() => setTab("patient")}>
              Paziente & Sala
            </TabButton>
            <TabButton active={tab === "position"} onClick={() => setTab("position")}>
              Posizionamento
            </TabButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rx-scroll">
            {tab === "patient" ? (
              <>
                <div className="border-b border-line px-2 py-2">
                  <p className="font-display text-[13px] text-ice">{clinical.pseudoId}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {clinical.ageYears} anni · {clinical.sex} · {clinical.weightKg} kg ·{" "}
                    {clinical.heightCm} cm
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] tracking-[0.12em] text-muted uppercase">Collaborazione</p>
                      <TickMeter value={4} />
                    </div>
                    <div>
                      <p className="text-[9px] tracking-[0.12em] text-muted uppercase">Dolore</p>
                      <TickMeter value={2} mixed />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-ice">{clinical.indication}</p>
                </div>
                <GeometryPanel technique={technique} onChange={onTechnique} pane="room" />
              </>
            ) : (
              <GeometryPanel technique={technique} onChange={onTechnique} pane="position" />
            )}
          </div>
        </aside>

        <ViewerPanel
          clinical={clinical}
          technique={technique}
          analysis={analysis}
          shot={shot}
          dirty={dirty}
          acquiring={acquiring}
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

        <div className="w-[276px] shrink-0 border-l border-line">
          <ParameterPanel technique={technique} analysis={analysis} onChange={onTechnique} />
        </div>
      </div>

      <footer className="flex h-12 shrink-0 items-center gap-3 border-t border-line bg-panel px-3">
        <span className="font-mono text-[12px] tabular-nums text-ice">
          Scatti: {shots.length} / {MAX_SHOTS}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ice">
          Dose cumulativa {formatNum(cumulativeDap, 2)} dGy·cm²
        </span>
        {shots.length > 1 ? (
          <span className="min-w-0 truncate text-[11px] text-amber-rx">
            Ogni scatto ulteriore si somma alla dose cumulativa.
          </span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <button
          type="button"
          onClick={onExpose}
          disabled={acquiring || atLimit}
          className="h-9 shrink-0 bg-amber-rx px-3 text-[12px] font-semibold text-obsidian hover:bg-[#E8891A] disabled:opacity-50"
        >
          {acquiring ? "Acquisizione…" : atLimit ? "Limite 3 scatti" : "Avvia acquisizione RX"}
        </button>
        <button
          type="button"
          onClick={onReview}
          disabled={shots.length < 1 || acquiring}
          className="h-9 shrink-0 bg-ice px-3 text-[12px] font-semibold text-raised hover:bg-[#E2E8F0] disabled:bg-raised disabled:text-muted"
        >
          Procedi a Review →
        </button>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 flex-1 border-b text-[10px] tracking-[0.06em] ${
        active
          ? "border-cyan-clin text-cyan-clin"
          : "border-transparent text-muted hover:text-ice"
      }`}
    >
      {children}
    </button>
  );
}
