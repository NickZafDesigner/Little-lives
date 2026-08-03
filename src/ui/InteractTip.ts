/**
 * Floating proximity tip: target name + primary action affordance.
 * Clicking the tip (or its action chip) starts walk-to-interact.
 */
export class InteractTip {
  private root: HTMLElement;
  private tip: HTMLElement;
  private nameEl: HTMLElement;
  private actionEl: HTMLElement;
  private visible = false;
  private worldX = 0;
  private worldZ = 0;
  private worldY = 36;
  private onAction: (() => void) | null = null;
  private readonly onTipPointerDown: (e: PointerEvent) => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-interact-tips";
    this.root.setAttribute("aria-hidden", "true");

    this.tip = document.createElement("div");
    this.tip.className = "ll-interact-tip";
    this.tip.hidden = true;
    this.tip.setAttribute("role", "button");
    this.tip.tabIndex = -1;
    this.tip.innerHTML = `
      <span class="ll-interact-tip-name"></span>
      <span class="ll-interact-tip-action"></span>
    `;
    this.nameEl = this.tip.querySelector(
      ".ll-interact-tip-name",
    ) as HTMLElement;
    this.actionEl = this.tip.querySelector(
      ".ll-interact-tip-action",
    ) as HTMLElement;
    this.root.appendChild(this.tip);
    parent.appendChild(this.root);

    this.onTipPointerDown = (e: PointerEvent) => {
      // Keep the world canvas from also receiving this click as a move/command.
      e.preventDefault();
      e.stopPropagation();
      if (!this.visible) return;
      this.onAction?.();
    };
    this.tip.addEventListener("pointerdown", this.onTipPointerDown);
  }

  /** Called when the player clicks the tip / action chip. */
  setOnAction(cb: (() => void) | null) {
    this.onAction = cb;
  }

  showAt(
    worldX: number,
    worldZ: number,
    label: string,
    action: string,
    worldY = 36,
  ) {
    this.worldX = worldX;
    this.worldZ = worldZ;
    this.worldY = worldY;
    if (this.nameEl.textContent !== label) this.nameEl.textContent = label;
    if (this.actionEl.textContent !== action) {
      this.actionEl.textContent = action;
    }
    this.tip.setAttribute("aria-label", `${action} ${label}`);
    if (!this.visible) {
      this.visible = true;
      this.tip.hidden = false;
      this.tip.classList.remove("is-out");
      this.tip.classList.add("is-in");
    }
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.tip.classList.remove("is-in");
    this.tip.classList.add("is-out");
    window.setTimeout(() => {
      if (!this.visible) this.tip.hidden = true;
    }, 180);
  }

  containsPoint(clientX: number, clientY: number): boolean {
    if (!this.visible || this.tip.hidden) return false;
    const r = this.tip.getBoundingClientRect();
    return (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    );
  }

  update(
    project: (x: number, y: number, z: number) => { x: number; y: number },
    canvasW: number,
    canvasH: number,
  ) {
    if (!this.visible) return;
    const screen = project(this.worldX, this.worldY, this.worldZ);
    const pad = 12;
    const x = Math.min(canvasW - pad, Math.max(pad, screen.x));
    const y = Math.min(canvasH - pad, Math.max(pad, screen.y));
    this.tip.style.left = `${x}px`;
    this.tip.style.top = `${y}px`;
  }

  destroy() {
    this.tip.removeEventListener("pointerdown", this.onTipPointerDown);
    this.onAction = null;
    this.root.remove();
  }
}
