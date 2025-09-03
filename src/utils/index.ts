import type { Note, Folder, AppState } from "../types";

// ID generation utilities
export function nid(): string {
  return `n_${Math.random().toString(36).slice(2, 9)}`;
}

export function fid(): string {
  return `f_${Math.random().toString(36).slice(2, 9)}`;
}

// Time formatting
export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

// Text utilities
export function deriveTitleFromBody(body: string): string {
  const firstLine =
    (body || "").split(/\r?\n/).find((l) => l.trim().length > 0) || "Untitled";
  return firstLine.trim().slice(0, 120);
}

export function preview(body: string, max = 160): string {
  const s = (body || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// Note folder utilities
export function countInFolder(
  folderId: string,
  notes: Note[],
  _folders: Folder[],
  trashId: string
): number {
  if (folderId === trashId) return notes.filter((n) => !!n.trashed).length;
  return notes.filter((n) => !n.trashed && n.folderId === folderId).length;
}

// Storage utilities
export const STORAGE_KEY = "dayora_v1";

export const load = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse state", e);
    return null;
  }
};

export const save = (state: unknown) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state", e);
  }
};
