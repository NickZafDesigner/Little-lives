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

function lerpByte(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(a: number, b: number, t: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, t));
  return [
    lerpByte((a >> 16) & 0xff, (b >> 16) & 0xff, u),
    lerpByte((a >> 8) & 0xff, (b >> 8) & 0xff, u),
    lerpByte(a & 0xff, b & 0xff, u),
  ];
}

function hash2(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Seamless value noise - `period` cells wrap across the tile. */
function snoise(px: number, py: number, size: number, period: number): number {
  const x = (px / size) * period;
  const y = (py / size) * period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const wrap = (i: number) => ((i % period) + period) % period;
  const a = hash2(wrap(x0), wrap(y0));
  const b = hash2(wrap(x0 + 1), wrap(y0));
  const c = hash2(wrap(x0), wrap(y0 + 1));
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(
  px: number,
  py: number,
  size: number,
  period: number,
  octaves = 3,
): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * snoise(px, py, size, Math.max(2, Math.round(period * freq)));
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
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

/** Fill canvas with a seamless 2-color fbm field (organic, no stamped wash). */
function paintNoiseField(
  ctx: CanvasRenderingContext2D,
  size: number,
  cA: number,
  cB: number,
  period: number,
  contrast = 1,
) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let t = fbm(x, y, size, period, 4);
      t = 0.5 + (t - 0.5) * contrast;
      t = Math.min(1, Math.max(0, t));
      const [r, g, b] = lerpRgb(cA, cB, t);
      const i = (y * size + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
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
    "grass_v8",
    (ctx, s) => {
      // Single soft diagonal wash - no noise, no flecks.
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, hex(Palette.grassLight));
      g.addColorStop(1, hex(Palette.grassDeep));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    64,
  );
}

export function pathTexture(): THREE.CanvasTexture {
  return makeTex(
    "path_v5",
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, hex(Palette.pathLight));
      g.addColorStop(1, hex(Palette.pathDark));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    64,
  );
}

/** Lighter mulchy park lane - same simple wash, sand → path. */
export function parkPathTexture(): THREE.CanvasTexture {
  return makeTex(
    "parkPath_v3",
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, hex(Palette.sand));
      g.addColorStop(1, hex(Palette.path));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    64,
  );
}

export function sandTexture(): THREE.CanvasTexture {
  return makeTex(
    "sand_v2",
    (ctx, s) => {
      paintNoiseField(ctx, s, Palette.cream, Palette.sandDark, 5, 0.95);

      softBlob(ctx, s, s * 0.28, s * 0.3, s * 0.48, rgba(Palette.cream, 0.38));
      softBlob(ctx, s, s * 0.72, s * 0.66, s * 0.42, rgba(Palette.sandDark, 0.3));
      softBlob(ctx, s, s * 0.55, s * 0.18, s * 0.32, rgba(Palette.pathLight, 0.2));

      // Soft dune ripples
      for (let i = 0; i < 7; i++) {
        const y0 = s * (0.12 + i * 0.12);
        const wave = ctx.createLinearGradient(0, y0 - 4, 0, y0 + 4);
        wave.addColorStop(0, "rgba(255,246,229,0)");
        wave.addColorStop(0.45, rgba(Palette.cream, 0.22));
        wave.addColorStop(0.55, rgba(Palette.sandDark, 0.12));
        wave.addColorStop(1, "rgba(255,246,229,0)");
        ctx.fillStyle = wave;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let x = 0; x <= s; x += 8) {
          const dy = Math.sin(x * 0.085 + i * 1.3) * 2.8 + Math.sin(x * 0.04 + i) * 1.2;
          ctx.lineTo(x, y0 + dy);
        }
        ctx.lineTo(s, y0 + 5);
        ctx.lineTo(0, y0 + 5);
        ctx.closePath();
        ctx.fill();
      }

      for (let i = 0; i < 18; i++) {
        softBlob(
          ctx,
          s,
          hash2(i, 80) * s,
          hash2(i, 81) * s,
          6 + hash2(i, 82) * 10,
          i % 2 ? rgba(Palette.sandDark, 0.18) : rgba(Palette.cream, 0.2),
        );
      }

      // Fine grain
      for (let i = 0; i < 64; i++) {
        const x = hash2(i * 3, 90) * s;
        const y = hash2(i * 5, 91) * s;
        ctx.fillStyle =
          i % 3 === 0
            ? rgba(Palette.sandDark, 0.3)
            : rgba(Palette.cream, 0.34);
        ctx.fillRect(x, y, 1.1 + (i % 2) * 0.6, 0.9 + (i % 2) * 0.4);
      }
    },
    128,
  );
}

