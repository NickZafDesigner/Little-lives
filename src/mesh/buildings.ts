import * as THREE from "three";
import { Palette } from "../game/palette";
import { TILE } from "../game/constants";
import { LOTS, type LotBounds } from "../world/lots";
import { LOT_INTERIORS } from "../world/rooms";
import type { LotId } from "../data/types";
import { matFlat, matClone } from "./materials";

export interface BuildingHandle {
  lotId: LotId;
  group: THREE.Group;
  roof: THREE.Group;
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Open = player inside: roof fades, camera-near walls cut away. */
  setRoofOpen(open: boolean): void;
  containsPoint(x: number, z: number, pad?: number): boolean;
}

/**
 * Sealed exterior shell from the street (full four walls + solid pitched roof).
 * When the player steps inside, the roof lifts/fades and the camera-near walls
 * cut away so the interior stays playable.
 */
const WALL_H = 56;
const ROOF_H = 36;
const WALL_T = TILE * 0.55;
const INNER_T = WALL_T / 2;
const INNER_H_NS = 44;
const INNER_H_EW = 26;
const PLINTH_H = 4;
const EAVE = 12;
const ROOF_OVERHANG_Z = 10;

const LOT_STYLE: Partial<
  Record<
    LotId,
    { wall: number; roof: number; trim: number; accent: number; floorTrim: number }
  >
> = {
  home: {
    wall: Palette.wall,
    roof: Palette.roof,
    trim: Palette.wallTrim,
    accent: Palette.wallTrim,
    floorTrim: Palette.woodDark,
  },
  neighbor: {
    wall: 0xffe4ec,
    roof: Palette.roseDark,
    trim: Palette.rose,
    accent: Palette.rose,
    floorTrim: Palette.woodDark,
  },
  cafe: {
    wall: 0xfff0d6,
    roof: Palette.woodDark,
    trim: Palette.cafe,
    accent: Palette.cafe,
    floorTrim: Palette.woodDeep,
  },
  shelter: {
    wall: 0xe8f4ff,
    roof: Palette.skyDeep,
    trim: Palette.shelter,
    accent: Palette.shelter,
    floorTrim: Palette.woodDark,
  },
  market: {
    wall: 0xfff8e1,
    roof: Palette.blushDark,
    trim: Palette.blush,
    accent: Palette.sunflower,
    floorTrim: Palette.woodDark,
  },
  library: {
    wall: 0xf3e5f5,
    roof: Palette.lavender,
    trim: 0x8d6e63,
    accent: Palette.lavender,
    floorTrim: Palette.woodDeep,
  },
  clinic: {
    wall: 0xe0f2f1,
    roof: Palette.mintDark,
    trim: Palette.mint,
    accent: Palette.mint,
    floorTrim: Palette.woodDark,
  },
};

