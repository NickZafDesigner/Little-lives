import * as THREE from "three";
import { Palette } from "../game/palette";
import { TILE } from "../game/constants";
import {
  harvestFootprint,
  harvestNodeById,
  type HarvestNodeInstance,
} from "../data/items";
import { matFlat, matSmooth } from "./materials";
import { addOutline } from "../render/outline";

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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function addBlob(
  parent: THREE.Object3D,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  r: number,
  squash = 1,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(1, squash, 1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function makeTree(): THREE.Group {
  const g = new THREE.Group();
  // Tall timber - shorter/narrower than the 2×2 canopy oaks.
  addBox(g, matFlat(Palette.woodDark), 0, 24, 0, 8, 48, 8);
  addBox(g, matFlat(Palette.leaf), 0, 60, 0, 34, 28, 34);
  addBox(g, matFlat(Palette.leafLight), 0, 80, 0, 22, 18, 22);
  return g;
}

/** Little red apple perched on the canopy exterior. */
function addApple(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  dark = false,
) {
  addBlob(parent, matSmooth(dark ? Palette.appleDark : Palette.apple), x, y, z, r, 0.95);
  addBox(parent, matFlat(Palette.woodDark), x, y + r * 0.95, z, r * 0.28, r * 0.7, r * 0.28);
  addBlob(parent, matSmooth(Palette.leaf), x + r * 0.35, y + r * 1.05, z, r * 0.38, 0.55);
}

function addOrange(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  dark = false,
) {
  addBlob(parent, matSmooth(dark ? Palette.orangeDark : Palette.orange), x, y, z, r, 1);
  addBox(parent, matFlat(Palette.woodDark), x, y + r * 0.95, z, r * 0.28, r * 0.7, r * 0.28);
  addBlob(parent, matSmooth(Palette.leaf), x + r * 0.35, y + r * 1.05, z, r * 0.38, 0.55);
}

/** Small hanging grape cluster. */
function addGrapeCluster(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale = 1,
) {
  const r = 1.55 * scale;
  addBlob(parent, matSmooth(Palette.grape), x, y, z, r, 1.05);
  addBlob(parent, matSmooth(Palette.grapeDark), x + r * 0.7, y - r * 0.55, z + r * 0.2, r * 0.85, 1.05);
  addBlob(parent, matSmooth(Palette.grape), x - r * 0.55, y - r * 0.7, z - r * 0.15, r * 0.8, 1.05);
  addBlob(parent, matSmooth(Palette.grapeDark), x + r * 0.15, y - r * 1.25, z, r * 0.7, 1.05);
  addBox(parent, matFlat(Palette.woodDark), x, y + r * 1.05, z, r * 0.22, r * 0.9, r * 0.22);
}

/** Timber-sized tree with fruit perched on the canopy. */
function makeAppleTree(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 24, 0, 8, 48, 8);
  addBox(g, matFlat(Palette.leafLight), 0, 60, 0, 34, 28, 34);
  addBox(g, matFlat(Palette.leaf), 0, 80, 0, 22, 18, 22);
  const fruit = new THREE.Group();
  fruit.name = "fruit";
  // Sit apples on the outside of the leaf boxes so they read clearly.
  addApple(fruit, 16, 58, 8, 3.4);
  addApple(fruit, -17, 62, -6, 3.1);
  addApple(fruit, 6, 74, -16, 2.9, true);
  addApple(fruit, -8, 52, 16, 3.2);
  addApple(fruit, 14, 68, -4, 2.7);
  addApple(fruit, -4, 86, 8, 2.8);
  g.add(fruit);
  return g;
}

function makeOrangeTree(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 24, 0, 8, 48, 8);
  addBox(g, matFlat(Palette.leaf), 0, 60, 0, 34, 28, 34);
  addBox(g, matFlat(Palette.leafLight), 0, 80, 0, 22, 18, 22);
  const fruit = new THREE.Group();
  fruit.name = "fruit";
  addOrange(fruit, 16, 58, 8, 3.3);
  addOrange(fruit, -17, 62, -6, 3.0);
  addOrange(fruit, 6, 74, -16, 2.8, true);
  addOrange(fruit, -8, 52, 16, 3.1);
  addOrange(fruit, 14, 68, -4, 2.6);
  addOrange(fruit, -4, 86, 8, 2.7);
  g.add(fruit);
  return g;
}

