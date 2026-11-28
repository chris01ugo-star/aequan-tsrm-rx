import {
  LATENT_HEIGHT,
  LATENT_WIDTH,
  paintAttenuation,
  skinFractions,
} from "@/lib/chestRenderer";
import { renderDrr } from "@/lib/drrEngine";
import { stampUnremovedMetal } from "@/lib/foreignMetal";
import { clamp } from "@/lib/number";
import {
  anodeHeelAmplitude,
  buckyFactor,
  computeRoomMetrics,
  toRoomGeometry,
  type RoomMetrics,
} from "@/lib/rxGeometry";
import type {
  Analysis,
  BeamGeometry,
  CollimationAssessment,
  Dosimetry,
  GeometryFactors,
  GrayWindow,
  GridMode,
  ImageFault,
  LatentImage,
  Technique,
  TechniqueWarning,
} from "@/types/rx";

/**
 * Motore didattico client-side. Non è un dosimetro e non descrive un tubo reale.
 *
 * Dose: output ∝ kVp^4.5 · mAs / DFF², come ordine di grandezza di un tubo filtrato.
 * DAP = kerma in aria × area di campo (il BSF entra solo nell'ESD).
 *
 * Immagine: il detettore non è un film puro. Un guadagno parziale tiene i polmoni
 * in scala quando cambia solo il kVp, così la tensione si legge come contrasto e
 * penetrazione. I mAs spostano la luminosità, il rumore quantico e la bruciatura.
 */

export const RECEPTOR_CM = 43;

export const DRL_CHEST_PA = {
  dapDGyCm2: 1.6,
  esdMgy: 0.3,
  eiMin: 200,
  eiMax: 420,
};

export const DEFAULT_WINDOW: GrayWindow = {
  windowWidth: 2100,
  windowLevel: 2280,
  invert: false,
};

const TUBE_OUTPUT_MGY = 0.0135;
const BSF = 1.32;
const KVP_DOSE_EXPONENT = 4.5;
const REFERENCE_KVP = 120;
const REFERENCE_MAS = 3;
const REFERENCE_DFF = 180;
/** EI_T del torace adulto secondo il modello IEC 62494-1 di questa sala. */
export const EI_TARGET = 280;
const REFERENCE_EI = EI_TARGET;
const FINE_FOCUS_MA = 320;
const BROAD_FOCUS_MA = 500;

export function effectiveBeam(technique: Technique): BeamGeometry {
  return toRoomGeometry(technique).projection;
}

function magnification(dff: number, oid: number): number {
  return dff / Math.max(28, dff - oid);
}

function detectorGain(mode: GridMode): number {
  if (mode === "none") return 2.15;
  if (mode === "focused_100") return 1.15;
  return 1;
}

/** DI = 10 · log10(EI / EI_T), IEC 62494-1. */
export function deviationIndex(ei: number, target = EI_TARGET): number {
  return 10 * Math.log10(Math.max(ei, 1) / target);
}

export function describeDeviationIndex(di: number): {
  label: string;
  tone: "ok" | "warn" | "alert";
} {
  if (di > 3) return { label: "Dose creep", tone: "alert" };
  if (di < -3) return { label: "Sottoesposizione", tone: "alert" };
  if (di >= -1 && di <= 1) return { label: "Ottimale", tone: "ok" };
  if (di > 1) return { label: "Sopra banda", tone: "warn" };
  return { label: "Sotto banda", tone: "warn" };
}

/** Tempo di posa a corrente realistica: 320 mA sul fuoco fine, 500 mA sul fuoco grosso. */
export function exposureTimeMs(technique: Technique): number {
  const milliampere = technique.focal === "FINE" ? FINE_FOCUS_MA : BROAD_FOCUS_MA;
  return (technique.mas / milliampere) * 1000;
}