const DOOR_TX: Partial<Record<LotId, number>> = {
  home: 7,
  neighbor: 5,
  cafe: 6,
  shelter: 6,
  market: 6,
  library: 6,
  clinic: 6,
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
  material?: THREE.MeshLambertMaterial,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material ?? matFlat(color),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addInternalWalls(
  group: THREE.Group,
  lot: LotBounds,
  wallColor: number,
  trimColor: number,
) {
  const interior = LOT_INTERIORS[lot.id];
  if (!interior) return;
  const half = TILE / 2;
  const base = 0.35;

  for (const run of interior.walls) {
    const doors = new Set(run.doors ?? []);
    const h = run.axis === "y" ? INNER_H_NS : INNER_H_EW;
    const along = TILE;
    const thick = INNER_T;

    for (let i = 0; i < run.length; i++) {
      const tx = lot.tx + (run.axis === "x" ? run.rx + i : run.rx);
      const ty = lot.ty + (run.axis === "y" ? run.ry + i : run.ry);
      const cx = tx * TILE + half;
      const cz = ty * TILE + half;

      if (doors.has(i)) {
        const post = 3.2;
        const postH = Math.min(h, 28);
        if (run.axis === "x") {
          box(group, post, postH, thick + 1.5, trimColor, cx - half + 1.5, base + postH / 2, cz);
          box(group, post, postH, thick + 1.5, trimColor, cx + half - 1.5, base + postH / 2, cz);
          box(group, TILE * 0.7, 2.2, thick + 2, trimColor, cx, base + postH, cz);
        } else {
          box(group, thick + 1.5, postH, post, trimColor, cx, base + postH / 2, cz - half + 1.5);
          box(group, thick + 1.5, postH, post, trimColor, cx, base + postH / 2, cz + half - 1.5);
          box(group, thick + 2, 2.2, TILE * 0.7, trimColor, cx, base + postH, cz);
        }
        continue;
      }

      if (run.axis === "x") {
        box(group, along, h, thick, wallColor, cx, base + h / 2, cz);
      } else {
        box(group, thick, h, along, wallColor, cx, base + h / 2, cz);
      }
    }
  }
}

/** One solid pitched roof prism — no two-box ridge gap. */
function makeRoofPrism(
  length: number,
  halfDepth: number,
  rise: number,
  mat: THREE.MeshLambertMaterial,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-(halfDepth + ROOF_OVERHANG_Z), 0);
  shape.lineTo(halfDepth + ROOF_OVERHANG_Z, 0);
  shape.lineTo(0, rise);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  // Center extrusion on local Z, then rotate so extrude axis = world X.
  geo.translate(0, 0, -length / 2);
  geo.rotateY(-Math.PI / 2);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function fadeGroup(
  root: THREE.Object3D,
  opacity: number,
  liftY: number,
) {
  root.position.y = liftY;
  root.visible = opacity > 0.02;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const m = obj.material;
    if (!(m instanceof THREE.MeshLambertMaterial)) return;
    const fading = opacity < 0.995;
    m.transparent = fading;
    m.opacity = opacity;
    m.depthWrite = !fading;
    obj.castShadow = opacity > 0.85;
  });
}

