import {
  LATENT_HEIGHT,
  LATENT_WIDTH,
  paintAttenuation,
  skinFractions,
} from "@/lib/chestRenderer";
import { clamp } from "@/lib/number";
import type {
  Analysis,
  BeamGeometry,
  CollimationAssessment,
  Dosimetry,
  GeometryFactors,
  GrayWindow,
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
const REFERENCE_EI = 280;

export function effectiveBeam(technique: Technique): BeamGeometry {
  if (technique.projection === "LL") return "LL";
  if (technique.decubitus === "SUPINO") return "AP";
  return technique.projection;
}

function magnification(dff: number, oidCm: number): number {
  return dff / Math.max(28, dff - oidCm);
}

export function computeGeometry(technique: Technique): GeometryFactors {
  const beam = effectiveBeam(technique);
  const oidHeart = beam === "AP" ? 19 : beam === "LL" ? 12 : 7.5;
  const oidBody = beam === "AP" ? 11 : 4.5;
  const heart = magnification(technique.dff, oidHeart) / magnification(180, 7.5);
  const body = magnification(technique.dff, oidBody) / magnification(180, 4.5);
  const near = Math.max(0, (155 - technique.dff) / 155);
  const heartMag =
    heart * (1 + near * 0.28) * (beam === "AP" ? 1.07 : 1);
  const bodyMag = body * (1 + near * 0.1);
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
    focalMm: technique.focal === "GROSSA" ? 1.2 : 0.6,
    beam,
  };
}

export function subjectContrastMu(kvp: number): number {
  return 2.05 * Math.pow(REFERENCE_KVP / Math.max(50, kvp), 2.1);
}

export function computeDosimetry(technique: Technique): Dosimetry {
  const beam = effectiveBeam(technique);
  const kvpTerm = Math.pow(technique.kvp / 80, KVP_DOSE_EXPONENT);
  const distance = Math.pow(100 / technique.dff, 2);
  const ap = beam === "AP" ? 1.16 : 1;
  const airKermaMgy = TUBE_OUTPUT_MGY * kvpTerm * technique.mas * distance * ap;
  const areaCm2 = technique.collW * technique.collH;
  const esdMgy = airKermaMgy * BSF;
  const dapDGyCm2 = (airKermaMgy * areaCm2) / 100;

  const thickness = beam === "LL" ? 0.62 : 1;
  const gridGain = technique.grid ? 1 : 2.15;
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
    (technique.grid ? 1 : 2.4) *
    Math.pow(technique.kvp / REFERENCE_KVP, 1.4) *
    thickness;

  return {
    airKermaMgy,
    esdMgy,
    dapDGyCm2,
    ei: relativeExposure * REFERENCE_EI,
    relativeExposure,
    quanta,
    areaCm2,
    bsf: BSF,
  };
}

export function assessCollimation(
  technique: Technique,
  geometry: GeometryFactors,
): CollimationAssessment {
  const skin = skinFractions(geometry);
  const fieldLeft = (1 - technique.collW / RECEPTOR_CM) / 2;
  const fieldTop = (1 - technique.collH / RECEPTOR_CM) / 2;
  const fieldRight = 1 - fieldLeft;
  const fieldBottom = 1 - fieldTop;
  const tol = 0.006;
  const anatomyW = (skin.right - skin.left) * RECEPTOR_CM;
  const anatomyH = (skin.bottom - skin.top) * RECEPTOR_CM;
  return {
    clipsApices: fieldTop > skin.top + tol,
    clipsBases: fieldBottom < skin.bottom - tol,
    clipsLateral: fieldLeft > skin.left + tol || fieldRight < skin.right - tol,
    excessW: technique.collW - anatomyW,
    excessH: technique.collH - anatomyH,
    anatomyW,
    anatomyH,
  };
}

export function scatterFraction(technique: Technique): number {
  if (technique.grid || technique.kvp <= 85) return 0;
  const field = Math.min(1, (technique.collW * technique.collH) / (36 * 40));
  const k = Math.min(1, (technique.kvp - 85) / 50);
  return Math.min(0.62, 0.18 + k * 0.4 * (0.55 + 0.45 * field));
}

export function penumbraRadiusPx(
  technique: Technique,
  geometry: GeometryFactors,
): number {
  const near = Math.max(0, (165 - technique.dff) / 45);
  const spot = geometry.focalMm >= 1 ? 1 : 0.15;
  const ap = geometry.beam === "AP" ? 1.25 : 1;
  return spot * near * 3.2 * ap;
}

