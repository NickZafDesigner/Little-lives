import * as THREE from "three";
import { Palette } from "../game/palette";
import { TILE, WALL_T, CAM_OFFSET_X, CAM_OFFSET_Z } from "../game/constants";
import { LOTS, LOT_DOOR_TX, type LotBounds } from "../world/lots";
import { LOT_INTERIORS } from "../world/rooms";
import type { Dir, LotId } from "../data/types";
import { matFlat, matClone } from "./materials";
import { woodFloorTexture } from "./terrainTextures";

export interface BuildingHandle {
  lotId: LotId;
  group: THREE.Group;
  roof: THREE.Group;
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Open = player inside: roof / near walls / internals ease over fade secs. */
  setRoofOpen(open: boolean): void;
  containsPoint(x: number, z: number, pad?: number): boolean;
}

/** Per-mesh data for interior occlusion fade. */
interface InternalWallData {
  /** "x" = EW run (plane in Z); "y" = NS run (plane in X). */
  axis: "x" | "y";
  /** Span along the long axis (world X for EW, world Z for NS). */
  min: number;
  max: number;
  /** Wall plane position (world Z for EW, world X for NS). */
  plane: number;
}

/**
 * Building shell on the lot footprint:
 * - N/S walls own the full width (including corners)
 * - E/W walls butt between the N/S inner faces (no overlap, no gap)
 * - Door is a precise cut in the south wall
 * - Roof seats on the outer wall plate
 */
const WALL_H = 64;
const INNER_T = 8;
/** Uniform partition height - mismatched NS/EW heights made junctions look broken. */
const INNER_H = 52;
const PLINTH_H = 2;
/** Roof length overhang past the E/W walls. */
const EAVE = 18;
/** Roof depth overhang past the N/S walls. */
const ROOF_OVERHANG_Z = 16;
/** Pitch from horizontal - steep enough to read under the oblique camera. */
const ROOF_PITCH_DEG = 56;
const ROOF_RISE_MAX_FRAC = 1.3;
const ROOF_RISE_MIN_FRAC = 0.75;
/** Visible eave / fascia thickness. */
const ROOF_SLAB_T = 8;
const RIDGE_T = 6;
const WIN_W = 28;
const WIN_H = 34;
/** Clearance past the door opening before a window may be placed. */
const WIN_DOOR_PAD = 18;
/** How far the player can be from the door before it starts opening. */
const DOOR_APPROACH = TILE * 2.4;
/** Inward swing (rad). Slightly past 90° so the leaf clears the jamb. */
const DOOR_OPEN_ANGLE = Math.PI * 0.55;
/** Ease speed for door swing (matches actor-style damp). */
const DOOR_SWING_SPEED = 7;

const LOT_STYLE: Partial<
  Record<
    LotId,
    { wall: number; roof: number; door: number; floor: number; floorTrim: number }
  >
> = {
  home: {
    wall: Palette.wall,
    roof: Palette.roof,
    door: Palette.woodDark,
    floor: Palette.floor,
    floorTrim: Palette.woodDark,
  },
  neighbor: {
    wall: 0xffe4ec,
    roof: Palette.roseDark,
    door: Palette.rose,
    floor: Palette.floorAlt,
    floorTrim: Palette.woodDark,
  },
  cafe: {
    wall: 0xfff0d6,
    roof: Palette.woodDark,
    door: Palette.woodDeep,
    floor: Palette.wood,
    floorTrim: Palette.woodDeep,
  },
  shelter: {
    wall: 0xe8f4ff,
    roof: Palette.skyDeep,
    door: 0x5a8fb0,
    floor: Palette.floorDark,
    floorTrim: Palette.woodDark,
  },
  market: {
    wall: 0xfff8e1,
    roof: Palette.blushDark,
    door: Palette.blush,
    floor: Palette.woodLight,
    floorTrim: Palette.woodDark,
  },
  library: {
    wall: 0xf3e5f5,
    roof: Palette.lavender,
    door: 0x8d6e63,
    floor: Palette.wood,
    floorTrim: Palette.woodDeep,
  },
  clinic: {
    wall: 0xe0f2f1,
    roof: Palette.mintDark,
    door: Palette.mint,
    floor: Palette.floor,
    floorTrim: Palette.woodDark,
  },
  workshop: {
    wall: 0xefebe9,
    roof: Palette.woodDeep,
    door: Palette.woodDark,
    floor: Palette.wood,
    floorTrim: Palette.woodDeep,
  },
};


