/**
 * Craft table modal — pick a recipe, then WorldScreen runs WorkMinigame.
 */

import { RECIPES, type CraftedId, type RecipeDef } from "../data/crafting";
import { materialById } from "../data/items";
import type { GameState } from "../systems/GameState";
import {
  canAffordRecipe,
  isRecipeUnlocked,
  recipeUnlockHint,
} from "../systems/TownBoardSystem";
import { Audio } from "../audio/AudioManager";
import { MenuKeyboardNav } from "./menuKeyboard";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function costLine(recipe: RecipeDef, state: GameState): string {
  return recipe.costs
    .map((c) => {
      const name = materialById[c.itemId]?.name ?? c.itemId;
      const have = state.materialCount(c.itemId);
      const ok = have >= c.count;
      return `<span class="${ok ? "is-ok" : "is-short"}">${escapeHtml(name)} ${have}/${c.count}</span>`;
    })
    .join(" · ");
}

function outputLabel(recipe: RecipeDef): string {
  if (recipe.output === "furniture") return "Unlocks furniture";
  if (recipe.output === "pet_toy") return "Pet enrichment";
  return "Handmade gift";
}

export class CraftModal {
  private el: HTMLElement;
  private state: GameState;
  private visible = false;
  private onCraft: ((recipeId: CraftedId) => void) | null = null;
  private keys = new MenuKeyboardNav({
    isOpen: () => this.visible,
    getButtons: () =>
      Array.from(
        this.el.querySelectorAll<HTMLButtonElement>(
          ".ll-craft-btn:not(:disabled), [data-craft-close]",
        ),
      ),
    onEscape: () => this.close(),
  });

  constructor(parent: HTMLElement, state: GameState) {
    this.state = state;
    this.el = document.createElement("div");
    this.el.className = "ll-shop-modal ll-craft-modal";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "Craft");
    parent.appendChild(this.el);
  }

  isOpen(): boolean {
    return this.visible;
  }

  open(onCraft: (recipeId: CraftedId) => void) {
    this.onCraft = onCraft;
    this.visible = true;
    this.el.hidden = false;
    this.rebuild();
    this.keys.bind();
    Audio.sfx("ui");
  }

  close() {
    if (!this.visible) return;
    this.keys.unbind();
    this.visible = false;
    this.el.hidden = true;
    this.onCraft = null;
    Audio.sfx("ui");
  }

  destroy() {
    this.keys.unbind();
    this.el.remove();
  }

  private rebuild() {
    const s = this.state;
    const rows = RECIPES.map((r) => {
      const unlocked = isRecipeUnlocked(r, s);
      const afford = canAffordRecipe(r, s);
      const lockedHint = recipeUnlockHint(r, s);
      const disabled = !unlocked || !afford;
      let action = "Craft";
      if (!unlocked) action = "Locked";
      else if (!afford) action = "Need mats";
      return `
        <li class="ll-shop-row${!unlocked ? " is-owned" : ""}">
          <div class="ll-shop-row-main">
            <strong>${escapeHtml(r.name)}</strong>
            <span>${escapeHtml(r.description)}</span>
            <span class="ll-craft-meta">${escapeHtml(outputLabel(r))} · ${r.mini}</span>
            <span class="ll-craft-costs">${
              unlocked ? costLine(r, s) : escapeHtml(lockedHint)
            }</span>
          </div>
          <button type="button" class="ll-shop-btn ll-craft-btn" data-craft="${r.id}" ${
            disabled ? "disabled" : ""
          }>
            ${action}
          </button>
        </li>`;
    }).join("");

    this.el.innerHTML = `
      <div class="ll-shop-modal-scrim" data-craft-close></div>
      <div class="ll-shop-modal-card">
        <header class="ll-shop-modal-head">
          <div>
            <h2 class="ll-shop-modal-title">Craft Table</h2>
            <p class="ll-shop-modal-sub">Gather · craft · gift · decorate · Town Favor ${s.townBoard.favor}</p>
          </div>
          <button type="button" class="ll-status-modal-close" data-craft-close aria-label="Close">✕</button>
        </header>
        <ul class="ll-shop-list">${rows}</ul>
      </div>
    `;

    for (const el of this.el.querySelectorAll("[data-craft-close]")) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
    }
    for (const btn of this.el.querySelectorAll<HTMLButtonElement>("[data-craft]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.craft as CraftedId;
        const cb = this.onCraft;
        this.close();
        cb?.(id);
      });
      if (!btn.disabled) this.keys.attachHover(btn);
    }
    this.keys.reset();
  }
}
