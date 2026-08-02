import { furnitureById } from "../data/furniture";
import type { FurnitureCategory, PlacedFurniture } from "../data/types";

const CATEGORY_POINTS: Record<FurnitureCategory, number> = {
  bed: 18,
  seating: 12,
  appliance: 10,
  surface: 8,
  decor: 10,
  pet: 14,
  plumbing: 10,
};

/** Comfort / cozy score from furniture placed at home (0-100-ish, uncapped soft). */
export function computeCozyScore(furniture: PlacedFurniture[]): number {
  const home = furniture.filter((f) => f.lotId === "home");
  const seen = new Set<string>();
  let score = 0;
  const cats = new Set<FurnitureCategory>();

  for (const f of home) {
    const def = furnitureById[f.defId];
    if (!def || def.price <= 0) continue;
    cats.add(def.category);
    const uniqueBonus = seen.has(f.defId) ? 0.35 : 1;
    seen.add(f.defId);
    score += (CATEGORY_POINTS[def.category] ?? 6) * uniqueBonus;
  }

  // Completeness bonus for covering life needs
  const needed: FurnitureCategory[] = [
    "bed",
    "seating",
    "appliance",
    "plumbing",
    "decor",
  ];
  let covered = 0;
  for (const c of needed) if (cats.has(c)) covered += 1;
  score += covered * 4;
  if (cats.has("pet")) score += 8;

  return Math.round(Math.min(120, score));
}

export function uniqueHomeDefIds(furniture: PlacedFurniture[]): string[] {
  const ids = new Set<string>();
  for (const f of furniture) {
    if (f.lotId !== "home") continue;
    const def = furnitureById[f.defId];
    if (def && def.price > 0) ids.add(f.defId);
  }
  return [...ids];
}
