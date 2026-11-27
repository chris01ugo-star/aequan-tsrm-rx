import type { BeamGeometry, GeometryFactors } from "@/types/rx";

/**
 * Disegno procedurale dell'attenuazione (bianco = più denso).
 * Sostituibile: `rxPhysics` può copiare un PNG/DICOM già decodificato
 * al posto di `paintAttenuation` prima della modulazione fisica.
 */

export const LATENT_WIDTH = 700;
export const LATENT_HEIGHT = 820;

/** Profilo cutaneo PA non scalato, frazione del detettore 43×43 cm. */
export const PA_SKIN = { left: 0.115, right: 0.885, top: 0.108, bottom: 0.885 };

export const LL_SKIN = { left: 0.2, right: 0.8, top: 0.12, bottom: 0.9 };

export function projectPoint(
  x: number,
  y: number,
  geo: GeometryFactors,
): { x: number; y: number } {
  return {
    x: 0.5 + (x - 0.5) * geo.bodyMag,
    y: 0.5 + (y - 0.5) * geo.vert,
  };
}

export function skinFractions(geo: GeometryFactors): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const box = geo.beam === "LL" ? LL_SKIN : PA_SKIN;
  const a = projectPoint(box.left, box.top, geo);
  const b = projectPoint(box.right, box.bottom, geo);
  return { left: a.x, right: b.x, top: a.y, bottom: b.y };
}

export type OverlayMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export function overlayMarkers(geo: GeometryFactors): OverlayMarker[] {
  const p = (x: number, y: number) => projectPoint(x, y, geo);
  if (geo.beam === "LL") {
    return [
      { id: "sterno", label: "STERNO", ...p(0.27, 0.34) },
      { id: "colonna", label: "COLONNA", ...p(0.72, 0.4) },
      { id: "cuore", label: "SILHOUETTE CARDIACA", ...p(0.4, 0.58) },
      { id: "dia", label: "DIAFRAMMA", ...p(0.5, 0.74) },
      { id: "les", label: "ADDENSAMENTO (SOVRAPPOSTO)", ...p(0.42, 0.68) },
    ];
  }
  return [
    { id: "apdx", label: "APICE DX", ...p(0.3, 0.155) },
    { id: "apsx", label: "APICE SX", ...p(0.7, 0.15) },
    { id: "cpdx", label: "SENO COSTOFR. DX", ...p(0.18, 0.84) },
    { id: "cpsx", label: "SENO COSTOFR. SX", ...p(0.83, 0.855) },
    { id: "cuore", label: "SILHOUETTE CARDIACA", ...p(0.6, 0.5) },
    { id: "les", label: "ADDENSAMENTO BASALE DX", ...p(0.29, 0.71) },
    { id: "dia", label: "DIAFRAMMA DX", ...p(0.28, 0.79) },
  ];
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

export function paintAttenuation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  geo: GeometryFactors,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(geo.bodyMag, geo.vert);
  ctx.translate(-w / 2, -h / 2);
  if (geo.beam === "LL") paintLateral(ctx, w, h);
  else paintFrontal(ctx, w, h, geo);
  ctx.restore();

  drawLeadMarker(ctx, w, h, geo.beam === "LL" ? "SX" : "DX");
}

function paintFrontal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  geo: GeometryFactors,
): void {
  const rightLung = lungPath(w, h, "right");
  const leftLung = lungPath(w, h, "left");

  drawArms(ctx, w, h);
  drawTorso(ctx, w, h);

  ctx.fillStyle = "#101114";
  ctx.fill(rightLung);
  ctx.fill(leftLung);

  drawVessels(ctx, w, h, rightLung, 0.4, 0.46, -1, 11);
  drawVessels(ctx, w, h, leftLung, 0.6, 0.45, 1, 17);
  drawLesion(ctx, w, h, rightLung);
  drawRibs(ctx, w, h);
  drawClavicles(ctx, w, h, geo.beam === "AP");
  if (geo.beam === "AP") drawScapulae(ctx, w, h);
  drawAbdomenDetails(ctx, w, h);

  ctx.save();
  const hx = w * 0.585;
  const hy = h * 0.5;
  const extra = geo.heartMag / Math.max(geo.bodyMag, 0.2);
  ctx.translate(hx, hy);
  ctx.scale(extra, extra);
  ctx.translate(-hx, -hy);
  drawHeart(ctx, w, h);
  ctx.restore();

  drawSpine(ctx, w, h);
  drawTrachea(ctx, w, h);
  strokeDiaphragms(ctx, w, h);
}

