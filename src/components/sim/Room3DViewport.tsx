"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { formatNum } from "@/lib/number";
import type { Technique } from "@/types/rx";
import { createRoomScene, type RoomMode } from "@/components/sim/roomScene";

const PAD = 8;
const GAP = 8;
const HDR_H = 28;

type ViewportRect = { x: number; y: number; w: number; h: number };
type CssRect = { x: number; y: number; w: number; h: number };

type RoomFrames = {
  width: number;
  height: number;
  topH: number;
  halfW: number;
  axialFrame: CssRect;
  sideFrame: CssRect;
  mainFrame: CssRect;
  axial: ViewportRect;
  side: ViewportRect;
  main: ViewportRect;
  orbitMinY: number;
};

/** Unica griglia CSS/WebGL. In WebGL `y` parte dal basso; lo scissor ortografico sta sotto i 28px di header. */
function layoutOf(width: number, height: number): RoomFrames {
  const topH = Math.round(Math.min(Math.max(height * 0.34, 150), 230));
  const halfW = Math.max(1, Math.floor((width - PAD * 2 - GAP) / 2));
  const border = 1;
  const viewH = Math.max(1, topH - border * 2 - HDR_H);
  const axialFrame = { x: PAD, y: PAD, w: halfW, h: topH };
  const sideFrame = { x: PAD + halfW + GAP, y: PAD, w: halfW, h: topH };
  const viewTop = PAD + border + HDR_H;
  const glY = Math.max(0, height - viewTop - viewH);
  const mainTop = PAD + topH + GAP;
  const mainW = Math.max(1, width - PAD * 2);
  const mainH = Math.max(1, height - PAD - mainTop);
  return {
    width,
    height,
    topH,
    halfW,
    axialFrame,
    sideFrame,
    mainFrame: { x: PAD, y: mainTop, w: mainW, h: mainH },
    axial: { x: axialFrame.x, y: glY, w: halfW, h: viewH },
    side: { x: sideFrame.x, y: glY, w: halfW, h: viewH },
    main: { x: PAD, y: PAD, w: mainW, h: mainH },
    orbitMinY: mainTop,
  };
}

function fitOrtho(
  camera: THREE.OrthographicCamera,
  widthPx: number,
  heightPx: number,
  spanRight: number,
  spanUp: number,
) {
  const aspect = widthPx / Math.max(1, heightPx);
  const margin = 1.15;
  const halfUp = (spanUp * margin) / 2;
  const halfRight = (spanRight * margin) / 2;
  const halfH = Math.max(halfUp, halfRight / Math.max(0.01, aspect));
  const halfW = halfH * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

type CameraPreset = "home" | "room" | "tube" | "detector";

function placeCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  supine: boolean,
  preset: CameraPreset,
) {
  if (preset === "tube") {
    camera.position.set(supine ? 24 : 36, supine ? 48 : 154, supine ? 86 : -214);
    controls.target.set(0, supine ? 92 : 128, supine ? 0 : -28);
  } else if (preset === "detector") {
    camera.position.set(0, supine ? 206 : 132, supine ? 8 : 34);
    controls.target.set(0, supine ? 96 : 128, supine ? 0 : -18);
  } else if (preset === "room") {
    camera.position.set(supine ? 168 : 196, supine ? 186 : 172, supine ? -156 : -128);
    controls.target.set(0, supine ? 108 : 122, supine ? 0 : -18);
  } else if (supine) {
    camera.position.set(108, 152, -108);
    controls.target.set(0, 128, -2);
  } else {
    camera.position.set(128, 146, -62);
    controls.target.set(8, 126, -38);
  }
  controls.update();
}

