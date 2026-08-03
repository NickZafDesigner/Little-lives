import { Audio } from "../audio/AudioManager";

export type MenuKeyboardCallbacks = {
  isOpen: () => boolean;
  getButtons: () => HTMLButtonElement[];
  onEscape?: () => void;
  /** Defaults to `btn.click()`. */
  onActivate?: (btn: HTMLButtonElement) => void;
};

/**
 * Custom focus ring for overlay menus. Native Tab is prevented game-wide in
 * App, so menus must cycle an integer focus index and paint `.is-focused`.
 */
export class MenuKeyboardNav {
  private focusIndex = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private cbs: MenuKeyboardCallbacks;

  constructor(cbs: MenuKeyboardCallbacks) {
    this.cbs = cbs;
  }

  bind() {
    this.unbind();
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.cbs.isOpen()) return;
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
        this.cbs.onEscape?.();
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

  unbind() {
    if (!this.keyHandler) return;
    window.removeEventListener("keydown", this.keyHandler, true);
    this.keyHandler = null;
  }

  /** Call after DOM rebuild. Optionally keep focus on a matching button. */
  reset(
    prefer?: (btn: HTMLButtonElement) => boolean,
    fallback?: (btn: HTMLButtonElement) => boolean,
  ) {
    const buttons = this.cbs.getButtons();
    if (!buttons.length) {
      this.focusIndex = -1;
      return;
    }
    let idx = 0;
    if (prefer) {
      const found = buttons.findIndex(prefer);
      if (found >= 0) idx = found;
      else if (fallback) {
        const fb = buttons.findIndex(fallback);
        if (fb >= 0) idx = fb;
      }
    } else if (fallback) {
      const fb = buttons.findIndex(fallback);
      if (fb >= 0) idx = fb;
    }
    this.focusIndex = idx;
    this.syncFocus(false);
  }

  attachHover(btn: HTMLButtonElement) {
    btn.addEventListener("pointerenter", () => {
      if (btn.disabled) return;
      const idx = this.cbs.getButtons().indexOf(btn);
      if (idx >= 0) {
        this.focusIndex = idx;
        this.syncFocus(false);
      }
    });
  }

  focusedButton(): HTMLButtonElement | null {
    const buttons = this.cbs.getButtons();
    return buttons[this.focusIndex] ?? null;
  }

  private syncFocus(playTick: boolean) {
    const buttons = this.cbs.getButtons();
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
    const buttons = this.cbs.getButtons();
    if (!buttons.length) return;
    if (this.focusIndex < 0) this.focusIndex = 0;
    else {
      this.focusIndex =
        (this.focusIndex + delta + buttons.length) % buttons.length;
    }
    this.syncFocus(true);
  }

  private activateFocused() {
    const buttons = this.cbs.getButtons();
    const btn = buttons[this.focusIndex];
    if (!btn || btn.disabled) {
      Audio.sfx("deny");
      return;
    }
    if (this.cbs.onActivate) this.cbs.onActivate(btn);
    else btn.click();
  }
}
