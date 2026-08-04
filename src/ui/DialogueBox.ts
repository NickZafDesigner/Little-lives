import type { PlayerLook } from "../data/character";
import { Audio } from "../audio/AudioManager";
import { drawPortrait, type PortraitId } from "./portraits";

export interface DialogueLine {
  speakerId: PortraitId;
  speakerName: string;
  text: string;
}

export interface DialogueChoice {
  id: string;
  label: string;
  sub?: string;
  /** Utility / tip choices show this face so they stand apart from idle chat. */
  portrait?: PortraitId;
}

/**
 * Bottom dialogue: pixel portrait + typewriter text + per-speaker voice blips.
 * Supports branching reply choices for two-way conversations.
 */
export class DialogueBox {
  private wrap: HTMLElement;
  private root: HTMLElement;
  private portrait: HTMLCanvasElement;
  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private continueEl: HTMLElement;
  private choicesEl: HTMLElement;
  private visible = false;
  private fullText = "";
  private shown = 0;
  private typing = false;
  private charAcc = 0;
  private readonly cps = 42;
  /** Play a voice blip every N non-space characters while typing. */
  private voiceEvery = 3;
  private charsSinceVoice = 0;
  private speakerId: PortraitId = "player";
  private look: PlayerLook | undefined;
  private queue: DialogueLine[] = [];
  private active = false;
  /** Ignore advances until this time - stops the opening click from dismissing. */
  private ignoreUntil = 0;
  private onKey: ((e: KeyboardEvent) => void) | null = null;
  private exiting = false;
  private exitTimer: number | null = null;
  private readonly exitMs = 320;
  private pendingChoices: DialogueChoice[] | null = null;
  private onChoice: ((id: string) => void) | null = null;
  private onClosed: (() => void) | null = null;
  private choiceFocus = 0;

