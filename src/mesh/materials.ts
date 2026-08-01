import * as THREE from "three";
import { hexColor } from "../render/coords";

const cache = new Map<string, THREE.MeshLambertMaterial>();

export type MatOpts = {
  transparent?: boolean;
  opacity?: number;
  /** Default false (smooth). Pass true for hard architecture. */
  flat?: boolean;
};

function cacheKey(color: number, opts?: MatOpts): string {
  return `${color}_${opts?.transparent ? 1 : 0}_${opts?.opacity ?? 1}_${opts?.flat ? 1 : 0}`;
}

/**
 * Shared Lambert material. Defaults to **smooth** shading so organic meshes
 * (actors, bushes, water) don't look cracked. Use `flat: true` for buildings.
 */
export function mat(
  color: number,
  opts?: MatOpts,
): THREE.MeshLambertMaterial {
  const key = cacheKey(color, opts);
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color: hexColor(color),
      transparent: opts?.transparent ?? false,
      opacity: opts?.opacity ?? 1,
      flatShading: opts?.flat ?? false,
    });
    cache.set(key, m);
  }
  return m;
}

/** Explicit smooth Lambert (organic / characters / soft props). */
export function matSmooth(
  color: number,
  opts?: Omit<MatOpts, "flat">,
): THREE.MeshLambertMaterial {
  return mat(color, { ...opts, flat: false });
}

/** Explicit flat Lambert (building walls, roof slabs, hard boxes). */
export function matFlat(
  color: number,
  opts?: Omit<MatOpts, "flat">,
): THREE.MeshLambertMaterial {
  return mat(color, { ...opts, flat: true });
}

/** Uncached clone — for per-building roof fade opacity. */
export function matClone(
  color: number,
  opts?: MatOpts,
): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color: hexColor(color),
    transparent: opts?.transparent ?? false,
    opacity: opts?.opacity ?? 1,
    flatShading: opts?.flat ?? true,
  });
}
