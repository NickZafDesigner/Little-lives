import * as THREE from "three";
import type { Dir, PetDef, PlacedFurniture } from "../data/types";
import { Palette } from "../game/palette";
import { TILE } from "../game/constants";
import { furnitureById } from "../data/furniture";
import { mat } from "./materials";
import { mix, tint } from "./colors";

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

/* ------------------------------------------------------------------ *
 * Primitives. Every builder works in world units with y = 0 as floor
 * and the origin at the centre of the tile footprint.
 * ------------------------------------------------------------------ */

function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(
  parent: THREE.Object3D,
  rTop: number,
  rBottom: number,
  h: number,
  color: number,
  x: number,
  y: number,
  z: number,
  seg = 10,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, h, seg),
    mat(color),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function ball(
  parent: THREE.Object3D,
  r: number,
  color: number,
  x: number,
  y: number,
  z: number,
  seg = 10,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)),
    mat(color),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Horizontal ring, e.g. a bowl rim or a toilet seat. */
function ring(
  parent: THREE.Object3D,
  r: number,
  tube: number,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(r, tube, 6, 14),
    mat(color),
  );
  m.position.set(x, y, z);
  m.rotation.x = -Math.PI / 2;
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Capsule lying along the z axis, for limbs and bodies. */
function capsuleZ(
  parent: THREE.Object3D,
  r: number,
  len: number,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat(color));
  m.position.set(x, y, z);
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  parent.add(m);
  return m;
}

function glass(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Furniture
 * ------------------------------------------------------------------ */

const BOOK_COLORS = [
  Palette.rose,
  Palette.mint,
  Palette.sky,
  Palette.sunflower,
  Palette.lavender,
  Palette.blush,
  Palette.cream,
];

function buildBed(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const legH = 5;
  const legT = 5;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(
        g,
        legT,
        legH,
        legT,
        Palette.woodDeep,
        sx * (w / 2 - legT / 2),
        legH / 2,
        sz * (d / 2 - legT / 2),
      );
    }
  }
  box(g, w, 4, d, Palette.wood, 0, legH + 2, 0);

  const mattY = legH + 4;
  const mw = w - 6;
  const md = d - 6;
  box(g, mw, 8, md, Palette.cream, 0, mattY + 4, 0);
  box(g, mw + 1, 1.5, md, a, 0, mattY + 8.5, 0);

  // Duvet over the foot two thirds, with a folded-back top edge
  const duvD = md * 0.6;
  box(g, mw + 2, 5, duvD, c, 0, mattY + 11, md / 2 - duvD / 2);
  box(g, mw + 2, 3.5, 6, mix(c, Palette.white, 0.3), 0, mattY + 12, md / 2 - duvD + 1);

  // Pillows at the head end
  for (const sx of [-1, 1]) {
    box(
      g,
      mw / 2 - 3,
      6,
      13,
      Palette.white,
      sx * (mw / 4 + 0.5),
      mattY + 11.5,
      -md / 2 + 8,
    );
  }

  // Headboard with slats, plus a low footboard
  box(g, w, 24, 4, Palette.wood, 0, legH + 12, -d / 2 + 2);
  for (const sx of [-1, 0, 1]) {
    box(g, 5, 17, 1.5, Palette.woodDark, sx * (w / 4), legH + 12, -d / 2 + 4.4);
  }
  box(g, w, 9, 4, Palette.wood, 0, legH + 4.5, d / 2 - 2);
}

function buildFridge(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const H = 42;
  const bodyY = 2;
  box(g, w, H, d, c, 0, bodyY + H / 2, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, 3, 2, 3, Palette.inkSoft, sx * (w / 2 - 3), 1, sz * (d / 2 - 3));
    }
  }
  // Doors sit slightly proud so the seam between them reads
  const doorZ = d / 2 + 0.8;
  const light = mix(c, Palette.white, 0.6);
  box(g, w - 3, 13, 1.6, light, 0, bodyY + H - 8, doorZ);
  box(g, w - 3, 23, 1.6, light, 0, bodyY + 12, doorZ);
  for (const [hy, hh] of [
    [bodyY + H - 8, 7],
    [bodyY + 14, 10],
  ] as const) {
    box(g, 1.6, hh, 2.4, a, w / 2 - 4.5, hy, doorZ + 1.4);
  }
  box(g, w + 1, 2, d + 1, tint(c, 0.92), 0, bodyY + H + 1, 0);
  box(g, 3.5, 3.5, 0.8, Palette.sunflower, -w / 4, bodyY + 18, doorZ + 1.2);
}

