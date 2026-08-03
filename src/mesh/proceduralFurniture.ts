/**
 * Hand-built cozy meshes for catalog items that don't have GLBs yet.
 * Materials use Primary / Secondary / Accent so applyTints still works.
 */
import * as THREE from "three";
import { Palette } from "../game/palette";
import { matFlat } from "./materials";

const PRIMARY = Palette.wood;
const SECONDARY = Palette.woodDark;
const ACCENT = Palette.sunflower;

function part(
  geo: THREE.BufferGeometry,
  color: number,
  slot: "Primary" | "Secondary" | "Accent",
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, matFlat(color, { name: slot }));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  color: number,
  slot: "Primary" | "Secondary" | "Accent",
  x: number,
  y: number,
  z: number,
) {
  group.add(part(new THREE.BoxGeometry(1, 1, 1), color, slot, x, y, z, w, h, d));
}

function cyl(
  group: THREE.Group,
  rTop: number,
  rBot: number,
  h: number,
  color: number,
  slot: "Primary" | "Secondary" | "Accent",
  x: number,
  y: number,
  z: number,
  rx = 0,
  rz = 0,
) {
  const mesh = part(
    new THREE.CylinderGeometry(rTop, rBot, 1, 10),
    color,
    slot,
    x,
    y,
    z,
    1,
    h,
    1,
  );
  mesh.rotation.x = rx;
  mesh.rotation.z = rz;
  group.add(mesh);
}

function rootNamed(id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = id;
  return g;
}

/** Sturdy workbench with thick top, legs, and a front vise. */
function workbench(): THREE.Group {
  const g = rootNamed("workbench");
  box(g, 52, 3.2, 24, PRIMARY, "Primary", 0, 18, 0);
  // apron
  box(g, 48, 4, 2, SECONDARY, "Secondary", 0, 15, 10);
  box(g, 48, 4, 2, SECONDARY, "Secondary", 0, 15, -10);
  // legs
  for (const [x, z] of [
    [-22, -9],
    [22, -9],
    [-22, 9],
    [22, 9],
  ] as const) {
    box(g, 3.5, 16, 3.5, SECONDARY, "Secondary", x, 8, z);
  }
  // lower shelf
  box(g, 44, 1.6, 18, PRIMARY, "Primary", 0, 5, 0);
  // vise
  box(g, 8, 4, 10, ACCENT, "Accent", 18, 21, 6);
  box(g, 2.5, 2.5, 8, SECONDARY, "Secondary", 18, 21, 12);
  return g;
}

/** Wall rack with hanging tool silhouettes. */
function toolRack(): THREE.Group {
  const g = rootNamed("tool_rack");
  box(g, 22, 28, 3, PRIMARY, "Primary", 0, 18, -4);
  // pegs
  for (const y of [28, 22, 16, 10]) {
    box(g, 1.4, 1.4, 5, SECONDARY, "Secondary", -6, y, 0);
    box(g, 1.4, 1.4, 5, SECONDARY, "Secondary", 6, y, 0);
  }
  // hammer
  box(g, 2, 12, 2, SECONDARY, "Secondary", -6, 22, 3);
  box(g, 8, 3, 3, ACCENT, "Accent", -6, 28, 3);
  // saw blade
  box(g, 2, 14, 1.2, ACCENT, "Accent", 6, 20, 3);
  box(g, 6, 2.5, 2, SECONDARY, "Secondary", 6, 12, 3);
  // wrench
  box(g, 10, 2, 2, ACCENT, "Accent", 0, 10, 3);
  return g;
}

/** Pier post with angled fishing rod + bobber. */
function fishingSpot(): THREE.Group {
  const g = rootNamed("fishing_spot");
  // deck pylon
  box(g, 8, 6, 8, PRIMARY, "Primary", 0, 3, 0);
  cyl(g, 2.2, 2.6, 22, SECONDARY, "Secondary", 0, 14, 0);
  // rod
  const rod = part(
    new THREE.CylinderGeometry(0.55, 0.7, 1, 6),
    ACCENT,
    "Accent",
    2,
    28,
    8,
    1,
    36,
    1,
  );
  rod.rotation.x = Math.PI / 2.6;
  rod.rotation.z = -0.25;
  g.add(rod);
  // reel
  box(g, 3.5, 3.5, 2.5, SECONDARY, "Secondary", 1, 22, 2);
  // bobber
  cyl(g, 1.6, 1.6, 3.2, ACCENT, "Accent", 8, 14, 22);
  box(g, 1.2, 2, 1.2, PRIMARY, "Primary", 8, 16.5, 22);
  return g;
}

