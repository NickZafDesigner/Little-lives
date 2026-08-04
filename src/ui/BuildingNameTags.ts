import { homeSignTitle } from "../mesh/signs";
import { LOTS, lotDoorWorld } from "../world/lots";

const SHOW_MS = 2600;
const FADE_MS = 400;
/** Float above the building frontage. */
const LABEL_Y = 52;
const MARGIN = 36;

interface TagState {
  el: HTMLElement;
  worldX: number;
  worldZ: number;
  inView: boolean;
  until: number;
  shown: boolean;
}

/**
 * Little building-name pills that pop when a lot first enters the camera.
 */
export class BuildingNameTags {
  private root: HTMLElement;
  private tags = new Map<string, TagState>();

  constructor(parent: HTMLElement, playerName = "Pippin") {
    this.root = document.createElement("div");
    this.root.className = "ll-nametags ll-building-tags";
    this.root.setAttribute("aria-hidden", "true");
    parent.appendChild(this.root);

    for (const lot of LOTS) {
      const door = lotDoorWorld(lot.id)!;
      const el = document.createElement("div");
      el.className = "ll-nametag ll-nametag-building";
      el.textContent =
        lot.id === "home" ? homeSignTitle(playerName) : lot.name;
      el.hidden = true;
      this.root.appendChild(el);
      this.tags.set(lot.id, {
        el,
        worldX: door.x,
        worldZ: door.z,
        inView: false,
        until: 0,
        shown: false,
      });
    }
  }

  update(
    project: (x: number, y: number, z: number) => { x: number; y: number },
    canvasW: number,
    canvasH: number,
  ) {
    const now = performance.now();

    for (const tag of this.tags.values()) {
      const screen = project(tag.worldX, LABEL_Y, tag.worldZ);
      const visible =
        screen.x >= -MARGIN &&
        screen.x <= canvasW + MARGIN &&
        screen.y >= -MARGIN &&
        screen.y <= canvasH + MARGIN &&
        Number.isFinite(screen.x) &&
        Number.isFinite(screen.y);

      tag.el.style.transform = `translate(-50%, -100%) translate(${screen.x}px, ${screen.y}px)`;

      if (visible && !tag.inView) {
        tag.until = now + SHOW_MS;
        tag.shown = true;
        tag.el.classList.remove("is-fading");
        tag.el.hidden = false;
        tag.el.classList.remove("is-pop");
        void tag.el.offsetWidth;
        tag.el.classList.add("is-pop");
      }

      tag.inView = visible;

      if (!tag.shown) {
        tag.el.hidden = true;
        continue;
      }

      if (now >= tag.until) {
        if (!tag.el.classList.contains("is-fading")) {
          tag.el.classList.add("is-fading");
          window.setTimeout(() => {
            tag.el.hidden = true;
            tag.el.classList.remove("is-fading", "is-pop");
            tag.shown = false;
            tag.until = 0;
          }, FADE_MS);
        }
      } else {
        tag.el.hidden = false;
      }
    }
  }

  destroy() {
    this.root.remove();
    this.tags.clear();
  }
}