function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  material?: THREE.MeshToonMaterial,
  opts?: { castShadow?: boolean },
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material ?? matFlat(color),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = opts?.castShadow ?? true;
  mesh.receiveShadow = true;
  mesh.userData.noOutline = true;
  parent.add(mesh);
  return mesh;
}

/** SE camera looks NW - player is behind a wall when on its north/west side. */
const WALL_FADE_OPACITY = 0.34;
/** Enter / exit cutaway (roof + near walls) ease duration. */
const CUTAWAY_FADE_SEC = 0.55;
/** Internal partition ghost-in / ghost-out duration. */
const INNER_FADE_SEC = 0.22;
/**
 * How far beside a wall segment the player can stand and still count as
 * "behind" it. Must cover a full room (bathroom is ~6 tiles wide) and door gaps.
 */
const INNER_LATERAL_REACH = TILE * 5;
/** Widen ray hits so short stubs (fridge wall) still catch near-misses. */
const INNER_RAY_PAD = TILE * 0.75;

/** Smoothstep - softens linear 0→1 cutaway / wall fades. */
function easeSmooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function approach(current: number, target: number, step: number): number {
  if (current < target) return Math.min(target, current + step);
  if (current > target) return Math.max(target, current - step);
  return current;
}

function setMeshFadeOpacity(mesh: THREE.Mesh, opacity: number) {
  const key = (opacity * 1000 + 0.5) | 0;
  if (mesh.userData._fadeKey === key) return;
  mesh.userData._fadeKey = key;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  let handled = false;
  for (const m of mats) {
    if (!(m instanceof THREE.MeshToonMaterial)) continue;
    handled = true;
    if (opacity <= 0.01) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    if (opacity >= 0.999) {
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
    } else {
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
    }
  }
  if (!handled && opacity <= 0.01) mesh.visible = false;
}

function setGroupFadeOpacity(
  root: THREE.Object3D,
  opacity: number,
  castShadows: boolean,
) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    setMeshFadeOpacity(obj, opacity);
    if (obj.userData._castShadowWas === undefined) {
      obj.userData._castShadowWas = obj.castShadow;
    }
    obj.castShadow = castShadows && !!obj.userData._castShadowWas;
  });
}

function ghostOpacity(t: number): number {
  return 1 + (WALL_FADE_OPACITY - 1) * easeSmooth(t);
}

/** Distance from a point to a 1D segment [min, max]. */
function distToSpan(p: number, min: number, max: number): number {
  if (p < min) return min - p;
  if (p > max) return p - max;
  return 0;
}

/**
 * True when the SE camera→player segment crosses this axis-aligned wall run.
 * `pad` grows the span so doorjamb stubs still register near-misses.
 */
function segmentHitsCamRay(
  axis: "x" | "y",
  min: number,
  max: number,
  plane: number,
  px: number,
  pz: number,
  pad = INNER_RAY_PAD,
): boolean {
  const camX = px + CAM_OFFSET_X;
  const camZ = pz + CAM_OFFSET_Z;
  const dx = px - camX;
  const dz = pz - camZ;

  if (axis === "x") {
    if (Math.abs(dz) < 1e-6) return false;
    const t = (plane - camZ) / dz;
    if (t <= 0.02 || t >= 0.98) return false;
    const x = camX + t * dx;
    return x >= min - pad && x <= max + pad;
  }

  if (Math.abs(dx) < 1e-6) return false;
  const t = (plane - camX) / dx;
  if (t <= 0.02 || t >= 0.98) return false;
  const z = camZ + t * dz;
  return z >= min - pad && z <= max + pad;
}

/**
 * Whether this partition would hide the player from the SE ortho camera.
 *
 * Primary: camera→player ray crosses the segment (true occlusion).
 * Fallback keeps the Sims-style side rules when the ray slips a door gap:
 * - EW: player north of the wall and within lateral reach
 * - NS: player within the wall's north-south reach (either side - west
 *   dividers clip the silhouette even though the ray ends at the character)
 */
