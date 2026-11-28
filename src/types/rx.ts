export type Projection = "PA" | "AP" | "LL";

export type Decubitus = "ORTOSTATISMO" | "SUPINO";

export type Respiration = "INSP" | "ESP" | "LIBERO";

export type FocalSpot = "FINE" | "GROSSA";

export type BeamGeometry = "PA" | "AP" | "LL";

/** Decubito nel modello fisico continuo. */
export type DecubitusId = "ortostatismo" | "supino";

/** Fase respiratoria nel modello fisico continuo. */
export type RespirationId = "apnea_inspiratoria" | "apnea_espiratoria" | "respiro_libero";

/** Macchia focale nominale IEC: 0,6 mm oppure 1,2 mm. */
export type FocalSpotId = "fine" | "broad";

export type GridMode = "none" | "focused_100" | "focused_180";

export type MarkerSide = "none" | "DX" | "SX";

export type ExposureMode = "manual" | "aec";

export type AecDensityStep = -2 | -1 | 0 | 1 | 2;

export type AecChambers = {
  /** Polmone sinistro (camera SX). */
  left: boolean;
  /** Mediastino / colonna. */
  center: boolean;
  /** Polmone destro (camera DX). */
  right: boolean;
};

/** Motivo di rifiuto della Reject Analysis ospedaliera. */
export type RejectReason =
  | "posizionamento"
  | "centratura"
  | "esposizione"
  | "cinetico"
  | "griglia"
  | "scapole"
  | "aec";

/**
 * Stato geometrico continuo della sala, in centimetri e gradi.
 * È la vista fisica di `Technique`: i controlli storici restano sul generatore.
 */
export type RoomGeometryState = {
  projection: Projection;
  decubitus: DecubitusId;
  /** Rotazione assiale sul piano trasverso. Negativo = OAS/OPI, positivo = OAD/OPS. */
  patientRotationDeg: number;
  /** In PA deve essere true per proiettare le scapole fuori dai campi polmonari. */
  shouldersRolledForward: boolean;
  respiration: RespirationId;
  /** Decentramento laterale rispetto al piano sagittale mediano. */
  centeringOffsetXCm: number;
  /** Decentramento cranio-caudale del raggio centrale rispetto a T7. */
  centeringOffsetYCm: number;
  /** Distanza fuoco-detettore (DFF). */
  sidCm: number;
  /** Angolazione cranio-caudale del tubo. Positivo = verso il cranio. */
  tubeAngulationCCDeg: number;
  /** Angolazione medio-laterale. Disallinea le lamelle se la griglia è inserita. */
  tubeAngulationMLDeg: number;
  collimationWidthCm: number;
  collimationHeightCm: number;
  focalSpot: FocalSpotId;
  gridMode: GridMode;
  markerSide: MarkerSide;
};

/** Tecnica impostata sul generatore. Tutti i controlli della console scrivono qui. */
export type Technique = {
  projection: Projection;
  decubitus: Decubitus;
  respiration: Respiration;
  kvp: number;
  mas: number;
  /** DFF in cm. Nel modello continuo è `sidCm`. */
  dff: number;
  focal: FocalSpot;
  /** Derivato da `gridMode !== "none"`. Mantenuto per il flusso storico. */
  grid: boolean;
  collW: number;
  collH: number;
  patientRotationDeg: number;
  shouldersRolledForward: boolean;
  centeringOffsetXCm: number;
  centeringOffsetYCm: number;
  tubeAngulationCCDeg: number;
  tubeAngulationMLDeg: number;
  gridMode: GridMode;
  markerSide: MarkerSide;
  /** Manuale, oppure terminazione sulle camere AEC. Il Caso 01 parte in manuale. */
  exposureMode: ExposureMode;
  aecChambers: AecChambers;
  /** Ogni step vale circa ±25% di dose rispetto alla soglia. */
  aecDensityStep: AecDensityStep;
};

export type GeometryFactors = {
  /** Ingrandimento del torace rispetto al riferimento PA a 180 cm. */
  bodyMag: number;
  /** Ingrandimento della silhouette cardiaca (OID maggiore). */
  heartMag: number;
  /** 1 = inspirazione profonda; < 1 = basi rialzate. */
  vert: number;
  focalMm: number;
  /** Geometria reale del fascio (il supino forza una AP anche se è selezionato PA). */
  beam: BeamGeometry;
  patientRotationDeg: number;
  shouldersRolledForward: boolean;
  centeringOffsetXCm: number;
  centeringOffsetYCm: number;
  tubeAngulationCCDeg: number;
  tubeAngulationMLDeg: number;
  markerSide: MarkerSide;
  /** Distanza oggetto-detettore del piano medio toracico, cm. */
  oidCm: number;
  /** M = SID / (SID − OID). */
  magnification: number;
  /** Penombra geometrica Ug, mm. */
  ugMm: number;
  /** 0 = assente, 1 = cutoff grave. */
  gridCutoff: number;
  /** Segno dell'inclinazione ML: attenuazione più forte da un lato. */
  gridCutoffAsymmetry: number;
  /** Ampiezza del gradiente anodico, 0–1. */
  anodeHeel: number;
  exposureTimeMs: number;
  collW: number;
  collH: number;
};