function drawArms(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#4e4e4e";
  ctx.beginPath();
  ctx.ellipse(w * 0.055, h * 0.42, w * 0.045, h * 0.22, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.945, h * 0.42, w * 0.045, h * 0.22, -0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorso(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const p = new Path2D();
  p.moveTo(w * 0.44, h * 0.03);
  p.lineTo(w * 0.56, h * 0.03);
  p.bezierCurveTo(w * 0.7, h * 0.05, w * 0.9, h * 0.09, w * PA_SKIN.right, h * 0.15);
  p.bezierCurveTo(w * 0.93, h * 0.28, w * 0.9, h * 0.46, w * 0.885, h * 0.66);
  p.bezierCurveTo(w * 0.9, h * 0.82, w * 0.92, h * 1.02, w * 0.9, h * 1.05);
  p.lineTo(w * 0.1, h * 1.05);
  p.bezierCurveTo(w * 0.08, h * 1.02, w * 0.1, h * 0.82, w * 0.115, h * 0.66);
  p.bezierCurveTo(w * 0.1, h * 0.46, w * 0.07, h * 0.28, w * PA_SKIN.left, h * 0.15);
  p.bezierCurveTo(w * 0.1, h * 0.09, w * 0.3, h * 0.05, w * 0.44, h * 0.03);
  p.closePath();
  const g = ctx.createLinearGradient(0, h * 0.1, 0, h);
  g.addColorStop(0, "#727272");
  g.addColorStop(0.45, "#626262");
  g.addColorStop(1, "#6e6e6e");
  ctx.fillStyle = g;
  ctx.fill(p);
}

function lungPath(w: number, h: number, side: "right" | "left"): Path2D {
  const p = new Path2D();
  if (side === "right") {
    p.moveTo(w * 0.42, h * 0.145);
    p.bezierCurveTo(w * 0.3, h * 0.125, w * 0.18, h * 0.17, w * 0.15, h * 0.28);
    p.bezierCurveTo(w * 0.125, h * 0.44, w * 0.135, h * 0.62, w * 0.155, h * 0.76);
    p.bezierCurveTo(w * 0.18, h * 0.855, w * 0.28, h * 0.8, w * 0.36, h * 0.72);
    p.bezierCurveTo(w * 0.43, h * 0.64, w * 0.455, h * 0.48, w * 0.445, h * 0.34);
    p.bezierCurveTo(w * 0.435, h * 0.22, w * 0.43, h * 0.17, w * 0.42, h * 0.145);
  } else {
    p.moveTo(w * 0.56, h * 0.142);
    p.bezierCurveTo(w * 0.68, h * 0.125, w * 0.82, h * 0.18, w * 0.85, h * 0.3);
    p.bezierCurveTo(w * 0.885, h * 0.48, w * 0.875, h * 0.64, w * 0.845, h * 0.78);
    p.bezierCurveTo(w * 0.8, h * 0.875, w * 0.68, h * 0.83, w * 0.6, h * 0.76);
    p.bezierCurveTo(w * 0.55, h * 0.71, w * 0.535, h * 0.6, w * 0.55, h * 0.52);
    p.bezierCurveTo(w * 0.63, h * 0.48, w * 0.655, h * 0.38, w * 0.59, h * 0.28);
    p.bezierCurveTo(w * 0.555, h * 0.2, w * 0.55, h * 0.16, w * 0.56, h * 0.142);
  }
  p.closePath();
  return p;
}

function drawVessels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clip: Path2D,
  hx: number,
  hy: number,
  dir: number,
  seed: number,
): void {
  const rng = mulberry32(seed);
  ctx.save();
  ctx.clip(clip);
  ctx.lineCap = "round";
  const ox = w * hx;
  const oy = h * hy;
  for (let i = 0; i < 18; i += 1) {
    const x1 = ox + dir * w * (0.02 + rng() * 0.08);
    const y1 = oy + (rng() - 0.5) * h * 0.22;
    const x2 = x1 + dir * w * (0.04 + rng() * 0.08);
    const y2 = y1 + (rng() - 0.45) * h * 0.1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(176,176,176,${0.16 + rng() * 0.14})`;
    ctx.lineWidth = 0.7 + rng() * 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLesion(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clip: Path2D,
): void {
  const spots: Array<[number, number, number, number]> = [
    [0.27, 0.67, 0.08, 0.34],
    [0.33, 0.72, 0.095, 0.38],
    [0.24, 0.74, 0.065, 0.26],
  ];
  ctx.save();
  ctx.clip(clip);
  for (const [x, y, r, a] of spots) {
    const g = ctx.createRadialGradient(w * x, h * y, 2, w * x, h * y, w * r);
    g.addColorStop(0, `rgba(206,206,206,${a})`);
    g.addColorStop(1, "rgba(206,206,206,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(18,18,18,0.55)";
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  const branches: Array<[number, number, number, number]> = [
    [0.3, 0.66, 0.25, 0.7],
    [0.3, 0.66, 0.34, 0.705],
    [0.27, 0.69, 0.23, 0.735],
  ];
  for (const [x1, y1, x2, y2] of branches) {
    ctx.beginPath();
    ctx.moveTo(w * x1, h * y1);
    ctx.lineTo(w * x2, h * y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRibs(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i += 1) {
    const y0 = h * (0.2 + i * 0.062);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + side * w * 0.018, y0);
      ctx.quadraticCurveTo(
        w * (0.5 + side * 0.18),
        y0 + h * 0.018,
        w * (0.5 + side * 0.34),
        y0 + h * 0.05,
      );
      ctx.strokeStyle = "rgba(214,214,214,0.55)";
      ctx.lineWidth = 3.1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 7; i += 1) {
    const y0 = h * (0.26 + i * 0.055);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + side * w * 0.03, y0 + h * 0.03);
      ctx.quadraticCurveTo(
        w * (0.5 + side * 0.16),
        y0 + h * 0.07,
        w * (0.5 + side * 0.3),
        y0 + h * 0.02,
      );
      ctx.strokeStyle = "rgba(236,236,236,0.8)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawClavicles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ap: boolean,
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#d2d2d2";
  ctx.lineWidth = ap ? 8 : 6.5;
  const lift = ap ? -0.035 : 0.015;
  ctx.beginPath();
  ctx.moveTo(w * 0.48, h * (0.16 + lift));
  ctx.quadraticCurveTo(
    w * 0.32,
    h * (ap ? 0.145 : 0.205),
    w * 0.15,
    h * (ap ? 0.15 : 0.185),
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * (0.155 + lift));
  ctx.quadraticCurveTo(
    w * 0.68,
    h * (ap ? 0.14 : 0.2),
    w * 0.85,
    h * (ap ? 0.148 : 0.18),
  );
  ctx.stroke();
  ctx.restore();
}

function drawScapulae(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(210,210,210,0.33)";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.24);
  ctx.quadraticCurveTo(w * 0.15, h * 0.42, w * 0.2, h * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.8, h * 0.24);
  ctx.quadraticCurveTo(w * 0.85, h * 0.42, w * 0.8, h * 0.6);
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const p = new Path2D();
  p.moveTo(w * 0.47, h * 0.36);
  p.bezierCurveTo(w * 0.4, h * 0.43, w * 0.415, h * 0.56, w * 0.455, h * 0.65);
  p.bezierCurveTo(w * 0.52, h * 0.75, w * 0.66, h * 0.735, w * 0.735, h * 0.6);
  p.bezierCurveTo(w * 0.8, h * 0.48, w * 0.74, h * 0.34, w * 0.62, h * 0.315);
  p.bezierCurveTo(w * 0.55, h * 0.3, w * 0.5, h * 0.31, w * 0.47, h * 0.36);
  p.closePath();
  const g = ctx.createRadialGradient(w * 0.58, h * 0.5, 8, w * 0.58, h * 0.5, w * 0.2);
  g.addColorStop(0, "rgba(176,176,176,0.94)");
  g.addColorStop(1, "rgba(128,128,128,0.9)");
  ctx.fillStyle = g;
  ctx.fill(p);

  ctx.beginPath();
  ctx.ellipse(w * 0.57, h * 0.33, w * 0.026, h * 0.018, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(186,186,186,0.55)";
  ctx.fill();
}

function drawSpine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(w * 0.455, 0, w * 0.545, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.35, "rgba(255,255,255,0.16)");
  g.addColorStop(0.5, "rgba(255,255,255,0.42)");
  g.addColorStop(0.65, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(w * 0.455, h * 0.12, w * 0.09, h * 0.78);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = 0; i < 12; i += 1) {
    const y = h * (0.18 + i * 0.055);
    ctx.fillRect(w * 0.478, y, w * 0.044, h * 0.02);
  }
  ctx.restore();
}

function drawTrachea(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(8,8,8,0.82)";
  ctx.lineWidth = Math.max(4, w * 0.016);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.045);
  ctx.lineTo(w * 0.492, h * 0.3);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.beginPath();
  ctx.moveTo(w * 0.492, h * 0.29);
  ctx.lineTo(w * 0.44, h * 0.36);
  ctx.moveTo(w * 0.492, h * 0.29);
  ctx.lineTo(w * 0.56, h * 0.35);
  ctx.stroke();
  ctx.restore();
}

function strokeDiaphragms(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(236,236,236,0.8)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.7);
  ctx.quadraticCurveTo(w * 0.28, h * 0.69, w * 0.17, h * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.58, h * 0.745);
  ctx.quadraticCurveTo(w * 0.7, h * 0.8, w * 0.84, h * 0.845);
  ctx.stroke();
  ctx.restore();
}

function drawAbdomenDetails(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = "#0c0c0c";
  ctx.beginPath();
  ctx.ellipse(w * 0.7, h * 0.9, w * 0.045, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintLateral(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#686868";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.3, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#121212";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.47, w * 0.2, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const rng = mulberry32(31);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.47, w * 0.2, h * 0.28, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(180,180,180,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w * 0.48, h * 0.42);
    ctx.lineTo(w * (0.32 + rng() * 0.38), h * (0.28 + rng() * 0.4));
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#dedede";
  ctx.fillRect(w * 0.68, h * 0.14, w * 0.05, h * 0.68);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 11; i += 1) {
    ctx.fillRect(w * 0.675, h * (0.18 + i * 0.055), w * 0.06, h * 0.016);
  }

  ctx.fillStyle = "#ececec";
  ctx.fillRect(w * 0.25, h * 0.2, w * 0.018, h * 0.4);

  ctx.strokeStyle = "rgba(230,230,230,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      w * 0.5,
      h * (0.24 + i * 0.055),
      w * 0.2,
      h * 0.035,
      0,
      Math.PI * 1.05,
      Math.PI * 1.95,
    );
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(150,150,150,0.92)";
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.58, w * 0.1, h * 0.1, -0.45, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(w * 0.4, h * 0.68, 4, w * 0.4, h * 0.68, w * 0.08);
  g.addColorStop(0, "rgba(200,200,200,0.35)");
  g.addColorStop(1, "rgba(200,200,200,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w * 0.4, h * 0.68, w * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(236,236,236,0.85)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.7);
  ctx.quadraticCurveTo(w * 0.48, h * 0.8, w * 0.7, h * 0.66);
  ctx.stroke();

  ctx.fillStyle = "#0c0c0c";
  ctx.beginPath();
  ctx.ellipse(w * 0.36, h * 0.78, w * 0.04, h * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeadMarker(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
): void {
  const x = w * 0.092;
  const y = h * 0.128;
  const bw = w * 0.062;
  const bh = h * 0.034;
  ctx.fillStyle = "#f3f3f3";
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = "#111111";
  ctx.font = `700 ${Math.round(h * 0.02)}px ui-monospace, monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + bw * 0.16, y + bh * 0.52);
}

export function markerSide(beam: BeamGeometry): "DX" | "SX" {
  return beam === "LL" ? "SX" : "DX";
}
