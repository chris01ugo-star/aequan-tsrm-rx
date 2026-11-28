import { analyzeTechnique } from "@/lib/rxPhysics";
import type { RejectReason, Technique } from "@/types/rx";

export const REJECT_OPTIONS: { id: RejectReason; label: string }[] = [
  { id: "posizionamento", label: "Posizionamento / Rotazione" },
  { id: "centratura", label: "Centratura / Taglio anatomico" },
  { id: "esposizione", label: "Esposizione / DI fuori fascia" },
  { id: "cinetico", label: "Artefatto cinetico / Respiro" },
  { id: "griglia", label: "Errore griglia / Grid Cutoff" },
  { id: "scapole", label: "Scapole nei campi polmonari" },
  { id: "aec", label: "Errore selezione camere AEC" },
];

/** Difetti realmente presenti su uno scatto, usati per giudicare il rifiuto. */
export function defectsOf(technique: Technique): RejectReason[] {
  const analysis = analyzeTechnique(technique);
  const found: RejectReason[] = [];
  const rotated = Math.abs(technique.patientRotationDeg) > 3;
  const wrongProjection = technique.projection !== "PA" || technique.decubitus === "SUPINO";
  if (rotated || wrongProjection) found.push("posizionamento");
  const clipped =
    analysis.collimation.clipsApices ||
    analysis.collimation.clipsBases ||
    analysis.collimation.clipsLateral;
  if (clipped || Math.abs(technique.centeringOffsetXCm) > 3 || Math.abs(technique.centeringOffsetYCm) > 3) {
    found.push("centratura");
  }
  if (Math.abs(analysis.dosimetry.di) > 1) found.push("esposizione");
  if (technique.respiration === "LIBERO" || analysis.faults.includes("motion")) found.push("cinetico");
  if (analysis.geometry.gridCutoff > 0.2 || (technique.gridMode === "none" && technique.kvp > 85)) {
    found.push("griglia");
  }
  if (!technique.shouldersRolledForward && analysis.geometry.beam !== "LL") found.push("scapole");
  const chambers = technique.aecChambers;
  const centerOnly =
    technique.exposureMode === "aec" && chambers.center && !chambers.left && !chambers.right;
  if (centerOnly) found.push("aec");
  return found;
}

export function rejectLabel(reason: RejectReason): string {
  return REJECT_OPTIONS.find((item) => item.id === reason)?.label ?? reason;
}