export function computeGeometry(
  technique: Technique,
  metrics: RoomMetrics = computeRoomMetrics(toRoomGeometry(technique)),
): GeometryFactors {
  const beam = effectiveBeam(technique);
  const heartOid = beam === "AP" ? metrics.oidCm + 8 : beam === "LL" ? metrics.oidCm + 2.5 : 7.5;
  const heart = magnification(technique.dff, heartOid) / magnification(180, 7.5);
  const body = metrics.magnification / magnification(180, 4.5);
  const near = Math.max(0, (155 - technique.dff) / 155);
  const rotationWiden = 1 + (Math.abs(technique.patientRotationDeg) / 30) * 0.06;
  const heartMag = heart * (1 + near * 0.28) * (beam === "AP" ? 1.07 : 1);
  const bodyMag = body * (1 + near * 0.1) * rotationWiden;
  const vert =
    technique.respiration === "INSP"
      ? 1
      : technique.respiration === "ESP"
        ? 0.82
        : 0.92;

  return {
    bodyMag,
    heartMag,
    vert,
    focalMm: metrics.focalSpotMm,
    beam,
    patientRotationDeg: technique.patientRotationDeg,
    shouldersRolledForward: technique.shouldersRolledForward,
    centeringOffsetXCm: technique.centeringOffsetXCm,
    centeringOffsetYCm: technique.centeringOffsetYCm,
    tubeAngulationCCDeg: technique.tubeAngulationCCDeg,
    tubeAngulationMLDeg: technique.tubeAngulationMLDeg,
    markerSide: technique.markerSide,
    oidCm: metrics.oidCm,
    magnification: metrics.magnification,
    ugMm: metrics.ugMm,
    gridCutoff: metrics.gridCutoff.factor,
    gridCutoffAsymmetry: metrics.gridCutoff.asymmetry,
    anodeHeel: metrics.anodeHeel,
    exposureTimeMs: exposureTimeMs(technique),
    collW: technique.collW,
    collH: technique.collH,
  };
}

export function subjectContrastMu(kvp: number): number {
  return 2.05 * Math.pow(REFERENCE_KVP / Math.max(50, kvp), 2.1);
}

export function computeDosimetry(
  technique: Technique,
  metrics: RoomMetrics = computeRoomMetrics(toRoomGeometry(technique)),
): Dosimetry {
  const beam = effectiveBeam(technique);
  const kvpTerm = Math.pow(technique.kvp / 80, KVP_DOSE_EXPONENT);
  const distance = Math.pow(100 / technique.dff, 2);
  const ap = beam === "AP" ? 1.16 : 1;
  const airKermaMgy = TUBE_OUTPUT_MGY * kvpTerm * technique.mas * distance * ap;
  const areaCm2 = technique.collW * technique.collH;
  const esdMgy = airKermaMgy * BSF;
  const dapDGyCm2 = (airKermaMgy * areaCm2) / 100;

  const thickness = beam === "LL" ? 0.62 : 1;
  const gridGain = detectorGain(technique.gridMode) * (1 - 0.1 * metrics.gridCutoff.factor);
  const scatterCleanup = technique.gridMode === "none" ? 2.4 : technique.gridMode === "focused_100" ? 1.12 : 1;
  const relativeExposure =
    (technique.mas / REFERENCE_MAS) *
    Math.pow(REFERENCE_DFF / technique.dff, 2) *
    gridGain *
    Math.pow(technique.kvp / REFERENCE_KVP, 1.15) *
    thickness *
    (beam === "AP" ? 1.08 : 1);

  const quanta =
    (technique.mas / REFERENCE_MAS) *
    Math.pow(REFERENCE_DFF / technique.dff, 2) *
    scatterCleanup *
    (1 - 0.15 * metrics.gridCutoff.factor) *
    Math.pow(technique.kvp / REFERENCE_KVP, 1.4) *
    thickness;

  const ei = relativeExposure * REFERENCE_EI;
  return {
    airKermaMgy,
    esdMgy,
    dapDGyCm2,
    ei,
    eiTarget: EI_TARGET,
    di: deviationIndex(ei),
    exposureTimeMs: exposureTimeMs(technique),
    buckyFactor: buckyFactor(technique.gridMode),
    gridCutoff: metrics.gridCutoff.factor,
    anodeHeel: anodeHeelAmplitude(toRoomGeometry(technique)),
    relativeExposure,
    quanta,
    areaCm2,
    bsf: BSF,
  };
}

