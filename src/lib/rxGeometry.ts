import { clamp, quantize } from "@/lib/number";
import type {
  FocalSpotId,
  GridMode,
  Projection,
  RoomGeometryState,
  Technique,
} from "@/types/rx";

/**
 * Geometria di proiezione in unità fisiche.
 * Tutte le funzioni sono pure: stesso stato, stesso risultato.
 *
 * Convenzione degli offset di centratura:
 * - X positivo: il paziente è spostato verso la destra dell'immagine.
 * - Y positivo: il raggio centrale è craniale rispetto a T7 (anatomia più in basso).
 * - Y negativo: il raggio centrale è caudale rispetto a T7 (anatomia più in alto, apici a rischio).
 * - Angolazione CC positiva: tubo verso il cranio (proiezione lordotica delle clavicole).
 */

export const SID_MIN_CM = 90;
export const SID_MAX_CM = 200;
export const SID_STEP_CM = 5;
export const ROTATION_MIN_DEG = -30;
export const ROTATION_MAX_DEG = 30;
export const CENTER_X_MIN_CM = -12;
export const CENTER_X_MAX_CM = 12;
export const CENTER_Y_MIN_CM = -15;
export const CENTER_Y_MAX_CM = 15;
export const TUBE_CC_MIN_DEG = -25;
export const TUBE_CC_MAX_DEG = 25;
export const TUBE_ML_MIN_DEG = -15;
export const TUBE_ML_MAX_DEG = 15;
export const COLL_MIN_CM = 18;
export const COLL_MAX_CM = 43;

/** Diametro antero-posteriore e larghezza laterale del torace adulto di riferimento (70 kg). */
export type Habitus = {
  apDiameterCm: number;
  lateralWidthCm: number;
};

export const DEFAULT_HABITUS: Habitus = {
  apDiameterCm: 22,
  lateralWidthCm: 34,
};

/** Estensione craniale degli apici rispetto a T7, nel piano oggetto. */
const APEX_CRANIAL_CM = 10.2;
/** Estensione caudale dei seni costo-frenici rispetto a T7, nel piano oggetto. */
const BASE_CAUDAL_CM = 16.2;
/** Semi-larghezza cutanea del torace nel piano oggetto. */
const HALF_WIDTH_CM = 16.2;
const CLIP_TOLERANCE_CM = 0.35;

export type ProjectedField = {
  clipsApices: boolean;
  clipsCostophrenic: boolean;
  clipsLateral: boolean;
  /** Margine residuo dentro il campo. Negativo = taglio. */
  apexClearanceCm: number;
  baseClearanceCm: number;
  lateralClearanceCm: number;
};

export type GridCutoff = {
  /** 0 = assente, 1 = attenuazione periferica grave. */
  factor: number;
  /** −1…+1. Positivo: cutoff più forte sul lato +X. */
  asymmetry: number;
  defocus: boolean;
  transverse: boolean;
};

export type RoomMetrics = {
  oidCm: number;
  magnification: number;
  ugMm: number;
  gridCutoff: GridCutoff;
  field: ProjectedField;
  anodeHeel: number;
  buckyFactor: number;
  focalSpotMm: number;
};

export function focalSpotMm(spot: FocalSpotId): number {
  return spot === "fine" ? 0.6 : 1.2;
}

export function buckyFactor(mode: GridMode): number {
  if (mode === "focused_180") return 5;
  if (mode === "focused_100") return 4;
  return 1;
}

/** Proiezione reale del fascio: il clinostatismo non può essere un PA. */
export function effectiveProjection(technique: Technique): Projection {
  if (technique.projection === "LL") return "LL";
  if (technique.decubitus === "SUPINO") return "AP";
  return technique.projection;
}

export function toRoomGeometry(technique: Technique): RoomGeometryState {
  return {
    projection: effectiveProjection(technique),
    decubitus: technique.decubitus === "SUPINO" ? "supino" : "ortostatismo",
    patientRotationDeg: technique.patientRotationDeg,
    shouldersRolledForward: technique.shouldersRolledForward,
    respiration:
      technique.respiration === "INSP"
        ? "apnea_inspiratoria"
        : technique.respiration === "ESP"
          ? "apnea_espiratoria"
          : "respiro_libero",
    centeringOffsetXCm: technique.centeringOffsetXCm,
    centeringOffsetYCm: technique.centeringOffsetYCm,
    sidCm: technique.dff,
    tubeAngulationCCDeg: technique.tubeAngulationCCDeg,
    tubeAngulationMLDeg: technique.tubeAngulationMLDeg,
    collimationWidthCm: technique.collW,
    collimationHeightCm: technique.collH,
    focalSpot: technique.focal === "FINE" ? "fine" : "broad",
    gridMode: technique.gridMode,
    markerSide: technique.markerSide,
  };
}

