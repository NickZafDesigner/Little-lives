import type { GameState } from "../systems/GameState";
import { MATERIALS, TOOLS } from "../data/items";
import { Audio } from "../audio/AudioManager";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class InventoryModal {
  private el: HTMLElement;
  private state: GameState;
  private visible = false;

  constructor(parent: HTMLElement, state: GameState) {
    this.state = state;
    this.el = document.createElement("div");
    this.el.className = "ll-inv-modal";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "Inventory");
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

  open() {
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

  toggle() {
    if (this.visible) this.close();
    else this.open();
  }

  refresh() {
    if (!this.visible) return;
    this.rebuild();
  }

  destroy() {
    this.el.remove();
  }

  private rebuild() {
    const s = this.state;
    const toolRows = TOOLS.map((t) => {
      const owned = s.hasTool(t.id);
      return `
        <li class="ll-inv-row${owned ? " is-owned" : " is-locked"}">
          <div class="ll-inv-row-main">
            <strong>${escapeHtml(t.name)}</strong>
            <span>${escapeHtml(t.description)}</span>
          </div>
          <em>${owned ? "Owned" : `$${t.price} at Reed's`}</em>
        </li>`;
    }).join("");

    const matEntries = MATERIALS.map((m) => {
      const count = s.materialCount(m.id);
      return { m, count };
    }).filter((e) => e.count > 0);

    const matRows =
      matEntries.length === 0
        ? `<li class="ll-inv-empty">No materials yet — chop, mine, dig, or fish.</li>`
        : matEntries
            .map(
              ({ m, count }) => `
        <li class="ll-inv-row is-owned">
          <div class="ll-inv-row-main">
            <strong>${escapeHtml(m.name)} × ${count}</strong>
            <span>${escapeHtml(m.description)}</span>
          </div>
          <em>Sell $${m.sellPrice} ea</em>
        </li>`,
            )
            .join("");

    const totalValue = matEntries.reduce(
      (sum, { m, count }) => sum + m.sellPrice * count,
      0,
    );

    this.el.innerHTML = `
      <div class="ll-inv-modal-scrim" data-inv-close></div>
      <div class="ll-inv-modal-card">
        <header class="ll-inv-modal-head">
          <div>
            <h2 class="ll-inv-modal-title">Bag</h2>
            <p class="ll-inv-modal-sub">Tools stay forever · Sell materials at Vera's Market</p>
          </div>
          <button type="button" class="ll-status-modal-close" data-inv-close aria-label="Close">✕</button>
        </header>
        <div class="ll-inv-modal-body">
          <section class="ll-inv-section">
            <h3>Tools</h3>
            <ul class="ll-inv-list">${toolRows}</ul>
          </section>
          <section class="ll-inv-section">
            <h3>Materials${totalValue > 0 ? ` · ~$${totalValue}` : ""}</h3>
            <ul class="ll-inv-list">${matRows}</ul>
          </section>
        </div>
      </div>
    `;

    for (const btn of this.el.querySelectorAll("[data-inv-close]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
    }
  }
}
