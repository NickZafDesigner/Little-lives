import type { SaveData } from "../data/types";

const SAVE_KEY = "little-lives-save-v1";
export const SAVE_VERSION = 7;

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    // v5/v6 → v7: inventory + harvest fields default in GameState.loadFrom
    if (
      data.version !== SAVE_VERSION &&
      data.version !== 6 &&
      data.version !== 5
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