function wallObscuresPlayer(
  data: InternalWallData,
  px: number,
  pz: number,
): boolean {
  const half = INNER_T / 2;

  if (
    segmentHitsCamRay(data.axis, data.min, data.max, data.plane, px, pz)
  ) {
    return true;
  }

  if (data.axis === "x") {
    if (pz >= data.plane + half) return false;
    return distToSpan(px, data.min, data.max) <= INNER_LATERAL_REACH;
  }

  if (distToSpan(pz, data.min, data.max) > INNER_LATERAL_REACH) return false;
  // Either side of an NS run - east is camera-near, west still clips.
  return true;
}

/**
 * Wall-flush props (fridge, TV, …) sit on the camera-near face of partitions.
 * Ghost them when the player stands behind the piece so a solid appliance
 * doesn't keep blocking after its wall has faded.
 */
export function wallFlushObscuresPlayer(
  fx: number,
  fz: number,
  rot: Dir,
  px: number,
  pz: number,
): boolean {
  const reach = TILE * 2.8;
  switch (rot) {
    case "down":
      // Faces south; back toward an EW wall. Behind = north of the piece.
      if (pz >= fz - 2) return false;
      return Math.abs(px - fx) <= reach;
    case "up":
      if (pz <= fz + 2) return false;
      return Math.abs(px - fx) <= reach;
    case "right":
      // Faces east; back toward a west wall. Behind = west of the piece.
      if (px >= fx - 2) return false;
      return Math.abs(pz - fz) <= reach;
    case "left":
      if (px <= fx + 2) return false;
      return Math.abs(pz - fz) <= reach;
  }
}

/** Ease wall-flush furniture toward ghost / solid with the same opacity curve. */
export function updateWallFlushFurnitureFade(
  root: THREE.Object3D,
  dt: number,
  wantGhost: boolean,
): void {
  const target = wantGhost ? 1 : 0;
  let t = (root.userData.fadeT as number) ?? 0;
  if (t === target) {
    // Still apply once so newly spawned meshes pick up the current state.
    if (root.userData._fadeApplied === target) return;
  } else {
    t = approach(t, target, dt / INNER_FADE_SEC);
    root.userData.fadeT = t;
  }
  root.userData._fadeApplied = t === target ? target : -1;
  setGroupFadeOpacity(root, ghostOpacity(t), t < 0.45);
}

/**
 * Internal partitions:
 * - EW runs own junction tiles (continuous hallway beams)
 * - NS runs skip those tiles and butt to the EW faces (no cross overlap)
 * - Ends that reach the interior perimeter extend to the outer-wall inner face
 */
