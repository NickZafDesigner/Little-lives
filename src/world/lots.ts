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

/** Town footprint on the 96×68 map — lots spread with a south beach strip. */
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
    tx: 50,
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
    tx: 74,
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
    tx: 24,
    ty: 14,
    tw: 20,
    th: 14,
    owned: false,
    buildable: false,
    color: 0xc8e6c9,
  },
  {
    id: "cafe",
    name: "Sunny Café",
    tx: 4,
    ty: 34,
    tw: 14,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xffe0b2,
  },
  {
    id: "shelter",
    name: "Pet Shelter",
    tx: 50,
    ty: 34,
    tw: 14,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xbbdefb,
  },
  {
    id: "library",
    name: "Town Library",
    tx: 74,
    ty: 34,
    tw: 12,
    th: 10,
    owned: false,
    buildable: false,
    color: 0xd7ccc8,
  },
  {
    id: "clinic",
    name: "Sage Clinic",
    tx: 28,
    ty: 50,
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

/** South-wall door tile offset within each lot (matches building shells). */
const DOOR_TX: Partial<Record<LotId, number>> = {
  home: 7,
  neighbor: 5,
  cafe: 6,
  shelter: 6,
  market: 6,
  library: 6,
  clinic: 6,
};

/** World XZ of a lot's front door — for hint arrows & nametags. */
export function lotDoorWorld(id: LotId): { x: number; z: number } | null {
  const lot = lotById(id);
  if (!lot) return null;
  const doorTx = DOOR_TX[id] ?? Math.floor(lot.tw / 2);
  return {
    x: (lot.tx + doorTx) * TILE + TILE / 2,
    z: (lot.ty + lot.th - 1) * TILE + TILE / 2,
  };
}

export function pixelBounds(lot: LotBounds) {
  return {
    x: lot.tx * TILE,
    y: lot.ty * TILE,
    w: lot.tw * TILE,
    h: lot.th * TILE,
  };
}
