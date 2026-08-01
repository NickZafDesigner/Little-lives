import { AMBIENT_NPCS } from "../data/ambientNpcs";
import { NPCS } from "../data/npcs";

const SHOW_MS = 2400;
const FADE_MS = 400;
const HEAD_Y = 38;
const MARGIN = 28;

interface TagState {
  el: HTMLElement;
  inView: boolean;
  /** performance.now() when the tag should start fading; 0 = hidden */
  until: number;
  shown: boolean;
}

/**
 * Floating name pills above NPCs when they first enter the camera view.
 */
export class NpcNameTags {
  private root: HTMLElement;
  private tags = new Map<string, TagState>();

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-nametags";
    parent.appendChild(this.root);

    const people = [
      ...NPCS.map((n) => ({ id: n.id, name: n.name })),
      ...AMBIENT_NPCS.map((n) => ({ id: n.id, name: n.name })),
    ];

    for (const npc of people) {
      const el = document.createElement("div");
      el.className = "ll-nametag";
      el.textContent = npc.name;
      el.hidden = true;
      this.root.appendChild(el);
      this.tags.set(npc.id, {
        el,
        inView: false,
        until: 0,
        shown: false,
      });
    }
  }

  /**
   * @param positions map of npcId → world x/z
   * @param project world → screen (canvas-local CSS px)
   * @param canvasW/H canvas CSS size
   */
  update(
    positions: Map<string, { x: number; z: number }>,
    project: (x: number, y: number, z: number) => { x: number; y: number },
    canvasW: number,
    canvasH: number,
  ) {
    const now = performance.now();

    for (const [id, tag] of this.tags) {
      const pos = positions.get(id);
      if (!pos) {
        tag.el.hidden = true;
        tag.inView = false;
        continue;
      }

      const screen = project(pos.x, HEAD_Y, pos.z);
      const visible =
        screen.x >= -MARGIN &&
        screen.x <= canvasW + MARGIN &&
        screen.y >= -MARGIN &&
        screen.y <= canvasH + MARGIN &&
        Number.isFinite(screen.x) &&
        Number.isFinite(screen.y);

      // Always keep position in sync before revealing to avoid a 0,0 flash
      tag.el.style.transform = `translate(-50%, -100%) translate(${screen.x}px, ${screen.y}px)`;

      // Entered view → pop the name for a couple seconds
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
