import type { GameState } from "../systems/GameState";
import {
  MATERIALS,
  TOOLS,
  isConsumableMaterial,
  materialHungerRelief,
} from "../data/items";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Shared bag body used by the status modal tab (and standalone inventory). */
export function renderInventoryBody(state: GameState): string {
  const toolRows = TOOLS.map((t) => {
    const owned = state.hasTool(t.id);
    return `
      <li class="ll-inv-row${owned ? " is-owned" : " is-locked"}">
        <div class="ll-inv-thumb" data-inv-thumb="tool:${t.id}" aria-hidden="true"></div>
        <div class="ll-inv-row-main">
          <strong>${escapeHtml(t.name)}</strong>
          <span>${escapeHtml(t.description)}</span>
        </div>
        <em>${owned ? "Owned" : `$${t.price} at Reed's`}</em>
      </li>`;
  }).join("");

  const matEntries = MATERIALS.map((m) => {
    const count = state.materialCount(m.id);
    return { m, count };
  }).filter((e) => e.count > 0);

  const matRows =
    matEntries.length === 0
      ? `<li class="ll-inv-empty">No materials yet — chop, mine, dig, or fish.</li>`
      : matEntries
          .map(({ m, count }) => {
            const hunger = materialHungerRelief(m.id);
            const eat = isConsumableMaterial(m.id)
              ? `<button type="button" class="ll-inv-eat" data-eat-mat="${m.id}">Eat · +${hunger}</button>`
              : "";
            return `
      <li class="ll-inv-row is-owned">
        <div class="ll-inv-thumb" data-inv-thumb="mat:${m.id}" aria-hidden="true"></div>
        <div class="ll-inv-row-main">
          <strong>${escapeHtml(m.name)} × ${count}</strong>
          <span>${escapeHtml(m.description)}</span>
        </div>
        <div class="ll-inv-row-side">
          ${eat}
          <em>Sell $${m.sellPrice} ea</em>
        </div>
      </li>`;
          })
          .join("");

  const totalValue = matEntries.reduce(
    (sum, { m, count }) => sum + m.sellPrice * count,
    0,
  );

  return `
    <p class="ll-status-bag-lead">Tools stay forever · Eat fish &amp; apples from the bag · Sell materials at Vera's Market</p>
    <section class="ll-inv-section">
      <h3>Tools</h3>
      <ul class="ll-inv-list">${toolRows}</ul>
    </section>
    <section class="ll-inv-section">
      <h3>Materials${totalValue > 0 ? ` · ~$${totalValue}` : ""}</h3>
      <ul class="ll-inv-list">${matRows}</ul>
    </section>
  `;
}
