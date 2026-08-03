import { Audio } from "../audio/AudioManager";
import type { Sex } from "../data/character";

export interface StoryPrologueOpts {
  lines: string[];
  onDone?: () => void;
}

const BEAT_KEYS = ["leave", "arrive", "morning"] as const;
const BEAT_LABELS = ["Leaving", "Arriving", "Until morning"] as const;

/**
 * Full-screen storybook wash with typewriter lines.
 * Used for the new-game arrival prologue before the bed wake cutscene.
 */
export class StoryPrologue {
  private root: HTMLElement;
  private textEl: HTMLElement;
  private eyebrowEl: HTMLElement;
  private continueEl: HTMLElement;
  private dotsEl: HTMLElement;
  private playing = false;
  private lines: string[] = [];
  private index = 0;
  private onDone: (() => void) | null = null;
  private ignoreUntil = 0;
  private exitTimer: number | null = null;
  private onKey: ((e: KeyboardEvent) => void) | null = null;
  private readonly exitMs = 850;

  private fullText = "";
  private shown = 0;
  private typing = false;
  private charAcc = 0;
  private readonly cps = 40;
  private charsSinceType = 0;
  private lastTs = 0;
  private raf = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-prologue";
    this.root.hidden = true;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-prologue-wash" aria-hidden="true"></div>
      <div class="ll-prologue-frame" aria-hidden="true">
        <i class="ll-prologue-frame-edge is-t"></i>
        <i class="ll-prologue-frame-edge is-r"></i>
        <i class="ll-prologue-frame-edge is-b"></i>
        <i class="ll-prologue-frame-edge is-l"></i>
        <b class="ll-prologue-corner is-tl"></b>
        <b class="ll-prologue-corner is-tr"></b>
        <b class="ll-prologue-corner is-br"></b>
        <b class="ll-prologue-corner is-bl"></b>
      </div>
      <div class="ll-prologue-motes" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
        <span></span><span></span>
      </div>
      <div class="ll-prologue-vignette" aria-hidden="true"></div>
      <div class="ll-prologue-stage">
        <p class="ll-prologue-eyebrow">A new little life</p>
        <div class="ll-prologue-ornament" aria-hidden="true">
          <span></span><i></i><span></span>
        </div>
        <p class="ll-prologue-text"></p>
        <div class="ll-prologue-dots" aria-hidden="true"></div>
        <div class="ll-prologue-continue" hidden>Click anywhere · Space</div>
      </div>
    `;
    this.textEl = this.root.querySelector(".ll-prologue-text") as HTMLElement;
    this.eyebrowEl = this.root.querySelector(
      ".ll-prologue-eyebrow",
    ) as HTMLElement;
    this.continueEl = this.root.querySelector(
      ".ll-prologue-continue",
    ) as HTMLElement;
    this.dotsEl = this.root.querySelector(".ll-prologue-dots") as HTMLElement;
    parent.appendChild(this.root);

    this.root.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.advance();
    });
  }

  isOpen(): boolean {
    return this.playing || !this.root.hidden;
  }

  /**
   * Drop an opaque curtain immediately (before story text) so the village
   * never flashes on screen during new-game world setup.
   */
  cover() {
    this.root.hidden = false;
    this.root.classList.remove("is-out", "is-dawn", "is-turn", "is-in");
    this.root.dataset.beat = "leave";
    this.textEl.textContent = "";
    this.continueEl.hidden = true;
    this.dotsEl.replaceChildren();
    this.eyebrowEl.textContent = "";
  }

  play(opts: StoryPrologueOpts) {
    if (this.playing) this.finish(false);
    const lines = opts.lines.map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      opts.onDone?.();
      return;
    }

    this.playing = true;
    this.lines = lines;
    this.index = 0;
    this.onDone = opts.onDone ?? null;
    // Give the slow entrance room before clicks can skip.
    this.ignoreUntil = performance.now() + 1400;

    this.buildDots(lines.length);
    this.root.hidden = false;
    this.root.classList.remove("is-out", "is-dawn", "is-turn");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");
    this.showLine(0);
    Audio.sfx("chime");

    this.onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this.advance();
      }
    };
    window.addEventListener("keydown", this.onKey);

    this.lastTs = performance.now();
    this.stopRaf();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.clearKey();
    this.stopRaf();
    if (this.exitTimer != null) window.clearTimeout(this.exitTimer);
    this.playing = false;
    this.root.remove();
  }

  private buildDots(n: number) {
    this.dotsEl.replaceChildren();
    for (let i = 0; i < n; i++) {
      const d = document.createElement("span");
      d.className = "ll-prologue-dot";
      this.dotsEl.appendChild(d);
    }
  }

  private setBeat(i: number) {
    const key = BEAT_KEYS[Math.min(i, BEAT_KEYS.length - 1)] ?? "leave";
    this.root.dataset.beat = key;
    this.eyebrowEl.textContent =
      BEAT_LABELS[Math.min(i, BEAT_LABELS.length - 1)] ?? "A new little life";
    this.eyebrowEl.classList.remove("is-swap");
    void this.eyebrowEl.offsetWidth;
    this.eyebrowEl.classList.add("is-swap");

    const dots = this.dotsEl.children;
    for (let d = 0; d < dots.length; d++) {
      dots[d]?.classList.toggle("is-on", d === i);
      dots[d]?.classList.toggle("is-done", d < i);
    }
  }

  private flashTurn() {
    this.root.classList.remove("is-turn");
    void this.root.offsetWidth;
    this.root.classList.add("is-turn");
  }

  private showLine(i: number) {
    this.index = i;
    this.setBeat(i);
    this.fullText = this.lines[i] ?? "";
    this.shown = 0;
    this.charAcc = 0;
    this.charsSinceType = 0;
    this.typing = true;
    this.textEl.textContent = "";
    this.textEl.classList.remove("is-swap");
    void this.textEl.offsetWidth;
    this.textEl.classList.add("is-swap");
    this.continueEl.hidden = true;
  }

  private finishTyping() {
    this.typing = false;
    this.shown = this.fullText.length;
    this.textEl.textContent = this.fullText;
    this.continueEl.hidden = false;
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.playing) return;

    const dt = Math.min(0.05, Math.max(0, (now - this.lastTs) / 1000));
    this.lastTs = now;

    if (this.typing) {
      this.charAcc += dt * this.cps;
      const add = Math.floor(this.charAcc);
      if (add > 0) {
        this.charAcc -= add;
        const prev = this.shown;
        this.shown = Math.min(this.fullText.length, this.shown + add);
        this.textEl.textContent = this.fullText.slice(0, this.shown);

        for (let c = prev; c < this.shown; c++) {
          const ch = this.fullText[c];
          if (!ch || ch === " ") continue;
          this.charsSinceType += 1;
          if (this.charsSinceType >= 3) {
            this.charsSinceType = 0;
            Audio.sfx("type");
          }
        }

        if (this.shown >= this.fullText.length) this.finishTyping();
      }
    }

    this.raf = requestAnimationFrame(this.tick);
  };

  private advance() {
    if (!this.playing) return;
    if (performance.now() < this.ignoreUntil) return;

    if (this.typing) {
      this.finishTyping();
      this.ignoreUntil = performance.now() + 180;
      return;
    }

    if (this.index + 1 < this.lines.length) {
      this.ignoreUntil = performance.now() + 280;
      this.flashTurn();
      this.showLine(this.index + 1);
      Audio.sfx("page");
      return;
    }

    this.finish(true);
  }

  private finish(runDone: boolean) {
    this.clearKey();
    this.stopRaf();
    if (!this.playing) return;
    this.playing = false;
    this.typing = false;

    // Soft dawn lift as the wash clears into the cottage morning.
    this.root.classList.add("is-dawn");
    this.root.dataset.beat = "dawn";
    this.root.classList.remove("is-in", "is-turn");
    this.root.classList.add("is-out");
    Audio.sfx("dawn");

    const done = this.onDone;
    this.onDone = null;
    if (this.exitTimer != null) window.clearTimeout(this.exitTimer);
    this.exitTimer = window.setTimeout(() => {
      this.exitTimer = null;
      this.root.hidden = true;
      this.root.classList.remove("is-out", "is-dawn", "is-in", "is-turn");
      this.root.removeAttribute("data-beat");
      this.textEl.textContent = "";
      this.continueEl.hidden = true;
      if (runDone) done?.();
    }, this.exitMs);
  }

  private stopRaf() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private clearKey() {
    if (this.onKey) {
      window.removeEventListener("keydown", this.onKey);
      this.onKey = null;
    }
  }
}

/** New-game arrival beats - short, named, three clicks. */
export function arrivalPrologueLines(
  playerName: string,
  sex: Sex = "girl",
): string[] {
  const name = playerName.trim() || "Pippin";
  const subject = sex === "boy" ? "He" : sex === "girl" ? "She" : "They";
  const possessive = sex === "boy" ? "his" : sex === "girl" ? "her" : "their";
  return [
    `${name} packed a suitcase and left the city behind.`,
    `By sundown a quiet village - and a cottage with ${possessive} name on the key.`,
    `${subject} slept… until morning.`,
  ];
}
