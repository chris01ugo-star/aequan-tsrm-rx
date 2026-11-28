"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArchiveView, CaseBankView, ReportHub, SettingsView } from "@/components/phases/LibraryViews";
import { BriefingDialog } from "@/components/library/BriefingDialog";
import { CaseLibrary } from "@/components/library/CaseLibrary";
import { ReportView } from "@/components/report/ReportView";
import { DashboardShell, type DashView } from "@/components/shell/DashboardShell";
import { ReviewDialog } from "@/components/sim/ReviewDialog";
import { SimulationScreen } from "@/components/sim/SimulationScreen";
import { TirocinioView } from "@/components/valutazione/TirocinioView";
import { CASES, DEFAULT_TECHNIQUE, getCase } from "@/data/cases";
import { evaluateExam } from "@/lib/evaluation";
import { formatClock } from "@/lib/number";
import {
  analyzeTechnique,
  computeDosimetry,
  DEFAULT_WINDOW,
  renderLatent,
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
import type { ArtifactClaim, Evaluation, ExposureShot, GrayWindow, Technique } from "@/types/rx";
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
  const [query, setQuery] = useState("");
  const [briefingOverSim, setBriefingOverSim] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
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
  const [adequate, setAdequate] = useState<boolean | null>(null);
  const [claims, setClaims] = useState<ArtifactClaim[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const timer = useRef<number | null>(null);
  const sessionRaw = useSyncExternalStore(subscribeSessions, getSessionSnapshot, () => "[]");
  const progress = useSyncExternalStore(subscribeProgress, getProgressSnapshot, () => "");
  const sessions = useMemo(() => readSessions(sessionRaw), [sessionRaw]);
  const analysis = useMemo(() => analyzeTechnique(technique), [technique]);
  const completed = sessions.some((item) => item.caseId === clinical.id);

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
    setAdequate(null);
    setClaims([]);
    setReport(null);
    setReviewOpen(false);
    setBriefingOverSim(false);
  }

  function expose() {
    if (acquiring || shots.length >= 3) return;
    const snapshot = technique;
    setAcquiring(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const latent = renderLatent(snapshot, Date.now());
        const dosimetry = computeDosimetry(snapshot);
        const shot: ExposureShot = {
          index: exposureCount + 1,
          technique: snapshot,
          dosimetry,
          latent,
          timestampLabel: formatClock(new Date()),
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
    if (!shot || adequate === null || claims.length === 0 || report) return;
    const evaluation = evaluateExam(shot.technique, shots.length, cumulativeDap, {
      adequate,
      claims,
    });
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
    };
    saveSessions([entry, ...sessions]);
    setProgressCase("");
    setReport(next);
    setReviewOpen(false);
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
    onView: (partial: {
      zoom?: number;
      panX?: number;
      panY?: number;
      overlay?: boolean;
      tool?: ViewerTool;
    }) => {
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

  const shell = (node: ReactNode) => (
    <DashboardShell
      active={screen === "simulation" ? "library" : screen === "report" ? "report" : dash}
      onNavigate={leaveTo}
      query={query}
      onQuery={setQuery}
      showSearch={dash === "library" && screen === "dashboard"}
    >
      {node}
    </DashboardShell>
  );

  if (screen === "simulation") {
    return shell(
      <>
        <SimulationScreen
          clinical={clinical}
          technique={technique}
          analysis={analysis}
          shots={shots}
          selectedIndex={selectedIndex}
          acquiring={acquiring}
          elapsedSec={elapsed}
          cumulativeDap={cumulativeDap}
          onTechnique={(partial) => setTechnique((current) => ({ ...current, ...partial }))}
          onSelectShot={setSelectedIndex}
          onResetView={viewProps.onReset}
          onResetTechnique={() => setTechnique(DEFAULT_TECHNIQUE)}
          onBriefing={() => setBriefingOverSim(true)}
          onExpose={expose}
          onReview={() => {
            if (shots.length > 0) setReviewOpen(true);
          }}
          {...viewProps}
        />
        {briefingOverSim ? (
          <BriefingDialog clinical={clinical} readOnly onClose={() => setBriefingOverSim(false)} />
        ) : null}
        {reviewOpen ? (
          <ReviewDialog
            clinical={clinical}
            analysis={analysis}
            shots={shots}
            selectedIndex={selectedIndex}
            adequate={adequate}
            claims={claims}
            onSelectShot={setSelectedIndex}
            onAdequate={setAdequate}
            onClaims={setClaims}
            onClose={() => setReviewOpen(false)}
            onDeliver={deliver}
            {...viewProps}
          />
        ) : null}
      </>,
    );
  }

  if (screen === "report" && report) {
    return shell(
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
          setProgressCase(clinical.id);
          setScreen("simulation");
        }}
      />,
    );
  }

  return shell(
    <>
      {dash === "dashboard" ? (
        <TirocinioView
          onStartPractical={() => {
            resetExam();
            setProgressCase(clinical.id);
            setScreen("simulation");
          }}
        />
      ) : null}
      {dash === "library" ? (
        <CaseLibrary
          clinical={clinical}
          query={query}
          completed={completed}
          inProgress={progress === clinical.id}
          onStart={() => {
            resetExam();
            setProgressCase(clinical.id);
            setScreen("simulation");
          }}
        />
      ) : null}
      {dash === "archive" ? <ArchiveView sessions={sessions} /> : null}
      {dash === "report" ? (
        <ReportHub
          sessions={sessions}
          onOpenPractical={() => {
            resetExam();
            setProgressCase(clinical.id);
            setScreen("simulation");
          }}
        />
      ) : null}
      {dash === "bank" ? <CaseBankView /> : null}
      {dash === "settings" ? <SettingsView /> : null}
    </>,
  );
}
