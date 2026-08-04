import * as THREE from "three";
import type { Dir, PetDef, PlacedFurniture } from "../data/types";
import { TILE, WALL_T } from "../game/constants";
import { furnitureById } from "../data/furniture";
import { AssetLibrary } from "../render/AssetLibrary";
import { applyTints } from "../render/tint";
import { addOutline } from "../render/outline";
import { buildProceduralFurniture } from "./proceduralFurniture";

export const FURNITURE_DIRS: Dir[] = ["down", "right", "up", "left"];

export function nextFurnitureDir(dir: Dir): Dir {
  const i = FURNITURE_DIRS.indexOf(dir);
  return FURNITURE_DIRS[(i + 1) % FURNITURE_DIRS.length]!;
}

/** Yaw so authored +Z front faces the given map direction. */
export function yawForFurniture(dir: Dir): number {
  switch (dir) {
    case "down":
      return 0;
    case "up":
      return Math.PI;
    case "left":
      return -Math.PI / 2;
    case "right":
      return Math.PI / 2;
  }
}

/** Tile footprint size after rotation (90°/270° swaps width & height). */
export function furnitureFootprint(
  defId: string,
  rot: Dir = "down",
): { tw: number; th: number } {
  const def = furnitureById[defId];
  const w = def?.width ?? 1;
  const h = def?.height ?? 1;
  if (rot === "left" || rot === "right") return { tw: h, th: w };
  return { tw: w, th: h };
}

export function applyFurnitureRotation(mesh: THREE.Object3D, rot: Dir = "down") {
  mesh.rotation.y = yawForFurniture(rot);
}

/** Keep a little air between wall-flush pieces and the shell inner face. */
const WALL_CLEARANCE = 10;
/** Pad between a surface item's AABB and the host top rim. */
const SURFACE_EDGE_PAD = 2.5;
/** Default scale for items sitting on a counter / table. */
export const SURFACE_ITEM_SCALE = 0.82;

/**
 * World XZ for a furniture anchor (footprint centre + optional wall-flush
 * nudge toward the back). `mesh` must be unrotated - depth is local Z.
 */
export function furnitureWorldPos(
  defId: string,
  tx: number,
  ty: number,
  rot: Dir,
  mesh?: THREE.Object3D,
): { x: number; z: number } {
  const { tw, th } = furnitureFootprint(defId, rot);
  let x = tx * TILE + (tw * TILE) / 2;
  let z = ty * TILE + (th * TILE) / 2;

  const def = furnitureById[defId];
  if (def?.wallFlush && mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const halfDepth = Math.max(0.5, (box.max.z - box.min.z) / 2);
    // Depth along the facing axis, in tiles (after rotation).
    const depthTiles = rot === "left" || rot === "right" ? tw : th;
    // Pull toward the shell, but leave clearance so pieces don't sink into it.
    const bias =
      TILE + (depthTiles * TILE) / 2 - WALL_T - halfDepth - WALL_CLEARANCE;
    if (bias > 0) {
      switch (rot) {
        case "down":
          z -= bias;
          break;
        case "up":
          z += bias;
          break;
        case "right":
          x -= bias;
          break;
        case "left":
          x += bias;
          break;
      }
    }
  }

  return { x, z };
}

/** Local XZ half-extents; swap when the piece faces left/right. */
function halfExtentsXZ(
  mesh: THREE.Object3D,
  rot: Dir,
): { hx: number; hz: number } {
  const box = new THREE.Box3().setFromObject(mesh);
  let hx = Math.max(0.5, (box.max.x - box.min.x) / 2);
  let hz = Math.max(0.5, (box.max.z - box.min.z) / 2);
  if (rot === "left" || rot === "right") {
    const swap = hx;
    hx = hz;
    hz = swap;
  }
  return { hx, hz };
}

