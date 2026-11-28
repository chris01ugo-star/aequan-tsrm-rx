/**
 * Lastre caricate dall'utente. IndexedDB nativo, con copia in memoria
 * se il database è bloccato. Il motore 2D legge i pixel già decodificati.
 */

import type { Projection } from "@/types/rx";

export type ArtifactPreset = "none" | "metal_foreign_body" | "grid_lines_moire" | "double_exposure";

export type PlateSlot = "PA" | "AP" | "LL";

export type PlatePixels = {
  width: number;
  height: number;
  /** Luminanza del file, 0–255, senza inversione di polarità. */
  raw: Uint8Array;
};

export type StoredPlate = {
  mime: string;
  bytes: ArrayBuffer;
};

export type UploadedRadiographSet = {
  id: string;
  name: string;
  presetId: string;
  refKv: number;
  refMas: number;
  refSidCm: number;
  thicknessCm: number;
  /** true = il file è bone-black e va invertito prima della fisica. */
  invertSource: boolean;
  artifactPreset: ArtifactPreset;
  slots: Partial<Record<PlateSlot, StoredPlate>>;
};

export type EngineMode = "drr" | "plate";

type Memory = {
  mode: EngineMode;
  active: UploadedRadiographSet | null;
  pixels: Partial<Record<PlateSlot, PlatePixels>>;
  previews: Partial<Record<PlateSlot, string>>;
  catalog: { id: string; name: string; presetId: string }[];
  memoryOnly: boolean;
};

const DB_NAME = "aequan-rx-plates";
const STORE = "sets";
const MODE_KEY = "aequan.rx.engine.v1";

const listeners = new Set<() => void>();
let revision = 0;
const memory: Memory = {
  mode: "drr",
  active: null,
  pixels: {},
  previews: {},
  catalog: [],
  memoryOnly: false,
};

const memorySets = new Map<string, UploadedRadiographSet>();

export function subscribeImageStudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getImageStudioSnapshot(): string {
  return String(revision);
}

function emit(): void {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function getEngineMode(): EngineMode {
  return memory.mode;
}

export function getActiveSet(): UploadedRadiographSet | null {
  return memory.active;
}

export function getStudioCatalog(): Memory["catalog"] {
  return memory.catalog;
}

export function getPlatePreview(slot: PlateSlot): string | null {
  return memory.previews[slot] ?? null;
}

export function sourceLabel(): string {
  return "MOD: DX · SALA RX 01";
}

/** Lastra della proiezione richiesta, oppure la primaria se quella vista non c'è. */
export function plateForProjection(projection: Projection): PlatePixels | null {
  if (memory.mode !== "plate") return null;
  if (projection === "AP" && memory.pixels.AP) return memory.pixels.AP;
  if (projection === "LL" && memory.pixels.LL) return memory.pixels.LL;
  return memory.pixels.PA ?? null;
}

export function plateEngineReady(projection: Projection): boolean {
  return plateForProjection(projection) !== null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB non disponibile"));
  });
}

async function idbGetAll(): Promise<UploadedRadiographSet[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as UploadedRadiographSet[]) ?? []);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(set: UploadedRadiographSet): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(set);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function hydrateImageStore(): Promise<void> {
  if (typeof window === "undefined") return;
  const savedMode = window.localStorage.getItem(MODE_KEY);
  if (savedMode === "plate" || savedMode === "drr") memory.mode = savedMode;
  try {
    const sets = await idbGetAll();
    memory.memoryOnly = false;
    memory.catalog = sets.map((item) => ({ id: item.id, name: item.name, presetId: item.presetId }));
    const activeId = window.localStorage.getItem(`${MODE_KEY}.active`);
    const active = sets.find((item) => item.id === activeId) ?? null;
    if (active) await adoptSet(active, false);
    else emit();
  } catch {
    memory.memoryOnly = true;
    memory.catalog = [...memorySets.values()].map((item) => ({
      id: item.id,
      name: item.name,
      presetId: item.presetId,
    }));
    emit();
  }
}

async function decodePlate(plate: StoredPlate): Promise<PlatePixels> {
  const blob = new Blob([plate.bytes], { type: plate.mime });
  const bitmap = await createImageBitmap(blob);
  const maxEdge = 512;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D non disponibile");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, width, height);
  const raw = new Uint8Array(width * height);
  for (let i = 0; i < raw.length; i += 1) {
    const o = i * 4;
    raw[i] = (image.data[o] * 0.2126 + image.data[o + 1] * 0.7152 + image.data[o + 2] * 0.0722 + 0.5) | 0;
  }
  return { width, height, raw };
}

function revokePreviews(): void {
  for (const url of Object.values(memory.previews)) {
    if (url) URL.revokeObjectURL(url);
  }
  memory.previews = {};
}

async function adoptSet(set: UploadedRadiographSet, persistActive: boolean): Promise<void> {
  revokePreviews();
  const pixels: Memory["pixels"] = {};
  const previews: Memory["previews"] = {};
  for (const slot of ["PA", "AP", "LL"] as const) {
    const plate = set.slots[slot];
    if (!plate) continue;
    pixels[slot] = await decodePlate(plate);
    previews[slot] = URL.createObjectURL(new Blob([plate.bytes], { type: plate.mime }));
  }
  memory.active = set;
  memory.pixels = pixels;
  memory.previews = previews;
  if (persistActive && typeof window !== "undefined") {
    window.localStorage.setItem(`${MODE_KEY}.active`, set.id);
  }
  emit();
}

export async function saveRadiographSet(
  set: UploadedRadiographSet,
  mode: EngineMode,
): Promise<void> {
  memory.mode = mode;
  if (typeof window !== "undefined") window.localStorage.setItem(MODE_KEY, mode);
  if (memory.memoryOnly) memorySets.set(set.id, set);
  else {
    try {
      await idbPut(set);
    } catch {
      memory.memoryOnly = true;
      memorySets.set(set.id, set);
    }
  }
  const catalog = memory.catalog.filter((item) => item.id !== set.id);
  memory.catalog = [{ id: set.id, name: set.name, presetId: set.presetId }, ...catalog].slice(0, 12);
  await adoptSet(set, true);
}

export async function loadRadiographSet(id: string): Promise<void> {
  const local = memorySets.get(id);
  if (local) {
    memory.mode = "plate";
    await adoptSet(local, true);
    return;
  }
  const sets = await idbGetAll();
  const found = sets.find((item) => item.id === id);
  if (!found) return;
  memory.mode = "plate";
  if (typeof window !== "undefined") window.localStorage.setItem(MODE_KEY, "plate");
  await adoptSet(found, true);
}

export function setEngineMode(mode: EngineMode): void {
  memory.mode = mode;
  if (typeof window !== "undefined") window.localStorage.setItem(MODE_KEY, mode);
  emit();
}

export async function fileToStoredPlate(file: File): Promise<StoredPlate> {
  const bytes = await file.arrayBuffer();
  return { mime: file.type || "image/png", bytes };
}
