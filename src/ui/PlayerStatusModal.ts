import type { GameState } from "../systems/GameState";
import {
  NEED_CRITICAL,
  NEED_IDS,
  NEED_LABELS,
  NEED_LOW,
  moodFromNeeds,
} from "../data/needs";
import type { PetNeedId } from "../data/types";
import { computeCozyScore } from "../systems/cozyScore";
import { jobDisplayName, jobById } from "../data/jobs";
import { questById } from "../data/quests";
import { petById } from "../data/pets";
import { listUnlockTasks } from "../systems/unlockProgress";
import { Audio } from "../audio/AudioManager";
import { drawPortrait } from "./portraits";

type StatusTab = "status" | "tasks" | "pets" | "guide";

const PET_NEED_IDS: PetNeedId[] = ["hunger", "energy", "fun", "bond"];
const PET_NEED_LABELS: Record<PetNeedId, string> = {
  hunger: "Hunger",
  energy: "Energy",
  fun: "Fun",
  bond: "Bond",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clockLabel(dayTime: number): string {
  const hours = Math.floor(dayTime * 24);
  const mins = Math.floor((dayTime * 24 * 60) % 60);
  const h12 = ((hours + 11) % 12) + 1;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

function needBarClass(v: number): string {
  if (v < NEED_CRITICAL) return "bad is-critical";
  if (v < NEED_LOW) return "warn";
  return "ok";
}

export class PlayerStatusModal {
  private el: HTMLElement;
  private state: GameState;
  private visible = false;
  private tab: StatusTab = "status";
  private lastPortraitKey = "";

  constructor(parent: HTMLElement, state: GameState) {
    this.state = state;
    this.el = document.createElement("div");
    this.el.className = "ll-status-modal";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "Player status");
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

  open(tab: StatusTab = "status") {
    this.tab = tab;
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
    else this.open(this.tab);
  }

  /** Refresh live values while open (called from Hud.update). */
  refresh() {
    if (!this.visible) return;
    this.rebuild();
  }

  private rebuild() {
    const s = this.state;
    const mood = Math.round(moodFromNeeds(s.needs));
    const cozy = computeCozyScore(s.furniture);

    this.el.innerHTML = `
      <div class="ll-status-modal-scrim" data-status-close></div>
      <div class="ll-status-modal-card">
        <header class="ll-status-modal-head">
          <div class="ll-status-modal-identity">
            <canvas class="ll-status-face" width="48" height="48" aria-hidden="true"></canvas>
            <div>
              <h2 class="ll-status-modal-title">${escapeHtml(s.playerName)}</h2>
              <p class="ll-status-modal-sub">Day ${s.dayIndex} · ${clockLabel(s.dayTime)} · Mood ${mood}</p>
            </div>
          </div>
          <button type="button" class="ll-status-modal-close" data-status-close aria-label="Close">✕</button>
        </header>
        <nav class="ll-status-tabs" role="tablist">
          <button type="button" class="ll-status-tab${this.tab === "status" ? " is-active" : ""}" data-tab="status" role="tab" aria-selected="${this.tab === "status"}">Status</button>
          <button type="button" class="ll-status-tab${this.tab === "tasks" ? " is-active" : ""}" data-tab="tasks" role="tab" aria-selected="${this.tab === "tasks"}">Tasks</button>
          <button type="button" class="ll-status-tab${this.tab === "pets" ? " is-active" : ""}" data-tab="pets" role="tab" aria-selected="${this.tab === "pets"}">Pets</button>
          <button type="button" class="ll-status-tab${this.tab === "guide" ? " is-active" : ""}" data-tab="guide" role="tab" aria-selected="${this.tab === "guide"}">Guide</button>
        </nav>
        <div class="ll-status-modal-body" data-status-body></div>
      </div>
    `;

    for (const btn of this.el.querySelectorAll("[data-status-close]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    for (const tabBtn of this.el.querySelectorAll("[data-tab]")) {
      tabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (tabBtn as HTMLElement).dataset.tab as StatusTab;
        if (!id || id === this.tab) return;
        this.tab = id;
        Audio.sfx("ui");
        this.rebuild();
      });
    }

    const body = this.el.querySelector("[data-status-body]")!;
    if (this.tab === "status") body.innerHTML = this.renderStatus(mood, cozy);
    else if (this.tab === "tasks") body.innerHTML = this.renderTasks();
    else if (this.tab === "pets") body.innerHTML = this.renderPets();
    else body.innerHTML = this.renderGuide();

    this.syncPortrait();
  }

  private renderStatus(mood: number, cozy: number): string {
    const s = this.state;
    const needsHtml = NEED_IDS.map((id) => {
      const v = Math.round(s.needs[id]);
      return `<div class="ll-status-need"><span>${NEED_LABELS[id]}</span><div class="ll-bar"><i class="${needBarClass(v)}" style="width:${v}%"></i></div><b>${v}</b></div>`;
    }).join("");

    const jobs =
      s.hiredJobs.length === 0
        ? `<p class="ll-status-empty">No jobs yet — ask around town who's hiring.</p>`
        : `<ul class="ll-status-jobs">${s.hiredJobs
            .map((id) => {
              const shifts = s.jobShiftCounts[id] ?? 0;
              const name = jobDisplayName(id, s.isPromoted(id));
              const lot = jobById[id]?.lotId ?? "";
              return `<li><strong>${escapeHtml(name)}</strong><span>${shifts} shift${shifts === 1 ? "" : "s"}${s.isPromoted(id) ? " · promoted" : ""}${lot ? ` · ${lot}` : ""}</span></li>`;
            })
            .join("")}</ul>`;

    return `
      <div class="ll-status-stats">
        <div class="ll-status-stat"><small>Money</small><strong>$${s.money}</strong></div>
        <div class="ll-status-stat"><small>Cozy</small><strong>${cozy}</strong></div>
        <div class="ll-status-stat"><small>Mood</small><strong>${mood}</strong></div>
      </div>
      <h3 class="ll-status-section">Needs</h3>
      <div class="ll-status-needs">${needsHtml}</div>
      <h3 class="ll-status-section">Jobs</h3>
      ${jobs}
    `;
  }

  private renderTasks(): string {
    const s = this.state;
    const questRows: string[] = [];
    for (const id of s.quests.active) {
      const def = questById[id];
      if (!def) continue;
      const counts = s.quests.stepCounts[id] ?? {};
      const step = def.steps.find((st) => (counts[st.id] ?? 0) < (st.count ?? 1));
      if (!step) continue;
      const have = counts[step.id] ?? 0;
      const need = step.count ?? 1;
      const pct = Math.min(100, Math.round((have / need) * 100));
      questRows.push(`
        <div class="ll-status-task">
          <div class="ll-status-task-top">
            <strong>${escapeHtml(def.title)}</strong>
            <span>${have}/${need}</span>
          </div>
          <p>${escapeHtml(step.objectiveLabel)}</p>
          <div class="ll-build-tip-bar"><i style="width:${pct}%"></i></div>
        </div>
      `);
    }

    const unlocks = listUnlockTasks(s);
    const open = unlocks.filter((t) => !t.done);
    const done = unlocks.filter((t) => t.done);

    const unlockHtml = open
      .map((t) => {
        const pct =
          t.target > 0
            ? Math.min(100, Math.round((t.current / t.target) * 100))
            : 0;
        return `
          <div class="ll-status-task">
            <div class="ll-status-task-top">
              <strong>${escapeHtml(t.title)}</strong>
              <span>${escapeHtml(t.label)}</span>
            </div>
            <p>${escapeHtml(t.hint)}</p>
            <div class="ll-build-tip-bar"><i style="width:${pct}%"></i></div>
          </div>
        `;
      })
      .join("");

    const doneHtml =
      done.length === 0
        ? ""
        : `<details class="ll-status-done">
            <summary>Completed unlocks (${done.length})</summary>
            <ul>${done.map((t) => `<li>${escapeHtml(t.title)}</li>`).join("")}</ul>
          </details>`;

    return `
      <h3 class="ll-status-section">Active quests</h3>
      ${
        questRows.length
          ? `<div class="ll-status-task-list">${questRows.join("")}</div>`
          : `<p class="ll-status-empty">No active quests right now.</p>`
      }
      <h3 class="ll-status-section">Furniture unlocks</h3>
      <p class="ll-status-empty">Unlocks make pieces available to buy — they still cost money.</p>
      ${
        open.length
          ? `<div class="ll-status-task-list">${unlockHtml}</div>`
          : `<p class="ll-status-empty">Every furniture unlock is complete!</p>`
      }
      ${doneHtml}
    `;
  }

  private renderPets(): string {
    const s = this.state;
    if (!s.adoptedPet) {
      const setup = s.hasPetSetup();
      return `
        <div class="ll-status-empty-pet">
          <p>No pet yet.</p>
          <p>${
            setup
              ? "Visit the shelter desk when you're ready to adopt."
              : "Place a Pet Bed and Pet Bowl at home, then visit the shelter."
          }</p>
        </div>
      `;
    }

    const pet = s.adoptedPet;
    const def = petById[pet.defId];
    const needsHtml = PET_NEED_IDS.map((id) => {
      const v = Math.round(pet.needs[id]);
      return `<div class="ll-status-need"><span>${PET_NEED_LABELS[id]}</span><div class="ll-bar"><i class="${needBarClass(v)}" style="width:${v}%"></i></div><b>${v}</b></div>`;
    }).join("");

    return `
      <div class="ll-status-pet-head">
        <div>
          <h3>${escapeHtml(s.adoptedPetName)}</h3>
          <p>${escapeHtml(def?.species ?? "pet")}${
            def?.traits?.length ? ` · ${escapeHtml(def.traits.join(" · "))}` : ""
          }</p>
        </div>
        <div class="ll-status-stats">
          <div class="ll-status-stat"><small>Care streak</small><strong>${s.petCareStreak}d</strong></div>
          <div class="ll-status-stat"><small>Tricks</small><strong>${s.aspirations.petTricks}</strong></div>
        </div>
      </div>
      <h3 class="ll-status-section">Pet needs</h3>
      <div class="ll-status-needs">${needsHtml}</div>
    `;
  }

  private renderGuide(): string {
    return `
      <p class="ll-status-guide-lead">Controls and a few tips for getting around town.</p>
      <h3 class="ll-status-section">Getting around</h3>
      <ul class="ll-status-keys">
        <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span>Move</span></li>
        <li><kbd>Click</kbd> <span>Walk or interact</span></li>
        <li><kbd>Pinch</kbd> / <kbd>+</kbd><kbd>−</kbd> <span>Zoom</span></li>
      </ul>
      <h3 class="ll-status-section">Useful keys</h3>
      <ul class="ll-status-keys">
        <li><kbd>E</kbd> <span>Interact with nearby people, pets &amp; objects</span></li>
        <li><kbd>B</kbd> <span>Build &amp; decorate at home</span></li>
        <li><kbd>Tab</kbd> <span>Reopen the build catalog</span></li>
        <li><kbd>R</kbd> <span>Rotate furniture in build mode</span></li>
        <li><kbd>Q</kbd> <span>Save your game</span></li>
        <li><kbd>Esc</kbd> <span>Close menus / pause to title</span></li>
      </ul>
      <h3 class="ll-status-section">Tips</h3>
      <ul class="ll-status-tips">
        <li>Keep an eye on needs — hungry, sleepy neighbours aren't at their best.</li>
        <li>Take a job in town, then spend your earnings on furniture and pets.</li>
        <li>Locked catalog pieces unlock for purchase — everything still has a price.</li>
        <li>When the day winds down, head home and sleep to start fresh.</li>
      </ul>
    `;
  }

  private syncPortrait() {
    const canvas = this.el.querySelector(
      ".ll-status-face",
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const look = this.state.playerLook;
    const key = `${look.sex}|${look.face}|${look.hairStyle}|${look.hair}|${look.skin}|${look.shirt}|${look.clothing}`;
    if (key === this.lastPortraitKey && canvas.dataset.drawn === "1") return;
    this.lastPortraitKey = key;
    canvas.dataset.drawn = "1";
    drawPortrait(canvas, "player", look);
  }

  destroy() {
    this.el.remove();
  }
}
