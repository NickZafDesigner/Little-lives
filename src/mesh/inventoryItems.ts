import * as THREE from "three";
import { Palette } from "../game/palette";
import type { MaterialId, ToolId } from "../data/items";
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

function makeAxe(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 10, 0, 2.2, 22, 2.2);
  addBox(g, matFlat(Palette.rockDark), 4, 20, 0, 10, 5, 3.5);
  addBox(g, matFlat(Palette.rock), 8, 20, 0, 4, 3.2, 2.2);
  return g;
}

function makePickaxe(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 10, 0, 2.2, 22, 2.2);
  addBox(g, matFlat(Palette.rockDark), 0, 21, 0, 16, 3.2, 3.2);
  addBox(g, matFlat(Palette.rock), -7, 19, 0, 3.5, 5, 2.8);
  addBox(g, matFlat(Palette.rock), 7, 19, 0, 3.5, 5, 2.8);
  return g;
}

function makeShovel(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 12, 0, 2, 22, 2);
  addBox(g, matFlat(Palette.wood), 0, 24, 0, 5, 2.2, 2.4);
  addBox(g, matFlat(Palette.rockDark), 0, 2.5, 0, 5.5, 6, 1.6);
  addBox(g, matFlat(Palette.rock), 0, 0.6, 0, 4.2, 2.2, 1.2);
  return g;
}

function makeFishingRod(): THREE.Group {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.7, 26, 6),
    matFlat(Palette.woodDark),
  );
  rod.position.set(0, 13, 0);
  rod.rotation.z = -0.35;
  g.add(rod);
  addBox(g, matFlat(Palette.wood), -2, 6, 1.2, 3.2, 3.2, 2.4);
  addBlob(g, matSmooth(Palette.rose), 6, 22, 0, 1.4);
  addBox(g, matFlat(Palette.cream), 6, 23.6, 0, 1, 1.6, 1);
  return g;
}

function makeWood(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), -3, 3, 0, 5, 5, 14);
  addBox(g, matFlat(Palette.wood), 2, 3.5, 1, 5, 5, 12);
  addBox(g, matFlat(Palette.woodLight), 0, 7, -1, 4.5, 4.5, 11);
  return g;
}

function makeStone(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.rock), 0, 4, 0, 5.5, 1, 0.85, 1.1);
  addBlob(g, matSmooth(Palette.rockDark), 3, 3, -2, 3.2, 1.1, 0.9, 1);
  return g;
}

function makeCoal(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.ink), 0, 3.5, 0, 4.5, 1.05, 0.9, 1);
  addBlob(g, matSmooth(Palette.inkSoft), -2.5, 2.8, 1.5, 2.8);
  addBlob(g, matSmooth(Palette.ink), 2.2, 2.5, -1.2, 2.4);
  return g;
}

function makeOre(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.rockDark), 0, 4, 0, 5, 1, 0.9, 1.05);
  addBox(g, matFlat(Palette.ore), -2, 5, 2, 3, 3, 3);
  addBox(g, matFlat(Palette.sunflower), 2.5, 4, -1.5, 2.4, 2.4, 2.4);
  return g;
}

function makeClay(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.dirt), 0, 3, 0, 5, 1.1, 0.75, 1.05);
  addBlob(g, matSmooth(Palette.dirtDark), 2, 2.4, 1.5, 3, 1, 0.7, 1);
  return g;
}

function makeFish(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.waterDeep), 0, 4, 0, 4.2, 1.6, 0.7, 1);
  addBox(g, matFlat(Palette.water), 5.5, 4, 0, 3.5, 3.2, 1.2);
  addBox(g, matFlat(Palette.waterFoam), -5, 4.2, 0, 2.2, 2.6, 0.8);
  addBlob(g, matSmooth(Palette.ink), 2.4, 4.6, 1.6, 0.55);
  return g;
}

function makeApple(): THREE.Group {
  const g = new THREE.Group();
  addBlob(g, matSmooth(Palette.apple), 0, 4, 0, 4.2, 1, 0.95, 1);
  addBox(g, matFlat(Palette.woodDark), 0, 8.2, 0, 1.1, 2.4, 1.1);
  addBlob(g, matSmooth(Palette.leaf), 1.4, 8.4, 0, 1.6, 1.2, 0.55, 1);
  return g;
}

const toolMakers: Record<ToolId, () => THREE.Group> = {
  axe: makeAxe,
  pickaxe: makePickaxe,
  shovel: makeShovel,
  fishing_rod: makeFishingRod,
};

const materialMakers: Record<MaterialId, () => THREE.Group> = {
  wood: makeWood,
  stone: makeStone,
  coal: makeCoal,
  ore: makeOre,
  clay: makeClay,
  fish: makeFish,
  apple: makeApple,
};

export type InventoryThumbId = `tool:${ToolId}` | `mat:${MaterialId}`;

export function createInventoryItemMesh(id: InventoryThumbId): THREE.Group {
  if (id.startsWith("tool:")) {
    const toolId = id.slice(5) as ToolId;
    const make = toolMakers[toolId];
    if (!make) throw new Error(`Unknown tool mesh: ${toolId}`);
    return make();
  }
  if (id.startsWith("mat:")) {
    const matId = id.slice(4) as MaterialId;
    const make = materialMakers[matId];
    if (!make) throw new Error(`Unknown material mesh: ${matId}`);
    return make();
  }
  throw new Error(`Unknown inventory mesh: ${id}`);
}
