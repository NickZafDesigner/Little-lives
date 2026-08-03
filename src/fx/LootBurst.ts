import * as THREE from "three";
import type { MaterialId } from "../data/items";
import { createInventoryItemMesh } from "../mesh/inventoryItems";

const REST_SEC = 0.5;
const ZIP_SEC = 0.38;
const GRAVITY = 420;
const MESH_SCALE = 0.55;
const GROUND_Y = 2.2;
const MAX_PIECES = 10;
/** Soft horizontal drag so arcs settle instead of skating forever. */
const AIR_DRAG = 1.8;

type Phase = "pop" | "rest" | "zip";

type Piece = {
  mesh: THREE.Group;
  itemId: MaterialId;
  phase: Phase;
  age: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  restDelay: number;
  zipT: number;
  zipFromX: number;
  zipFromY: number;
  zipFromZ: number;
};

export type LootBurstTarget = () => { x: number; y: number; z: number };

export type LootBurstSpawnOpts = {
  onPieceCollect: (itemId: MaterialId) => void;
  onComplete: () => void;
};

/**
 * Harvest celebration: loot pops onto the ground, rests a beat, then zips
 * into the player. Callers grant inventory as pieces arrive.
 */
export class LootBurst {
  private readonly root = new THREE.Group();
  private readonly pieces: Piece[] = [];
  private readonly addToScene: (obj: THREE.Object3D) => void;
  private readonly removeFromScene: (obj: THREE.Object3D) => void;
  private readonly getTarget: LootBurstTarget;
  private onPieceCollect: ((itemId: MaterialId) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private pendingComplete = false;
  private attached = false;

  constructor(
    addToScene: (obj: THREE.Object3D) => void,
    removeFromScene: (obj: THREE.Object3D) => void,
    getTarget: LootBurstTarget,
  ) {
    this.addToScene = addToScene;
    this.removeFromScene = removeFromScene;
    this.getTarget = getTarget;
    this.root.name = "lootBurst";
  }

  get active(): boolean {
    return this.pieces.length > 0;
  }

  /** Spawn world loot at a harvest point. One mesh per unit (capped). */
  spawn(
    originX: number,
    originY: number,
    originZ: number,
    yields: Array<{ itemId: MaterialId; count: number }>,
    opts: LootBurstSpawnOpts,
  ): number {
    // If a prior burst is still playing, finish it cleanly first.
    if (this.pieces.length) {
      for (const p of this.pieces) {
        this.onPieceCollect?.(p.itemId);
        this.root.remove(p.mesh);
        disposeObject(p.mesh);
      }
      this.pieces.length = 0;
      if (this.pendingComplete) {
        this.pendingComplete = false;
        this.onComplete?.();
      }
    }

    this.onPieceCollect = opts.onPieceCollect;
    this.onComplete = opts.onComplete;

    const queue: MaterialId[] = [];
    for (const y of yields) {
      for (let i = 0; i < y.count; i++) queue.push(y.itemId);
    }
    if (queue.length > MAX_PIECES) queue.length = MAX_PIECES;
    if (!queue.length) {
      opts.onComplete();
      return 0;
    }

    if (!this.attached) {
      this.addToScene(this.root);
      this.attached = true;
    }

    const n = queue.length;
    queue.forEach((itemId, i) => {
      const mesh = createInventoryItemMesh(`mat:${itemId}`);
      mesh.scale.setScalar(MESH_SCALE);
      mesh.castShadow = true;
      this.root.add(mesh);

      // Burst outward - settle wherever physics lands (no second snap).
      const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 48 + Math.random() * 28;

      mesh.position.set(originX, originY, originZ);

      this.pieces.push({
        mesh,
        itemId,
        phase: "pop",
        age: 0,
        vx: Math.cos(angle) * speed,
        vy: 130 + Math.random() * 70,
        vz: Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 8,
        restDelay: REST_SEC + Math.random() * 0.25,
        zipT: 0,
        zipFromX: originX,
        zipFromY: GROUND_Y,
        zipFromZ: originZ,
      });
    });
    this.pendingComplete = true;
    return n;
  }

  update(dt: number): void {
    if (!this.pieces.length) {
      if (this.pendingComplete) {
        this.pendingComplete = false;
        this.onComplete?.();
      }
      return;
    }

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i]!;
      p.age += dt;

      if (p.phase === "pop") {
        p.vy -= GRAVITY * dt;
        const drag = Math.exp(-AIR_DRAG * dt);
        p.vx *= drag;
        p.vz *= drag;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.y += p.spin * dt;
        p.mesh.rotation.z += p.spin * 0.4 * dt;

        // Land in place - never teleport to a different XY.
        if (p.mesh.position.y <= GROUND_Y && p.vy <= 0) {
          p.mesh.position.y = GROUND_Y;
          p.vx = 0;
          p.vy = 0;
          p.vz = 0;
          p.phase = "rest";
          p.age = 0;
          p.mesh.scale.set(
            MESH_SCALE * 1.15,
            MESH_SCALE * 0.75,
            MESH_SCALE * 1.15,
          );
        }
        continue;
      }

      if (p.phase === "rest") {
        const s = p.mesh.scale.x;
        const next = s + (MESH_SCALE - s) * Math.min(1, dt * 10);
        p.mesh.scale.set(next, MESH_SCALE * 2 - next, next);
        p.mesh.position.y = GROUND_Y + Math.sin(p.age * 6) * 0.6;
        p.mesh.rotation.y += dt * 1.2;
        if (p.age >= p.restDelay) {
          p.phase = "zip";
          p.zipT = 0;
          p.zipFromX = p.mesh.position.x;
          p.zipFromY = p.mesh.position.y;
          p.zipFromZ = p.mesh.position.z;
        }
        continue;
      }

      p.zipT = Math.min(1, p.zipT + dt / ZIP_SEC);
      const t = p.zipT;
      const e = t * t * t;
      const target = this.getTarget();
      const x = p.zipFromX + (target.x - p.zipFromX) * e;
      const y = p.zipFromY + (target.y - p.zipFromY) * e;
      const z = p.zipFromZ + (target.z - p.zipFromZ) * e;
      const arc = Math.sin(t * Math.PI) * 10;
      p.mesh.position.set(x, y + arc, z);
      p.mesh.scale.setScalar(MESH_SCALE * (1 - e * 0.55));
      p.mesh.rotation.y += dt * 10;

      if (t >= 1) {
        this.onPieceCollect?.(p.itemId);
        this.root.remove(p.mesh);
        disposeObject(p.mesh);
        this.pieces.splice(i, 1);
      }
    }

    if (this.pendingComplete && this.pieces.length === 0) {
      this.pendingComplete = false;
      this.onComplete?.();
    }
  }

  dispose(): void {
    for (const p of this.pieces) {
      this.root.remove(p.mesh);
      disposeObject(p.mesh);
    }
    this.pieces.length = 0;
    this.pendingComplete = false;
    this.onPieceCollect = null;
    this.onComplete = null;
    if (this.attached) {
      this.removeFromScene(this.root);
      this.attached = false;
    }
  }
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    // Materials are shared via the mesh cache - only free geometries.
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
}