function addInternalWalls(
  group: THREE.Group,
  lot: LotBounds,
  wallColor: number,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const interior = LOT_INTERIORS[lot.id];
  if (!interior) return meshes;
  const base = 0.35;
  const y = base + INNER_H / 2;
  const noCast = { castShadow: false as const };

  const minX = lot.tx * TILE;
  const maxX = (lot.tx + lot.tw) * TILE;
  const minZ = lot.ty * TILE;
  const maxZ = (lot.ty + lot.th) * TILE;
  const westInner = minX + WALL_T;
  const eastInner = maxX - WALL_T;
  const northInner = minZ + WALL_T;
  const southInner = maxZ - WALL_T;

  // Absolute tile keys "tx,ty" claimed by solid EW partitions.
  const ewTiles = new Set<string>();
  for (const run of interior.walls) {
    if (run.axis !== "x") continue;
    const doors = new Set(run.doors ?? []);
    for (let i = 0; i < run.length; i++) {
      if (doors.has(i)) continue;
      ewTiles.add(`${lot.tx + run.rx + i},${lot.ty + run.ry}`);
    }
  }

  const key = (tx: number, ty: number) => `${tx},${ty}`;

  const place = (
    w: number,
    d: number,
    cx: number,
    cz: number,
    data: InternalWallData,
  ) => {
    // Clone so per-mesh opacity doesn't mutate the shared matFlat cache.
    const mesh = box(
      group,
      w,
      INNER_H,
      d,
      wallColor,
      cx,
      y,
      cz,
      matClone(wallColor),
      noCast,
    );
    mesh.userData.internalWall = data;
    mesh.userData.fadeT = 0;
    meshes.push(mesh);
  };

  for (const run of interior.walls) {
    const doors = new Set(run.doors ?? []);

    let segStart = -1;
    const flush = (from: number, to: number) => {
      if (from < 0 || to < from) return;

      if (run.axis === "x") {
        let x0 = (lot.tx + run.rx + from) * TILE;
        let x1 = (lot.tx + run.rx + to + 1) * TILE;
        // Meet the shell when the run reaches the interior perimeter.
        if (run.rx + from <= 1) x0 = westInner;
        if (run.rx + to >= lot.tw - 2) x1 = eastInner;
        if (x1 - x0 < 1) return;
        const cx = (x0 + x1) / 2;
        const cz = (lot.ty + run.ry) * TILE + TILE / 2;
        place(x1 - x0, INNER_T, cx, cz, {
          axis: "x",
          min: x0,
          max: x1,
          plane: cz,
        });
        return;
      }

      // North-south: split around EW-owned junctions, then butt to their faces.
      const col = lot.tx + run.rx;
      let a = from;
      while (a <= to) {
        const ty = lot.ty + run.ry + a;
        if (ewTiles.has(key(col, ty))) {
          a++;
          continue;
        }
        let b = a;
        while (
          b + 1 <= to &&
          !ewTiles.has(key(col, lot.ty + run.ry + b + 1))
        ) {
          b++;
        }
        let z0 = (lot.ty + run.ry + a) * TILE;
        let z1 = (lot.ty + run.ry + b + 1) * TILE;
        const rowA = lot.ty + run.ry + a;
        const rowB = lot.ty + run.ry + b;
        if (ewTiles.has(key(col, rowA - 1))) {
          z0 = (rowA - 1) * TILE + TILE / 2 + INNER_T / 2;
        } else if (run.ry + a <= 1) {
          z0 = northInner;
        }
        if (ewTiles.has(key(col, rowB + 1))) {
          z1 = (rowB + 1) * TILE + TILE / 2 - INNER_T / 2;
        } else if (run.ry + b >= lot.th - 2) {
          z1 = southInner;
        }
        if (z1 - z0 >= 1) {
          const cx = col * TILE + TILE / 2;
          const cz = (z0 + z1) / 2;
          place(INNER_T, z1 - z0, cx, cz, {
            axis: "y",
            min: z0,
            max: z1,
            plane: cx,
          });
        }
        a = b + 1;
      }
    };

    for (let i = 0; i < run.length; i++) {
      if (doors.has(i)) {
        flush(segStart, i - 1);
        segStart = -1;
        continue;
      }
      if (segStart < 0) segStart = i;
    }
    flush(segStart, run.length - 1);
  }

  return meshes;
}

function meshFromPositions(
  positions: number[],
  mat: THREE.MeshToonMaterial,
): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.noOutline = true;
  return mesh;
}

function pushVert(out: number[], x: number, y: number, z: number) {
  out.push(x, y, z);
}

/** Push a triangle (three verts) into a position buffer. */
function pushTri(
  out: number[],
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
) {
  pushVert(out, ax, ay, az);
  pushVert(out, bx, by, bz);
  pushVert(out, cx, cy, cz);
}

/**
 * Clean cottage roof: one thick slab per pitch + inset gable + raised ridge.
 * No overlapping gambrel/knee/ridge faces - those z-fought and looked like the
 * roof was "drawing on the fly" while walking.
 */
