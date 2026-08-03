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
    "grass_v6",
    (ctx, s) => {
      // Organic meadow base - seamless fbm instead of a stamped diagonal wash.
      paintNoiseField(ctx, s, Palette.grassLight, Palette.grassDeep, 5, 1.15);

      // Broad cloud-shadow lobes (wrapped, soft)
      const clouds: Array<{ x: number; y: number; r: number; a: number }> = [
        { x: s * 0.14, y: s * 0.18, r: s * 0.62, a: 0.28 },
        { x: s * 0.82, y: s * 0.5, r: s * 0.56, a: 0.24 },
        { x: s * 0.42, y: s * 0.88, r: s * 0.52, a: 0.2 },
        { x: s * 0.92, y: s * 0.08, r: s * 0.4, a: 0.18 },
        { x: s * 0.08, y: s * 0.7, r: s * 0.36, a: 0.16 },
        { x: s * 0.6, y: s * 0.28, r: s * 0.32, a: 0.14 },
      ];
      for (const c of clouds) {
        softBlob(ctx, s, c.x, c.y, c.r, rgba(Palette.grassDeep, c.a));
      }

      // Warm sun breaks
      softBlob(ctx, s, s * 0.55, s * 0.34, s * 0.44, rgba(Palette.grassLight, 0.34));
      softBlob(ctx, s, s * 0.28, s * 0.66, s * 0.36, rgba(Palette.leafLight, 0.14));
      softBlob(ctx, s, s * 0.76, s * 0.76, s * 0.3, rgba(Palette.grassLight, 0.18));

      // Mid-scale turf / clover patches from noise seeds
      for (let i = 0; i < 16; i++) {
        const x = hash2(i * 3, 11) * s;
        const y = hash2(i * 5, 29) * s;
        const r = s * (0.07 + hash2(i, 41) * 0.1);
        const tone =
          i % 3 === 0
            ? rgba(Palette.leafLight, 0.2)
            : i % 2
              ? rgba(Palette.grassDeep, 0.18)
              : rgba(Palette.grassLight, 0.22);
        softBlob(ctx, s, x, y, r, tone);
      }

      // Soil flecks - sparse, noise-placed
      for (let i = 0; i < 36; i++) {
        const x = hash2(i * 7, 3) * s;
        const y = hash2(i * 11, 17) * s;
        ctx.fillStyle =
          i % 4 === 0
            ? rgba(Palette.woodDark, 0.14)
            : i % 2
              ? rgba(Palette.grassDeep, 0.24)
              : rgba(Palette.grassLight, 0.3);
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          1.1 + hash2(i, 2) * 1.2,
          0.8 + hash2(i, 5) * 0.8,
          hash2(i, 9) * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Blade tufts - 3–5 strokes sharing a root so they read as turf, not hash
      for (let t = 0; t < 14; t++) {
        const bx = hash2(t * 13, 7) * s;
        const by = hash2(t * 19, 23) * s;
        const blades = 3 + (t % 3);
        for (let b = 0; b < blades; b++) {
          const lean = (b - (blades - 1) / 2) * 1.1 + (hash2(t, b) - 0.5) * 0.6;
          const h = 4 + hash2(t * 2 + b, 31) * 4;
          const g = ctx.createLinearGradient(bx, by, bx + lean, by - h);
          g.addColorStop(0, rgba(Palette.grassDeep, 0.05));
          g.addColorStop(0.35, rgba(Palette.grassLight, 0.45));
          g.addColorStop(0.7, rgba(Palette.leafLight, 0.22));
          g.addColorStop(1, rgba(Palette.grassDeep, 0.02));
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.05 + hash2(b, t) * 0.45;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + lean * 0.35, by - h * 0.55, bx + lean, by - h);
          ctx.stroke();
        }
      }
    },
    256,
  );
}