function buildToilet(g: THREE.Group, c: number, a: number) {
  cyl(g, 5, 7.5, 11, c, 0, 5.5, 3, 10);
  cyl(g, 8.5, 6.5, 8, c, 0, 15, 3, 12);
  cyl(g, 7, 7, 1, a, 0, 18.4, 3, 12).receiveShadow = true;
  const seat = ring(g, 7.4, 1.5, tint(c, 0.98), 0, 19.3, 3);
  seat.scale.z = 1.1;
  // Cistern
  box(g, 15, 15, 7, c, 0, 19.5, -8);
  box(g, 16.5, 2, 8.5, tint(c, 0.95), 0, 27.5, -8);
  cyl(g, 1.6, 1.6, 1.2, a, 0, 28.6, -8, 8);
  box(g, 4, 6, 3, tint(c, 0.9), 0, 22, -3.5);
}

function buildShower(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const H = 40;
  box(g, w, 2.5, d, a, 0, 1.25, 0);
  const rim = tint(a, 0.88);
  box(g, w, 2, 2, rim, 0, 2.5, -d / 2 + 1);
  box(g, w, 2, 2, rim, 0, 2.5, d / 2 - 1);
  box(g, 2, 2, d, rim, -w / 2 + 1, 2.5, 0);
  box(g, 2, 2, d, rim, w / 2 - 1, 2.5, 0);

  // Tiled back and side walls
  const tileCol = mix(a, Palette.sky, 0.18);
  box(g, w, H, 2, tileCol, 0, H / 2, -d / 2 + 1);
  box(g, 2, H, d, tileCol, -w / 2 + 1, H / 2, 0);

  // Glass screen on the two open sides, leaving a gap to step through
  const gl = mat(c, { transparent: true, opacity: 0.3 });
  const panelA = new THREE.Mesh(new THREE.BoxGeometry(1.6, H - 4, d - 2), gl);
  panelA.position.set(w / 2 - 1, (H - 4) / 2 + 2.5, 0);
  glass(panelA);
  g.add(panelA);
  const panelB = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, H - 4, 1.6), gl);
  panelB.position.set(-w * 0.28, (H - 4) / 2 + 2.5, d / 2 - 1);
  glass(panelB);
  g.add(panelB);

  // Riser, arm and head
  const px = -w / 2 + 5.5;
  const pz = -d / 2 + 5;
  cyl(g, 1, 1, 26, Palette.inkSoft, px, 15, pz, 8);
  box(g, 2, 2, 8, Palette.inkSoft, px, 29, pz + 4.5);
  cyl(g, 4.5, 3.6, 2, Palette.inkSoft, px, 28, pz + 8.5, 10);
  ball(g, 1.7, tint(Palette.inkSoft, 1.2), px, 10, pz + 3.5, 8);
}

function buildSofa(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const legH = 5;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(
        g,
        4,
        legH,
        4,
        Palette.woodDeep,
        sx * (w / 2 - 4),
        legH / 2,
        sz * (d / 2 - 4),
      );
    }
  }
  box(g, w, 8, d, a, 0, legH + 4, 0);

  // Seat cushions
  const cw = (w - 16) / 2;
  for (const sx of [-1, 1]) {
    const cushion = box(g, cw, 7, d - 9, c, sx * (cw / 2 + 1), legH + 11.5, 2);
    cushion.receiveShadow = true;
  }
  // Back and back cushions
  box(g, w, 20, 6, a, 0, legH + 18, -d / 2 + 3);
  for (const sx of [-1, 1]) {
    box(g, cw, 13, 5, mix(c, Palette.white, 0.14), sx * (cw / 2 + 1), legH + 17, -d / 2 + 7.5);
  }
  // Arms with rolled tops
  for (const sx of [-1, 1]) {
    box(g, 6, 15, d, a, sx * (w / 2 - 3), legH + 7.5, 0);
    const roll = cyl(g, 3, 3, d, a, sx * (w / 2 - 3), legH + 15, 0, 10);
    roll.rotation.x = Math.PI / 2;
  }
  const pillow = box(g, 12, 12, 4, Palette.rose, -cw / 2, legH + 17, -d / 2 + 11);
  pillow.rotation.z = 0.35;
}

