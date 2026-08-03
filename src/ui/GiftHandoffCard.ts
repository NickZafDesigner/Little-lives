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
  /** Total time the overlay stays up (intro hold + toss + outro). */
  durationMs?: number;
  /** Fires after the overlay finishes hiding. */
  onDone?: () => void;
}

/** Beat before the item appears and flies. */
const INTRO_HOLD_MS = 750;
const TOSS_MS = 1200;
const ITEM_PREVIEW_SIZE = 104;
const EXIT_MS = 380;

/**
 * Full-screen gift handoff: dim/blur backdrop, big circular avatars,
 * floating 3D item arcs from player → recipient. No card chrome.
 */
export class GiftHandoffCard {
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private captionEl: HTMLElement;
  private playerFace: HTMLCanvasElement;
  private npcFace: HTMLCanvasElement;
  private playerNameEl: HTMLElement;
  private npcNameEl: HTMLElement;
  private playerPerson: HTMLElement;
  private npcPerson: HTMLElement;
  private itemHost: HTMLElement;
  private itemEl: HTMLElement;
  private preview = new FurniturePreview();
  private timers: number[] = [];
  private onDone: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-gift";
    this.root.hidden = true;
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = `
      <div class="ll-gift-scrim" aria-hidden="true"></div>
      <div class="ll-gift-stage">
        <p class="ll-gift-title"></p>
        <div class="ll-gift-row">
          <div class="ll-gift-person is-player">
            <div class="ll-gift-orb">
              <canvas class="ll-gift-face" width="32" height="32" aria-hidden="true"></canvas>
            </div>
            <span class="ll-gift-who"></span>
          </div>
          <div class="ll-gift-flight" aria-hidden="true">
            <div class="ll-gift-item">
              <div class="ll-gift-item-preview"></div>
            </div>
          </div>
          <div class="ll-gift-person is-npc">
            <div class="ll-gift-orb">
              <canvas class="ll-gift-face" width="32" height="32" aria-hidden="true"></canvas>
            </div>
            <span class="ll-gift-who"></span>
          </div>
        </div>
        <p class="ll-gift-caption"></p>
      </div>
    `;
    this.titleEl = this.root.querySelector(".ll-gift-title") as HTMLElement;
    this.captionEl = this.root.querySelector(".ll-gift-caption") as HTMLElement;
    this.playerPerson = this.root.querySelector(
      ".ll-gift-person.is-player",
    ) as HTMLElement;
    this.npcPerson = this.root.querySelector(
      ".ll-gift-person.is-npc",
    ) as HTMLElement;
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

    this.titleEl.textContent = `A gift for ${opts.npcName}`;
    this.captionEl.textContent = opts.itemName;
    this.playerNameEl.textContent = opts.playerName?.trim() || "You";
    this.npcNameEl.textContent = opts.npcName;

    drawPortrait(this.playerFace, "player", opts.playerLook);
    drawPortrait(this.npcFace, opts.npcId, opts.npcLook);

    this.itemEl.classList.remove("is-appear", "is-toss", "is-land", "is-gone");
    this.playerPerson.classList.remove("is-give");
    this.npcPerson.classList.remove("is-receive");
    this.root.classList.remove("is-out", "is-in");
    void this.root.offsetWidth;

    this.root.hidden = false;
    this.root.classList.add("is-in");

    this.preview.attachInventory(
      this.itemHost,
      `mat:${opts.itemId}`,
      ITEM_PREVIEW_SIZE,
    );

    // Hold on the two faces, then fade the gift in and arc it over.
    this.timers.push(
      window.setTimeout(() => {
        if (this.root.hidden) return;
        this.itemEl.classList.add("is-appear");
        this.playerPerson.classList.add("is-give");
        Audio.sfx("pickup");
      }, INTRO_HOLD_MS),
    );

    this.timers.push(
      window.setTimeout(() => {
        if (this.root.hidden) return;
        this.itemEl.classList.remove("is-appear");
        this.itemEl.classList.add("is-toss");
      }, INTRO_HOLD_MS + 280),
    );

    this.timers.push(
      window.setTimeout(() => {
        if (this.root.hidden) return;
        this.itemEl.classList.add("is-land");
        this.npcPerson.classList.add("is-receive");
        Audio.sfx("chime");
      }, INTRO_HOLD_MS + 280 + TOSS_MS),
    );

    this.timers.push(
      window.setTimeout(() => {
        if (this.root.hidden) return;
        this.itemEl.classList.add("is-gone");
      }, INTRO_HOLD_MS + 280 + TOSS_MS + 320),
    );

    const hold = opts.durationMs ?? INTRO_HOLD_MS + TOSS_MS + 1100;
    this.timers.push(window.setTimeout(() => this.hide(), hold));
  }

  hide() {
    this.clearTimers();
    this.preview.dispose();
    this.root.classList.remove("is-in");
    this.root.classList.add("is-out");
    const done = this.onDone;
    this.onDone = null;
    this.timers.push(
      window.setTimeout(() => {
        this.root.hidden = true;
        this.root.classList.remove("is-out");
        this.itemEl.classList.remove(
          "is-appear",
          "is-toss",
          "is-land",
          "is-gone",
        );
        this.playerPerson.classList.remove("is-give");
        this.npcPerson.classList.remove("is-receive");
        done?.();
      }, EXIT_MS),
    );
  }

  destroy() {
    this.clearTimers();
    this.preview.dispose();
    this.onDone = null;
    this.root.remove();
  }

  private clearTimers() {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
  }
}
