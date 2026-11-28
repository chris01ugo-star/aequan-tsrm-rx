import type { GridMode } from "@/types/rx";

/**
 * Calibrazione nominale di un distretto.
 * I valori servono al motore 2D per kVp relativi, EI/DI, DAP, ESD e Bucky factor.
 * `drlDapGyCm2` è il DRL in gray·cm²; in sala il DAP si legge in dGy·cm² (×10).
 */
export type AnatomyPreset = {
  id: string;
  name: string;
  refKv: number;
  refMas: number;
  refSidCm: number;
  gridMode: GridMode;
  drlDapGyCm2: number;
  thicknessCm: number;
  custom?: boolean;
};

export const ANATOMY_PRESETS: AnatomyPreset[] = [
  {
    id: "chest-pa",
    name: "Torace PA",
    refKv: 120,
    refMas: 2.5,
    refSidCm: 180,
    gridMode: "focused_180",
    drlDapGyCm2: 0.15,
    thicknessCm: 22,
  },
  {
    id: "knee",
    name: "Ginocchio AP/LL",
    refKv: 62,
    refMas: 6,
    refSidCm: 110,
    gridMode: "none",
    drlDapGyCm2: 0.2,
    thicknessCm: 12,
  },
  {
    id: "hand",
    name: "Mano / Polso",
    refKv: 52,
    refMas: 2,
    refSidCm: 100,
    gridMode: "none",
    drlDapGyCm2: 0.05,
    thicknessCm: 4,
  },
  {
    id: "lumbar",
    name: "Colonna Lombare",
    refKv: 82,
    refMas: 32,
    refSidCm: 110,
    gridMode: "focused_100",
    drlDapGyCm2: 1.5,
    thicknessCm: 26,
  },
  {
    id: "abdomen",
    name: "Addome Diretto",
    refKv: 80,
    refMas: 25,
    refSidCm: 110,
    gridMode: "focused_100",
    drlDapGyCm2: 2,
    thicknessCm: 24,
  },
  {
    id: "custom",
    name: "Personalizzato",
    refKv: 70,
    refMas: 8,
    refSidCm: 110,
    gridMode: "none",
    drlDapGyCm2: 0.15,
    thicknessCm: 16,
    custom: true,
  },
];

export function presetById(id: string): AnatomyPreset {
  return ANATOMY_PRESETS.find((item) => item.id === id) ?? ANATOMY_PRESETS[0];
}

/** DRL del preset in dGy·cm², l'unità mostrata in console. */
export function presetDrlDGyCm2(preset: AnatomyPreset): number {
  return preset.drlDapGyCm2 * 10;
}
