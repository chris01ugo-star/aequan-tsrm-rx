import { formatNum } from "@/lib/number";
import { computeRoomMetrics, toRoomGeometry } from "@/lib/rxGeometry";
import { analyzeTechnique, DRL_CHEST_PA, EI_TARGET } from "@/lib/rxPhysics";
import type {
  Analysis,
  ArtifactClaim,
  Evaluation,
  Finding,
  GeometryEvidence,
  ReviewDeclaration,
  ScoreLine,
  ScoreSection,
  Technique,
} from "@/types/rx";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number, max: number): number {
  return round1(Math.min(max, Math.max(0, value)));
}

function kvpPoints(kvp: number): { points: number; findings: Finding[] } {
  if (kvp >= 110 && kvp <= 125) {
    return {
      points: 3.5,
      findings: [
        {
          level: "ok",
          text: `kVp ${formatNum(kvp, 0)}: scala dei grigi lunga, penetrazione mediastinica adeguata al torace adulto (bersaglio 110–125).`,
        },
      ],
    };
  }
  if (kvp >= 104 && kvp <= 129) {
    return {
      points: 2.6,
      findings: [
        {
          level: "warn",
          text: `kVp ${formatNum(kvp, 0)} accettabile ma fuori dalla finestra ottimale 110–125. Il contrasto del torace non è quello di riferimento.`,
        },
      ],
    };
  }
  if (kvp < 96) {
    return {
      points: 0.4,
      findings: [
        {
          level: "error",
          text: `kVp ${formatNum(kvp, 0)} troppo basso: contrasto elevato e scarsa penetrazione del mediastino e dello spazio retrocardiaco. L'addensamento basale e i contorni cardiaci perdono dettaglio.`,
        },
      ],
    };
  }
  if (kvp > 134) {
    return {
      points: 0.3,
      findings: [
        {
          level: "error",
          text: `kVp ${formatNum(kvp, 0)} eccessivo: l'immagine diventa piatta e grigia, il contrasto soggetto crolla e la dose sale con la quarta-quinta potenza della tensione.`,
        },
      ],
    };
  }
  return {
    points: 1.4,
    findings: [
      {
        level: "warn",
        text: `kVp ${formatNum(kvp, 0)} distante dal preset 110–125. Rivedi penetrazione e latitudine di grigi prima di consegnare.`,
      },
    ],
  };
}

function signed(value: number, digits: number): string {
  const text = formatNum(value, digits);
  return value > 0 ? `+${text}` : text;
}

function exposurePoints(ei: number, di: number): { points: number; findings: Finding[] } {
  const index = `DI ${signed(di, 1)} (IEC 62494-1), EI ${formatNum(ei, 0)} su target ${EI_TARGET}`;
  if (di >= -1 && di <= 1) {
    return {
      points: 3,
      findings: [
        {
          level: "ok",
          text: `${index}: banda ottimale −1 … +1. Fluenza al detettore compatibile con un torace digitale.`,
        },
      ],
    };
  }
  if (di < -3) {
    return {
      points: 0.3,
      findings: [
        {
          level: "error",
          text: `${index}: sottoesposizione. Il rumore quantico maschera i vasi e il tenue addensamento basale.`,
        },
      ],
    };
  }
  if (di > 3) {
    return {
      points: 0.3,
      findings: [
        {
          level: "error",
          text: `${index}: dose creep. La fluenza supera il target senza guadagno diagnostico e i campi polmonari tendono a chiudersi.`,
        },
      ],
    };
  }
  if (di < -1) {
    return {
      points: 1.6,
      findings: [
        {
          level: "warn",
          text: `${index}: sotto la banda ottimale, ancora sopra la soglia di sottoesposizione (−3).`,
        },
      ],
    };
  }
  return {
    points: 1.6,
    findings: [
      {
        level: "warn",
        text: `${index}: sopra la banda ottimale, ancora sotto la soglia di dose creep (+3).`,
      },
    ],
  };
}

