export interface PayCelebrationOpts {
  amount: number;
  title?: string;
  note?: string;
  durationMs?: number;
  /** Fires after the banner finishes hiding. */
  onDone?: () => void;
}

/**
 * Big centered payday banner - count-up cash + confetti-friendly timing.
 * pointer-events: none so play keeps moving.
 */
export class PayCelebration {
  private root: HTMLElement;
  private amountEl: HTMLElement;
  private titleEl: HTMLElement;
  private noteEl: HTMLElement;
  private hideTimer = 0;
  private raf = 0;
  private startMs = 0;
  private target = 0;
  private countDur = 0;
  private onDone: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-pay";
    this.root.hidden = true;
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-pay-card">
        <span class="ll-pay-badge" aria-hidden="true">$</span>
        <p class="ll-pay-title">Payday!</p>
        <b class="ll-pay-amount">+$0</b>
        <p class="ll-pay-note" hidden></p>
      </div>
    `;
    this.titleEl = this.root.querySelector(".ll-pay-title") as HTMLElement;
    this.amountEl = this.root.querySelector(".ll-pay-amount") as HTMLElement;
    this.noteEl = this.root.querySelector(".ll-pay-note") as HTMLElement;
    parent.appendChild(this.root);
  }

  show(opts: PayCelebrationOpts) {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    if (this.raf) cancelAnimationFrame(this.raf);

    const amount = Math.max(0, Math.round(opts.amount));
    this.target = amount;
    this.onDone = opts.onDone ?? null;
    this.titleEl.textContent = opts.title ?? "Payday!";
    const note = opts.note?.trim() ?? "";
    this.noteEl.textContent = note;
    this.noteEl.hidden = !note;
    this.amountEl.textContent = "+$0";

    this.root.hidden = false;
    this.root.classList.remove("is-out");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");

    this.startMs = performance.now();
    this.countDur = Math.min(900, 280 + amount * 12);
    this.raf = requestAnimationFrame(this.tick);

    const hold = opts.durationMs ?? 3200;
    this.hideTimer = window.setTimeout(() => this.hide(), hold);
  }

  hide() {
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = 0;
    }
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.amountEl.textContent = `+$${this.target}`;
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

  isVisible(): boolean {
    return !this.root.hidden;
  }

  destroy() {
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.onDone = null;
    this.root.remove();
  }

  private tick = (now: number) => {
    const u = Math.min(1, (now - this.startMs) / this.countDur);
    const eased = 1 - (1 - u) * (1 - u);
    const n = Math.round(this.target * eased);
    this.amountEl.textContent = `+$${n}`;
    if (u < 1) {
      this.raf = requestAnimationFrame(this.tick);
    } else {
      this.raf = 0;
      this.amountEl.textContent = `+$${this.target}`;
    }
  };
}
