import type { GameState } from "../systems/GameState";
import {
  NEED_CRITICAL,
  NEED_IDS,
  NEED_LABELS,
  NEED_LOW,
  applyNeedDeltas,
  moodFromNeeds,
} from "../data/needs";
import type { PetNeedId } from "../data/types";
import { computeCozyScore } from "../systems/cozyScore";
import { jobDisplayName, jobById } from "../data/jobs";
import { questById } from "../data/quests";
import { petById } from "../data/pets";
import {
  furnitureForUnlockTask,
  listUnlockTasks,
} from "../systems/unlockProgress";
import { paintFurnitureThumb, paintInventoryThumb } from "./FurniturePreview";
import { Audio } from "../audio/AudioManager";
import { closeButtonHtml } from "./closeIcon";
import { drawPortrait } from "./portraits";
import { renderInventoryBody } from "./InventoryModal";
import {
  isConsumableMaterial,
  materialById,
  materialHungerRelief,
  type MaterialId,
} from "../data/items";
import type { CraftedId } from "../data/crafting";
import { TownBoardSystem } from "../systems/TownBoardSystem";
import { hasTrait } from "../systems/traits";
import { AMBIENT_NPCS } from "../data/ambientNpcs";
import { NPCS, RELATIONSHIP_MAX } from "../data/npcs";
import { tierFromScore, tierLabel } from "../systems/relationshipTiers";
import type { InventoryThumbId } from "../mesh/inventoryItems";
import { MenuKeyboardNav } from "./menuKeyboard";

type StatusTab = "status" | "bag" | "friends" | "jobs" | "tasks" | "pets" | "guide";

