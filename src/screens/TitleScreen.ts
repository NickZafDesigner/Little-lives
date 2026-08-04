import type { Screen } from "../app/ScreenRouter";
import type { App } from "../app/App";
import { clearSave, hasSave } from "../save/saveLoad";
import { Audio } from "../audio/AudioManager";
import { muteButtonHtml, wireMute } from "../ui/mute";
import { mountPageZoomBanner } from "../ui/pageZoom";
import { drawPortrait } from "../ui/portraits";
import { applyClothingStyle, defaultPlayerLook } from "../data/character";

export function createTitleScreen(
  app: App,
  goto: (id: "create" | "world", data?: { continue?: boolean }) => void,
): Screen {
  let unMute: (() => void) | null = null;
  let unZoomBanner: (() => void) | null = null;
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  return {
    id: "title",
    mount(root) {
      void app;
      Audio.playMusic("title");
      const canContinue = hasSave();
      root.innerHTML = `
        <div class="ll-screen ll-title">
          <div class="ll-title-sky" aria-hidden="true">
            <span class="ll-sun"></span>
            <span class="ll-sun-ray ll-sun-ray-a"></span>
            <span class="ll-sun-ray ll-sun-ray-b"></span>
            <span class="ll-sun-ray ll-sun-ray-c"></span>
            <span class="ll-cloud ll-cloud-a"></span>
            <span class="ll-cloud ll-cloud-b"></span>
            <span class="ll-cloud ll-cloud-c"></span>
            <span class="ll-cloud ll-cloud-d"></span>
            <span class="ll-bird ll-bird-a"></span>
            <span class="ll-bird ll-bird-b"></span>
          </div>
          <div class="ll-title-hills" aria-hidden="true">
            <span class="ll-title-tree ll-title-tree-a">
              <span class="ll-title-tree-trunk"></span>
              <span class="ll-title-tree-canopy"></span>
            </span>
            <span class="ll-title-tree ll-title-tree-b">
              <span class="ll-title-tree-trunk"></span>
              <span class="ll-title-tree-canopy"></span>
            </span>
            <span class="ll-title-tree ll-title-tree-c">
              <span class="ll-title-tree-trunk"></span>
              <span class="ll-title-tree-canopy"></span>
            </span>
            <span class="ll-title-house ll-title-house-bg ll-title-house-bg-a">
              <span class="ll-title-house-chimney"></span>
              <span class="ll-title-house-roof"></span>
              <span class="ll-title-house-body">
                <span class="ll-title-house-window"></span>
                <span class="ll-title-house-door"></span>
                <span class="ll-title-house-window"></span>
              </span>
            </span>
            <span class="ll-title-house ll-title-house-bg ll-title-house-bg-b">
              <span class="ll-title-house-chimney"></span>
              <span class="ll-title-house-roof"></span>
              <span class="ll-title-house-body">
                <span class="ll-title-house-window"></span>
                <span class="ll-title-house-door"></span>
                <span class="ll-title-house-window"></span>
              </span>
            </span>
            <span class="ll-title-house ll-title-house-main">
              <span class="ll-title-house-chimney"></span>
              <span class="ll-title-house-roof"></span>
              <span class="ll-title-house-body">
                <span class="ll-title-house-window"></span>
                <span class="ll-title-house-door"></span>
                <span class="ll-title-house-window"></span>
              </span>
              <span class="ll-title-house-path"></span>
            </span>
            <span class="ll-title-bush ll-title-bush-a"></span>
            <span class="ll-title-bush ll-title-bush-b"></span>
            <span class="ll-title-fence" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </span>
            <span class="ll-title-rock"></span>
            <span class="ll-title-flower ll-title-flower-a"></span>
            <span class="ll-title-flower ll-title-flower-b"></span>
            <span class="ll-title-flower ll-title-flower-c"></span>
            <span class="ll-title-flower ll-title-flower-d"></span>
            <span class="ll-title-flower ll-title-flower-e"></span>
            <span class="ll-title-flower ll-title-flower-f"></span>
            <span class="ll-title-grass ll-title-grass-a"></span>
            <span class="ll-title-grass ll-title-grass-b"></span>
            <span class="ll-title-grass ll-title-grass-c"></span>
            <span class="ll-title-grass ll-title-grass-d"></span>
            <span class="ll-title-stroll ll-title-stroll-a">
              <span class="ll-title-person ll-title-person-rose">
                <span class="ll-title-person-leg"></span>
                <span class="ll-title-person-leg"></span>
              </span>
            </span>
            <span class="ll-title-stroll ll-title-stroll-dog">
              <span class="ll-title-critter ll-title-dog">
                <span class="ll-title-critter-leg"></span>
                <span class="ll-title-critter-leg"></span>
              </span>
            </span>
            <span class="ll-title-stroll ll-title-stroll-b">
              <span class="ll-title-person ll-title-person-teal">
                <span class="ll-title-person-leg"></span>
                <span class="ll-title-person-leg"></span>
              </span>
            </span>
            <span class="ll-title-stroll ll-title-stroll-cat">
              <span class="ll-title-critter ll-title-cat">
                <span class="ll-title-critter-leg"></span>
                <span class="ll-title-critter-leg"></span>
              </span>
            </span>
          </div>
          <div class="ll-title-hero">
            <div class="ll-title-avatar" aria-hidden="true">
              <canvas class="ll-title-face" width="32" height="32"></canvas>
            </div>
            <h1 class="ll-welcome-brand">Little Lives</h1>
            <p class="ll-tagline">a cosy town of pets, pals &amp; paintbrushes</p>
            <div class="ll-actions">
              <button type="button" class="ll-btn ll-btn-primary" data-act="new">New Game</button>
              ${
                canContinue
                  ? `<button type="button" class="ll-btn" data-act="continue" title="Pick up where you left off">Continue</button>`
                  : ""
              }
            </div>
            <button type="button" class="ll-howto-link" data-act="howto">How to play</button>
            <p class="ll-title-credit">A game by Nick and Celeste Zafiropoulos</p>
          </div>
          <div class="ll-howto" hidden>
            <div class="ll-howto-scrim" data-act="howto-close"></div>
            <div
              class="ll-howto-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ll-howto-title"
            >
              <header class="ll-howto-head">
                <h2 id="ll-howto-title" class="ll-howto-title">How to play</h2>
                <button type="button" class="ll-howto-close" data-act="howto-close" aria-label="Close">✕</button>
              </header>
              <div class="ll-howto-body">
                <p class="ll-howto-lead">Settle into town, look after your needs, make friends, care for pets, and earn a little money to furnish your home.</p>
                <section class="ll-howto-section">
                  <h3>Controls</h3>
                  <ul class="ll-howto-keys">
                    <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> <span>Move</span></li>
                    <li><kbd>Space</kbd> <span>Talk, use, or pick up what's nearby</span></li>
                    <li><kbd>B</kbd> <span>Build &amp; decorate at home</span></li>
                    <li><kbd>R</kbd> <span>Rotate furniture while building</span></li>
                    <li><kbd>Esc</kbd> <span>Close menus / exit</span></li>
                  </ul>
                </section>
                <section class="ll-howto-section">
                  <h3>Tips</h3>
                  <ul class="ll-howto-tips">
                    <li>Keep an eye on needs - hungry, sleepy neighbours aren't at their best.</li>
                    <li>Take a job in town, then spend your earnings on furniture and pets.</li>
                    <li>When the day winds down, head home and sleep to start fresh.</li>
                  </ul>
                </section>
              </div>
              <footer class="ll-howto-foot">
                <button type="button" class="ll-btn ll-btn-primary" data-act="howto-close">Got it</button>
              </footer>
            </div>
          </div>
          ${muteButtonHtml()}
        </div>
      `;
      const mute = root.querySelector(".ll-mute") as HTMLElement;
      unMute = wireMute(mute);
      unZoomBanner = mountPageZoomBanner(root.querySelector(".ll-title") as HTMLElement);

      const face = root.querySelector(".ll-title-face") as HTMLCanvasElement;
      // Friendly mascot look for the welcome card
      const look = applyClothingStyle(
        {
          ...defaultPlayerLook(),
          hairStyle: "wavy",
          face: "freckled",
          hair: 0xc0554a,
        },
        "cozy",
      );
      drawPortrait(face, "player", look);

      const howto = root.querySelector(".ll-howto") as HTMLElement;
      const howtoBtn = root.querySelector('[data-act="howto"]') as HTMLButtonElement;
      const openHowto = () => {
        Audio.sfx("confirm");
        howto.hidden = false;
        const closeBtn = howto.querySelector(
          ".ll-howto-close",
        ) as HTMLButtonElement | null;
        closeBtn?.focus();
      };
      const closeHowto = () => {
        if (howto.hidden) return;
        howto.hidden = true;
        howtoBtn.focus();
      };

      howtoBtn.addEventListener("click", openHowto);
      howto.querySelectorAll('[data-act="howto-close"]').forEach((node) => {
        node.addEventListener("click", () => {
          Audio.sfx("ui");
          closeHowto();
        });
      });

      onKey = (e: KeyboardEvent) => {
        if (e.code === "Escape" && !howto.hidden) {
          e.preventDefault();
          Audio.sfx("ui");
          closeHowto();
        }
      };
      window.addEventListener("keydown", onKey);

      root.querySelector('[data-act="new"]')!.addEventListener("click", () => {
        Audio.sfx("confirm");
        clearSave();
        goto("create");
      });
      const cont = root.querySelector('[data-act="continue"]') as HTMLButtonElement | null;
      cont?.addEventListener("click", () => {
        Audio.sfx("confirm");
        goto("world", { continue: true });
      });
    },
    unmount() {
      if (onKey) {
        window.removeEventListener("keydown", onKey);
        onKey = null;
      }
      unMute?.();
      unMute = null;
      unZoomBanner?.();
      unZoomBanner = null;
    },
  };
}
