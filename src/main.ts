import { App } from "./app/App";
import { ScreenRouter } from "./app/ScreenRouter";
import { createTitleScreen } from "./screens/TitleScreen";
import { createCreateScreen } from "./screens/CreateScreen";
import { createWorldScreen } from "./screens/WorldScreen";
import type { PlayerProfile } from "./data/character";
import { AssetLibrary } from "./render/AssetLibrary";
import { Audio } from "./audio/AudioManager";
import "./styles.css";

const gameRoot = document.getElementById("game-root");
const uiRoot = document.getElementById("ui-root");
if (!gameRoot || !uiRoot) throw new Error("Missing #game-root or #ui-root");

uiRoot.innerHTML = `
  <div class="ll-boot">
    <div
      class="ll-boot-bar"
      role="progressbar"
      aria-label="Loading"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="0"
    >
      <div class="ll-boot-fill"></div>
    </div>
  </div>
`;
const boot = uiRoot.querySelector(".ll-boot") as HTMLElement;
const bootBar = uiRoot.querySelector(".ll-boot-bar") as HTMLElement;
const bootFill = uiRoot.querySelector(".ll-boot-fill") as HTMLElement;
const setBootProgress = (p: number) => {
  const pct = Math.round(Math.min(1, Math.max(0, p)) * 100);
  bootFill.style.width = `${pct}%`;
  bootBar.setAttribute("aria-valuenow", String(pct));
};

try {
  await AssetLibrary.preload(setBootProgress);
} catch (err) {
  console.error("Boot preload failed", err);
  bootBar.remove();
  boot.classList.add("is-ready");
  boot.innerHTML = `<span class="ll-boot-cta">Couldn’t load assets - refresh to try again</span>`;
  throw err;
}

// Swap the loader for a simple start prompt on the same screen.
bootBar.remove();
boot.classList.add("is-ready");
boot.innerHTML = `<span class="ll-boot-cta">Click anywhere to begin</span>`;
boot.setAttribute("role", "button");
boot.tabIndex = 0;
boot.setAttribute("aria-label", "Click anywhere to begin");

await new Promise<void>((resolve) => {
  let done = false;
  const begin = () => {
    if (done) return;
    done = true;
    boot.removeEventListener("click", begin);
    window.removeEventListener("keydown", onKey);
    void Audio.unlock().then(() => resolve());
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      begin();
    }
  };
  boot.addEventListener("click", begin);
  window.addEventListener("keydown", onKey);
  boot.focus();
});

uiRoot.innerHTML = "";

const app = new App(gameRoot, uiRoot);

type NavData = {
  continue?: boolean;
  fresh?: boolean;
  profile?: PlayerProfile;
};

let pending: NavData = {};

const router = new ScreenRouter(uiRoot, {
  title: () =>
    createTitleScreen(app, (id, data) => {
      pending = data ?? {};
      router.goto(id);
    }),
  create: () =>
    createCreateScreen(app, (id, data) => {
      pending = data ?? {};
      router.goto(id);
    }),
  world: () =>
    createWorldScreen(app, (id) => {
      pending = {};
      router.goto(id);
    }, pending),
});

app.router = router;
router.goto("title");