/**
 * World XZ for an item on a host surface. Anchors to the host's visual
 * centre (including wall-flush) and maps the child's tile slot into the
 * usable top so pieces don't hang off the rim.
 *
 * `hostMesh` / `childMesh` must be unrotated (yaw 0) for local bounds.
 */
export function furnitureOnSurfacePos(
  childDefId: string,
  childTx: number,
  childTy: number,
  childRot: Dir,
  host: PlacedFurniture,
  hostMesh: THREE.Object3D,
  childMesh?: THREE.Object3D,
): { x: number; z: number } {
  const hostRot = host.rot ?? "down";
  const hostPos = furnitureWorldPos(
    host.defId,
    host.tx,
    host.ty,
    hostRot,
    hostMesh,
  );
  const hostFoot = furnitureFootprint(host.defId, hostRot);
  const hostHalf = halfExtentsXZ(hostMesh, hostRot);

  let childHx = TILE * 0.28;
  let childHz = TILE * 0.28;
  if (childMesh) {
    const childHalf = halfExtentsXZ(childMesh, childRot);
    childHx = childHalf.hx;
    childHz = childHalf.hz;
  } else {
    const foot = furnitureFootprint(childDefId, childRot);
    childHx = (foot.tw * TILE * SURFACE_ITEM_SCALE) / 2;
    childHz = (foot.th * TILE * SURFACE_ITEM_SCALE) / 2;
  }

  const maxOx = Math.max(0, hostHalf.hx - childHx - SURFACE_EDGE_PAD);
  const maxOz = Math.max(0, hostHalf.hz - childHz - SURFACE_EDGE_PAD);

  // Map tile-slot centre to [-1, 1] across the host footprint, then into
  // the usable top. Single-tile hosts keep the item dead-centre.
  const slotU =
    hostFoot.tw <= 1
      ? 0
      : ((childTx - host.tx + 0.5) / hostFoot.tw) * 2 - 1;
  const slotV =
    hostFoot.th <= 1
      ? 0
      : ((childTy - host.ty + 0.5) / hostFoot.th) * 2 - 1;

  return {
    x: hostPos.x + slotU * maxOx,
    z: hostPos.z + slotV * maxOz,
  };
}

/** Fit a surface item so its XZ AABB stays inside the host top. */
export function surfaceItemScaleFor(
  childMesh: THREE.Object3D,
  hostMesh: THREE.Object3D,
  hostRot: Dir = "down",
): number {
  const hostHalf = halfExtentsXZ(hostMesh, hostRot);
  const childBox = new THREE.Box3().setFromObject(childMesh);
  const childW = Math.max(0.5, childBox.max.x - childBox.min.x);
  const childD = Math.max(0.5, childBox.max.z - childBox.min.z);
  const fitX = (hostHalf.hx * 2 - SURFACE_EDGE_PAD * 2) / childW;
  const fitZ = (hostHalf.hz * 2 - SURFACE_EDGE_PAD * 2) / childD;
  return Math.min(SURFACE_ITEM_SCALE, fitX, fitZ, 1);
}

export function createFurnitureMesh(defId: string): THREE.Group {
  // Prefer authored GLB; fall back to procedural silhouette, then table.
  const root = AssetLibrary.hasFurniture(defId)
    ? AssetLibrary.cloneFurniture(defId)
    : (buildProceduralFurniture(defId) ?? AssetLibrary.cloneFurniture(defId));
  root.name = `furn_${defId}`;
  const def = furnitureById[defId];
  if (def) {
    applyTints(root, {
      Primary: def.color,
      Secondary: def.accent ?? def.color,
      Accent: def.accent ?? def.color,
    });
  }
  addOutline(root, 1.04);
  return root;
}

/** Countertop Y for a host def; 0 if it does not support items. */
export function surfaceHeightFor(defId: string): number {
  const def = furnitureById[defId];
  if (!def?.supportsItems) return 0;
  return def.surfaceHeight ?? 18;
}