/** Craft table with supplies on top. */
function craftTable(): THREE.Group {
  const g = rootNamed("craft_table");
  box(g, 50, 2.8, 26, PRIMARY, "Primary", 0, 16, 0);
  for (const [x, z] of [
    [-20, -10],
    [20, -10],
    [-20, 10],
    [20, 10],
  ] as const) {
    box(g, 3, 15, 3, SECONDARY, "Secondary", x, 7.5, z);
  }
  // paint pots
  cyl(g, 2.4, 2.8, 4, ACCENT, "Accent", -12, 19, -4);
  cyl(g, 2.4, 2.8, 4, SECONDARY, "Secondary", -6, 19, -4);
  // paper stack
  box(g, 12, 1.5, 10, ACCENT, "Accent", 10, 18, 2);
  box(g, 10, 1.2, 8, PRIMARY, "Primary", 10, 19.2, 2);
  // scissors
  box(g, 8, 1.2, 1.2, SECONDARY, "Secondary", -4, 18, 6);
  return g;
}

/** Pottery wheel with clay mound. */
function potteryWheel(): THREE.Group {
  const g = rootNamed("pottery_wheel");
  cyl(g, 8, 10, 6, SECONDARY, "Secondary", 0, 3, 0);
  cyl(g, 3.5, 4.5, 10, PRIMARY, "Primary", 0, 11, 0);
  cyl(g, 11, 11, 2, PRIMARY, "Primary", 0, 17, 0);
  // clay
  cyl(g, 4, 5.5, 5, ACCENT, "Accent", 0, 20.5, 0);
  cyl(g, 2.2, 3.5, 3, ACCENT, "Accent", 0, 24, 0);
  // foot pedal
  box(g, 8, 2, 6, SECONDARY, "Secondary", 8, 2, 4);
  return g;
}

/** Open scrap-wood shelf with stacked planks. */
function woodShelf(): THREE.Group {
  const g = rootNamed("wood_shelf");
  box(g, 48, 2.5, 14, PRIMARY, "Primary", 0, 4, 0);
  box(g, 48, 2.5, 14, PRIMARY, "Primary", 0, 16, 0);
  box(g, 48, 2.5, 14, PRIMARY, "Primary", 0, 28, 0);
  box(g, 3, 28, 12, SECONDARY, "Secondary", -22, 16, 0);
  box(g, 3, 28, 12, SECONDARY, "Secondary", 22, 16, 0);
  // scrap stacks
  box(g, 18, 4, 8, ACCENT, "Accent", -8, 7, 0);
  box(g, 14, 3, 7, PRIMARY, "Primary", 8, 6.5, 1);
  box(g, 16, 5, 8, ACCENT, "Accent", -6, 20, -1);
  box(g, 12, 3, 6, SECONDARY, "Secondary", 10, 18.5, 1);
  return g;
}

/** Harbor lantern on a short post. */
function lantern(): THREE.Group {
  const g = rootNamed("lantern");
  cyl(g, 1.4, 1.8, 10, SECONDARY, "Secondary", 0, 5, 0);
  box(g, 8, 1.5, 8, PRIMARY, "Primary", 0, 11, 0);
  box(g, 7, 8, 7, ACCENT, "Accent", 0, 16, 0);
  // frame posts
  for (const [x, z] of [
    [-3, -3],
    [3, -3],
    [-3, 3],
    [3, 3],
  ] as const) {
    box(g, 1.2, 8, 1.2, SECONDARY, "Secondary", x, 16, z);
  }
  box(g, 9, 1.8, 9, PRIMARY, "Primary", 0, 21, 0);
  // roof peak
  box(g, 6, 2.5, 6, SECONDARY, "Secondary", 0, 23, 0);
  box(g, 3, 2, 3, SECONDARY, "Secondary", 0, 25, 0);
  return g;
}

