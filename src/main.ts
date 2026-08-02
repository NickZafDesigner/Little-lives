import { App } from "./app/App";
import { ScreenRouter } from "./app/ScreenRouter";
import { createTitleScreen } from "./screens/TitleScreen";
import { createCreateScreen } from "./screens/CreateScreen";
import { createWorldScreen } from "./screens/WorldScreen";
import type { PlayerProfile } from "./data/character";
import { AssetLibrary } from "./render/AssetLibrary";
import "./styles.css";

const gameRoot = document.getElementById("game-root");
const uiRoot = document.getElementById("ui-root");
if (!gameRoot || !uiRoot) throw new Error("Missing #game-root or #ui-root");

uiRoot.innerHTML = `<div class="ll-boot"><p>Loading Little Lives…</p></div>`;

await AssetLibrary.preload();
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
