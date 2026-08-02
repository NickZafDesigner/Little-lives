import { Audio } from "../audio/AudioManager";

/** Buttons, chips, tabs, and other clickable chrome that should tick on hover. */
const HOVER_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  '[role="button"]:not([aria-disabled="true"])',
  ".ll-seg-btn",
  ".ll-swatch-btn",
  ".ll-chip",
  ".ll-outfit",
  ".ll-build-item:not(.is-locked)",
  ".ll-menu-row:not(:disabled)",
  ".ll-menu-chip:not(:disabled)",
  ".ll-dialogue-choice",
  ".ll-stat",
  ".ll-build-tool",
  ".ll-build-cat",
  ".ll-status-tab",
  ".ll-howto-link",
  ".ll-avatar-btn",
  ".ll-objective",
  ".ll-dice",
  ".ll-build-start",
  ".ll-cycle button",
  "summary",
].join(",");

let installed = false;
let lastEl: Element | null = null;
let lastAt = 0;

function hoverTarget(el: EventTarget | null): Element | null {
  if (!(el instanceof Element)) return null;
  const hit = el.closest(HOVER_SELECTOR);
  if (!hit) return null;
  if (hit instanceof HTMLButtonElement && hit.disabled) return null;
  if (hit.getAttribute("aria-disabled") === "true") return null;
  return hit;
}

function playHover() {
  const now = performance.now();
  if (now - lastAt < 55) return;
  lastAt = now;
  Audio.sfx("hover");
}

/**
 * Global subtle hover ticks for interactive UI.
 * Mouse/pen pointerover + keyboard focusin. Install once at boot.
 */
export function installHoverSounds() {
  if (installed) return;
  installed = true;

  window.addEventListener(
    "pointerover",
    (e) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") {
        return;
      }
      const next = hoverTarget(e.target);
      const prev = hoverTarget(e.relatedTarget);
      if (!next || next === prev) return;
      lastEl = next;
      playHover();
    },
    true,
  );

  window.addEventListener(
    "pointerout",
    (e) => {
      const leaving = hoverTarget(e.target);
      if (leaving && leaving === lastEl) {
        const next = hoverTarget(e.relatedTarget);
        if (!next) lastEl = null;
      }
    },
    true,
  );

  window.addEventListener(
    "focusin",
    (e) => {
      const next = hoverTarget(e.target);
      if (!next || next === lastEl) return;
      lastEl = next;
      playHover();
    },
    true,
  );
}
