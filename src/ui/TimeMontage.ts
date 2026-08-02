/**
 * Full-screen clock + lighting scrub for sleep / end-of-shift beats.
 */

export type MontageTheme = "night" | "dusk" | "dawn";

export interface TimeMontageOpts {
  from: number;
  to: number;
  /** Scrub forward wrapping past midnight (sleep). */
  wrap?: boolean;
  durationMs?: number;
  caption?: string;
  theme?: MontageTheme;
  onTick: (dayTime: number) => void;
  onDone: () => void;
}

function clockLabel(dayTime: number): string {
  const hours = Math.floor(dayTime * 24);
  const mins = Math.floor((dayTime * 24 * 60) % 60);
  const h12 = ((hours + 11) % 12) + 1;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

function scrubAt(from: number, to: number, wrap: boolean, u: number): number {
  if (!wrap) return from + (to - from) * u;
  let dist = to - from;
  if (dist <= 0) dist += 1;
  return (from + dist * u) % 1;
}

export class TimeMontage {
  private root: HTMLElement;
  private clockEl: HTMLElement;
  private handH: HTMLElement;
  private handM: HTMLElement;
  private digital: HTMLElement;
  private captionEl: HTMLElement;
  private playing = false;
  private raf = 0;
  private startMs = 0;
  private opts: TimeMontageOpts | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-montage";
    this.root.hidden = true;
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-montage-wash"></div>
      <div class="ll-montage-card">
        <div class="ll-montage-clock" aria-hidden="true">
          <div class="ll-montage-face">
            <span class="ll-montage-tick" style="--i:0"></span>
            <span class="ll-montage-tick" style="--i:1"></span>
            <span class="ll-montage-tick" style="--i:2"></span>
            <span class="ll-montage-tick" style="--i:3"></span>
            <span class="ll-montage-hand ll-montage-hand-h"></span>
            <span class="ll-montage-hand ll-montage-hand-m"></span>
            <span class="ll-montage-pip"></span>
          </div>
        </div>
        <b class="ll-montage-digital">12:00 AM</b>
        <p class="ll-montage-caption"></p>
      </div>
    `;
    this.clockEl = this.root.querySelector(".ll-montage-clock") as HTMLElement;
    this.handH = this.root.querySelector(".ll-montage-hand-h") as HTMLElement;
    this.handM = this.root.querySelector(".ll-montage-hand-m") as HTMLElement;
    this.digital = this.root.querySelector(".ll-montage-digital") as HTMLElement;
    this.captionEl = this.root.querySelector(".ll-montage-caption") as HTMLElement;
    parent.appendChild(this.root);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  play(opts: TimeMontageOpts) {
    if (this.playing) this.finish(false);
    this.opts = opts;
    this.playing = true;
    this.startMs = performance.now();
    const theme = opts.theme ?? (opts.wrap ? "night" : "dusk");
    this.root.dataset.theme = theme;
    this.captionEl.textContent = opts.caption ?? "";
    this.captionEl.hidden = !opts.caption;
    this.root.hidden = false;
    this.root.classList.remove("is-out");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");
    this.applyTime(opts.from);
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.playing = false;
    this.root.remove();
  }

  private tick = (now: number) => {
    if (!this.playing || !this.opts) return;
    const dur = this.opts.durationMs ?? 2200;
    const u = Math.min(1, (now - this.startMs) / dur);
    const eased = u * u * (3 - 2 * u);
    const t = scrubAt(
      this.opts.from,
      this.opts.to,
      !!this.opts.wrap,
      eased,
    );
    this.applyTime(t);
    this.opts.onTick(t);
    if (u >= 1) {
      this.finish(true);
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private applyTime(dayTime: number) {
    const hours = dayTime * 24;
    const mins = (hours % 1) * 60;
    const hAngle = ((hours % 12) / 12) * 360 + (mins / 60) * 30;
    const mAngle = (mins / 60) * 360;
    this.handH.style.transform = `rotate(${hAngle}deg)`;
    this.handM.style.transform = `rotate(${mAngle}deg)`;
    this.digital.textContent = clockLabel(dayTime);
    this.clockEl.style.setProperty("--spin", `${dayTime * 720}deg`);
  }

  private finish(callDone: boolean) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    const opts = this.opts;
    this.opts = null;
    this.playing = false;
    this.root.classList.remove("is-in");
    this.root.classList.add("is-out");
    window.setTimeout(() => {
      if (!this.playing) this.root.hidden = true;
    }, 280);
    if (callDone && opts) {
      opts.onTick(opts.to);
      opts.onDone();
    }
  }
}