/** Tiene i gradi di libertà dentro i limiti fisici della sala e allinea `grid` a `gridMode`. */
export function clampTechnique(technique: Technique): Technique {
  const gridMode = technique.gridMode;
  return {
    ...technique,
    dff: quantize(clamp(technique.dff, SID_MIN_CM, SID_MAX_CM), SID_STEP_CM),
    collW: clamp(Math.round(technique.collW), COLL_MIN_CM, COLL_MAX_CM),
    collH: clamp(Math.round(technique.collH), COLL_MIN_CM, COLL_MAX_CM),
    patientRotationDeg: clamp(technique.patientRotationDeg, ROTATION_MIN_DEG, ROTATION_MAX_DEG),
    centeringOffsetXCm: clamp(technique.centeringOffsetXCm, CENTER_X_MIN_CM, CENTER_X_MAX_CM),
    centeringOffsetYCm: clamp(technique.centeringOffsetYCm, CENTER_Y_MIN_CM, CENTER_Y_MAX_CM),
    tubeAngulationCCDeg: clamp(technique.tubeAngulationCCDeg, TUBE_CC_MIN_DEG, TUBE_CC_MAX_DEG),
    tubeAngulationMLDeg: clamp(technique.tubeAngulationMLDeg, TUBE_ML_MIN_DEG, TUBE_ML_MAX_DEG),
    shouldersRolledForward: Boolean(technique.shouldersRolledForward),
    gridMode,
    grid: gridMode !== "none",
    exposureMode: technique.exposureMode === "aec" ? "aec" : "manual",
    aecChambers: {
      left: Boolean(technique.aecChambers?.left),
      center: technique.aecChambers ? Boolean(technique.aecChambers.center) : true,
      right: Boolean(technique.aecChambers?.right),
    },
    aecDensityStep: sanitizeDensity(technique.aecDensityStep),
  };
}

function sanitizeDensity(step: number | undefined): Technique["aecDensityStep"] {
  const rounded = Math.round(step ?? 0);
  if (rounded <= -2) return -2;
  if (rounded === -1) return -1;
  if (rounded === 1) return 1;
  if (rounded >= 2) return 2;
  return 0;
}

/**
 * Distanza oggetto-detettore del piano medio toracico.
 * PA: faccia anteriore contro il Bucky, OID breve.
 * AP / supino: il piano medio è lontano dal detettore di circa metà dello spessore.
 * LL: il piano sagittale mediano sta a circa metà della larghezza laterale.
 */
export function oidCm(state: RoomGeometryState, habitus: Habitus = DEFAULT_HABITUS): number {
  const extra = (habitus.apDiameterCm - DEFAULT_HABITUS.apDiameterCm) * 0.45;
  if (state.projection === "LL") {
    return 12.5 + (habitus.lateralWidthCm - DEFAULT_HABITUS.lateralWidthCm) * 0.22 + extra * 0.25;
  }
  if (state.projection === "AP") {
    const tableGap = state.decubitus === "supino" ? 1.6 : 0;
    return 11 + extra + tableGap;
  }
  return 4.6 + extra * 0.35;
}

/** M = SID / (SID − OID). */
export function geometricMagnification(
  state: RoomGeometryState,
  habitus: Habitus = DEFAULT_HABITUS,
): number {
  const oid = oidCm(state, habitus);
  const sod = Math.max(28, state.sidCm - oid);
  return state.sidCm / sod;
}

/** Penombra geometrica Ug = f · OID / (SID − OID), in millimetri. */
export function geometricUnsharpnessMm(
  state: RoomGeometryState,
  habitus: Habitus = DEFAULT_HABITUS,
): number {
  const oid = oidCm(state, habitus);
  const sod = Math.max(28, state.sidCm - oid);
  return focalSpotMm(state.focalSpot) * (oid / sod);
}

/**
 * Cutoff di griglia focalizzata.
 * Si accende fuori fuoco (100 cm sopra 125 cm di DFF, 180 cm sotto 140 cm)
 * oppure se il tubo è inclinato più di 5° in senso medio-laterale.
 */
