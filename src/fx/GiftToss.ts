import * as THREE from "three";
import type { MaterialId } from "../data/items";
import { createInventoryItemMesh } from "../mesh/inventoryItems";

const HOLD_SEC = 0.2;
const ZIP_SEC = 0.48;
const MESH_SCALE = 0.62;
const ARC_HEIGHT = 14;

type Phase = "hold" | "zip";

export type GiftTossPoint = { x: number; y: number; z: number };
export type GiftTossTarget = () => GiftTossPoint;

export type GiftTossSpawnOpts = {
  onComplete: () => void;
};

/**
 * Hand-off flourish: item rises from the giver, arcs to the receiver, then
 * vanishes as they react. Reverse of LootBurst's zip-to-player beat.
 */
export class GiftToss {
  private readonly root = new THREE.Group();
  private readonly addToScene: (obj: THREE.Object3D) => void;
  private readonly removeFromScene: (obj: THREE.Object3D) => void;
  private mesh: THREE.Group | null = null;
  private phase: Phase = "hold";
  private age = 0;
  private zipT = 0;
  private from: GiftTossPoint = { x: 0, y: 0, z: 0 };
  private getTarget: GiftTossTarget | null = null;
  private onComplete: (() => void) | null = null;
  private attached = false;
  private pending = false;

  constructor(
    addToScene: (obj: THREE.Object3D) => void,
    removeFromScene: (obj: THREE.Object3D) => void,
  ) {
    this.addToScene = addToScene;
    this.removeFromScene = removeFromScene;
    this.root.name = "giftToss";
  }

  get active(): boolean {
    return this.pending;
  }

  /** Approximate total duration so busy bars can match the flourish. */
  static readonly DURATION_MS = Math.round((HOLD_SEC + ZIP_SEC) * 1000);

  spawn(
    itemId: MaterialId,
    from: GiftTossPoint,
    getTarget: GiftTossTarget,
    opts: GiftTossSpawnOpts,
  ): void {
    // Finish a prior toss so callbacks (friendship / thanks) still fire.
    if (this.pending) this.finish();

    this.onComplete = opts.onComplete;
    this.getTarget = getTarget;
    this.from = { ...from };
    this.phase = "hold";
    this.age = 0;
    this.zipT = 0;
    this.pending = true;

    if (!this.attached) {
      this.addToScene(this.root);
      this.attached = true;
    }

    const mesh = createInventoryItemMesh(`mat:${itemId}`);
    mesh.scale.setScalar(MESH_SCALE * 0.2);
    mesh.castShadow = true;
    mesh.position.set(from.x, from.y, from.z);
    this.root.add(mesh);
    this.mesh = mesh;
  }

  update(dt: number): void {
    if (!this.pending || !this.mesh) return;

    this.age += dt;
    const mesh = this.mesh;

    if (this.phase === "hold") {
      const t = Math.min(1, this.age / HOLD_SEC);
      const e = 1 - (1 - t) * (1 - t);
      const lift = 4 * e;
      mesh.position.set(this.from.x, this.from.y + lift, this.from.z);
      mesh.scale.setScalar(MESH_SCALE * (0.2 + 0.8 * e));
      mesh.rotation.y += dt * 4;
      if (t >= 1) {
        this.phase = "zip";
        this.zipT = 0;
        this.from = {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        };
      }
      return;
    }

    this.zipT = Math.min(1, this.zipT + dt / ZIP_SEC);
    const t = this.zipT;
    // Ease-in-out cubic so it leaves the hand cleanly and settles into them.
    const e =
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const target = this.getTarget?.() ?? this.from;
    const x = this.from.x + (target.x - this.from.x) * e;
    const y = this.from.y + (target.y - this.from.y) * e;
    const z = this.from.z + (target.z - this.from.z) * e;
    const arc = Math.sin(t * Math.PI) * ARC_HEIGHT;
    mesh.position.set(x, y + arc, z);
    mesh.scale.setScalar(MESH_SCALE * (1 - e * 0.35));
    mesh.rotation.y += dt * 9;
    mesh.rotation.z = Math.sin(t * Math.PI) * 0.35;

    if (t >= 1) {
      this.finish();
    }
  }

  dispose(): void {
    this.clearMesh(false);
    this.onComplete = null;
    this.getTarget = null;
    this.pending = false;
    if (this.attached) {
      this.removeFromScene(this.root);
      this.attached = false;
    }
  }

  private finish(): void {
    const done = this.onComplete;
    this.clearMesh(false);
    this.onComplete = null;
    this.getTarget = null;
    this.pending = false;
    done?.();
  }

  private clearMesh(callComplete: boolean): void {
    if (this.mesh) {
      this.root.remove(this.mesh);
      disposeObject(this.mesh);
      this.mesh = null;
    }
    if (callComplete && this.pending) {
      this.pending = false;
      const done = this.onComplete;
      this.onComplete = null;
      done?.();
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
