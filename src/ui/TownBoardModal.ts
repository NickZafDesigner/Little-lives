/**
 * Town Notice Board — daily commissions linking craft, jobs, beats, and pets.
 */

import { NPCS } from "../data/npcs";
import type { GameState } from "../systems/GameState";
import { TownBoardSystem } from "../systems/TownBoardSystem";
import { Audio } from "../audio/AudioManager";
import { MenuKeyboardNav } from "./menuKeyboard";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type BoardAction =
  | { kind: "turn_in"; offerUid: string }
  | { kind: "work_assist"; offerUid: string; jobId: string }
  | { kind: "pet_care"; offerUid: string };

export class TownBoardModal {
  private el: HTMLElement;
  private state: GameState;
  private board: TownBoardSystem;
  private visible = false;
  private onAction: ((action: BoardAction) => void) | null = null;
  private keys = new MenuKeyboardNav({
    isOpen: () => this.visible,
    getButtons: () =>
      Array.from(
        this.el.querySelectorAll<HTMLButtonElement>(
          ".ll-board-btn:not(:disabled), [data-board-close]",
        ),
      ),
    onEscape: () => this.close(),
  });

  constructor(parent: HTMLElement, state: GameState, board: TownBoardSystem) {
    this.state = state;
    this.board = board;
    this.el = document.createElement("div");
    this.el.className = "ll-shop-modal ll-board-modal";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "Town Notice Board");
    parent.appendChild(this.el);
  }

  isOpen(): boolean {
    return this.visible;
  }

  open(onAction: (action: BoardAction) => void) {
    this.board.refreshIfNeeded();
    this.onAction = onAction;
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
    this.onAction = null;
    Audio.sfx("ui");
  }

  /** Rebuild while staying open (after a turn-in). */
  refresh() {
    if (!this.visible) return;
    this.rebuild();
  }

  destroy() {
    this.keys.unbind();
    this.el.remove();
  }

  private rebuild() {
    const s = this.state;
    const rows = this.board.openOffers().map(({ offer, template }) => {
      const npc = NPCS.find((n) => n.id === template.npcId);
      const status = this.board.completeStatus(template);
      const done = offer.done;
      let actionLabel = "Turn in";
      let actionKind = "turn_in";
      let enabled = !done && this.board.canComplete(template);

      if (template.kind === "work_assist") {
        actionLabel = "Help now";
        actionKind = "work_assist";
        enabled = !done;
      } else if (template.kind === "bring_beat") {
        actionLabel = "At picnic";
        actionKind = "turn_in";
        enabled = false;
      } else if (template.kind === "pet_care") {
        actionLabel = "Play with pet";
        actionKind = "pet_care";
        enabled = !done && this.board.canComplete(template);
      }

      if (done) {
        actionLabel = "Done";
        enabled = false;
      }

      return `
        <li class="ll-shop-row${done ? " is-owned" : ""}">
          <div class="ll-shop-row-main">
            <strong>${escapeHtml(template.title)}</strong>
            <span>${escapeHtml(template.blurb)}</span>
            <span class="ll-craft-meta">${escapeHtml(npc?.name ?? template.npcId)} · $${template.rewardMoney} · favor +${template.rewardFavor}</span>
            <span class="ll-craft-costs">${escapeHtml(done ? "Completed today" : status)}</span>
          </div>
          <button type="button" class="ll-shop-btn ll-board-btn"
            data-board-action="${actionKind}"
            data-offer="${escapeHtml(offer.uid)}"
            data-job="${template.jobId ?? ""}"
            ${enabled ? "" : "disabled"}>
            ${actionLabel}
          </button>
        </li>`;
    }).join("");

    const openCount = s.townBoard.offers.filter((o) => !o.done).length;
    this.el.innerHTML = `
      <div class="ll-shop-modal-scrim" data-board-close></div>
      <div class="ll-shop-modal-card">
        <header class="ll-shop-modal-head">
          <div>
            <h2 class="ll-shop-modal-title">Town Notice Board</h2>
            <p class="ll-shop-modal-sub">Favor ${s.townBoard.favor} · ${openCount} open today · crafts ${s.townBoard.craftsMade}</p>
          </div>
          <button type="button" class="ll-status-modal-close" data-board-close aria-label="Close">✕</button>
        </header>
        <ul class="ll-shop-list">${
          rows ||
          `<li class="ll-inv-empty">No commissions today — check again tomorrow.</li>`
        }</ul>
      </div>
    `;

    for (const el of this.el.querySelectorAll("[data-board-close]")) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
    }
    for (const btn of this.el.querySelectorAll<HTMLButtonElement>("[data-board-action]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        const kind = btn.dataset.boardAction;
        const offerUid = btn.dataset.offer ?? "";
        const jobId = btn.dataset.job ?? "";
        const cb = this.onAction;
        if (kind === "work_assist") {
          this.close();
          cb?.({ kind: "work_assist", offerUid, jobId });
        } else if (kind === "pet_care") {
          this.close();
          cb?.({ kind: "pet_care", offerUid });
        } else {
          cb?.({ kind: "turn_in", offerUid });
          this.refresh();
        }
      });
      if (!btn.disabled) this.keys.attachHover(btn);
    }
    this.keys.reset();
  }
}