export function assessCollimation(
  technique: Technique,
  geometry: GeometryFactors,
  metrics: RoomMetrics = computeRoomMetrics(toRoomGeometry(technique)),
): CollimationAssessment {
  const skin = skinFractions(geometry);
  const anatomyW = (skin.right - skin.left) * RECEPTOR_CM;
  const anatomyH = (skin.bottom - skin.top) * RECEPTOR_CM;
  const field = metrics.field;
  return {
    clipsApices: field.clipsApices,
    clipsBases: field.clipsCostophrenic,
    clipsLateral: field.clipsLateral,
    excessW: technique.collW - anatomyW,
    excessH: technique.collH - anatomyH,
    anatomyW,
    anatomyH,
  };
}

export function scatterFraction(technique: Technique, cutoff = 0): number {
  if (technique.kvp <= 85) return technique.gridMode === "none" ? 0 : cutoff * 0.08;
  if (technique.gridMode !== "none" && cutoff < 0.45) return cutoff * 0.12;
  const field = Math.min(1, (technique.collW * technique.collH) / (36 * 40));
  const open = technique.gridMode === "none" ? 1 : 0.35 + cutoff * 0.65;
  const k = Math.min(1, (technique.kvp - 85) / 50);
  return Math.min(0.62, open * (0.18 + k * 0.4 * (0.55 + 0.45 * field)));
}

/**
 * La sfocatura geometrica è applicata nel renderer a partire da Ug.
 * Qui il raggio resta 0 per non sommare un secondo blur.
 */
export function penumbraRadiusPx(
  technique: Technique,
  geometry: GeometryFactors,
): number {
  const physicalMm = geometry.ugMm * (technique.focal === "GROSSA" ? 1 : 0.5);
  return physicalMm < 0 ? 0 : 0;
}

function motionRadius(technique: Technique, exposureMs: number): number {
  if (technique.respiration !== "LIBERO") {
    return exposureMs > 90 ? 1.5 : 0;
  }
  return clamp(1.8 + exposureMs / 6.5, 2.2, 14);
}

function motionWeight(y: number, height: number): number {
  const f = y / height;
  if (f < 0.16) return 0.12;
  if (f < 0.5) return 0.4;
  return 1;
}

function collectFaults(
  technique: Technique,
  dosimetry: Dosimetry,
  geometry: GeometryFactors,
): ImageFault[] {
  const faults: ImageFault[] = [];
  const { relativeExposure: rel, ei, di } = dosimetry;
  if (rel < 0.58 || ei < 150 || di < -3) faults.push("noise");
  if (rel < 0.5 || ei < 120 || di < -3) faults.push("underexposure");
  if (rel > 2.35 || ei > 680 || di > 3) faults.push("burn");
  if (technique.kvp < 96) faults.push("underpenetration");
  if (technique.kvp > 134) faults.push("flat");
  if (technique.gridMode === "none" && technique.kvp > 85) faults.push("scatter");
  if (technique.respiration === "LIBERO" || dosimetry.exposureTimeMs > 80) faults.push("motion");
  if (geometry.ugMm > 0.18) faults.push("penumbra");
  return faults;
}