export function woodFloorTexture(): THREE.CanvasTexture {
  return makeTex(
    "woodFloor_v3",
    (ctx, s) => {
      const plankH = 16;
      const joints = [0.18, 0.62, 0.38, 0.78, 0.28, 0.7, 0.48, 0.88];

      for (let row = 0; row * plankH < s; row++) {
        const y = row * plankH;
        const alt = row % 2 === 0;
        // Slight per-plank hue shift so the floor feels lived-in
        const midBase = alt ? Palette.floor : Palette.floorAlt;
        const shift = (hash2(row, 100) - 0.5) * 0.12;
        const mid = (() => {
          const [r, g, b] = lerpRgb(
            midBase,
            shift > 0 ? Palette.woodLight : Palette.floorDark,
            Math.abs(shift),
          );
          return (r << 16) | (g << 8) | b;
        })();

        const g = ctx.createLinearGradient(0, y, 0, y + plankH);
        g.addColorStop(0, hex(Palette.floorDark));
        g.addColorStop(0.12, hex(mid));
        g.addColorStop(0.72, hex(mid));
        g.addColorStop(1, rgba(Palette.floorDark, 0.9));
        ctx.fillStyle = g;
        ctx.fillRect(0, y, s, plankH - 1);

        const shine = ctx.createLinearGradient(0, y, s, y + plankH);
        shine.addColorStop(0, "rgba(255,245,220,0)");
        shine.addColorStop(0.25 + hash2(row, 101) * 0.1, "rgba(255,245,220,0.18)");
        shine.addColorStop(0.55, "rgba(255,245,220,0.04)");
        shine.addColorStop(0.8, "rgba(90,60,35,0.08)");
        shine.addColorStop(1, "rgba(255,245,220,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(0, y + 1, s, plankH - 3);

        // Soft grain strokes
        for (let i = 0; i < 6; i++) {
          const gy = y + 2.5 + i * 2.1 + hash2(row, i) * 0.8;
          if (gy >= y + plankH - 2) continue;
          ctx.strokeStyle = rgba(Palette.woodDeep, 0.06 + (i % 2) * 0.035);
          ctx.lineWidth = 0.7 + hash2(i, row) * 0.4;
          ctx.beginPath();
          const x0 = hash2(row, i + 3) * 24;
          ctx.moveTo(x0 - 10, gy);
          for (let x = x0; x < s + 24; x += 26) {
            const wobble = (hash2(Math.floor(x / 13) + row, i) - 0.5) * 1.6;
            ctx.quadraticCurveTo(x + 13, gy + wobble, x + 26, gy);
          }
          ctx.stroke();
        }

        // Staggered end joints
        const jx = ((joints[row % joints.length] ?? 0.4) * s) % s;
        for (const offset of [0, s]) {
          const x = (jx + offset) % s;
          const jg = ctx.createLinearGradient(x - 2.5, y, x + 2.5, y);
          jg.addColorStop(0, "rgba(74,52,40,0)");
          jg.addColorStop(0.5, "rgba(74,52,40,0.26)");
          jg.addColorStop(1, "rgba(74,52,40,0)");
          ctx.fillStyle = jg;
          ctx.fillRect(x - 2.5, y + 1, 5, plankH - 3);
        }

        // Occasional soft knot
        if (row % 3 === 1 || hash2(row, 110) > 0.72) {
          const kx = hash2(row, 111) * s;
          const ky = y + plankH * (0.35 + hash2(row, 112) * 0.3);
          softBlob(ctx, s, kx, ky, 5, rgba(Palette.woodDeep, 0.2));
          softBlob(ctx, s, kx, ky, 2.4, rgba(Palette.woodDark, 0.24));
        }

        ctx.strokeStyle = "rgba(74,52,40,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + plankH - 1);
        ctx.lineTo(s, y + plankH - 1);
        ctx.stroke();
      }
    },
    128,
  );
}

export function waterTexture(): THREE.CanvasTexture {
  return makeTex(
    "water_v3",
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, hex(Palette.waterFoam));
      g.addColorStop(0.45, hex(Palette.water));
      g.addColorStop(1, hex(Palette.waterDeep));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    64,
  );
}