const CLAIM_LABEL: Record<Exclude<ArtifactClaim, "none">, string> = {
  noise: "Rumore quantico",
  scatter: "Scatter da griglia assente",
  motion: "Sfocatura cinetica",
  heart: "Ingrandimento cardiaco geometrico",
  clip: "Taglio anatomico da collimazione",
  penetration: "Penetrazione insufficiente",
};

export function presentArtifacts(
  technique: Technique,
  analysis: Analysis,
): Exclude<ArtifactClaim, "none">[] {
  const present: Exclude<ArtifactClaim, "none">[] = [];
  const { faults, geometry, collimation } = analysis;
  if (faults.includes("noise") || faults.includes("underexposure")) present.push("noise");
  if (faults.includes("scatter")) present.push("scatter");
  if (faults.includes("motion")) present.push("motion");
  if (geometry.beam === "AP" || geometry.heartMag >= 1.15) present.push("heart");
  const clipped =
    collimation.clipsApices || collimation.clipsBases || collimation.clipsLateral;
  if (clipped) present.push("clip");
  if (faults.includes("underpenetration") || technique.kvp < 96) present.push("penetration");
  return present;
}

function scoreJustification(
  review: ReviewDeclaration,
  present: Exclude<ArtifactClaim, "none">[],
  faults: Analysis["faults"],
): { score: number; findings: Finding[]; lines: ScoreLine[] } {
  const lines: ScoreLine[] = [];
  const claimed = review.claims.filter((claim): claim is Exclude<ArtifactClaim, "none"> => claim !== "none");
  const saidNone = review.claims.includes("none") && claimed.length === 0;
  const findings: Finding[] = [];
  let points = 5;
  const actual = new Set(present);

  if (saidNone && present.length === 0) {
    findings.push({
      level: "ok",
      text: "Hai dichiarato l'immagine priva di artefatti rilevanti, e sullo scatto consegnato non ce ne sono di quelli in checklist.",
    });
  } else if (saidNone && present.length > 0) {
    points -= 2.4;
    findings.push({
      level: "error",
      text: `Hai segnato «nessun artefatto», ma sullo scatto restano: ${present.map((item) => CLAIM_LABEL[item]).join(", ")}.`,
    });
  } else {
    for (const item of present) {
      if (claimed.includes(item)) {
        findings.push({
          level: "ok",
          text: `${CLAIM_LABEL[item]}: riconosciuto in modo coerente con l'immagine consegnata.`,
        });
      } else {
        points -= 1.05;
        findings.push({
          level: "error",
          text: `${CLAIM_LABEL[item]} è presente sullo scatto e non è stato dichiarato in review.`,
        });
      }
    }
    for (const item of claimed) {
      if (!actual.has(item)) {
        points -= 0.7;
        findings.push({
          level: "warn",
          text: `${CLAIM_LABEL[item]} è stato dichiarato, ma non è un difetto reale di questo scatto.`,
        });
      }
    }
  }

  const severe =
    present.length >= 2 ||
    faults.includes("burn") ||
    faults.includes("underpenetration") ||
    faults.includes("motion");
  if (review.adequate && (severe || present.length > 0)) {
    points -= 1.1;
    findings.push({
      level: "error",
      text: "L'immagine è stata giudicata diagnosticamente adeguata, ma i difetti tecnici compromettono il quesito.",
    });
  } else if (!review.adequate && present.length > 0) {
    points += 0.35;
    findings.push({
      level: "ok",
      text: "Giudizio corretto: l'immagine non è adeguata al quesito e i difetti sono stati messi in discussione.",
    });
  } else if (review.adequate && present.length === 0 && !faults.includes("burn")) {
    findings.push({
      level: "ok",
      text: "Giudizio di adeguatezza coerente con uno scatto senza artefatti di checklist.",
    });
  } else if (!review.adequate && present.length === 0) {
    points -= 0.8;
    findings.push({
      level: "warn",
      text: "L'immagine è stata scartata come non adeguata, ma non emergono gli artefatti della checklist.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      level: "ok",
      text: "La dichiarazione in review è coerente con lo scatto consegnato.",
    });
  }

  lines.push({
    label: "Coerenza tra dichiarazione e scatto",
    points: clampScore(points, 5),
    max: 5,
  });
  return { score: clampScore(points, 5), findings, lines };
}