/** Bucket, shovel, and tiny sandcastle. */
function sandcastleKit(): THREE.Group {
  const g = rootNamed("sandcastle_kit");
  // sand mound
  cyl(g, 10, 12, 4, PRIMARY, "Primary", 0, 2, 0);
  // castle keep
  box(g, 10, 10, 10, PRIMARY, "Primary", -2, 9, 0);
  box(g, 4, 6, 4, PRIMARY, "Primary", -2, 17, 0);
  // battlements
  for (const x of [-5, -1, 3]) {
    box(g, 2.5, 2.5, 2.5, ACCENT, "Accent", x - 2, 15, 4);
  }
  // bucket
  cyl(g, 3.5, 4.2, 7, ACCENT, "Accent", 10, 5, 4);
  box(g, 1.2, 5, 1.2, SECONDARY, "Secondary", 10, 10, 4);
  // shovel
  box(g, 1.5, 12, 1.5, SECONDARY, "Secondary", 8, 10, -4);
  box(g, 5, 1.5, 4, ACCENT, "Accent", 8, 4, -4);
  return g;
}

/** Hanging wind chimes. */
function windChimes(): THREE.Group {
  const g = rootNamed("wind_chimes");
  box(g, 14, 1.5, 4, PRIMARY, "Primary", 0, 30, 0);
  cyl(g, 0.5, 0.5, 6, SECONDARY, "Secondary", 0, 34, 0);
  const tubes: Array<[number, number, number]> = [
    [-5, 14, 1.1],
    [-2.5, 18, 0.95],
    [0, 16, 1.05],
    [2.5, 20, 0.9],
    [5, 15, 1.15],
  ];
  for (const [x, h, r] of tubes) {
    cyl(g, r, r, h, ACCENT, "Accent", x, 30 - h / 2 - 1, 0);
  }
  // clapper
  cyl(g, 1.4, 1.4, 2, SECONDARY, "Secondary", 0, 14, 0);
  return g;
}

/** Compact sewing machine for a tabletop. */
function sewingMachine(): THREE.Group {
  const g = rootNamed("sewing_machine");
  box(g, 16, 2, 10, PRIMARY, "Primary", 0, 1, 0);
  box(g, 10, 6, 8, SECONDARY, "Secondary", -2, 5, 0);
  // arm
  box(g, 12, 3.5, 4, SECONDARY, "Secondary", 2, 10, 0);
  box(g, 3.5, 7, 4, SECONDARY, "Secondary", 7, 7, 0);
  // needle post
  box(g, 1.2, 5, 1.2, ACCENT, "Accent", 7, 4, 2);
  // handwheel
  cyl(g, 3, 3, 1.5, ACCENT, "Accent", -6, 7, 0, 0, Math.PI / 2);
  // spool
  cyl(g, 1.4, 1.4, 2.5, ACCENT, "Accent", 0, 13, 0);
  return g;
}

/** Mini trampoline with spring frame. */
function trampoline(): THREE.Group {
  const g = rootNamed("trampoline");
  // mat
  cyl(g, 22, 22, 1.6, PRIMARY, "Primary", 0, 10, 0);
  // rim
  const rim = part(
    new THREE.TorusGeometry(22, 1.8, 6, 18),
    SECONDARY,
    "Secondary",
    0,
    10,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  // legs
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    box(
      g,
      2.2,
      10,
      2.2,
      SECONDARY,
      "Secondary",
      Math.cos(a) * 18,
      5,
      Math.sin(a) * 18,
    );
  }
  // center accent pad
  cyl(g, 8, 8, 0.8, ACCENT, "Accent", 0, 11, 0);
  return g;
}

