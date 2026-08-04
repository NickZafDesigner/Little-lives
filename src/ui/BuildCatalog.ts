import type { GameState } from "../systems/GameState";
import { BUYABLE_FURNITURE } from "../data/furniture";
import {
  DEFAULT_FLOOR_STYLE_ID,
  FLOOR_STYLES,
  type FloorStyleDef,
} from "../data/floorStyles";
import type { FurnitureCategory, FurnitureDef } from "../data/types";
import { Audio } from "../audio/AudioManager";
import {
  getFurnitureUnlockProgress,
  isFurnitureUnlocked,
} from "../systems/unlockProgress";
import { closeButtonHtml } from "./closeIcon";
import { FurniturePreview } from "./FurniturePreview";
import { MenuKeyboardNav } from "./menuKeyboard";

type CategoryFilter = "all" | FurnitureCategory;

const BUILD_OPTION_SELECTOR =
  ".ll-build-tool, .ll-build-cat, .ll-build-item, .ll-build-start, .ll-build-floor";

const CATEGORY_CHIPS: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "seating", label: "Seating" },
  { id: "surface", label: "Surfaces" },
  { id: "appliance", label: "Appliances" },
  { id: "decor", label: "Decor & rugs" },
  { id: "pet", label: "Pet" },
  { id: "plumbing", label: "Plumbing" },
  { id: "bed", label: "Beds" },
];