export function evaluateExam(
  technique: Technique,
  shotCount: number,
  cumulativeDap: number,
  review: ReviewDeclaration,
): Evaluation {
  const analysis = analyzeTechnique(technique);
  const { dosimetry, geometry, collimation, faults } = analysis;

  const kvp = kvpPoints(technique.kvp);
  const exposure = exposurePoints(dosimetry.ei, dosimetry.di);

  const gridFindings: Finding[] = [];
  let gridPoints = 1.5;
  const cutoff = geometry.gridCutoff;
  if (technique.gridMode === "none") {
    gridPoints = technique.kvp > 85 ? 0.2 : 0.8;
    gridFindings.push({
      level: technique.kvp > 85 ? "error" : "warn",
      text:
        technique.kvp > 85
          ? "Griglia rimossa con kVp alto: la radiazione diffusa non è controllata e il contrasto del torace cade."
          : "Griglia rimossa. Lo scatter è minore, ma il torace PA adulto si esegue con griglia focalizzata.",
    });
  } else if (cutoff > 0.2) {
    gridPoints = 0.25;
    const why =
      geometry.gridCutoffAsymmetry !== 0
        ? "disallineamento trasversale rispetto alle lamelle"
        : technique.gridMode === "focused_100"
          ? "griglia focalizzata a 100 cm usata fuori fuoco"
          : "griglia focalizzata a 180 cm usata sotto i 140 cm di DFF";
    gridFindings.push({
      level: "error",
      text: `Grid cutoff (fattore ${formatNum(cutoff, 2)}): ${why}. Bande di attenuazione periferica e perdita di uniformità.`,
    });
  } else if (technique.gridMode === "focused_180" && technique.dff >= 160) {
    gridFindings.push({
      level: "ok",
      text: `Griglia focalizzata 180 cm, rapporto 12:1, Bucky ×${formatNum(dosimetry.buckyFactor, 0)}. DFF ${formatNum(technique.dff, 0)} cm dentro il fuoco: scatter ridotto, cutoff assente.`,
    });
  } else if (technique.gridMode === "focused_100") {
    gridPoints = 0.9;
    gridFindings.push({
      level: "warn",
      text: "Griglia focalizzata 100 cm, rapporto 10:1. È a fuoco solo vicino a 100 cm e non è la griglia del teleradiografo a 180 cm.",
    });
  } else {
    gridPoints = 1;
    gridFindings.push({
      level: "warn",
      text: `Griglia ${technique.gridMode === "focused_180" ? "180 cm" : "inserita"} senza cutoff evidente, ma la DFF non è quella di fuoco del torace eretto.`,
    });
  }

  const focalFindings: Finding[] = [];
  let focalPoints = 1;
  if (technique.focal === "FINE") {
    focalFindings.push({
      level: "ok",
      text: "Macchia focale fine 0,6 mm: penombra geometrica trascurabile alla DFF del torace.",
    });
  } else if (technique.dff >= 170) {
    focalPoints = 0.6;
    focalFindings.push({
      level: "warn",
      text: "Macchia focale grossa 1,2 mm. A DFF lunga la penombra è contenuta, ma sul torace si preferisce il fuoco fine.",
    });
  } else {
    focalPoints = 0.3;
    focalFindings.push({
      level: "error",
      text: "Fuoco grosso e DFF breve: la penombra (Ug = f · OID / SOD) sfoca i contorni vascolari e il bordo dell'addensamento.",
    });
  }

  const sharpFindings: Finding[] = [];
  let sharpPoints = 1;
  if (technique.respiration === "LIBERO") {
    sharpPoints -= 0.85;
    sharpFindings.push({
      level: "error",
      text: "Respiro libero: motion blur sul diaframma e sulle basi. I seni costofrenici e l'addensamento non sono nitidi.",
    });
  } else {
    sharpFindings.push({
      level: "ok",
      text: "Nessun mosso respiratorio. L'apnea tiene fermi diaframma e vasi.",
    });
  }
  if (faults.includes("penumbra")) {
    sharpPoints -= 0.35;
    sharpFindings.push({
      level: "error",
      text: "Sfocatura geometrica da macchia focale grossa a distanza ridotta.",
    });
  }

  const imageFindings = [
    ...kvp.findings,
    ...exposure.findings,
    ...gridFindings,
    ...focalFindings,
    ...sharpFindings,
  ];
  if (
    kvp.points >= 3 &&
    exposure.points >= 3 &&
    technique.gridMode === "focused_180" &&
    cutoff <= 0.2 &&
    technique.respiration !== "LIBERO"
  ) {
    imageFindings.push({
      level: "ok",
      text: "La qualità è sufficiente a riconoscere un tenue addensamento parenchimale basale destro, se il centraggio lo include.",
    });
  }

  const image: ScoreSection = {
    id: "image",
    title: "Parametri di Acquisizione e Qualità Immagine",
    max: 10,
    score: clampScore(
      kvp.points + exposure.points + gridPoints + focalPoints + sharpPoints,
      10,
    ),
    findings: imageFindings,
    lines: [
      { label: "kVp e penetrazione", points: round1(kvp.points), max: 3.5 },
      { label: "Esposizione ed EI", points: round1(exposure.points), max: 3 },
      { label: "Griglia", points: round1(gridPoints), max: 1.5 },
      { label: "Macchia focale", points: round1(focalPoints), max: 1 },
      { label: "Nitidezza", points: round1(Math.max(0, sharpPoints)), max: 1 },
    ],
  };

  const positionFindings: Finding[] = [];
  let projectionPoints = 2;
  if (technique.projection === "LL" || geometry.beam === "LL") {
    projectionPoints = 0.3;
    positionFindings.push({
      level: "error",
      text: "Proiezione laterale: non è l'incidenza richiesta. Il quesito chiede un PA. In laterale l'addensamento è sovrapposto e non sostituisce il frontale.",
    });
  } else if (technique.projection === "PA" && technique.decubitus === "SUPINO") {
    projectionPoints = 0.4;
    positionFindings.push({
      level: "error",
      text: "È selezionato PA ma il paziente è supino. In clinostatismo il fascio è una AP da tavolo: la silhouette cardiaca si ingrandisce (falsa cardiomegalia) e le clavicole si orizzontalizzano.",
    });
  } else if (geometry.beam === "AP") {
    projectionPoints = 0.6;
    positionFindings.push({
      level: "error",
      text: "Proiezione AP: il cuore è lontano dal detettore. L'ingrandimento geometrico simula una cardiomegalia e non è l'incidenza standard di questo caso.",
    });
  } else {
    positionFindings.push({
      level: "ok",
      text: "PA in ortostatismo: incidenza coerente con il quesito. Il cuore è vicino al detettore.",
    });
  }

  let decubitusPoints = 1;
  if (technique.decubitus === "SUPINO") {
    decubitusPoints = 0.2;
    positionFindings.push({
      level: "error",
      text: "Decubito supino. Per il torace standard e per valutare un piccolo versamento o l'espansione delle basi serve l'ortostatismo, salvo che il paziente non collabori.",
    });
  } else {
    positionFindings.push({
      level: "ok",
      text: "Ortostatismo: diaframma in posizione fisiologica, seni costofrenici valutabili.",
    });
  }

  let breathPoints = 1.5;
  if (technique.respiration === "INSP") {
    positionFindings.push({
      level: "ok",
      text: "Apnea inspiratoria profonda: campi polmonari espansi, circa nove archi costali posteriori, cuore non artificiosamente trasverso.",
    });
  } else if (technique.respiration === "ESP") {
    breathPoints = 0.4;
    positionFindings.push({
      level: "error",
      text: "Apnea espiratoria: i polmoni sono poveri di volume, le basi si affollano e il cuore appare più largo. Per la polmonite serve l'inspirio, non l'espirio (utile semmai per un pneumotorace mirato).",
    });
  } else {
    breathPoints = 0.15;
    positionFindings.push({
      level: "error",
      text: "Respiro libero al posto dell'apnea inspiratoria. Oltre al mosso, l'espansione è incompleta.",
    });
  }

  if (technique.dff < 150 && geometry.beam === "PA") {
    positionFindings.push({
      level: "error",
      text: `DFF ${formatNum(technique.dff, 0)} cm: sotto i 150 cm la silhouette cardiaca si ingrandisce anche in PA. Il riferimento del torace eretto è 180 cm.`,
    });
    projectionPoints = Math.max(0.4, projectionPoints - 0.6);
  }

  const rotation = technique.patientRotationDeg;
  let rotationPoints = 1;
  if (Math.abs(rotation) <= 3) {
    positionFindings.push({
      level: "ok",
      text: `Rotazione assiale ${signed(rotation, 0)}°: entro ±3°. I capi mediali delle clavicole restano simmetrici rispetto ai processi spinosi (EUR 16260).`,
    });
  } else if (Math.abs(rotation) <= 8) {
    rotationPoints = 0.4;
    positionFindings.push({
      level: "warn",
      text: `Rotazione assiale ${signed(rotation, 0)}°: oltre ±3°. Asimmetria dei capi mediali delle clavicole rispetto ai processi spinosi.`,
    });
  } else {
    rotationPoints = 0.1;
    positionFindings.push({
      level: "error",
      text: `Rotazione assiale ${signed(rotation, 0)}°: obliquità evidente. Il mediastino e la silhouette cardiaca non sono più frontali.`,
    });
  }

  let shoulderPoints = 0.5;
  if (geometry.beam === "LL") {
    shoulderPoints = 0.3;
    positionFindings.push({
      level: "warn",
      text: "In laterale il criterio delle scapole fuori dai campi polmonari del PA non è valutabile su questa incidenza.",
    });
  } else if (technique.shouldersRolledForward) {
    positionFindings.push({
      level: "ok",
      text: "Spalle ruotate in avanti: le scapole si proiettano fuori dai campi polmonari.",
    });
  } else {
    shoulderPoints = 0;
    positionFindings.push({
      level: "error",
      text: "Spalle non ruotate in avanti: i margini mediali delle scapole si sovrappongono ai campi polmonari superiori.",
    });
  }

  let markerPoints = 0.5;
  if (technique.markerSide === "DX") {
    positionFindings.push({
      level: "ok",
      text: "Marker radiopaco DX presente nel campo esposto: il lato anatomico è identificabile.",
    });
  } else if (technique.markerSide === "SX") {
    markerPoints = 0.25;
    positionFindings.push({
      level: "warn",
      text: "Marker SX presente. Il lato è marcato, ma sul frontale standard il reperto è DX.",
    });
  } else {
    markerPoints = 0;
    positionFindings.push({
      level: "error",
      text: "Marker anatomico assente: il radiogramma non identifica il lato del paziente (EUR 16260).",
    });
  }

  const clipCount =
    Number(collimation.clipsApices) +
    Number(collimation.clipsBases) +
    Number(collimation.clipsLateral);
  const wide = collimation.excessW > 5.5 || collimation.excessH > 8;
  let collPoints = 1.5;
  if (clipCount >= 2) {
    collPoints = 0;
    positionFindings.push({
      level: "error",
      text: "Il campo esclude più reperi obbligatori (apici, seni costo-frenici o pareti laterali). EUR 16260 richiede l'inclusione completa.",
    });
  } else if (clipCount === 1) {
    collPoints = 0.35;
    const what = collimation.clipsApices
      ? "gli apici"
      : collimation.clipsBases
        ? "i seni costo-frenici"
        : "le pareti laterali";
    positionFindings.push({
      level: "error",
      text: `Il fascio taglia ${what}. Sul torace PA vanno inclusi apici, seni costo-frenici e profilo cutaneo laterale.`,
    });
  } else if (wide) {
    collPoints = 0.9;
    positionFindings.push({
      level: "warn",
      text: `Campo ${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm più ampio dell'anatomia (${formatNum(collimation.anatomyW, 0)}×${formatNum(collimation.anatomyH, 0)} cm). Nessun taglio, ma il DAP sale con l'area.`,
    });
  } else {
    positionFindings.push({
      level: "ok",
      text: `Collimazione ${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm: apici e seni costo-frenici inclusi.`,
    });
  }

  const positioning: ScoreSection = {
    id: "position",
    title: "Posizionamento e Centraggio Anatomico",
    max: 8,
    score: clampScore(
      projectionPoints +
        decubitusPoints +
        breathPoints +
        collPoints +
        rotationPoints +
        shoulderPoints +
        markerPoints,
      8,
    ),
    findings: positionFindings,
    lines: [
      { label: "Proiezione", points: round1(projectionPoints), max: 2 },
      { label: "Decubito", points: round1(decubitusPoints), max: 1 },
      { label: "Respiro", points: round1(breathPoints), max: 1.5 },
      { label: "Inclusione del campo", points: round1(collPoints), max: 1.5 },
      { label: "Simmetria ±3°", points: round1(rotationPoints), max: 1 },
      { label: "Scapole", points: round1(shoulderPoints), max: 0.5 },
      { label: "Marker", points: round1(markerPoints), max: 0.5 },
    ],
  };

  const doseRatioEsd = dosimetry.esdMgy / DRL_CHEST_PA.esdMgy;
  const doseRatioDap = dosimetry.dapDGyCm2 / DRL_CHEST_PA.dapDGyCm2;
  const band = (ratio: number, max: number) => {
    if (ratio <= 1) return max;
    if (ratio <= 1.35) return max * 0.62;
    if (ratio <= 2) return max * 0.28;
    return 0;
  };
  let esdPoints = band(doseRatioEsd, 2.5);
  let dapPoints = band(doseRatioDap, 2.5);
  const doseFindings: Finding[] = [];

  if (dosimetry.esdMgy <= DRL_CHEST_PA.esdMgy) {
    doseFindings.push({
      level: "ok",
      text: `ESD ${formatNum(dosimetry.esdMgy, 3)} mGy, sotto il DRL di 0,30 mGy.`,
    });
  } else {
    doseFindings.push({
      level: "error",
      text: `ESD ${formatNum(dosimetry.esdMgy, 3)} mGy supera il DRL di 0,30 mGy (${formatNum(doseRatioEsd * 100, 0)}%). Riduci i mAs o allunga la DFF.`,
    });
  }
  if (dosimetry.dapDGyCm2 <= DRL_CHEST_PA.dapDGyCm2) {
    doseFindings.push({
      level: "ok",
      text: `DAP ${formatNum(dosimetry.dapDGyCm2, 2)} dGy·cm², sotto il DRL di 1,60 dGy·cm² (16 cGy·cm²).`,
    });
  } else {
    doseFindings.push({
      level: "error",
      text: `DAP ${formatNum(dosimetry.dapDGyCm2, 2)} dGy·cm² sopra il DRL di 1,60. Il prodotto dose-area sale con mAs, con 1/DFF² e con l'area di collimazione.`,
    });
  }

  if (dosimetry.ei < 120) {
    esdPoints *= 0.45;
    dapPoints *= 0.45;
    doseFindings.push({
      level: "error",
      text: "Dose numerica bassa ma immagine non diagnostica. ALARA non è sottoesporre: è la dose minima che risponde ancora al quesito.",
    });
  }

  let optim = 2;
  if (technique.dff < 150) {
    optim -= 0.8;
    doseFindings.push({
      level: "error",
      text: `DFF ${formatNum(technique.dff, 0)} cm: la dose cresce con il quadrato inverso della distanza. Sul torace eretto resta 180 cm.`,
    });
  } else if (technique.dff < 170) {
    optim -= 0.35;
    doseFindings.push({
      level: "warn",
      text: `DFF ${formatNum(technique.dff, 0)} cm, sotto i 180 cm di riferimento. Margine di ottimizzazione ancora disponibile.`,
    });
  } else {
    doseFindings.push({
      level: "ok",
      text: `DFF ${formatNum(technique.dff, 0)} cm coerente con il torace in ortostatismo.`,
    });
  }
  if (wide) {
    optim -= 0.5;
    doseFindings.push({
      level: "warn",
      text: "Collimazione larga: ogni centimetro di campo in più aumenta il DAP senza aggiungere informazione sul quesito polmonare.",
    });
  }
  if (shotCount > 1) {
    const penalty = Math.min(1.1, (shotCount - 1) * 0.45);
    optim -= penalty;
    doseFindings.push({
      level: shotCount > 2 ? "error" : "warn",
      text: `${shotCount} esposizioni in sessione. Il DAP cumulativo è ${formatNum(cumulativeDap, 2)} dGy·cm²: le ripetizioni si sommano, anche se consegni solo l'ultima immagine.`,
    });
  } else {
    doseFindings.push({
      level: "ok",
      text: "Una sola esposizione: niente dose di ripetizione.",
    });
  }

  const dose: ScoreSection = {
    id: "dose",
    title: "Ottimizzazione Dose e Criteri ALARA",
    max: 7,
    score: clampScore(esdPoints + dapPoints + optim, 7),
    findings: doseFindings,
    lines: [
      { label: "ESD rispetto al DRL", points: round1(esdPoints), max: 2.5 },
      { label: "DAP rispetto al DRL", points: round1(dapPoints), max: 2.5 },
      { label: "Ottimizzazione", points: round1(Math.max(0, optim)), max: 2 },
    ],
  };

  const present = presentArtifacts(technique, analysis);
  const justification = scoreJustification(review, present, faults);

  const artifacts: ScoreSection = {
    id: "artifacts",
    title: "Giustificazione Tecnica e Riconoscimento Artefatti",
    max: 5,
    score: justification.score,
    findings: justification.findings,
    lines: justification.lines,
  };

  const sections = [image, positioning, dose, artifacts];
  const total = round1(sections.reduce((sum, section) => sum + section.score, 0));
  const verdict =
    total >= 27
      ? "OTTIMO"
      : total >= 24
        ? "BUONO"
        : total >= 18
          ? "SUFFICIENTE"
          : total >= 12
            ? "INSUFFICIENTE"
            : "GRAVEMENTE INSUFFICIENTE";

  const errors = sections.flatMap((section) =>
    section.findings.filter((finding) => finding.level === "error"),
  );
  const summary =
    errors.length === 0
      ? "Tecnica consegnabile per questo quesito didattico. L'addensamento basale destro resta visibile e la dose sta entro i DRL."
      : `Errori principali: ${errors
          .slice(0, 3)
          .map((finding) => finding.text.replace(/\.$/, ""))
          .join(" · ")}.`;

  return {
    sections,
    total,
    max: 30,
    verdict,
    summary,
    geometryEvidence: buildGeometryEvidence(technique, analysis),
  };
}