function buildHouse(lot: LotBounds): BuildingHandle {
  const style = LOT_STYLE[lot.id] ?? {
    wall: Palette.wall,
    roof: Palette.roof,
    trim: Palette.wallTrim,
    accent: Palette.wallTrim,
    floorTrim: Palette.woodDark,
  };

  const group = new THREE.Group();
  group.name = `building_${lot.id}`;

  const minX = lot.tx * TILE;
  const maxX = (lot.tx + lot.tw) * TILE;
  const minZ = lot.ty * TILE;
  const maxZ = (lot.ty + lot.th) * TILE;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = lot.tw * TILE;
  const d = lot.th * TILE;

  const t = WALL_T;
  const half = TILE / 2;
  const base = 0.35;
  const northZ = minZ + half;
  const southZ = maxZ - half;
  const westX = minX + half;
  const eastX = maxX - half;
  const wallSpanX = eastX - westX;
  const wallSpanZ = southZ - northZ;
  const wallTopY = base + WALL_H;

  const doorCx = (lot.tx + (DOOR_TX[lot.id] ?? 6)) * TILE + half;
  const doorW = TILE * 1.55;
  const leftW = Math.max(2, doorCx - doorW / 2 - westX);
  const rightW = Math.max(2, eastX - (doorCx + doorW / 2));

  // Footing
  box(group, w + 10, PLINTH_H, d + 10, style.floorTrim, cx, PLINTH_H / 2, cz);

  // --- Always-on far walls (camera-far: north + west) ---
  box(group, wallSpanX + t, WALL_H, t, style.wall, cx, base + WALL_H / 2, northZ);
  box(group, t, WALL_H, wallSpanZ + t, style.wall, westX, base + WALL_H / 2, cz);

  // Far corner posts (flush with wall plate — never pierce the roof)
  const postT = t * 1.4;
  box(group, postT, WALL_H, postT, style.trim, westX, base + WALL_H / 2, northZ);
  box(group, postT, WALL_H, postT, style.trim, eastX, base + WALL_H / 2, northZ);

  // Far-wall windows
  const winY = base + WALL_H * 0.5;
  const pane = 0x2f3d4d;
  for (let i = 2; i < lot.tw - 2; i += 3) {
    const wx = (lot.tx + i) * TILE + half;
    box(group, 18, 16, 1.6, style.trim, wx, winY, northZ + t / 2 + 0.4);
    box(group, 14, 12, 0.6, pane, wx, winY, northZ + t / 2 + 1.2);
  }
  for (let i = 2; i < lot.th - 2; i += 3) {
    const wz = (lot.ty + i) * TILE + half;
    box(group, 1.6, 16, 18, style.trim, westX + t / 2 + 0.4, winY, wz);
    box(group, 0.6, 12, 14, pane, westX + t / 2 + 1.2, winY, wz);
  }

  // Accent belt under the eaves (reads as finished trim from the street)
  box(
    group,
    wallSpanX + t * 2 + 2,
    3,
    t + 1.2,
    style.accent,
    cx,
    wallTopY - 1.5,
    northZ,
  );
  box(
    group,
    t + 1.2,
    3,
    wallSpanZ + t * 2 + 2,
    style.accent,
    westX,
    wallTopY - 1.5,
    cz,
  );

  // --- Camera-near walls: full height outside, cut away when inside ---
  const near = new THREE.Group();
  near.name = "near_walls";

  // South wall with door gap
  box(near, leftW, WALL_H, t, style.wall, westX + leftW / 2, base + WALL_H / 2, southZ);
  box(near, rightW, WALL_H, t, style.wall, eastX - rightW / 2, base + WALL_H / 2, southZ);
  // Lintel over the door
  box(
    near,
    doorW + 2,
    WALL_H * 0.28,
    t,
    style.wall,
    doorCx,
    wallTopY - (WALL_H * 0.28) / 2,
    southZ,
  );
  // East wall
  box(near, t, WALL_H, wallSpanZ + t, style.wall, eastX, base + WALL_H / 2, cz);

  // Near corner posts
  box(near, postT, WALL_H, postT, style.trim, westX, base + WALL_H / 2, southZ);
  box(near, postT, WALL_H, postT, style.trim, eastX, base + WALL_H / 2, southZ);

  // Street-facing windows
  for (let i = 2; i < lot.tw - 2; i += 3) {
    const wx = (lot.tx + i) * TILE + half;
    if (Math.abs(wx - doorCx) < doorW) continue;
    box(near, 18, 16, 1.6, style.trim, wx, winY, southZ - t / 2 - 0.4);
    box(near, 14, 12, 0.6, pane, wx, winY, southZ - t / 2 - 1.2);
  }
  for (let i = 2; i < lot.th - 2; i += 3) {
    const wz = (lot.ty + i) * TILE + half;
    box(near, 1.6, 16, 18, style.trim, eastX - t / 2 - 0.4, winY, wz);
    box(near, 0.6, 12, 14, pane, eastX - t / 2 - 1.2, winY, wz);
  }

  // Accent belt on near faces
  box(
    near,
    leftW + 1,
    3,
    t + 1.2,
    style.accent,
    westX + leftW / 2,
    wallTopY - 1.5,
    southZ,
  );
  box(
    near,
    rightW + 1,
    3,
    t + 1.2,
    style.accent,
    eastX - rightW / 2,
    wallTopY - 1.5,
    southZ,
  );
  box(
    near,
    t + 1.2,
    3,
    wallSpanZ + t * 2 + 2,
    style.accent,
    eastX,
    wallTopY - 1.5,
    cz,
  );

  group.add(near);

  // Door frame + canopy (stays with the shell so the entrance reads from outside)
  const jambH = WALL_H * 0.72;
  box(group, 4, jambH, 4, style.trim, doorCx - doorW / 2, base + jambH / 2, southZ + 1);
  box(group, 4, jambH, 4, style.trim, doorCx + doorW / 2, base + jambH / 2, southZ + 1);
  box(group, doorW + 14, 3.5, TILE * 0.85, style.trim, doorCx, base + jambH + 1, southZ + 5);
  box(group, doorW, 1.2, TILE * 0.7, style.floorTrim, doorCx, base + 1.8, southZ + 1);

  addInternalWalls(group, lot, style.wall, style.trim);

  // --- Solid pitched roof (single extruded prism) ---
  const roof = new THREE.Group();
  roof.name = "roof";
  roof.renderOrder = 2;

  const roofMat = matClone(style.roof);
  // Slight shade variation baked into one solid prism (no two-slab ridge gap).
  roofMat.color.setHex(style.roof);
  const roofLen = wallSpanX + EAVE * 2;
  const halfD = wallSpanZ / 2;

  const prism = makeRoofPrism(roofLen, halfD, ROOF_H, roofMat);
  // Seat into the wall plate so eaves close flush — no daylight gap.
  prism.position.set(cx, wallTopY - 0.5, cz);
  prism.renderOrder = 2;
  roof.add(prism);

  // Gable end fills — close the triangle against the end walls
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-halfD, 0);
  gableShape.lineTo(halfD, 0);
  gableShape.lineTo(0, ROOF_H);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
    depth: t * 0.85,
    bevelEnabled: false,
  });
  for (const gx of [westX - t * 0.1, eastX + t * 0.1 - t * 0.85]) {
    const gable = new THREE.Mesh(gableGeo, matClone(style.wall));
    gable.rotation.y = Math.PI / 2;
    gable.position.set(gx, wallTopY - 0.5, cz);
    gable.castShadow = true;
    gable.renderOrder = 2;
    roof.add(gable);
  }

  // Ridge cap
  box(
    roof,
    roofLen,
    2.8,
    4.5,
    style.trim,
    cx,
    wallTopY - 0.5 + ROOF_H,
    cz,
    matClone(style.trim),
  );

  if (lot.id === "home") {
    box(
      roof,
      9,
      16,
      9,
      Palette.wallShade,
      cx + w * 0.28,
      wallTopY - 0.5 + ROOF_H * 0.45,
      cz - halfD * 0.3,
      matClone(Palette.wallShade),
    );
    box(
      roof,
      11,
      3,
      11,
      Palette.roofDark,
      cx + w * 0.28,
      wallTopY - 0.5 + ROOF_H * 0.45 + 9,
      cz - halfD * 0.3,
      matClone(Palette.roofDark),
    );
  }

  group.add(roof);
  roof.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.renderOrder = 2;
  });

  // Clone materials on near walls so fade is per-building
  near.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshLambertMaterial) {
      obj.material = obj.material.clone();
    }
  });

  let open = false;
  let roofOpacity = 1;
  let roofLift = 0;
  let nearOpacity = 1;

  const setRoofOpen = (next: boolean) => {
    open = next;
  };

  const update = (dt: number) => {
    const k = Math.min(1, dt * 4.5);
    const targetRoof = open ? 0 : 1;
    const targetNear = open ? 0 : 1;
    const targetLift = open ? 52 : 0;

    roofOpacity += (targetRoof - roofOpacity) * k;
    nearOpacity += (targetNear - nearOpacity) * k;
    roofLift += (targetLift - roofLift) * k;

    fadeGroup(roof, roofOpacity, roofLift);
    fadeGroup(near, nearOpacity, 0);
  };

  (group as THREE.Group & { _updateRoof?: (dt: number) => void })._updateRoof =
    update;

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
  update: (dt: number) => void;
} {
  const group = new THREE.Group();
  group.name = "buildings";
  const buildings: BuildingHandle[] = [];

  for (const lot of LOTS) {
    if (lot.id === "park") continue;
    const b = buildHouse(lot);
    group.add(b.group);
    buildings.push(b);
  }

  return {
    group,
    buildings,
    update(dt: number) {
      for (const b of buildings) {
        const g = b.group as THREE.Group & { _updateRoof?: (dt: number) => void };
        g._updateRoof?.(dt);
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
