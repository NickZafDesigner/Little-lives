import type { GameState } from "../systems/GameState";
import {
  MATERIALS,
  TOOLS,
  materialById,
  type MaterialId,
  type ToolId,
} from "../data/items";
import { Audio } from "../audio/AudioManager";
import { paintInventoryThumb } from "./FurniturePreview";
import type { InventoryThumbId } from "../mesh/inventoryItems";

export type ShopMode = "buy_tools" | "sell_materials";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class ShopModal {
  private el: HTMLElement;
  private state: GameState;
  private visible = false;
  private mode: ShopMode = "buy_tools";
  private title = "";
  private onChange: () => void;
  private onBuyTool: ((id: ToolId) => void) | null;

  constructor(
    parent: HTMLElement,
    state: GameState,
    onChange: () => void,
    onBuyTool?: (id: ToolId) => void,
  ) {
    this.state = state;
    this.onChange = onChange;
    this.onBuyTool = onBuyTool ?? null;
    this.el = document.createElement("div");
    this.el.className = "ll-shop-modal";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "Shop");
    parent.appendChild(this.el);
  }

  isOpen(): boolean {
    return this.visible;
  }

  containsPoint(_clientX: number, _clientY: number): boolean {
    void _clientX;
    void _clientY;
    return this.visible;
  }

  open(mode: ShopMode, title: string) {
    this.mode = mode;
    this.title = title;
    this.visible = true;
    this.el.hidden = false;
    this.rebuild();
    Audio.sfx("ui");
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    this.el.hidden = true;
    Audio.sfx("ui");
  }

  destroy() {
    this.el.remove();
  }

  private rebuild() {
    if (this.mode === "buy_tools") this.rebuildBuy();
    else this.rebuildSell();
  }

  private rebuildBuy() {
    const s = this.state;
    const rows = TOOLS.map((t) => {
      const owned = s.hasTool(t.id);
      const canAfford = s.money >= t.price;
      const disabled = owned || !canAfford;
      let action = `Buy $${t.price}`;
      if (owned) action = "Owned";
      else if (!canAfford) action = `Need $${t.price}`;
      return `
        <li class="ll-shop-row${owned ? " is-owned" : ""}">
          <div class="ll-inv-thumb" data-inv-thumb="tool:${t.id}" aria-hidden="true"></div>
          <div class="ll-shop-row-main">
            <strong>${escapeHtml(t.name)}</strong>
            <span>${escapeHtml(t.description)}</span>
          </div>
          <button type="button" class="ll-shop-btn" data-buy-tool="${t.id}" ${disabled ? "disabled" : ""}>
            ${action}
          </button>
        </li>`;
    }).join("");

    this.el.innerHTML = `
      <div class="ll-shop-modal-scrim" data-shop-close></div>
      <div class="ll-shop-modal-card">
        <header class="ll-shop-modal-head">
          <div>
            <h2 class="ll-shop-modal-title">${escapeHtml(this.title)}</h2>
            <p class="ll-shop-modal-sub">Permanent tools · You have $${s.money}</p>
          </div>
          <button type="button" class="ll-status-modal-close" data-shop-close aria-label="Close">✕</button>
        </header>
        <ul class="ll-shop-list">${rows}</ul>
      </div>
    `;
    this.bindChrome();
    this.mountInventoryThumbs();
    for (const btn of this.el.querySelectorAll("[data-buy-tool]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.buyTool as ToolId;
        this.buyTool(id);
      });
    }
  }

  private rebuildSell() {
    const s = this.state;
    const entries = MATERIALS.map((m) => ({
      m,
      count: s.materialCount(m.id),
    })).filter((e) => e.count > 0);

    const total = entries.reduce(
      (sum, { m, count }) => sum + m.sellPrice * count,
      0,
    );

    const rows =
      entries.length === 0
        ? `<li class="ll-inv-empty">Nothing to sell — gather wood, stone, ore, clay, fish, apples, or flowers first.</li>`
        : entries
            .map(
              ({ m, count }) => `
        <li class="ll-shop-row">
          <div class="ll-inv-thumb" data-inv-thumb="mat:${m.id}" aria-hidden="true"></div>
          <div class="ll-shop-row-main">
            <strong>${escapeHtml(m.name)} × ${count}</strong>
            <span>$${m.sellPrice} each · stack $${m.sellPrice * count}</span>
          </div>
          <button type="button" class="ll-shop-btn" data-sell-mat="${m.id}">
            Sell all
          </button>
        </li>`,
            )
            .join("");

    this.el.innerHTML = `
      <div class="ll-shop-modal-scrim" data-shop-close></div>
      <div class="ll-shop-modal-card">
        <header class="ll-shop-modal-head">
          <div>
            <h2 class="ll-shop-modal-title">${escapeHtml(this.title)}</h2>
            <p class="ll-shop-modal-sub">You have $${s.money}${total > 0 ? ` · bag worth $${total}` : ""}</p>
          </div>
          <button type="button" class="ll-status-modal-close" data-shop-close aria-label="Close">✕</button>
        </header>
        <ul class="ll-shop-list">${rows}</ul>
        ${
          total > 0
            ? `<footer class="ll-shop-foot">
                <button type="button" class="ll-shop-btn ll-shop-btn-primary" data-sell-all>
                  Sell everything · $${total}
                </button>
              </footer>`
            : ""
        }
      </div>
    `;
    this.bindChrome();
    this.mountInventoryThumbs();
    for (const btn of this.el.querySelectorAll("[data-sell-mat]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.sellMat as MaterialId;
        this.sellMaterial(id);
      });
    }
    const sellAll = this.el.querySelector("[data-sell-all]");
    sellAll?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.sellEverything();
    });
  }

  private bindChrome() {
    for (const btn of this.el.querySelectorAll("[data-shop-close]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
    }
  }

  private mountInventoryThumbs() {
    for (const host of this.el.querySelectorAll<HTMLElement>("[data-inv-thumb]")) {
      const id = host.dataset.invThumb as InventoryThumbId | undefined;
      if (!id) continue;
      const canvas = document.createElement("canvas");
      canvas.className = "ll-inv-thumb-canvas";
      canvas.setAttribute("aria-hidden", "true");
      host.replaceChildren(canvas);
      if (!paintInventoryThumb(canvas, id, 44)) {
        host.classList.add("is-fallback");
        host.replaceChildren();
      }
    }
  }

  private buyTool(id: ToolId) {
    const def = TOOLS.find((t) => t.id === id);
    if (!def) return;
    if (this.state.hasTool(id)) {
      this.state.showToast(`You already have a ${def.name}.`);
      return;
    }
    if (this.state.money < def.price) {
      this.state.showToast(`Need $${def.price} for a ${def.name}.`);
      Audio.sfx("ui");
      this.rebuild();
      return;
    }
    this.state.money -= def.price;
    this.state.addTool(id);
    this.state.showToast(`Bought ${def.name}!`);
    Audio.sfx("coin");
    this.rebuild();
    this.onChange();
    this.onBuyTool?.(id);
  }

  private sellMaterial(id: MaterialId) {
    const def = materialById[id];
    if (!def) return;
    const count = this.state.materialCount(id);
    if (count <= 0) return;
    const gain = def.sellPrice * count;
    this.state.removeMaterial(id, count);
    this.state.money += gain;
    this.state.dailyStats.moneyEarned += gain;
    this.state.showToast(`Sold ${count} ${def.name} for $${gain}.`);
    Audio.sfx("coin");
    this.rebuild();
    this.onChange();
  }

  private sellEverything() {
    let gain = 0;
    const mats = { ...this.state.inventory.materials };
    for (const [id, count] of Object.entries(mats)) {
      const def = materialById[id];
      if (!def || !count) continue;
      if (this.state.removeMaterial(id as MaterialId, count)) {
        gain += def.sellPrice * count;
      }
    }
    if (gain <= 0) {
      this.state.showToast("Nothing to sell.");
      return;
    }
    this.state.money += gain;
    this.state.dailyStats.moneyEarned += gain;
    this.state.showToast(`Sold everything for $${gain}!`);
    Audio.sfx("coin");
    this.rebuild();
    this.onChange();
  }
}
