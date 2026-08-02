/**
 * Couch-potato TV viewer: pick a genre show, watch a silly animation, bail anytime.
 */

import type { TvShowDef, TvShowId } from "../data/tvShows";
import { tvShowById } from "../data/tvShows";
import { Audio } from "../audio/AudioManager";

/** Full need reward after watching at least this long. */
export const TV_FULL_WATCH_MS = 4500;
/** Soft auto-end so you don't sit forever. */
const TV_AUTO_END_MS = 16000;

export class TvViewer {
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private channelEl: HTMLElement;
  private stage: HTMLElement;
  private open = false;
  private showId: TvShowId = "comedy";
  private onStop: ((watchedMs: number, show: TvShowDef) => void) | null = null;
  private bornMs = 0;
  private autoTimer = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private stopping = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-tv";
    this.root.hidden = true;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.innerHTML = `
      <div class="ll-tv-scrim" data-stop></div>
      <div class="ll-tv-card">
        <div class="ll-tv-bezel">
          <div class="ll-tv-screen">
            <p class="ll-tv-channel"></p>
            <div class="ll-tv-stage"></div>
            <div class="ll-tv-scan"></div>
          </div>
        </div>
        <p class="ll-tv-title"></p>
        <button type="button" class="ll-tv-stop" data-stop>Stop watching</button>
      </div>
    `;
    this.titleEl = this.root.querySelector(".ll-tv-title") as HTMLElement;
    this.channelEl = this.root.querySelector(".ll-tv-channel") as HTMLElement;
    this.stage = this.root.querySelector(".ll-tv-stage") as HTMLElement;
    this.root.addEventListener("click", (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-stop]")) this.requestStop();
    });
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  play(showId: TvShowId, onStop: (watchedMs: number, show: TvShowDef) => void) {
    this.close(false);
    const show = tvShowById[showId];
    this.showId = showId;
    this.onStop = onStop;
    this.open = true;
    this.stopping = false;
    this.bornMs = performance.now();
    this.titleEl.textContent = show.title;
    this.channelEl.textContent = show.channel;
    this.root.dataset.show = showId;
    this.root.hidden = false;
    this.root.classList.remove("is-out");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");
    this.buildStage(showId);
    this.bindKeys();
    Audio.playMusic(show.music);
    this.autoTimer = window.setTimeout(() => this.requestStop(), TV_AUTO_END_MS);
  }

  destroy() {
    this.close(false);
    this.root.remove();
  }

  /** User / auto stop - fires reward callback once. */
  private requestStop() {
    if (!this.open || this.stopping) return;
    this.stopping = true;
    const watched = performance.now() - this.bornMs;
    const show = tvShowById[this.showId];
    const cb = this.onStop;
    this.onStop = null;
    this.close(true);
    cb?.(watched, show);
  }

  private close(animate: boolean) {
    if (this.autoTimer) {
      window.clearTimeout(this.autoTimer);
      this.autoTimer = 0;
    }
    this.unbindKeys();
    if (!this.open && this.root.hidden) return;
    this.open = false;
    this.onStop = null;
    if (!animate) {
      this.root.hidden = true;
      this.root.classList.remove("is-in", "is-out");
      this.stage.innerHTML = "";
      return;
    }
    this.root.classList.remove("is-in");
    this.root.classList.add("is-out");
    window.setTimeout(() => {
      if (this.open) return;
      this.root.hidden = true;
      this.root.classList.remove("is-out");
      this.stage.innerHTML = "";
    }, 220);
  }

  private bindKeys() {
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.open) return;
      if (e.code === "Escape" || e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!e.repeat) this.requestStop();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  private unbindKeys() {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = null;
  }

  private buildStage(id: TvShowId) {
    if (id === "comedy") {
      this.stage.innerHTML = `
        <div class="ll-tv-anim ll-tv-comedy">
          <i class="ll-tv-c-wall"></i>
          <i class="ll-tv-c-window"></i>
          <i class="ll-tv-c-rug"></i>
          <i class="ll-tv-c-couch"></i>
          <i class="ll-tv-c-plant"></i>
          <i class="ll-tv-c-bowl"></i>
          <i class="ll-tv-cat is-a"><b></b><em></em></i>
          <i class="ll-tv-cat is-b"><b></b><em></em></i>
          <i class="ll-tv-yarn"></i>
          <i class="ll-tv-yarn-trail"></i>
          <span class="ll-tv-laugh is-1">ha</span>
          <span class="ll-tv-laugh is-2">HA</span>
          <span class="ll-tv-laugh is-3">mew</span>
          <span class="ll-tv-laugh is-4">lol</span>
          <span class="ll-tv-c-caption">SILLY CATS</span>
        </div>
      `;
      return;
    }
    if (id === "action") {
      this.stage.innerHTML = `
        <div class="ll-tv-anim ll-tv-action">
          <i class="ll-tv-a-sky"></i>
          <i class="ll-tv-a-skyline"></i>
          <i class="ll-tv-a-road"></i>
          <i class="ll-tv-a-lane"></i>
          <i class="ll-tv-speed is-1"></i>
          <i class="ll-tv-speed is-2"></i>
          <i class="ll-tv-speed is-3"></i>
          <i class="ll-tv-villain"><b></b></i>
          <i class="ll-tv-hero"><b></b><em></em></i>
          <i class="ll-tv-spark is-1"></i>
          <i class="ll-tv-spark is-2"></i>
          <i class="ll-tv-boom is-1"></i>
          <i class="ll-tv-boom is-2"></i>
          <span class="ll-tv-a-ep">EP 7</span>
          <span class="ll-tv-dash">TURBO!</span>
          <span class="ll-tv-a-whoosh">WHOOSH</span>
        </div>
      `;
      return;
    }
    this.stage.innerHTML = `
      <div class="ll-tv-anim ll-tv-horror">
        <i class="ll-tv-h-fog is-1"></i>
        <i class="ll-tv-h-fog is-2"></i>
        <i class="ll-tv-h-hill"></i>
        <i class="ll-tv-h-house"></i>
        <i class="ll-tv-h-tomb is-1"></i>
        <i class="ll-tv-h-tomb is-2"></i>
        <i class="ll-tv-h-tomb is-3"></i>
        <i class="ll-tv-moon"></i>
        <i class="ll-tv-bat is-1"></i>
        <i class="ll-tv-bat is-2"></i>
        <i class="ll-tv-ghost"><b></b></i>
        <i class="ll-tv-eyes"></i>
        <i class="ll-tv-h-flash"></i>
        <span class="ll-tv-boo">BOO</span>
        <span class="ll-tv-h-caption">MIDNIGHT MOAN</span>
      </div>
    `;
  }
}