function buildGeometryEvidence(technique: Technique, analysis: Analysis): GeometryEvidence[] {
  const state = toRoomGeometry(technique);
  const metrics = computeRoomMetrics(state);
  const rows: GeometryEvidence[] = [];
  const rotation = technique.patientRotationDeg;

  rows.push({
    cause: `Rotazione paziente ${signed(rotation, 0)}°`,
    evidence:
      Math.abs(rotation) <= 3
        ? "Capi mediali delle clavicole simmetrici rispetto ai processi spinosi."
        : "Asimmetria dei capi mediali delle clavicole rispetto ai processi spinosi.",
  });
  rows.push({
    cause: technique.shouldersRolledForward
      ? "Spalle ruotate in avanti"
      : "Spalle non ruotate in avanti",
    evidence: technique.shouldersRolledForward
      ? "Scapole proiettate fuori dai campi polmonari."
      : "Margini mediali delle scapole sovrapposti ai campi polmonari superiori.",
  });
  rows.push({
    cause: `Centratura X ${signed(technique.centeringOffsetXCm, 1)} cm, Y ${signed(technique.centeringOffsetYCm, 1)} cm`,
    evidence: analysis.collimation.clipsApices
      ? "Apici polmonari tagliati dal bordo craniale del campo."
      : analysis.collimation.clipsBases
        ? "Seni costo-frenici tagliati dal bordo caudale del campo."
        : analysis.collimation.clipsLateral
          ? "Profilo laterale del torace fuori dal campo luminoso."
          : "Apici e seni costo-frenici restano dentro il campo, con il torace traslato rispetto al centro del detettore.",
  });
  if (Math.abs(technique.tubeAngulationCCDeg) >= 2) {
    rows.push({
      cause: `Angolazione tubo CC ${signed(technique.tubeAngulationCCDeg, 0)}°`,
      evidence:
        technique.tubeAngulationCCDeg > 0
          ? "Clavicole proiettate cranialmente rispetto agli apici (aspetto lordotico)."
          : "Clavicole proiettate caudalmente sugli apici polmonari.",
    });
  } else {
    rows.push({
      cause: "Angolazione tubo CC 0°",
      evidence: "Clavicole in rapporto fisiologico con gli apici, senza lordosi indotta dal tubo.",
    });
  }
  if (metrics.gridCutoff.factor > 0.2) {
    rows.push({
      cause: metrics.gridCutoff.transverse
        ? `Inclinazione ML ${signed(technique.tubeAngulationMLDeg, 0)}° con griglia inserita`
        : `DFF ${formatNum(technique.dff, 0)} cm fuori fuoco della griglia`,
      evidence: "Grid cutoff: bande chiare di attenuazione ai bordi del campo.",
    });
  } else if (technique.gridMode === "none") {
    rows.push({
      cause: "Griglia rimossa",
      evidence: "Nessun grid cutoff. La radiazione diffusa non è ripulita dal Bucky.",
    });
  } else {
    rows.push({
      cause: `Griglia ${technique.gridMode === "focused_180" ? "focalizzata 180 cm" : "focalizzata 100 cm"} a fuoco`,
      evidence: "Campo uniforme, senza attenuazione periferica da defocalizzazione.",
    });
  }
  rows.push({
    cause: `DI ${signed(analysis.dosimetry.di, 1)}`,
    evidence:
      analysis.dosimetry.di > 3
        ? "Sovraesposizione / dose creep rispetto all'EI target (IEC 62494-1)."
        : analysis.dosimetry.di < -3
          ? "Sottoesposizione: rumore quantico sul detettore."
          : analysis.dosimetry.di >= -1 && analysis.dosimetry.di <= 1
            ? "Esposizione dentro la banda ottimale −1 … +1."
            : "Esposizione fuori dalla banda ottimale, ancora lontana dalle soglie ±3.",
  });
  rows.push({
    cause: technique.markerSide === "none" ? "Marker assente" : `Marker ${technique.markerSide}`,
    evidence:
      technique.markerSide === "none"
        ? "Lato anatomico non identificabile sull'immagine."
        : `Marker radiopaco ${technique.markerSide} visibile nell'angolo del campo esposto.`,
  });
  return rows;
}
