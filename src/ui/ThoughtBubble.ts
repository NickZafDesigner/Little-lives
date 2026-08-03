import { FurniturePreview } from "./FurniturePreview";

/** Thought-bubble Sunny Sofa preview (same mesh as the build catalog). */
const SOFA_PREVIEW_SIZE = 104;

/**
 * Floating thought bubble above the player (world → screen projected).
 * Supports the wake-up sofa model preview and short text hints.
 */
export class ThoughtBubble {
  private root: HTMLElement;
  private bubble: HTMLElement;
  private cloud: HTMLElement;
  private preview = new FurniturePreview();
  private visible = false;
  private hideTimer: number | null = null;
  private sequenceTimer: number | null = null;
  private sequenceToken = 0;
  private zoomed = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-thoughts";
    this.root.setAttribute("aria-hidden", "true");

    this.bubble = document.createElement("div");
    this.bubble.className = "ll-thought";
    this.bubble.hidden = true;
    this.bubble.innerHTML = `
      <div class="ll-thought-cloud"></div>
      <div class="ll-thought-tail">
        <span></span><span></span><span></span>
      </div>
    `;
    this.cloud = this.bubble.querySelector(".ll-thought-cloud") as HTMLElement;
    this.root.appendChild(this.bubble);
    parent.appendChild(this.root);
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Enlarge the bubble while the camera is in cinematic close-up. */
  setZoomed(zoomed: boolean) {
    if (this.zoomed === zoomed) return;
    this.zoomed = zoomed;
    this.root.classList.toggle("is-zoomed", zoomed);
  }

  /**
   * Wake-intro Sunny Sofa model (+ optional caption).
   * Uses the same furniture mesh as the build-menu tooltip.
   */
  showSofa(caption = "A sunny sofa would look perfect…") {
    this.clearSequence();
    this.clearHideTimer();
    this.preview.dispose();
    this.cloud.className = "ll-thought-cloud is-sofa";
    if (caption.trim()) {
      this.cloud.classList.add("is-captioned");
      this.cloud.innerHTML = `
        <div class="ll-thought-sofa-preview" aria-hidden="true"></div>
        <p class="ll-thought-caption">${escapeHtml(caption)}</p>
      `;
    } else {
      this.cloud.innerHTML = `<div class="ll-thought-sofa-preview" aria-label="Sunny sofa"></div>`;
    }
    const host = this.cloud.querySelector(
      ".ll-thought-sofa-preview",
    ) as HTMLElement;
    this.preview.attach(host, "sofa", SOFA_PREVIEW_SIZE);
    this.reveal();
  }

  /**
   * Short player thought.
   * Pass `ms <= 0` to keep it up until replaced (wake-intro beats).
   * Optional `action` adds a clickable button inside the bubble.
   */
  showText(
    text: string,
    ms = 4200,
    action?: { label: string; onClick: () => void },
  ) {
    this.clearSequence();
    this.clearHideTimer();
    this.preview.dispose();
    this.cloud.className = "ll-thought-cloud is-text";
    if (action) {
      this.cloud.classList.add("has-action");
      this.cloud.innerHTML = "";
      const line = document.createElement("p");
      line.className = "ll-thought-line";
      line.textContent = text;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ll-thought-action";
      btn.textContent = action.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        action.onClick();
      });
      this.cloud.append(line, btn);
    } else {
      this.cloud.textContent = text;
    }
    this.reveal();
    if (ms > 0) {
      this.hideTimer = window.setTimeout(() => this.hide(), ms);
    }
  }

  /**
   * Multi-beat thought sequence (auto-advances). Replaces any current bubble.
   */
  showSequence(lines: string[], msPerBeat = 2800) {
    this.clearSequence();
    this.clearHideTimer();
    const beats = lines.map((l) => l.trim()).filter(Boolean);
    if (beats.length === 0) return;
    if (beats.length === 1) {
      this.showText(beats[0]!, msPerBeat);
      return;
    }

    const token = this.sequenceToken;
    let i = 0;
    const advance = () => {
      if (token !== this.sequenceToken) return;
      const text = beats[i]!;
      this.preview.dispose();
      this.cloud.className = "ll-thought-cloud is-text";
      this.cloud.textContent = text;
      this.reveal();
      i += 1;
      if (i < beats.length) {
        this.sequenceTimer = window.setTimeout(advance, msPerBeat);
      } else {
        this.hideTimer = window.setTimeout(() => {
          if (token === this.sequenceToken) this.hide();
        }, msPerBeat);
      }
    };
    advance();
  }

  /** @deprecated use showSofa - kept for call-site compatibility */
  show() {
    this.showSofa();
  }

  hide() {
    this.clearSequence();
    this.clearHideTimer();
    this.preview.dispose();
    if (!this.visible) return;
    this.visible = false;
    this.bubble.classList.remove("is-in");
    this.bubble.classList.add("is-out");
    window.setTimeout(() => {
      if (!this.visible) this.bubble.hidden = true;
    }, 280);
  }

  /**
   * @param project world → screen (canvas-local CSS px)
   * @param viewW / viewH used to keep the bubble on-screen under focus zoom
   */
  update(
    worldX: number,
    worldZ: number,
    project: (x: number, y: number, z: number) => { x: number; y: number },
    viewW = 0,
    viewH = 0,
  ) {
    if (!this.visible && this.bubble.hidden) return;
    // Actor root is 1.2×; head center ≈31.5, hair crown ~46–52 world.
    // Anchor just above the crown so the tail sits near the head.
    const worldY = this.zoomed ? 50 : 48;
    const screen = project(worldX, worldY, worldZ);
    let x = screen.x;
    // Tiny screen lift so the cloud clears hair without floating away.
    let y = screen.y - (this.zoomed ? 8 : 4);
    if (viewW > 0 && viewH > 0) {
      const padX = this.zoomed ? 100 : 70;
      // Keep padTop low so focus sky headroom isn't clamped onto the face.
      const padTop = this.zoomed ? 20 : 28;
      const padBot = this.zoomed ? 180 : 80;
      x = Math.min(viewW - padX, Math.max(padX, x));
      y = Math.min(viewH - padBot, Math.max(padTop, y));
    }
    this.bubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px) scale(1)`;
  }

  destroy() {
    this.clearSequence();
    this.clearHideTimer();
    this.preview.dispose();
    this.visible = false;
    this.root.remove();
  }

  private reveal() {
    this.visible = true;
    this.bubble.hidden = false;
    this.bubble.classList.remove("is-out");
    // Restart enter animation
    this.bubble.classList.remove("is-in");
    void this.bubble.offsetWidth;
    this.bubble.classList.add("is-in");
  }

  private clearHideTimer() {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private clearSequence() {
    this.sequenceToken += 1;
    if (this.sequenceTimer !== null) {
      window.clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