function buildTv(g: THREE.Group, w: number, d: number, c: number, a: number) {
  // Media unit
  box(g, w, 11, d - 2, Palette.wood, 0, 8.5, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, 3, 3, 3, Palette.woodDeep, sx * (w / 2 - 3), 1.5, sz * (d / 2 - 4));
    }
  }
  box(g, w - 7, 1, 1, Palette.woodDark, 0, 8.5, (d - 2) / 2 + 0.6);
  // Screen on a pedestal
  box(g, 9, 2.5, 7, c, 0, 15.3, 0);
  box(g, w - 3, 15, 2.5, c, 0, 24, 0);
  const screen = box(g, w - 7, 11.5, 0.8, a, 0, 24, 1.7);
  screen.castShadow = false;
  box(g, w - 11, 1.2, 0.4, mix(a, Palette.white, 0.55), 0, 26, 2.2);
  box(g, 16, 2.5, 4, tint(c, 1.5), 0, 15.5, 6);
}

function buildTable(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const topY = 23;
  box(g, w, 3.5, d, c, 0, topY, 0).receiveShadow = true;
  box(g, w - 8, 3, d - 8, a, 0, topY - 3, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, 4.5, topY - 2, 4.5, a, sx * (w / 2 - 5), (topY - 2) / 2, sz * (d / 2 - 5));
    }
  }
  // A placemat, mug and little vase so the surface isn't bare
  box(g, 14, 0.6, 10, Palette.cream, -w / 5, topY + 2.1, 0);
  cyl(g, 2.6, 2.2, 4.5, Palette.white, -w / 5, topY + 4.3, 0, 10);
  const handle = ring(g, 1.7, 0.5, Palette.white, -w / 5 + 3, topY + 4.3, 0);
  handle.rotation.x = 0;
  handle.rotation.y = Math.PI / 2;
  cyl(g, 2, 2.8, 5.5, Palette.mint, w / 5, topY + 4.5, 0, 8);
  cyl(g, 0.6, 0.6, 5, Palette.leaf, w / 5, topY + 8.5, 0, 6);
  ball(g, 2.2, Palette.rose, w / 5, topY + 11, 0, 8);
}

function buildPlant(g: THREE.Group, c: number, a: number) {
  const potCol = mix(a, Palette.blush, 0.35);
  cyl(g, 7.5, 5.5, 13, potCol, 0, 6.5, 0, 10);
  cyl(g, 8.2, 8.2, 2.2, tint(potCol, 0.9), 0, 13, 0, 10);
  cyl(g, 7, 7, 1.2, Palette.woodDeep, 0, 13.6, 0, 10);
  cyl(g, 1.1, 1.5, 15, tint(c, 0.75), 0, 20.5, 0, 6);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const y = 19 + (i % 3) * 3.6;
    const leaf = ball(
      g,
      5.2,
      i % 2 ? c : Palette.leafLight,
      Math.cos(ang) * 4.6,
      y,
      Math.sin(ang) * 4.6,
      8,
    );
    leaf.scale.set(1, 0.28, 1.5);
    leaf.rotation.y = -ang;
    leaf.rotation.x = -0.22;
  }
  ball(g, 2.1, Palette.rose, 0, 30, 0, 8);
}

function buildBookshelf(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const H = 42;
  for (const sx of [-1, 1]) {
    box(g, 2.5, H, d, c, sx * (w / 2 - 1.25), H / 2, 0);
  }
  box(g, w, 2.5, d, c, 0, H - 1.25, 0);
  box(g, w, 2.5, d, c, 0, 1.25, 0);
  box(g, w - 5, H - 5, 1.2, tint(c, 0.82), 0, H / 2, -d / 2 + 0.6);

  const tiers = [2.5, 15.5, 28.5];
  for (const [i, base] of tiers.entries()) {
    if (i > 0) box(g, w - 5, 2, d - 2, tint(c, 1.08), 0, base, 0);
    let x = -(w / 2 - 4);
    let n = 0;
    while (x < w / 2 - 6 && n < 7) {
      const bw = 2.2 + ((n * 7 + i * 3) % 4) * 0.5;
      const bh = 8.5 + ((n * 5 + i) % 4) * 0.9;
      const col = BOOK_COLORS[(n + i * 2) % BOOK_COLORS.length];
      const bk = box(g, bw, bh, d - 4, col, x + bw / 2, base + 1 + bh / 2, 0.5);
      // One leaning book per shelf adds life
      if (n === 4) {
        bk.rotation.z = 0.22;
        bk.position.y = base + 1 + bh / 2 - 0.4;
      }
      x += bw + 0.7;
      n++;
    }
  }
  // Top decor
  cyl(g, 3, 2.4, 4, mix(a, Palette.blush, 0.4), w / 4, H + 2, 0, 8);
  ball(g, 3.2, Palette.leafLight, w / 4, H + 5.5, 0, 8);
}