function makePitchedRoof(opts: {
  length: number;
  wallHalfD: number;
  wallHalfW: number;
  wallH: number;
  pitchDeg: number;
  overhangZ: number;
  roofMat: THREE.MeshToonMaterial;
  roofShadeMat: THREE.MeshToonMaterial;
  gableMat: THREE.MeshToonMaterial;
  ridgeMat: THREE.MeshToonMaterial;
}): { group: THREE.Group; rise: number } {
  const {
    length,
    wallHalfD,
    wallHalfW,
    wallH,
    pitchDeg,
    overhangZ,
    roofMat,
    roofShadeMat,
    gableMat,
    ridgeMat,
  } = opts;

  const span = wallHalfD + overhangZ;
  const pitch = (pitchDeg * Math.PI) / 180;
  let rise = Math.tan(pitch) * span;
  const riseMin = wallH * ROOF_RISE_MIN_FRAC;
  const riseMax = wallH * ROOF_RISE_MAX_FRAC;
  rise = Math.min(riseMax, Math.max(riseMin, rise));
  const group = new THREE.Group();

  // Keep roof faces from fighting gables under the ortho camera.
  for (const mat of [roofMat, roofShadeMat, ridgeMat]) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;
  }

  // Tiny ridge gap so N/S slabs don't share a coplanar seam.
  const gap = 1.2;
  const useSpan = span - gap * 0.5;
  const useRise = rise * (useSpan / span);
  const useLen = Math.hypot(useSpan, useRise);
  const usePitch = Math.atan2(useRise, useSpan);

  for (const side of [-1, 1] as const) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(length, ROOF_SLAB_T, useLen),
      side > 0 ? roofMat : roofShadeMat,
    );
    slab.rotation.x = side * usePitch;
    const midY = useRise / 2;
    const midZ = side * (gap * 0.5 + useSpan / 2);
    const ny = Math.cos(usePitch);
    const nz = side * Math.sin(usePitch);
    slab.position.set(
      0,
      midY + (ROOF_SLAB_T / 2) * ny,
      midZ + (ROOF_SLAB_T / 2) * nz,
    );
    slab.castShadow = true;
    // Receiving on huge roof faces causes crawling shadow acne while walking.
    slab.receiveShadow = false;
    slab.userData.noOutline = true;
    group.add(slab);
  }

  // Gables face both ways - single-sided tris vanish under the oblique camera.
  gableMat.side = THREE.DoubleSide;
  const gableY = rise * (wallHalfD / span) - 1.5;
  if (gableY > 4) {
    for (const x of [-wallHalfW + WALL_T * 0.55, wallHalfW - WALL_T * 0.55]) {
      const g: number[] = [];
      pushTri(g, x, 0, -wallHalfD + 1, x, 0, wallHalfD - 1, x, gableY, 0);
      group.add(meshFromPositions(g, gableMat));
    }
  }

  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(length + 4, RIDGE_T, RIDGE_T * 1.6),
    ridgeMat,
  );
  // Sit clearly above the slab peak - never embedded in the seam.
  ridge.position.set(0, rise + ROOF_SLAB_T * 0.35 + RIDGE_T * 0.5, 0);
  ridge.castShadow = true;
  ridge.receiveShadow = false;
  ridge.userData.noOutline = true;
  group.add(ridge);

  return { group, rise };
}

/**
 * Windows sit proud on the OUTER wall face so they stay visible.
 * Frame + glass + sill - reads clearly at oblique camera angles.
 */
function addWindows(
  parent: THREE.Object3D,
  lot: LotBounds,
  wallFace: "north" | "south" | "west" | "east",
  /** Outer face world position (minZ / maxZ / minX / maxX). */
  outerFace: number,
  winY: number,
  frameColor: number,
  skipX0?: number,
  skipX1?: number,
) {
  const glass = 0x7ec8e0;
  const winW = WIN_W;
  const winH = WIN_H;
  const frameT = 2.4;
  const glassT = 1.6;
  // Proud of the outer face so panes read clearly from the street.
  const out = 1.6;
  // Half of sill width - door skip range is widened separately by WIN_DOOR_PAD.
  const halfExtent = (winW + 5) / 2 + 2;

  if (wallFace === "north" || wallFace === "south") {
    const sign = wallFace === "north" ? -1 : 1;
    const frameZ = outerFace + sign * (out + frameT / 2);
    const glassZ = outerFace + sign * (out + frameT + glassT / 2);
    const sillZ = outerFace + sign * (out + 1.2);
    for (let i = 2; i < lot.tw - 2; i += 3) {
      const wx = (lot.tx + i) * TILE + TILE / 2;
      // Skip if the window's footprint would overlap the door opening.
      if (
        skipX0 !== undefined &&
        skipX1 !== undefined &&
        wx + halfExtent > skipX0 &&
        wx - halfExtent < skipX1
      ) {
        continue;
      }
      const noCast = { castShadow: false };
      box(parent, winW + 3, winH + 3, frameT, frameColor, wx, winY, frameZ, undefined, noCast);
      box(parent, winW, winH, glassT, glass, wx, winY, glassZ, undefined, noCast);
      box(parent, winW + 5, 2, 3.5, frameColor, wx, winY - winH / 2 - 1.2, sillZ, undefined, noCast);
      box(parent, 1.4, winH, glassT + 0.4, frameColor, wx, winY, glassZ, undefined, noCast);
      box(parent, winW, 1.4, glassT + 0.4, frameColor, wx, winY, glassZ, undefined, noCast);
    }
  } else {
    const sign = wallFace === "west" ? -1 : 1;
    const frameX = outerFace + sign * (out + frameT / 2);
    const glassX = outerFace + sign * (out + frameT + glassT / 2);
    const sillX = outerFace + sign * (out + 1.2);
    const noCast = { castShadow: false };
    for (let i = 2; i < lot.th - 2; i += 3) {
      const wz = (lot.ty + i) * TILE + TILE / 2;
      box(parent, frameT, winH + 3, winW + 3, frameColor, frameX, winY, wz, undefined, noCast);
      box(parent, glassT, winH, winW, glass, glassX, winY, wz, undefined, noCast);
      box(parent, 3.5, 2, winW + 5, frameColor, sillX, winY - winH / 2 - 1.2, wz, undefined, noCast);
      box(parent, glassT + 0.4, winH, 1.4, frameColor, glassX, winY, wz, undefined, noCast);
      box(parent, glassT + 0.4, 1.4, winW, frameColor, glassX, winY, wz, undefined, noCast);
    }
  }
}

