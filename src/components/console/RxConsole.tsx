"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArchiveView, CaseBankView, ReportHub, SettingsView } from "@/components/phases/LibraryViews";
import { CaseLibrary } from "@/components/library/CaseLibrary";
import { ReportView } from "@/components/report/ReportView";
import { DashboardShell, type DashView } from "@/components/shell/DashboardShell";
import {
  INITIAL_ACCEPTANCE,
  INITIAL_QUALITY,
  metalStillOn,
  modalityRecognized,
  type Acceptance,
  type QualityReview,
  type StationId,
} from "@/components/sim/examSession";
import { ImageStudioDialog } from "@/components/sim/ImageStudioDialog";
import { QuickGuideDialog } from "@/components/sim/QuickGuideDialog";
import { SimulationScreen } from "@/components/sim/SimulationScreen";
import { TirocinioView } from "@/components/valutazione/TirocinioView";
import { CASES, DEFAULT_TECHNIQUE, getCase } from "@/data/cases";
import { evaluateExam, presentArtifacts } from "@/lib/evaluation";
import { hydrateImageStore } from "@/lib/imageStore";
import { formatClock } from "@/lib/number";
import { clampTechnique } from "@/lib/rxGeometry";
import {
  aecBlocksExposure,
  analyzeTechnique,
  computeDosimetry,
  DEFAULT_WINDOW,
  renderLatent,
  techniqueForExposure,
} from "@/lib/rxPhysics";
import {
  getProgressSnapshot,
  getSessionSnapshot,
  readSessions,
  saveSessions,
  setProgressCase,
  subscribeProgress,
  subscribeSessions,
  type SavedSession,
} from "@/lib/sessionStore";
import { renderPlateExposure } from "@/lib/universalRxEngine";
import type { ArtifactClaim, Evaluation, ExamConduct, ExposureShot, GrayWindow, RejectReason, SimMode, Technique } from "@/types/rx";
import type { ViewerTool } from "@/components/console/ViewerPanel";

type Screen = "dashboard" | "simulation" | "report";

type Report = {
  evaluation: Evaluation;
  shot: ExposureShot;
  shotCount: number;
  cumulativeDap: number;
  durationSec: number;
};

