import * as THREE from "three";
import { Palette } from "../game/palette";
import { TILE } from "../game/constants";
import { Tile, MAP_H, MAP_W, type TownMapData } from "../world/townMap";
import { matSmooth, matFlat } from "./materials";

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
]);

function shadeFloor(color: number): number {
  const f = 0.93;
  return (
    (Math.round(((color >> 16) & 0xff) * f) << 16) |
    (Math.round(((color >> 8) & 0xff) * f) << 8) |
    Math.round((color & 0xff) * f)
  );
}

function tintPathEdge(color: number): number {
  const f = 0.88;
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
  const diskGeo = (r: number, h: number) => {
    const key = `d${r}_${h}`;
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.CylinderGeometry(r, r, h, 16);
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
      ] as const;
      if ((INTERIOR as readonly number[]).includes(code) && (tx + ty) % 2 === 0) {
        color = shadeFloor(color);
      }
      const cx = tx * TILE + TILE / 2;
      const cz = ty * TILE + TILE / 2;

      if (code === Tile.water) {
        // Deep bed + flat translucent surface (smooth, not chunky stacked boxes)
        addBox(matFlat(Palette.waterDeep), cx, -2.2, cz, TILE, 4, TILE);
        addProp(
          matSmooth(Palette.water, { transparent: true, opacity: 0.72 }),
          diskGeo(TILE * 0.48, 0.55),
          cx,
          0.15,
          cz,
        );
        if (noise(tx + 0.4, ty + 2.1) > 0.55) {
          addProp(
            matSmooth(Palette.water, { transparent: true, opacity: 0.35 }),
            diskGeo(TILE * 0.28, 0.2),
            cx + (noise(tx, ty) - 0.5) * 6,
            0.45,
            cz + (noise(ty, tx) - 0.5) * 6,
          );
        }
        continue;
      }

      if (code === Tile.door) {
        // Threshold flush with interior floors (top at y=0); walls are mesh-only.
        addBox(matFlat(Palette.wood), cx, -0.6, cz, TILE, 1.2, TILE);
        continue;
      }

      let height = 2;
      let y = 0;
      let size = TILE * 0.98;
      if (code === Tile.grass || code === Tile.grassVar || code === Tile.flower) {
        height = 2 + noise(tx, ty) * 1.2;
        y = height / 2 - 1;
        // Soft green variation so the grid doesn't read as one flat sheet
        const n = noise(tx * 1.7, ty * 2.3);
        if (code === Tile.grass && n > 0.62) color = Palette.grassLight;
        if (code === Tile.grassVar && n < 0.35) color = Palette.grassDark;
      } else if (code === Tile.path || code === Tile.parkPath) {
        height = 1.6;
        y = height / 2 - 1;
      } else if (code === Tile.sand) {
        height = 1.4;
        y = height / 2 - 1;
      } else if (INTERIOR_FLOOR.has(code)) {
        // Continuous slabs under walls — top at y=0, full tile so no colour gaps.
        height = 1.2;
        y = -height / 2;
        size = TILE;
      } else {
        height = 1.2;
        y = -height / 2;
      }

      const tileMat =
        code === Tile.grass || code === Tile.grassVar || code === Tile.flower || code === Tile.sand
          ? matSmooth(color)
          : matFlat(color);
      addBox(tileMat, cx, y, cz, size, height, size);

      // Thin skirt under grass/path edges so lots don't look like floating slabs
      if (
        (code === Tile.grass || code === Tile.grassVar || code === Tile.path || code === Tile.parkPath) &&
        noise(tx * 4.1, ty * 3.7) > 0.4
      ) {
        addBox(
          matFlat(shadeFloor(color)),
          cx,
          y - height / 2 - 0.35,
          cz,
          size * 1.04,
          0.7,
          size * 1.04,
        );
      }

      // Path edge contrast
      if (code === Tile.path || code === Tile.parkPath) {
        addBox(
          matFlat(tintPathEdge(color)),
          cx,
          y + height / 2 + 0.15,
          cz,
          size * 0.92,
          0.3,
          size * 0.92,
        );
      }

      if (code === Tile.flower) {
        const n = noise(tx * 3.1 + 0.7, ty * 5.7);
        const petalCol = [Palette.rose, Palette.lavender, Palette.sunflower, Palette.white][
          Math.floor(n * 4) % 4
        ];
        addProp(matSmooth(Palette.leaf), stemGeo(0.45, 0.65, 4.5), cx, height + 1.2, cz);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + n * 6;
          addProp(
            matSmooth(petalCol),
            blobGeo(1.55, 12),
            cx + Math.cos(a) * 1.7,
            height + 3.9,
            cz + Math.sin(a) * 1.7,
            0.55,
          );
        }
        addProp(matSmooth(Palette.sunflowerDark), blobGeo(1.05, 10), cx, height + 4.4, cz, 0.65);
        addProp(
          matSmooth(Palette.leafLight),
          blobGeo(1.5, 12),
          cx + 2.2,
          height + 1.0,
          cz - 1.4,
          0.32,
        );
      }
      if (code === Tile.bush) {
        const n = noise(tx * 7.3, ty * 2.9 + 1.3);
        if (n > 0.72) {
          // Occasional small tree — smooth leafy canopy clumps
          addProp(matFlat(Palette.woodDark), stemGeo(2.0, 3.0, 14), cx, 6.5, cz);
          addProp(matSmooth(Palette.leaf), blobGeo(9.5, 16), cx, 20, cz, 0.92);
          addProp(matSmooth(Palette.leafLight), blobGeo(6.5, 14), cx + 4.2, 24.5, cz - 2.8, 0.9);
          addProp(matSmooth(Palette.leaf), blobGeo(6.0, 14), cx - 4.5, 23, cz + 3.2, 0.9);
          addProp(matSmooth(Palette.leaf), blobGeo(5.0, 12), cx + 1.5, 26, cz + 2, 0.85);
        } else {
          // Soft multi-sphere bush (not one harsh blob)
          const baseY = 5.5 + n * 1.5;
          addProp(matSmooth(Palette.leaf), blobGeo(7.5, 14), cx - 1.8, baseY, cz + 0.8, 0.82);
          addProp(matSmooth(Palette.leafLight), blobGeo(6.2, 14), cx + 3.2, baseY + 1.8, cz - 2.0, 0.8);
          addProp(matSmooth(Palette.leaf), blobGeo(5.4, 12), cx + 1.0, baseY - 0.4, cz - 3.5, 0.78);
          addProp(matSmooth(Palette.leaf), blobGeo(4.8, 12), cx - 3.5, baseY + 0.6, cz - 1.2, 0.8);
          if (n > 0.45) {
            addProp(matSmooth(Palette.rose), blobGeo(1.25, 10), cx + 1.8, baseY + 6.2, cz - 0.8);
            addProp(matSmooth(Palette.rose), blobGeo(1.15, 10), cx - 3.2, baseY + 5.0, cz + 2.0);
          }
        }
      }
    }
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
      mesh.castShadow = true;
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
  const indices = new Uint32Array(idxCount);
  let vOffset = 0;
  let iOffset = 0;
  let indexBase = 0;

  for (const g of geos) {
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    for (let i = 0; i < pos.count; i++) {
      positions[(vOffset + i) * 3] = pos.getX(i);
      positions[(vOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vOffset + i) * 3 + 2] = pos.getZ(i);
      if (nor) {
        normals[(vOffset + i) * 3] = nor.getX(i);
        normals[(vOffset + i) * 3 + 1] = nor.getY(i);
        normals[(vOffset + i) * 3 + 2] = nor.getZ(i);
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
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}