function buildHouse(lot: LotBounds): BuildingHandle {
  const style = LOT_STYLE[lot.id] ?? {
    wall: Palette.wall,
    roof: Palette.roof,
    door: Palette.woodDark,
    floor: Palette.floor,
    floorTrim: Palette.woodDark,
  };

  const group = new THREE.Group();
  group.name = `building_${lot.id}`;

  // Outer footprint = lot bounds. Walls sit on these edges, thickness inward.
  const minX = lot.tx * TILE;
  const maxX = (lot.tx + lot.tw) * TILE;
  const minZ = lot.ty * TILE;
  const maxZ = (lot.ty + lot.th) * TILE;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const outerW = maxX - minX;
  const outerD = maxZ - minZ;

  const t = WALL_T;
  const base = 0.2;
  const wallY = base + WALL_H / 2;
  const wallTopY = base + WALL_H;

  // Wall plate centres (outer face flush with lot edge).
  const northZ = minZ + t / 2;
  const southZ = maxZ - t / 2;
  const westX = minX + t / 2;
  const eastX = maxX - t / 2;
  // E/W walls butt between N/S inner faces - exact fit, no corner overlap.
  const sideDepth = outerD - 2 * t;
  const sideCz = cz;

  // Door opening in south wall (world X range).
  const doorCx = (lot.tx + (LOT_DOOR_TX[lot.id] ?? 6)) * TILE + TILE / 2;
  const doorW = TILE * 1.5;
  const doorX0 = doorCx - doorW / 2;
  const doorX1 = doorCx + doorW / 2;
  const leftW = Math.max(0, doorX0 - minX);
  const rightW = Math.max(0, maxX - doorX1);
  const leftCx = minX + leftW / 2;
  const rightCx = doorX1 + rightW / 2;

  // Floor slab - wood grain matching terrain; UV repeat so boards stay tile-scale.
  const floorMap = woodFloorTexture().clone();
  floorMap.needsUpdate = true;
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(outerW / TILE, outerD / TILE);
  box(
    group,
    outerW,
    PLINTH_H,
    outerD,
    style.floor,
    cx,
    PLINTH_H / 2,
    cz,
    matFlat(0xffffff, { map: floorMap }),
  );

  // --- Far walls (always visible): north + west ---
  box(group, outerW, WALL_H, t, style.wall, cx, wallY, northZ);
  box(group, t, WALL_H, sideDepth, style.wall, westX, wallY, sideCz);

  // Frame tinted from the door wood so windows match each lot's trim.
  const frameColor = style.door;
  const winY = base + WALL_H * 0.55;
  addWindows(group, lot, "north", minZ, winY, frameColor);
  addWindows(group, lot, "west", minX, winY, frameColor);

  // --- Near walls (fade when inside): south + east ---
  const near = new THREE.Group();
  near.name = "near_walls";

  // Door-sized opening only. (Old lintel/lower split left a tall empty
  // column above the short door leaf - shower was visible through it.)
  const doorH = 56;
  const doorTop = base + doorH;
  const headerH = Math.max(0, wallTopY - doorTop);
  if (leftW > 0.5) {
    box(near, leftW, WALL_H, t, style.wall, leftCx, wallY, southZ);
  }
  if (rightW > 0.5) {
    box(near, rightW, WALL_H, t, style.wall, rightCx, wallY, southZ);
  }
  if (headerH > 0.5) {
    box(
      near,
      doorW,
      headerH,
      t,
      style.wall,
      doorCx,
      doorTop + headerH / 2,
      southZ,
    );
  }
  box(near, t, WALL_H, sideDepth, style.wall, eastX, wallY, sideCz);

  // Widen skip zone so window frames/sills never sit on the doorway.
  addWindows(
    near,
    lot,
    "south",
    maxZ,
    winY,
    frameColor,
    doorX0 - WIN_DOOR_PAD,
    doorX1 + WIN_DOOR_PAD,
  );
  addWindows(near, lot, "east", maxX, winY, frameColor);

  group.add(near);

  // Hinged door leaf - pivot on the west jamb, swings inward (+Y).
  const leafW = doorW - 1.5;
  const leafD = 2;
  const hingeX = doorCx - leafW / 2;
  const doorZ = maxZ - 1;
  const doorPivot = new THREE.Group();
  doorPivot.name = "door";
  doorPivot.position.set(hingeX, base + doorH / 2, doorZ);
  const doorLeaf = box(
    doorPivot,
    leafW,
    doorH,
    leafD,
    style.door,
    leafW / 2,
    0,
    0,
  );
  // Small knob on the free edge (street side).
  box(
    doorLeaf,
    3.2,
    3.2,
    3.5,
    new THREE.Color(style.door).offsetHSL(0, 0, -0.12).getHex(),
    leafW * 0.38,
    0,
    leafD / 2 + 1.2,
  );
  group.add(doorPivot);

  // Canopy just above the door leaf (not the full wall).
  box(
    near,
    doorW + 10,
    2.2,
    12,
    style.roof,
    doorCx,
    doorTop + 1.1,
    maxZ + 4,
  );

  const internalWalls = addInternalWalls(group, lot, style.wall);

  // Far walls - tracked so we can mute their indoor shadows during cutaway.
  const farCasters: THREE.Mesh[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.parent === group && obj.castShadow) {
      farCasters.push(obj);
    }
  });

  // --- Pitched cottage roof ---
  const roof = new THREE.Group();
  roof.name = "roof";

  const wallHalfD = outerD / 2;
  const wallHalfW = outerW / 2;
  const roofMat = matClone(style.roof);
  const roofShadeMat = matClone(
    new THREE.Color(style.roof).multiplyScalar(0.68).getHex(),
  );
  const gableMat = matClone(style.wall);
  const ridgeMat = matClone(
    new THREE.Color(style.roof).multiplyScalar(0.55).getHex(),
  );

  const { group: prism, rise: roofRise } = makePitchedRoof({
    length: outerW + EAVE * 2,
    wallHalfD,
    wallHalfW,
    wallH: WALL_H,
    pitchDeg: ROOF_PITCH_DEG,
    overhangZ: ROOF_OVERHANG_Z,
    roofMat,
    roofShadeMat,
    gableMat,
    ridgeMat,
  });
  // Seat onto the wall plate
  prism.position.set(cx, wallTopY - 0.5, cz);
  roof.add(prism);

  if (lot.id === "home") {
    const roofDark = new THREE.Color(style.roof).multiplyScalar(0.78).getHex();
    const chimX = cx + wallHalfW * 0.45;
    const chimZ = cz - wallHalfD * 0.28;
    // Sit chimney on the north slope
    const t = Math.min(0.85, Math.abs(chimZ - cz) / (wallHalfD + ROOF_OVERHANG_Z));
    const chimBaseY = wallTopY - 0.5 + roofRise * (1 - t);
    box(
      roof,
      9,
      18,
      9,
      Palette.wallShade,
      chimX,
      chimBaseY + 9,
      chimZ,
      matClone(Palette.wallShade),
    );
    box(
      roof,
      11,
      2.4,
      11,
      roofDark,
      chimX,
      chimBaseY + 19,
      chimZ,
      matClone(roofDark),
    );
  }

  group.add(roof);

  near.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshToonMaterial) {
      obj.material = obj.material.clone();
    }
  });
  // Door leaf shares the front-wall fade; clone so opacity is independent.
  doorPivot.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshToonMaterial) {
      obj.material = obj.material.clone();
    }
  });

  let open = false;
  let wasOpen: boolean | null = null;
  /** 0 = outside (roof solid), 1 = inside (roof gone, near walls ghosted). */
  let cutawayT = 0;
  let doorAngle = 0;

  const applyCutawayT = (t: number) => {
    const e = easeSmooth(t);
    // Roof eases out on enter / back in on exit.
    setGroupFadeOpacity(roof, 1 - e, e < 0.45);
    // Near walls + door ease to the ghost opacity while inside.
    const nearOpacity = ghostOpacity(t);
    setGroupFadeOpacity(near, nearOpacity, e < 0.45);
    setGroupFadeOpacity(doorPivot, nearOpacity, e < 0.45);
    // Mute far-wall shadows while mostly open so they don't stripe the floor.
    for (const m of farCasters) m.castShadow = e < 0.45;
  };

  const setRoofOpen = (next: boolean) => {
    if (open === next && wasOpen !== null) return;
    open = next;
    wasOpen = next;
  };

  const updateInternalWallFade = (
    dt: number,
    playerX: number,
    playerZ: number,
  ) => {
    if (internalWalls.length === 0) return;
    const step = dt / INNER_FADE_SEC;
    for (const mesh of internalWalls) {
      const data = mesh.userData.internalWall as InternalWallData | undefined;
      const want =
        open && data ? wallObscuresPlayer(data, playerX, playerZ) : false;
      const target = want ? 1 : 0;
      let t = (mesh.userData.fadeT as number) ?? 0;
      if (t === target) continue;
      t = approach(t, target, step);
      mesh.userData.fadeT = t;
      setMeshFadeOpacity(mesh, ghostOpacity(t));
    }
  };

  const doorTileZ = maxZ - TILE / 2;
  const approachR2 = DOOR_APPROACH * DOOR_APPROACH;

  const update = (dt: number, playerX: number, playerZ: number) => {
    const cutawayTarget = open ? 1 : 0;
    if (cutawayT !== cutawayTarget) {
      cutawayT = approach(cutawayT, cutawayTarget, dt / CUTAWAY_FADE_SEC);
      applyCutawayT(cutawayT);
    }

    updateInternalWallFade(dt, playerX, playerZ);

    const dx = playerX - doorCx;
    const dz = playerZ - doorTileZ;
    const nearDoor = dx * dx + dz * dz < approachR2;
    // Proximity only - swings shut once you walk in past the doorway.
    const target = nearDoor ? DOOR_OPEN_ANGLE : 0;
    doorAngle += (target - doorAngle) * Math.min(1, dt * DOOR_SWING_SPEED);
    if (Math.abs(doorAngle - target) < 0.001) doorAngle = target;
    doorPivot.rotation.y = doorAngle;
  };

  (
    group as THREE.Group & {
      _updateRoof?: (dt: number, playerX: number, playerZ: number) => void;
    }
  )._updateRoof = update;

  return {
    lotId: lot.id,
    group,
    roof,
    footprint: { minX, maxX, minZ, maxZ },
    setRoofOpen,
    containsPoint(x, z, pad = 0) {
      return x > minX - pad && x < maxX + pad && z > minZ - pad && z < maxZ + pad;
    },
  };
}

export function buildBuildings(): {
  group: THREE.Group;
  buildings: BuildingHandle[];
  update: (dt: number, playerX: number, playerZ: number) => void;
} {
  const group = new THREE.Group();
  group.name = "buildings";
  const buildings: BuildingHandle[] = [];

  for (const lot of LOTS) {
    if (lot.id === "park" || lot.id === "playpark" || lot.id === "pier" || lot.id === "forest" || lot.id === "mine") continue;
    const b = buildHouse(lot);
    group.add(b.group);
    buildings.push(b);
  }

  return {
    group,
    buildings,
    update(dt: number, playerX: number, playerZ: number) {
      for (const b of buildings) {
        const g = b.group as THREE.Group & {
          _updateRoof?: (dt: number, px: number, pz: number) => void;
        };
        g._updateRoof?.(dt, playerX, playerZ);
      }
    },
  };
}

export function playerInsideBuilding(
  px: number,
  pz: number,
  buildings: BuildingHandle[],
): LotId | null {
  for (const b of buildings) {
    if (b.containsPoint(px, pz, -TILE)) return b.lotId;
  }
  return null;
}
