import * as THREE from "three";
import { ensureToonMaterial } from "../mesh/materials";
import { toonGradientMap } from "./toonGradient";

export type TintMap = Partial<
  Record<"Skin" | "Hair" | "Shirt" | "Pants" | "Accent" | "Primary" | "Secondary", number>
>;

/** Clone materials on a subtree and recolor named slots. */
export function applyTints(root: THREE.Object3D, tints: TintMap): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((m) => {
      const toon = ensureToonMaterial(m.clone());
      toon.gradientMap = toonGradientMap();
      const key = toon.name as keyof TintMap;
      if (key && tints[key] !== undefined) {
        toon.color.setHex(tints[key]!);
      }
      return toon;
    });
    obj.material = Array.isArray(obj.material) ? next : next[0]!;
  });
}

/** Make a transparent ghost clone of materials (build preview). */
export function ghostifyMaterials(root: THREE.Object3D, opacity = 0.55): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((m) => {
      const toon = ensureToonMaterial(m.clone());
      toon.transparent = true;
      toon.opacity = opacity;
      toon.depthWrite = false;
      return toon;
    });
    obj.material = Array.isArray(obj.material) ? next : next[0]!;
  });
}

export function tintGhostOk(root: THREE.Object3D, ok: boolean): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m instanceof THREE.MeshToonMaterial) {
        m.color.setHex(ok ? 0x76e887 : 0xff7188);
        m.emissive.setHex(ok ? 0x1f8f3a : 0x8f1f32);
        m.emissiveIntensity = 0.45;
      }
    }
  });
}
