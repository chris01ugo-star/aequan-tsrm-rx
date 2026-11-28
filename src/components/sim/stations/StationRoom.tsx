"use client";

import type { ReactNode } from "react";
import { Room3DViewport } from "@/components/sim/Room3DViewport";
import { FieldStep, Pick } from "@/components/sim/stations/controls";
import { primaryBtn } from "@/components/ui/buttons";
import {
  CENTER_X_MAX_CM,
  CENTER_X_MIN_CM,
  CENTER_Y_MAX_CM,
  CENTER_Y_MIN_CM,
  COLL_MAX_CM,
  COLL_MIN_CM,
  ROTATION_MAX_DEG,
  ROTATION_MIN_DEG,
  SID_MAX_CM,
  SID_MIN_CM,
  TUBE_CC_MAX_DEG,
  TUBE_CC_MIN_DEG,
  TUBE_ML_MAX_DEG,
  TUBE_ML_MIN_DEG,
} from "@/lib/rxGeometry";
import type { MarkerSide, Projection, Respiration, SimMode, Technique } from "@/types/rx";

export function StationRoom({
  mode,
  technique,
  onTechnique,
  onNext,
}: {
  mode: SimMode;
  technique: Technique;
  onTechnique: (patch: Partial<Technique>) => void;
  onNext: () => void;
}) {
  const hint = mode === "guided";
  const posture =
    technique.respiration === "INSP" &&
    (technique.projection === "LL" || technique.decubitus === "SUPINO" || technique.shouldersRolledForward);
  const geometry =
    Math.abs(technique.patientRotationDeg) <= 3 &&
    Math.abs(technique.centeringOffsetXCm) <= 2 &&
    Math.abs(technique.centeringOffsetYCm) <= 2 &&
    technique.dff >= 170 &&
    Math.abs(technique.tubeAngulationCCDeg) <= 3 &&
    Math.abs(technique.tubeAngulationMLDeg) <= 3;
  const collimation =
    technique.collW >= 30 &&
    technique.collW <= 43 &&
    technique.collH >= 32 &&
    technique.collH <= 43 &&
    technique.markerSide !== "none";
  const sentence = !posture
    ? "Scegli postura, proiezione e apnea. In PA eretta, porta le spalle in avanti."
    : !geometry
      ? "Centra il raggio sul torace e tieni il tubo allineato al detettore."
      : !collimation
        ? "Collima sul campo utile del torace e applica il marker."
        : "Sala pronta: esci e chiudi la porta piombata.";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {hint ? (
        <div className="flex h-8 shrink-0 items-center gap-3 rounded-md border border-[#2A486D] bg-[#111D30] px-2.5">
          <p className="min-w-0 flex-1 truncate text-[12px] text-[#E2E8F0]">{sentence}</p>
          <PhaseDot on={posture} label="Postura" />
          <PhaseDot on={geometry} label="Geometria" />
          <PhaseDot on={collimation} label="Collimazione" />
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,62%)_minmax(260px,1fr)]">
        <section className="h-full min-h-0 overflow-hidden rounded-xl border border-[#2A486D]">
          <Room3DViewport technique={technique} roomMode={mode === "guided" ? "training" : "exam"} />
        </section>
        <aside className="flex min-h-0 flex-col overflow-y-auto rounded-xl border border-[#2A486D] bg-[#16253B] px-2.5 py-1 rx-scroll">
          <Group title="Postura e proiezione">
            <div className="grid grid-cols-2 gap-1">
              <Pick on={technique.decubitus === "ORTOSTATISMO"} onClick={() => onTechnique({ decubitus: "ORTOSTATISMO" })}>
                Ortostatismo
              </Pick>
              <Pick on={technique.decubitus === "SUPINO"} onClick={() => onTechnique({ decubitus: "SUPINO" })}>
                Supino
              </Pick>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(["PA", "AP", "LL"] as Projection[]).map((projection) => (
                <Pick key={projection} on={technique.projection === projection} onClick={() => onTechnique({ projection })}>
                  {projection}
                </Pick>
              ))}
            </div>
            <Pick
              on={technique.shouldersRolledForward}
              title={hint ? "In PA le scapole escono dai campi polmonari." : undefined}
              onClick={() => onTechnique({ shouldersRolledForward: !technique.shouldersRolledForward })}
            >
              {technique.shouldersRolledForward ? "Antiversione: attiva" : "Antiversione spalle"}
            </Pick>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["INSP", "Inspirio"],
                  ["ESP", "Espirio"],
                  ["LIBERO", "Libero"],
                ] as [Respiration, string][]
              ).map(([id, label]) => (
                <Pick key={id} on={technique.respiration === id} onClick={() => onTechnique({ respiration: id })}>
                  {label}
                </Pick>
              ))}
            </div>
          </Group>
          <Group title="Geometria del fascio">
            <FieldStep
              label="Rotazione"
              value={technique.patientRotationDeg}
              unit="°"
              digits={0}
              step={1}
              min={ROTATION_MIN_DEG}
              max={ROTATION_MAX_DEG}
              center={0}
              onChange={(patientRotationDeg) => onTechnique({ patientRotationDeg })}
              resetLabel="Rotazione a zero"
              onReset={() => onTechnique({ patientRotationDeg: 0 })}
            />
            <div className="grid grid-cols-2 gap-x-2">
              <FieldStep
                label="Centr. X"
                value={technique.centeringOffsetXCm}
                unit="cm"
                digits={0}
                step={1}
                min={CENTER_X_MIN_CM}
                max={CENTER_X_MAX_CM}
                center={0}
                onChange={(centeringOffsetXCm) => onTechnique({ centeringOffsetXCm })}
                resetLabel="Centra X"
                onReset={() => onTechnique({ centeringOffsetXCm: 0 })}
              />
              <FieldStep
                label="Centr. Y"
                value={technique.centeringOffsetYCm}
                unit="cm"
                digits={0}
                step={1}
                min={CENTER_Y_MIN_CM}
                max={CENTER_Y_MAX_CM}
                center={0}
                onChange={(centeringOffsetYCm) => onTechnique({ centeringOffsetYCm })}
                resetLabel="Centra Y"
                onReset={() => onTechnique({ centeringOffsetYCm: 0 })}
              />
            </div>
            <FieldStep
              label="DFF"
              value={technique.dff}
              unit="cm"
              digits={0}
              step={5}
              min={SID_MIN_CM}
              max={SID_MAX_CM}
              center={180}
              onChange={(dff) => onTechnique({ dff })}
              resetLabel="DFF di riferimento torace eretto"
              onReset={() => onTechnique({ dff: 180 })}
            />
            <div className="grid grid-cols-2 gap-x-2">
              <FieldStep
                label="Ang. CC"
                value={technique.tubeAngulationCCDeg}
                unit="°"
                digits={0}
                step={1}
                min={TUBE_CC_MIN_DEG}
                max={TUBE_CC_MAX_DEG}
                center={0}
                onChange={(tubeAngulationCCDeg) => onTechnique({ tubeAngulationCCDeg })}
                resetLabel="Angolo CC a zero"
                onReset={() => onTechnique({ tubeAngulationCCDeg: 0 })}
              />
              <FieldStep
                label="Ang. ML"
                value={technique.tubeAngulationMLDeg}
                unit="°"
                digits={0}
                step={1}
                min={TUBE_ML_MIN_DEG}
                max={TUBE_ML_MAX_DEG}
                center={0}
                onChange={(tubeAngulationMLDeg) => onTechnique({ tubeAngulationMLDeg })}
                resetLabel="Angolo ML a zero"
                onReset={() => onTechnique({ tubeAngulationMLDeg: 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-2">
              <FieldStep
                label="Coll. L"
                value={technique.collW}
                unit="cm"
                digits={0}
                step={1}
                min={COLL_MIN_CM}
                max={COLL_MAX_CM}
                onChange={(collW) => onTechnique({ collW })}
              />
              <FieldStep
                label="Coll. H"
                value={technique.collH}
                unit="cm"
                digits={0}
                step={1}
                min={COLL_MIN_CM}
                max={COLL_MAX_CM}
                onChange={(collH) => onTechnique({ collH })}
              />
            </div>
          </Group>
          <Group title="Marker">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["none", "Nessuno"],
                  ["DX", "DX"],
                  ["SX", "SX"],
                ] as [MarkerSide, string][]
              ).map(([id, label]) => (
                <Pick key={id} on={technique.markerSide === id} onClick={() => onTechnique({ markerSide: id })}>
                  {label}
                </Pick>
              ))}
            </div>
          </Group>
        </aside>
      </div>
      <footer className="flex shrink-0 justify-end py-2.5">
        <button type="button" onClick={onNext} className={primaryBtn}>
          Esci in Sala Comandi & Chiudi Porta Piombata →
        </button>
      </footer>
    </div>
  );
}

function PhaseDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`shrink-0 text-[10px] ${on ? "text-[#6BA3DE]" : "text-[#9FB3C8]"}`}>
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${on ? "bg-[#6BA3DE]" : "bg-[#2A486D]"}`} />
      {label}
    </span>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[#2A486D] py-1 last:border-b-0">
      <p className="text-[10px] tracking-[0.12em] text-[#9FB3C8] uppercase">{title}</p>
      <div className="mt-0.5 space-y-0.5">{children}</div>
    </div>
  );
}
