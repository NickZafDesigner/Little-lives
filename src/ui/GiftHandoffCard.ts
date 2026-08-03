import type { PlayerLook } from "../data/character";
import type { MaterialId } from "../data/items";
import { Audio } from "../audio/AudioManager";
import { FurniturePreview } from "./FurniturePreview";
import { drawPortrait } from "./portraits";

export interface GiftHandoffOpts {
  itemId: MaterialId;
  itemName: string;
  playerLook: PlayerLook;
  playerName?: string;
  npcId: string;
  npcName: string;
  npcLook?: PlayerLook;
  /** Total time the card stays up (includes toss + hold). */
  durationMs?: number;
  /** Fires after the card finishes hiding. */
  onDone?: () => void;
}

const TOSS_MS = 1100;
const ITEM_PREVIEW_SIZE = 72;

/**
 * Centered gift handoff: player face → flying 3D item → NPC face.
 * Non-blocking (pointer-events: none) so the world toss can play underneath.
 */
export class GiftHandoffCard {
  private root: HTMLElement;
  private card: HTMLElement;
  private titleEl: HTMLElement;
  private captionEl: HTMLElement;
  private playerFace: HTMLCanvasElement;
  private npcFace: HTMLCanvasElement;
  private playerNameEl: HTMLElement;
  private npcNameEl: HTMLElement;
  private itemHost: HTMLElement;
  private itemEl: HTMLElement;
  private preview = new FurniturePreview();
  private hideTimer = 0;
  private landTimer = 0;
  private onDone: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-gift";
    this.root.hidden = true;
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-gift-card">
        <p class="ll-gift-title"></p>
        <div class="ll-gift-row">
          <div class="ll-gift-person is-player">
            <canvas class="ll-gift-face" width="32" height="32" aria-hidden="true"></canvas>
            <span class="ll-gift-who"></span>
          </div>
          <div class="ll-gift-stage" aria-hidden="true">
            <div class="ll-gift-arc"></div>
            <div class="ll-gift-item">
              <div class="ll-gift-item-preview"></div>
            </div>
          </div>
          <div class="ll-gift-person is-npc">
            <canvas class="ll-gift-face" width="32" height="32" aria-hidden="true"></canvas>
            <span class="ll-gift-who"></span>
          </div>
        </div>
        <p class="ll-gift-caption"></p>
      </div>
    `;
    this.card = this.root.querySelector(".ll-gift-card") as HTMLElement;
    this.titleEl = this.root.querySelector(".ll-gift-title") as HTMLElement;
    this.captionEl = this.root.querySelector(".ll-gift-caption") as HTMLElement;
    this.playerFace = this.root.querySelector(
      ".ll-gift-person.is-player .ll-gift-face",
    ) as HTMLCanvasElement;
    this.npcFace = this.root.querySelector(
      ".ll-gift-person.is-npc .ll-gift-face",
    ) as HTMLCanvasElement;
    this.playerNameEl = this.root.querySelector(
      ".ll-gift-person.is-player .ll-gift-who",
    ) as HTMLElement;
    this.npcNameEl = this.root.querySelector(
      ".ll-gift-person.is-npc .ll-gift-who",
    ) as HTMLElement;
    this.itemEl = this.root.querySelector(".ll-gift-item") as HTMLElement;
    this.itemHost = this.root.querySelector(
      ".ll-gift-item-preview",
    ) as HTMLElement;
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  show(opts: GiftHandoffOpts) {
    this.clearTimers();
    this.preview.dispose();
    this.onDone = opts.onDone ?? null;

    this.titleEl.textContent = `A gift for ${opts.npcName}!`;
    this.captionEl.textContent = opts.itemName;
    this.playerNameEl.textContent = opts.playerName?.trim() || "You";
    this.npcNameEl.textContent = opts.npcName;

    drawPortrait(this.playerFace, "player", opts.playerLook);
    drawPortrait(this.npcFace, opts.npcId, opts.npcLook);

    this.itemEl.classList.remove("is-toss", "is-land");
    void this.itemEl.offsetWidth;

    this.root.hidden = false;
    this.root.classList.remove("is-out");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");
    this.card.classList.remove("is-land");

    this.preview.attachInventory(
      this.itemHost,
      `mat:${opts.itemId}`,
      ITEM_PREVIEW_SIZE,
    );

    // Start the fly after the card pops in.
    window.setTimeout(() => {
      if (this.root.hidden) return;
      this.itemEl.classList.add("is-toss");
      Audio.sfx("pickup");
    }, 80);

    this.landTimer = window.setTimeout(() => {
      this.itemEl.classList.add("is-land");
      this.card.classList.add("is-land");
      Audio.sfx("chime");
    }, TOSS_MS + 80);

    const hold = opts.durationMs ?? 1800;
    this.hideTimer = window.setTimeout(() => this.hide(), hold);
  }

  hide() {
    this.clearTimers();
    this.preview.dispose();
    this.root.classList.remove("is-in");
    this.root.classList.add("is-out");
    const done = this.onDone;
    this.onDone = null;
    window.setTimeout(() => {
      this.root.hidden = true;
      this.root.classList.remove("is-out");
      this.itemEl.classList.remove("is-toss", "is-land");
      this.card.classList.remove("is-land");
      done?.();
    }, 280);
  }

  destroy() {
    this.clearTimers();
    this.preview.dispose();
    this.onDone = null;
    this.root.remove();
  }

  private clearTimers() {
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = 0;
    }
    if (this.landTimer) {
      window.clearTimeout(this.landTimer);
      this.landTimer = 0;
    }
  }
}
