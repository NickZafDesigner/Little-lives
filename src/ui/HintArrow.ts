/**
 * Flashing world-space chevron that points at a goal (e.g. the café).
 * When the target is off-screen, clamps to the viewport edge and rotates
 * toward the goal so it still reads as a directional hint.
 */
export class HintArrow {
  private root: HTMLElement;
  private marker: HTMLElement;
  private bob: HTMLElement;
  private labelEl: HTMLElement;
  private visible = false;
  private worldX = 0;
  private worldZ = 0;
  private hideTimer: number | null = null;

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
        <span class="ll-hint-arrow-chev" aria-hidden="true"></span>
      </div>
    `;
    this.bob = this.marker.querySelector(".ll-hint-arrow-bob") as HTMLElement;
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
    this.marker.hidden = false;
    this.marker.classList.remove("is-out");
    this.marker.classList.remove("is-in");
    void this.marker.offsetWidth;
    this.marker.classList.add("is-in");
    if (ms > 0) {
      this.hideTimer = window.setTimeout(() => this.hide(), ms);
    }
  }

  /** Keep pointing until hide() — used for mid-shift station hops. */
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
  ) {
    if (!this.visible && this.marker.hidden) return;
    const screen = project(this.worldX, 28, this.worldZ);
    const pad = 36;
    const cx = viewW / 2;
    const cy = viewH / 2;
    let x = screen.x;
    let y = screen.y;
    const off =
      x < pad || x > viewW - pad || y < pad || y > viewH - pad;

    if (off) {
      // Ray from view center through the projected point → clamp to inset rect
      const dx = screen.x - cx;
      const dy = screen.y - cy;
      const absX = Math.abs(dx) || 1e-6;
      const absY = Math.abs(dy) || 1e-6;
      const scale = Math.min((cx - pad) / absX, (cy - pad) / absY);
      x = cx + dx * scale;
      y = cy + dy * scale;
      // Chevron draws pointing down (+Y). CSS rotate is clockwise-positive;
      // atan2(dx, dy) aims that tip along (dx, dy) in screen space.
      const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
      this.bob.style.setProperty("--hint-rot", `${deg}deg`);
      this.marker.classList.add("is-edge");
    } else {
      // On-screen: sit on the target and point down at it
      this.bob.style.setProperty("--hint-rot", "0deg");
      this.marker.classList.remove("is-edge");
    }

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
