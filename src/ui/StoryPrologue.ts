import { Audio } from "../audio/AudioManager";

export interface StoryPrologueOpts {
  lines: string[];
  onDone?: () => void;
}

/**
 * Full-screen soft wash with click-through story lines.
 * Used for the new-game arrival prologue before the bed wake cutscene.
 */
export class StoryPrologue {
  private root: HTMLElement;
  private textEl: HTMLElement;
  private continueEl: HTMLElement;
  private playing = false;
  private lines: string[] = [];
  private index = 0;
  private onDone: (() => void) | null = null;
  private ignoreUntil = 0;
  private exitTimer: number | null = null;
  private onKey: ((e: KeyboardEvent) => void) | null = null;
  private readonly exitMs = 420;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-prologue";
    this.root.hidden = true;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-prologue-wash" aria-hidden="true"></div>
      <div class="ll-prologue-stage">
        <p class="ll-prologue-text"></p>
        <div class="ll-prologue-continue">Click anywhere · Space</div>
      </div>
    `;
    this.textEl = this.root.querySelector(".ll-prologue-text") as HTMLElement;
    this.continueEl = this.root.querySelector(
      ".ll-prologue-continue",
    ) as HTMLElement;
    parent.appendChild(this.root);

    this.root.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.advance();
    });
  }

  isOpen(): boolean {
    return this.playing;
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
    this.ignoreUntil = performance.now() + 420;

    this.root.hidden = false;
    this.root.classList.remove("is-out");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");
    this.showLine(0);

    this.onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this.advance();
      }
    };
    window.addEventListener("keydown", this.onKey);
  }

  destroy() {
    this.clearKey();
    if (this.exitTimer != null) window.clearTimeout(this.exitTimer);
    this.playing = false;
    this.root.remove();
  }

  private showLine(i: number) {
    this.index = i;
    this.textEl.classList.remove("is-swap");
    void this.textEl.offsetWidth;
    this.textEl.textContent = this.lines[i] ?? "";
    this.textEl.classList.add("is-swap");
    this.continueEl.hidden = false;
  }

  private advance() {
    if (!this.playing) return;
    if (performance.now() < this.ignoreUntil) return;

    if (this.index + 1 < this.lines.length) {
      this.ignoreUntil = performance.now() + 280;
      this.showLine(this.index + 1);
      Audio.sfx("ui");
      return;
    }

    this.finish(true);
  }

  private finish(runDone: boolean) {
    this.clearKey();
    if (!this.playing) return;
    this.playing = false;
    this.root.classList.remove("is-in");
    this.root.classList.add("is-out");
    const done = this.onDone;
    this.onDone = null;
    if (this.exitTimer != null) window.clearTimeout(this.exitTimer);
    this.exitTimer = window.setTimeout(() => {
      this.exitTimer = null;
      this.root.hidden = true;
      this.root.classList.remove("is-out");
      this.textEl.textContent = "";
      if (runDone) done?.();
    }, this.exitMs);
  }

  private clearKey() {
    if (this.onKey) {
      window.removeEventListener("keydown", this.onKey);
      this.onKey = null;
    }
  }
}

/** New-game arrival beats — interpolate the player name into the story. */
export function arrivalPrologueLines(playerName: string): string[] {
  const name = playerName.trim() || "Pippin";
  return [
    `${name} packed what little they owned into one rattly suitcase and left the city behind.`,
    `By sundown a winding lane had led them to a quiet village — and a cottage waiting with their name on the key.`,
    `Inside was almost nothing: a bed, a lonely TV, and walls still learning how to feel like home.`,
    `They slept the deep sleep of movers and dreamers… until morning.`,
  ];
}