export function placeFurniture(
  f: PlacedFurniture,
  opts?: { surfaceY?: number; host?: PlacedFurniture },
): THREE.Group {
  const rot = f.rot ?? "down";
  const mesh = createFurnitureMesh(f.defId);
  const def = furnitureById[f.defId];
  const host = opts?.host;
  let x: number;
  let z: number;
  if (host) {
    const hostMesh = createFurnitureMesh(host.defId);
    const scale = surfaceItemScaleFor(mesh, hostMesh, host.rot ?? "down");
    mesh.scale.setScalar(scale);
    ({ x, z } = furnitureOnSurfacePos(
      f.defId,
      f.tx,
      f.ty,
      rot,
      host,
      hostMesh,
      mesh,
    ));
  } else {
    if (def?.placeOnSurface) mesh.scale.setScalar(SURFACE_ITEM_SCALE);
    ({ x, z } = furnitureWorldPos(f.defId, f.tx, f.ty, rot, mesh));
  }
  applyFurnitureRotation(mesh, rot);
  mesh.position.set(x, opts?.surfaceY ?? 0, z);
  mesh.userData.uid = f.uid;
  mesh.userData.defId = f.defId;
  mesh.userData.rot = rot;
  mesh.userData.parentUid = f.parentUid;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Pets
 * ------------------------------------------------------------------ */

export interface PetHandle {
  root: THREE.Group;
  setPosition(x: number, z: number): void;
  getPosition(): { x: number; z: number };
  setWalking(w: boolean): void;
  setFacingRight(right: boolean): void;
  update(dt: number): void;
  dispose(): void;
}

export function createPet(def: PetDef): PetHandle {
  const root = new THREE.Group();
  root.name = `pet_${def.id}`;
  root.scale.setScalar(1.15);

  const body = AssetLibrary.clonePet(def.species);
  applyTints(body, {
    Primary: def.color,
    Accent: def.accent,
    Secondary: 0x2a2018,
  });
  addOutline(body, 1.05);
  root.add(body);

  const legs: THREE.Object3D[] = [];
  body.traverse((o) => {
    if (o.name.startsWith("Leg_")) legs.push(o);
  });
  const tail = AssetLibrary.findNamed(body, "Tail");
  const hop = def.species === "bunny" || def.species === "bird";

  let x = 0;
  let z = 0;
  let walking = false;
  let clock = 0;

  return {
    root,
    setPosition(nx, nz) {
      x = nx;
      z = nz;
      root.position.set(nx, 0, nz);
    },
    getPosition() {
      return { x, z };
    },
    setWalking(w) {
      walking = w;
    },
    setFacingRight(right) {
      body.rotation.y = right ? Math.PI / 2 : -Math.PI / 2;
    },
    update(dt) {
      clock += dt;
      if (walking) {
        if (hop) {
          const t = (clock * 3) % 1;
          body.position.y = Math.sin(t * Math.PI) * 5;
          body.rotation.x = Math.sin(t * Math.PI) * -0.2;
          for (const [i, leg] of legs.entries()) {
            leg.rotation.x = Math.sin(t * Math.PI) * (i % 2 ? 0.7 : 0.6);
          }
        } else {
          const swing = Math.sin(clock * 11);
          body.position.y = Math.abs(Math.sin(clock * 11)) * 0.9;
          for (const [i, leg] of legs.entries()) {
            const phase = i === 0 || i === 3 ? swing : -swing;
            leg.rotation.x = phase * 0.6;
          }
        }
        if (tail) tail.rotation.z = Math.sin(clock * 9) * 0.25;
      } else {
        body.position.y += (0 - body.position.y) * Math.min(1, dt * 8);
        body.rotation.x += (0 - body.rotation.x) * Math.min(1, dt * 8);
        for (const leg of legs) {
          leg.rotation.x += (0 - leg.rotation.x) * Math.min(1, dt * 8);
        }
        if (tail) tail.rotation.z = Math.sin(clock * 1.8) * 0.12;
      }
    },
    dispose() {
      root.clear();
    },
  };
}