function motionRadius(technique: Technique): number {
  return technique.respiration === "LIBERO" ? 6.5 : 0;
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
): ImageFault[] {
  const faults: ImageFault[] = [];
  const { relativeExposure: rel, ei } = dosimetry;
  if (rel < 0.58 || ei < 150) faults.push("noise");
  if (rel < 0.5 || ei < 120) faults.push("underexposure");
  if (rel > 2.35 || ei > 680) faults.push("burn");
  if (technique.kvp < 96) faults.push("underpenetration");
  if (technique.kvp > 134) faults.push("flat");
  if (!technique.grid && technique.kvp > 85) faults.push("scatter");
  if (technique.respiration === "LIBERO") faults.push("motion");
  if (technique.focal === "GROSSA" && technique.dff < 165) faults.push("penumbra");
  return faults;
}

function collectWarnings(
  technique: Technique,
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
  if (dosimetry.ei > 680) {
    warnings.push({
      level: "alert",
      text: "Sovraesposizione: attesa bruciatura dei campi polmonari e allarme di dose.",
    });
  }
  if (technique.kvp < 96) {
    warnings.push({
      level: "warn",
      text: "kVp basso: contrasto elevato, penetrazione mediastinica e retrocardiaca insufficiente.",
    });
  } else if (technique.kvp > 134) {
    warnings.push({
      level: "warn",
      text: "kVp eccessivo: scala dei grigi compressa, immagine piatta.",
    });
  }
  if (dosimetry.ei < 140) {
    warnings.push({
      level: "warn",
      text: "mAs / fluenza bassi: sottoesposizione e rumore quantico sul detettore.",
    });
  }
  if (!technique.grid && technique.kvp > 85) {
    warnings.push({
      level: "warn",
      text: "Griglia rimossa sopra 85 kVp: velo grigio da radiazione diffusa, contrasto ridotto.",
    });
  }
  if (technique.dff < 150 || geometry.beam === "AP") {
    warnings.push({
      level: "warn",
      text:
        geometry.beam === "AP"
          ? "Geometria AP o DFF breve: ingrandimento della silhouette cardiaca e dose più alta."
          : "DFF sotto 150 cm: ingrandimento geometrico del cuore e aumento della dose.",
    });
  }
  if (technique.focal === "GROSSA" && technique.dff < 165) {
    warnings.push({
      level: "warn",
      text: "Macchia focale grossa a DFF breve: penombra geometrica.",
    });
  }
  if (technique.respiration === "LIBERO") {
    warnings.push({
      level: "warn",
      text: "Respiro libero: blurring cinetico su diaframma e campi polmonari.",
    });
  }
  if (technique.projection === "PA" && technique.decubitus === "SUPINO") {
    warnings.push({
      level: "warn",
      text: "PA selezionata in clinostatismo: la geometria reale del fascio è una AP da tavolo.",
    });
  }
  if (collimation.clipsApices || collimation.clipsBases) {
    warnings.push({
      level: "warn",
      text: "Collimazione verticale stretta: rischio di taglio degli apici o dei seni costofrenici.",
    });
  } else if (collimation.clipsLateral) {
    warnings.push({
      level: "warn",
      text: "Collimazione laterale stretta: parete toracica e marcatore a rischio di esclusione.",
    });
  } else if (collimation.excessW > 5.5 || collimation.excessH > 8) {
    warnings.push({
      level: "info",
      text: "Campo ampio: il DAP cresce con l'area irradiata senza guadagno diagnostico.",
    });
  }
  return warnings;
}

export function analyzeTechnique(technique: Technique): Analysis {
  const geometry = computeGeometry(technique);
  const dosimetry = computeDosimetry(technique);
  const collimation = assessCollimation(technique, geometry);
  const faults = collectFaults(technique, dosimetry);
  const warnings = collectWarnings(technique, geometry, dosimetry, collimation);
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
    a.collW === b.collW &&
    a.collH === b.collH
  );
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
  let signal = rel * Math.exp(-att * mu);
  if (scatter > 0) {
    signal = signal * (1 - scatter * 0.55) + rel * scatter * 0.28;
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
  if (rel > 2.5 && att < 0.32) {
    mono *= Math.max(0.08, 1 - (rel - 2.5) * 0.42);
  }
  return clamp(mono, 0, 4095);
}

export function renderLatent(technique: Technique, seed: number): LatentImage {
  const analysis = analyzeTechnique(technique);
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

  const motion = motionRadius(technique);
  if (motion > 0) {
    working = boxBlur(working, width, height, motion, true, (y) =>
      motionWeight(y, height),
    );
  }

  const pixels = new Float32Array(width * height);
  const shutter = new Uint8Array(width * height);
  const rng = mulberry32(seed >>> 0 || 1);
  const mu = subjectContrastMu(technique.kvp);
  const scatter = scatterFraction(technique);
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
