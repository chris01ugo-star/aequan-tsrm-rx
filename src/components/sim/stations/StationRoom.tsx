"use client";

import type { ReactNode } from "react";
import { Room3DViewport } from "@/components/sim/Room3DViewport";
import { FieldStep, Guide, Pick } from "@/components/sim/stations/controls";
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
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {hint ? (
        <Guide text="Criteri: piano sagittale perpendicolare al detettore, DFF 180 cm per limitare l'ingrandimento cardiaco, scapole fuori dai campi polmonari." />
      ) : null}
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,62%)_minmax(260px,1fr)]">
        <section className="min-h-[220px] overflow-hidden rounded-xl border border-[#2A486D]">
          <Room3DViewport technique={technique} roomMode={mode === "guided" ? "training" : "exam"} />
        </section>
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-[#2A486D] bg-[#16253B] px-3 py-2 rx-scroll">
          <Group title="Postura e proiezione">
            <Row>
              <Pick on={technique.decubitus === "ORTOSTATISMO"} onClick={() => onTechnique({ decubitus: "ORTOSTATISMO" })}>
                Ortostatismo
              </Pick>
              <Pick on={technique.decubitus === "SUPINO"} onClick={() => onTechnique({ decubitus: "SUPINO" })}>
                Supino
              </Pick>
            </Row>
            <Row>
              {(["PA", "AP", "LL"] as Projection[]).map((projection) => (
                <Pick key={projection} on={technique.projection === projection} onClick={() => onTechnique({ projection })}>
                  {projection}
                </Pick>
              ))}
            </Row>
            <Pick
              on={technique.shouldersRolledForward}
              title={hint ? "Antiversione: le scapole escono dai campi polmonari." : undefined}
              onClick={() => onTechnique({ shouldersRolledForward: !technique.shouldersRolledForward })}
            >
              {technique.shouldersRolledForward ? "Antiversione spalle: attiva" : "Antiversione spalle"}
            </Pick>
            <Row>
              {(
                [
                  ["INSP", "Apnea inspiratoria"],
                  ["ESP", "Apnea espiratoria"],
                  ["LIBERO", "Respiro libero"],
                ] as [Respiration, string][]
              ).map(([id, label]) => (
                <Pick
                  key={id}
                  on={technique.respiration === id}
                  title={hint && id === "INSP" ? "Apnea inspiratoria: abbassa i diaframmi e scopre le basi." : undefined}
                  onClick={() => onTechnique({ respiration: id })}
                >
                  {label}
                </Pick>
              ))}
            </Row>
          </Group>
          <Group title="Centratura e geometria del fascio">
            <FieldStep
              label="Rotazione paziente"
              value={technique.patientRotationDeg}
              unit="°"
              digits={0}
              step={1}
              min={ROTATION_MIN_DEG}
              max={ROTATION_MAX_DEG}
              onChange={(patientRotationDeg) => onTechnique({ patientRotationDeg })}
              resetLabel="0°"
              onReset={() => onTechnique({ patientRotationDeg: 0 })}
              hint={hint ? "Entro ±3° i capi clavicolari restano simmetrici." : undefined}
            />
            <FieldStep
              label="Centratura X"
              value={technique.centeringOffsetXCm}
              unit="cm"
              digits={0}
              step={1}
              min={CENTER_X_MIN_CM}
              max={CENTER_X_MAX_CM}
              onChange={(centeringOffsetXCm) => onTechnique({ centeringOffsetXCm })}
              resetLabel="Centra"
              onReset={() => onTechnique({ centeringOffsetXCm: 0 })}
              hint={hint ? "Zero è il piano sagittale mediano." : undefined}
            />
            <FieldStep
              label="Centratura Y"
              value={technique.centeringOffsetYCm}
              unit="cm"
              digits={0}
              step={1}
              min={CENTER_Y_MIN_CM}
              max={CENTER_Y_MAX_CM}
              onChange={(centeringOffsetYCm) => onTechnique({ centeringOffsetYCm })}
              resetLabel="Centra"
              onReset={() => onTechnique({ centeringOffsetYCm: 0 })}
              hint={hint ? "Il raggio centrale del torace PA cade su T7." : undefined}
            />
            <FieldStep
              label="DFF / SID"
              value={technique.dff}
              unit="cm"
              digits={0}
              step={5}
              min={SID_MIN_CM}
              max={SID_MAX_CM}
              onChange={(dff) => onTechnique({ dff })}
              resetLabel="180"
              onReset={() => onTechnique({ dff: 180 })}
              hint={hint ? "180 cm riduce l'ingrandimento della silhouette cardiaca." : undefined}
            />
            <FieldStep
              label="Angolazione CC"
              value={technique.tubeAngulationCCDeg}
              unit="°"
              digits={0}
              step={1}
              min={TUBE_CC_MIN_DEG}
              max={TUBE_CC_MAX_DEG}
              onChange={(tubeAngulationCCDeg) => onTechnique({ tubeAngulationCCDeg })}
              resetLabel="0°"
              onReset={() => onTechnique({ tubeAngulationCCDeg: 0 })}
            />
            <FieldStep
              label="Angolazione ML"
              value={technique.tubeAngulationMLDeg}
              unit="°"
              digits={0}
              step={1}
              min={TUBE_ML_MIN_DEG}
              max={TUBE_ML_MAX_DEG}
              onChange={(tubeAngulationMLDeg) => onTechnique({ tubeAngulationMLDeg })}
              resetLabel="0°"
              onReset={() => onTechnique({ tubeAngulationMLDeg: 0 })}
              hint={hint ? "Oltre 5° con griglia inserita compare il cutoff laterale." : undefined}
            />
            <FieldStep
              label="Collimazione L"
              value={technique.collW}
              unit="cm"
              digits={0}
              step={1}
              min={COLL_MIN_CM}
              max={COLL_MAX_CM}
              onChange={(collW) => onTechnique({ collW })}
              hint={hint ? "Il campo include gli apici e i recessi costofrenici, non l'intero ricevitore." : undefined}
            />
            <FieldStep
              label="Collimazione H"
              value={technique.collH}
              unit="cm"
              digits={0}
              step={1}
              min={COLL_MIN_CM}
              max={COLL_MAX_CM}
              onChange={(collH) => onTechnique({ collH })}
            />
          </Group>
          <Group title="Marker anatomico">
            <Row>
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
            </Row>
          </Group>
        </aside>
      </div>
      <footer className="flex shrink-0 justify-end">
        <button type="button" onClick={onNext} className={primaryBtn}>
          Esci in Sala Comandi & Chiudi Porta Piombata →
        </button>
      </footer>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[#2A486D] py-2">
      <p className="text-[11px] tracking-[0.12em] text-[#9FB3C8] uppercase">{title}</p>
      <div className="mt-1 space-y-1">{children}</div>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-1">{children}</div>;
}
