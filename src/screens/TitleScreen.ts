import type { Screen } from "../app/ScreenRouter";
import type { App } from "../app/App";
import { clearSave, hasSave } from "../save/saveLoad";
import { Audio } from "../audio/AudioManager";
import { muteButtonHtml, wireMute } from "../ui/mute";
import { mountPageZoomBanner } from "../ui/pageZoom";

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
          <div class="ll-title-card">
            <p class="ll-eyebrow">Welcome to</p>
            <h1>Little Lives</h1>
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
