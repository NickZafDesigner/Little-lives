import * as THREE from "three";

/**
 * Outlines are disabled — the soft toon shading reads cleaner without
 * inverted-hull ink shells. This stays as a no-op (and strips any leftovers)
 * so call sites can remain; re-enable by restoring extrusion logic later.
 */
export function addOutline(root: THREE.Object3D, _weight = 1): void {
  stripOutlines(root);
}

export function setOutlineColor(_hex: number): void {
  // no-op while outlines are off
}

function stripOutlines(root: THREE.Object3D): void {
  const stale: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.name === "__outline" || obj.name.startsWith("__outline")) {
      stale.push(obj);
    }
  });
  for (const o of stale) {
    if (o instanceof THREE.Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m?.dispose();
    }
    o.removeFromParent();
  }
}
