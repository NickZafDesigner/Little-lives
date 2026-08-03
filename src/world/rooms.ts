import type { Dir, LotId } from "../data/types";
import { LOTS } from "./lots";

/**
 * Internal partition walls. Coordinates are relative to the lot origin
 * (lot.tx / lot.ty). Each run sits on grid tiles; door offsets stay open.
 *
 * `axis: "x"` → wall runs east-west (thin in Z).
 * `axis: "y"` → wall runs north-south (thin in X).
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
  /** Front faces this way; omit for "down". Back should sit against a wall. */
  rot?: Dir;
}

export interface LotInterior {
  walls: InternalWallRun[];
  furniture: InteriorFurnitureSeed[];
}

/**
 * Home (14×11): bedroom NW, bathroom NE, living south-west, kitchen south-east.
 *
 *     1····5 6 7·····12
 *   1 BEDROOM│  BATH
 *   3        │
 *   4 ──··────────··──   2-tile doors at cols 5-6 (bed) & 10-11 (bath)
 *   5 LIVING   │  KIT    divider at col 8 (one open tile from bed wall)
 *   7        ··│         2-tile door mid-run
 *
 * Vertical runs may include the junction tile shared with an EW run; the mesh
 * builder lets EW own that tile and butts the NS wall to its face.
 *
 * Interior floor is roughly cols 1–12, rows 1–9 (shell on the perimeter).
 */
const HOME: LotInterior = {
  walls: [
    { rx: 6, ry: 1, length: 4, axis: "y" },
    { rx: 1, ry: 4, length: 12, axis: "x", doors: [3, 4, 8, 9] },
    { rx: 8, ry: 4, length: 6, axis: "y", doors: [2, 3] },
  ],
  furniture: [
    // Bedroom - bed stays at (2,1) for the wake cutscene; plant as nightstand.
    { defId: "bed", rx: 2, ry: 1, uid: "start_bed", rot: "down" },
    { defId: "plant", rx: 1, ry: 1, uid: "start_plant" },
    // Bath - shower L-walls face west+north; toilet tank against east wall.
    { defId: "shower", rx: 7, ry: 1, uid: "start_shower", rot: "down" },
    { defId: "toilet", rx: 12, ry: 2, uid: "start_toilet", rot: "left" },
    // No starter sofa - the wake-up intro / make_it_home quest asks you to buy one.
    // Living - TV back against west wall, screen into the room.
    { defId: "tv", rx: 1, ry: 7, uid: "start_tv", rot: "right" },
    // Kitchen - fridge flush on the hallway wall, front toward the camera.
    { defId: "fridge", rx: 11, ry: 5, uid: "start_fridge", rot: "down" },
    { defId: "kitchen_counter", rx: 12, ry: 7, uid: "start_counter", rot: "left" },
    { defId: "table", rx: 9, ry: 7, uid: "start_table" },
  ],
};

/** Neighbor (12×10): bedroom north, living south. */
const NEIGHBOR: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "bed", rx: 1, ry: 1, uid: "n_bed", rot: "down" },
    // Sofa back against the bedroom wall, facing into the living room.
    { defId: "sofa", rx: 2, ry: 5, uid: "n_sofa", rot: "down" },
    { defId: "table", rx: 6, ry: 7, uid: "n_table" },
  ],
};

/** Café (14×10): service counter west, seating east. */
const CAFE: LotInterior = {
  walls: [{ rx: 7, ry: 1, length: 8, axis: "y", doors: [3, 4] }],
  furniture: [
    // Counter against west wall, front toward the seating side.
    { defId: "counter", rx: 1, ry: 2, uid: "c_counter", rot: "right" },
    { defId: "table", rx: 9, ry: 2, uid: "c_table", rot: "down" },
    { defId: "table", rx: 9, ry: 7, uid: "c_table2", rot: "down" },
    { defId: "plant", rx: 12, ry: 1, uid: "c_plant" },
  ],
};

/** Shelter (14×10): office north, pet floor south. */
const SHELTER: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 12, axis: "x", doors: [5, 6] }],
  furniture: [
    { defId: "shelter_desk", rx: 2, ry: 1, uid: "s_desk", rot: "down" },
    { defId: "pet_bed", rx: 1, ry: 6, uid: "s_bed" },
    { defId: "pet_bowl", rx: 12, ry: 8, uid: "s_bowl" },
  ],
};

/** Market (12×10): counter north, stock south. */
const MARKET: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "counter", rx: 3, ry: 1, uid: "m_counter", rot: "down" },
    { defId: "table", rx: 1, ry: 6, uid: "m_table", rot: "right" },
    { defId: "plant", rx: 10, ry: 8, uid: "m_plant" },
  ],
};

/** Library (12×10): desk north, reading south. */
const LIBRARY: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "library_desk", rx: 2, ry: 1, uid: "l_desk", rot: "down" },
    { defId: "table", rx: 2, ry: 6, uid: "l_table" },
    { defId: "plant", rx: 10, ry: 1, uid: "l_plant" },
  ],
};

/** Clinic (14×10): reception north, care south. */
const CLINIC: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 12, axis: "x", doors: [5, 6] }],
  furniture: [
    { defId: "clinic_desk", rx: 2, ry: 1, uid: "k_desk", rot: "down" },
    // Waiting sofa against west wall.
    { defId: "sofa", rx: 1, ry: 6, uid: "k_sofa", rot: "right" },
    { defId: "plant", rx: 12, ry: 8, uid: "k_plant" },
  ],
};

/** Workshop (12×10): workbench north, craft floor south. */
const WORKSHOP: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "workbench", rx: 2, ry: 1, uid: "w_bench", rot: "down" },
    { defId: "tool_rack", rx: 8, ry: 1, uid: "w_tools", rot: "down" },
    { defId: "table", rx: 2, ry: 6, uid: "w_table" },
    { defId: "plant", rx: 10, ry: 8, uid: "w_plant" },
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
  workshop: WORKSHOP,
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
  rot?: Dir;
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
    rot: f.rot,
  }));
}
