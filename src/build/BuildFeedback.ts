import * as THREE from "three";
import type { Dir, PlacedFurniture } from "../data/types";
import { furnitureById } from "../data/furniture";
import {
  DEFAULT_FLOOR_STYLE_ID,
  floorStyleByVariant,
  type FloorStyleDef,
} from "../data/floorStyles";
import { TILE } from "../game/constants";
import {
  applyFurnitureRotation,
  createFurnitureMesh,
  furnitureFootprint,
  furnitureOnSurfacePos,
  furnitureWorldPos,
  nextFurnitureDir,
  SURFACE_ITEM_SCALE,
  surfaceItemScaleFor,
  yawForFurniture,
} from "../mesh/furniture";
import type { TownRenderer } from "../render/TownRenderer";
import { matFlat } from "../mesh/materials";
import { woodFloorTexture } from "../mesh/terrainTextures";

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
    surfaceY = 0,
    host?: PlacedFurniture | null,
  ) {
    const { tw, th } = furnitureFootprint(defId, rot);
    this.renderer.setBuildSelection(null);
    this.renderer.setHoverTile({ tx, ty }, { tw, th, ok });

    const onSurface = !!host;
    // Rebuild when host presence changes so scale matches floor vs surface.
    const ghostKey = `${defId}:${onSurface ? host!.uid : "floor"}`;
    if (this.ghostDefId !== ghostKey || !this.ghost) {
      const mesh = createFurnitureMesh(defId);
      if (onSurface) {
        const hostMesh = createFurnitureMesh(host!.defId);
        mesh.scale.setScalar(
          surfaceItemScaleFor(mesh, hostMesh, host!.rot ?? "down"),
        );
      } else {
        const def = furnitureById[defId];
        if (def?.placeOnSurface) mesh.scale.setScalar(SURFACE_ITEM_SCALE);
      }
      mesh.traverse((o) => {
        if (o instanceof THREE.Mesh) o.raycast = () => {};
      });
      this.renderer.setGhost(mesh);
      this.ghost = mesh;
      this.ghostDefId = ghostKey;
    }

    // Flush / surface bias measure local Z depth - reset yaw before measuring.
    this.ghost!.rotation.y = 0;
    let x: number;
    let z: number;
    if (host) {
      const hostMesh = createFurnitureMesh(host.defId);
      ({ x, z } = furnitureOnSurfacePos(
        defId,
        tx,
        ty,
        rot,
        host,
        hostMesh,
        this.ghost!,
      ));
    } else {
      ({ x, z } = furnitureWorldPos(defId, tx, ty, rot, this.ghost!));
    }
    applyFurnitureRotation(this.ghost!, rot);
    this.ghost!.position.set(x, surfaceY, z);
    this.renderer.setGhostTint(ok);
  }

  showFurnitureSelect(mesh: THREE.Object3D | null) {
    this.renderer.setGhost(null);
    this.ghost = null;
    this.ghostDefId = null;
    this.renderer.setHoverTile(null);
    this.renderer.setBuildSelection(mesh);
  }

  showTileTool(
    tx: number,
    ty: number,
    ok: boolean,
    tool: "wall" | "floor" | "sell",
    opts?: { tw?: number; th?: number },
  ) {
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
    this.renderer.setHoverTile(
      { tx, ty },
      { tw: opts?.tw ?? 1, th: opts?.th ?? 1, ok, fill },
    );
  }
}

export function rotateDir(dir: Dir): Dir {
  return nextFurnitureDir(dir);
}

function paintFloorMaterial(style: FloorStyleDef): THREE.Material {
  if (style.variant === 1 || style.variant === 6) {
    return matFlat(style.color, { map: woodFloorTexture() });
  }
  return matFlat(style.color);
}

/** Painted floor overlay for a home tile; pattern rotates with `rot`. */
export function createPaintFloorMesh(
  tx: number,
  ty: number,
  variant = 1,
  rot: Dir = "down",
): THREE.Mesh {
  const style =
    floorStyleByVariant[variant] ??
    floorStyleByVariant[1]!;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TILE * 0.92, 1.4, TILE * 0.92),
    paintFloorMaterial(style),
  );
  mesh.position.set(tx * TILE + TILE / 2, 1.5, ty * TILE + TILE / 2);
  mesh.rotation.y = yawForFurniture(rot);
  mesh.receiveShadow = true;

  if (style.variant === 1) {
    // Classic mint stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.92, 0.2, TILE * 0.18),
      matFlat(style.accent),
    );
    stripe.position.set(0, 0.75, 0);
    mesh.add(stripe);
  } else if (style.variant === 2) {
    // Cream checker - two corner pads
    for (const [x, z] of [
      [-TILE * 0.22, -TILE * 0.22],
      [TILE * 0.22, TILE * 0.22],
    ] as const) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(TILE * 0.38, 0.18, TILE * 0.38),
        matFlat(style.accent),
      );
      pad.position.set(x, 0.75, z);
      mesh.add(pad);
    }
  } else if (style.variant === 3) {
    // Slate with sky grout cross
    const h = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.92, 0.16, TILE * 0.1),
      matFlat(style.accent),
    );
    h.position.set(0, 0.75, 0);
    mesh.add(h);
    const v = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.1, 0.16, TILE * 0.92),
      matFlat(style.accent),
    );
    v.position.set(0, 0.75, 0);
    mesh.add(v);
  } else if (style.variant === 4) {
    // Sage wash with cream border
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.78, 0.16, TILE * 0.78),
      matFlat(style.accent),
    );
    border.position.set(0, 0.75, 0);
    mesh.add(border);
  } else if (style.variant === 5) {
    // Clay diamond
    const diamond = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.42, 0.18, TILE * 0.42),
      matFlat(style.accent),
    );
    diamond.position.set(0, 0.75, 0);
    diamond.rotation.y = Math.PI / 4;
    mesh.add(diamond);
  } else if (style.variant === 6) {
    // Blush boards with cream stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.92, 0.2, TILE * 0.14),
      matFlat(style.accent),
    );
    stripe.position.set(0, 0.75, 0);
    mesh.add(stripe);
  }

  mesh.userData.floorVariant = style.variant;
  mesh.userData.floorRot = rot;
  mesh.userData.floorStyleId = style.id ?? DEFAULT_FLOOR_STYLE_ID;
  return mesh;
}

export function furnitureLabel(defId: string): string {
  return furnitureById[defId]?.name ?? "item";
}

export function cloneHeld(hit: PlacedFurniture): PlacedFurniture {
  return { ...hit, rot: hit.rot ?? "down" };
}