export type Dosimetry = {
  /** Kerma in aria al piano del detettore, senza backscatter (mGy). */
  airKermaMgy: number;
  /** Dose d'ingresso cute, kerma × BSF (mGy). */
  esdMgy: number;
  /** Prodotto dose-area (dGy·cm²). */
  dapDGyCm2: number;
  /** Indice di esposizione IEC 62494-1. 280 alla tecnica di riferimento. */
  ei: number;
  /** EI target dell'esame torace (EI_T). */
  eiTarget: number;
  /** Deviation Index: 10 · log10(EI / EI_T). */
  di: number;
  /** Tempo di esposizione stimato a 320 mA (fuoco fine) o 500 mA (fuoco grosso). */
  exposureTimeMs: number;
  /** Fattore di Bucky della griglia inserita. 1 = griglia assente. */
  buckyFactor: number;
  /** Severità del grid cutoff usata anche sulla fluenza centrale. */
  gridCutoff: number;
  /** Ampiezza del gradiente anodico lungo l'asse cranio-caudale. */
  anodeHeel: number;
  /** Fluenza relativa al detettore. 1 = tecnica di riferimento. */
  relativeExposure: number;
  /** Quanti relativi: governa il rumore, non la luminosità. */
  quanta: number;
  areaCm2: number;
  bsf: number;
};

export type CollimationAssessment = {
  clipsApices: boolean;
  clipsBases: boolean;
  clipsLateral: boolean;
  excessW: number;
  excessH: number;
  anatomyW: number;
  anatomyH: number;
};

export type ImageFault =
  | "noise"
  | "underexposure"
  | "burn"
  | "underpenetration"
  | "flat"
  | "scatter"
  | "motion"
  | "penumbra";

export type WarningLevel = "alert" | "warn" | "info";

export type TechniqueWarning = {
  level: WarningLevel;
  text: string;
};

export type Analysis = {
  geometry: GeometryFactors;
  dosimetry: Dosimetry;
  collimation: CollimationAssessment;
  faults: ImageFault[];
  warnings: TechniqueWarning[];
};

/** Immagine latente MONOCHROME2 a 12 bit, prima di window/level. */
export type LatentImage = {
  width: number;
  height: number;
  /** 0 = nero, 4095 = bianco. Pixel fuori fascio = 0. */
  pixels: Float32Array;
  /** 1 = pixel irradiato, 0 = shutter di collimazione. */
  shutter: Uint8Array;
};

export type ExposureShot = {
  index: number;
  technique: Technique;
  dosimetry: Dosimetry;
  latent: LatentImage;
  timestampLabel: string;
  /** Compilato solo per gli scatti non consegnati. */
  rejectReason?: RejectReason | null;
  /** Motore che ha prodotto il buffer. Assente = DRR volumetrico. */
  source?: "drr" | "plate";
  /** Riga dell'overlay DICOM. */
  sourceLabel?: string;
  /** DRL DAP del distretto, in dGy·cm². Solo per le lastre caricate. */
  drlDapDGyCm2?: number;
  /** Catenina o bottoni ancora sul paziente al momento dell'esposizione. */
  foreignMetal?: boolean;
};

export type GrayWindow = {
  windowWidth: number;
  windowLevel: number;
  invert: boolean;
};

export type ClinicalCase = {
  id: string;
  selectLabel: string;
  title: string;
  modality: string;
  bodyPart: string;
  indication: string;
  pseudoId: string;
  demographics: string;
  ageYears: number;
  sex: string;
  weightKg: number;
  heightCm: number;
  mobility: string;
  sessionId: string;
  history: string;
  question: string;
  /**
   * Gancio per sostituire il torace procedurale con un raster reale.
   * `procedural` disegna l'anatomia; `raster` è il punto di innesto PNG/DICOM.
   */
  image: { kind: "procedural"; region: "CHEST" };
};

export type ArtifactClaim =
  | "none"
  | "noise"
  | "scatter"
  | "motion"
  | "heart"
  | "clip"
  | "penetration";

export type ReviewDeclaration = {
  adequate: boolean;
  claims: ArtifactClaim[];
};

export type FindingLevel = "ok" | "warn" | "error";

export type Finding = {
  level: FindingLevel;
  text: string;
};

export type ScoreLine = {
  label: string;
  points: number;
  max: number;
};

export type ScoreSection = {
  id: string;
  title: string;
  max: number;
  score: number;
  findings: Finding[];
  lines: ScoreLine[];
};

/** Coppia causa geometrica → segno letto sul radiogramma (EUR 16260). */
export type GeometryEvidence = {
  cause: string;
  evidence: string;
};

export type Evaluation = {
  sections: ScoreSection[];
  total: number;
  max: 30;
  verdict: string;
  /** Fascia del Vademecum, es. `Fascia 25–27` o `30L · Eccellenza`. */
  band: string;
  blocked: boolean;
  blocking: string[];
  summary: string;
  geometryEvidence: GeometryEvidence[];
};

export type SimMode = "guided" | "exam";

export type QualityGrade = "adeguato" | "subottimale" | "inadeguato";

export type ExamConduct = {
  mode: SimMode;
  modalityOk: boolean;
  identityConfirmed: boolean;
  pregnancyHandled: boolean;
  metalsCleared: boolean;
  deliveredWithMetal: boolean;
  metalRecognized: boolean;
  instructionGiven: boolean;
  routineContactShield: boolean;
  acceptable: boolean | null;
  pathologyOk: boolean;
  anatomyChecks: number;
  quizOk: boolean;
  qualityCoherent: boolean;
};