/** Pedestal bird bath with water. */
function birdBath(): THREE.Group {
  const g = rootNamed("bird_bath");
  cyl(g, 5, 7, 3, SECONDARY, "Secondary", 0, 1.5, 0);
  cyl(g, 2.8, 3.5, 12, PRIMARY, "Primary", 0, 9, 0);
  cyl(g, 10, 9, 3, PRIMARY, "Primary", 0, 16, 0);
  // water
  cyl(g, 7.5, 7.5, 1.2, ACCENT, "Accent", 0, 17.5, 0);
  // rim lip
  const rim = part(
    new THREE.TorusGeometry(9, 1.2, 6, 14),
    SECONDARY,
    "Secondary",
    0,
    17,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  return g;
}

/** Stone ring campfire with logs and flame. */
function campfirePit(): THREE.Group {
  const g = rootNamed("campfire_pit");
  // ground ash
  cyl(g, 14, 16, 2, SECONDARY, "Secondary", 0, 1, 0);
  // stones
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(
      g,
      5,
      4,
      5,
      PRIMARY,
      "Primary",
      Math.cos(a) * 14,
      3,
      Math.sin(a) * 14,
    );
  }
  // crossed logs
  box(g, 18, 3, 3.5, SECONDARY, "Secondary", 0, 4, 0);
  const log2 = part(
    new THREE.BoxGeometry(1, 1, 1),
    SECONDARY,
    "Secondary",
    0,
    5.5,
    0,
    18,
    3,
    3.5,
  );
  log2.rotation.y = Math.PI / 2.5;
  g.add(log2);
  // flame
  cyl(g, 0.5, 4, 10, ACCENT, "Accent", 0, 12, 0);
  cyl(g, 0.3, 2.5, 7, PRIMARY, "Primary", 1.5, 11, 1);
  return g;
}

/** Upright piano with keys and music rack. */
function piano(): THREE.Group {
  const g = rootNamed("piano");
  // body
  box(g, 48, 28, 16, PRIMARY, "Primary", 0, 16, -2);
  // keyboard shelf
  box(g, 44, 2.5, 10, SECONDARY, "Secondary", 0, 14, 8);
  // keys strip
  box(g, 40, 1.4, 7, ACCENT, "Accent", 0, 15.8, 9);
  // black key nubs
  for (const x of [-14, -8, -2, 4, 10]) {
    box(g, 2.2, 1.6, 4, SECONDARY, "Secondary", x, 16.6, 8);
  }
  // music stand
  box(g, 28, 10, 1.5, SECONDARY, "Secondary", 0, 28, 4);
  // legs
  for (const x of [-18, 18]) {
    box(g, 4, 12, 4, SECONDARY, "Secondary", x, 6, 2);
  }
  // pedal board
  box(g, 16, 2, 4, ACCENT, "Accent", 0, 2, 8);
  return g;
}

/** Puzzle table with scattered piece shapes. */
function puzzleTable(): THREE.Group {
  const g = rootNamed("puzzle_table");
  box(g, 48, 2.5, 26, PRIMARY, "Primary", 0, 14, 0);
  for (const [x, z] of [
    [-20, -10],
    [20, -10],
    [-20, 10],
    [20, 10],
  ] as const) {
    box(g, 3, 13, 3, SECONDARY, "Secondary", x, 6.5, z);
  }
  // puzzle board
  box(g, 28, 1.2, 16, ACCENT, "Accent", 0, 16, 0);
  // piece nubs
  box(g, 5, 1.4, 5, SECONDARY, "Secondary", -8, 17, -3);
  box(g, 5, 1.4, 5, PRIMARY, "Primary", -2, 17, 2);
  box(g, 5, 1.4, 5, SECONDARY, "Secondary", 6, 17, -2);
  box(g, 4, 1.4, 4, ACCENT, "Accent", 10, 17, 4);
  box(g, 4, 1.4, 4, PRIMARY, "Primary", -12, 17, 4);
  return g;
}

const BUILDERS: Record<string, () => THREE.Group> = {
  workbench,
  tool_rack: toolRack,
  fishing_spot: fishingSpot,
  craft_table: craftTable,
  pottery_wheel: potteryWheel,
  wood_shelf: woodShelf,
  lantern,
  sandcastle_kit: sandcastleKit,
  wind_chimes: windChimes,
  sewing_machine: sewingMachine,
  trampoline,
  bird_bath: birdBath,
  campfire_pit: campfirePit,
  piano,
  puzzle_table: puzzleTable,
};

/** Catalog ids that use procedural meshes instead of GLBs. */
export const PROCEDURAL_FURNITURE_IDS = Object.keys(BUILDERS);

export function hasProceduralFurniture(defId: string): boolean {
  return defId in BUILDERS;
}

/** Build a unique mesh for a catalog id, or null if none. */
export function buildProceduralFurniture(defId: string): THREE.Group | null {
  const build = BUILDERS[defId];
  return build ? build() : null;
}
