import type { GameState } from "../systems/GameState";
import type { QuestTrackerInfo } from "../systems/QuestSystem";
import type { AspirationTrackerInfo } from "../systems/AspirationSystem";
import type { NeedId, NeedsState } from "../data/types";
import {
  NEED_CRITICAL,
  NEED_IDS,
  NEED_LABELS,
  NEED_LOW,
  moodFromNeeds,
} from "../data/needs";
import { computeCozyScore } from "../systems/cozyScore";
import { beatForDay } from "../systems/dayCycle";
import { weatherHudLabel, weatherLabel } from "../systems/weather";
import { jobById, jobDisplayName, jobTaskCount } from "../data/jobs";
import { lotAtTile } from "../world/lots";
import { TILE } from "../game/constants";
import { drawPortrait } from "./portraits";
import { PlayerStatusModal } from "./PlayerStatusModal";
import { ShopModal, type ShopMode } from "./ShopModal";

const BOOST_PULSE_MS = 720;
const FLOAT_LIFE_MS = 2500;

function clockLabel(dayTime: number): string {
  const hours = Math.floor(dayTime * 24);
  const mins = Math.floor((dayTime * 24 * 60) % 60);
  const h12 = ((hours + 11) % 12) + 1;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

type Urgency = "ok" | "warn" | "critical";

function needsUrgency(needs: GameState["needs"]): Urgency {
  let worst: Urgency = "ok";
  for (const id of NEED_IDS) {
    const v = needs[id];
    if (v < NEED_CRITICAL) return "critical";
    if (v < NEED_LOW) worst = "warn";
  }
  return worst;
}

export class Hud {
  private el: HTMLElement;
  private panel: HTMLElement;
  private floatHost: HTMLElement;
  private toastEl: HTMLElement;
  private state: GameState;
  private getTracker: () => QuestTrackerInfo | null;
  private getAspiration: () => AspirationTrackerInfo | null;
  private lastStructureKey = "";
  private lastToast = "";
  private toastVisible = false;
  private lastObjectiveKey = "";
  private pulseUntil = 0;
  private statusModal: PlayerStatusModal;
  private shopModal: ShopModal;
  private lastPortraitKey = "";
  private prevNeeds: NeedsState | null = null;
  private prevMatTotal = -1;
  private prevMoney = -1;
  private boostUntil = 0;
  private boostToken = 0;
  private pendingFloats: Array<{
    key: string;
    needId: NeedId;
    amount: number;
    born: number;
    /** Vertical slot so simultaneous boosts don't overlap. */
    stack: number;
  }> = [];
  private onShowBeat: (() => void) | null = null;

  constructor(
    parent: HTMLElement,
    state: GameState,
    getTracker: () => QuestTrackerInfo | null = () => null,
    getAspiration: () => AspirationTrackerInfo | null = () => null,
    onBuyTool?: (id: import("../data/items").ToolId) => void,
    onShowBeat?: () => void,
  ) {
    this.state = state;
    this.getTracker = getTracker;
    this.getAspiration = getAspiration;
    this.onShowBeat = onShowBeat ?? null;
    this.el = document.createElement("div");
    this.el.className = "ll-hud";
    this.panel = document.createElement("div");
    this.panel.className = "ll-hud-panel";
    this.floatHost = document.createElement("div");
    this.floatHost.className = "ll-need-float-host";
    this.floatHost.setAttribute("aria-hidden", "true");
    this.el.append(this.panel, this.floatHost);
    parent.appendChild(this.el);
    this.statusModal = new PlayerStatusModal(parent, state);
    this.shopModal = new ShopModal(
      parent,
      state,
      () => {
        this.lastStructureKey = "";
        this.update();
      },
      onBuyTool,
    );

    this.el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-hud-bag]")) {
        e.stopPropagation();
        if (this.state.mode !== "live") return;
        this.shopModal.close();
        if (this.statusModal.isBagOpen()) this.statusModal.close();
        else this.statusModal.open("bag");
        this.lastStructureKey = "";
        this.update();
        return;
      }
      if (t.closest("[data-hud-avatar]")) {
        e.stopPropagation();
        this.shopModal.close();
        if (this.statusModal.isOpen() && !this.statusModal.isBagOpen()) {
          this.statusModal.close();
        } else {
          this.statusModal.open("status");
        }
        this.lastStructureKey = "";
        this.update();
        return;
      }
      if (t.closest("[data-show-beat]")) {
        e.stopPropagation();
        this.onShowBeat?.();
        return;
      }
      const obj = t.closest("[data-objective]") as HTMLElement | null;
      if (obj) {
        e.stopPropagation();
        const questId = obj.dataset.questId;
        this.statusModal.open("tasks", {
          highlightQuestId: questId || undefined,
        });
        this.lastStructureKey = "";
        this.update();
      }
    });

    this.toastEl = document.createElement("div");
    this.toastEl.className = "ll-toast";
    this.toastEl.hidden = true;
    parent.appendChild(this.toastEl);
  }

  containsHudCluster(clientX: number, clientY: number): boolean {
    if (this.statusModal.containsPoint(clientX, clientY)) return true;
    if (this.shopModal.containsPoint(clientX, clientY)) return true;
    const clusters = this.panel.querySelectorAll(
      ".ll-hud-top, .ll-hud-objectives > *, .ll-hud-left > *",
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

  isStatusOpen(): boolean {
    return this.statusModal.isOpen();
  }

  isInventoryOpen(): boolean {
    return this.statusModal.isBagOpen();
  }

  isShopOpen(): boolean {
    return this.shopModal.isOpen();
  }

  isAnyModalOpen(): boolean {
    return this.statusModal.isOpen() || this.shopModal.isOpen();
  }

  closeStatus() {
    this.statusModal.close();
  }

  closeInventory() {
    this.statusModal.close();
  }

  closeShop() {
    this.shopModal.close();
  }

  toggleInventory() {
    if (this.state.mode !== "live") return;
    this.shopModal.close();
    if (this.statusModal.isBagOpen()) this.statusModal.close();
    else this.statusModal.open("bag");
    this.lastStructureKey = "";
    this.update();
  }

  openShop(mode: ShopMode, title: string) {
    this.statusModal.close();
    this.shopModal.open(mode, title);
    this.lastStructureKey = "";
    this.update();
  }

  update() {
    const s = this.state;
    const mood = Math.round(moodFromNeeds(s.needs));
    const lot = lotAtTile(
      Math.floor(s.playerX / TILE),
      Math.floor(s.playerY / TILE),
    );
    const cozy = computeCozyScore(s.furniture);
    const beat = beatForDay(s.dayIndex);
    const beatClaimed = s.weeklyBeatDay === s.dayIndex;
    const urgency = needsUrgency(s.needs);
    const place = lot?.name ?? "Town";
    const timeTip = `Time · Day ${s.dayIndex} · ${clockLabel(s.dayTime)}`;
    const weatherTip = `Weather · ${weatherLabel(s.weather)}`;
    const weatherText = weatherHudLabel(s.weather);
    const raining = s.weather === "rain";
    const modeTip = s.mode === "build" ? "Build mode" : "Live mode";
    const clock = clockLabel(s.dayTime);

    const tracker = this.getTracker();
    const aspiration = !tracker ? this.getAspiration() : null;
    type Shown = {
      title: string;
      objective: string;
      side: boolean;
      kind: "quest" | "goal";
      questId?: string;
      have?: number;
      need?: number;
    };
    const shown: Shown | null = tracker
      ? {
          title: tracker.title,
          objective: tracker.objective,
          side: !!tracker.side,
          kind: "quest",
          questId: tracker.questId,
          have: tracker.have,
          need: tracker.need,
        }
      : aspiration
        ? {
            title: aspiration.title,
            objective: aspiration.objective,
            side: true,
            kind: "goal",
          }
        : null;

    const objectiveKey = shown
      ? `${shown.kind}|${shown.title}|${shown.objective}`
      : "";
    if (objectiveKey && objectiveKey !== this.lastObjectiveKey) {
      this.lastObjectiveKey = objectiveKey;
      this.pulseUntil = performance.now() + 700;
    }

    const showBeat = !!(beat && !beatClaimed);
    const shiftActive = s.jobActive && !!s.activeJobId;
    const shiftJob = shiftActive ? jobById[s.activeJobId!] : null;
    const shiftTotal = shiftJob ? jobTaskCount(shiftJob) : 0;
    const shiftLabel = shiftJob
      ? shiftJob.tasks[s.jobTasksDone]?.label ?? "Working"
      : "";
    // Structural only - value ticks must NOT remount DOM (kills :hover tooltips
    // and retriggers the needs-panel entrance animation).
    // Urgency is patched onto the avatar so need recovery doesn't wipe floats.
    const structureKey = [
      this.statusModal.isOpen() ? `1:${this.statusModal.currentTab()}` : "0",
      this.shopModal.isOpen() ? "1" : "0",
      s.mode,
      s.playerName,
      s.adoptedPet ? "pet" : "",
      showBeat ? beat!.title : "",
      shown ? `${shown.kind}|${shown.title}|${shown.side ? 1 : 0}|${shown.have ?? ""}|${shown.need ?? ""}|${shown.questId ?? ""}` : "",
      shiftActive ? `shift|${s.activeJobId}|${s.jobTasksDone}` : "",
    ].join("|");

    if (structureKey !== this.lastStructureKey) {
      this.lastStructureKey = structureKey;
      this.panel.innerHTML = this.buildHtml({
        s,
        mood,
        cozy,
        urgency,
        place,
        timeTip,
        weatherTip,
        weatherText,
        raining,
        modeTip,
        clock,
        showBeat,
        beatTitle: beat?.title ?? "",
        beatPlace: beat?.place ?? "",
        shown,
        shiftActive,
        shiftProgress: shiftActive
          ? `${s.jobTasksDone}/${shiftTotal}`
          : "",
        shiftTask: shiftLabel,
        shiftName: shiftJob
          ? jobDisplayName(shiftJob.id, s.isPromoted(shiftJob.id))
          : "",
      });
      this.lastPortraitKey = "";
    }

    this.detectNeedBoosts();
    this.detectCollectionBoosts();

    this.patchValues({
      money: s.money,
      clock,
      timeTip,
      weatherTip,
      weatherText,
      raining,
      place,
      cozy,
      modeTip,
      isBuild: s.mode === "build",
      mood,
      urgency,
      petName: s.adoptedPetName,
      petBond: s.adoptedPet ? Math.round(s.adoptedPet.needs.bond) : 0,
      petStreak: s.petCareStreak,
      objectiveText: shown?.objective ?? "",
      pulse: performance.now() < this.pulseUntil,
    });

    this.syncBoostFx();
    this.syncPortrait();
    this.updateToast();
  }

  private detectNeedBoosts() {
    const needs = this.state.needs;
    if (!this.prevNeeds) {
      this.prevNeeds = { ...needs };
      return;
    }

    const now = performance.now();
    let stagger = 0;
    let boosted = false;
    // Continue the column above any floats still on screen.
    let stack = this.pendingFloats.length;
    for (const id of NEED_IDS) {
      const delta = Math.round(needs[id]) - Math.round(this.prevNeeds[id]);
      if (delta < 1) continue;
      boosted = true;
      this.pendingFloats.push({
        key: `${now}-${id}-${delta}`,
        needId: id,
        amount: delta,
        born: now + stagger,
        stack: stack++,
      });
      stagger += 90;
    }
    if (boosted) this.triggerAvatarPulse();
    this.prevNeeds = { ...needs };
    this.pendingFloats = this.pendingFloats.filter(
      (f) => now - f.born < FLOAT_LIFE_MS,
    );
  }

  /** Bounce the avatar when bag loot or cash goes up. */
  private detectCollectionBoosts() {
    const mats = this.state.inventory.materials;
    let total = 0;
    for (const v of Object.values(mats)) total += v ?? 0;
    const money = this.state.money;
    if (this.prevMatTotal < 0) {
      this.prevMatTotal = total;
      this.prevMoney = money;
      return;
    }
    if (total > this.prevMatTotal || money > this.prevMoney) {
      this.triggerAvatarPulse();
    }
    this.prevMatTotal = total;
    this.prevMoney = money;
  }

  private triggerAvatarPulse() {
    this.boostUntil = performance.now() + BOOST_PULSE_MS;
    this.boostToken += 1;
  }

  /** Pop the bottom-left avatar (gifts, interactions, celebrations, etc.). */
  pulseAvatar() {
    this.triggerAvatarPulse();
    this.syncBoostFx();
  }

  private syncBoostFx() {
    const now = performance.now();
    const btn = this.panel.querySelector(
      "[data-hud-avatar]",
    ) as HTMLElement | null;
    if (btn) {
      const boosting = now < this.boostUntil;
      if (boosting) {
        if (btn.dataset.boostToken !== String(this.boostToken)) {
          btn.dataset.boostToken = String(this.boostToken);
          btn.classList.remove("is-boost");
          void btn.offsetWidth;
          btn.classList.add("is-boost");
        }
      } else if (btn.classList.contains("is-boost")) {
        btn.classList.remove("is-boost");
        delete btn.dataset.boostToken;
      }
    }

    // Keep the float host anchored over the avatar circle.
    const avatar = btn;
    if (avatar) {
      const avatarRect = avatar.getBoundingClientRect();
      const hostParent = this.el.getBoundingClientRect();
      this.floatHost.style.left = `${avatarRect.left - hostParent.left + avatarRect.width / 2}px`;
      this.floatHost.style.top = `${avatarRect.top - hostParent.top}px`;
    }

    const alive = new Set(this.pendingFloats.map((f) => f.key));
    for (const node of Array.from(this.floatHost.children)) {
      const key = (node as HTMLElement).dataset.floatKey;
      if (!key || !alive.has(key)) node.remove();
    }

    for (const f of this.pendingFloats) {
      if (this.floatHost.querySelector(`[data-float-key="${f.key}"]`)) continue;
      if (now < f.born) continue;
      const el = document.createElement("div");
      el.className = "ll-need-float";
      el.dataset.floatKey = f.key;
      el.style.setProperty("--stack", String(f.stack));
      el.textContent = `+${f.amount} ${NEED_LABELS[f.needId]}`;
      this.floatHost.appendChild(el);
      el.addEventListener("animationend", () => {
        el.remove();
        this.pendingFloats = this.pendingFloats.filter((x) => x.key !== f.key);
      });
    }
  }

  private buildHtml(opts: {
    s: GameState;
    mood: number;
    cozy: number;
    urgency: Urgency;
    place: string;
    timeTip: string;
    weatherTip: string;
    weatherText: string;
    raining: boolean;
    modeTip: string;
    clock: string;
    showBeat: boolean;
    beatTitle: string;
    beatPlace: string;
    shown: {
      title: string;
      objective: string;
      side: boolean;
      kind: "quest" | "goal";
      questId?: string;
      have?: number;
      need?: number;
    } | null;
    shiftActive?: boolean;
    shiftProgress?: string;
    shiftTask?: string;
    shiftName?: string;
  }): string {
    const { s, cozy, urgency, place, timeTip, weatherTip, weatherText, raining, modeTip, clock, showBeat, shown } =
      opts;

    const pet = s.adoptedPet
      ? `<div class="ll-pet-chip" title="Pet bond"><strong data-pet-name>${escapeHtml(s.adoptedPetName)}</strong><span data-pet-bond>${Math.round(s.adoptedPet.needs.bond)}${s.petCareStreak > 1 ? ` · ${s.petCareStreak}d` : ""}</span></div>`
      : "";

    const objectiveHtml = shown
      ? (() => {
          const kindLabel = shown.kind === "goal" ? "Lifestyle" : shown.side ? "Side quest" : "Main goal";
          const tip =
            shown.kind === "quest"
              ? "Open Tasks · see this objective"
              : "Open Tasks · quests & unlocks";
          const questAttr = shown.questId
            ? ` data-quest-id="${escapeHtml(shown.questId)}"`
            : "";
          const progress =
            shown.need && shown.need > 1 && shown.have != null
              ? (() => {
                  const pct = Math.min(
                    100,
                    Math.round((shown.have / shown.need) * 100),
                  );
                  return `<div class="ll-objective-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
                })()
              : "";
          return `<button type="button" class="ll-objective ll-quest-glow${shown.side ? " is-side" : ""}${shown.kind === "goal" ? " is-goal" : ""}" data-objective${questAttr} title="${escapeHtml(tip)}" aria-label="${escapeHtml(`${kindLabel}: ${shown.title}. ${shown.objective}. ${tip}`)}">
          <span class="ll-objective-kicker">
            <small>${kindLabel}</small>
            <span class="ll-objective-go" aria-hidden="true">Tasks ›</span>
          </span>
          <strong>${escapeHtml(shown.title)}</strong>
          <span data-objective-text>${escapeHtml(shown.objective)}</span>
          ${progress}
        </button>`;
        })()
      : "";

    const beatHtml = showBeat
      ? `<div class="ll-beat">
          <small>Today</small>
          <strong>${escapeHtml(opts.beatTitle)}</strong>
          <span>${escapeHtml(opts.beatPlace)}</span>
          <button type="button" class="ll-beat-where" data-show-beat>Show me where!</button>
        </div>`
      : "";

    const shiftHtml = opts.shiftActive
      ? `<div class="ll-shift-chip" data-shift>
          <small>Shift</small>
          <strong>${escapeHtml(opts.shiftName ?? "Work")}</strong>
          <span data-shift-progress>${escapeHtml(opts.shiftProgress ?? "")} · ${escapeHtml(opts.shiftTask ?? "")}</span>
        </div>`
      : "";

    const modeCls = s.mode === "build" ? " is-build" : "";
    const modeIcon =
      s.mode === "build"
        ? `<svg viewBox="0 0 16 16" width="11" height="11"><path d="M9.2 2.4 13.6 6.8 7.4 13H3v-4.4L9.2 2.4z" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"/><path d="M8 3.8 12.2 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
        : `<svg viewBox="0 0 16 16" width="11" height="11"><circle cx="8" cy="5.2" r="2.2" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M3.6 13.2c.6-2.4 2.2-3.6 4.4-3.6s3.8 1.2 4.4 3.6" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>`;

    const statusOpen = this.statusModal.isOpen() && !this.statusModal.isBagOpen();
    const bagOpen = this.statusModal.isBagOpen();
    const urgencyTip =
      urgency === "critical"
        ? "Needs urgent - click for status"
        : urgency === "warn"
          ? "Needs getting low - click for status"
            : "Click for status, tasks, pets & guide";

    return `
      <div class="ll-hud-objectives">
        ${objectiveHtml}
        ${shiftHtml}
        ${beatHtml}
      </div>
      <div class="ll-hud-top" role="status">
        <div class="ll-stat" data-stat="money" data-tip="Money · $${s.money}" aria-label="Money: $${s.money}">
          <span class="ll-stat-ico" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="8" y="11.2" text-anchor="middle" font-size="9.5" font-weight="700" fill="currentColor" font-family="Fredoka,Nunito,sans-serif">$</text></svg>
          </span>
          <b data-stat-val="money">$${s.money}</b>
        </div>
        <button
          type="button"
          class="ll-stat ll-stat-icon ll-stat-bag${bagOpen ? " is-open" : ""}${s.mode !== "live" ? " is-disabled" : ""}"
          data-hud-bag
          data-stat="bag"
          data-tip="Bag · I"
          aria-label="Open bag"
          aria-expanded="${bagOpen ? "true" : "false"}"
          ${s.mode !== "live" ? "disabled" : ""}
        >
          <span class="ll-stat-ico" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4.2 5.2h7.6l.7 8.2H3.5l.7-8.2z" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"/><path d="M6 5.2V4.1a2 2 0 0 1 4 0v1.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>
          </span>
        </button>
        <div class="ll-stat" data-stat="time" data-tip="${escapeHtml(timeTip)}" aria-label="${escapeHtml(timeTip)}">
          <span class="ll-stat-ico" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.2V8l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </span>
          <b data-stat-val="time">${clock}</b>
        </div>
        <div class="ll-stat ll-stat-weather${raining ? " is-rain" : ""}" data-stat="weather" data-tip="${escapeHtml(weatherTip)}" aria-label="${escapeHtml(weatherTip)}">
          <span class="ll-stat-ico ll-weather-clear" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="8" cy="8" r="2.6" fill="currentColor"/><path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>
          </span>
          <span class="ll-stat-ico ll-weather-rain" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4.2 7.2a3.4 3.4 0 0 1 6.5-.9A2.6 2.6 0 0 1 12.2 11H4.6a2.2 2.2 0 0 1-.4-4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.4 12.2 4.8 14M8 12.2 7.4 14M10.6 12.2 10 14" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>
          </span>
          <b data-stat-val="weather">${escapeHtml(weatherText)}</b>
        </div>
        <div class="ll-stat ll-stat-icon" data-stat="place" data-tip="Place · ${escapeHtml(place)}" aria-label="Place: ${escapeHtml(place)}">
          <span class="ll-stat-ico" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 1.8c-2.5 0-4.5 1.9-4.5 4.3 0 3.2 4.5 8.1 4.5 8.1s4.5-4.9 4.5-8.1C12.5 3.7 10.5 1.8 8 1.8z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.6" fill="currentColor"/></svg>
          </span>
        </div>
        <div class="ll-stat" data-stat="cozy" data-tip="Cozy · ${cozy}" aria-label="Cozy score: ${cozy}">
          <span class="ll-stat-ico" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12"><path d="M2.5 7.2 8 2.8l5.5 4.4V13a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V7.2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </span>
          <b data-stat-val="cozy">${cozy}</b>
        </div>
        <div class="ll-stat ll-stat-icon ll-stat-mode${modeCls}" data-stat="mode" data-tip="${modeTip}" aria-label="${modeTip}">
          <span class="ll-stat-ico" aria-hidden="true">${modeIcon}</span>
        </div>
      </div>
      <div class="ll-hud-left">
        <div class="ll-avatar-stack">
          <button
            type="button"
            class="ll-avatar-btn is-${urgency}${statusOpen ? " is-open" : ""}"
            data-hud-avatar
            aria-expanded="${statusOpen ? "true" : "false"}"
            aria-label="${escapeHtml(urgencyTip)}"
            title="${escapeHtml(urgencyTip)}"
          >
            <canvas class="ll-avatar-face" width="32" height="32" aria-hidden="true"></canvas>
          </button>
          <span class="ll-avatar-name">${escapeHtml(s.playerName)}</span>
          ${pet}
        </div>
      </div>
    `;
  }

  private patchValues(v: {
    money: number;
    clock: string;
    timeTip: string;
    weatherTip: string;
    weatherText: string;
    raining: boolean;
    place: string;
    cozy: number;
    modeTip: string;
    isBuild: boolean;
    mood: number;
    urgency: Urgency;
    petName: string;
    petBond: number;
    petStreak: number;
    objectiveText: string;
    pulse: boolean;
  }) {
    const setTip = (stat: string, tip: string, label?: string) => {
      const el = this.panel.querySelector(
        `[data-stat="${stat}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      if (el.getAttribute("data-tip") !== tip) el.setAttribute("data-tip", tip);
      const aria = label ?? tip;
      if (el.getAttribute("aria-label") !== aria) el.setAttribute("aria-label", aria);
    };
    const setVal = (stat: string, text: string) => {
      const el = this.panel.querySelector(`[data-stat-val="${stat}"]`);
      if (el && el.textContent !== text) el.textContent = text;
    };

    setVal("money", `$${v.money}`);
    setTip("money", `Money · $${v.money}`, `Money: $${v.money}`);
    setVal("time", v.clock);
    setTip("time", v.timeTip);
    setVal("weather", v.weatherText);
    setTip("weather", v.weatherTip);
    const weatherEl = this.panel.querySelector("[data-stat='weather']");
    if (weatherEl) weatherEl.classList.toggle("is-rain", v.raining);
    setTip("place", `Place · ${v.place}`, `Place: ${v.place}`);
    setVal("cozy", String(v.cozy));
    setTip("cozy", `Cozy · ${v.cozy}`, `Cozy score: ${v.cozy}`);
    setTip("mode", v.modeTip);
    const modeEl = this.panel.querySelector("[data-stat='mode']");
    if (modeEl) modeEl.classList.toggle("is-build", v.isBuild);

    const avatar = this.panel.querySelector(
      "[data-hud-avatar]",
    ) as HTMLElement | null;
    if (avatar) {
      avatar.classList.toggle("is-warn", v.urgency === "warn");
      avatar.classList.toggle("is-critical", v.urgency === "critical");
      avatar.classList.toggle("is-open", this.statusModal.isOpen());
      const tip =
        v.urgency === "critical"
          ? "Needs urgent - click for status"
          : v.urgency === "warn"
            ? "Needs getting low - click for status"
            : "Click for status, tasks, pets & guide";
      if (avatar.getAttribute("aria-label") !== tip) {
        avatar.setAttribute("aria-label", tip);
        avatar.setAttribute("title", tip);
      }
      avatar.setAttribute(
        "aria-expanded",
        this.statusModal.isOpen() ? "true" : "false",
      );
    }

    const petBond = this.panel.querySelector("[data-pet-bond]");
    if (petBond) {
      const text =
        v.petStreak > 1 ? `${v.petBond} · ${v.petStreak}d` : String(v.petBond);
      if (petBond.textContent !== text) petBond.textContent = text;
    }
    const petName = this.panel.querySelector("[data-pet-name]");
    if (petName && petName.textContent !== v.petName) {
      petName.textContent = v.petName;
    }

    const objText = this.panel.querySelector("[data-objective-text]");
    if (objText && objText.textContent !== v.objectiveText) {
      objText.textContent = v.objectiveText;
    }
    const obj = this.panel.querySelector("[data-objective]");
    if (obj) obj.classList.toggle("is-pulse", v.pulse);
  }

  private syncPortrait() {
    const canvas = this.panel.querySelector(
      ".ll-avatar-face",
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const look = this.state.playerLook;
    const key = `${look.sex}|${look.face}|${look.hairStyle}|${look.hair}|${look.skin}|${look.shirt}|${look.clothing}`;
    if (key === this.lastPortraitKey) return;
    this.lastPortraitKey = key;
    drawPortrait(canvas, "player", look);
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
      this.toastEl.style.animation = "none";
      void this.toastEl.offsetWidth;
      this.toastEl.style.animation = "";
    }
  }

  destroy() {
    this.statusModal.destroy();
    this.shopModal.destroy();
    this.el.remove();
    this.toastEl.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
