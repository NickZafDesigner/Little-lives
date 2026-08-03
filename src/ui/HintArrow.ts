/**
 * World-space nav chevron that always aims at a goal (e.g. the café).
 * Sits along the player→target line when the goal is on-screen; clamps to the
 * viewport edge when it isn't. Rotation tracks the walk so the tip stays aimed.
 */
export class HintArrow {
  private root: HTMLElement;
  private marker: HTMLElement;
  private chev: HTMLElement;
  private labelEl: HTMLElement;
  private visible = false;
  private worldX = 0;
  private worldZ = 0;
  private hideTimer: number | null = null;
  /** Smoothed CSS degrees - chevron tip points +Y (down) at 0. */
  private rotDeg = 0;
  private hasRot = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-hint-arrows";
    this.root.setAttribute("aria-hidden", "true");

    this.marker = document.createElement("div");
    this.marker.className = "ll-hint-arrow";
    this.marker.hidden = true;
    this.marker.innerHTML = `
      <div class="ll-hint-arrow-bob">
        <span class="ll-hint-arrow-label"></span>
        <span class="ll-hint-arrow-chev" aria-hidden="true">
          <svg viewBox="0 0 28 22" width="28" height="22" focusable="false">
            <path d="M4 2 L14 12 L24 2" />
            <path d="M4 10 L14 20 L24 10" />
          </svg>
        </span>
      </div>
    `;
    this.chev = this.marker.querySelector(".ll-hint-arrow-chev") as HTMLElement;
    this.labelEl = this.marker.querySelector(
      ".ll-hint-arrow-label",
    ) as HTMLElement;
    this.root.appendChild(this.marker);
    parent.appendChild(this.root);
  }

  showAt(worldX: number, worldZ: number, label = "", ms = 5200) {
    this.clearHideTimer();
    this.worldX = worldX;
    this.worldZ = worldZ;
    this.labelEl.textContent = label;
    this.labelEl.hidden = !label;
    this.visible = true;
    this.hasRot = false;
    this.marker.hidden = false;
    this.marker.classList.remove("is-out");
    this.marker.classList.remove("is-in");
    void this.marker.offsetWidth;
    this.marker.classList.add("is-in");
    if (ms > 0) {
      this.hideTimer = window.setTimeout(() => this.hide(), ms);
    }
  }

  /** Keep pointing until hide() - used for mid-shift station hops. */
  pinAt(worldX: number, worldZ: number, label = "") {
    this.showAt(worldX, worldZ, label, 0);
  }

  hide() {
    this.clearHideTimer();
    if (!this.visible) return;
    this.visible = false;
    this.marker.classList.remove("is-in");
    this.marker.classList.add("is-out");
    window.setTimeout(() => {
      if (!this.visible) this.marker.hidden = true;
    }, 280);
  }

  update(
    project: (x: number, y: number, z: number) => { x: number; y: number },
    viewW: number,
    viewH: number,
    playerX: number,
    playerZ: number,
  ) {
    if (!this.visible && this.marker.hidden) return;

    // Same world Y for both ends so isometric elevation doesn't skew the aim.
    const aimY = 20;
    const target = project(this.worldX, aimY, this.worldZ);
    const player = project(playerX, aimY, playerZ);
    const pad = 40;
    const cx = viewW / 2;
    const cy = viewH / 2;

    // Approach vector in screen space (player → goal). Fall back to view
    // center when you're standing on the pin so the heading stays stable.
    let approachX = target.x - player.x;
    let approachY = target.y - player.y;
    let approachLen = Math.hypot(approachX, approachY);
    if (approachLen < 10) {
      approachX = target.x - cx;
      approachY = target.y - cy;
      approachLen = Math.hypot(approachX, approachY) || 1e-6;
    }
    const dirX = approachX / approachLen;
    const dirY = approachY / approachLen;

    const onScreen =
      target.x >= pad &&
      target.x <= viewW - pad &&
      target.y >= pad &&
      target.y <= viewH - pad;

    let x: number;
    let y: number;

    if (onScreen) {
      // Sit just short of the goal along the approach so the tip reads as "this way".
      const standOff = Math.min(46, Math.max(22, approachLen * 0.22));
      x = target.x - dirX * standOff;
      y = target.y - dirY * standOff;
      this.marker.classList.remove("is-edge");
    } else {
      // Ray from view center through the target → clamp to the inset rect.
      const dx = target.x - cx;
      const dy = target.y - cy;
      const absX = Math.abs(dx) || 1e-6;
      const absY = Math.abs(dy) || 1e-6;
      const scale = Math.min((cx - pad) / absX, (cy - pad) / absY);
      x = cx + dx * scale;
      y = cy + dy * scale;
      this.marker.classList.add("is-edge");
    }

    // Aim from where the marker actually sits so the tip tracks the goal.
    let aimDx = target.x - x;
    let aimDy = target.y - y;
    if (Math.hypot(aimDx, aimDy) < 4) {
      aimDx = dirX;
      aimDy = dirY;
    }
    // Tip defaults to screen +Y (down). CSS rotate() is clockwise-positive, so
    // negate atan2(dx, dy) — otherwise headings mirror (café reads too far right).
    const targetDeg = (-Math.atan2(aimDx, aimDy) * 180) / Math.PI;
    this.rotDeg = this.hasRot
      ? lerpAngleDeg(this.rotDeg, targetDeg, 0.22)
      : targetDeg;
    this.hasRot = true;
    this.chev.style.setProperty("--hint-rot", `${this.rotDeg}deg`);

    this.marker.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }

  destroy() {
    this.clearHideTimer();
    this.root.remove();
  }

  private clearHideTimer() {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

/** Shortest-path lerp in degrees. */
function lerpAngleDeg(from: number, to: number, t: number): number {
  let d = ((to - from + 540) % 360) - 180;
  return from + d * t;
}