function buildPetBed(g: THREE.Group, c: number, a: number) {
  const base = cyl(g, 12.5, 11, 4, c, 0, 2, 0, 14);
  base.scale.z = 0.85;
  const rim = ring(g, 11.4, 2.6, tint(c, 0.92), 0, 4.2, 0);
  rim.scale.z = 0.85;
  const cushion = cyl(g, 9, 9, 2.6, a, 0, 4.3, 0, 14);
  cushion.scale.z = 0.85;
  cushion.receiveShadow = true;
  // Paw print on the cushion
  ball(g, 1.1, tint(a, 0.86), 0, 5.5, -0.6, 6).scale.y = 0.3;
  for (const dx of [-1.6, 0, 1.6]) {
    ball(g, 0.6, tint(a, 0.86), dx, 5.5, 1.8, 6).scale.y = 0.3;
  }
}

function buildPetBowl(g: THREE.Group, c: number, a: number) {
  box(g, 20, 0.8, 15, mix(a, Palette.white, 0.55), 0, 0.4, 0).receiveShadow = true;
  cyl(g, 6.5, 4.5, 5.5, c, 0, 3.5, 0, 14);
  ring(g, 6.4, 0.9, tint(c, 0.9), 0, 6.1, 0);
  cyl(g, 5.4, 5.4, 1.2, mix(a, Palette.woodDark, 0.45), 0, 5.6, 0, 14);
  for (const [dx, dz] of [
    [-1.8, 0.8],
    [1.6, -1.2],
    [0.4, 1.9],
  ] as const) {
    ball(g, 1.2, mix(a, Palette.woodDark, 0.25), dx, 6.4, dz, 6);
  }
}

function buildToyBall(g: THREE.Group, c: number, a: number) {
  ball(g, 7, c, 0, 7, 0, 16);
  const flat = ring(g, 7.05, 1.05, a, 0, 7, 0);
  flat.rotation.x = 0;
  const upright = ring(g, 7.05, 1.05, a, 0, 7, 0);
  upright.rotation.set(0, Math.PI / 2, 0);
}

function buildCounter(g: THREE.Group, w: number, d: number, c: number, a: number) {
  box(g, w - 2, 24, d - 2, c, 0, 12, 0);
  box(g, w - 8, 4, 2, Palette.woodDeep, 0, 2.5, (d - 2) / 2 - 0.5);
  box(g, w, 4, d + 2, a, 0, 26, 0).receiveShadow = true;
  for (const sx of [-1, 1]) {
    box(g, w / 2 - 8, 14, 1, tint(c, 0.88), sx * (w / 4), 14, (d - 2) / 2 + 0.6);
  }
  // Espresso machine and a cake stand on top
  box(g, 15, 11, 11, Palette.inkSoft, w / 4, 33.5, -2);
  box(g, 4, 3, 3, tint(Palette.inkSoft, 1.3), w / 4, 30, 4);
  for (const dx of [-3.5, 3.5]) {
    cyl(g, 2.3, 1.9, 3.4, Palette.white, w / 4 + dx, 29.7, 6, 8);
  }
  cyl(g, 5.5, 4, 1.2, Palette.white, -w / 4, 28.6, 0, 12);
  cyl(g, 4, 4, 4.5, Palette.cream, -w / 4, 31.4, 0, 12);
  ball(g, 1.2, Palette.rose, -w / 4, 34, 0, 8);
}

