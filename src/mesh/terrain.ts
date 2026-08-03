import * as THREE from "three";
import { Palette } from "../game/palette";
import { TILE } from "../game/constants";
import { Tile, MAP_H, MAP_W, type TownMapData } from "../world/townMap";
import { matSmooth, matFlat } from "./materials";
import {
  grassTexture,
  pathTexture,
  parkPathTexture,
  sandTexture,
  woodFloorTexture,
  waterTexture,
} from "./terrainTextures";
import { AssetLibrary } from "../render/AssetLibrary";
import { addOutline } from "../render/outline";

const TILE_COLORS: Record<number, number> = {
  [Tile.grass]: Palette.grass,
  [Tile.grassVar]: Palette.grassLight,
  [Tile.path]: Palette.path,
  [Tile.water]: Palette.water,
  [Tile.sand]: Palette.sand,
  [Tile.floor]: Palette.floor,
  [Tile.floorAlt]: Palette.floorAlt,
  [Tile.wall]: Palette.wall,
  [Tile.door]: Palette.wood,
  [Tile.flower]: Palette.grass,
  [Tile.bush]: Palette.grassDark,
  [Tile.counter]: Palette.wood,
  [Tile.cafeFloor]: Palette.cafe,
  [Tile.shelterFloor]: Palette.shelter,
  [Tile.parkPath]: Palette.pathLight,
  [Tile.marketFloor]: Palette.market,
  [Tile.libraryFloor]: Palette.library,
  [Tile.clinicFloor]: Palette.clinic,
  [Tile.workshopFloor]: Palette.workshop,
  [Tile.pierDeck]: Palette.pier,
  [Tile.rock]: Palette.rock,
  [Tile.dirt]: Palette.dirt,
};

const INTERIOR_FLOOR = new Set<number>([
  Tile.floor,
  Tile.floorAlt,
  Tile.cafeFloor,
  Tile.shelterFloor,
  Tile.counter,
  Tile.wall,
  Tile.marketFloor,
  Tile.libraryFloor,
  Tile.clinicFloor,
  Tile.workshopFloor,
]);

function shadeFloor(color: number): number {
  const f = 0.93;
  return (
    (Math.round(((color >> 16) & 0xff) * f) << 16) |
    (Math.round(((color >> 8) & 0xff) * f) << 8) |
    Math.round((color & 0xff) * f)
  );
}

function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function lerpHex(a: number, b: number, t: number): number {
  const u = Math.min(1, Math.max(0, t));
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  return (r << 16) | (g << 8) | bl;
}

/**
 * Low-frequency shade 0..1 across the map (0 = cloud shadow, 1 = sun).
 * Quantized by callers so materials still batch.
 */
function cloudShadow(tx: number, ty: number): number {
  const n1 = noise(tx * 0.065 + 3.1, ty * 0.058 + 1.7);
  const n2 = noise(tx * 0.12 - 2.4, ty * 0.11 + 4.2);
  const n3 = noise(tx * 0.24 + 8.0, ty * 0.22 - 3.5);
  let v = n1 * 0.52 + n2 * 0.33 + n3 * 0.15;
  // Soften into broad pools rather than speckles
  v = (v - 0.28) / 0.55;
  return Math.min(1, Math.max(0, v));
}

/** Tint for textured grass - quantized so merge batches stay healthy. */
function grassCloudTint(tx: number, ty: number): number {
  const sun = cloudShadow(tx, ty);
  const band = Math.round(sun * 5) / 5; // 6 buckets
  // Cool deep green in shade → near-white multiply in sun (texture carries hue)
  return lerpHex(0x6f8c56, 0xffffff, 0.48 + band * 0.52);
}

