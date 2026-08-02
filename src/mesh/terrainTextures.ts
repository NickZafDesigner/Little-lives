import * as THREE from "three";
import { Palette } from "../game/palette";

const cache = new Map<string, THREE.CanvasTexture>();

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function makeTex(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 64,
): THREE.CanvasTexture {
  let t = cache.get(key);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  // Nearest + no mips keeps tile edges crisp; linear mips banded across the valley.
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  cache.set(key, t);
  return t;
}

export function grassTexture(): THREE.CanvasTexture {
  return makeTex("grass", (ctx, s) => {
    ctx.fillStyle = hex(Palette.grass);
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      const x = (i * 17) % s;
      const y = (i * 29) % s;
      ctx.fillStyle = i % 3 === 0 ? hex(Palette.grassLight) : hex(Palette.grassDark);
      ctx.fillRect(x, y, 2, 3 + (i % 4));
    }
  });
}

export function pathTexture(): THREE.CanvasTexture {
  return makeTex("path", (ctx, s) => {
    ctx.fillStyle = hex(Palette.path);
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 ? hex(Palette.pathDark) : hex(Palette.pathLight);
      const x = (i * 13) % s;
      const y = (i * 19) % s;
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + (i % 3), 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function woodFloorTexture(): THREE.CanvasTexture {
  return makeTex("woodFloor", (ctx, s) => {
    ctx.fillStyle = hex(Palette.floor);
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? hex(Palette.floorDark) : hex(Palette.floorAlt);
      ctx.fillRect(0, y, s, 7);
      ctx.strokeStyle = "rgba(74,52,40,0.12)";
      ctx.beginPath();
      ctx.moveTo(0, y + 7);
      ctx.lineTo(s, y + 7);
      ctx.stroke();
    }
  });
}

export function waterTexture(): THREE.CanvasTexture {
  return makeTex("water", (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, hex(Palette.water));
    g.addColorStop(1, hex(Palette.waterDeep));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(214,242,251,0.35)";
    for (let i = 0; i < 12; i++) {
      ctx.fillRect((i * 11) % s, (i * 17) % s, 10, 2);
    }
  });
}