/** Shorter vine-like trunk with hanging grape clusters. */
function makeGrapeTree(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 18, 0, 6, 36, 6);
  addBox(g, matFlat(Palette.leafLight), 0, 46, 0, 36, 16, 28);
  addBox(g, matFlat(Palette.leaf), 0, 58, 0, 26, 14, 22);
  const fruit = new THREE.Group();
  fruit.name = "fruit";
  addGrapeCluster(fruit, 14, 42, 8, 1.15);
  addGrapeCluster(fruit, -15, 44, -6, 1.05);
  addGrapeCluster(fruit, 4, 40, -14, 1.1);
  addGrapeCluster(fruit, -6, 48, 12, 0.95);
  addGrapeCluster(fruit, 12, 52, -2, 0.9);
  g.add(fruit);
  return g;
}

/** Matches the old decorative canopy trees (2×2 footprint). */
function makeCanopyTree(seed: number): THREE.Group {
  const g = new THREE.Group();
  const scale = 0.92 + (seed % 22) * 0.01;
  const lean = ((seed % 10) - 5) * 0.8;
  addBox(
    g,
    matFlat(Palette.woodDark),
    0,
    44 * scale,
    0,
    5.5 * scale,
    88 * scale,
    9 * scale,
  );
  addBlob(g, matSmooth(Palette.leaf), lean, 118 * scale, 0, 34 * scale, 0.92);
  addBlob(
    g,
    matSmooth(Palette.leafLight),
    16 * scale + lean,
    138 * scale,
    -12 * scale,
    24 * scale,
    0.9,
  );
  addBlob(
    g,
    matSmooth(Palette.leaf),
    -18 * scale + lean,
    132 * scale,
    14 * scale,
    22 * scale,
    0.9,
  );
  addBlob(
    g,
    matSmooth(Palette.leaf),
    4 * scale,
    152 * scale,
    6 * scale,
    18 * scale,
    0.85,
  );
  return g;
}

function makeRock(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.rock), 0, 5, 0, 14, 10, 12);
  addBox(g, matFlat(Palette.rockDark), 3, 8, -2, 8, 6, 7);
  return g;
}

function makeOre(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.rockDark), 0, 6, 0, 13, 12, 11);
  addBox(g, matFlat(Palette.ore), -2, 9, 3, 5, 5, 5);
  addBox(g, matFlat(Palette.ore), 4, 7, -2, 4, 4, 4);
  return g;
}

function makeDig(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.dirtDark), 0, 2.2, 0, 12, 4.4, 12);
  addBox(g, matFlat(Palette.dirt), 2, 4, 1, 6, 2.5, 6);
  return g;
}

function meshForDef(defId: string, seed: number): THREE.Group {
  switch (defId) {
    case "harvest_canopy":
      return makeCanopyTree(seed);
    case "harvest_apple":
      return makeAppleTree();
    case "harvest_orange":
      return makeOrangeTree();
    case "harvest_grape":
      return makeGrapeTree();
    case "harvest_tree":
      return makeTree();
    case "harvest_rock":
      return makeRock();
    case "harvest_ore":
      return makeOre();
    case "harvest_dig":
      return makeDig();
    default: {
      const def = harvestNodeById[defId];
      if (def?.kind === "tree") return makeTree();
      return makeRock();
    }
  }
}

export interface HarvestMeshHandle {
  uid: string;
  root: THREE.Group;
}

/** Build interactive harvest props; caller toggles visibility on deplete. */
export function buildHarvestMeshes(
  nodes: HarvestNodeInstance[],
): { group: THREE.Group; handles: HarvestMeshHandle[] } {
  const group = new THREE.Group();
  group.name = "harvest";
  const handles: HarvestMeshHandle[] = [];

  for (const node of nodes) {
    const def = harvestNodeById[node.defId];
    if (!def) continue;
    const seed = node.tx * 17 + node.ty * 31;
    const root = meshForDef(node.defId, seed);
    root.name = node.uid;
    root.userData.harvestUid = node.uid;
    const fp = harvestFootprint(node.defId);
    root.position.set(
      (node.tx + fp / 2) * TILE,
      0,
      (node.ty + fp / 2) * TILE,
    );
    addOutline(root, 1.03);
    group.add(root);
    handles.push({ uid: node.uid, root });
  }

  return { group, handles };
}
