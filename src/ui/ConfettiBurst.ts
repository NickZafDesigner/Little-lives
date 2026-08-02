export type ConfettiPower = "soft" | "big" | "huge";

export type ConfettiPalette = "party" | "gold";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  shape: 0 | 1 | 2;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
}

const PARTY_COLORS = [
  "#ff4d6d",
  "#ff8fa3",
  "#ff9f1c",
  "#ffd60a",
  "#80ed99",
  "#06d6a0",
  "#4cc9f0",
  "#4361ee",
  "#b5179e",
  "#f72585",
  "#ff6b35",
  "#7b2cbf",
  "#00f5d4",
  "#fee440",
];

const GOLD_COLORS = [
  "#ffe566",
  "#ffd60a",
  "#ffc300",
  "#ffaa00",
  "#fff1a8",
  "#f4a261",
  "#80ed99",
  "#2f8f3a",
  "#ffffff",
  "#ff9f1c",
];

const PALETTES: Record<ConfettiPalette, string[]> = {
  party: PARTY_COLORS,
  gold: GOLD_COLORS,
};

const COUNTS: Record<ConfettiPower, number> = {
  soft: 48,
  big: 96,
  huge: 180,
};

/**
 * Full-bleed canvas confetti for minigame / shift celebrations.
 * pointer-events: none - never blocks play.
 */
export class ConfettiBurst {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private raf = 0;
  private lastT = 0;
  private dpr = 1;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-confetti";
    this.root.setAttribute("aria-hidden", "true");
    this.canvas = document.createElement("canvas");
    this.canvas.className = "ll-confetti-canvas";
    this.root.appendChild(this.canvas);
    parent.appendChild(this.root);
    this.ctx = this.canvas.getContext("2d")!;
    this.fit();
    window.addEventListener("resize", this.onResize);
  }

  /** Burst from upper-center (default) or a CSS-pixel origin in the overlay. */
  burst(
    power: ConfettiPower = "big",
    origin?: { x: number; y: number },
    palette: ConfettiPalette = "party",
  ) {
    this.fit();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ox = origin?.x ?? w * (0.35 + Math.random() * 0.3);
    const oy = origin?.y ?? h * (0.28 + Math.random() * 0.12);
    const n = COUNTS[power];
    const colors = PALETTES[palette];
    const spread = power === "huge" ? 1.35 : power === "big" ? 1 : 0.75;
    const speed = power === "huge" ? 1.45 : power === "big" ? 1.1 : 0.85;

    for (let i = 0; i < n; i++) {
      const angle =
        -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35 * spread;
      const mag = (420 + Math.random() * 520) * speed;
      const size = 5 + Math.random() * 9;
      this.particles.push({
        x: ox + (Math.random() - 0.5) * 40,
        y: oy + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * mag * (0.55 + Math.random() * 0.7),
        vy: Math.sin(angle) * mag * (0.7 + Math.random() * 0.55),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 14,
        w: size * (0.55 + Math.random() * 0.9),
        h: size * (0.35 + Math.random() * 0.7),
        color: colors[(Math.random() * colors.length) | 0]!,
        shape: ((Math.random() * 3) | 0) as Particle["shape"],
        life: 0,
        maxLife: 1.35 + Math.random() * 1.1,
        gravity: 980 + Math.random() * 420,
        drag: 0.985 + Math.random() * 0.01,
      });
    }

    // Second pop from the sides for bigger bursts
    if (power !== "soft") {
      for (const side of [-1, 1]) {
        const sx = w * (0.5 + side * 0.28);
        const sy = h * 0.55;
        const extra = power === "huge" ? 36 : 16;
        for (let i = 0; i < extra; i++) {
          const angle =
            -Math.PI / 2 + side * 0.55 + (Math.random() - 0.5) * 0.9;
          const mag = (280 + Math.random() * 380) * speed;
          const size = 4 + Math.random() * 7;
          this.particles.push({
            x: sx,
            y: sy,
            vx: Math.cos(angle) * mag,
            vy: Math.sin(angle) * mag,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 12,
            w: size,
            h: size * 0.55,
            color: colors[(Math.random() * colors.length) | 0]!,
            shape: ((Math.random() * 3) | 0) as Particle["shape"],
            life: 0,
            maxLife: 1.1 + Math.random() * 0.9,
            gravity: 1100,
            drag: 0.988,
          });
        }
      }
    }

    this.start();
  }

  destroy() {
    window.removeEventListener("resize", this.onResize);
    this.stop();
    this.particles = [];
    this.root.remove();
  }

  private onResize = () => this.fit();

  private fit() {
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private start() {
    if (this.raf) return;
    this.lastT = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      this.step(dt);
      this.draw();
      if (this.particles.length === 0) this.stop();
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
  }

  private step(dt: number) {
    const h = this.canvas.clientHeight;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.maxLife || p.y > h + 40) continue;
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      next.push(p);
    }
    this.particles = next;
  }

  private draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 0) {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (p.shape === 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.h / 2);
        ctx.lineTo(p.w / 2, p.h / 2);
        ctx.lineTo(-p.w / 2, p.h / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