function placeOrtho(
  axial: THREE.OrthographicCamera,
  side: THREE.OrthographicCamera,
  supine: boolean,
  sidCm: number,
) {
  const reach = Math.min(Math.max(sidCm, 90), 200);
  if (supine) {
    const x0 = -112;
    const x1 = 112;
    const z0 = -72;
    const z1 = 52;
    const y0 = 52;
    const y1 = 78 + reach + 22;
    const ax = (x0 + x1) / 2;
    const az = (z0 + z1) / 2;
    const sy = (y0 + y1) / 2;
    const sz = (z0 + z1) / 2;
    axial.position.set(ax, y1 + 48, az);
    axial.up.set(0, 0, -1);
    axial.lookAt(ax, 0, az);
    side.position.set(210, sy, sz);
    side.up.set(0, 1, 0);
    side.lookAt(0, sy, sz);
    return {
      axialRight: x1 - x0,
      axialUp: z1 - z0,
      sideRight: z1 - z0,
      sideUp: y1 - y0,
    };
  }
  const x0 = -30;
  const x1 = 44;
  const z0 = -(reach + 30);
  const z1 = 20;
  const y0 = 76;
  const y1 = 198;
  const ax = (x0 + x1) / 2;
  const az = (z0 + z1) / 2;
  const sy = (y0 + y1) / 2;
  const sz = (z0 + z1) / 2;
  axial.position.set(ax, 260, az);
  axial.up.set(0, 0, -1);
  axial.lookAt(ax, 0, az);
  side.position.set(210, sy, sz);
  side.up.set(0, 1, 0);
  side.lookAt(0, sy, sz);
  return {
    axialRight: x1 - x0,
    axialUp: z1 - z0,
    sideRight: z1 - z0,
    sideUp: y1 - y0,
  };
}

