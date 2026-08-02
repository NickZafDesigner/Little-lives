import * as THREE from "three";
import type { Dir, PlacedFurniture } from "../data/types";
import { furnitureById } from "../data/furniture";
import { TILE } from "../game/constants";
import { Palette } from "../game/palette";
import {
  applyFurnitureRotation,
  createFurnitureMesh,
  furnitureFootprint,
  nextFurnitureDir,
} from "../mesh/furniture";
import type { TownRenderer } from "../render/TownRenderer";
import { matFlat } from "../mesh/materials";

export type BuildTool = "furniture" | "wall" | "floor" | "sell";

export interface BuildHover {
  tx: number;
  ty: number;
  furnitureUid?: string;
}

/**
 * Owns build-mode preview + commit helpers so WorldScreen stays thin.
 * Picking lists must be furniture-only (never pets/NPCs).
 */
export class BuildFeedback {
  private ghostDefId: string | null = null;
  private ghost: THREE.Group | null = null;
  private renderer: TownRenderer;

  constructor(renderer: TownRenderer) {
    this.renderer = renderer;
  }

  clear() {
    this.renderer.setGhost(null);
    this.renderer.setHoverTile(null);
    this.renderer.setBuildSelection(null);
    this.ghost = null;
    this.ghostDefId = null;
  }

  /** Green/red footprint + ghost for furniture placement. */
  showFurniturePlace(
    defId: string,
    tx: number,
    ty: number,
    rot: Dir,
    ok: boolean,
  ) {
    const { tw, th } = furnitureFootprint(defId, rot);
    this.renderer.setBuildSelection(null);
    this.renderer.setHoverTile({ tx, ty }, { tw, th, ok });

    if (this.ghostDefId !== defId || !this.ghost) {
      const mesh = createFurnitureMesh(defId);
      mesh.traverse((o) => {
        if (o instanceof THREE.Mesh) o.raycast = () => {};
      });
      this.renderer.setGhost(mesh);
      this.ghost = mesh;
      this.ghostDefId = defId;
    }

    applyFurnitureRotation(this.ghost!, rot);
    this.ghost!.position.set(
      tx * TILE + (tw * TILE) / 2,
      0,
      ty * TILE + (th * TILE) / 2,
    );
    this.renderer.setGhostTint(ok);
  }

  showFurnitureSelect(mesh: THREE.Object3D | null) {
    this.renderer.setGhost(null);
    this.ghost = null;
    this.ghostDefId = null;
    this.renderer.setHoverTile(null);
    this.renderer.setBuildSelection(mesh);
  }

  showTileTool(tx: number, ty: number, ok: boolean, tool: "wall" | "floor" | "sell") {
    this.renderer.setGhost(null);
    this.ghost = null;
    this.ghostDefId = null;
    this.renderer.setBuildSelection(null);
    // Distinct tints per tool so floor/wall feel alive
    const fill =
      tool === "floor"
        ? ok
          ? 0x6ad6a8
          : 0xff8a9a
        : tool === "wall"
          ? ok
            ? 0xf0d9a8
            : 0xff8a9a
          : ok
            ? 0xffb86b
            : 0xff8a9a;
    this.renderer.setHoverTile({ tx, ty }, { tw: 1, th: 1, ok, fill });
  }
}

export function rotateDir(dir: Dir): Dir {
  return nextFurnitureDir(dir);
}

export function createPaintFloorMesh(tx: number, ty: number): THREE.Mesh {
  // Clearly different from default home floor (Palette.floor / floorAlt).
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TILE * 0.92, 1.4, TILE * 0.92),
    matFlat(Palette.woodDeep),
  );
  mesh.position.set(tx * TILE + TILE / 2, 1.5, ty * TILE + TILE / 2);
  mesh.receiveShadow = true;
  // Accent strip so new flooring reads as intentional paint
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(TILE * 0.92, 0.2, TILE * 0.18),
    matFlat(Palette.mintDark),
  );
  stripe.position.set(0, 0.75, 0);
  mesh.add(stripe);
  return mesh;
}

export function furnitureLabel(defId: string): string {
  return furnitureById[defId]?.name ?? "item";
}

export function cloneHeld(hit: PlacedFurniture): PlacedFurniture {
  return { ...hit, rot: hit.rot ?? "down" };
}
