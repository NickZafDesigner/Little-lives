import type { GameState } from "../systems/GameState";
import { BUYABLE_FURNITURE } from "../data/furniture";
import type { FurnitureCategory, FurnitureDef } from "../data/types";
import { Audio } from "../audio/AudioManager";
import {
  getFurnitureUnlockProgress,
  isFurnitureUnlocked,
} from "../systems/unlockProgress";
import { FurniturePreview } from "./FurniturePreview";

type CategoryFilter = "all" | FurnitureCategory;

const CATEGORY_CHIPS: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "seating", label: "Seating" },
  { id: "surface", label: "Surfaces" },
  { id: "appliance", label: "Appliances" },
  { id: "decor", label: "Decor" },
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

export class BuildCatalog {
  private el: HTMLElement;
  private chip: HTMLButtonElement;
  private visible = false;
  private buildActive = false;
  private onChange: () => void;
  private state: GameState;
  private category: CategoryFilter = "all";
  private tipEl: HTMLElement | null = null;
  private tipHideTimer = 0;
  private preview = new FurniturePreview();

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

    this.chip = document.createElement("button");
    this.chip.type = "button";
    this.chip.className = "ll-build-chip";
    this.chip.hidden = true;
    this.chip.textContent = "Catalog · Tab";
    this.chip.addEventListener("click", (e) => {
      e.stopPropagation();
      this.show();
      Audio.sfx("ui");
      this.onChange();
    });
    parent.appendChild(this.chip);
    this.rebuild();
  }

  /** Keeps the reopen chip in sync with build mode. */
  setBuildActive(active: boolean) {
    this.buildActive = active;
    this.syncChip();
  }

  private syncChip() {
    this.chip.hidden = !this.buildActive || this.visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Whole overlay blocks the world while open; chip blocks its own rect. */
  containsPoint(clientX: number, clientY: number): boolean {
    if (this.visible) return true;
    if (this.chip.hidden) return false;
    const r = this.chip.getBoundingClientRect();
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
    this.syncChip();
  }

  hide() {
    this.visible = false;
    this.el.hidden = true;
    this.hideTip(true);
    this.syncChip();
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  rebuild() {
    this.hideTip(true);
    const s = this.state;
    const wallCost = s.hasUnlock("wall_sky") ? 6 : 10;
    const blush = s.hasUnlock("floor_blush");

    this.el.innerHTML = `
      <div class="ll-build-modal-scrim" data-build-close></div>
      <div class="ll-build-modal-card">
        <header class="ll-build-modal-head">
          <div class="ll-build-modal-meta">
            <h2 class="ll-build-modal-title">Build</h2>
            <span class="ll-build-modal-money">$${s.money}</span>
          </div>
          <button type="button" class="ll-build-modal-close" data-build-close aria-label="Close catalog">✕</button>
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
      btn.textContent = t.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        s.buildTool = t.id;
        if (t.id !== "furniture") s.selectedBuildItem = null;
        Audio.sfx("ui");
        this.rebuild();
        this.onChange();
      });
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
        "Hover for a preview · unlock to buy (everything still costs money) · Esc closes";

      for (const c of CATEGORY_CHIPS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "ll-build-cat" + (this.category === c.id ? " is-active" : "");
        btn.textContent = c.label;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.category = c.id;
          Audio.sfx("ui");
          this.rebuild();
        });
        catsEl.appendChild(btn);
      }

      const items = BUYABLE_FURNITURE.filter(
        (f) => this.category === "all" || f.category === this.category,
      );
      items.sort((a, b) => {
        const ua = isFurnitureUnlocked(a, s) ? 0 : 1;
        const ub = isFurnitureUnlocked(b, s) ? 0 : 1;
        if (ua !== ub) return ua - ub;
        return a.name.localeCompare(b.name);
      });

      for (const f of items) {
        gridEl.appendChild(this.makeItemTile(f));
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
      } else if (s.buildTool === "floor") {
        title = "Floors";
        body = blush
          ? "Click a tile for blush flooring ($5) — Homebody unlock!"
          : "Click a tile for flooring ($5).";
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
      toolPanel
        .querySelector("[data-build-start]")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          this.hide();
          Audio.sfx("ui");
          this.onChange();
        });
    }
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
    btn.innerHTML = `
      <span class="ll-build-item-swatch" style="--swatch:${hexColor(f.color)}"></span>
      <strong>${escapeHtml(f.name)}</strong>
      <span class="ll-build-item-meta">
        ${
          unlocked
            ? `$${f.price}`
            : `<i class="ll-build-lock" aria-hidden="true"></i> $${f.price}`
        }
      </span>
    `;

    const showTip = () => this.showTipFor(btn, f, unlocked, progress);

    btn.addEventListener("mouseenter", showTip);
    btn.addEventListener("focus", showTip);
    btn.addEventListener("mouseleave", () => this.hideTip());
    btn.addEventListener("blur", () => this.hideTip());

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
          <p class="ll-build-tip-hint">Unlocked — available to buy.</p>
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
          <p class="ll-build-tip-hint">Available to buy — click to select, then place.</p>
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
    this.hideTip(true);
    this.preview.dispose();
    this.chip.remove();
    this.el.remove();
  }
}

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}