export function Room3DViewport({
  technique,
  roomMode,
}: {
  technique: Technique;
  roomMode?: RoomMode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const techniqueRef = useRef(technique);
  const modeRef = useRef<RoomMode>(roomMode ?? "training");
  const presetRef = useRef<CameraPreset | null>(null);
  const layoutRef = useRef<RoomFrames>(layoutOf(2, 2));
  const [frames, setFrames] = useState<RoomFrames | null>(null);
  const [localMode, setLocalMode] = useState<RoomMode>("training");
  const mode = roomMode ?? localMode;

  useEffect(() => {
    techniqueRef.current = technique;
  }, [technique]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      const note = document.createElement("p");
      note.className = "px-3 py-4 text-xs text-[#9FB3C8]";
      note.textContent = "WebGL non disponibile in questo browser.";
      host.appendChild(note);
      return () => {
        note.remove();
      };
    }

    renderer.setClearColor(0x0b1320, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.autoClear = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "block h-full w-full bg-[#0B1320]";
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    let room: ReturnType<typeof createRoomScene>;
    try {
      room = createRoomScene(renderer);
    } catch {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      const note = document.createElement("p");
      note.className = "px-3 py-4 text-xs text-[#9FB3C8]";
      note.textContent = "WebGL non disponibile in questo browser.";
      host.appendChild(note);
      return () => {
        note.remove();
      };
    }
    const main = new THREE.PerspectiveCamera(46, 1, 2, 2500);
    const axial = new THREE.OrthographicCamera(-120, 120, 120, -120, 1, 2200);
    const side = new THREE.OrthographicCamera(-120, 120, 120, -120, 1, 2200);
    main.layers.enable(1);
    side.layers.enable(1);
    axial.position.set(0, 420, -12);
    axial.up.set(0, 0, -1);
    axial.lookAt(0, 96, -12);
    side.position.set(340, 118, -12);
    side.up.set(0, 1, 0);
    side.lookAt(0, 108, -12);

    const controls = new OrbitControls(main, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 70;
    controls.maxDistance = 640;
    controls.minPolarAngle = 0.18;
    controls.maxPolarAngle = Math.PI * 0.48;
    placeCamera(main, controls, techniqueRef.current.decubitus === "SUPINO", "home");

    const topBand = { value: PAD + 150 };
    const allowOrbit = (event: Event) => {
      const point = event as PointerEvent;
      controls.enabled = (point.offsetY ?? 0) > topBand.value;
    };
    renderer.domElement.addEventListener("pointerdown", allowOrbit, true);
    renderer.domElement.addEventListener("wheel", allowOrbit, { capture: true, passive: true });

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 2 || height < 2) return;
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let shadowKey = "";
    renderer.setAnimationLoop(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 2 || height < 2) return;
      const pixelRatio = renderer.getPixelRatio();
      const bufferW = Math.floor(width * pixelRatio);
      const bufferH = Math.floor(height * pixelRatio);
      if (renderer.domElement.width !== bufferW || renderer.domElement.height !== bufferH) {
        renderer.setSize(width, height, false);
      }
      const current = techniqueRef.current;
      room.update(current, modeRef.current);
      const preset = presetRef.current;
      if (preset) {
        placeCamera(main, controls, current.decubitus === "SUPINO", preset);
        presetRef.current = null;
      }
      controls.update();

      const nextFrames = layoutOf(width, height);
      const previous = layoutRef.current;
      layoutRef.current = nextFrames;
      if (previous.width !== width || previous.height !== height) setFrames(nextFrames);
      topBand.value = nextFrames.orbitMinY;
      const ortho = placeOrtho(axial, side, current.decubitus === "SUPINO", current.dff);
      fitOrtho(axial, nextFrames.axial.w, nextFrames.axial.h, ortho.axialRight, ortho.axialUp);
      fitOrtho(side, nextFrames.side.w, nextFrames.side.h, ortho.sideRight, ortho.sideUp);
      main.aspect = nextFrames.main.w / Math.max(1, nextFrames.main.h);
      main.updateProjectionMatrix();

      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
      renderer.clear(true, true, true);
      renderer.setScissorTest(true);
      const shadowNow = [
        current.decubitus,
        current.projection,
        current.dff,
        current.patientRotationDeg,
        current.centeringOffsetXCm,
        current.centeringOffsetYCm,
        current.tubeAngulationCCDeg,
        current.tubeAngulationMLDeg,
        current.shouldersRolledForward,
        modeRef.current,
      ].join("|");
      if (shadowNow !== shadowKey) {
        renderer.shadowMap.needsUpdate = true;
        shadowKey = shadowNow;
      }

      const paint = (rect: ViewportRect, camera: THREE.Camera) => {
        renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
        renderer.setScissor(rect.x, rect.y, rect.w, rect.h);
        renderer.clear(true, true, true);
        renderer.render(room.scene, camera);
      };
      paint(nextFrames.main, main);
      paint(nextFrames.axial, axial);
      paint(nextFrames.side, side);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", allowOrbit, true);
      renderer.domElement.removeEventListener("wheel", allowOrbit, true);
      controls.dispose();
      room.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  const rotation = formatNum(technique.patientRotationDeg, 0);
  const signed = technique.patientRotationDeg > 0 ? `+${rotation}` : rotation;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0B1320]">
      <div className="flex shrink-0 items-center justify-between gap-2 px-2 py-1.5">
        {roomMode ? (
          <p className="truncate text-[11px] text-[#9FB3C8]">
            {roomMode === "training" ? "Fantoccio didattico · T7" : "Paziente in sala"}
          </p>
        ) : (
          <div className="flex min-w-0 rounded-full border border-[#2A486D] bg-[#111D30] p-0.5">
            <ModeButton active={mode === "training"} onClick={() => setLocalMode("training")}>
              Training
            </ModeButton>
            <ModeButton active={mode === "exam"} onClick={() => setLocalMode("exam")}>
              Esame
            </ModeButton>
          </div>
        )}
        <p className="truncate font-mono text-[10px] tabular-nums text-[#9FB3C8]">
          SID {formatNum(technique.dff, 0)} cm
        </p>
      </div>
      <div ref={hostRef} className="relative min-h-0 flex-1">
        {frames ? (
          <>
            <OrthoFrame
              rect={frames.axialFrame}
              title="TOP VIEW · ASSIALE"
              angle={`${signed}°`}
              sid={formatNum(technique.dff, 0)}
              degrees={technique.patientRotationDeg}
            />
            <OrthoFrame
              rect={frames.sideFrame}
              title="SIDE VIEW · SAGITTALE"
              angle={`CC ${formatNum(technique.tubeAngulationCCDeg, 0)}°`}
              sid={formatNum(technique.dff, 0)}
              degrees={technique.tubeAngulationCCDeg}
              tilt
            />
            <div
              className="pointer-events-none absolute rounded-lg border border-[#2A486D]/70"
              style={{
                left: frames.mainFrame.x,
                top: frames.mainFrame.y,
                width: frames.mainFrame.w,
                height: frames.mainFrame.h,
              }}
            />
          </>
        ) : null}
        <p className="pointer-events-none absolute bottom-5 left-5 max-w-[46%] rounded-md border border-[#2A486D] bg-[#0B1320]/85 px-2.5 py-1 text-xs text-[#E2E8F0] backdrop-blur-sm">
          {mode === "training" ? "Training · Anatomia 3D" : "Reperi di superficie · croce laser"}
        </p>
        <div className="absolute right-5 bottom-5 flex max-w-[54%] flex-wrap justify-end gap-1">
          <PresetButton onClick={() => { presetRef.current = "room"; }}>3/4 Sala</PresetButton>
          <PresetButton onClick={() => { presetRef.current = "tube"; }}>Lato Tubo</PresetButton>
          <PresetButton onClick={() => { presetRef.current = "detector"; }}>Vista Detettore</PresetButton>
          <PresetButton onClick={() => { presetRef.current = "home"; }}>Reset</PresetButton>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
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
      className={`rounded-full px-2.5 py-1 text-[11px] ${
        active ? "bg-[#F8FAFC] text-[#1E324E]" : "text-[#9FB3C8] hover:text-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}

function OrthoFrame({
  rect,
  title,
  angle,
  sid,
  degrees,
  tilt = false,
}: {
  rect: CssRect;
  title: string;
  angle: string;
  sid: string;
  degrees: number;
  tilt?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute overflow-hidden rounded-lg border border-[#2A486D]"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      <div className="flex h-[28px] items-center justify-between border-b border-[#2A486D] bg-[#0F1B2E] px-2.5">
        <span className="truncate text-[10px] tracking-[0.12em] text-[#6BA3DE]">{title}</span>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] tabular-nums text-[#F8FAFC]">
          <MiniArc degrees={degrees} tilt={tilt} />
          <span>{angle}</span>
          <span>SID {sid}</span>
        </span>
      </div>
    </div>
  );
}

function MiniArc({ degrees, tilt }: { degrees: number; tilt: boolean }) {
  const clamped = Math.max(tilt ? -30 : -40, Math.min(tilt ? 30 : 40, degrees));
  const rad = tilt ? (clamped * Math.PI) / 180 : ((90 - clamped) * Math.PI) / 180;
  const x = 9 + (tilt ? Math.sin(rad) * 6 : Math.cos(rad) * 6);
  const y = 15 - (tilt ? Math.cos(rad) * 6 : Math.sin(rad) * 6);
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <path d="M3 15 A6 6 0 0 1 15 15" fill="none" stroke="#2A486D" strokeWidth="1" />
      <line x1="9" y1="4" x2="9" y2="15" stroke="#6BA3DE" strokeDasharray="1.5 1.5" strokeWidth="1" />
      <line x1="9" y1="15" x2={x} y2={y} stroke="#F39C12" strokeWidth="1.2" />
    </svg>
  );
}

function PresetButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-[#2A486D] bg-[#0B1320]/85 px-1.5 py-1 text-[10px] text-[#9FB3C8] backdrop-blur-sm hover:bg-[#1E324E] hover:text-[#F8FAFC]"
    >
      {children}
    </button>
  );
}
