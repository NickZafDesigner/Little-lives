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
            <span class="ll-cloud ll-cloud-a"></span>
            <span class="ll-cloud ll-cloud-b"></span>
            <span class="ll-cloud ll-cloud-c"></span>
          </div>
          <div class="ll-title-hills" aria-hidden="true">
            <span class="ll-title-bloom ll-title-bloom-a"></span>
            <span class="ll-title-bloom ll-title-bloom-b"></span>
            <span class="ll-title-bloom ll-title-bloom-c"></span>
          </div>
          <div class="ll-title-hero">
            <div class="ll-title-avatar" aria-hidden="true">
              <canvas class="ll-title-face" width="32" height="32"></canvas>
            </div>
            <p class="ll-welcome-kicker">Welcome to</p>
            <h1 class="ll-welcome-brand">Little Lives</h1>
            <p class="ll-tagline">a cosy town of pets, pals &amp; paintbrushes</p>
            <div class="ll-actions">
              <button type="button" class="ll-btn ll-btn-primary" data-act="new">New Game</button>
              <button type="button" class="ll-btn" data-act="continue" ${canContinue ? "" : "disabled"}>Continue</button>
            </div>
            <p class="ll-controls">WASD move · Click to walk · E use · B build · Q save</p>
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

      root.querySelector('[data-act="new"]')!.addEventListener("click", () => {
        Audio.sfx("confirm");
        clearSave();
        goto("create");
      });
      const cont = root.querySelector('[data-act="continue"]') as HTMLButtonElement;
      cont.addEventListener("click", () => {
        if (cont.disabled) return;
        Audio.sfx("confirm");
        goto("world", { continue: true });
      });
    },
    unmount() {
      unMute?.();
      unMute = null;
      unZoomBanner?.();
      unZoomBanner = null;
    },
  };
}
