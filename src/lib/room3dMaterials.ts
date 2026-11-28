import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type StudioLook = {
  medicalWhite: THREE.MeshPhysicalMaterial;
  brushed: THREE.MeshStandardMaterial;
  anthracite: THREE.MeshStandardMaterial;
  carbon: THREE.MeshStandardMaterial;
  slate: THREE.MeshStandardMaterial;
  leadGlass: THREE.MeshPhysicalMaterial;
  fresnelSkin: THREE.ShaderMaterial;
  examSkin: THREE.MeshStandardMaterial;
  gown: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  lung: THREE.MeshStandardMaterial;
  heart: THREE.MeshStandardMaterial;
  beam: THREE.ShaderMaterial;
  field: THREE.LineBasicMaterial;
  laser: THREE.LineBasicMaterial;
  ray: THREE.LineBasicMaterial;
  mark: THREE.MeshBasicMaterial;
  chamber: THREE.MeshBasicMaterial;
  chamberIdle: THREE.MeshBasicMaterial;
  detectorFace: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  lamp: THREE.MeshStandardMaterial;
  key: THREE.DirectionalLight;
  environment: THREE.WebGLRenderTarget;
  dispose: () => void;
};

const FRESNEL_VERT = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-viewPos.xyz);
  gl_Position = projectionMatrix * viewPos;
}
`;

const FRESNEL_FRAG = `
precision highp float;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.15);
  vec3 core = vec3(0.102, 0.200, 0.322);
  vec3 edge = vec3(0.408, 0.710, 1.0);
  gl_FragColor = vec4(mix(core, edge, fres), mix(0.28, 0.92, fres));
}
`;

const BEAM_VERT = `
attribute float aAlong;
varying float vAlong;
void main() {
  vAlong = aAlong;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BEAM_FRAG = `
precision highp float;
varying float vAlong;
uniform float uHot;
void main() {
  vec3 cool = vec3(0.420, 0.639, 0.871);
  vec3 hot = vec3(0.953, 0.612, 0.071);
  float body = smoothstep(0.04, 0.28, vAlong) * (1.0 - smoothstep(0.72, 1.0, vAlong));
  gl_FragColor = vec4(mix(cool, hot, uHot), body * mix(0.2, 0.42, uHot));
}
`;

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponibile");
  paint(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function carbonMap(): THREE.CanvasTexture {
  const texture = canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = "#c5ced8";
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 1;
    for (let i = -64; i < 128; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 64, 64);
      ctx.stroke();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 3);
  return texture;
}

function floorMap(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = "#0F1A2B";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#16253B";
    ctx.strokeRect(8, 8, 112, 112);
    ctx.fillStyle = "#1E324E";
    ctx.fillRect(58, 58, 12, 12);
  });
}

/** Griglia di centratura del flat panel: croce, centimetri, bordo campo. */
export function detectorMap(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#121A28";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#2A486D";
    ctx.lineWidth = 1;
    for (let i = 16; i < 256; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 8);
      ctx.lineTo(i, 248);
      ctx.moveTo(8, i);
      ctx.lineTo(248, i);
      ctx.stroke();
    }
    ctx.strokeStyle = "#6BA3DE";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 220, 220);
    ctx.beginPath();
    ctx.moveTo(128, 28);
    ctx.lineTo(128, 228);
    ctx.moveTo(28, 128);
    ctx.lineTo(228, 128);
    ctx.stroke();
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(124, 124, 8, 8);
  });
}

export function createHeadDisplay(): { texture: THREE.CanvasTexture; paint: (sid: number, cc: number, ml: number) => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponibile");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const paint = (sid: number, cc: number, ml: number) => {
    ctx.fillStyle = "#0B1320";
    ctx.fillRect(0, 0, 160, 64);
    ctx.strokeStyle = "#2A486D";
    ctx.strokeRect(1, 1, 158, 62);
    ctx.fillStyle = "#6BA3DE";
    ctx.font = "16px ui-monospace, monospace";
    ctx.fillText(`SID  ${sid} cm`, 10, 26);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText(`CC ${cc}°   ML ${ml}°`, 10, 48);
    texture.needsUpdate = true;
  };
  paint(180, 0, 0);
  return { texture, paint };
}

