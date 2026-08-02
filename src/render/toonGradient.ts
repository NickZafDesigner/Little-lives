import * as THREE from "three";

/** Shared 4-step toon ramp for painted Stardew-in-3D shading. */
let gradient: THREE.DataTexture | null = null;

export function toonGradientMap(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([
    90, 90, 95, 255, // shadow
    145, 140, 130, 255, // mid-shadow
    210, 200, 185, 255, // lit
    255, 250, 240, 255, // highlight
  ]);
  gradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}
