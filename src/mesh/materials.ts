import * as THREE from "three";
import { hexColor } from "../render/coords";
import { toonGradientMap } from "../render/toonGradient";

const cache = new Map<string, THREE.MeshToonMaterial>();

export type MatOpts = {
  transparent?: boolean;
  opacity?: number;
  /** Default false (smooth). Pass true for hard architecture. */
  flat?: boolean;
  /** Material slot name for tint / GLB contracts. */
  name?: string;
  map?: THREE.Texture;
};

function cacheKey(color: number, opts?: MatOpts): string {
  const mapId = opts?.map ? (opts.map.uuid ?? "map") : "";
  return `${color}_${opts?.transparent ? 1 : 0}_${opts?.opacity ?? 1}_${opts?.flat ? 1 : 0}_${opts?.name ?? ""}_${mapId}`;
}

function makeToon(color: number, opts?: MatOpts): THREE.MeshToonMaterial {
  // MeshToonMaterial has no flatShading in current three - `flat` is kept in
  // MatOpts for call-site intent (architecture vs organic) only.
  void opts?.flat;
  const m = new THREE.MeshToonMaterial({
    color: hexColor(color),
    gradientMap: toonGradientMap(),
    transparent: opts?.transparent ?? false,
    opacity: opts?.opacity ?? 1,
    name: opts?.name,
  });
  if (opts?.map) m.map = opts.map;
  return m;
}

/** Shared toon material. Organic = smooth; architecture = flat. */
export function mat(color: number, opts?: MatOpts): THREE.MeshToonMaterial {
  const key = cacheKey(color, opts);
  let m = cache.get(key);
  if (!m) {
    m = makeToon(color, opts);
    cache.set(key, m);
  }
  return m;
}

export function matSmooth(
  color: number,
  opts?: Omit<MatOpts, "flat">,
): THREE.MeshToonMaterial {
  return mat(color, { ...opts, flat: false });
}

export function matFlat(
  color: number,
  opts?: Omit<MatOpts, "flat">,
): THREE.MeshToonMaterial {
  return mat(color, { ...opts, flat: true });
}

/** Uncached clone - for per-building roof fade opacity. */
export function matClone(color: number, opts?: MatOpts): THREE.MeshToonMaterial {
  return makeToon(color, { ...opts, flat: opts?.flat ?? true });
}

/** Convert any mesh material tree to toon (used after GLB load). */
export function ensureToonMaterial(
  material: THREE.Material,
  opts?: { flat?: boolean },
): THREE.MeshToonMaterial {
  if (material instanceof THREE.MeshToonMaterial) {
    material.gradientMap = toonGradientMap();
    return material;
  }
  const color =
    "color" in material && material.color instanceof THREE.Color
      ? material.color.getHex()
      : 0xffffff;
  const transparent = material.transparent;
  const opacity = material.opacity;
  const name = material.name || undefined;
  const toon = makeToon(color, {
    transparent,
    opacity,
    flat: opts?.flat ?? false,
    name,
  });
  toon.side = material.side;
  return toon;
}
