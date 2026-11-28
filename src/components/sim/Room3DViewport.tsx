"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { formatNum } from "@/lib/number";
import { computeRoomMetrics, toRoomGeometry } from "@/lib/rxGeometry";
import type { Technique } from "@/types/rx";
import { createRoomScene, type RoomMode } from "@/components/sim/roomScene";

type ViewportRect = { x: number; y: number; w: number; h: number };

function layoutOf(width: number, height: number): {
  topBand: number;
  main: ViewportRect;
  axial: ViewportRect;
  side: ViewportRect;
} {
  const topH = Math.round(Math.min(176, Math.max(92, height * 0.32)));
  const gap = 6;
  const insetW = Math.floor((width - gap) / 2);
  return {
    topBand: topH + gap,
    main: { x: 0, y: 0, w: width, h: Math.max(1, height - topH - gap) },
    axial: { x: 0, y: Math.max(0, height - topH), w: Math.max(1, insetW), h: topH },
    side: {
      x: insetW + gap,
      y: Math.max(0, height - topH),
      w: Math.max(1, width - insetW - gap),
      h: topH,
    },
  };
}

function fitOrtho(
  camera: THREE.OrthographicCamera,
  widthPx: number,
  heightPx: number,
  worldHeight: number,
) {
  const aspect = widthPx / Math.max(1, heightPx);
  const halfH = worldHeight / 2;
  const halfW = halfH * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

function placeHome(camera: THREE.PerspectiveCamera, controls: OrbitControls, supine: boolean) {
  if (supine) {
    camera.position.set(108, 152, -108);
    controls.target.set(0, 128, -2);
  } else {
    camera.position.set(128, 146, -62);
    controls.target.set(8, 126, -38);
  }
  controls.update();
}

function placeOrtho(axial: THREE.OrthographicCamera, side: THREE.OrthographicCamera, supine: boolean) {
  if (supine) {
    axial.position.set(0, 228, -6);
    axial.up.set(0, 0, -1);
    axial.lookAt(0, 96, -6);
    side.position.set(156, 142, -4);
    side.up.set(0, 1, 0);
    side.lookAt(0, 142, -4);
    return { axialHeight: 96, sideHeight: 118 };
  }
  axial.position.set(0, 228, -16);
  axial.up.set(0, 0, -1);
  axial.lookAt(0, 128, -16);
  side.position.set(156, 128, -52);
  side.up.set(0, 1, 0);
  side.lookAt(0, 128, -52);
  return { axialHeight: 64, sideHeight: 132 };
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
  const resetRef = useRef(false);
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "block h-full w-full bg-[#0B1320]";
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    const room = createRoomScene();
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
    controls.minDistance = 60;
    controls.maxDistance = 760;
    controls.maxPolarAngle = Math.PI * 0.92;
    placeHome(main, controls, techniqueRef.current.decubitus === "SUPINO");

    const topBand = { value: 120 };
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
      if (resetRef.current) {
        placeHome(main, controls, current.decubitus === "SUPINO");
        resetRef.current = false;
      }
      controls.update();

      const frames = layoutOf(width, height);
      topBand.value = frames.topBand;
      const ortho = placeOrtho(axial, side, current.decubitus === "SUPINO");
      fitOrtho(axial, frames.axial.w, frames.axial.h, ortho.axialHeight);
      fitOrtho(side, frames.side.w, frames.side.h, ortho.sideHeight);
      main.aspect = frames.main.w / Math.max(1, frames.main.h);
      main.updateProjectionMatrix();

      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
      renderer.clear(true, true, true);
      renderer.setScissorTest(true);

      const paint = (rect: ViewportRect, camera: THREE.Camera) => {
        renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
        renderer.setScissor(rect.x, rect.y, rect.w, rect.h);
        renderer.clear(true, true, true);
        renderer.render(room.scene, camera);
      };
      paint(frames.main, main);
      paint(frames.axial, axial);
      paint(frames.side, side);
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

  const metrics = computeRoomMetrics(toRoomGeometry(technique));
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
        <button
          type="button"
          onClick={() => {
            resetRef.current = true;
          }}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] text-[#9FB3C8] hover:bg-[#1E324E] hover:text-[#F8FAFC]"
        >
          Reset camera
        </button>
      </div>
      <div ref={hostRef} className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-2 gap-1.5 p-1.5">
          <Hud
            title="Assiale"
            lines={[`${signed}°`, `SID ${formatNum(technique.dff, 0)} cm`]}
          />
          <Hud
            title="Sagittale"
            lines={[
              `CC ${formatNum(technique.tubeAngulationCCDeg, 0)}°`,
              `OID ${formatNum(metrics.oidCm, 1)} cm`,
            ]}
          />
        </div>
        <p className="pointer-events-none absolute bottom-2 left-2 font-mono text-[10px] tracking-[0.08em] text-[#9FB3C8]">
          {mode === "training" ? "Anatomia · raggio centrale · T7" : "Reperi di superficie · croce laser"}
        </p>
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

function Hud({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="max-w-full rounded-md border border-[#2A486D]/80 bg-[#0B1320]/80 px-1.5 py-1">
      <p className="text-[9px] tracking-[0.14em] text-[#6BA3DE] uppercase">{title}</p>
      <p className="font-mono text-[10px] tabular-nums text-[#F8FAFC]">{lines.join(" · ")}</p>
    </div>
  );
}