function collectWarnings(
  geometry: GeometryFactors,
  dosimetry: Dosimetry,
  collimation: CollimationAssessment,
): TechniqueWarning[] {
  const warnings: TechniqueWarning[] = [];
  if (dosimetry.dapDGyCm2 > DRL_CHEST_PA.dapDGyCm2) {
    warnings.push({
      level: "alert",
      text: "DAP sopra il DRL del torace PA adulto (1,60 dGy·cm²).",
    });
  }
  if (dosimetry.esdMgy > DRL_CHEST_PA.esdMgy) {
    warnings.push({
      level: "alert",
      text: "ESD sopra il DRL (0,30 mGy).",
    });
  }
  const di = dosimetry.di;
  if (di > 3) {
    warnings.push({
      level: "alert",
      text: "DI > +3 (IEC 62494-1): fluenza al detettore compatibile con dose creep.",
    });
  } else if (di < -3) {
    warnings.push({
      level: "alert",
      text: "DI < −3 (IEC 62494-1): fluenza insufficiente, atteso rumore quantico.",
    });
  } else if (di > 1 || di < -1) {
    warnings.push({
      level: "info",
      text: "DI fuori dalla banda ottimale −1 … +1.",
    });
  }
  if (geometry.gridCutoff > 0.2) {
    warnings.push({
      level: "warn",
      text: "Non uniformità periferica del campo: attenuazione da griglia.",
    });
  }
  if (collimation.clipsApices || collimation.clipsBases || collimation.clipsLateral) {
    warnings.push({
      level: "info",
      text: "Il campo luminoso non copre l'intero volume toracico proiettato.",
    });
  }
  return warnings;
}

export function analyzeTechnique(technique: Technique): Analysis {
  const metrics = computeRoomMetrics(toRoomGeometry(technique));
  const geometry = computeGeometry(technique, metrics);
  const dosimetry = computeDosimetry(technique, metrics);
  const collimation = assessCollimation(technique, geometry, metrics);
  const faults = collectFaults(technique, dosimetry, geometry);
  const warnings = collectWarnings(geometry, dosimetry, collimation);
  return { geometry, dosimetry, collimation, faults, warnings };
}

export function sameTechnique(a: Technique, b: Technique): boolean {
  return (
    a.projection === b.projection &&
    a.decubitus === b.decubitus &&
    a.respiration === b.respiration &&
    a.kvp === b.kvp &&
    a.mas === b.mas &&
    a.dff === b.dff &&
    a.focal === b.focal &&
    a.grid === b.grid &&
    a.gridMode === b.gridMode &&
    a.collW === b.collW &&
    a.collH === b.collH &&
    a.patientRotationDeg === b.patientRotationDeg &&
    a.shouldersRolledForward === b.shouldersRolledForward &&
    a.centeringOffsetXCm === b.centeringOffsetXCm &&
    a.centeringOffsetYCm === b.centeringOffsetYCm &&
    a.tubeAngulationCCDeg === b.tubeAngulationCCDeg &&
    a.tubeAngulationMLDeg === b.tubeAngulationMLDeg &&
    a.markerSide === b.markerSide &&
    a.exposureMode === b.exposureMode &&
    a.aecDensityStep === b.aecDensityStep &&
    a.aecChambers.left === b.aecChambers.left &&
    a.aecChambers.center === b.aecChambers.center &&
    a.aecChambers.right === b.aecChambers.right
  );
}

export function aecChambersSelected(technique: Technique): boolean {
  const chambers = technique.aecChambers;
  return Boolean(chambers?.left || chambers?.center || chambers?.right);
}

/** True quando l'AEC è armato ma nessuna camera è selezionata. */
export function aecBlocksExposure(technique: Technique): boolean {
  return technique.exposureMode === "aec" && !aecChambersSelected(technique);
}

/**
 * mAs a cui l'AEC termina. Le camere laterali sul polmone chiudono vicino al DI 0.
 * La sola camera centrale, sul mediastino, lascia erogare molta più fluenza.
 */
export function terminatedMas(technique: Technique): number {
  const metrics = computeRoomMetrics(toRoomGeometry(technique));
  const beam = effectiveBeam(technique);
  const gridGain = detectorGain(technique.gridMode) * (1 - 0.1 * metrics.gridCutoff.factor);
  const thickness = beam === "LL" ? 0.62 : 1;
  const ap = beam === "AP" ? 1.08 : 1;
  const distance = Math.pow(REFERENCE_DFF / technique.dff, 2);
  const kvpTerm = Math.pow(technique.kvp / REFERENCE_KVP, 1.15);
  const scale = distance * gridGain * kvpTerm * thickness * ap;
  const density = 1.25 ** technique.aecDensityStep;
  const mas = (density * chamberLoad(technique) * REFERENCE_MAS) / Math.max(scale, 0.05);
  return Math.round(Math.min(80, Math.max(0.5, mas)) * 10) / 10;
}

