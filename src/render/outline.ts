import * as THREE from "three";

const outlineMat = new THREE.MeshBasicMaterial({
  color: 0x3a2818,
  side: THREE.BackSide,
});

/**
 * Add inverted-hull outline meshes as children named `__outline`.
 * Call after geometry is final; safe to call once per root.
 */
export function addOutline(root: THREE.Object3D, scale = 1.06): void {
  const toAdd: Array<{ parent: THREE.Object3D; outline: THREE.Mesh }> = [];
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.name.startsWith("__outline")) return;
    if (obj.userData.noOutline) return;
    if (obj.material instanceof THREE.MeshBasicMaterial && obj.material.opacity < 1) {
      // Skip shadows / markers
      if (obj.material.transparent) return;
    }
    const outline = new THREE.Mesh(obj.geometry, outlineMat);
    outline.name = "__outline";
    outline.scale.setScalar(scale);
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.userData.noOutline = true;
    toAdd.push({ parent: obj, outline });
  });
  for (const { parent, outline } of toAdd) {
    parent.add(outline);
  }
}

export function setOutlineColor(hex: number): void {
  outlineMat.color.setHex(hex);
}
