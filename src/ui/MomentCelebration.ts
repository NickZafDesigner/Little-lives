import { paintInventoryThumb } from "./FurniturePreview";
import type { InventoryThumbId } from "../mesh/inventoryItems";

export type MomentAccent = "gold" | "mint" | "rose";

export interface MomentCelebrationOpts {
  /** Small uppercase label above the name. */
  eyebrow: string;
  /** Big headline - tool / pet / rank name. */
  title: string;
  note?: string;
  /** Glyph shown in the floating badge when there's no thumb. */
  badge?: string;
  /** Optional inventory thumb (tools / materials). */
  thumbId?: InventoryThumbId;
  accent?: MomentAccent;
  durationMs?: number;
  onDone?: () => void;
}

/**
 * Centered milestone banner for key unlocks (tools, pets, promotions).
 * pointer-events: none so play keeps moving underneath.
 */
export class MomentCelebration {
  private root: HTMLElement;
  private card: HTMLElement;
  private badgeEl: HTMLElement;
  private thumbHost: HTMLElement;
  private eyebrowEl: HTMLElement;
  private titleEl: HTMLElement;
  private noteEl: HTMLElement;
  private hideTimer = 0;
  private onDone: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-moment";
    this.root.hidden = true;
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-moment-card" data-accent="gold">
        <span class="ll-moment-badge" aria-hidden="true">★</span>
        <div class="ll-moment-thumb" hidden></div>
        <p class="ll-moment-eyebrow"></p>
        <b class="ll-moment-title"></b>
        <p class="ll-moment-note" hidden></p>
      </div>
    `;
    this.card = this.root.querySelector(".ll-moment-card") as HTMLElement;
    this.badgeEl = this.root.querySelector(".ll-moment-badge") as HTMLElement;
    this.thumbHost = this.root.querySelector(".ll-moment-thumb") as HTMLElement;
    this.eyebrowEl = this.root.querySelector(".ll-moment-eyebrow") as HTMLElement;
    this.titleEl = this.root.querySelector(".ll-moment-title") as HTMLElement;
    this.noteEl = this.root.querySelector(".ll-moment-note") as HTMLElement;
    parent.appendChild(this.root);
  }

  show(opts: MomentCelebrationOpts) {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);

    this.onDone = opts.onDone ?? null;
    this.eyebrowEl.textContent = opts.eyebrow;
    this.titleEl.textContent = opts.title;
    const note = opts.note?.trim() ?? "";
    this.noteEl.textContent = note;
    this.noteEl.hidden = !note;

    const accent = opts.accent ?? "gold";
    this.card.dataset.accent = accent;

    const hasThumb = Boolean(opts.thumbId);
    this.thumbHost.hidden = !hasThumb;
    this.badgeEl.hidden = hasThumb;
    if (hasThumb && opts.thumbId) {
      const canvas = document.createElement("canvas");
      canvas.className = "ll-moment-thumb-canvas";
      canvas.setAttribute("aria-hidden", "true");
      this.thumbHost.replaceChildren(canvas);
      if (!paintInventoryThumb(canvas, opts.thumbId, 72)) {
        this.thumbHost.hidden = true;
        this.badgeEl.hidden = false;
        this.badgeEl.textContent = opts.badge ?? "★";
      }
    } else {
      this.thumbHost.replaceChildren();
      this.badgeEl.textContent = opts.badge ?? "★";
    }

    this.root.hidden = false;
    this.root.classList.remove("is-out");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");

    const hold = opts.durationMs ?? 3400;
    this.hideTimer = window.setTimeout(() => this.hide(), hold);
  }

  hide() {
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = 0;
    }
    this.root.classList.remove("is-in");
    this.root.classList.add("is-out");
    const done = this.onDone;
    this.onDone = null;
    window.setTimeout(() => {
      this.root.hidden = true;
      this.root.classList.remove("is-out");
      done?.();
    }, 280);
  }

  destroy() {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    this.onDone = null;
    this.root.remove();
  }
}
