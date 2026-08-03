import * as THREE from "three";
import { createFurnitureMesh } from "../mesh/furniture";
import {
  createInventoryItemMesh,
  type InventoryThumbId,
} from "../mesh/inventoryItems";

const PREVIEW_SIZE = 140;
/** Slow continuous spin (radians per second) around world Y. */
const SPIN_SPEED = 0.85;

/**
 * One shared WebGL context for all furniture tip / thought previews.
 * Creating a new WebGLRenderer per hover can steal the main game's context
 * (browsers cap concurrent contexts) and blank the world to white.
 */
type SharedPreview = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pivot: THREE.Group;
  mesh: THREE.Object3D | null;
  defId: string | null;
  size: number;
  raf: number;
  lastT: number;
  /** Instance currently displaying the shared canvas. */
  owner: FurniturePreview | null;
};

let shared: SharedPreview | null = null;

function getShared(size: number): SharedPreview {
  if (shared) {
    if (shared.size !== size) {
      shared.size = size;
      shared.canvas.width = size * 2;
      shared.canvas.height = size * 2;
      shared.canvas.style.width = `${size}px`;
      shared.canvas.style.height = `${size}px`;
      shared.renderer.setSize(size, size, false);
    }
    return shared;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;
  canvas.className = "ll-build-tip-canvas";
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  // Cap DPR - spinning silhouettes shimmer more at 2× on tiny canvases.
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
  // Soft ambient only on the scene; key/fill ride the pivot so toon
  // (and soft) shading stays stable while the silhouette turns.
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x6b5a48, 0.85));

  const pivot = new THREE.Group();
  scene.add(pivot);

  const key = new THREE.DirectionalLight(0xfff8ee, 0.75);
  key.position.set(1.4, 3.2, 4.2);
  const fill = new THREE.DirectionalLight(0xffe8d0, 0.35);
  fill.position.set(-2.2, 1.6, -1.4);
  pivot.add(key, fill);

  shared = {
    canvas,
    renderer,
    scene,
    camera,
    pivot,
    mesh: null,
    defId: null,
    size,
    raf: 0,
    lastT: 0,
    owner: null,
  };
  return shared;
}

function clearSharedMesh(s: SharedPreview) {
  if (!s.mesh) return;
  s.pivot.remove(s.mesh);
  s.mesh.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) m?.dispose();
  });
  s.mesh = null;
  s.defId = null;
}

function stopSharedLoop(s: SharedPreview) {
  if (s.raf) cancelAnimationFrame(s.raf);
  s.raf = 0;
}

function startSharedLoop(s: SharedPreview) {
  if (s.raf) return;
  s.lastT = performance.now();
  const tick = (t: number) => {
    s.raf = requestAnimationFrame(tick);
    if (!s.owner) return;
    const dt = Math.min(0.05, (t - s.lastT) / 1000);
    s.lastT = t;
    s.pivot.rotation.y += SPIN_SPEED * dt;
    s.pivot.rotation.x = 0;
    s.pivot.rotation.z = 0;
    s.renderer.render(s.scene, s.camera);
  };
  s.raf = requestAnimationFrame(tick);
}

function fitPreview(mesh: THREE.Object3D, camera: THREE.PerspectiveCamera) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.4);
  const dist = maxDim * 2.35;
  camera.position.set(dist * 0.55, maxDim * 0.55, dist * 0.85);
  // Tighter depth range reduces z-fighting flicker on layered cushions.
  camera.near = Math.max(0.05, dist / 20);
  camera.far = dist * 8;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

/**
 * Tiny WebGL preview for build-catalog tooltips / thought bubbles.
 * Object spins on a Y turntable so furniture silhouettes stay readable.
 */
export class FurniturePreview {
  private host: HTMLElement | null = null;
  private defId: string | null = null;

  attach(host: HTMLElement, defId: string, size = PREVIEW_SIZE) {
    const s = getShared(size);

    if (this.host === host && this.defId === defId && s.owner === this && s.mesh) {
      startSharedLoop(s);
      return;
    }

    // Steal the shared canvas if another tip owned it.
    if (s.owner && s.owner !== this) {
      s.owner.host = null;
      s.owner.defId = null;
    }

    this.host = host;
    this.defId = defId;
    s.owner = this;
    host.replaceChildren(s.canvas);

    if (s.defId !== defId || !s.mesh) {
      clearSharedMesh(s);
      let mesh: THREE.Group;
      try {
        mesh = createFurnitureMesh(defId);
      } catch {
        host.replaceChildren();
        const fallback = document.createElement("div");
        fallback.className = "ll-build-tip-fallback";
        fallback.textContent = "Preview unavailable";
        host.appendChild(fallback);
        s.owner = null;
        this.host = null;
        this.defId = null;
        stopSharedLoop(s);
        return;
      }

      softenPreviewMaterials(mesh);
      // Slight 3/4 view; pivot yaws so silhouettes stay upright and readable.
      mesh.rotation.set(0, Math.PI * 0.15, 0);
      s.pivot.add(mesh);
      s.mesh = mesh;
      s.defId = defId;
      s.pivot.rotation.y = 0;
      fitPreview(mesh, s.camera);
    }

    startSharedLoop(s);
  }