const STATUS_OPTION_SELECTOR =
  ".ll-status-tab, .ll-inv-eat";

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
  private highlightQuestId: string | null = null;
  private highlightUntil = 0;
  private highlightScrollPending = false;
  private keys = new MenuKeyboardNav({
    isOpen: () => this.visible,
    getButtons: () =>
      Array.from(
        this.el.querySelectorAll<HTMLButtonElement>(STATUS_OPTION_SELECTOR),
      ),
    onEscape: () => this.close(),
  });

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

  isBagOpen(): boolean {
    return this.visible && this.tab === "bag";
  }

  currentTab(): StatusTab {
    return this.tab;
  }

  containsPoint(_clientX: number, _clientY: number): boolean {
    void _clientX;
    void _clientY;
    return this.visible;
  }

  open(
    tab: StatusTab = "status",
    opts?: { highlightQuestId?: string },
  ) {
    this.tab = tab;
    this.visible = true;
    this.el.hidden = false;
    if (opts?.highlightQuestId) {
      this.highlightQuestId = opts.highlightQuestId;
      this.highlightUntil = performance.now() + 2800;
      this.highlightScrollPending = true;
    }
    this.rebuild();
    this.keys.bind();
    Audio.sfx("ui");
  }

  close() {
    if (!this.visible) return;
    this.keys.unbind();
    this.visible = false;
    this.el.hidden = true;
    this.clearHighlight();
    Audio.sfx("ui");
  }

  toggle() {
    if (this.visible) this.close();
    else this.open(this.tab);
  }

  private clearHighlight() {
    this.highlightQuestId = null;
    this.highlightUntil = 0;
    this.highlightScrollPending = false;
  }

  private activeHighlightId(): string | null {
    if (!this.highlightQuestId) return null;
    if (performance.now() > this.highlightUntil) {
      this.clearHighlight();
      return null;
    }
    return this.highlightQuestId;
  }

  /** Refresh live values while open (called from Hud.update). */
  refresh() {
    if (!this.visible) return;
    this.rebuild();
  }

  private rebuild(prefer?: (btn: HTMLButtonElement) => boolean) {
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
          ${closeButtonHtml({ attrs: "data-status-close" })}
        </header>
        <nav class="ll-status-tabs" role="tablist">
          <button type="button" class="ll-status-tab${this.tab === "status" ? " is-active" : ""}" data-tab="status" role="tab" aria-selected="${this.tab === "status"}">Status</button>
          <button type="button" class="ll-status-tab${this.tab === "bag" ? " is-active" : ""}" data-tab="bag" role="tab" aria-selected="${this.tab === "bag"}">Bag</button>
          <button type="button" class="ll-status-tab${this.tab === "friends" ? " is-active" : ""}" data-tab="friends" role="tab" aria-selected="${this.tab === "friends"}">Friends</button>
          <button type="button" class="ll-status-tab${this.tab === "jobs" ? " is-active" : ""}" data-tab="jobs" role="tab" aria-selected="${this.tab === "jobs"}">Jobs</button>
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

    for (const tabBtn of this.el.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
      tabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = tabBtn.dataset.tab as StatusTab;
        if (!id || id === this.tab) return;
        this.tab = id;
        if (id !== "tasks") this.clearHighlight();
        Audio.sfx("ui");
        this.rebuild((btn) => btn.dataset.tab === id);
      });
      this.keys.attachHover(tabBtn);
    }

    const body = this.el.querySelector("[data-status-body]")!;
    if (this.tab === "status") body.innerHTML = this.renderStatus(mood, cozy);
    else if (this.tab === "bag") body.innerHTML = renderInventoryBody(s);
    else if (this.tab === "friends") body.innerHTML = this.renderFriends();
    else if (this.tab === "jobs") body.innerHTML = this.renderJobs();
    else if (this.tab === "tasks") body.innerHTML = this.renderTasks();
    else if (this.tab === "pets") body.innerHTML = this.renderPets();
    else body.innerHTML = this.renderGuide();

    if (this.tab === "bag") {
      this.mountInventoryThumbs(body);
      this.bindBagActions(body);
    }
    if (this.tab === "friends") this.mountFriendFaces(body);
    if (this.tab === "tasks") {
      this.mountUnlockThumbs(body);
      this.scrollHighlightIntoView(body);
    }
    this.syncPortrait();
    this.keys.reset(prefer, (btn) => btn.dataset.tab === this.tab);
  }

  private mountFriendFaces(root: ParentNode) {
    for (const canvas of root.querySelectorAll<HTMLCanvasElement>(
      "[data-friend-face]",
    )) {
      const id = canvas.dataset.friendFace;
      if (!id) continue;
      drawPortrait(canvas, id);
    }
  }

  private scrollHighlightIntoView(root: ParentNode) {
    if (!this.highlightScrollPending) return;
    const id = this.activeHighlightId();
    this.highlightScrollPending = false;
    if (!id) return;
    const row = root.querySelector(
      `[data-quest-id="${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    if (!row) return;
    requestAnimationFrame(() => {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  private mountUnlockThumbs(root: ParentNode) {
    for (const host of root.querySelectorAll<HTMLElement>("[data-unlock-thumb]")) {
      const defId = host.dataset.unlockThumb;
      if (!defId) continue;
      const canvas = document.createElement("canvas");
      canvas.className = "ll-status-unlock-canvas";
      canvas.setAttribute("aria-hidden", "true");
      host.replaceChildren(canvas);
      if (!paintFurnitureThumb(canvas, defId, 52)) {
        host.classList.add("is-fallback");
        host.textContent = "";
      }
    }
  }

  private mountInventoryThumbs(root: ParentNode) {
    for (const host of root.querySelectorAll<HTMLElement>("[data-inv-thumb]")) {
      const id = host.dataset.invThumb as InventoryThumbId | undefined;
      if (!id) continue;
      const canvas = document.createElement("canvas");
      canvas.className = "ll-inv-thumb-canvas";
      canvas.setAttribute("aria-hidden", "true");
      host.replaceChildren(canvas);
      if (!paintInventoryThumb(canvas, id, 44)) {
        host.classList.add("is-fallback");
        host.replaceChildren();
      }
    }
  }

  private bindBagActions(root: ParentNode) {
    for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-eat-mat]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.eatMat as MaterialId;
        this.eatFromBag(id);
      });
      this.keys.attachHover(btn);
    }
    for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-use-craft]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.useCraft as CraftedId;
        this.useCraftFromBag(id);
      });
      this.keys.attachHover(btn);
    }
  }

  private eatFromBag(id: MaterialId) {
    if (!isConsumableMaterial(id)) return;
    if (!this.state.removeMaterial(id, 1)) {
      Audio.sfx("deny");
      return;
    }
    let hunger = materialHungerRelief(id);
    let toastExtra = "";
    if (hasTrait(this.state.playerTraits, "Foodie")) {
      hunger += 8;
      toastExtra = ` Foodie bonus!`;
    }
    this.state.needs = applyNeedDeltas(this.state.needs, { hunger });
    const mat = materialById[id];
    Audio.sfx("success");
    this.state.showToast(
      `Ate ${mat?.name ?? id} · +${hunger} Hunger.${toastExtra}`,
      2400,
    );
    this.rebuild((btn) => btn.dataset.eatMat === id);
  }

  private useCraftFromBag(id: CraftedId) {
    const board = new TownBoardSystem(this.state);
    if (!board.usePetToy(id)) {
      Audio.sfx("deny");
      return;
    }
    Audio.sfx("success");
    this.state.showToast("Playtime! Your pet loved the handmade toy.", 2600);
    this.rebuild((btn) => btn.dataset.useCraft === id);
  }

  private renderStatus(mood: number, cozy: number): string {
    const s = this.state;
    const needsHtml = NEED_IDS.map((id) => {
      const v = Math.round(s.needs[id]);
      return `<div class="ll-status-need"><span>${NEED_LABELS[id]}</span><div class="ll-bar"><i class="${needBarClass(v)}" style="width:${v}%"></i></div><b>${v}</b></div>`;
    }).join("");

    return `
      <div class="ll-status-stats">
        <div class="ll-status-stat"><small>Money</small><strong>$${s.money}</strong></div>
        <div class="ll-status-stat"><small>Cozy</small><strong>${cozy}</strong></div>
        <div class="ll-status-stat"><small>Mood</small><strong>${mood}</strong></div>
      </div>
      <h3 class="ll-status-section">Needs</h3>
      <div class="ll-status-needs">${needsHtml}</div>
    `;
  }

  private renderJobs(): string {
    const s = this.state;
    if (s.hiredJobs.length === 0) {
      return `<p class="ll-status-empty">No jobs yet - ask around town who's hiring.</p>`;
    }
    return `
      <h3 class="ll-status-section">Your jobs</h3>
      <ul class="ll-status-jobs">${s.hiredJobs
        .map((id) => {
          const shifts = s.jobShiftCounts[id] ?? 0;
          const name = jobDisplayName(id, s.isPromoted(id));
          const lot = jobById[id]?.lotId ?? "";
          return `<li><strong>${escapeHtml(name)}</strong><span>${shifts} shift${shifts === 1 ? "" : "s"}${s.isPromoted(id) ? " · promoted" : ""}${lot ? ` · ${lot}` : ""}</span></li>`;
        })
        .join("")}</ul>
    `;
  }

  private renderTasks(): string {
    const s = this.state;
    const highlightId = this.activeHighlightId();
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
      const lit = highlightId === id ? " is-highlight" : "";
      questRows.push(`
        <div class="ll-status-task ll-quest-glow${lit}" data-quest-id="${escapeHtml(id)}">
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

    const unlockHtml = open
      .map((t) => {
        const pieces = furnitureForUnlockTask(t.taskId);
        const primary = pieces[0];
        const names = pieces.map((p) => p.name);
        const title =
          names.length === 0
            ? t.title
            : names.length === 1
              ? names[0]!
              : names.join(" & ");
        const pct =
          t.target > 0
            ? Math.min(100, Math.round((t.current / t.target) * 100))
            : 0;
        const thumbAttr = primary
          ? ` data-unlock-thumb="${escapeHtml(primary.id)}"`
          : "";
        return `
          <div class="ll-status-task ll-status-unlock ll-quest-glow">
            <div class="ll-status-unlock-thumb"${thumbAttr} aria-hidden="true"></div>
            <div class="ll-status-unlock-body">
              <div class="ll-status-task-top">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(t.label)}</span>
              </div>
              <p>${escapeHtml(t.hint)}</p>
              <div class="ll-build-tip-bar"><i style="width:${pct}%"></i></div>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <h3 class="ll-status-section">Active quests</h3>
      ${
        questRows.length
          ? `<div class="ll-status-task-list">${questRows.join("")}</div>`
          : `<p class="ll-status-empty">No active quests right now.</p>`
      }
      <h3 class="ll-status-section">Furniture unlocks</h3>
      ${
        open.length
          ? `<div class="ll-status-task-list">${unlockHtml}</div>`
          : `<p class="ll-status-empty">Every furniture unlock is complete!</p>`
      }
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

  private renderFriends(): string {
    const s = this.state;
    const people: Array<{ id: string; name: string; detail: string }> = [
      ...NPCS.map((npc) => ({
        id: npc.id,
        name: npc.name,
        detail: npc.traits.join(" · "),
      })),
      ...AMBIENT_NPCS.map((npc) => ({
        id: npc.id,
        name: npc.name,
        detail: `${npc.vibe.charAt(0).toUpperCase()}${npc.vibe.slice(1)} · hangabout`,
      })),
    ];

    const ranked = people
      .map((npc) => {
        const rel = s.relationships[npc.id] ?? { score: 0, met: false };
        const score = Math.max(0, Math.min(RELATIONSHIP_MAX, rel.score));
        return { ...npc, rel, score };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.rel.met) - Number(a.rel.met) ||
          a.name.localeCompare(b.name),
      );

    const rows = ranked
      .map((npc) => {
        const tier = tierFromScore(
          npc.rel.score,
          npc.rel.met,
          s.flirtCounts[npc.id] ?? 0,
        );
        const roommate = s.isRoommate(npc.id);
        const pct = Math.round((npc.score / RELATIONSHIP_MAX) * 100);
        return `
        <li class="ll-status-friend${roommate ? " is-roommate" : ""}">
          <canvas class="ll-status-friend-face" data-friend-face="${escapeHtml(npc.id)}" width="32" height="32" aria-hidden="true"></canvas>
          <div class="ll-status-friend-body">
            <div class="ll-status-friend-top">
              <strong>${escapeHtml(npc.name)}</strong>
              <span>${escapeHtml(tierLabel(tier))}${roommate ? " · Roommate" : ""}</span>
            </div>
            <div class="ll-status-friend-bar" aria-hidden="true">
              <i style="width:${pct}%"></i>
            </div>
            <div class="ll-status-friend-meta">
              <span>${npc.score} / ${RELATIONSHIP_MAX}</span>
              <span>${escapeHtml(npc.detail)}</span>
            </div>
          </div>
        </li>`;
      })
      .join("");

    return `
      <p class="ll-status-bag-lead">Gift wildflowers, seashells, and handmade keepsakes — chat and hang out to grow friendships. At ${RELATIONSHIP_MAX}, ask a townsfolk to move in.</p>
      <ul class="ll-status-friends">${rows}</ul>
    `;
  }

  private renderGuide(): string {
    return `
      <p class="ll-status-guide-lead">Controls and a few tips for getting around town.</p>
      <h3 class="ll-status-section">Controls</h3>
      <ul class="ll-status-keys">
        <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> <span>Move</span></li>
        <li><kbd>Space</kbd> <span>Talk, use, or pick up what's nearby</span></li>
        <li><kbd>B</kbd> <span>Build &amp; decorate at home</span></li>
        <li><kbd>R</kbd> <span>Rotate furniture while building</span></li>
        <li><kbd>Esc</kbd> <span>Close menus / exit</span></li>
      </ul>
      <h3 class="ll-status-section">Friends &amp; finds</h3>
      <ul class="ll-status-tips">
        <li>Pick wildflowers around town, scoop seashells by the pier, find mushrooms in Whisperwood, and soft feathers in the park.</li>
        <li>Gift finds from your bag (one gift per person per day), or craft a Shell Charm / Keepsake Jar at Reed's workshop.</li>
        <li>Check the Friends tab to see every relationship score and roommate.</li>
        <li>Deeper chats unlock as friendship grows. At 100, ask someone to move in.</li>
        <li>Roommates wander your house - chat anytime, or send them out to harvest. Collect their haul from the porch.</li>
      </ul>
      <h3 class="ll-status-section">Tips</h3>
      <ul class="ll-status-tips">
        <li>Keep an eye on needs - hungry, sleepy neighbours aren't at their best.</li>
        <li>Eat fish and fruit from the Bag when you're peckish (or raid the fridge).</li>
        <li>Take a job in town, then spend your earnings on furniture and pets.</li>
        <li>Complete tasks to unlock new catalog pieces you can buy for your home.</li>
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
    this.keys.unbind();
    this.el.remove();
  }
}