/** Luci da studio, ambiente PMREM e materiali PBR della sala. */
export function createStudioLook(renderer: THREE.WebGLRenderer): StudioLook {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const environment = pmrem.fromScene(envScene, 0.04);
  envScene.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
  });
  pmrem.dispose();

  const textures: THREE.Texture[] = [];
  const remember = <T extends THREE.Texture>(texture: T) => {
    textures.push(texture);
    return texture;
  };
  const carbon = remember(carbonMap());
  const resin = remember(floorMap());
  const panel = remember(detectorMap());

  const medicalWhite = new THREE.MeshPhysicalMaterial({
    color: 0xe8eef5,
    roughness: 0.28,
    metalness: 0.05,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  });
  const brushed = new THREE.MeshStandardMaterial({
    color: 0x8fa3b8,
    roughness: 0.34,
    metalness: 0.82,
  });
  const anthracite = new THREE.MeshStandardMaterial({
    color: 0x1b2636,
    roughness: 0.42,
    metalness: 0.35,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    map: carbon,
    color: 0x1b2432,
    roughness: 0.42,
    metalness: 0.25,
  });
  const slate = new THREE.MeshStandardMaterial({
    color: 0x273447,
    roughness: 0.74,
    metalness: 0.05,
  });
  const leadGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1a3348,
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const fresnelSkin = new THREE.ShaderMaterial({
    vertexShader: FRESNEL_VERT,
    fragmentShader: FRESNEL_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const examSkin = new THREE.MeshStandardMaterial({
    color: 0xd4c8be,
    roughness: 0.58,
    metalness: 0.02,
  });
  const gown = new THREE.MeshStandardMaterial({
    color: 0x2a3e59,
    roughness: 0.82,
    metalness: 0.03,
  });
  const bone = new THREE.MeshStandardMaterial({
    color: 0xede6d6,
    roughness: 0.45,
    metalness: 0.04,
  });
  const lung = new THREE.MeshStandardMaterial({
    color: 0x6ba3de,
    roughness: 0.55,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const heart = new THREE.MeshStandardMaterial({
    color: 0x7a3040,
    roughness: 0.5,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const beam = new THREE.ShaderMaterial({
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    uniforms: { uHot: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const field = new THREE.LineBasicMaterial({ color: 0xf39c12 });
  const laser = new THREE.LineBasicMaterial({ color: 0xff3b30 });
  const ray = new THREE.LineBasicMaterial({ color: 0x6ba3de });
  const mark = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
  const chamber = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const chamberIdle = new THREE.MeshBasicMaterial({
    color: 0x6ba3de,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const detectorFace = new THREE.MeshStandardMaterial({
    map: panel,
    roughness: 0.55,
    metalness: 0.2,
  });
  const floor = new THREE.MeshStandardMaterial({
    map: resin,
    color: 0x0f1a2b,
    roughness: 0.72,
    metalness: 0.18,
  });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x6ba3de,
    emissive: 0x1e324e,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xf39c12,
    emissive: 0xf39c12,
    emissiveIntensity: 1.4,
    roughness: 0.35,
  });

  const key = new THREE.DirectionalLight(0xeef5ff, 1.55);
  key.position.set(-40, 280, -30);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 520;
  key.shadow.camera.left = -180;
  key.shadow.camera.right = 180;
  key.shadow.camera.top = 180;
  key.shadow.camera.bottom = -180;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;

  const materials: THREE.Material[] = [
    medicalWhite,
    brushed,
    anthracite,
    carbonMat,
    slate,
    leadGlass,
    fresnelSkin,
    examSkin,
    gown,
    bone,
    lung,
    heart,
    beam,
    field,
    laser,
    ray,
    mark,
    chamber,
    chamberIdle,
    detectorFace,
    floor,
    screen,
    lamp,
  ];

  return {
    medicalWhite,
    brushed,
    anthracite,
    carbon: carbonMat,
    slate,
    leadGlass,
    fresnelSkin,
    examSkin,
    gown,
    bone,
    lung,
    heart,
    beam,
    field,
    laser,
    ray,
    mark,
    chamber,
    chamberIdle,
    detectorFace,
    floor,
    screen,
    lamp,
    key,
    environment,
    dispose: () => {
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      key.shadow.map?.dispose();
    },
  };
}
