/**
 * DRR conico WebGL2. Un solo contesto offscreen, riusato per ogni scatto.
 * Se WebGL2 non c'è, il chiamante torna al renderer procedurale.
 */

import { getThoraxCtVolume, type CtVolumeDescriptor } from "@/lib/ctVolume";
import { oidCm, toRoomGeometry } from "@/lib/rxGeometry";
import type { LatentImage, Technique } from "@/types/rx";

export const DRR_SIZE = 512;
const STEPS = 156;

export type DrrExposure = {
  /** Fluenza relativa al detettore. 1 = tecnica di riferimento. */
  fluence: number;
  exposureTimeMs: number;
  ugMm: number;
  gridCutoff: number;
  gridAsymmetry: number;
  anodeHeel: number;
};

type Engine = {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  texture: WebGLTexture;
  volumeId: string;
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
precision highp sampler3D;

uniform sampler3D uVolume;
uniform float uSid;
uniform float uOid;
uniform float uRot;
uniform float uCc;
uniform float uMl;
uniform vec2 uCenter;
uniform float uProj;
uniform vec3 uOrigin;
uniform vec3 uSize;
uniform float uKvp;
uniform float uInsp;
uniform float uRolled;
uniform float uSeed;

out vec4 outColor;

vec4 pack(float v) {
  vec4 bit = vec4(1.0, 255.0, 65025.0, 16581375.0);
  vec4 enc = fract(bit * clamp(v, 0.0, 1.0));
  enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
  return enc;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453);
}

vec3 beamToPatient(vec3 b) {
  vec3 q = vec3(b.x - uCenter.x, b.y + uCenter.y, b.z - uOid);
  float c = cos(uRot);
  float s = sin(uRot);
  q = vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z);
  if (uProj < 0.5) return vec3(q.x, q.y, -q.z);
  if (uProj < 1.5) return vec3(q.x, q.y, q.z);
  return vec3(-q.z, q.y, -q.x);
}

float scapula(vec3 p) {
  float ax = abs(p.x);
  float lateral = mix(8.6, 15.2, uRolled);
  float zc = mix(-5.4, 4.2, uRolled);
  float dx = (ax - lateral) / 3.4;
  float dy = (p.y - 7.6) / 6.2;
  float dz = (p.z - zc) / 0.42;
  float q = dx * dx + dy * dy + dz * dz;
  if (q > 1.0 || p.y < 1.2 || p.y > 14.5) return 0.0;
  return 1.0 - q;
}

