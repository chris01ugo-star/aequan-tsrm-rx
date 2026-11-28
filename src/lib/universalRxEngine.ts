/**
 * Motore fisico per una radiografia 2D già acquisita.
 * Linearizza la lastra, separa osso e tessuti molli, poi riapplica
 * kVp, fluenza, scatter, griglia, penombra, rumore e collimazione.
 * Se WebGL2 manca, la stessa formula gira su Canvas 2D / CPU.
 */

import { presetById, presetDrlDGyCm2, type AnatomyPreset } from "@/data/anatomyPresets";
import { stampUnremovedMetal } from "@/lib/foreignMetal";
import { getActiveSet, getEngineMode, plateForProjection, sourceLabel, type PlatePixels } from "@/lib/imageStore";
import { deviationIndex, EI_TARGET, exposureTimeMs } from "@/lib/rxPhysics";
import { anodeHeelAmplitude, buckyFactor, gridCutoff, oidCm, toRoomGeometry } from "@/lib/rxGeometry";
import type { Dosimetry, GridMode, LatentImage, Technique } from "@/types/rx";

const OUT = 512;
const FIELD_CM = 43;

export type PlateExposure = {
  technique: Technique;
  latent: LatentImage;
  dosimetry: Dosimetry;
  sourceLabel: string;
  drlDapDGyCm2: number;
};

type Engine = {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  texture: WebGLTexture;
  loc: Record<string, WebGLUniformLocation | null>;
};

let engine: Engine | null = null;
let unavailable = false;

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPlate;
uniform vec2 uImg;
uniform vec2 uShift;
uniform float uScale;
uniform float uRot;
uniform vec2 uShear;
uniform float uKvp;
uniform float uRefKv;
uniform float uArtifact;
out vec4 outColor;

vec4 pack(float v) {
  vec4 bit = vec4(1.0, 255.0, 65025.0, 16581375.0);
  vec4 enc = fract(bit * clamp(v, 0.0, 1.0));
  enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
  return enc;
}

float sampleGray(vec2 uv) {
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture(uPlate, vec2(uv.x, 1.0 - uv.y)).r;
}

float attenuate(vec2 uv) {
  float a = sampleGray(uv);
  vec2 t = 1.0 / max(uImg, vec2(1.0));
  float gx = sampleGray(uv + vec2(t.x, 0.0)) - sampleGray(uv - vec2(t.x, 0.0));
  float gy = sampleGray(uv + vec2(0.0, t.y)) - sampleGray(uv - vec2(0.0, t.y));
  float grad = length(vec2(gx, gy));
  float cortical = smoothstep(0.38, 0.78, a) * smoothstep(0.012, 0.11, grad);
  float dense = smoothstep(0.72, 0.94, a);
  float wBone = clamp(max(cortical, dense), 0.0, 1.0);
  float wSoft = clamp(a * (1.0 - wBone), 0.0, 1.0);
  if (uArtifact > 0.5 && uArtifact < 1.5) {
    vec2 m = uv - vec2(0.66, 0.38);
    float bead = smoothstep(0.05, 0.012, length(m));
    float chain = smoothstep(0.014, 0.0, abs(m.y)) * step(abs(m.x), 0.09);
    float halo = smoothstep(0.09, 0.03, length(m));
    wBone = max(wBone, clamp(bead + chain, 0.0, 1.0));
    wSoft = max(wSoft, halo * 0.35);
  }
  if (uArtifact > 2.5) {
    float ghost = sampleGray(uv + vec2(0.08, -0.045));
    wSoft = max(wSoft, ghost * 0.55);
    wBone = max(wBone, smoothstep(0.7, 0.92, ghost) * 0.65);
  }
  float pe = pow(max(uRefKv, 40.0) / max(uKvp, 40.0), 2.6);
  return wSoft * 0.85 + wBone * 1.85 * pe;
}

