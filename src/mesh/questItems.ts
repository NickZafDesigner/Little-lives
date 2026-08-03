import * as THREE from "three";
import { Palette } from "../game/palette";
import { matFlat, matSmooth } from "./materials";

function addBox(
  parent: THREE.Object3D,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

function addBlob(
  parent: THREE.Object3D,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  r: number,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
}

/** Small trash pile — crumpled paper, bottle, wrapper. */
export function createLitterMesh(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.pathLight), -2.2, 1.6, 0.6, 2.4, 1.2, 0.55, 1);
  addBlob(g, matSmooth(Palette.wall), 1.8, 1.4, -0.8, 2.1, 1.1, 0.5, 1);
  addBox(g, matFlat(Palette.mint), 0.4, 2.8, 1.6, 1.6, 4.2, 1.6);
  addBox(g, matFlat(Palette.mintDark), 0.4, 5.2, 1.6, 2.2, 0.7, 2.2);
  addBox(g, matFlat(Palette.rose), -1.4, 1.2, -1.8, 3.2, 0.7, 2.4);
  addBox(g, matFlat(Palette.inkSoft), 2.6, 1.1, 1.2, 2.4, 0.6, 1.8);
  return g;
}

/** Nibs' left shoe — Gordon. */
export function createShoeMesh(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.blushDark), 0, 2.2, 0, 3.6, 1.35, 0.7, 1.05);
  addBox(g, matFlat(Palette.blush), 2.8, 2.4, 0, 4.2, 2.6, 3.4);
  addBox(g, matFlat(Palette.cream), 0.2, 3.6, 0, 3.2, 1.2, 2.8);
  addBox(g, matFlat(Palette.ink), -2.6, 1.2, 0, 1.4, 1.2, 3.6);
  addBlob(g, matSmooth(Palette.sunflower), 4.2, 3.2, 0, 0.7);
  return g;
}

export type QuestItemVisual = "litter" | "shoe";

export function createQuestItemMesh(visual: QuestItemVisual): THREE.Group {
  return visual === "shoe" ? createShoeMesh() : createLitterMesh();
}