/** Build merged terrain mesh + decorative props for the town. */
export function buildTerrain(map: TownMapData): THREE.Group {
  const root = new THREE.Group();
  root.name = "terrain";

  const geoCache = new Map<string, THREE.BufferGeometry>();
  const box = (w: number, h: number, d: number) => {
    const key = `${w}_${h}_${d}`;
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.BoxGeometry(w, h, d);
      geoCache.set(key, g);
    }
    return g;
  };

  const blobGeo = (r: number, seg = 14) => {
    const key = `s${r}_${seg}`;
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.SphereGeometry(r, seg, Math.max(8, Math.floor(seg * 0.75)));
      geoCache.set(key, g);
    }
    return g;
  };
  const stemGeo = (rTop: number, rBottom: number, h: number) => {
    const key = `c${rTop}_${rBottom}_${h}`;
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.CylinderGeometry(rTop, rBottom, h, 10);
      geoCache.set(key, g);
    }
    return g;
  };

  const meshesByMat = new Map<THREE.Material, THREE.Mesh[]>();

  const addBox = (
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    castShadow = false,
  ) => {
    const mesh = new THREE.Mesh(box(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = castShadow;
    mesh.userData.tilePick = true;
    let list = meshesByMat.get(material);
    if (!list) {
      list = [];
      meshesByMat.set(material, list);
    }
    list.push(mesh);
  };

  /** Decor uses rounded geometry, which merges the same way boxes do. */
  const addProp = (
    material: THREE.Material,
    geo: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    squash = 1,
  ) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    if (squash !== 1) mesh.scale.set(1, squash, 1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.tilePick = true;
    let list = meshesByMat.get(material);
    if (!list) {
      list = [];
      meshesByMat.set(material, list);
    }
    list.push(mesh);
  };

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const code = map.ground[ty][tx];
      let color = TILE_COLORS[code] ?? Palette.grass;
      // Checker the interior floors so big rooms don't read as one flat slab
      const INTERIOR = [
        Tile.floor,
        Tile.floorAlt,
        Tile.cafeFloor,
        Tile.shelterFloor,
        Tile.marketFloor,
        Tile.libraryFloor,
        Tile.clinicFloor,
        Tile.workshopFloor,
      ] as const;
      if ((INTERIOR as readonly number[]).includes(code) && (tx + ty) % 2 === 0) {
        color = shadeFloor(color);
      }
      const cx = tx * TILE + TILE / 2;
      const cz = ty * TILE + TILE / 2;

      if (code === Tile.water) {
        // Continuous square water - no per-tile discs (those read as blue pads).
        addBox(
          matSmooth(Palette.waterDeep, { map: waterTexture() }),
          cx,
          -2.4,
          cz,
          TILE,
          4.2,
          TILE,
        );
        // Slightly varied surface tint so large ponds aren't one flat slab.
        const shimmer = 0.85 + noise(tx * 0.7, ty * 0.7) * 0.15;
        const surface = lerpHex(Palette.waterDeep, Palette.water, shimmer);
        addBox(
          matSmooth(surface, {
            transparent: true,
            opacity: 0.88,
            map: waterTexture(),
          }),
          cx,
          0.05,
          cz,
          TILE,
          0.35,
          TILE,
        );
        continue;
      }

      if (code === Tile.door) {
        // Threshold flush with interior floors (top at y=0); walls are mesh-only.
        addBox(matFlat(Palette.wood), cx, -0.6, cz, TILE, 1.2, TILE);
        continue;
      }

      let height = 2;
      let y = 0;
      // Exact tile size - overlap caused crawling z-fight seams while walking.
      let size = TILE;
      if (code === Tile.grass || code === Tile.grassVar || code === Tile.flower) {
        // Uniform height - per-tile height jitter draws a dark grid of side faces.
        height = 2.2;
        y = height / 2 - 1;
        const n = noise(tx * 1.7, ty * 2.3);
        if (code === Tile.grass && n > 0.62) color = Palette.grassLight;
        if (code === Tile.grassVar && n < 0.35) color = Palette.grassDark;
      } else if (code === Tile.path || code === Tile.parkPath || code === Tile.pierDeck) {
        height = 2.0;
        y = height / 2 - 1;
      } else if (code === Tile.rock) {
        height = 2.15;
        y = height / 2 - 1;
        const n = noise(tx * 2.1, ty * 1.9);
        if (n > 0.55) color = Palette.rockDark;
      } else if (code === Tile.dirt) {
        height = 2.05;
        y = height / 2 - 1;
        const n = noise(tx * 1.4, ty * 1.8);
        if (n > 0.6) color = Palette.dirtDark;
      } else if (code === Tile.sand) {
        height = 1.8;
        y = height / 2 - 1;
      } else if (INTERIOR_FLOOR.has(code)) {
        // Continuous slabs under walls - top at y=0, full tile so no colour gaps.
        height = 1.2;
        y = -height / 2;
        size = TILE;
      } else {
        height = 1.2;
        y = -height / 2;
      }

      const isGrass =
        code === Tile.grass || code === Tile.grassVar || code === Tile.flower;
      const isPath = code === Tile.path;
      const isParkPath = code === Tile.parkPath || code === Tile.pierDeck;
      const isSand = code === Tile.sand;
      const isWood =
        code === Tile.floor ||
        code === Tile.floorAlt ||
        code === Tile.cafeFloor ||
        code === Tile.shelterFloor ||
        code === Tile.marketFloor ||
        code === Tile.libraryFloor ||
        code === Tile.clinicFloor ||
        code === Tile.workshopFloor;
      const tex = isGrass
        ? grassTexture()
        : isPath
          ? pathTexture()
          : isParkPath
            ? parkPathTexture()
            : isSand
              ? sandTexture()
              : isWood
                ? woodFloorTexture()
                : undefined;
      // Grass: multiply texture by large-scale cloud-shadow tint (batched buckets).
      const grassColor = isGrass ? grassCloudTint(tx, ty) : color;
      const tileMat =
        code === Tile.grass ||
        code === Tile.grassVar ||
        code === Tile.flower ||
        code === Tile.sand
          ? matSmooth(tex ? (isGrass ? grassColor : 0xffffff) : color, {
              map: tex,
            })
          : matFlat(tex ? 0xffffff : color, { map: tex });
      addBox(tileMat, cx, y, cz, size, height, size);

      if (code === Tile.flower) {
        const flower = AssetLibrary.cloneWorldProp("Flower");
        if (flower) {
          flower.position.set(cx, height - 0.5, cz);
          flower.rotation.y = noise(tx, ty) * Math.PI * 2;
          flower.scale.setScalar(0.85 + noise(ty, tx) * 0.3);
          addOutline(flower, 1.05);
          root.add(flower);
        }
      }
      if (code === Tile.bush) {
        const bush = AssetLibrary.cloneWorldProp("Bush");
        if (bush) {
          const n = noise(tx * 7.3, ty * 2.9 + 1.3);
          bush.position.set(cx, 0, cz);
          bush.rotation.y = n * Math.PI * 2;
          bush.scale.setScalar(0.9 + n * 0.35);
          addOutline(bush, 1.04);
          root.add(bush);
        }
      }
    }
  }

  const placeTree = (tx: number, ty: number) => {
    // Trees sit on a 2×2 footprint; mesh is centered in that block.
    const cx = (tx + 1) * TILE;
    const cz = (ty + 1) * TILE;
    const n = noise(tx * 4.1, ty * 6.7);
    const scale = 0.92 + n * 0.22;
    const lean = (n - 0.5) * 4;
    // Taller than cottage roofs (walls 64 + steep pitch ≈ 140+).
    addProp(
      matFlat(Palette.woodDark),
      stemGeo(5.5 * scale, 9 * scale, 88 * scale),
      cx,
      44 * scale,
      cz,
    );
    addProp(
      matSmooth(Palette.leaf),
      blobGeo(34 * scale, 16),
      cx + lean,
      118 * scale,
      cz,
      0.92,
    );
    addProp(
      matSmooth(Palette.leafLight),
      blobGeo(24 * scale, 14),
      cx + 16 * scale + lean,
      138 * scale,
      cz - 12 * scale,
      0.9,
    );
    addProp(
      matSmooth(Palette.leaf),
      blobGeo(22 * scale, 14),
      cx - 18 * scale + lean,
      132 * scale,
      cz + 14 * scale,
      0.9,
    );
    addProp(
      matSmooth(Palette.leaf),
      blobGeo(18 * scale, 12),
      cx + 4 * scale,
      152 * scale,
      cz + 6 * scale,
      0.85,
    );
  };

  for (const [tx, ty] of map.trees) {
    placeTree(tx, ty);
  }

  const lampStem = stemGeo(1.1, 1.4, 18);
  const lampBase = box(4, 2, 4);
  const lampHead = box(5, 4, 5);
  const lampGlow = blobGeo(2.2, 10);
  const woodMat = matFlat(Palette.woodDeep);
  const postMat = matFlat(Palette.wood);
  const headMat = matFlat(Palette.woodLight);
  const glowMat = matSmooth(0xffe566);

  for (const [tx, ty] of map.lamps) {
    const cx = tx * TILE + TILE / 2;
    const cz = ty * TILE + TILE / 2;
    addProp(postMat, lampBase, cx, 1, cz);
    addProp(woodMat, lampStem, cx, 11, cz);
    addProp(headMat, lampHead, cx, 21, cz);
    addProp(glowMat, lampGlow, cx, 21, cz);
  }

  // Scattered rocks & fence posts from the town layout.
  for (const [tx, ty] of map.rocks) {
    const rock = AssetLibrary.cloneWorldProp("Rock");
    if (!rock) continue;
    const cx = tx * TILE + TILE / 2;
    const cz = ty * TILE + TILE / 2;
    const n = noise(tx * 3.1, ty * 5.7);
    rock.position.set(cx, 0, cz);
    rock.rotation.y = n * Math.PI * 2;
    rock.scale.setScalar(0.75 + n * 0.45);
    addOutline(rock, 1.04);
    root.add(rock);
  }
  for (const [tx, ty] of map.fencePosts) {
    const post = AssetLibrary.cloneWorldProp("FencePost");
    if (!post) continue;
    const cx = tx * TILE + TILE / 2;
    const cz = ty * TILE + TILE / 2;
    post.position.set(cx, 0, cz);
    post.rotation.y = noise(tx, ty) > 0.5 ? Math.PI * 0.5 : 0;
    post.scale.setScalar(0.9 + noise(ty, tx) * 0.15);
    addOutline(post, 1.03);
    root.add(post);
  }

  // Merge meshes sharing materials for fewer draw calls
  for (const [material, meshes] of meshesByMat) {
    if (meshes.length === 0) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const m of meshes) {
      m.updateMatrix();
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrix);
      geos.push(g);
    }
    const merged = mergeGeometries(geos);
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.receiveShadow = true;
      // Ground must not cast - coplanar tops stripe themselves with shadow acne.
      mesh.castShadow = false;
      mesh.userData.tilePick = true;
      root.add(mesh);
    }
    for (const g of geos) g.dispose();
  }

  return root;
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  // Manual merge without BufferGeometryUtils dependency
  let vertCount = 0;
  let idxCount = 0;
  for (const g of geos) {
    const pos = g.getAttribute("position");
    vertCount += pos.count;
    const idx = g.getIndex();
    idxCount += idx ? idx.count : pos.count;
  }

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint32Array(idxCount);
  let vOffset = 0;
  let iOffset = 0;
  let indexBase = 0;

  for (const g of geos) {
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      positions[(vOffset + i) * 3] = pos.getX(i);
      positions[(vOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vOffset + i) * 3 + 2] = pos.getZ(i);
      if (nor) {
        normals[(vOffset + i) * 3] = nor.getX(i);
        normals[(vOffset + i) * 3 + 1] = nor.getY(i);
        normals[(vOffset + i) * 3 + 2] = nor.getZ(i);
      }
      if (uv) {
        uvs[(vOffset + i) * 2] = uv.getX(i);
        uvs[(vOffset + i) * 2 + 1] = uv.getY(i);
      }
    }
    const idx = g.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[iOffset + i] = idx.getX(i) + indexBase;
      }
      iOffset += idx.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices[iOffset + i] = i + indexBase;
      }
      iOffset += pos.count;
    }
    indexBase += pos.count;
    vOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}
