import type { PlayerLook } from "../data/character";
import { Audio } from "../audio/AudioManager";
import { drawPortrait, type PortraitId } from "./portraits";

export interface MenuOption {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
}

export type MenuPortrait = {
  id: PortraitId;
  look?: PlayerLook;
};

const SOCIAL_IDS = new Set(["joke", "gift", "gift_bag", "hangout"]);
const OPTION_SELECTOR =
  ".ll-menu-row:not(:disabled), .ll-menu-chip:not(:disabled)";

function isTone(id: string): boolean {
  return id.startsWith("tone_");
}

function isSocial(id: string): boolean {
  return SOCIAL_IDS.has(id) || id.startsWith("exclusive_");
}

function toneChipLabel(label: string): string {
  return label
    .replace(/^Be\s+/i, "")
    .replace(/\s+chat$/i, "")
    .replace(/^Flirt a little$/i, "Flirt")
    .replace(/^Friendly$/i, "Friendly")
    .replace(/^polite$/i, "Polite");
}

export class InteractionMenu {
  private el: HTMLElement;
  private onPick: ((id: string) => void) | null = null;
  private onDismiss: (() => void) | null = null;
  private playerLook: PlayerLook | undefined;
  private options: MenuOption[] = [];
  private focusIndex = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "ll-menu";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    parent.appendChild(this.el);
  }

  setPlayerLook(look: PlayerLook) {
    this.playerLook = look;
  }

  /** Called when the panel closes without picking an option (backdrop / cancel). */
  setOnDismiss(cb: (() => void) | null) {
    this.onDismiss = cb;
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  /** Whole overlay blocks the world while open. */
  containsPoint(_clientX: number, _clientY: number): boolean {
    void _clientX;
    void _clientY;
    return !this.el.hidden;
  }

  show(
    title: string,
    subtitle: string,
    options: MenuOption[],
    _x: number,
    _y: number,
    onPick: (id: string) => void,
    portrait?: MenuPortrait,
  ) {
    void _x;
    void _y;
    this.onPick = onPick;
    this.options = options;
    this.el.hidden = false;
    Audio.sfx("menu");

    const face = portrait ?? { id: "player" as PortraitId, look: this.playerLook };
    const primary = options.filter((o) => !isTone(o.id) && !isSocial(o.id));
    const tones = options.filter((o) => isTone(o.id));
    const social = options.filter((o) => isSocial(o.id));

    this.el.innerHTML = `
      <div class="ll-menu-scrim" data-act="dismiss"></div>
      <div class="ll-menu-card" role="menu" aria-label="${escapeHtml(title)}">
        <header class="ll-menu-head">
          <canvas class="ll-menu-face" width="64" height="64" aria-hidden="true"></canvas>
          <div class="ll-menu-meta">
            <h3 class="ll-menu-title">${escapeHtml(title)}</h3>
            <p class="ll-menu-sub">${escapeHtml(subtitle)}</p>
          </div>
          <button type="button" class="ll-menu-cancel" data-act="dismiss" aria-label="Close">✕</button>
        </header>
        <div class="ll-menu-body"></div>
      </div>
    `;

    const canvas = this.el.querySelector(".ll-menu-face") as HTMLCanvasElement;
    drawPortrait(canvas, face.id, face.look ?? this.playerLook);

    const body = this.el.querySelector(".ll-menu-body")!;
    let delay = 0;

    if (primary.length) {
      body.appendChild(this.buildList(primary, delay));
      delay += primary.length;
    }

    if (tones.length) {
      const section = document.createElement("section");
      section.className = "ll-menu-section";
      section.innerHTML = `<h4 class="ll-menu-section-label">Tone</h4>`;
      const chips = document.createElement("div");
      chips.className = "ll-menu-chips";
      tones.forEach((opt, i) => {
        chips.appendChild(this.buildChip(opt, delay + i));
      });
      section.appendChild(chips);
      body.appendChild(section);
      delay += tones.length;
    }

    if (social.length) {
      const section = document.createElement("section");
      section.className = "ll-menu-section";
      section.innerHTML = `<h4 class="ll-menu-section-label">Social</h4>`;
      section.appendChild(this.buildList(social, delay));
      body.appendChild(section);
    }

    this.el.querySelectorAll("[data-act='dismiss']").forEach((node) => {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        Audio.sfx("ui");
        this.close(false);
      });
    });

    this.focusIndex = this.firstEnabledIndex();
    this.syncFocus(false);
    this.bindKeys();
  }

  private buildList(options: MenuOption[], delayStart: number): HTMLElement {
    const list = document.createElement("div");
    list.className = "ll-menu-list";
    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ll-menu-row";
      btn.disabled = Boolean(opt.disabled);
      btn.dataset.optId = opt.id;
      btn.style.setProperty("--ll-i", String(delayStart + i));
      btn.setAttribute("role", "menuitem");
      btn.innerHTML = `
        <span class="ll-menu-row-label">${escapeHtml(opt.label)}</span>
        ${opt.sub ? `<span class="ll-menu-row-sub">${escapeHtml(opt.sub)}</span>` : ""}
      `;
      btn.addEventListener("click", (e) => this.handlePick(e, opt));
      btn.addEventListener("pointerenter", () => {
        if (opt.disabled) return;
        const idx = this.enabledButtons().indexOf(btn);
        if (idx >= 0) {
          this.focusIndex = idx;
          this.syncFocus(false);
        }
      });
      list.appendChild(btn);
    });
    return list;
  }

  private buildChip(opt: MenuOption, delayIndex: number): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ll-menu-chip";
    btn.disabled = Boolean(opt.disabled);
    btn.dataset.optId = opt.id;
    btn.style.setProperty("--ll-i", String(delayIndex));
    btn.title = opt.sub ? `${opt.label} - ${opt.sub}` : opt.label;
    btn.setAttribute("role", "menuitem");
    btn.textContent = toneChipLabel(opt.label);
    btn.addEventListener("click", (e) => this.handlePick(e, opt));
    btn.addEventListener("pointerenter", () => {
      if (opt.disabled) return;
      const idx = this.enabledButtons().indexOf(btn);
      if (idx >= 0) {
        this.focusIndex = idx;
        this.syncFocus(false);
      }
    });
    return btn;
  }

  private enabledButtons(): HTMLButtonElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLButtonElement>(OPTION_SELECTOR),
    );
  }

  private firstEnabledIndex(): number {
    return this.enabledButtons().length > 0 ? 0 : -1;
  }

  private syncFocus(playTick: boolean) {
    const buttons = this.enabledButtons();
    buttons.forEach((btn, i) => {
      const on = i === this.focusIndex;
      btn.classList.toggle("is-focused", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
    const focused = buttons[this.focusIndex];
    if (focused) {
      focused.scrollIntoView({ block: "nearest" });
      if (playTick) Audio.sfx("hover");
    }
  }

  private moveFocus(delta: number) {
    const buttons = this.enabledButtons();
    if (!buttons.length) return;
    if (this.focusIndex < 0) this.focusIndex = 0;
    else {
      this.focusIndex =
        (this.focusIndex + delta + buttons.length) % buttons.length;
    }
    this.syncFocus(true);
  }

  private activateFocused() {
    const buttons = this.enabledButtons();
    const btn = buttons[this.focusIndex];
    if (!btn) {
      Audio.sfx("deny");
      return;
    }
    const id = btn.dataset.optId;
    const opt = this.options.find((o) => o.id === id);
    if (!opt || opt.disabled) {
      Audio.sfx("deny");
      return;
    }
    const pick = this.onPick;
    this.close(true);
    pick?.(opt.id);
  }

  private bindKeys() {
    this.unbindKeys();
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.el.hidden) return;
      const code = e.code;
      if (
        code === "Tab" ||
        code === "ArrowDown" ||
        code === "ArrowRight" ||
        code === "ArrowUp" ||
        code === "ArrowLeft" ||
        code === "Enter" ||
        code === "NumpadEnter" ||
        code === "Space" ||
        code === "Escape"
      ) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (code === "Escape") {
        Audio.sfx("ui");
        this.close(false);
        return;
      }
      if (code === "Tab") {
        this.moveFocus(e.shiftKey ? -1 : 1);
        return;
      }
      if (code === "ArrowDown" || code === "ArrowRight") {
        this.moveFocus(1);
        return;
      }
      if (code === "ArrowUp" || code === "ArrowLeft") {
        this.moveFocus(-1);
        return;
      }
      if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
        this.activateFocused();
      }
    };
    window.addEventListener("keydown", this.keyHandler, true);
  }

  private unbindKeys() {
    if (!this.keyHandler) return;
    window.removeEventListener("keydown", this.keyHandler, true);
    this.keyHandler = null;
  }

  private handlePick(e: Event, opt: MenuOption) {
    e.stopPropagation();
    if (opt.disabled) {
      Audio.sfx("deny");
      return;
    }
    const pick = this.onPick;
    this.close(true);
    pick?.(opt.id);
  }

  close(fromPick = false) {
    if (this.el.hidden) return;
    this.unbindKeys();
    this.el.hidden = true;
    this.el.innerHTML = "";
    this.onPick = null;
    this.options = [];
    this.focusIndex = -1;
    if (!fromPick) this.onDismiss?.();
  }

  destroy() {
    this.unbindKeys();
    this.el.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
