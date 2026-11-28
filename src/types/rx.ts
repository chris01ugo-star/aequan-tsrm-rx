export type Projection = "PA" | "AP" | "LL";

export type Decubitus = "ORTOSTATISMO" | "SUPINO";

export type Respiration = "INSP" | "ESP" | "LIBERO";

export type FocalSpot = "FINE" | "GROSSA";

export type BeamGeometry = "PA" | "AP" | "LL";

/** Tecnica impostata sul generatore. Tutti i controlli della console scrivono qui. */
export type Technique = {
  projection: Projection;
  decubitus: Decubitus;
  respiration: Respiration;
  kvp: number;
  mas: number;
  dff: number;
  focal: FocalSpot;
  grid: boolean;
  collW: number;
  collH: number;
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
};

export type Dosimetry = {
  /** Kerma in aria al piano del detettore, senza backscatter (mGy). */
  airKermaMgy: number;
  /** Dose d'ingresso cute, kerma × BSF (mGy). */
  esdMgy: number;
  /** Prodotto dose-area (dGy·cm²). */
  dapDGyCm2: number;
  /** Indice di esposizione didattico, 280 alla tecnica di riferimento. */
  ei: number;
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

export type Evaluation = {
  sections: ScoreSection[];
  total: number;
  max: 30;
  verdict: string;
  summary: string;
};
