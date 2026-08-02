import * as THREE from "three";
import { Palette } from "../game/palette";

const cache = new Map<string, THREE.CanvasTexture>();

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function rgba(n: number, a: number): string {
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

/** Soft disc that wraps so the tile repeats without hard seams. */
function softBlob(
  ctx: CanvasRenderingContext2D,
  size: number,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const positions = [
    [x, y],
    [x - size, y],
    [x + size, y],
    [x, y - size],
    [x, y + size],
    [x - size, y - size],
    [x + size, y - size],
    [x - size, y + size],
    [x + size, y + size],
  ];
  for (const [px, py] of positions) {
    if (px + radius < 0 || py + radius < 0 || px - radius > size || py - radius > size) {
      continue;
    }
    const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
  }
}

function makeTex(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 128,
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
  // Linear keeps soft gradients readable; no mips avoids valley banding.
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  cache.set(key, t);
  return t;
}

export function grassTexture(): THREE.CanvasTexture {
  return makeTex(
    "grass_v4",
    (ctx, s) => {
      // Broad global wash - less “stamped tile”, more meadow light.
      const base = ctx.createLinearGradient(0, 0, s * 0.85, s);
      base.addColorStop(0, hex(Palette.grassLight));
      base.addColorStop(0.3, hex(Palette.grass));
      base.addColorStop(0.62, hex(Palette.grass));
      base.addColorStop(1, hex(Palette.grassDark));
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);

      // Second soft gradient cross-wise so the repeat doesn't lock to one diagonal.
      const wash = ctx.createRadialGradient(
        s * 0.55,
        s * 0.4,
        s * 0.05,
        s * 0.5,
        s * 0.5,
        s * 0.85,
      );
      wash.addColorStop(0, rgba(Palette.grassLight, 0.35));
      wash.addColorStop(0.55, rgba(Palette.grass, 0));
      wash.addColorStop(1, rgba(Palette.grassDeep, 0.22));
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, s, s);

      // Large seamless cloud-shadow lobes (wrapped so tile edges stay soft).
      const clouds: Array<{ x: number; y: number; r: number; a: number }> = [
        { x: s * 0.18, y: s * 0.22, r: s * 0.58, a: 0.32 },
        { x: s * 0.78, y: s * 0.55, r: s * 0.52, a: 0.26 },
        { x: s * 0.42, y: s * 0.88, r: s * 0.48, a: 0.24 },
        { x: s * 0.92, y: s * 0.12, r: s * 0.4, a: 0.2 },
        { x: s * 0.08, y: s * 0.7, r: s * 0.36, a: 0.18 },
      ];
      for (const c of clouds) {
        softBlob(ctx, s, c.x, c.y, c.r, rgba(Palette.grassDeep, c.a));
      }

      // Sun breaks between shadows
      softBlob(ctx, s, s * 0.58, s * 0.38, s * 0.4, rgba(Palette.grassLight, 0.3));
      softBlob(ctx, s, s * 0.28, s * 0.62, s * 0.32, rgba(Palette.grassLight, 0.2));

      // Sparse mid-scale mottling (not a busy speckled grid)
      for (let i = 0; i < 9; i++) {
        const x = (i * 41 + 17) % s;
        const y = (i * 59 + 23) % s;
        const r = s * (0.12 + (i % 3) * 0.04);
        softBlob(
          ctx,
          s,
          x,
          y,
          r,
          i % 2
            ? rgba(Palette.grassDeep, 0.14)
            : rgba(Palette.grassLight, 0.16),
        );
      }

      // Very few blade hints - just a touch of life, not a repeating hash.
      for (let i = 0; i < 16; i++) {
        const x = (i * 31 + 9) % s;
        const y = (i * 47 + 13) % s;
        const g = ctx.createLinearGradient(x, y, x, y + 6);
        g.addColorStop(0, rgba(Palette.grassLight, 0.35));
        g.addColorStop(1, rgba(Palette.grassDeep, 0.04));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 1.4, 3 + (i % 2));
      }
    },
    256,
  );
}

