import * as THREE from "three";
import { createFurnitureMesh } from "../mesh/furniture";

const PREVIEW_SIZE = 140;
/** Slow continuous spin (radians per second) around world X. */
const SPIN_SPEED = 0.85;

/**
 * Tiny WebGL preview for build-catalog tooltips.
 * Object spins around the world X axis (pitch / tumble).
 */
export class FurniturePreview {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private pivot: THREE.Group | null = null;
  private raf = 0;
  private lastT = 0;
  private host: HTMLElement | null = null;
  private defId: string | null = null;

  attach(host: HTMLElement, defId: string) {
    if (this.host === host && this.defId === defId && this.renderer) {
      this.startLoop();
      return;
    }
    this.dispose();
    this.host = host;
    this.defId = defId;

    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_SIZE * 2;
    canvas.height = PREVIEW_SIZE * 2;
    canvas.className = "ll-build-tip-canvas";
    host.replaceChildren(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    // Front-on camera so world-X spin reads as a clear forward tumble
    // (not a yaw turntable around Y).
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
    const hemi = new THREE.HemisphereLight(0xfff2dc, 0x6b5a48, 1.05);
    const key = new THREE.DirectionalLight(0xfff8ee, 0.9);
    key.position.set(1.4, 3.2, 4.2);
    scene.add(hemi, key);

    const pivot = new THREE.Group();
    scene.add(pivot);

    let mesh: THREE.Group;
    try {
      mesh = createFurnitureMesh(defId);
    } catch {
      host.replaceChildren();
      const fallback = document.createElement("div");
      fallback.className = "ll-build-tip-fallback";
      fallback.textContent = "Preview unavailable";
      host.appendChild(fallback);
      this.disposeRendererOnly();
      return;
    }

    mesh.traverse((obj) => {
      if (obj.name.startsWith("outline") || obj.userData?.isOutline) {
        obj.visible = false;
      }
    });

    // Neutral pose — only the pivot spins on X.
    mesh.rotation.set(0, 0, 0);
    pivot.add(mesh);
    this.fit(mesh, camera);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.pivot = pivot;
    this.startLoop();
  }

  private fit(mesh: THREE.Object3D, camera: THREE.PerspectiveCamera) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.4);
    const dist = maxDim * 2.35;
    // Look straight down +Z so rotation.x is unambiguously pitch.
    camera.position.set(0, maxDim * 0.12, dist);
    camera.near = Math.max(0.02, dist / 40);
    camera.far = dist * 20;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  private startLoop() {
    if (this.raf) return;
    this.lastT = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      if (!this.renderer || !this.scene || !this.camera || !this.pivot) return;
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      this.pivot.rotation.x += SPIN_SPEED * dt;
      this.pivot.rotation.y = 0;
      this.pivot.rotation.z = 0;
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private disposeRendererOnly() {
    this.stopLoop();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.pivot = null;
  }

  dispose() {
    this.disposeRendererOnly();
    this.host = null;
    this.defId = null;
  }
}
