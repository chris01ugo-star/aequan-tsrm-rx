/**
 * Volume toracico in Unità Hounsfield, pronto per il DRR e per un binario clinico.
 * I byte 0..255 mappano linearmente −1024..+1024 HU (texture WebGL2 R8).
 * Le scapole e il diaframma respiratorio non sono congelati qui: li valuta lo shader.
 */

export type VolumeSource = "procedural-ct" | "clinical-bin";

export type CtVolumeDescriptor = {
  id: string;
  dims: [number, number, number];
  spacingMm: [number, number, number];
  huMin: number;
  huMax: number;
  data: Uint8Array;
  source: VolumeSource;
};

export const HU_MIN = -1024;
export const HU_MAX = 1024;

const NX = 160;
const NY = 160;
const NZ = 128;
const SX_MM = 2.5;
const SY_MM = 2.5;
const SZ_MM = 2.2;

let cached: CtVolumeDescriptor | null = null;

export function huToByte(hu: number): number {
  const t = (hu - HU_MIN) / (HU_MAX - HU_MIN);
  if (t <= 0) return 0;
  if (t >= 1) return 255;
  return (t * 255 + 0.5) | 0;
}

const AIR = huToByte(-1000);
const LUNG = huToByte(-780);
const VESSEL = huToByte(-650);
const FAT = huToByte(-90);
const SOFT = huToByte(35);
const MEDIA = huToByte(45);
const FOCUS = huToByte(15);
const BONE = huToByte(780);
const CORTICAL = huToByte(950);

type ClinicalMeta = {
  id?: string;
  dims: [number, number, number];
  spacingMm: [number, number, number];
  huMin?: number;
  huMax?: number;
};

/** Carica un volume esterno `.json` + `.bin` (uint8, stessa scala HU). */
export async function loadClinicalVolume(metaUrl: string, binUrl: string): Promise<CtVolumeDescriptor> {
  const meta = (await (await fetch(metaUrl)).json()) as ClinicalMeta;
  const buffer = await (await fetch(binUrl)).arrayBuffer();
  const data = new Uint8Array(buffer);
  const [nx, ny, nz] = meta.dims;
  if (!nx || !ny || !nz || data.length !== nx * ny * nz) {
    throw new Error("Volume clinico illeggibile: dims e buffer non coincidono.");
  }
  return {
    id: meta.id ?? "clinical",
    dims: [nx, ny, nz],
    spacingMm: meta.spacingMm,
    huMin: meta.huMin ?? HU_MIN,
    huMax: meta.huMax ?? HU_MAX,
    data,
    source: "clinical-bin",
  };
}