function buildParkBench(g: THREE.Group, w: number, d: number, c: number, a: number) {
  const seatY = 15;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, 3.5, seatY, 3.5, a, sx * (w / 2 - 4), seatY / 2, sz * (d / 2 - 5));
    }
  }
  for (const dz of [-6.5, 0, 6.5]) {
    box(g, w, 3, 6, c, 0, seatY + 1.5, dz).receiveShadow = true;
  }
  for (const sx of [-1, 1]) {
    box(g, 3.5, 20, 3.5, a, sx * (w / 2 - 4), seatY + 10, -d / 2 + 2.5);
    box(g, 5, 3, 15, a, sx * (w / 2 - 4), seatY + 9, -1);
  }
  for (const hy of [seatY + 10, seatY + 17]) {
    box(g, w, 5, 3, c, 0, hy, -d / 2 + 2.5);
  }
}

function buildShelterDesk(g: THREE.Group, w: number, d: number, c: number, a: number) {
  box(g, w - 2, 24, d - 2, c, 0, 12, 0);
  box(g, w, 4, d + 2, a, 0, 26, 0).receiveShadow = true;
  box(g, w - 14, 14, 1, tint(c, 0.88), 0, 14, (d - 2) / 2 + 0.6);
  // Clipboard
  const board = box(g, 9, 0.8, 12, Palette.white, w / 4, 28.5, 2);
  board.rotation.y = 0.3;
  for (const dz of [-3, 0, 3]) {
    const line = box(g, 6, 0.3, 0.8, Palette.creamDark, w / 4, 29, 2 + dz);
    line.rotation.y = 0.3;
  }
  // Pen cup
  cyl(g, 2.4, 2, 4.2, Palette.mint, 4, 30.1, -4, 8);
  box(g, 0.7, 6, 0.7, Palette.rose, 3, 32.5, -4);
  box(g, 0.7, 6, 0.7, Palette.sky, 5.2, 32.8, -4.5);
  // Little adoption sign
  box(g, 1.6, 10, 1.6, Palette.woodDark, -w / 4, 33, -2);
  box(g, 15, 8, 1, Palette.cream, -w / 4, 41, -2);
  const heart = box(g, 4, 4, 0.6, Palette.rose, -w / 4, 41, -1.2);
  heart.rotation.z = Math.PI / 4;
}

function buildCrate(g: THREE.Group, w: number, d: number, c: number, a: number) {
  box(g, w, 14, d, c, 0, 7, 0);
  for (const hy of [1.5, 12.5]) {
    box(g, w + 0.6, 2, d + 0.6, a, 0, hy, 0);
  }
}