export function pathTexture(): THREE.CanvasTexture {
  return makeTex("path", (ctx, s) => {
    const base = ctx.createRadialGradient(s * 0.35, s * 0.3, 4, s * 0.5, s * 0.55, s * 0.85);
    base.addColorStop(0, hex(Palette.pathLight));
    base.addColorStop(0.55, hex(Palette.path));
    base.addColorStop(1, hex(Palette.pathDark));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 14; i++) {
      const x = (i * 41 + 9) % s;
      const y = (i * 27 + 15) % s;
      const rx = 8 + (i % 4) * 3;
      softBlob(
        ctx,
        s,
        x,
        y,
        rx,
        i % 2 ? rgba(Palette.pathDark, 0.28) : rgba(Palette.pathLight, 0.32),
      );
    }

    // Soft pebble ovals with a mild top-to-bottom gradient.
    for (let i = 0; i < 22; i++) {
      const x = (i * 13 + 5) % s;
      const y = (i * 19 + 11) % s;
      const rw = 4 + (i % 3);
      const rh = 2.5 + (i % 2);
      const g = ctx.createLinearGradient(x, y - rh, x, y + rh);
      g.addColorStop(0, rgba(Palette.pathLight, 0.55));
      g.addColorStop(1, rgba(Palette.pathDark, 0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rh, (i % 5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function woodFloorTexture(): THREE.CanvasTexture {
  return makeTex("woodFloor", (ctx, s) => {
    const plankH = 16;
    for (let y = 0; y < s; y += plankH) {
      const alt = (y / plankH) % 2 === 0;
      const mid = alt ? Palette.floor : Palette.floorAlt;
      const g = ctx.createLinearGradient(0, y, 0, y + plankH);
      g.addColorStop(0, hex(Palette.floorDark));
      g.addColorStop(0.18, hex(mid));
      g.addColorStop(0.72, hex(mid));
      g.addColorStop(1, rgba(Palette.floorDark, 0.85));
      ctx.fillStyle = g;
      ctx.fillRect(0, y, s, plankH - 1);

      // Soft lengthwise warmth so boards aren't flat slabs.
      const shine = ctx.createLinearGradient(0, y, s, y + plankH);
      shine.addColorStop(0, "rgba(255,245,220,0)");
      shine.addColorStop(0.35, "rgba(255,245,220,0.14)");
      shine.addColorStop(0.7, "rgba(255,245,220,0)");
      shine.addColorStop(1, "rgba(90,60,35,0.08)");
      ctx.fillStyle = shine;
      ctx.fillRect(0, y + 1, s, plankH - 3);

      ctx.strokeStyle = "rgba(74,52,40,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + plankH - 1);
      ctx.lineTo(s, y + plankH - 1);
      ctx.stroke();
    }
  });
}

export function waterTexture(): THREE.CanvasTexture {
  return makeTex("water", (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, hex(Palette.waterFoam));
    g.addColorStop(0.28, hex(Palette.water));
    g.addColorStop(0.7, hex(Palette.waterDeep));
    g.addColorStop(1, hex(Palette.water));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    softBlob(ctx, s, s * 0.25, s * 0.3, s * 0.4, rgba(Palette.waterFoam, 0.35));
    softBlob(ctx, s, s * 0.72, s * 0.68, s * 0.35, rgba(Palette.waterDeep, 0.3));
    softBlob(ctx, s, s * 0.55, s * 0.2, s * 0.28, rgba(Palette.water, 0.25));

    for (let i = 0; i < 10; i++) {
      const x = (i * 23 + 8) % s;
      const y = (i * 31 + 14) % s;
      const wave = ctx.createLinearGradient(x, y, x + 16, y + 2);
      wave.addColorStop(0, "rgba(214,242,251,0)");
      wave.addColorStop(0.5, "rgba(214,242,251,0.4)");
      wave.addColorStop(1, "rgba(214,242,251,0)");
      ctx.fillStyle = wave;
      ctx.beginPath();
      ctx.ellipse(x + 8, y, 10, 1.6, (i % 4) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