  constructor(parent: HTMLElement) {
    this.wrap = document.createElement("div");
    this.wrap.className = "ll-dialogue-wrap";
    this.wrap.hidden = true;

    this.root = document.createElement("div");
    this.root.className = "ll-dialogue";
    this.root.setAttribute("role", "dialog");

    this.portrait = document.createElement("canvas");
    this.portrait.className = "ll-dialogue-face";
    this.portrait.width = 32;
    this.portrait.height = 32;

    const body = document.createElement("div");
    body.className = "ll-dialogue-body";

    this.nameEl = document.createElement("div");
    this.nameEl.className = "ll-dialogue-name";

    this.textEl = document.createElement("div");
    this.textEl.className = "ll-dialogue-text";

    this.continueEl = document.createElement("div");
    this.continueEl.className = "ll-dialogue-continue";
    this.continueEl.textContent = "Click anywhere · Space";
    this.continueEl.hidden = true;

    this.choicesEl = document.createElement("div");
    this.choicesEl.className = "ll-dialogue-choices";
    this.choicesEl.hidden = true;

    body.append(this.nameEl, this.textEl, this.continueEl, this.choicesEl);
    this.root.append(this.portrait, body);
    this.wrap.appendChild(this.root);
    parent.appendChild(this.wrap);

    // Backdrop + panel share one dismiss path (ignored while choices show)
    this.wrap.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.advance();
    });
  }

  setPlayerLook(look: PlayerLook) {
    this.look = look;
  }

  /** Fires once when the box fully closes (after exit anim). */
  setOnClosed(cb: (() => void) | null) {
    this.onClosed = cb;
  }

  /** True while the box is up or still playing its exit - keeps camera focus stable. */
  isOpen(): boolean {
    return this.visible || this.exiting;
  }

  hasChoices(): boolean {
    return !!this.pendingChoices && this.pendingChoices.length > 0;
  }

  /** True only while reply buttons are on screen (not merely queued after lines). */
  private choicesVisible(): boolean {
    return this.hasChoices() && !this.choicesEl.hidden;
  }

  say(line: DialogueLine | DialogueLine[]) {
    const lines = (Array.isArray(line) ? line : [line]).filter(
      (l) => l.text.trim().length > 0,
    );
    if (lines.length === 0) return;
    this.cancelExit();
    const wasEmpty = this.queue.length === 0;
    this.queue.push(...lines);
    // After a choice pick, active stays true - still need to drain the reply.
    if (!this.typing && (!this.active || wasEmpty)) this.playNext();
  }

  sayNow(line: DialogueLine) {
    this.cancelExit();
    this.clearChoices();
    this.queue = [];
    this.active = false;
    this.say(line);
  }

  /**
   * After current typed lines finish, show reply buttons instead of closing.
   * Clicking the backdrop does nothing while choices are up.
   */
  offerChoices(choices: DialogueChoice[], onPick: (id: string) => void) {
    this.pendingChoices = choices;
    this.onChoice = onPick;
    if (
      this.visible &&
      !this.typing &&
      this.queue.length === 0 &&
      !this.exiting
    ) {
      this.showChoiceUI();
    }
  }

  clearChoices() {
    this.pendingChoices = null;
    this.onChoice = null;
    this.choiceFocus = 0;
    this.choicesEl.hidden = true;
    this.choicesEl.innerHTML = "";
    this.root.classList.remove("has-choices");
  }

  update(dt: number) {
    if (!this.typing || !this.visible || this.exiting) return;
    this.charAcc += dt * this.cps;
    while (this.charAcc >= 1 && this.shown < this.fullText.length) {
      this.charAcc -= 1;
      this.shown += 1;
      const ch = this.fullText[this.shown - 1];
      this.textEl.textContent = this.fullText.slice(0, this.shown);
      if (ch && !/\s/.test(ch)) {
        this.charsSinceVoice += 1;
        if (this.charsSinceVoice >= this.voiceEvery) {
          this.charsSinceVoice = 0;
          Audio.voice(this.speakerId);
        }
      }
      if (ch === "." || ch === "!" || ch === "?" || ch === ",") {
        this.charAcc -= 0.3;
      }
    }
    if (this.shown >= this.fullText.length) this.finishTyping();
  }

  advance() {
    if (!this.visible || this.exiting) return;
    // Nested chats call offerChoices while reply lines still play. Block only
    // when buttons are actually showing - otherwise Space/click can never drain
    // the queue (Pickle "Truce?" softlock).
    if (this.choicesVisible()) return;

    if (this.typing) {
      // Ignore the opening click that started this line.
      if (performance.now() < this.ignoreUntil) return;
      this.shown = this.fullText.length;
      this.textEl.textContent = this.fullText;
      this.finishTyping();
      return;
    }

    // Line fully shown - always allow next/dismiss (do not apply the
    // open-line ignore window; short lines finish typing before it ends).
    this.playNext();
  }

  close() {
    this.unbindKeys();
    this.queue = [];
    this.active = false;
    this.typing = false;
    this.visible = false;
    this.ignoreUntil = 0;
    this.clearChoices();

    // Already gone
    if (this.wrap.hidden) {
      this.finishHide();
      return;
    }

    // Fade out, then fully hide
    this.exiting = true;
    this.wrap.classList.add("is-exiting");
    this.wrap.style.pointerEvents = "none";
    this.root.classList.remove("is-enter", "is-done", "has-choices");
    this.root.classList.add("is-exit");

    if (this.exitTimer !== null) window.clearTimeout(this.exitTimer);
    this.exitTimer = window.setTimeout(() => {
      this.exitTimer = null;
      this.finishHide();
    }, this.exitMs);
  }

  destroy() {
    this.cancelExit();
    this.finishHide();
    this.unbindKeys();
    this.wrap.remove();
  }

  private finishHide() {
    this.exiting = false;
    this.wrap.hidden = true;
    this.wrap.setAttribute("hidden", "");
    this.wrap.classList.remove("is-exiting");
    this.wrap.style.pointerEvents = "";
    this.root.classList.remove("is-done", "is-enter", "is-exit", "has-choices");
    this.textEl.textContent = "";
    this.nameEl.textContent = "";
    this.continueEl.hidden = true;
    this.clearChoices();
    const cb = this.onClosed;
    if (cb) cb();
  }

  private cancelExit() {
    if (this.exitTimer !== null) {
      window.clearTimeout(this.exitTimer);
      this.exitTimer = null;
    }
    this.exiting = false;
    this.wrap.classList.remove("is-exiting");
    this.wrap.style.pointerEvents = "";
    this.root.classList.remove("is-exit");
  }

  private finishTyping() {
    this.typing = false;
    if (this.queue.length === 0 && this.pendingChoices?.length) {
      this.showChoiceUI();
      return;
    }
    this.continueEl.hidden = false;
    this.root.classList.add("is-done");
  }

  private showChoiceUI() {
    if (!this.pendingChoices?.length) return;
    this.continueEl.hidden = true;
    this.root.classList.add("is-done", "has-choices");
    this.choicesEl.hidden = false;
    this.choicesEl.innerHTML = "";
    this.choiceFocus = 0;

    const special = this.pendingChoices.filter((c) => Boolean(c.portrait));
    const rest = this.pendingChoices.filter((c) => !c.portrait);
    const ordered = [...special, ...rest];

    ordered.forEach((choice, i) => {
      if (special.length && rest.length && i === special.length) {
        const rule = document.createElement("div");
        rule.className = "ll-dialogue-choice-divider";
        rule.setAttribute("role", "separator");
        this.choicesEl.appendChild(rule);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ll-dialogue-choice";
      if (choice.portrait) btn.classList.add("has-face");
      btn.dataset.choiceId = choice.id;
      const copy = choice.sub
        ? `<span class="ll-dialogue-choice-label">${escapeHtml(choice.label)}</span><span class="ll-dialogue-choice-sub">${escapeHtml(choice.sub)}</span>`
        : `<span class="ll-dialogue-choice-label">${escapeHtml(choice.label)}</span>`;
      btn.innerHTML = choice.portrait
        ? `<canvas class="ll-dialogue-choice-face" width="32" height="32" aria-hidden="true"></canvas><span class="ll-dialogue-choice-copy">${copy}</span>`
        : copy;
      if (choice.portrait) {
        const face = btn.querySelector(
          ".ll-dialogue-choice-face",
        ) as HTMLCanvasElement;
        drawPortrait(face, choice.portrait);
      }
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.pickChoice(choice.id);
      });
      btn.addEventListener("pointerenter", () => {
        const buttons = this.choiceButtons();
        const idx = buttons.indexOf(btn);
        if (idx >= 0) {
          this.choiceFocus = idx;
          this.syncChoiceFocus(false);
        }
      });
      this.choicesEl.appendChild(btn);
    });
    this.syncChoiceFocus(false);
  }

  private choiceButtons(): HTMLButtonElement[] {
    return Array.from(
      this.choicesEl.querySelectorAll<HTMLButtonElement>(".ll-dialogue-choice"),
    );
  }

  private syncChoiceFocus(playTick: boolean) {
    const buttons = this.choiceButtons();
    buttons.forEach((btn, i) => {
      const on = i === this.choiceFocus;
      btn.classList.toggle("is-focused", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
    const focused = buttons[this.choiceFocus];
    if (focused) {
      focused.scrollIntoView({ block: "nearest" });
      if (playTick) Audio.sfx("hover");
    }
  }

  private moveChoiceFocus(delta: number) {
    const buttons = this.choiceButtons();
    if (!buttons.length) return;
    this.choiceFocus =
      (this.choiceFocus + delta + buttons.length) % buttons.length;
    this.syncChoiceFocus(true);
  }

  private pickChoice(id: string) {
    const pick = this.onChoice;
    this.clearChoices();
    Audio.sfx("ui");
    pick?.(id);
  }

  private activateFocusedChoice() {
    const buttons = this.choiceButtons();
    const btn = buttons[this.choiceFocus];
    const id = btn?.dataset.choiceId;
    if (!id) {
      Audio.sfx("deny");
      return;
    }
    this.pickChoice(id);
  }

  private playNext() {
    const next = this.queue.shift();
    if (!next) {
      if (this.pendingChoices?.length) {
        this.showChoiceUI();
        return;
      }
      this.close();
      return;
    }

    this.cancelExit();
    this.choicesEl.hidden = true;
    this.root.classList.remove("has-choices");
    const firstOpen = !this.visible;
    this.active = true;
    this.visible = true;
    this.wrap.hidden = false;
    this.wrap.removeAttribute("hidden");
    this.root.classList.remove("is-done", "is-exit");
    // Enter anim only when the box first appears - not between sentences.
    if (firstOpen) {
      this.root.classList.remove("is-enter");
      void this.root.offsetWidth;
      this.root.classList.add("is-enter");
    }

    this.speakerId = next.speakerId;
    this.nameEl.textContent = next.speakerName;
    this.fullText = next.text;
    this.shown = 0;
    this.charAcc = 0;
    this.charsSinceVoice = 0;
    this.typing = true;
    this.textEl.textContent = "";
    this.continueEl.hidden = true;
    this.ignoreUntil = performance.now() + 280;
    this.refreshPortrait();
    this.bindKeys();
    Audio.voice(this.speakerId);
  }

  private bindKeys() {
    if (this.onKey) return;
    this.onKey = (e: KeyboardEvent) => {
      if (!this.visible) return;
      if (this.choicesVisible()) {
        // Number keys 1-4 pick choices
        const idx = Number(e.key) - 1;
        if (
          idx >= 0 &&
          this.pendingChoices &&
          idx < this.pendingChoices.length
        ) {
          e.preventDefault();
          e.stopPropagation();
          const choice = this.pendingChoices[idx]!;
          this.pickChoice(choice.id);
          return;
        }
        if (
          e.code === "Tab" ||
          e.code === "ArrowDown" ||
          e.code === "ArrowRight" ||
          e.code === "ArrowUp" ||
          e.code === "ArrowLeft" ||
          e.code === "Enter" ||
          e.code === "NumpadEnter" ||
          e.code === "Space" ||
          e.code === "Escape"
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.code === "Escape") {
          this.close();
          return;
        }
        if (e.code === "Tab") {
          this.moveChoiceFocus(e.shiftKey ? -1 : 1);
          return;
        }
        if (e.code === "ArrowDown" || e.code === "ArrowRight") {
          this.moveChoiceFocus(1);
          return;
        }
        if (e.code === "ArrowUp" || e.code === "ArrowLeft") {
          this.moveChoiceFocus(-1);
          return;
        }
        if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space") {
          this.activateFocusedChoice();
        }
        return;
      }
      if (
        e.code === "Space" ||
        e.code === "Enter" ||
        e.code === "KeyE" ||
        e.code === "Escape"
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === "Escape") this.close();
        else this.advance();
      }
    };
    window.addEventListener("keydown", this.onKey, true);
  }

  private unbindKeys() {
    if (!this.onKey) return;
    window.removeEventListener("keydown", this.onKey, true);
    this.onKey = null;
  }

  private refreshPortrait() {
    drawPortrait(
      this.portrait,
      this.speakerId,
      this.speakerId === "player" ? this.look : undefined,
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