void main() {
  vec2 det = gl_FragCoord.xy / vec2(${OUT}.0);
  vec2 p = det - 0.5;
  float c = cos(uRot);
  float s = sin(uRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  p.x += uShear.x * p.y;
  p.y += uShear.y * p.x;
  p = p / max(uScale, 0.35) - uShift;
  vec2 uv = p + 0.5;
  float aspect = uImg.x / max(uImg.y, 1.0);
  if (aspect > 1.0) uv.y = (uv.y - 0.5) * aspect + 0.5;
  else uv.x = (uv.x - 0.5) / max(aspect, 0.01) + 0.5;
  float tau = attenuate(uv);
  if (uArtifact > 1.5 && uArtifact < 2.5) {
    float lines = 0.5 + 0.5 * sin(det.y * 420.0);
    tau += lines * 0.28 * step(0.08, tau);
  }
  outColor = pack(exp(-tau));
}`;

function gridGain(mode: GridMode): number {
  if (mode === "none") return 2.15;
  if (mode === "focused_100") return 1.15;
  return 1;
}

function artifactId(id: string): number {
  if (id === "metal_foreign_body") return 1;
  if (id === "grid_lines_moire") return 2;
  if (id === "double_exposure") return 3;
  return 0;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader 2D non creato");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  }
  return shader;
}

function ensure(): Engine | null {
  if (unavailable || typeof document === "undefined") return null;
  if (engine && !engine.gl.isContextLost()) return engine;
  disposeUniversalEngine();
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    unavailable = true;
    return null;
  }
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!program) throw new Error("Programma 2D non creato");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
    const vao = gl.createVertexArray();
    const texture = gl.createTexture();
    if (!vao || !texture) throw new Error("Risorse WebGL 2D assenti");
    const names = ["uPlate", "uImg", "uShift", "uScale", "uRot", "uShear", "uKvp", "uRefKv", "uArtifact"];
    const loc: Engine["loc"] = {};
    for (const name of names) loc[name] = gl.getUniformLocation(program, name);
    engine = { canvas, gl, program, vao, texture, loc };
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      engine = null;
    });
    return engine;
  } catch {
    unavailable = true;
    disposeUniversalEngine();
    return null;
  }
}

export function disposeUniversalEngine(): void {
  if (!engine) return;
  engine.gl.deleteProgram(engine.program);
  engine.gl.deleteTexture(engine.texture);
  engine.gl.deleteVertexArray(engine.vao);
  engine = null;
}

function unpack(packed: Uint8Array): Float32Array<ArrayBufferLike> {
  const transmission = new Float32Array(OUT * OUT);
  for (let y = 0; y < OUT; y += 1) {
    const src = (OUT - 1 - y) * OUT;
    const dst = y * OUT;
    for (let x = 0; x < OUT; x += 1) {
      const o = (src + x) * 4;
      transmission[dst + x] =
        packed[o] / 255 + packed[o + 1] / 255 / 255 + packed[o + 2] / 65025 + packed[o + 3] / 16581375;
    }
  }
  return transmission;
}

function shadeGpu(
  plate: PlatePixels,
  gray: Uint8Array,
  technique: Technique,
  preset: AnatomyPreset,
  artifact: number,
): Float32Array<ArrayBufferLike> | null {
  const current = ensure();
  if (!current) return null;
  const { gl, program, loc, vao, texture } = current;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, plate.width, plate.height, 0, gl.RED, gl.UNSIGNED_BYTE, gray);
  const state = toRoomGeometry(technique);
  const oid = Math.max(1.2, preset.thicknessCm * 0.45);
  const mag = state.sidCm / Math.max(8, state.sidCm - oid);
  const magRef = preset.refSidCm / Math.max(8, preset.refSidCm - preset.thicknessCm * 0.45);
  gl.viewport(0, 0, OUT, OUT);
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(loc.uPlate, 0);
  gl.uniform2f(loc.uImg, plate.width, plate.height);
  gl.uniform2f(loc.uShift, technique.centeringOffsetXCm / FIELD_CM, -technique.centeringOffsetYCm / FIELD_CM);
  gl.uniform1f(loc.uScale, mag / magRef);
  gl.uniform1f(loc.uRot, (technique.patientRotationDeg * Math.PI) / 180 * 0.35);
  gl.uniform2f(loc.uShear, technique.tubeAngulationMLDeg * 0.004, -technique.tubeAngulationCCDeg * 0.004);
  gl.uniform1f(loc.uKvp, technique.kvp);
  gl.uniform1f(loc.uRefKv, preset.refKv);
  gl.uniform1f(loc.uArtifact, artifact);
  gl.getError();
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (gl.getError() !== gl.NO_ERROR) return null;
  const packed = new Uint8Array(OUT * OUT * 4);
  gl.readPixels(0, 0, OUT, OUT, gl.RGBA, gl.UNSIGNED_BYTE, packed);
  return unpack(packed);
}

function sampleGray(plate: Uint8Array, width: number, height: number, u: number, v: number): number {
  if (u < 0 || v < 0 || u > 1 || v > 1) return 0;
  const x = Math.min(width - 1, Math.max(0, (u * (width - 1)) | 0));
  const y = Math.min(height - 1, Math.max(0, ((1 - v) * (height - 1)) | 0));
  return plate[y * width + x] / 255;
}

function shadeCpu(
  plate: PlatePixels,
  gray: Uint8Array,
  technique: Technique,
  preset: AnatomyPreset,
  artifact: number,
): Float32Array<ArrayBufferLike> {
  const state = toRoomGeometry(technique);
  const oid = Math.max(1.2, preset.thicknessCm * 0.45);
  const scale =
    state.sidCm /
    Math.max(8, state.sidCm - oid) /
    (preset.refSidCm / Math.max(8, preset.refSidCm - preset.thicknessCm * 0.45));
  const rot = (technique.patientRotationDeg * Math.PI) / 180 * 0.35;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const shiftX = technique.centeringOffsetXCm / FIELD_CM;
  const shiftY = -technique.centeringOffsetYCm / FIELD_CM;
  const shearX = technique.tubeAngulationMLDeg * 0.004;
  const shearY = -technique.tubeAngulationCCDeg * 0.004;
  const pe = (Math.max(preset.refKv, 40) / Math.max(technique.kvp, 40)) ** 2.6;
  const aspect = plate.width / plate.height;
  const out = new Float32Array(OUT * OUT);
  for (let y = 0; y < OUT; y += 1) {
    for (let x = 0; x < OUT; x += 1) {
      let px = x / OUT - 0.5;
      let py = (OUT - 1 - y) / OUT - 0.5;
      const rx = c * px - s * py;
      const ry = s * px + c * py;
      px = rx + shearX * ry;
      py = ry + shearY * rx;
      px = px / Math.max(scale, 0.35) - shiftX;
      py = py / Math.max(scale, 0.35) - shiftY;
      let u = px + 0.5;
      let v = py + 0.5;
      if (aspect > 1) v = (v - 0.5) * aspect + 0.5;
      else u = (u - 0.5) / Math.max(aspect, 0.01) + 0.5;
      const a = sampleGray(gray, plate.width, plate.height, u, v);
      const gx = sampleGray(gray, plate.width, plate.height, u + 1 / plate.width, v) - a;
      const gy = sampleGray(gray, plate.width, plate.height, u, v + 1 / plate.height) - a;
      const grad = Math.hypot(gx, gy);
      const cortical = smooth(0.38, 0.78, a) * smooth(0.012, 0.11, grad);
      const dense = smooth(0.72, 0.94, a);
      let wBone = Math.min(1, Math.max(cortical, dense));
      let wSoft = Math.min(1, Math.max(0, a * (1 - wBone)));
      if (artifact === 1) {
        const mx = u - 0.66;
        const my = v - 0.38;
        const dist = Math.hypot(mx, my);
        const bead = smooth(0.05, 0.012, dist);
        const chain = smooth(0.014, 0, Math.abs(my)) * (Math.abs(mx) < 0.09 ? 1 : 0);
        wBone = Math.max(wBone, Math.min(1, bead + chain));
        wSoft = Math.max(wSoft, smooth(0.09, 0.03, dist) * 0.35);
      }
      if (artifact === 3) {
        const ghost = sampleGray(gray, plate.width, plate.height, u + 0.08, v - 0.045);
        wSoft = Math.max(wSoft, ghost * 0.55);
        wBone = Math.max(wBone, smooth(0.7, 0.92, ghost) * 0.65);
      }
      let tau = wSoft * 0.85 + wBone * 1.85 * pe;
      if (artifact === 2) {
        const lines = 0.5 + 0.5 * Math.sin(((OUT - 1 - y) / OUT) * 420);
        if (tau > 0.08) tau += lines * 0.28;
      }
      out[y * OUT + x] = Math.exp(-tau);
    }
  }
  return out;
}

function smooth(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

function grayFor(plate: PlatePixels, invert: boolean): Uint8Array {
  if (!invert) return plate.raw;
  const gray = new Uint8Array(plate.raw.length);
  for (let i = 0; i < gray.length; i += 1) gray[i] = 255 - plate.raw[i];
  return gray;
}

function fluenceScale(technique: Technique, preset: AnatomyPreset, cutoff: number): number {
  const distance = (preset.refSidCm / technique.dff) ** 2;
  const kvp = (technique.kvp / preset.refKv) ** 3.2;
  const grid = gridGain(technique.gridMode) / gridGain(preset.gridMode);
  return (technique.mas / preset.refMas) * distance * kvp * grid * (1 - 0.12 * cutoff);
}

function chamberLoad(transmission: Float32Array<ArrayBufferLike>, technique: Technique): number {
  const boxes = [
    technique.aecChambers.right ? { x: -9, y: 3 } : null,
    technique.aecChambers.center ? { x: 0, y: 7.5 } : null,
    technique.aecChambers.left ? { x: 9, y: 3 } : null,
  ].filter((item): item is { x: number; y: number } => item !== null);
  if (boxes.length === 0) return 1;
  const loads: number[] = [];
  let field = 0;
  let fieldN = 0;
  for (let i = 0; i < transmission.length; i += 8) {
    const tau = -Math.log(Math.max(transmission[i], 1e-4));
    if (tau > 0.08) {
      field += tau;
      fieldN += 1;
    }
  }
  const fieldTau = fieldN > 0 ? field / fieldN : 0.4;
  for (const box of boxes) {
    const cx = ((0.5 + box.x / FIELD_CM) * OUT) | 0;
    const cy = ((0.5 + box.y / FIELD_CM) * OUT) | 0;
    const hw = ((6.2 / FIELD_CM) * OUT) / 2;
    const hh = ((10.4 / FIELD_CM) * OUT) / 2;
    let sum = 0;
    let n = 0;
    for (let y = Math.max(0, cy - hh); y < Math.min(OUT, cy + hh); y += 2) {
      for (let x = Math.max(0, cx - hw); x < Math.min(OUT, cx + hw); x += 2) {
        sum += -Math.log(Math.max(transmission[(y | 0) * OUT + (x | 0)], 1e-4));
        n += 1;
      }
    }
    const tau = n > 0 ? sum / n : 0.05;
    loads.push(Math.min(4.2, Math.max(0.28, tau / Math.max(fieldTau, 0.08))));
  }
  return loads.reduce((sum, value) => sum + value, 0) / loads.length;
}

function terminatedMas(technique: Technique, preset: AnatomyPreset, transmission: Float32Array<ArrayBufferLike>, cutoff: number): number {
  const probe = { ...technique, mas: preset.refMas };
  const scale = Math.max(0.05, fluenceScale(probe, preset, cutoff));
  const density = 1.25 ** technique.aecDensityStep;
  const mas = (preset.refMas * chamberLoad(transmission, technique) * density) / scale;
  return Math.round(Math.min(80, Math.max(0.5, mas)) * 10) / 10;
}

function blurSeparable(src: Float32Array<ArrayBufferLike>, radius: number, verticalOnly: boolean): Float32Array<ArrayBufferLike> {
  const r = Math.max(1, Math.min(16, Math.round(radius)));
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  for (let y = 0; y < OUT; y += 1) {
    const row = y * OUT;
    for (let x = 0; x < OUT; x += 1) {
      let sum = 0;
      let n = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(OUT - 1, x + r);
      for (let xx = x0; xx <= x1; xx += 1) {
        sum += src[row + xx];
        n += 1;
      }
      tmp[row + x] = sum / n;
    }
  }
  const vr = verticalOnly ? r : Math.max(1, Math.round(r * 0.7));
  for (let y = 0; y < OUT; y += 1) {
    const y0 = Math.max(0, y - vr);
    const y1 = Math.min(OUT - 1, y + vr);
    for (let x = 0; x < OUT; x += 1) {
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy <= y1; yy += 1) {
        sum += tmp[yy * OUT + x];
        n += 1;
      }
      dst[y * OUT + x] = sum / n;
    }
  }
  return dst;
}

function grain(index: number, seed: number): number {
  let n = (index + 1) ^ seed;
  let sum = 0;
  for (let k = 0; k < 4; k += 1) {
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n ^= seed + k * 17;
    sum += (n & 255) / 255;
  }
  return sum - 2;
}

const GLYPH: Record<"D" | "X" | "S", number[]> = {
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
};

function stampMarker(pixels: Float32Array, shutter: Uint8Array, side: "DX" | "SX", collW: number, collH: number) {
  const letters = side === "DX" ? (["D", "X"] as const) : (["S", "X"] as const);
  const scale = 3;
  const glyphW = 5 * scale;
  const bw = glyphW * 2 + 10;
  const bh = 7 * scale + 6;
  const fieldLeft = ((1 - collW / FIELD_CM) / 2) * OUT;
  const fieldTop = ((1 - collH / FIELD_CM) / 2) * OUT;
  const x0 = Math.round(side === "DX" ? fieldLeft + 8 : OUT - fieldLeft - bw - 8);
  const y0 = Math.round(fieldTop + 8);
  for (let y = 0; y < bh; y += 1) {
    for (let x = 0; x < bw; x += 1) {
      const px = x0 + x;
      const py = y0 + y;
      if (px < 0 || py < 0 || px >= OUT || py >= OUT) continue;
      const i = py * OUT + px;
      if (shutter[i] === 0) continue;
      pixels[i] = 3980;
    }
  }
  letters.forEach((letter, index) => {
    const rows = GLYPH[letter];
    const ox = x0 + 4 + index * (glyphW + 2);
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (((rows[row] >> (4 - col)) & 1) === 0) continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const px = ox + col * scale + sx;
            const py = y0 + 3 + row * scale + sy;
            if (px < 0 || py < 0 || px >= OUT || py >= OUT) continue;
            const i = py * OUT + px;
            if (shutter[i] === 0) continue;
            pixels[i] = 360;
          }
        }
      }
    }
  });
}

function dosimetryOf(technique: Technique, preset: AnatomyPreset, cutoff: number): Dosimetry {
  const relDose = (technique.mas / preset.refMas) * (technique.kvp / preset.refKv) ** 4.5 * (preset.refSidCm / technique.dff) ** 2;
  const areaCm2 = technique.collW * technique.collH;
  const refDap = presetDrlDGyCm2(preset) * 0.45;
  const dapDGyCm2 = refDap * relDose * (areaCm2 / (FIELD_CM * FIELD_CM));
  const airKermaMgy = (dapDGyCm2 * 100) / Math.max(areaCm2, 1);
  const relativeExposure = Math.max(0.02, fluenceScale(technique, preset, cutoff));
  const ei = relativeExposure * EI_TARGET;
  const state = toRoomGeometry(technique);
  return {
    airKermaMgy,
    esdMgy: airKermaMgy * 1.32,
    dapDGyCm2,
    ei,
    eiTarget: EI_TARGET,
    di: deviationIndex(ei),
    exposureTimeMs: exposureTimeMs(technique),
    buckyFactor: buckyFactor(technique.gridMode),
    gridCutoff: cutoff,
    anodeHeel: anodeHeelAmplitude(state),
    relativeExposure,
    quanta: relativeExposure,
    areaCm2,
    bsf: 1.32,
  };
}

function activePreset(): AnatomyPreset | null {
  if (getEngineMode() !== "plate") return null;
  const set = getActiveSet();
  if (!set) return null;
  const base = presetById(set.presetId);
  return {
    ...base,
    refKv: set.refKv,
    refMas: set.refMas,
    refSidCm: set.refSidCm,
    thicknessCm: set.thicknessCm,
  };
}

/**
 * Espone la lastra caricata. Ritorna null se il motore 2D non è armato:
 * il chiamante resta sul DRR volumetrico.
 */
export function renderPlateExposure(
  technique: Technique,
  seed: number,
  unremovedMetalArtifact = false,
): PlateExposure | null {
  if (getEngineMode() !== "plate") return null;
  const plate = plateForProjection(technique.projection);
  if (!plate) return null;
  return renderWith(technique, seed, plate, unremovedMetalArtifact);
}

function renderWith(
  technique: Technique,
  seed: number,
  plate: PlatePixels,
  unremovedMetalArtifact = false,
): PlateExposure | null {
  const preset = activePreset();
  const set = getActiveSet();
  if (!preset || !set) return null;
  const gray = grayFor(plate, set.invertSource);
  const artifact = artifactId(set.artifactPreset);
  const transmission = shadeGpu(plate, gray, technique, preset, artifact) ?? shadeCpu(plate, gray, technique, preset, artifact);
  const cutoff = gridCutoff(toRoomGeometry(technique)).factor;
  const delivered =
    technique.exposureMode === "aec"
      ? { ...technique, mas: terminatedMas(technique, preset, transmission, cutoff) }
      : technique;
  const fluence = Math.max(0.05, fluenceScale(delivered, preset, cutoff));
  const heel = Math.min(0.18, anodeHeelAmplitude(toRoomGeometry(delivered)));
  const state = toRoomGeometry(delivered);
  const scatterK = Math.min(0.55, (0.22 + delivered.kvp / 320) * (preset.thicknessCm / 22));
  const scatter =
    delivered.gridMode === "none" ? scatterK : delivered.gridMode === "focused_100" ? scatterK * 0.42 : scatterK * 0.22;
  let signal: Float32Array<ArrayBufferLike> = new Float32Array(transmission.length);
  for (let i = 0; i < transmission.length; i += 1) {
    const y = (i / OUT) | 0;
    const gain = 1 - heel * (0.5 - y / OUT);
    signal[i] = transmission[i] * fluence * gain;
  }
  const blurred = blurSeparable(signal, 2 + preset.thicknessCm / 5, false);
  for (let i = 0; i < signal.length; i += 1) signal[i] = signal[i] * (1 - scatter) + blurred[i] * scatter;
  const cut = gridCutoff(state);
  if (cut.factor > 0.02) {
    for (let y = 0; y < OUT; y += 1) {
      for (let x = 0; x < OUT; x += 1) {
        const nx = x / (OUT - 1);
        const edge = Math.max(0, Math.abs(nx - 0.5) - 0.28) / 0.22;
        const side = nx < 0.5 ? 1 - cut.asymmetry : 1 + cut.asymmetry;
        const fall = Math.min(1, edge * edge) * cut.factor * Math.max(0.25, side);
        signal[y * OUT + x] *= 1 - Math.min(0.92, fall);
      }
    }
  }
  const ugPx = Math.min(2.4, (state.focalSpot === "broad" ? 1.2 : 0.6) * (oidCm(state) / Math.max(20, state.sidCm - oidCm(state))) * 18);
  if (ugPx >= 0.45) signal = blurSeparable(signal, ugPx, false);
  if (delivered.respiration === "LIBERO") {
    const motion = Math.min(7, 1.2 + exposureTimeMs(delivered) / 14);
    const vertical = blurSeparable(signal, motion, true);
    for (let i = 0; i < signal.length; i += 1) signal[i] = signal[i] * 0.35 + vertical[i] * 0.65;
  }
  const rng = seed >>> 0 || 1;
  for (let i = 0; i < signal.length; i += 1) {
    const intensity = Math.max(signal[i], 1e-4);
    const sigma = (0.07 / Math.sqrt(fluence)) * Math.sqrt(intensity);
    signal[i] = Math.max(0, intensity + grain(i, rng) * sigma);
  }
  const pixels = new Float32Array(OUT * OUT);
  const shutter = new Uint8Array(OUT * OUT);
  const halfW = (delivered.collW / FIELD_CM) * 0.5 * OUT;
  const halfH = (delivered.collH / FIELD_CM) * 0.5 * OUT;
  const penumbra = 2.2;
  for (let y = 0; y < OUT; y += 1) {
    for (let x = 0; x < OUT; x += 1) {
      const i = y * OUT + x;
      const outside = Math.max(Math.abs(x - OUT / 2) - halfW, Math.abs(y - OUT / 2) - halfH);
      if (outside > penumbra) {
        shutter[i] = 0;
        pixels[i] = 0;
        continue;
      }
      shutter[i] = 1;
      const edge = outside > 0 ? 1 - outside / penumbra : 1;
      const norm = (signal[i] * edge) / fluence;
      const film = norm / (norm + 0.11);
      let mono = (1 - film) * 4095;
      if (fluence > 4) {
        const wash = Math.min(0.34, (fluence - 4) / 30);
        mono = mono * (1 - wash) + 2050 * wash;
      }
      pixels[i] = Math.max(0, Math.min(4095, mono));
    }
  }
  if (delivered.markerSide === "DX" || delivered.markerSide === "SX") {
    stampMarker(pixels, shutter, delivered.markerSide, delivered.collW, delivered.collH);
  }
  if (unremovedMetalArtifact) stampUnremovedMetal(pixels, shutter, OUT, OUT);
  return {
    technique: delivered,
    latent: { width: OUT, height: OUT, pixels, shutter },
    dosimetry: dosimetryOf(delivered, preset, cut.factor),
    sourceLabel: sourceLabel(),
    drlDapDGyCm2: presetDrlDGyCm2(preset),
  };
}