/** Fantoccio TC del Caso 01. Generato una sola volta e tenuto in memoria. */
export function getThoraxCtVolume(): CtVolumeDescriptor {
  if (cached) return cached;
  const data = new Uint8Array(NX * NY * NZ);
  data.fill(AIR);

  const originX = (-NX * SX_MM) / 20;
  const originY = (-NY * SY_MM) / 20;
  const originZ = (-NZ * SZ_MM) / 20;
  const sx = SX_MM / 10;
  const sy = SY_MM / 10;
  const sz = SZ_MM / 10;

  for (let z = 0; z < NZ; z += 1) {
    const pz = originZ + (z + 0.5) * sz;
    const pz2 = pz * pz;
    for (let y = 0; y < NY; y += 1) {
      const py = originY + (y + 0.5) * sy;
      const py2 = py * py;
      const base = z * NY * NX + y * NX;
      for (let x = 0; x < NX; x += 1) {
        const px = originX + (x + 0.5) * sx;
        const body =
          (px * px) / 289 + py2 / 361 + pz2 / 144;
        if (body > 1.02) continue;

        const shell = body > 0.82;
        let hu = shell ? FAT : SOFT;

        const right =
          ((px + 6.2) * (px + 6.2)) / 34 +
          ((py + 0.4) * (py + 0.4)) / 108 +
          pz2 / 46;
        const left =
          ((px - 6.6) * (px - 6.6)) / 32 +
          ((py + 1.1) * (py + 1.1)) / 112 +
          pz2 / 44;
        const inRight = right < 1 && px < -1.5 && py < 13 && py > -11;
        const inLeft = left < 1 && px > 1.6 && py < 13.4 && py > -12.2;
        if (inRight || inLeft) {
          const hilum = (px - (inRight ? -2.4 : 2.6)) ** 2 + (py - 2) ** 2 + pz2;
          const speck = ((x * 13) ^ (y * 7) ^ (z * 17)) & 255;
          hu = hilum < 10 || (speck < 16 && hilum < 70) ? VESSEL : LUNG;
          if (inRight && py < -1.2 && py > -6.4 && px < -3.2 && px > -11 && pz > -3.2 && pz < 4.2) {
            const bronchus = Math.abs(py + 5.2) < 0.28 && Math.abs(pz - 0.4) < 0.32;
            hu = bronchus ? AIR : FOCUS;
          }
        }

        const heart =
          ((px - 3.4) * (px - 3.4)) / 30 +
          ((py + 1.2) * (py + 1.2)) / 34 +
          ((pz - 3.2) * (pz - 3.2)) / 16;
        if (heart < 1 && py < 8 && py > -8) hu = MEDIA;

        const aorta = (px - 1.2) ** 2 + (pz - 1.6) ** 2;
        if (aorta < 2.6 && py > 4 && py < 14) hu = MEDIA;

        if (py < -11.2 && body < 0.96) {
          const bubble = (px - 6.5) ** 2 + (py + 11.2) ** 2 + (pz - 3) ** 2;
          hu = bubble < 6.5 ? AIR : SOFT;
        }

        const airway = px * px + (pz - 0.6) ** 2;
        if (airway < 0.72 && py > 7.5 && py < 18) hu = AIR;
        if (py > 5.5 && py < 9 && airway < 2.4 && Math.abs(px) > 0.4 && Math.abs(px) < 2.2 && pz < 2) {
          hu = AIR;
        }

        if (Math.abs(px) < 1.55 && pz < -5.6 && pz > -9.4 && py > -16 && py < 16) hu = BONE;
        if (Math.abs(px) < 0.45 && pz < -7.2 && pz > -10.6 && py > -14 && py < 14) hu = CORTICAL;
        if (Math.abs(px) > 1.1 && Math.abs(px) < 2.3 && pz < -6.2 && pz > -8.2 && py > -14 && py < 14) {
          hu = BONE;
        }

        if (Math.abs(px) < 1.35 && pz > 7.2 && pz < 9.1 && py > -1 && py < 13) hu = CORTICAL;

        const ribY = px * px > 16 && pz > -1 ? py + Math.abs(px) * 0.42 : py;
        const ribIndex = (ribY + 15.2) / 1.85;
        const ribFrac = ribIndex - Math.floor(ribIndex);
        if (ribFrac < 0.07 && ribY > -15 && ribY < 13 && Math.abs(px) > 2.4) {
          const ring = (px * px) / 176 + ((pz + 0.6) * (pz + 0.6)) / 74;
          if (ring > 0.9 && ring < 1.02) hu = px * px > 48 && pz < -2 ? CORTICAL : BONE;
        }

        const clavY = 13.2 - Math.abs(px) * 0.12;
        const clavZ = 3.4 - Math.abs(px) * 0.16;
        const clav = (py - clavY) ** 2 + (pz - clavZ) ** 2;
        if (Math.abs(px) > 1.2 && Math.abs(px) < 15 && clav < 0.55 && py > 10) hu = CORTICAL;

        data[base + x] = hu;
      }
    }
  }

  cached = {
    id: "thorax-caso-01-r2",
    dims: [NX, NY, NZ],
    spacingMm: [SX_MM, SY_MM, SZ_MM],
    huMin: HU_MIN,
    huMax: HU_MAX,
    data,
    source: "procedural-ct",
  };
  return cached;
}
