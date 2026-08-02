import * as THREE from "three";
import type { Dir, PetDef, PlacedFurniture } from "../data/types";
import { TILE } from "../game/constants";
import { furnitureById } from "../data/furniture";
import { AssetLibrary } from "../render/AssetLibrary";
import { applyTints } from "../render/tint";
import { addOutline } from "../render/outline";

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

export function createFurnitureMesh(defId: string): THREE.Group {
  const root = AssetLibrary.cloneFurniture(defId);
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

export function placeFurniture(f: PlacedFurniture): THREE.Group {
  const rot = f.rot ?? "down";
  const mesh = createFurnitureMesh(f.defId);
  applyFurnitureRotation(mesh, rot);
  const { tw, th } = furnitureFootprint(f.defId, rot);
  mesh.position.set(
    f.tx * TILE + (tw * TILE) / 2,
    0,
    f.ty * TILE + (th * TILE) / 2,
  );
  mesh.userData.uid = f.uid;
  mesh.userData.defId = f.defId;
  mesh.userData.rot = rot;
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
