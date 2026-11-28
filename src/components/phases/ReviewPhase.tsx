import { ViewerPanel, type ViewerTool } from "@/components/console/ViewerPanel";
import { formatNum } from "@/lib/number";
import type {
  Analysis,
  ArtifactClaim,
  ClinicalCase,
  ExposureShot,
  GrayWindow,
} from "@/types/rx";

export const ARTIFACT_OPTIONS: { id: ArtifactClaim; label: string }[] = [
  { id: "none", label: "Nessun artefatto rilevante" },
  { id: "noise", label: "Rumore quantico" },
  { id: "scatter", label: "Scatter da griglia assente" },
  { id: "motion", label: "Sfocatura cinetica" },
  { id: "heart", label: "Ingrandimento cardiaco geometrico" },
  { id: "clip", label: "Taglio anatomico da collimazione" },
  { id: "penetration", label: "Penetrazione insufficiente" },
];

export function ReviewPhase({
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
  onDeliver: () => void;
}) {
  const shot = shots[selectedIndex] ?? shots[shots.length - 1];
  const ready = adequate !== null && claims.length > 0;
  if (!shot) return null;
  const technique = shot.technique;

  function toggle(id: ArtifactClaim) {
    if (id === "none") {
      onClaims(claims.includes("none") ? [] : ["none"]);
      return;
    }
    const withoutNone = claims.filter((item) => item !== "none");
    onClaims(
      withoutNone.includes(id)
        ? withoutNone.filter((item) => item !== id)
        : [...withoutNone, id],
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ViewerPanel
        clinical={clinical}
        technique={technique}
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
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-panel">
        <div className="min-h-0 flex-1 overflow-y-auto rx-scroll px-3 py-2">
          <h2 className="font-display text-[15px] text-ice">Verifica qualità e artefatti</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Scegli lo scatto da inviare. Dichiara se è adeguato al quesito e quali difetti riconosci.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-px border border-line bg-line font-mono text-[11px] tabular-nums">
            <Meta k="Scatto" v={String(shot.index).padStart(2, "0")} />
            <Meta k="kVp" v={formatNum(technique.kvp, 0)} />
            <Meta k="mAs" v={formatNum(technique.mas, 1)} />
            <Meta k="DFF" v={`${formatNum(technique.dff, 0)} cm`} />
            <Meta k="Proiezione" v={`${technique.projection} ${technique.decubitus === "SUPINO" ? "supino" : "eretto"}`} />
            <Meta k="EI" v={formatNum(shot.dosimetry.ei, 0)} />
          </dl>
          <fieldset className="mt-3">
            <legend className="text-[11px] tracking-[0.12em] text-muted uppercase">
              Adeguatezza diagnostica
            </legend>
            <div className="mt-2 flex gap-2">
              <Choice active={adequate === true} onClick={() => onAdequate(true)}>
                Adeguata
              </Choice>
              <Choice active={adequate === false} onClick={() => onAdequate(false)}>
                Non adeguata
              </Choice>
            </div>
          </fieldset>
          <fieldset className="mt-3">
            <legend className="text-[11px] tracking-[0.12em] text-muted uppercase">
              Artefatti riconosciuti
            </legend>
            <ul className="mt-2 space-y-1.5">
              {ARTIFACT_OPTIONS.map((option) => (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-ice">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#6BA3DE]"
                      checked={claims.includes(option.id)}
                      onChange={() => toggle(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
        <div className="shrink-0 border-t border-line p-3">
          <button
            type="button"
            disabled={!ready}
            onClick={onDeliver}
            className="h-10 w-full bg-ice text-[13px] font-semibold text-raised hover:bg-[#E2E8F0] disabled:bg-raised disabled:text-muted"
          >
            Consegna esame per valutazione →
          </button>
        </div>
      </aside>
    </div>
  );
}

function Choice({
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
      className={`h-8 flex-1 border text-[12px] ${
        active
          ? "border-cyan-clin bg-obsidian text-cyan-clin"
          : "border-line bg-raised text-ice hover:border-[#345884]"
      }`}
    >
      {children}
    </button>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-raised px-2 py-1">
      <div className="text-[9px] tracking-[0.12em] text-muted">{k}</div>
      <div className="text-ice">{v}</div>
    </div>
  );
}
