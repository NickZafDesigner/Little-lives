import type { LotId } from "../data/types";
import { TILE } from "../game/constants";

export interface LotBounds {
  id: LotId;
  name: string;
  tx: number;
  ty: number;
  tw: number;
  th: number;
  owned: boolean;
  buildable: boolean;
  color: number;
}

export const LOTS: LotBounds[] = [
  {
    id: "home",
    name: "Your Home",
    tx: 3,
    ty: 3,
    tw: 14,
    th: 11,
    owned: true,
    buildable: true,
    color: 0xffe0b2,
  },
  {
    id: "neighbor",
    name: "Mabel's House",
    tx: 36,
    ty: 3,
    tw: 12,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xf8bbd0,
  },
  {
    id: "market",
    name: "Vera's Market",
    tx: 54,
    ty: 3,
    tw: 12,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xffe082,
  },
  {
    id: "park",
    name: "Town Park",
    tx: 20,
    ty: 12,
    tw: 16,
    th: 12,
    owned: false,
    buildable: false,
    color: 0xc8e6c9,
  },
  {
    id: "cafe",
    name: "Sunny Café",
    tx: 4,
    ty: 24,
    tw: 14,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xffe0b2,
  },
  {
    id: "shelter",
    name: "Pet Shelter",
    tx: 36,
    ty: 24,
    tw: 14,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xbbdefb,
  },
  {
    id: "library",
    name: "Town Library",
    tx: 54,
    ty: 24,
    tw: 12,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xd7ccc8,
  },
  {
    id: "clinic",
    name: "Sage Clinic",
    tx: 20,
    ty: 38,
    tw: 14,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xb2dfdb,
  },
];

export function lotAtTile(tx: number, ty: number): LotBounds | null {
  for (const lot of LOTS) {
    if (
      tx >= lot.tx &&
      ty >= lot.ty &&
      tx < lot.tx + lot.tw &&
      ty < lot.ty + lot.th
    ) {
      return lot;
    }
  }
  return null;
}

export function lotById(id: LotId): LotBounds | undefined {
  return LOTS.find((l) => l.id === id);
}

export function pixelBounds(lot: LotBounds) {
  return {
    x: lot.tx * TILE,
    y: lot.ty * TILE,
    w: lot.tw * TILE,
    h: lot.th * TILE,
  };
}
