import { formatNum } from "@/lib/number";
import { analyzeTechnique, DRL_CHEST_PA } from "@/lib/rxPhysics";
import type {
  Analysis,
  ArtifactClaim,
  Evaluation,
  Finding,
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

function exposurePoints(ei: number): { points: number; findings: Finding[] } {
  if (ei >= DRL_CHEST_PA.eiMin && ei <= DRL_CHEST_PA.eiMax) {
    return {
      points: 3,
      findings: [
        {
          level: "ok",
          text: `EI ${formatNum(ei, 0)} in banda (200–420). Fluenza al detettore compatibile con un torace digitale.`,
        },
      ],
    };
  }
  if (ei < 120) {
    return {
      points: 0.3,
      findings: [
        {
          level: "error",
          text: `EI ${formatNum(ei, 0)}: sottoesposizione. L'immagine è chiara e il rumore quantico (mottle) maschera i vasi e il tenue addensamento basale.`,
        },
      ],
    };
  }
  if (ei < 200) {
    return {
      points: 1.6,
      findings: [
        {
          level: "warn",
          text: `EI ${formatNum(ei, 0)} sotto la banda utile. Rumore quantico visibile: alza i mAs o avvicina la tecnica al riferimento (circa 3 mAs a 120 kVp, 180 cm, griglia inserita).`,
        },
      ],
    };
  }
  if (ei <= 680) {
    return {
      points: 1.5,
      findings: [
        {
          level: "warn",
          text: `EI ${formatNum(ei, 0)} sopra banda. Dose al detettore inutile: i campi polmonari tendono a chiudersi.`,
        },
      ],
    };
  }
  return {
    points: 0.3,
    findings: [
      {
        level: "error",
        text: `EI ${formatNum(ei, 0)}: sovraesposizione / bruciatura. I polmoni si chiudono al nero e la dose viola il principio ALARA.`,
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
  const exposure = exposurePoints(dosimetry.ei);

  const gridFindings: Finding[] = [];
  let gridPoints = 1.5;
  if (technique.grid) {
    gridFindings.push({
      level: "ok",
      text: "Griglia 12:1 inserita: la radiazione diffusa del torace ad alto kVp è controllata.",
    });
  } else if (technique.kvp > 85) {
    gridPoints = 0.2;
    gridFindings.push({
      level: "error",
      text: "Griglia rimossa con kVp > 85: velo grigio da scatter, contrasto soggettivo nettamente ridotto. Sul torace adulto la griglia resta inserita.",
    });
  } else {
    gridPoints = 0.8;
    gridFindings.push({
      level: "warn",
      text: "Griglia rimossa. Sotto 85 kVp lo scatter è minore, ma questa non è la tecnica del torace PA adulto.",
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
    technique.grid &&
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
  let projectionPoints = 3;
  if (technique.projection === "LL" || geometry.beam === "LL") {
    projectionPoints = 0.4;
    positionFindings.push({
      level: "error",
      text: "Proiezione laterale: non è l'incidenza richiesta. Il quesito chiede un PA. In laterale l'addensamento è sovrapposto e non sostituisce il frontale.",
    });
  } else if (technique.projection === "PA" && technique.decubitus === "SUPINO") {
    projectionPoints = 0.7;
    positionFindings.push({
      level: "error",
      text: "È selezionato PA ma il paziente è supino. In clinostatismo il fascio è una AP da tavolo: la silhouette cardiaca si ingrandisce (falsa cardiomegalia) e le clavicole si orizzontalizzano.",
    });
  } else if (geometry.beam === "AP") {
    projectionPoints = 1;
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

  let decubitusPoints = 1.5;
  if (technique.decubitus === "SUPINO") {
    decubitusPoints = 0.3;
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

  let breathPoints = 2;
  if (technique.respiration === "INSP") {
    positionFindings.push({
      level: "ok",
      text: "Apnea inspiratoria profonda: campi polmonari espansi, circa nove archi costali posteriori, cuore non artificiosamente trasverso.",
    });
  } else if (technique.respiration === "ESP") {
    breathPoints = 0.5;
    positionFindings.push({
      level: "error",
      text: "Apnea espiratoria: i polmoni sono poveri di volume, le basi si affollano e il cuore appare più largo. Per la polmonite serve l'inspirio, non l'espirio (utile semmai per un pneumotorace mirato).",
    });
  } else {
    breathPoints = 0.2;
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
    projectionPoints = Math.max(0.8, projectionPoints - 0.8);
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
      text: "Collimazione troppo stretta: vengono tagliati più reperi obbligatori (apici, seni costofrenici o pareti laterali). L'esame non è centrato sul volume toracico.",
    });
  } else if (clipCount === 1) {
    collPoints = 0.4;
    const what = collimation.clipsApices
      ? "gli apici"
      : collimation.clipsBases
        ? "i seni costofrenici"
        : "le pareti laterali";
    positionFindings.push({
      level: "error",
      text: `Collimazione stretta: il fascio taglia ${what}. Sul torace PA vanno inclusi apici, seni costofrenici e profilo cutaneo laterale.`,
    });
  } else if (wide) {
    collPoints = 0.9;
    positionFindings.push({
      level: "warn",
      text: `Campo ${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm più ampio dell'anatomia (${formatNum(collimation.anatomyW, 0)}×${formatNum(collimation.anatomyH, 0)} cm). Nessun taglio, ma irradi di strutture extra-toraciche e alzi il DAP.`,
    });
  } else {
    positionFindings.push({
      level: "ok",
      text: `Collimazione ${formatNum(technique.collW, 0)}×${formatNum(technique.collH, 0)} cm: apici, seni e pareti inclusi, senza un campo inutilmente aperto.`,
    });
  }

  const positioning: ScoreSection = {
    id: "position",
    title: "Posizionamento e Centraggio Anatomico",
    max: 8,
    score: clampScore(
      projectionPoints + decubitusPoints + breathPoints + collPoints,
      8,
    ),
    findings: positionFindings,
    lines: [
      { label: "Proiezione", points: round1(projectionPoints), max: 3 },
      { label: "Decubito", points: round1(decubitusPoints), max: 1.5 },
      { label: "Respiro", points: round1(breathPoints), max: 2 },
      { label: "Collimazione", points: round1(collPoints), max: 1.5 },
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

  return { sections, total, max: 30, verdict, summary };
}
