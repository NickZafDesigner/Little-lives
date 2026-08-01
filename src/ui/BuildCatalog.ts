import type { GameState } from "../systems/GameState";
import { BUYABLE_FURNITURE } from "../data/furniture";
import { Audio } from "../audio/AudioManager";

export class BuildCatalog {
  private el: HTMLElement;
  private visible = false;
  private onChange: () => void;
  private state: GameState;

  constructor(
    parent: HTMLElement,
    state: GameState,
    onChange: () => void,
  ) {
    this.state = state;
    this.onChange = onChange;
    this.el = document.createElement("div");
    this.el.className = "ll-catalog";
    this.el.hidden = true;
    parent.appendChild(this.el);
    this.rebuild();
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Only interactive controls block the world — the catalog shell is click-through. */
  containsPoint(clientX: number, clientY: number): boolean {
    if (!this.visible) return false;
    const hit = document.elementFromPoint(clientX, clientY);
    return !!hit && this.el.contains(hit) && hit.closest("button") !== null;
  }

  show() {
    this.visible = true;
    this.el.hidden = false;
    this.rebuild();
  }

  hide() {
    this.visible = false;
    this.el.hidden = true;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  rebuild() {
    const tools: Array<{ id: GameState["buildTool"]; label: string }> = [
      { id: "furniture", label: "Furnish" },
      { id: "wall", label: "Walls" },
      { id: "floor", label: "Floors" },
      { id: "sell", label: "Sell" },
    ];

    this.el.innerHTML = `
      <div class="ll-catalog-tools"></div>
      <div class="ll-catalog-hint">Pick item to place · click house furniture to move · R rotate · Esc cancel</div>
      <div class="ll-catalog-items"></div>
    `;
    const toolsEl = this.el.querySelector(".ll-catalog-tools")!;
    const itemsEl = this.el.querySelector(".ll-catalog-items")!;

    for (const t of tools) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "ll-tool" + (this.state.buildTool === t.id ? " is-active" : "");
      btn.textContent = t.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.state.buildTool = t.id;
        Audio.sfx("ui");
        this.rebuild();
        this.onChange();
      });
      toolsEl.appendChild(btn);
    }

    if (this.state.buildTool === "furniture") {
      for (const f of BUYABLE_FURNITURE) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "ll-item" +
          (this.state.selectedBuildItem === f.id ? " is-active" : "");
        btn.innerHTML = `<strong>${f.name}</strong><span>$${f.price}</span>`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.state.selectedBuildItem = f.id;
          Audio.sfx("ui");
          this.rebuild();
          this.onChange();
        });
        itemsEl.appendChild(btn);
      }
    } else if (this.state.buildTool === "wall") {
      itemsEl.innerHTML = `<p class="ll-hint">Click a tile to place/remove walls ($10 / +$5).</p>`;
    } else if (this.state.buildTool === "floor") {
      itemsEl.innerHTML = `<p class="ll-hint">Click a tile for flooring ($5).</p>`;
    } else {
      itemsEl.innerHTML = `<p class="ll-hint">Click furniture to sell (60% refund).</p>`;
    }
  }

  destroy() {
    this.el.remove();
  }
}