export function pathTexture(): THREE.CanvasTexture {
  return makeTex(
    "path_v3",
    (ctx, s) => {
      paintNoiseField(ctx, s, Palette.pathLight, Palette.pathDark, 4, 1.05);

      // Packed-earth wear pools
      for (let i = 0; i < 12; i++) {
        const x = hash2(i, 4) * s;
        const y = hash2(i + 20, 8) * s;
        softBlob(
          ctx,
          s,
          x,
          y,
          12 + hash2(i, 12) * 16,
          i % 2 ? rgba(Palette.pathDark, 0.32) : rgba(Palette.pathLight, 0.36),
        );
      }

      // Soft wheel / foot ruts
      for (let i = 0; i < 3; i++) {
        const y0 = s * (0.22 + i * 0.28);
        const wobble = (hash2(i, 60) - 0.5) * 10;
        ctx.strokeStyle = rgba(Palette.pathDark, 0.14);
        ctx.lineWidth = 5 + i;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-4, y0);
        for (let x = 0; x <= s + 4; x += 18) {
          const dy = Math.sin(x * 0.07 + i) * 3.5 + wobble * (x / s);
          ctx.lineTo(x, y0 + dy);
        }
        ctx.stroke();
      }

      softBlob(ctx, s, s * 0.55, s * 0.4, s * 0.45, rgba(Palette.sand, 0.14));
      softBlob(ctx, s, s * 0.2, s * 0.72, s * 0.34, rgba(Palette.woodDark, 0.1));

      // Irregular gravel chips (faceted ovals, not uniform pebbles)
      for (let i = 0; i < 48; i++) {
        const x = hash2(i * 3, 1) * s;
        const y = hash2(i * 5, 9) * s;
        const rw = 2.2 + hash2(i, 14) * 3.2;
        const rh = 1.4 + hash2(i, 18) * 2.2;
        const rot = hash2(i, 22) * Math.PI;
        const light = i % 3 === 0 ? Palette.sand : Palette.pathLight;
        const dark = i % 2 ? Palette.pathDark : Palette.woodDark;
        const g = ctx.createLinearGradient(
          x - Math.sin(rot) * rh,
          y - Math.cos(rot) * rh,
          x + Math.sin(rot) * rh,
          y + Math.cos(rot) * rh,
        );
        g.addColorStop(0, rgba(light, 0.7));
        g.addColorStop(1, rgba(dark, 0.45));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
        ctx.fill();
        // Tiny highlight lip
        ctx.fillStyle = rgba(light, 0.35);
        ctx.beginPath();
        ctx.ellipse(x - rw * 0.25, y - rh * 0.3, rw * 0.35, rh * 0.28, rot, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fine grit
      for (let i = 0; i < 70; i++) {
        const x = hash2(i * 11, 33) * s;
        const y = hash2(i * 17, 37) * s;
        ctx.fillStyle =
          i % 5 === 0
            ? rgba(Palette.pathDark, 0.38)
            : rgba(Palette.pathLight, 0.42);
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          0.9 + hash2(i, 40) * 0.9,
          0.7 + hash2(i, 44) * 0.6,
          hash2(i, 48) * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
    128,
  );
}

/** Lighter mulchy park lane - distinct from town gravel. */
export function parkPathTexture(): THREE.CanvasTexture {
  return makeTex(
    "parkPath_v2",
    (ctx, s) => {
      paintNoiseField(ctx, s, Palette.sand, Palette.path, 4, 1.1);

      softBlob(ctx, s, s * 0.28, s * 0.32, s * 0.52, rgba(Palette.pathLight, 0.36));
      softBlob(ctx, s, s * 0.74, s * 0.7, s * 0.44, rgba(Palette.pathDark, 0.24));
      softBlob(ctx, s, s * 0.52, s * 0.18, s * 0.32, rgba(Palette.wood, 0.12));

      for (let i = 0; i < 20; i++) {
        softBlob(
          ctx,
          s,
          hash2(i, 50) * s,
          hash2(i, 51) * s,
          8 + hash2(i, 52) * 12,
          i % 2 ? rgba(Palette.woodDark, 0.16) : rgba(Palette.sand, 0.22),
        );
      }

      // Overlapping bark / mulch chips
      for (let i = 0; i < 40; i++) {
        const x = hash2(i * 2, 60) * s;
        const y = hash2(i * 3, 61) * s;
        const rw = 3 + hash2(i, 62) * 4;
        const rh = 1.1 + hash2(i, 63) * 1.6;
        const rot = hash2(i, 64) * Math.PI;
        ctx.fillStyle =
          i % 4 === 0
            ? rgba(Palette.woodDeep, 0.28)
            : i % 2
              ? rgba(Palette.woodDark, 0.34)
              : rgba(Palette.wood, 0.3);
        ctx.beginPath();
        ctx.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft leaf litter flecks
      for (let i = 0; i < 10; i++) {
        softBlob(
          ctx,
          s,
          hash2(i, 70) * s,
          hash2(i, 71) * s,
          3 + hash2(i, 72) * 4,
          i % 2 ? rgba(Palette.leaf, 0.12) : rgba(Palette.leafLight, 0.14),
        );
      }
    },
    128,
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
    "water_v2",
    (ctx, s) => {
      paintNoiseField(ctx, s, Palette.waterFoam, Palette.waterDeep, 4, 1.05);

      softBlob(ctx, s, s * 0.22, s * 0.28, s * 0.42, rgba(Palette.waterFoam, 0.4));
      softBlob(ctx, s, s * 0.74, s * 0.7, s * 0.38, rgba(Palette.waterDeep, 0.34));
      softBlob(ctx, s, s * 0.55, s * 0.18, s * 0.3, rgba(Palette.water, 0.28));
      softBlob(ctx, s, s * 0.4, s * 0.55, s * 0.35, rgba(Palette.water, 0.2));

      // Soft concentric ripples
      for (let r = 0; r < 4; r++) {
        const cx = s * (0.35 + hash2(r, 120) * 0.3);
        const cy = s * (0.3 + hash2(r, 121) * 0.4);
        const rad = s * (0.12 + r * 0.1);
        for (const [ox, oy] of [
          [0, 0],
          [-s, 0],
          [s, 0],
          [0, -s],
          [0, s],
        ] as const) {
          const g = ctx.createRadialGradient(cx + ox, cy + oy, rad * 0.7, cx + ox, cy + oy, rad);
          g.addColorStop(0, "rgba(214,242,251,0)");
          g.addColorStop(0.55, rgba(Palette.waterFoam, 0.22));
          g.addColorStop(0.75, "rgba(214,242,251,0)");
          g.addColorStop(1, "rgba(214,242,251,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Glint streaks
      for (let i = 0; i < 12; i++) {
        const x = hash2(i, 130) * s;
        const y = hash2(i, 131) * s;
        const wave = ctx.createLinearGradient(x, y, x + 18, y + 3);
        wave.addColorStop(0, "rgba(214,242,251,0)");
        wave.addColorStop(0.5, "rgba(214,242,251,0.45)");
        wave.addColorStop(1, "rgba(214,242,251,0)");
        ctx.fillStyle = wave;
        ctx.beginPath();
        ctx.ellipse(x + 9, y, 11, 1.5, hash2(i, 132) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    128,
  );
}
