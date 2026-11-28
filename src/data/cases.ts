import type { ClinicalCase, Technique } from "@/types/rx";

export const SESSION_ID = "TSRM_TUTOR_01";

/**
 * Stato di sala non calibrato: parametri lasciati da un esame precedente.
 * Lo standard del torace PA non è questo oggetto.
 */
export const DEFAULT_TECHNIQUE: Technique = {
  projection: "AP",
  decubitus: "SUPINO",
  respiration: "LIBERO",
  kvp: 74,
  mas: 12,
  dff: 110,
  focal: "GROSSA",
  grid: false,
  collW: 43,
  collH: 43,
  patientRotationDeg: 8,
  shouldersRolledForward: false,
  centeringOffsetXCm: 2,
  centeringOffsetYCm: -4,
  tubeAngulationCCDeg: 0,
  tubeAngulationMLDeg: 0,
  gridMode: "none",
  markerSide: "none",
};

/** Confronto mostrato solo dopo la consegna. Non va in scheda clinica. */
export const CHEST_PA_REFERENCE: { parameter: string; standard: string }[] = [
  { parameter: "Proiezione", standard: "PA" },
  { parameter: "Decubito", standard: "Ortostatismo" },
  { parameter: "Respiro", standard: "Apnea inspiratoria profonda" },
  { parameter: "kVp", standard: "110–125" },
  { parameter: "DFF", standard: "180 cm" },
  { parameter: "Macchia focale", standard: "Fine 0,6 mm" },
  { parameter: "Griglia", standard: "Focalizzata 180 cm, 12:1" },
  { parameter: "Collimazione", standard: "Volume toracico, non il campo 43×43" },
  { parameter: "Rotazione", standard: "Entro ±3°" },
  { parameter: "Spalle", standard: "Ruotate in avanti" },
  { parameter: "Marker", standard: "DX presente" },
  { parameter: "DI", standard: "−1 … +1" },
];

export const CASES: ClinicalCase[] = [
  {
    id: "RX-01",
    selectLabel:
      "Caso 01: RX Torace PA — Sospetta polmonite lobare dx, paziente adulto 70 kg, 175 cm",
    title: "RX Torace PA",
    modality: "RX",
    bodyPart: "TORACE",
    indication: "Sospetta polmonite lobare destra",
    pseudoId: "PT-AEQ-01",
    demographics: "Adulto",
    ageYears: 54,
    sex: "M",
    weightKg: 70,
    heightCm: 175,
    mobility: "Paziente vigile, collaborante, deambulante autonomamente",
    sessionId: SESSION_ID,
    history:
      "Fumatore. Da cinque giorni febbre, tosse produttiva con espettorato giallastro e dolore toracico basale destro. Dispnea da sforzo lieve. Non trauma recente.",
    question:
      "Sospetta polmonite lobare destra. Confermare o escludere un addensamento parenchimale, descriverne sede ed estensione e segnalare eventuali complicanze grossolane visibili su un radiogramma.",
    image: { kind: "procedural", region: "CHEST" },
  },
];

export function getCase(id: string): ClinicalCase {
  return CASES.find((item) => item.id === id) ?? CASES[0];
}
