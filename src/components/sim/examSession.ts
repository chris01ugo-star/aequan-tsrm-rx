import type { QualityGrade, SimMode } from "@/types/rx";

export type StationId = 1 | 2 | 3 | 4;

export type Acceptance = {
  modality: "RX" | "TC" | "RM" | "MN" | null;
  district: "TORACE" | "GINOCCHIO" | "ADDOME" | "RACHIDE" | null;
  identity: boolean;
  documents: boolean;
  pregnancy: boolean;
  tolerance: boolean;
  necklace: boolean;
  buttons: boolean;
  watch: boolean;
  protection: "collimation" | "contact" | null;
  instruction: "posture" | "none" | null;
  itemAFailed: boolean;
};

export type QualityReview = {
  density: QualityGrade | null;
  contrast: QualityGrade | null;
  sharpness: QualityGrade | null;
  artifacts: QualityGrade | null;
  acceptable: boolean | null;
  bone: boolean;
  visceral: boolean;
  landmarks: boolean;
  vascular: boolean;
  pathology: "addensamento" | "nei_limiti" | "pneumotorace" | "versamento" | null;
  quiz: "rule15" | "dff" | "grid" | "test" | null;
};

export const INITIAL_ACCEPTANCE: Acceptance = {
  modality: null,
  district: null,
  identity: false,
  documents: false,
  pregnancy: false,
  tolerance: false,
  necklace: false,
  buttons: false,
  watch: false,
  protection: null,
  instruction: null,
  itemAFailed: false,
};

export const INITIAL_QUALITY: QualityReview = {
  density: null,
  contrast: null,
  sharpness: null,
  artifacts: null,
  acceptable: null,
  bone: false,
  visceral: false,
  landmarks: false,
  vascular: false,
  pathology: null,
  quiz: null,
};

export function metalStillOn(acceptance: Acceptance): boolean {
  return !acceptance.necklace || !acceptance.buttons;
}

export function modalityRecognized(acceptance: Acceptance): boolean {
  return !acceptance.itemAFailed && acceptance.modality === "RX" && acceptance.district === "TORACE";
}

export function guidedGap(acceptance: Acceptance): string | null {
  if (!acceptance.modality || !acceptance.district) return "Seleziona metodica e distretto";
  if (acceptance.modality !== "RX" || acceptance.district !== "TORACE") return "Correggi metodica e distretto";
  if (!acceptance.identity) return "Conferma l'identità con il paziente";
  if (!acceptance.documents) return "Chiedi la documentazione precedente";
  if (!acceptance.pregnancy) return "Verifica le controindicazioni";
  if (!acceptance.tolerance) return "Verifica se può collaborare";
  if (metalStillOn(acceptance)) return "Rimuovi i metalli sul torace";
  if (!acceptance.protection) return "Scegli la radioprotezione";
  if (!acceptance.instruction) return "Dai l'istruzione pre-posizionamento";
  return null;
}

export const MODE_LABEL: Record<SimMode, string> = {
  guided: "Tirocinio 1° anno",
  exam: "Esame a stazioni",
};