float muOf(vec3 p) {
  vec3 uv = (p - uOrigin) / uSize;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0) * step(0.0, uv.z) * step(uv.z, 1.0);
  float stored = texture(uVolume, clamp(uv, 0.0, 1.0)).r * 2048.0 - 1024.0;
  float dome = (p.x < 0.0 ? -6.2 : -7.8) - (uInsp - 0.65) * 7.2 + p.x * p.x * 0.01;
  float lungish = 1.0 - smoothstep(-860.0, -420.0, stored);
  if (lungish > 0.45 && p.y < dome && abs(p.x) < 13.0) {
    stored = 40.0;
    lungish = 0.0;
  }
  if (p.y > dome && p.y < dome + 2.4 && abs(p.x) > 3.0 && abs(p.x) < 12.5 && p.z > -3.0 && stored > -200.0) {
    stored = mix(-780.0, -650.0, uInsp);
    lungish = 1.0;
  }
  if (lungish > 0.5) stored -= (uInsp - 0.5) * 160.0;

  float boneW = smoothstep(180.0, 720.0, stored);
  float scap = scapula(p);
  boneW = max(boneW, scap);
  float density = clamp((stored + 1000.0) / 1000.0, 0.0, 1.12);
  density *= 1.0 - boneW;
  float E = max(28.0, uKvp * 0.40 + 12.0);
  float pe = pow(56.0 / E, 3.0);
  float mu = density * (0.155 + 0.045 * pe) + boneW * (0.20 + 0.72 * pe);
  if (lungish > 0.5) mu *= mix(1.28, 0.82, uInsp);
  if (uInsp < 0.5) {
    float hx = (p.x - 3.2) / 6.4;
    float hy = (p.y + 1.0) / 6.8;
    float hz = (p.z - 3.0) / 4.6;
    float heart = hx * hx + hy * hy + hz * hz;
    if (heart < 1.0) mu += (0.5 - uInsp) * 0.22;
  }
  return mu * inside;
}

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(${DRR_SIZE}.0);
  vec3 det = vec3((uv.x - 0.5) * 43.0, (uv.y - 0.5) * 43.0, 0.0);
  vec3 source = vec3(-tan(uMl) * uSid, -tan(uCc) * uSid, uSid);
  vec3 ro = beamToPatient(source);
  vec3 rd = beamToPatient(det) - ro;
  float len = length(rd);
  rd = len > 0.001 ? rd / len : vec3(0.0, 0.0, 1.0);
  vec3 bmin = uOrigin;
  vec3 bmax = uOrigin + uSize;
  vec3 inv = 1.0 / (rd + vec3(1e-5));
  vec3 t0 = (bmin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tsm = min(t0, t1);
  vec3 tbg = max(t0, t1);
  float tN = max(max(tsm.x, tsm.y), tsm.z);
  float tF = min(min(tbg.x, tbg.y), tbg.z);
  float hit = tF > max(tN, 0.0) ? 1.0 : 0.0;
  float t = max(tN, 0.0);
  float stepLen = max((tF - t) / float(${STEPS - 1}), 0.08);
  t += hash(gl_FragCoord.xy) * stepLen;
  float tau = 0.0;
  for (int i = 0; i < ${STEPS}; i++) {
    float live = hit * step(t, tF);
    tau += muOf(ro + rd * t) * stepLen * live;
    t += stepLen;
  }
  outColor = pack(exp(-tau));
}`;

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

function blurSeparable(
  src: Float32Array,
  size: number,
  radius: number,
  verticalOnly: boolean,
): Float32Array {
  const r = Math.max(1, Math.min(18, Math.round(radius)));
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  for (let y = 0; y < size; y += 1) {
    const row = y * size;
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      let n = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(size - 1, x + r);
      for (let xx = x0; xx <= x1; xx += 1) {
        sum += src[row + xx];
        n += 1;
      }
      tmp[row + x] = sum / n;
    }
  }
  const vr = verticalOnly ? r : Math.max(1, Math.round(r * 0.65));
  for (let y = 0; y < size; y += 1) {
    const y0 = Math.max(0, y - vr);
    const y1 = Math.min(size - 1, y + vr);
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy <= y1; yy += 1) {
        sum += tmp[yy * size + x];
        n += 1;
      }
      dst[y * size + x] = sum / n;
    }
  }
  return dst;
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
  const gap = 2;
  const bw = glyphW * 2 + gap + 8;
  const bh = 7 * scale + 6;
  const margin = 8;
  const fieldLeft = ((1 - collW / 43) / 2) * DRR_SIZE;
  const fieldTop = ((1 - collH / 43) / 2) * DRR_SIZE;
  const fieldRight = DRR_SIZE - fieldLeft;
  const x0 = Math.round(side === "DX" ? fieldLeft + margin : fieldRight - bw - margin);
  const y0 = Math.round(fieldTop + margin);
  for (let y = 0; y < bh; y += 1) {
    for (let x = 0; x < bw; x += 1) {
      const px = x0 + x;
      const py = y0 + y;
      if (px < 0 || py < 0 || px >= DRR_SIZE || py >= DRR_SIZE) continue;
      const i = py * DRR_SIZE + px;
      if (shutter[i] === 0) continue;
      pixels[i] = 3980;
    }
  }
  letters.forEach((letter, index) => {
    const rows = GLYPH[letter];
    const ox = x0 + 4 + index * (glyphW + gap);
    const oy = y0 + 3;
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (((rows[row] >> (4 - col)) & 1) === 0) continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const px = ox + col * scale + sx;
            const py = oy + row * scale + sy;
            if (px < 0 || py < 0 || px >= DRR_SIZE || py >= DRR_SIZE) continue;
            const i = py * DRR_SIZE + px;
            if (shutter[i] === 0) continue;
            pixels[i] = 360;
          }
        }
      }
    }
  });
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader WebGL non creato");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function uploadVolume(gl: WebGL2RenderingContext, texture: WebGLTexture, volume: CtVolumeDescriptor) {
  const [nx, ny, nz] = volume.dims;
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, nx, ny, nz, 0, gl.RED, gl.UNSIGNED_BYTE, volume.data);
}

function ensure(volume: CtVolumeDescriptor): Engine | null {
  if (unavailable) return null;
  if (engine && engine.volumeId === volume.id && !engine.gl.isContextLost()) return engine;
  disposeDrrEngine();
  const canvas = document.createElement("canvas");
  canvas.width = DRR_SIZE;
  canvas.height = DRR_SIZE;
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  if (!gl) {
    unavailable = true;
    return null;
  }
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!program) throw new Error("Programma DRR non creato");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("VAO DRR non creato");
  const texture = gl.createTexture();
  if (!texture) throw new Error("Texture 3D non creata");
  uploadVolume(gl, texture, volume);
  const names = [
    "uVolume", "uSid", "uOid", "uRot", "uCc", "uMl", "uCenter", "uProj",
    "uOrigin", "uSize", "uKvp", "uInsp", "uRolled", "uSeed",
  ];
  const loc: Engine["loc"] = {};
  for (const name of names) loc[name] = gl.getUniformLocation(program, name);
  engine = { canvas, gl, program, vao, texture, volumeId: volume.id, loc };
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    engine = null;
  });
  return engine;
}

export function disposeDrrEngine(): void {
  if (!engine) return;
  const { gl, program, texture, vao } = engine;
  gl.deleteProgram(program);
  gl.deleteTexture(texture);
  gl.deleteVertexArray(vao);
  engine = null;
}

export function warmupDrr(): void {
  if (unavailable || typeof document === "undefined") return;
  try {
    ensure(getThoraxCtVolume());
  } catch {
    unavailable = true;
    disposeDrrEngine();
  }
}

function inspirationOf(technique: Technique): number {
  if (technique.respiration === "INSP") return 1;
  if (technique.respiration === "ESP") return 0.35;
  return 0.65;
}

function scatterWeight(technique: Technique): number {
  const k = 0.55 + technique.kvp / 280;
  if (technique.gridMode === "none") return Math.min(0.55, 0.34 * k);
  if (technique.gridMode === "focused_100") return 0.14 * k;
  return 0.07 * k;
}

/**
 * Ray-marching conico sul volume TC. Ritorna null se WebGL2 non è disponibile,
 * così il chiamante usa il renderer procedurale.
 */
export function renderDrr(technique: Technique, seed: number, exposure: DrrExposure): LatentImage | null {
  if (unavailable || typeof document === "undefined") return null;
  let current: Engine;
  try {
    const ready = ensure(getThoraxCtVolume());
    if (!ready) return null;
    current = ready;
  } catch {
    unavailable = true;
    disposeDrrEngine();
    return null;
  }

  const volume = getThoraxCtVolume();
  const state = toRoomGeometry(technique);
  const [nx, ny, nz] = volume.dims;
  const sizeCm: [number, number, number] = [
    (nx * volume.spacingMm[0]) / 10,
    (ny * volume.spacingMm[1]) / 10,
    (nz * volume.spacingMm[2]) / 10,
  ];
  const origin: [number, number, number] = [-sizeCm[0] / 2, -sizeCm[1] / 2, -sizeCm[2] / 2];
  const proj = state.projection === "LL" ? 2 : state.projection === "AP" ? 1 : 0;
  const { gl, program, loc, vao, texture } = current;

  gl.viewport(0, 0, DRR_SIZE, DRR_SIZE);
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.uniform1i(loc.uVolume, 0);
  gl.uniform1f(loc.uSid, state.sidCm);
  gl.uniform1f(loc.uOid, oidCm(state));
  gl.uniform1f(loc.uRot, (state.patientRotationDeg * Math.PI) / 180);
  gl.uniform1f(loc.uCc, (state.tubeAngulationCCDeg * Math.PI) / 180);
  gl.uniform1f(loc.uMl, (state.tubeAngulationMLDeg * Math.PI) / 180);
  gl.uniform2f(loc.uCenter, state.centeringOffsetXCm, state.centeringOffsetYCm);
  gl.uniform1f(loc.uProj, proj);
  gl.uniform3f(loc.uOrigin, origin[0], origin[1], origin[2]);
  gl.uniform3f(loc.uSize, sizeCm[0], sizeCm[1], sizeCm[2]);
  gl.uniform1f(loc.uKvp, technique.kvp);
  gl.uniform1f(loc.uInsp, inspirationOf(technique));
  gl.uniform1f(loc.uRolled, state.shouldersRolledForward ? 1 : 0);
  gl.uniform1f(loc.uSeed, (seed % 997) / 997);
  gl.getError();
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  const error = gl.getError();
  if (error !== gl.NO_ERROR) return null;

  const packed = new Uint8Array(DRR_SIZE * DRR_SIZE * 4);
  gl.readPixels(0, 0, DRR_SIZE, DRR_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, packed);

  const count = DRR_SIZE * DRR_SIZE;
  const transmission = new Float32Array(count);
  for (let y = 0; y < DRR_SIZE; y += 1) {
    const srcRow = (DRR_SIZE - 1 - y) * DRR_SIZE;
    const dstRow = y * DRR_SIZE;
    for (let x = 0; x < DRR_SIZE; x += 1) {
      const o = (srcRow + x) * 4;
      const r = packed[o] / 255;
      const g = packed[o + 1] / 255;
      const b = packed[o + 2] / 255;
      const a = packed[o + 3] / 255;
      transmission[dstRow + x] = r + g / 255 + b / 65025 + a / 16581375;
    }
  }

  const fluence = Math.max(0.05, exposure.fluence);
  let signal: Float32Array<ArrayBufferLike> = new Float32Array(count);
  for (let i = 0; i < count; i += 1) signal[i] = transmission[i] * fluence;

  const blurred = blurSeparable(signal, DRR_SIZE, 12, false);
  const scatter = scatterWeight(technique);
  for (let i = 0; i < count; i += 1) {
    signal[i] = signal[i] * (1 - scatter) + blurred[i] * scatter;
  }

  const cutoff = exposure.gridCutoff;
  if (cutoff > 0.02) {
    for (let y = 0; y < DRR_SIZE; y += 1) {
      for (let x = 0; x < DRR_SIZE; x += 1) {
        const nx = x / (DRR_SIZE - 1);
        const edge = Math.max(0, Math.abs(nx - 0.5) - 0.28) / 0.22;
        const side = nx < 0.5 ? 1 - exposure.gridAsymmetry : 1 + exposure.gridAsymmetry;
        const fall = Math.min(1, edge * edge) * cutoff * Math.max(0.25, side);
        signal[y * DRR_SIZE + x] *= 1 - Math.min(0.92, fall);
      }
    }
  }

  const heel = Math.min(0.18, exposure.anodeHeel);
  if (heel > 0.002) {
    for (let y = 0; y < DRR_SIZE; y += 1) {
      const gain = 1 - heel * (0.5 - y / DRR_SIZE);
      const row = y * DRR_SIZE;
      for (let x = 0; x < DRR_SIZE; x += 1) signal[row + x] *= gain;
    }
  }

  const ugPx = Math.min(2.4, exposure.ugMm * 3.2);
  if (ugPx >= 0.45) signal = blurSeparable(signal, DRR_SIZE, ugPx, false);

  if (technique.respiration === "LIBERO") {
    const motion = Math.min(7, 1.2 + exposure.exposureTimeMs / 14);
    const vertical = blurSeparable(signal, DRR_SIZE, motion, true);
    for (let i = 0; i < count; i += 1) signal[i] = signal[i] * 0.35 + vertical[i] * 0.65;
  }

  const noiseGain = 0.1 / Math.sqrt(fluence);
  const rngSeed = seed >>> 0 || 1;
  for (let i = 0; i < count; i += 1) {
    const sigma = noiseGain * Math.sqrt(Math.max(signal[i], 1e-4));
    signal[i] = Math.max(0, signal[i] + grain(i, rngSeed) * sigma);
  }

  const pixels = new Float32Array(count);
  const shutter = new Uint8Array(count);
  const halfW = (technique.collW / 43) * 0.5 * DRR_SIZE;
  const halfH = (technique.collH / 43) * 0.5 * DRR_SIZE;
  const cx = DRR_SIZE / 2;
  const cy = DRR_SIZE / 2;
  const penumbra = 2.2;
  for (let y = 0; y < DRR_SIZE; y += 1) {
    for (let x = 0; x < DRR_SIZE; x += 1) {
      const i = y * DRR_SIZE + x;
      const dx = Math.abs(x - cx) - halfW;
      const dy = Math.abs(y - cy) - halfH;
      const outside = Math.max(dx, dy);
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

  if (technique.markerSide === "DX" || technique.markerSide === "SX") {
    stampMarker(pixels, shutter, technique.markerSide, technique.collW, technique.collH);
  }

  return { width: DRR_SIZE, height: DRR_SIZE, pixels, shutter };
}