export function createFurnitureMesh(defId: string): THREE.Group {
  const root = new THREE.Group();
  root.name = `furn_${defId}`;
  const def = furnitureById[defId];
  const c = def?.color ?? Palette.wood;
  const a = def?.accent ?? Palette.woodDark;
  // Models fill their tile footprint, leaving a small gap to neighbours
  const w = (def?.width ?? 1) * TILE - 5;
  const d = (def?.height ?? 1) * TILE - 5;

  switch (defId) {
    case "bed":
      buildBed(root, w, d, c, a);
      break;
    case "fridge":
      buildFridge(root, w - 2, d - 4, c, a);
      break;
    case "toilet":
      buildToilet(root, c, a);
      break;
    case "shower":
      buildShower(root, w, d, c, a);
      break;
    case "sofa":
      buildSofa(root, w, d, c, a);
      break;
    case "tv":
      buildTv(root, w - 2, d - 6, c, a);
      break;
    case "table":
      buildTable(root, w, d, c, a);
      break;
    case "plant":
      buildPlant(root, c, a);
      break;
    case "bookshelf":
      buildBookshelf(root, w, d - 12, c, a);
      break;
    case "pet_bed":
      buildPetBed(root, c, a);
      break;
    case "pet_bowl":
      buildPetBowl(root, c, a);
      break;
    case "toy_ball":
      buildToyBall(root, c, a);
      break;
    case "counter":
      buildCounter(root, w, d, c, a);
      break;
    case "park_bench":
      buildParkBench(root, w, d, c, a);
      break;
    case "shelter_desk":
      buildShelterDesk(root, w, d, c, a);
      break;
    case "library_desk":
      buildShelterDesk(root, w, d, c, a);
      break;
    case "clinic_desk":
      buildShelterDesk(root, w, d, c, a);
      break;
    default:
      buildCrate(root, w, d, c, a);
  }

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

/** A leg pivots at the hip so walking can swing it. */
function petLeg(
  parent: THREE.Object3D,
  color: number,
  paw: number,
  r: number,
  len: number,
  x: number,
  y: number,
  z: number,
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  cyl(g, r, r * 0.9, len, color, 0, -len / 2, 0, 8);
  ball(g, r * 1.15, paw, 0, -len + r * 0.4, r * 0.3, 8);
  parent.add(g);
  return g;
}

function eyesAndNose(
  body: THREE.Object3D,
  color: number,
  eyeY: number,
  eyeZ: number,
  eyeX: number,
  eyeR: number,
  noseY: number,
  noseZ: number,
  noseR: number,
  noseCol: number,
) {
  for (const sx of [-1, 1]) {
    ball(body, eyeR, Palette.ink, sx * eyeX, eyeY, eyeZ, 8);
    ball(body, eyeR * 0.34, Palette.white, sx * eyeX + eyeR * 0.3, eyeY + eyeR * 0.35, eyeZ + eyeR * 0.5, 5);
  }
  const nose = ball(body, noseR, noseCol, 0, noseY, noseZ, 8);
  nose.scale.set(1.3, 0.85, 0.8);
  void color;
}

interface PetBuild {
  body: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Object3D | null;
  hop: boolean;
}

function buildPet(def: PetDef): PetBuild {
  const body = new THREE.Group();
  const c = def.color;
  const a = def.accent;
  // Paws pick up only a hint of the accent — full accent reads as pink boots
  const paw = mix(c, mix(a, Palette.white, 0.5), 0.4);
  const legs: THREE.Group[] = [];
  let tail: THREE.Object3D | null = null;
  let hop = false;

  if (def.species === "cat") {
    const hipY = 6;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        legs.push(petLeg(body, c, paw, 1.6, hipY, sx * 2.9, hipY, sz * 4.4));
      }
    }
    capsuleZ(body, 4.4, 7, c, 0, hipY + 3.4, 0);
    ball(body, 4.2, c, 0, hipY + 3.6, -4.2);
    ball(body, 2.6, c, 0, hipY + 5.2, 5.6);
    const head = ball(body, 4, c, 0, hipY + 7, 7.2, 12);
    head.scale.z = 0.95;
    const muzzle = ball(body, 2.4, a, 0, hipY + 5.9, 10, 8);
    muzzle.scale.set(1.25, 0.85, 0.9);
    eyesAndNose(body, c, hipY + 7.6, 10.2, 1.7, 0.85, hipY + 6.4, 11.6, 0.6, Palette.rose);
    for (const sx of [-1, 1]) {
      const ear = cyl(body, 0.1, 2, 3.6, c, sx * 2.3, hipY + 10.4, 6.4, 4);
      ear.rotation.z = sx * 0.16;
      const inner = cyl(body, 0.1, 0.9, 1.8, a, sx * 2.3, hipY + 10, 6.9, 4);
      inner.rotation.z = sx * 0.16;
    }
    // Tail curling up behind
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, hipY + 4.4, -7.4);
    const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 6, 4, 8), mat(c));
    t1.position.set(0, 2.4, -1.4);
    t1.rotation.x = -0.5;
    t1.castShadow = true;
    tailGroup.add(t1);
    ball(tailGroup, 1.3, a, 0, 6, -3.4, 8);
    body.add(tailGroup);
    tail = tailGroup;
    // Chest bib rather than back stripes, which read as a ridge
    const bib = ball(body, 2.5, mix(a, Palette.white, 0.7), 0, hipY + 2.2, 5.2, 8);
    bib.scale.set(0.8, 1.1, 0.6);
  } else if (def.species === "dog") {
    const hipY = 6.8;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        legs.push(petLeg(body, c, paw, 2, hipY, sx * 3.4, hipY, sz * 4.8));
      }
    }
    capsuleZ(body, 5, 8, c, 0, hipY + 3.8, 0);
    ball(body, 4.8, c, 0, hipY + 4, -4.6);
    const head = ball(body, 4.4, c, 0, hipY + 7.4, 7.6, 12);
    head.scale.z = 0.96;
    const snout = ball(body, 2.7, a, 0, hipY + 6.1, 10.8, 10);
    snout.scale.set(1.05, 0.85, 1.2);
    ball(body, 1.1, Palette.ink, 0, hipY + 6.6, 13.6, 8).scale.set(1.3, 0.9, 0.8);
    for (const sx of [-1, 1]) {
      ball(body, 0.85, Palette.ink, sx * 1.8, hipY + 8.2, 10.8, 8);
      ball(body, 0.3, Palette.white, sx * 1.8 + 0.3, hipY + 8.5, 11.2, 5);
      // Floppy ears
      const ear = box(body, 2.2, 6, 3.6, tint(a, 0.9), sx * 4.3, hipY + 7, 7);
      ear.rotation.z = sx * 0.2;
    }
    ring(body, 3.4, 0.8, Palette.rose, 0, hipY + 5.6, 5).rotation.x = 0;
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, hipY + 4.6, -8.2);
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 5, 4, 8), mat(c));
    t.position.set(0, 2.2, -1.2);
    t.rotation.x = -0.7;
    t.castShadow = true;
    tailGroup.add(t);
    ball(tailGroup, 1.5, c, 0, 4.6, -2.8, 8);
    body.add(tailGroup);
    tail = tailGroup;
  } else {
    // Bunny
    hop = true;
    const hipY = 4.4;
    for (const sx of [-1, 1]) {
      legs.push(petLeg(body, c, paw, 1.5, hipY, sx * 2.4, hipY, 3.4));
      // Haunch and a big rounded back foot instead of a hind leg
      const haunch = ball(body, 3.4, c, sx * 2.6, hipY + 1.4, -2.4, 8);
      haunch.scale.set(0.8, 1, 1.1);
      const foot = ball(body, 2.3, paw, sx * 2.5, 1.5, -1, 8);
      foot.scale.set(0.8, 0.6, 1.5);
    }
    capsuleZ(body, 4.2, 4.6, c, 0, hipY + 3.2, 0);
    ball(body, 4, c, 0, hipY + 3.6, -3.4);
    const head = ball(body, 3.8, c, 0, hipY + 5.8, 4.6, 12);
    head.scale.z = 0.94;
    const muzzle = ball(body, 2.2, c, 0, hipY + 4.8, 7, 8);
    muzzle.scale.set(1.2, 0.8, 0.85);
    eyesAndNose(body, c, hipY + 6.4, 7.2, 1.7, 0.8, hipY + 5.2, 8.5, 0.55, Palette.rose);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 5.5, 4, 8), mat(c));
      ear.position.set(sx * 1.9, hipY + 10.4, 3.6);
      ear.rotation.z = sx * 0.22;
      ear.rotation.x = -0.18;
      ear.castShadow = true;
      body.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 4, 4, 6), mat(a));
      inner.position.set(sx * 1.9, hipY + 10.6, 4.4);
      inner.rotation.z = sx * 0.22;
      inner.rotation.x = -0.18;
      body.add(inner);
    }
    ball(body, 2.2, a, 0, hipY + 4, -7, 8);
  }

  return { body, legs, tail, hop };
}

