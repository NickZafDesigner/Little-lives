import * as THREE from "three";
import { Palette } from "../game/palette";
import { TILE } from "../game/constants";
import {
  harvestNodeById,
  type HarvestNodeInstance,
} from "../data/items";
import { matFlat } from "./materials";
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

function makeTree(): THREE.Group {
  const g = new THREE.Group();
  addBox(g, matFlat(Palette.woodDark), 0, 8, 0, 5, 16, 5);
  addBox(g, matFlat(Palette.leaf), 0, 22, 0, 18, 14, 18);
  addBox(g, matFlat(Palette.leafLight), 0, 30, 0, 12, 10, 12);
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

function meshForKind(kind: string): THREE.Group {
  switch (kind) {
    case "tree":
      return makeTree();
    case "rock":
      return makeRock();
    case "ore":
      return makeOre();
    case "dig":
      return makeDig();
    default:
      return makeRock();
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
    const root = meshForKind(def.kind);
    root.name = node.uid;
    root.userData.harvestUid = node.uid;
    root.position.set(
      node.tx * TILE + TILE / 2,
      0,
      node.ty * TILE + TILE / 2,
    );
    addOutline(root, 1.03);
    group.add(root);
    handles.push({ uid: node.uid, root });
  }

  return { group, handles };
}
