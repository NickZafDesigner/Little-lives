import { TILE } from "../game/constants";

/** Tile center → Three.js world (Y-up, Z = map south). */
export function tileToWorld(tx: number, ty: number, y = 0): [number, number, number] {
  return [tx * TILE + TILE / 2, y, ty * TILE + TILE / 2];
}

export function pixelToWorld(px: number, py: number, y = 0): [number, number, number] {
  return [px, y, py];
}

export function worldToTile(x: number, z: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(x / TILE),
    ty: Math.floor(z / TILE),
  };
}

export function hexColor(n: number): number {
  return n & 0xffffff;
}