export function createPet(def: PetDef): PetHandle {
  const root = new THREE.Group();
  root.name = `pet_${def.id}`;
  const built = buildPet(def);
  const body = built.body;
  root.add(body);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.12;
  shadow.scale.z = 1.25;
  root.add(shadow);

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
        if (built.hop) {
          // Bunnies hop instead of trotting
          const t = (clock * 3) % 1;
          body.position.y = Math.sin(t * Math.PI) * 5;
          body.rotation.x = Math.sin(t * Math.PI) * -0.2;
          for (const [i, leg] of built.legs.entries()) {
            leg.rotation.x = Math.sin(t * Math.PI) * (i % 2 ? 0.7 : 0.6);
          }
        } else {
          const swing = Math.sin(clock * 11);
          body.position.y = Math.abs(Math.sin(clock * 11)) * 0.9;
          for (const [i, leg] of built.legs.entries()) {
            // Diagonal pairs move together, like a real trot
            const phase = i === 0 || i === 3 ? swing : -swing;
            leg.rotation.x = phase * 0.6;
          }
        }
        if (built.tail) built.tail.rotation.z = Math.sin(clock * 9) * 0.25;
      } else {
        body.position.y += (0 - body.position.y) * Math.min(1, dt * 8);
        body.rotation.x += (0 - body.rotation.x) * Math.min(1, dt * 8);
        for (const leg of built.legs) {
          leg.rotation.x += (0 - leg.rotation.x) * Math.min(1, dt * 8);
        }
        // Idle tail flick
        if (built.tail) built.tail.rotation.z = Math.sin(clock * 1.8) * 0.12;
      }
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