export function RxConsole() {
  const clinical = getCase(CASES[0].id);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [dash, setDash] = useState<DashView>("dashboard");
  const [guideOpen, setGuideOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [simMode, setSimMode] = useState<SimMode>("guided");
  const [station, setStation] = useState<StationId>(1);
  const [doorClosed, setDoorClosed] = useState(false);
  const [acceptance, setAcceptance] = useState<Acceptance>(INITIAL_ACCEPTANCE);
  const [quality, setQuality] = useState<QualityReview>(INITIAL_QUALITY);
  const [technique, setTechnique] = useState<Technique>(DEFAULT_TECHNIQUE);
  const [shots, setShots] = useState<ExposureShot[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [exposureCount, setExposureCount] = useState(0);
  const [cumulativeDap, setCumulativeDap] = useState(0);
  const [acquiring, setAcquiring] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [gray, setGray] = useState<GrayWindow>(DEFAULT_WINDOW);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [tool, setTool] = useState<ViewerTool>("wl");
  const [report, setReport] = useState<Report | null>(null);
  const timer = useRef<number | null>(null);
  const sessionRaw = useSyncExternalStore(subscribeSessions, getSessionSnapshot, () => "[]");
  const progress = useSyncExternalStore(subscribeProgress, getProgressSnapshot, () => "");
  const sessions = useMemo(() => readSessions(sessionRaw), [sessionRaw]);
  const analysis = useMemo(() => analyzeTechnique(technique), [technique]);
  const completed = sessions.some((item) => item.caseId === clinical.id);

  useEffect(() => {
    void hydrateImageStore();
  }, []);

  useEffect(() => {
    if (screen !== "simulation") return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [screen]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function resetExam() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setTechnique(DEFAULT_TECHNIQUE);
    setShots([]);
    setSelectedIndex(0);
    setExposureCount(0);
    setCumulativeDap(0);
    setAcquiring(false);
    setElapsed(0);
    setGray(DEFAULT_WINDOW);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setOverlay(false);
    setTool("wl");
    setReport(null);
    setSimMode("guided");
    setStation(1);
    setDoorClosed(false);
    setAcceptance(INITIAL_ACCEPTANCE);
    setQuality(INITIAL_QUALITY);
  }

  function begin(mode: SimMode) {
    resetExam();
    setSimMode(mode);
    setStation(1);
    setProgressCase(clinical.id);
    setScreen("simulation");
  }

  function expose() {
    if (acquiring || shots.length >= 3 || !doorClosed || aecBlocksExposure(technique)) return;
    const draft = technique;
    const metal = metalStillOn(acceptance);
    setAcquiring(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const plate = renderPlateExposure(draft, Date.now(), metal);
        const snapshot = plate?.technique ?? techniqueForExposure(draft);
        const latent = plate?.latent ?? renderLatent(snapshot, Date.now(), metal);
        const dosimetry = plate?.dosimetry ?? computeDosimetry(snapshot);
        const shot: ExposureShot = {
          index: exposureCount + 1,
          technique: snapshot,
          dosimetry,
          latent,
          timestampLabel: formatClock(new Date()),
          source: plate ? "plate" : "drr",
          sourceLabel: plate?.sourceLabel ?? "MOD: DX · SALA RX 01",
          drlDapDGyCm2: plate?.drlDapDGyCm2,
          foreignMetal: metal,
        };
        setShots((current) => [...current, shot]);
        setSelectedIndex(exposureCount);
        setExposureCount((count) => count + 1);
        setCumulativeDap((value) => value + dosimetry.dapDGyCm2);
        setGray(DEFAULT_WINDOW);
        setZoom(1);
        setPanX(0);
        setPanY(0);
      } finally {
        setAcquiring(false);
      }
    }, 400);
  }

  function deliver() {
    const shot = shots[selectedIndex];
    const rejectsMissing = shots.some((item, index) => index !== selectedIndex && !item.rejectReason);
    if (!shot || quality.acceptable === null || report) return;
    if (shots.length > 1 && rejectsMissing) return;
    const rejected = shots
      .filter((item) => item !== shot && item.rejectReason)
      .map((item) => ({ technique: item.technique, reason: item.rejectReason as RejectReason }));
    const preview = analyzeTechnique(shot.technique);
    const present = presentArtifacts(shot.technique, { ...preview, dosimetry: shot.dosimetry });
    const sawProblem =
      quality.artifacts !== "adeguato" || quality.density === "inadeguato" || quality.acceptable === false;
    const claims: ArtifactClaim[] = sawProblem ? present : ["none"];
    const di = Math.abs(shot.dosimetry.di);
    const conduct: ExamConduct = {
      mode: simMode,
      modalityOk: modalityRecognized(acceptance),
      identityConfirmed: acceptance.identity,
      pregnancyHandled: acceptance.pregnancy,
      metalsCleared: !shot.foreignMetal,
      deliveredWithMetal: Boolean(shot.foreignMetal),
      metalRecognized: quality.artifacts === "inadeguato" || quality.artifacts === "subottimale",
      instructionGiven: acceptance.instruction === "posture",
      routineContactShield: acceptance.protection === "contact",
      acceptable: quality.acceptable,
      pathologyOk: quality.pathology === "addensamento",
      anatomyChecks: [quality.bone, quality.visceral, quality.landmarks, quality.vascular].filter(Boolean).length,
      quizOk: quality.quiz === "rule15",
      qualityCoherent:
        (di > 3 ? quality.density !== "adeguato" : di <= 1 ? quality.density !== "inadeguato" : true) &&
        (shot.foreignMetal ? quality.artifacts !== "adeguato" : true),
    };
    const evaluation = evaluateExam(
      shot.technique,
      shots.length,
      cumulativeDap,
      { adequate: quality.acceptable === true, claims },
      rejected,
      shot.source === "plate" ? shot.dosimetry : undefined,
      conduct,
    );
    const next: Report = {
      evaluation,
      shot,
      shotCount: shots.length,
      cumulativeDap,
      durationSec: elapsed,
    };
    const entry: SavedSession = {
      id: crypto.randomUUID(),
      caseId: clinical.id,
      caseTitle: "Caso 01 — RX Torace PA",
      score: evaluation.total,
      max: evaluation.max,
      shots: shots.length,
      cumulativeDap,
      savedAt: formatClock(new Date()),
      rejects: shots
        .filter((item) => item !== shot && item.rejectReason)
        .map((item) => ({ shot: item.index, reason: item.rejectReason as string })),
    };
    saveSessions([entry, ...sessions]);
    setProgressCase("");
    setReport(next);
    setScreen("report");
  }

  const viewProps = {
    gray,
    zoom,
    panX,
    panY,
    overlay,
    tool,
    onGray: (partial: Partial<GrayWindow>) => setGray((current) => ({ ...current, ...partial })),
    onView: (partial: { zoom?: number; panX?: number; panY?: number; overlay?: boolean; tool?: ViewerTool }) => {
      if (partial.zoom !== undefined) setZoom(partial.zoom);
      if (partial.panX !== undefined) setPanX(partial.panX);
      if (partial.panY !== undefined) setPanY(partial.panY);
      if (partial.overlay !== undefined) setOverlay(partial.overlay);
      if (partial.tool !== undefined) setTool(partial.tool);
    },
    onReset: () => {
      setGray(DEFAULT_WINDOW);
      setZoom(1);
      setPanX(0);
      setPanY(0);
    },
  };

  function leaveTo(view: DashView) {
    setDash(view);
    setScreen("dashboard");
  }

  const overlays = (
    <>
      {guideOpen ? <QuickGuideDialog onClose={() => setGuideOpen(false)} /> : null}
      {studioOpen ? <ImageStudioDialog onClose={() => setStudioOpen(false)} /> : null}
    </>
  );

  const shell = (node: ReactNode) => (
    <DashboardShell active={dash} onNavigate={leaveTo} onGuide={() => setGuideOpen(true)} onTeacher={() => setStudioOpen(true)}>
      {node}
      {overlays}
    </DashboardShell>
  );

  if (screen === "simulation") {
    return (
      <>
        <SimulationScreen
          clinical={clinical}
          mode={simMode}
          station={station}
          technique={technique}
          analysis={analysis}
          shots={shots}
          selectedIndex={selectedIndex}
          acquiring={acquiring}
          elapsedSec={elapsed}
          doorClosed={doorClosed}
          acceptance={acceptance}
          quality={quality}
          cumulativeDap={cumulativeDap}
          onTechnique={(partial) => setTechnique((current) => clampTechnique({ ...current, ...partial }))}
          onAcceptance={(partial) => setAcceptance((current) => ({ ...current, ...partial }))}
          onQuality={(partial) => setQuality((current) => ({ ...current, ...partial }))}
          onStation={setStation}
          onDoor={setDoorClosed}
          onSelectShot={setSelectedIndex}
          onResetView={viewProps.onReset}
          onReject={(index, reason) =>
            setShots((current) => current.map((item, i) => (i === index ? { ...item, rejectReason: reason } : item)))
          }
          onExpose={expose}
          onDeliver={deliver}
          onExit={() => {
            resetExam();
            setDash("library");
            setScreen("dashboard");
          }}
          {...viewProps}
        />
        {overlays}
      </>
    );
  }

  if (screen === "report" && report) {
    return (
      <>
        <ReportView
          evaluation={report.evaluation}
          shot={report.shot}
          shotCount={report.shotCount}
          cumulativeDap={report.cumulativeDap}
          durationSec={report.durationSec}
          onLibrary={() => {
            resetExam();
            setDash("library");
            setScreen("dashboard");
          }}
          onRepeat={() => {
            resetExam();
            setSimMode("guided");
            setProgressCase(clinical.id);
            setScreen("simulation");
          }}
        />
        {overlays}
      </>
    );
  }

  return shell(
    <>
      {dash === "dashboard" ? (
        <TirocinioView
          practical={(() => {
            const last = sessions.find((item) => item.caseId === clinical.id);
            return last ? { score: last.score, max: last.max } : null;
          })()}
          onStartPractical={() => begin("guided")}
        />
      ) : null}
      {dash === "library" ? (
        <CaseLibrary
          clinical={clinical}
          completed={completed}
          inProgress={progress === clinical.id}
          onStart={begin}
        />
      ) : null}
      {dash === "archive" ? <ArchiveView sessions={sessions} /> : null}
      {dash === "report" ? <ReportHub sessions={sessions} onOpenPractical={() => begin("guided")} /> : null}
      {dash === "bank" ? <CaseBankView /> : null}
      {dash === "settings" ? <SettingsView /> : null}
    </>,
  );
}