const TOOLS: Array<{ id: GameState["buildTool"]; label: string }> = [
  { id: "furniture", label: "Furnish" },
  { id: "wall", label: "Walls" },
  { id: "floor", label: "Floors" },
  { id: "sell", label: "Sell" },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isFloorStyleUnlocked(style: FloorStyleDef, state: GameState): boolean {
  if (!style.unlockId) return true;
  return state.hasUnlock(style.unlockId);
}

export class BuildCatalog {
  private el: HTMLElement;
  private dock: HTMLElement;
  private visible = false;
  private buildActive = false;
  private onChange: () => void;
  private state: GameState;
  private category: CategoryFilter = "all";
  private tipEl: HTMLElement | null = null;
  private tipHideTimer = 0;
  private preview = new FurniturePreview();
  private keys = new MenuKeyboardNav({
    isOpen: () => this.visible,
    getButtons: () =>
      Array.from(
        this.el.querySelectorAll<HTMLButtonElement>(BUILD_OPTION_SELECTOR),
      ),
    onEscape: () => {
      this.hide();
      Audio.sfx("ui");
      this.onChange();
    },
  });

  constructor(
    parent: HTMLElement,
    state: GameState,
    onChange: () => void,
  ) {
    this.state = state;
    this.onChange = onChange;
    this.el = document.createElement("div");
    this.el.className = "ll-build-modal";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "Build catalog");
    parent.appendChild(this.el);

    this.dock = document.createElement("div");
    this.dock.className = "ll-build-dock";
    this.dock.hidden = true;
    this.dock.innerHTML = `
      <span class="ll-build-dock-rotate" aria-hidden="true">
        <kbd>R</kbd>
        <span>Rotate</span>
      </span>
      <span class="ll-build-dock-sep" aria-hidden="true">·</span>
      <button type="button" class="ll-build-dock-catalog" data-build-open-catalog>
        <kbd>Tab</kbd> Catalog
      </button>
      <span class="ll-build-dock-sep" aria-hidden="true">·</span>
      <span class="ll-build-dock-exit" aria-hidden="true"><kbd>B</kbd> Exit</span>
    `;
    this.dock
      .querySelector("[data-build-open-catalog]")
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.show();
        Audio.sfx("ui");
        this.onChange();
      });
    parent.appendChild(this.dock);
    this.rebuild();
  }

  /** Keeps the build dock in sync with build mode / catalog visibility. */
  setBuildActive(active: boolean) {
    this.buildActive = active;
    this.syncDock();
  }

  private syncDock() {
    // One chrome strip while placing; hide under the open catalog modal.
    this.dock.hidden = !this.buildActive || this.visible;
    this.dock.classList.toggle("is-placing", this.buildActive && !this.visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Whole overlay blocks the world while open; dock blocks its own rect. */
  containsPoint(clientX: number, clientY: number): boolean {
    if (this.visible) return true;
    if (this.dock.hidden) return false;
    const r = this.dock.getBoundingClientRect();
    return (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    );
  }

  show() {
    this.visible = true;
    this.el.hidden = false;
    this.rebuild();
    this.keys.bind();
    this.syncDock();
  }

  hide() {
    this.keys.unbind();
    this.visible = false;
    this.el.hidden = true;
    this.hideTip(true);
    this.syncDock();
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  rebuild(prefer?: (btn: HTMLButtonElement) => boolean) {
    this.hideTip(true);
    const s = this.state;
    const wallCost = s.hasUnlock("wall_sky") ? 6 : 10;

    this.el.innerHTML = `
      <div class="ll-build-modal-scrim" data-build-close></div>
      <div class="ll-build-modal-card">
        <header class="ll-build-modal-head">
          <div class="ll-build-modal-meta">
            <h2 class="ll-build-modal-title">Build</h2>
            <span class="ll-build-modal-money">$${s.money}</span>
          </div>
          ${closeButtonHtml({
            attrs: "data-build-close",
            ariaLabel: "Close catalog",
          })}
        </header>
        <div class="ll-build-modal-body">
          <aside class="ll-build-modal-rail">
            <div class="ll-build-modal-tools" data-build-tools></div>
            <div class="ll-build-modal-cats" data-build-cats hidden></div>
          </aside>
          <section class="ll-build-modal-main">
            <p class="ll-build-modal-hint" data-build-hint></p>
            <div class="ll-build-modal-grid" data-build-grid></div>
            <div class="ll-build-modal-tool-panel" data-build-tool-panel hidden></div>
          </section>
        </div>
      </div>
      <div class="ll-build-tip" data-build-tip hidden></div>
    `;

    this.tipEl = this.el.querySelector("[data-build-tip]");

    for (const btn of this.el.querySelectorAll("[data-build-close]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.hide();
        Audio.sfx("ui");
        this.onChange();
      });
    }

    const toolsEl = this.el.querySelector("[data-build-tools]")!;
    for (const t of TOOLS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "ll-build-tool" + (s.buildTool === t.id ? " is-active" : "");
      btn.dataset.buildTool = t.id;
      btn.textContent = t.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        s.buildTool = t.id;
        if (t.id !== "furniture") s.selectedBuildItem = null;
        if (t.id !== "floor") s.selectedFloorStyle = null;
        if (t.id === "floor" && !s.selectedFloorStyle) {
          s.selectedFloorStyle = DEFAULT_FLOOR_STYLE_ID;
        }
        Audio.sfx("ui");
        this.rebuild((b) => b.dataset.buildTool === t.id);
        this.onChange();
      });
      this.keys.attachHover(btn);
      toolsEl.appendChild(btn);
    }

    const hintEl = this.el.querySelector("[data-build-hint]") as HTMLElement;
    const gridEl = this.el.querySelector("[data-build-grid]") as HTMLElement;
    const toolPanel = this.el.querySelector(
      "[data-build-tool-panel]",
    ) as HTMLElement;
    const catsEl = this.el.querySelector("[data-build-cats]") as HTMLElement;

    if (s.buildTool === "furniture") {
      catsEl.hidden = false;
      gridEl.hidden = false;
      toolPanel.hidden = true;
      hintEl.textContent =
        "Pick an item, then click to place · R rotates · Tab / arrows · Esc closes";

      for (const c of CATEGORY_CHIPS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "ll-build-cat" + (this.category === c.id ? " is-active" : "");
        btn.dataset.buildCat = c.id;
        btn.textContent = c.label;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.category = c.id;
          Audio.sfx("ui");
          this.rebuild((b) => b.dataset.buildCat === c.id);
        });
        this.keys.attachHover(btn);
        catsEl.appendChild(btn);
      }

      const items = BUYABLE_FURNITURE.filter(
        (f) => this.category === "all" || f.category === this.category,
      );
      items.sort((a, b) => {
        const ua = isFurnitureUnlocked(a, s) ? 0 : 1;
        const ub = isFurnitureUnlocked(b, s) ? 0 : 1;
        if (ua !== ub) return ua - ub;
        // Rugs float toward the top of Decor.
        const ra = a.floorCovering ? 0 : 1;
        const rb = b.floorCovering ? 0 : 1;
        if (this.category === "decor" && ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      });

      for (const f of items) {
        gridEl.appendChild(this.makeItemTile(f));
      }
    } else if (s.buildTool === "floor") {
      catsEl.hidden = true;
      gridEl.hidden = false;
      toolPanel.hidden = true;
      hintEl.textContent =
        "Pick a style, then click tiles to paint · R rotates the pattern";

      if (!s.selectedFloorStyle) s.selectedFloorStyle = DEFAULT_FLOOR_STYLE_ID;

      for (const style of FLOOR_STYLES) {
        gridEl.appendChild(this.makeFloorTile(style));
      }
    } else {
      catsEl.hidden = true;
      gridEl.hidden = true;
      toolPanel.hidden = false;
      hintEl.textContent = "";

      let title = "";
      let body = "";
      if (s.buildTool === "wall") {
        title = "Walls";
        body = `Click a home tile to place or remove walls ($${wallCost} / refund $5).`;
      } else {
        title = "Sell";
        body = "Click furniture to sell it for a 60% refund.";
      }

      toolPanel.innerHTML = `
        <div class="ll-build-tool-card">
          <h3>${title}</h3>
          <p>${body}</p>
          <button type="button" class="ll-build-start" data-build-start>Start</button>
        </div>
      `;
      const startBtn = toolPanel.querySelector<HTMLButtonElement>(
        "[data-build-start]",
      );
      startBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.hide();
        Audio.sfx("ui");
        this.onChange();
      });
      if (startBtn) this.keys.attachHover(startBtn);
    }

    this.keys.reset(prefer, (btn) =>
      s.buildTool === "floor"
        ? btn.dataset.floorStyle === s.selectedFloorStyle
        : s.buildTool !== "furniture"
          ? btn.classList.contains("ll-build-start")
          : btn.dataset.buildTool === s.buildTool,
    );
  }

  private makeFloorTile(style: FloorStyleDef): HTMLElement {
    const unlocked = isFloorStyleUnlocked(style, this.state);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "ll-build-item ll-build-floor" +
      (this.state.selectedFloorStyle === style.id ? " is-active" : "") +
      (unlocked ? "" : " is-locked");
    btn.dataset.floorStyle = style.id;
    btn.innerHTML = `
      <span class="ll-build-item-swatch" style="--swatch:${hexColor(style.color)}"></span>
      <strong>${escapeHtml(style.name)}</strong>
      <span class="ll-build-item-meta">
        ${
          unlocked
            ? `$${style.price}/tile`
            : `<i class="ll-build-lock" aria-hidden="true"></i> Homebody`
        }
      </span>
    `;
    this.keys.attachHover(btn);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!unlocked) {
        Audio.sfx("deny");
        this.state.showToast("Unlock Blush Boards with the Homebody aspiration.");
        btn.classList.add("is-pulse");
        window.setTimeout(() => btn.classList.remove("is-pulse"), 320);
        return;
      }
      this.state.selectedFloorStyle = style.id;
      this.state.buildTool = "floor";
      this.state.selectedBuildItem = null;
      Audio.sfx("ui");
      this.hide();
      this.onChange();
    });
    return btn;
  }

  private makeItemTile(f: FurnitureDef): HTMLElement {
    const unlocked = isFurnitureUnlocked(f, this.state);
    const progress = getFurnitureUnlockProgress(f, this.state);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "ll-build-item" +
      (this.state.selectedBuildItem === f.id ? " is-active" : "") +
      (unlocked ? "" : " is-locked");
    btn.dataset.cat = f.category;
    btn.dataset.buildItem = f.id;
    btn.innerHTML = `
      <span class="ll-build-item-swatch" style="--swatch:${hexColor(f.color)}"></span>
      <strong>${escapeHtml(f.name)}</strong>
      <span class="ll-build-item-meta">
        ${
          unlocked
            ? `${f.floorCovering && (f.width > 1 || f.height > 1) ? `${f.width}×${f.height} · ` : ""}$${f.price}`
            : `<i class="ll-build-lock" aria-hidden="true"></i> $${f.price}`
        }
      </span>
    `;

    const showTip = () => this.showTipFor(btn, f, unlocked, progress);

    btn.addEventListener("mouseenter", showTip);
    btn.addEventListener("focus", showTip);
    btn.addEventListener("mouseleave", () => this.hideTip());
    btn.addEventListener("blur", () => this.hideTip());
    this.keys.attachHover(btn);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!unlocked) {
        Audio.sfx("deny");
        showTip();
        btn.classList.add("is-pulse");
        window.setTimeout(() => btn.classList.remove("is-pulse"), 320);
        return;
      }
      this.state.selectedBuildItem = f.id;
      this.state.buildTool = "furniture";
      Audio.sfx("ui");
      this.hide();
      this.onChange();
    });

    return btn;
  }

  private showTipFor(
    anchor: HTMLElement,
    f: FurnitureDef,
    _unlocked: boolean,
    progress: ReturnType<typeof getFurnitureUnlockProgress>,
  ) {
    if (!this.tipEl) return;
    window.clearTimeout(this.tipHideTimer);
    this.tipEl.hidden = false;

    const priceLine = `<small class="ll-build-tip-price">$${f.price}</small>`;
    const lockHtml = progress
      ? progress.done
        ? `
          ${priceLine}
          <p class="ll-build-tip-hint">Unlocked - available to buy (R rotates when placing).</p>
        `
        : `
          ${priceLine}
          <p class="ll-build-tip-hint">${escapeHtml(progress.hint)}</p>
          <div class="ll-build-tip-bar"><i style="width:${
            progress.target > 0
              ? Math.min(
                  100,
                  Math.round((progress.current / progress.target) * 100),
                )
              : 0
          }%"></i></div>
          <small>Progress ${escapeHtml(progress.label)}</small>
        `
      : `
          ${priceLine}
          <p class="ll-build-tip-hint">${
            f.floorCovering
              ? "Rug - place under any furniture. R rotates."
              : f.placeOnSurface
                ? "Countertop item - click a free spot on a table or counter."
                : f.allowsSurface
                  ? "Place on the floor, or on a free table/counter spot."
                  : "Available to buy - click to select, then place (R rotates)."
          }</p>
        `;

    this.tipEl.innerHTML = `
      <div class="ll-build-tip-preview" data-tip-preview></div>
      <strong class="ll-build-tip-name">${escapeHtml(f.name)}</strong>
      ${lockHtml}
    `;

    const previewHost = this.tipEl.querySelector(
      "[data-tip-preview]",
    ) as HTMLElement;
    this.preview.attach(previewHost, f.id);

    requestAnimationFrame(() => this.positionTip(anchor));
  }

  private positionTip(anchor: HTMLElement) {
    if (!this.tipEl || this.tipEl.hidden) return;
    const tr = this.tipEl.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const hr = this.el.getBoundingClientRect();
    let l = ar.left + ar.width / 2 - tr.width / 2 - hr.left;
    let t = ar.top - tr.height - 12 - hr.top;
    if (t < 8) t = ar.bottom - hr.top + 12;
    l = Math.max(8, Math.min(l, hr.width - tr.width - 8));
    this.tipEl.style.left = `${l}px`;
    this.tipEl.style.top = `${t}px`;
  }

  private hideTip(immediate = false) {
    if (!this.tipEl) return;
    window.clearTimeout(this.tipHideTimer);
    const hide = () => {
      if (this.tipEl) this.tipEl.hidden = true;
      this.preview.dispose();
    };
    if (immediate) {
      hide();
      return;
    }
    this.tipHideTimer = window.setTimeout(hide, 80);
  }

  destroy() {
    this.keys.unbind();
    this.hideTip(true);
    this.preview.dispose();
    this.dock.remove();
    this.el.remove();
  }
}

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}
