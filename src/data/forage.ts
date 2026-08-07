/**
 * Walk-up forage finds: wildflowers (tile-backed) plus place-tied overlays
 * (shells, mushrooms, feathers). Shared deplete/respawn and pick loop.
 */

import type { MaterialId } from "./items";

export type ForageItemId = Extract<
  MaterialId,
  "flower" | "shell" | "mushroom" | "feather"
>;

export interface ForageDef {
  itemId: ForageItemId;
  label: string;
  /** Verb on interact tip / busy bar. */
  verb: string;
  /** Min–max count per pick (inclusive). */
  min: number;
  max: number;
  /** Days until the spot respawns after picking. */
  respawnDays: number;
}

export const FORAGE_DEFS: ForageDef[] = [
  {
    itemId: "flower",
    label: "Wildflower",
    verb: "Pick",
    min: 1,
    max: 2,
    respawnDays: 1,
  },
  {
    itemId: "shell",
    label: "Seashell",
    verb: "Scoop",
    min: 1,
    max: 2,
    respawnDays: 1,
  },
  {
    itemId: "mushroom",
    label: "Cap Mushroom",
    verb: "Pick",
    min: 1,
    max: 1,
    respawnDays: 1,
  },
  {
    itemId: "feather",
    label: "Soft Feather",
    verb: "Pick",
    min: 1,
    max: 1,
    respawnDays: 1,
  },
];

export const forageById: Record<ForageItemId, ForageDef> = Object.fromEntries(
  FORAGE_DEFS.map((d) => [d.itemId, d]),
) as Record<ForageItemId, ForageDef>;

export function isForageItemId(id: string): id is ForageItemId {
  return id in forageById;
}

/** Roll a pick yield for a forage def. */
export function rollForageYield(itemId: ForageItemId): number {
  const def = forageById[itemId];
  if (!def) return 1;
  if (def.min === def.max) return def.min;
  // Flowers historically: 1, or 2 with 35% chance when max is 2.
  if (def.min === 1 && def.max === 2) {
    return 1 + (Math.random() < 0.35 ? 1 : 0);
  }
  return def.min + Math.floor(Math.random() * (def.max - def.min + 1));
}

/** Authored overlay spots (shell / mushroom / feather). Flowers stay on Tile.flower. */
export type ForageSpot = { tx: number; ty: number; itemId: ForageItemId };
