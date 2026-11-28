import { formatClock } from "@/lib/number";

export type SavedSession = {
  id: string;
  caseId: string;
  caseTitle: string;
  score: number;
  max: number;
  shots: number;
  cumulativeDap: number;
  savedAt: string;
  rejects?: { shot: number; reason: string }[];
};

const KEY = "aequan.tsrm.sessions.v1";
const PROGRESS_KEY = "aequan.tsrm.progress.v1";
const listeners = new Set<() => void>();
let snapshot = "[]";
let hydrated = false;

export function subscribeSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionSnapshot(): string {
  if (!hydrated && typeof window !== "undefined") {
    snapshot = window.localStorage.getItem(KEY) ?? "[]";
    hydrated = true;
  }
  return snapshot;
}

export function readSessions(raw: string): SavedSession[] {
  try {
    const parsed = JSON.parse(raw) as SavedSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: SavedSession[]): void {
  snapshot = JSON.stringify(sessions.slice(0, 40));
  hydrated = true;
  window.localStorage.setItem(KEY, snapshot);
  listeners.forEach((listener) => listener());
}

export function stampNow(): string {
  return formatClock(new Date());
}

const progressListeners = new Set<() => void>();
let progressSnapshot = "";
let progressHydrated = false;

export function subscribeProgress(listener: () => void): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

export function getProgressSnapshot(): string {
  if (!progressHydrated && typeof window !== "undefined") {
    progressSnapshot = window.localStorage.getItem(PROGRESS_KEY) ?? "";
    progressHydrated = true;
  }
  return progressSnapshot;
}

export function setProgressCase(caseId: string): void {
  progressSnapshot = caseId;
  progressHydrated = true;
  if (caseId) window.localStorage.setItem(PROGRESS_KEY, caseId);
  else window.localStorage.removeItem(PROGRESS_KEY);
  progressListeners.forEach((listener) => listener());
}