export function gridCutoff(state: RoomGeometryState): GridCutoff {
  if (state.gridMode === "none") {
    return { factor: 0, asymmetry: 0, defocus: false, transverse: false };
  }
  let defocusAmount = 0;
  if (state.gridMode === "focused_100") {
    defocusAmount = clamp((state.sidCm - 125) / 55, 0, 1);
  } else {
    defocusAmount = clamp((140 - state.sidCm) / 50, 0, 1);
  }
  const tilt = Math.abs(state.tubeAngulationMLDeg);
  const transverseAmount = tilt > 5 ? clamp((tilt - 5) / 10, 0, 1) : 0;
  const factor = clamp(
    Math.max(defocusAmount, transverseAmount) + Math.min(defocusAmount, transverseAmount) * 0.25,
    0,
    1,
  );
  const asymmetry = transverseAmount > 0 ? Math.sign(state.tubeAngulationMLDeg) * transverseAmount : 0;
  return {
    factor,
    asymmetry,
    defocus: defocusAmount > 0,
    transverse: transverseAmount > 0,
  };
}

/**
 * Spostamento craniale (cm sul detettore) dovuto all'angolazione cranio-caudale.
 * Positivo = l'anatomia sale verso gli apici.
 */
export function cranialShiftCm(state: RoomGeometryState, habitus: Habitus = DEFAULT_HABITUS): number {
  const radians = (state.tubeAngulationCCDeg * Math.PI) / 180;
  return Math.tan(radians) * oidCm(state, habitus);
}

/**
 * Dice se apici, seni costo-frenici o profili laterali escono dal campo luminoso.
 * Il rettangolo di collimazione è centrato sull'impatto del raggio centrale.
 */
export function evaluateProjectedField(
  state: RoomGeometryState,
  habitus: Habitus = DEFAULT_HABITUS,
): ProjectedField {
  const magnification = geometricMagnification(state, habitus);
  const shift = cranialShiftCm(state, habitus);
  const t7X = state.centeringOffsetXCm * magnification;
  const t7Cranial = -state.centeringOffsetYCm * magnification + shift;
  const rotation = Math.abs(state.patientRotationDeg) * (Math.PI / 180);
  const lateralExtra = Math.sin(rotation) * habitus.apDiameterCm * 0.35 * magnification;
  const foreshorten = Math.cos((state.tubeAngulationCCDeg * Math.PI) / 180);

  const apexY = t7Cranial + APEX_CRANIAL_CM * magnification;
  const baseY = t7Cranial - BASE_CAUDAL_CM * magnification * foreshorten;
  const left = t7X - HALF_WIDTH_CM * magnification - lateralExtra;
  const right = t7X + HALF_WIDTH_CM * magnification + lateralExtra * 0.35;

  const halfW = state.collimationWidthCm / 2;
  const halfH = state.collimationHeightCm / 2;
  const apexClearanceCm = halfH - apexY;
  const baseClearanceCm = baseY + halfH;
  const lateralClearanceCm = Math.min(left + halfW, halfW - right);

  return {
    clipsApices: apexClearanceCm < -CLIP_TOLERANCE_CM,
    clipsCostophrenic: baseClearanceCm < -CLIP_TOLERANCE_CM,
    clipsLateral: lateralClearanceCm < -CLIP_TOLERANCE_CM,
    apexClearanceCm,
    baseClearanceCm,
    lateralClearanceCm,
  };
}

/**
 * Gradiente di heel effect lungo l'asse cranio-caudale.
 * L'anodo è verso il cranio: l'intensità cala in alto e cresce verso le basi.
 * Il valore è l'ampiezza relativa picco-picco (0 = piatto).
 */
export function anodeHeelAmplitude(state: RoomGeometryState): number {
  const distance = clamp(170 / Math.max(90, state.sidCm), 0.75, 1.7);
  const field = state.collimationHeightCm / 43;
  const tilt = 1 + Math.abs(state.tubeAngulationCCDeg) / 70;
  return clamp(0.075 * distance * field * tilt, 0.035, 0.24);
}

export function computeRoomMetrics(
  state: RoomGeometryState,
  habitus: Habitus = DEFAULT_HABITUS,
): RoomMetrics {
  return {
    oidCm: oidCm(state, habitus),
    magnification: geometricMagnification(state, habitus),
    ugMm: geometricUnsharpnessMm(state, habitus),
    gridCutoff: gridCutoff(state),
    field: evaluateProjectedField(state, habitus),
    anodeHeel: anodeHeelAmplitude(state),
    buckyFactor: buckyFactor(state.gridMode),
    focalSpotMm: focalSpotMm(state.focalSpot),
  };
}