function chamberLoad(technique: Technique): number {
  const { left, center, right } = technique.aecChambers;
  const shift = technique.centeringOffsetXCm;
  const loads: number[] = [];
  const lung = (side: number) => {
    const towardMidline = shift * side;
    if (towardMidline > 8) return 2.4;
    if (towardMidline < -8) return 0.42;
    const miss = Math.abs(shift);
    if (miss < 3.5) return 1;
    if (miss < 7) return 1.45;
    return 1.8;
  };
  if (right) loads.push(lung(-1));
  if (left) loads.push(lung(1));
  if (center) loads.push(Math.abs(shift) < 6 ? 3.45 : 2.15);
  if (loads.length === 0) return 1;
  return loads.reduce((sum, value) => sum + value, 0) / loads.length;
}

/** Tecnica realmente erogata. In AEC sostituisce i mAs con la terminazione delle camere. */
export function techniqueForExposure(technique: Technique): Technique {
  if (technique.exposureMode !== "aec") return technique;
  return { ...technique, mas: terminatedMas(technique) };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-8);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function boxBlur(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
  verticalOnly: boolean,
  weightAtY: ((y: number) => number) | null,
): Float32Array {
  const r = Math.min(12, Math.max(1, Math.round(radius)));
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);

  if (verticalOnly) {
    tmp.set(src);
  } else {
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let n = 0;
        const x0 = Math.max(0, x - r);
        const x1 = Math.min(width - 1, x + r);
        for (let xx = x0; xx <= x1; xx += 1) {
          sum += src[row + xx];
          n += 1;
        }
        tmp[row + x] = sum / n;
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    const m = weightAtY ? weightAtY(y) : 1;
    const rr = Math.max(1, Math.round(r * Math.max(m, verticalOnly ? m : 1)));
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (m <= 0.001) {
        dst[i] = tmp[i];
        continue;
      }
      let sum = 0;
      let n = 0;
      const y0 = Math.max(0, y - rr);
      const y1 = Math.min(height - 1, y + rr);
      for (let yy = y0; yy <= y1; yy += 1) {
        sum += tmp[yy * width + x];
        n += 1;
      }
      const blurred = sum / n;
      dst[i] = tmp[i] * (1 - m) + blurred * m;
    }
  }
  return dst;
}

function attenuationToMono2(
  att: number,
  rel: number,
  mu: number,
  scatter: number,
  quanta: number,
  kvp: number,
  rng: () => number,
): number {
  const primary = Math.exp(-att * mu);
  let signal = primary;
  if (scatter > 0) {
    signal = signal * (1 - scatter * 0.55) + scatter * 0.28;
  }
  const sigma =
    (0.075 / Math.sqrt(Math.max(quanta, 0.06))) * Math.sqrt(Math.max(signal, 0.02));
  signal = Math.max(0, signal + gaussian(rng) * sigma);

  const film = signal / (signal + 0.62);
  let mono = (1 - film) * 4095;

  if (kvp < 96 && att > 0.48) {
    mono += ((96 - kvp) / 46) * (att - 0.48) * 2200;
  }
  if (kvp > 132) {
    const flat = Math.min(0.62, (kvp - 132) / 22);
    mono = mono * (1 - flat) + 2050 * flat;
  }
  if (scatter > 0) {
    const fog = Math.min(0.55, scatter * 0.8);
    mono = mono * (1 - fog) + 2140 * fog;
  }
  if (rel > 4) {
    const wash = Math.min(0.38, (rel - 4) / 26);
    mono = mono * (1 - wash) + 2050 * wash;
  }
  return clamp(mono, 0, 4095);
}