  dispose() {
    if (shared?.owner === this) {
      stopSharedLoop(shared);
      clearSharedMesh(shared);
      shared.owner = null;
      // Keep the WebGL context alive for the next tip - do not dispose the renderer.
      if (shared.canvas.parentElement) {
        shared.canvas.remove();
      }
    }
    this.host = null;
    this.defId = null;
  }
}

/**
 * Preview-only material pass: hide outlines, drop the hard 4-step toon ramp
 * (band edges crawl/flicker while spinning), and nudge layered parts apart
 * in depth so cushion/frame z-fighting is less visible.
 */
function softenPreviewMaterials(root: THREE.Object3D) {
  let meshIndex = 0;
  root.traverse((obj) => {
    if (obj.name.startsWith("outline") || obj.userData?.isOutline) {
      obj.visible = false;
      return;
    }
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const offset = meshIndex++;
    for (const m of mats) {
      if (!m) continue;
      if (m instanceof THREE.MeshToonMaterial) {
        m.gradientMap = null;
        m.needsUpdate = true;
      }
      // Distinct offsets per mesh so coplanar cushion/seat faces don't strobe.
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1 + offset;
      m.polygonOffsetUnits = 1 + offset;
    }
  });
}

type ThumbRenderer = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pivot: THREE.Group;
};

let thumbRenderer: ThumbRenderer | null = null;

function getThumbRenderer(size: number): ThumbRenderer {
  if (thumbRenderer) {
    const r = thumbRenderer;
    if (r.canvas.width !== size * 2) {
      r.canvas.width = size * 2;
      r.canvas.height = size * 2;
      r.renderer.setSize(size, size, false);
    }
    return r;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x6b5a48, 0.9));
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const key = new THREE.DirectionalLight(0xfff8ee, 0.8);
  key.position.set(1.4, 3.2, 4.2);
  const fill = new THREE.DirectionalLight(0xffe8d0, 0.4);
  fill.position.set(-2.2, 1.6, -1.4);
  scene.add(key, fill);

  thumbRenderer = { canvas, renderer, scene, camera, pivot };
  return thumbRenderer;
}

/**
 * Paint a one-shot furniture silhouette into a 2D canvas (for task-card circles).
 * Uses a dedicated tiny WebGL context so tip previews stay untouched.
 */
export function paintFurnitureThumb(
  target: HTMLCanvasElement,
  defId: string,
  cssSize = 52,
): boolean {
  return paintMeshThumb(target, () => createFurnitureMesh(defId), cssSize);
}

/** Paint a bag / shop inventory tool or material silhouette. */
export function paintInventoryThumb(
  target: HTMLCanvasElement,
  id: InventoryThumbId,
  cssSize = 44,
): boolean {
  return paintMeshThumb(target, () => createInventoryItemMesh(id), cssSize);
}

function paintMeshThumb(
  target: HTMLCanvasElement,
  makeMesh: () => THREE.Group,
  cssSize: number,
): boolean {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.max(32, Math.round(cssSize * dpr));
  target.width = px;
  target.height = px;
  target.style.width = `${cssSize}px`;
  target.style.height = `${cssSize}px`;

  const ctx = target.getContext("2d");
  if (!ctx) return false;

  let mesh: THREE.Group;
  try {
    mesh = makeMesh();
  } catch {
    return false;
  }

  const r = getThumbRenderer(px);
  for (const child of [...r.pivot.children]) r.pivot.remove(child);

  softenPreviewMaterials(mesh);
  mesh.rotation.set(0, Math.PI * 0.22, 0);
  r.pivot.add(mesh);
  r.pivot.rotation.set(0, 0, 0);
  fitPreview(mesh, r.camera);
  r.renderer.render(r.scene, r.camera);

  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(r.canvas, 0, 0, px, px);

  r.pivot.remove(mesh);
  mesh.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) m?.dispose();
  });
  return true;
}
