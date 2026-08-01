import type { GameState } from "../systems/GameState";
import type { QuestTrackerInfo } from "../systems/QuestSystem";
import { NEED_IDS, NEED_LABELS, moodFromNeeds } from "../data/needs";
import { lotAtTile } from "../world/lots";
import { TILE } from "../game/constants";

function clockLabel(dayTime: number): string {
  const hours = Math.floor(dayTime * 24);
  const mins = Math.floor((dayTime * 24 * 60) % 60);
  const h12 = ((hours + 11) % 12) + 1;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

export class Hud {
  private el: HTMLElement;
  private toastEl: HTMLElement;
  private busyEl: HTMLElement;
  private busyLabelEl: HTMLElement;
  private busyBarEl: HTMLElement;
  private bottomInfo: HTMLElement;
  private state: GameState;
  private getTracker: () => QuestTrackerInfo | null;
  private lastHtml = "";
  private lastToast = "";
  private toastVisible = false;
  private busyVisible = false;
  private lastObjectiveKey = "";
  private pulseUntil = 0;

  constructor(
    parent: HTMLElement,
    state: GameState,
    getTracker: () => QuestTrackerInfo | null = () => null,
  ) {
    this.state = state;
    this.getTracker = getTracker;
    this.el = document.createElement("div");
    this.el.className = "ll-hud";
    parent.appendChild(this.el);

    // Toast / busy live outside the HUD panel rebuild so clock/needs updates
    // don't remount them and restart CSS enter animations.
    this.toastEl = document.createElement("div");
    this.toastEl.className = "ll-toast";
    this.toastEl.hidden = true;
    parent.appendChild(this.toastEl);

    this.busyEl = document.createElement("div");
    this.busyEl.className = "ll-busy";
    this.busyEl.hidden = true;
    this.busyLabelEl = document.createElement("span");
    const busyBarWrap = document.createElement("div");
    busyBarWrap.className = "ll-bar";
    this.busyBarEl = document.createElement("i");
    this.busyBarEl.className = "ok";
    busyBarWrap.appendChild(this.busyBarEl);
    this.busyEl.append(this.busyLabelEl, busyBarWrap);
    parent.appendChild(this.busyEl);

    this.bottomInfo = document.createElement("div");
    this.bottomInfo.className = "ll-hud-hints";
    this.bottomInfo.textContent =
      "Click walk/use · pinch/+- zoom · E interact · B build · Q save · Esc menu";
    parent.appendChild(this.bottomInfo);
  }

  setBottomInfoVisible(v: boolean) {
    this.bottomInfo.hidden = !v;
  }

  /**
   * Only the panel clusters block world clicks — the HUD root itself spans the
   * whole viewport, so testing against it would swallow every click.
   */
  containsHudCluster(clientX: number, clientY: number): boolean {
    const clusters = this.el.querySelectorAll(
      ".ll-hud-left > *, .ll-hud-right > *",
    );
    for (const cluster of clusters) {
      const r = cluster.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        return true;
      }
    }
    return false;
  }

  update() {
    const s = this.state;
    const mood = Math.round(moodFromNeeds(s.needs));
    const lot = lotAtTile(
      Math.floor(s.playerX / TILE),
      Math.floor(s.playerY / TILE),
    );

    const needsHtml = NEED_IDS.map((id) => {
      const v = Math.round(s.needs[id]);
      const cls = v < 25 ? "bad" : v < 50 ? "warn" : "ok";
      return `<div class="ll-need"><span>${NEED_LABELS[id]}</span><div class="ll-bar"><i class="${cls}" style="width:${v}%"></i></div><b>${v}</b></div>`;
    }).join("");

    const pet = s.adoptedPet
      ? `<div class="ll-pet-panel"><strong>${escapeHtml(s.adoptedPetName)}</strong><span>Bond ${Math.round(s.adoptedPet.needs.bond)}</span></div>`
      : "";

    const tracker = this.getTracker();
    const objectiveKey = tracker
      ? `${tracker.title}|${tracker.objective}`
      : "";
    if (objectiveKey && objectiveKey !== this.lastObjectiveKey) {
      this.lastObjectiveKey = objectiveKey;
      this.pulseUntil = performance.now() + 700;
    }
    const pulse = performance.now() < this.pulseUntil ? " is-pulse" : "";

    const objectiveHtml = tracker
      ? `<div class="ll-objective${pulse}${tracker.side ? " is-side" : ""}">
          <small>Objective</small>
          <strong>${escapeHtml(tracker.title)}</strong>
          <span>${escapeHtml(tracker.objective)}</span>
        </div>`
      : "";

    const html = `
      <div class="ll-hud-left">
        <div class="ll-panel">
          <div class="ll-card-head">
            <strong>${escapeHtml(s.playerName)}</strong>
            <span class="ll-pill">Mood ${mood}</span>
          </div>
          ${needsHtml}
        </div>
        ${pet}
      </div>
      <div class="ll-hud-right">
        <div class="ll-panel">
          <div class="ll-kv"><small>Money</small><strong>$${s.money}</strong></div>
          <div class="ll-kv"><small>Time</small><strong>${clockLabel(s.dayTime)}</strong></div>
          <div class="ll-kv"><small>Place</small><strong>${escapeHtml(lot?.name ?? "Town")}</strong></div>
          <div class="ll-mode${s.mode === "build" ? " is-build" : ""}">${s.mode === "build" ? "Build mode" : "Live"}</div>
        </div>
        ${objectiveHtml}
      </div>
    `;

    // Only touch the DOM when something actually changed — this HUD updates
    // every frame and reflowing it constantly breaks hit-testing and animation.
    if (html !== this.lastHtml) {
      this.lastHtml = html;
      this.el.innerHTML = html;
    }

    this.updateToast();
    this.updateBusy();
  }

  private updateToast() {
    const s = this.state;
    const visible = performance.now() < s.toastUntil;
    if (!visible) {
      if (this.toastVisible) {
        this.toastVisible = false;
        this.lastToast = "";
        this.toastEl.hidden = true;
        this.toastEl.textContent = "";
      }
      return;
    }

    if (!this.toastVisible || s.toast !== this.lastToast) {
      this.toastVisible = true;
      this.lastToast = s.toast;
      this.toastEl.textContent = s.toast;
      this.toastEl.hidden = false;
      // Retrigger enter animation only when the message actually changes.
      this.toastEl.style.animation = "none";
      void this.toastEl.offsetWidth;
      this.toastEl.style.animation = "";
    }
  }

  private updateBusy() {
    const s = this.state;
    if (!s.isBusy()) {
      if (this.busyVisible) {
        this.busyVisible = false;
        this.busyEl.hidden = true;
      }
      return;
    }

    if (!this.busyVisible) {
      this.busyVisible = true;
      this.busyEl.hidden = false;
    }
    this.busyLabelEl.textContent = s.busyLabel;
    this.busyBarEl.style.width = `${Math.round(s.busyProgress() * 100)}%`;
  }

  destroy() {
    this.el.remove();
    this.toastEl.remove();
    this.busyEl.remove();
    this.bottomInfo.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
