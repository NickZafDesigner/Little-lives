import type { LotId } from "../data/types";
import { LOTS } from "./lots";

/**
 * Internal partition walls. Coordinates are relative to the lot origin
 * (lot.tx / lot.ty). Each run sits on grid tiles; door offsets stay open.
 *
 * `axis: "x"` → wall runs east–west (thin in Z).
 * `axis: "y"` → wall runs north–south (thin in X).
 */
export interface InternalWallRun {
  rx: number;
  ry: number;
  length: number;
  axis: "x" | "y";
  /** Offsets along the run (0 … length-1) left open as doorways. */
  doors?: number[];
}

export interface InteriorFurnitureSeed {
  defId: string;
  rx: number;
  ry: number;
  uid: string;
}

export interface LotInterior {
  walls: InternalWallRun[];
  furniture: InteriorFurnitureSeed[];
}

/**
 * Home (14×11): bedroom NW, bathroom NE, living south-west, kitchen south-east.
 *
 *     1·····6 7 8····12
 *   1 BEDROOM │ BATH
 *   3         │
 *   4 ───·───────·───   doors at cols 7 & 10
 *   5 LIVING    │ KIT
 *   9      door │
 */
const HOME: LotInterior = {
  walls: [
    { rx: 7, ry: 1, length: 3, axis: "y" },
    { rx: 1, ry: 4, length: 12, axis: "x", doors: [6, 9] },
    { rx: 8, ry: 5, length: 5, axis: "y", doors: [4] },
  ],
  furniture: [
    { defId: "bed", rx: 2, ry: 1, uid: "start_bed" },
    { defId: "plant", rx: 5, ry: 2, uid: "start_plant" },
    { defId: "shower", rx: 9, ry: 1, uid: "start_shower" },
    { defId: "toilet", rx: 11, ry: 1, uid: "start_toilet" },
    { defId: "sofa", rx: 2, ry: 7, uid: "start_sofa" },
    { defId: "tv", rx: 5, ry: 6, uid: "start_tv" },
    { defId: "fridge", rx: 11, ry: 5, uid: "start_fridge" },
    { defId: "table", rx: 9, ry: 7, uid: "start_table" },
  ],
};

/** Neighbor (12×10): bedroom north, living south. */
const NEIGHBOR: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [5] }],
  furniture: [
    { defId: "bed", rx: 2, ry: 1, uid: "n_bed" },
    { defId: "sofa", rx: 2, ry: 6, uid: "n_sofa" },
    { defId: "table", rx: 6, ry: 6, uid: "n_table" },
  ],
};

/** Café (14×10): service counter west, seating east. */
const CAFE: LotInterior = {
  walls: [{ rx: 7, ry: 1, length: 8, axis: "y", doors: [6] }],
  furniture: [
    { defId: "counter", rx: 3, ry: 3, uid: "c_counter" },
    { defId: "table", rx: 9, ry: 5, uid: "c_table" },
    { defId: "plant", rx: 11, ry: 2, uid: "c_plant" },
  ],
};

/** Shelter (14×10): office north, pet floor south. */
const SHELTER: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 12, axis: "x", doors: [6] }],
  furniture: [
    { defId: "shelter_desk", rx: 5, ry: 1, uid: "s_desk" },
    { defId: "pet_bed", rx: 2, ry: 6, uid: "s_bed" },
    { defId: "pet_bowl", rx: 10, ry: 6, uid: "s_bowl" },
  ],
};

/** Market (12×10): counter north, stock south. */
const MARKET: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [5] }],
  furniture: [
    { defId: "counter", rx: 4, ry: 2, uid: "m_counter" },
    { defId: "table", rx: 2, ry: 6, uid: "m_table" },
    { defId: "plant", rx: 9, ry: 6, uid: "m_plant" },
  ],
};

/** Library (12×10): desk north, reading south. */
const LIBRARY: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [5] }],
  furniture: [
    { defId: "library_desk", rx: 4, ry: 1, uid: "l_desk" },
    { defId: "table", rx: 2, ry: 6, uid: "l_table" },
    { defId: "plant", rx: 9, ry: 6, uid: "l_plant" },
  ],
};

/** Clinic (14×10): reception north, care south. */
const CLINIC: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 12, axis: "x", doors: [6] }],
  furniture: [
    { defId: "clinic_desk", rx: 5, ry: 1, uid: "k_desk" },
    { defId: "sofa", rx: 2, ry: 6, uid: "k_sofa" },
    { defId: "plant", rx: 11, ry: 6, uid: "k_plant" },
  ],
};

export const LOT_INTERIORS: Partial<Record<LotId, LotInterior>> = {
  home: HOME,
  neighbor: NEIGHBOR,
  cafe: CAFE,
  shelter: SHELTER,
  market: MARKET,
  library: LIBRARY,
  clinic: CLINIC,
};

/** Absolute tile cells occupied by structural internal walls (no doorways). */
export function structuralWallTiles(lotId: LotId): Array<{ tx: number; ty: number }> {
  const lot = LOTS.find((l) => l.id === lotId);
  const interior = LOT_INTERIORS[lotId];
  if (!lot || !interior) return [];
  const out: Array<{ tx: number; ty: number }> = [];
  for (const run of interior.walls) {
    const doors = new Set(run.doors ?? []);
    for (let i = 0; i < run.length; i++) {
      if (doors.has(i)) continue;
      const tx = lot.tx + (run.axis === "x" ? run.rx + i : run.rx);
      const ty = lot.ty + (run.axis === "y" ? run.ry + i : run.ry);
      out.push({ tx, ty });
    }
  }
  return out;
}

export function allStructuralWallTiles(): Array<{ tx: number; ty: number }> {
  const out: Array<{ tx: number; ty: number }> = [];
  for (const id of Object.keys(LOT_INTERIORS) as LotId[]) {
    out.push(...structuralWallTiles(id));
  }
  return out;
}

/** Starter furniture for a lot, with absolute tile coords. */
export function interiorFurniture(lotId: LotId): Array<{
  uid: string;
  defId: string;
  tx: number;
  ty: number;
  lotId: LotId;
}> {
  const lot = LOTS.find((l) => l.id === lotId);
  const interior = LOT_INTERIORS[lotId];
  if (!lot || !interior) return [];
  return interior.furniture.map((f) => ({
    uid: f.uid,
    defId: f.defId,
    tx: lot.tx + f.rx,
    ty: lot.ty + f.ry,
    lotId,
  }));
}