export function renderLatent(technique: Technique, seed: number, unremovedMetalArtifact = false): LatentImage {
  const analysis = analyzeTechnique(technique);
  try {
    const drr = renderDrr(
      technique,
      seed,
      {
        fluence: analysis.dosimetry.relativeExposure,
        exposureTimeMs: analysis.dosimetry.exposureTimeMs,
        ugMm: analysis.geometry.ugMm,
        gridCutoff: analysis.geometry.gridCutoff,
        gridAsymmetry: analysis.geometry.gridCutoffAsymmetry,
        anodeHeel: analysis.geometry.anodeHeel,
      },
      unremovedMetalArtifact,
    );
    if (drr) return drr;
  } catch {
    // WebGL2 assente o shader non linkato: resta il torace procedurale.
  }
  const width = LATENT_WIDTH;
  const height = LATENT_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Contesto canvas 2D non disponibile");
  }

  paintAttenuation(ctx, width, height, analysis.geometry);
  const image = ctx.getImageData(0, 0, width, height);
  const attenuation = new Float32Array(width * height);
  for (let i = 0; i < attenuation.length; i += 1) {
    attenuation[i] = image.data[i * 4] / 255;
  }

  const penumbra = penumbraRadiusPx(technique, analysis.geometry);
  let working =
    penumbra > 0.7
      ? boxBlur(attenuation, width, height, penumbra, false, null)
      : attenuation;

  const motion = motionRadius(technique, analysis.dosimetry.exposureTimeMs);
  if (motion > 0) {
    working = boxBlur(working, width, height, motion, true, (y) =>
      motionWeight(y, height),
    );
  }

  const pixels = new Float32Array(width * height);
  const shutter = new Uint8Array(width * height);
  const rng = mulberry32(seed >>> 0 || 1);
  const mu = subjectContrastMu(technique.kvp);
  const scatter = scatterFraction(technique, analysis.geometry.gridCutoff);
  const { relativeExposure, quanta } = analysis.dosimetry;
  const fieldLeft = Math.round(((1 - technique.collW / RECEPTOR_CM) / 2) * width);
  const fieldTop = Math.round(((1 - technique.collH / RECEPTOR_CM) / 2) * height);
  const fieldRight = width - fieldLeft;
  const fieldBottom = height - fieldTop;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const inside =
        x >= fieldLeft && x < fieldRight && y >= fieldTop && y < fieldBottom;
      shutter[i] = inside ? 1 : 0;
      if (!inside) {
        pixels[i] = 0;
        continue;
      }
      pixels[i] = attenuationToMono2(
        working[i],
        relativeExposure,
        mu,
        scatter,
        quanta,
        technique.kvp,
        rng,
      );
    }
  }

  if (unremovedMetalArtifact) stampUnremovedMetal(pixels, shutter, width, height);
  return { width, height, pixels, shutter };
}

export function paintLatentToCanvas(
  canvas: HTMLCanvasElement,
  latent: LatentImage,
  gray: GrayWindow,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  if (canvas.width !== latent.width || canvas.height !== latent.height) {
    canvas.width = latent.width;
    canvas.height = latent.height;
  }

  const image = ctx.createImageData(latent.width, latent.height);
  const min = gray.windowLevel - gray.windowWidth / 2;
  const width = Math.max(1, gray.windowWidth);
  const data = image.data;
  for (let i = 0; i < latent.pixels.length; i += 1) {
    let value: number;
    if (latent.shutter[i] === 0) {
      value = 0;
    } else {
      let n = (latent.pixels[i] - min) / width;
      if (n < 0) n = 0;
      else if (n > 1) n = 1;
      if (gray.invert) n = 1 - n;
      value = n * 255;
    }
    const o = i * 4;
    data[o] = value;
    data[o + 1] = value;
    data[o + 2] = value;
    data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

export { LATENT_HEIGHT, LATENT_WIDTH };
