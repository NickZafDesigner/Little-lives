import { AMBIENT_NPCS } from "../data/ambientNpcs";
import { NPCS } from "../data/npcs";

const FADE_MS = 220;
const HEAD_Y = 38;
const MARGIN = 28;

interface TagState {
  el: HTMLElement;
  visible: boolean;
}

/**
 * Floating name pills above characters — shown while the cursor hovers them.
 */
export class NpcNameTags {
  private root: HTMLElement;
  private tags = new Map<string, TagState>();
  private fadeTimers = new Map<string, number>();

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-nametags ll-npc-tags";
    this.root.setAttribute("aria-hidden", "true");
    parent.appendChild(this.root);

    const people = [
      ...NPCS.map((n) => ({ id: n.id, name: n.name })),
      ...AMBIENT_NPCS.map((n) => ({ id: n.id, name: n.name })),
    ];

    for (const npc of people) {
      const el = document.createElement("div");
      el.className = "ll-nametag ll-nametag-npc";
      el.textContent = npc.name;
      el.hidden = true;
      this.root.appendChild(el);
      this.tags.set(npc.id, { el, visible: false });
    }
  }

  /**
   * @param hoveredId npc under the cursor, or null
   */
  update(
    positions: Map<string, { x: number; z: number }>,
    project: (x: number, y: number, z: number) => { x: number; y: number },
    canvasW: number,
    canvasH: number,
    hoveredId: string | null,
  ) {
    for (const [id, tag] of this.tags) {
      const pos = positions.get(id);
      if (!pos) {
        this.hideTag(id, tag, true);
        continue;
      }

      const screen = project(pos.x, HEAD_Y, pos.z);
      const onScreen =
        screen.x >= -MARGIN &&
        screen.x <= canvasW + MARGIN &&
        screen.y >= -MARGIN &&
        screen.y <= canvasH + MARGIN &&
        Number.isFinite(screen.x) &&
        Number.isFinite(screen.y);

      tag.el.style.transform = `translate(-50%, -100%) translate(${screen.x}px, ${screen.y}px)`;

      const shouldShow = hoveredId === id && onScreen;
      if (shouldShow) this.showTag(id, tag);
      else this.hideTag(id, tag, false);
    }
  }

  destroy() {
    for (const t of this.fadeTimers.values()) window.clearTimeout(t);
    this.fadeTimers.clear();
    this.root.remove();
    this.tags.clear();
  }

  private showTag(id: string, tag: TagState) {
    const pending = this.fadeTimers.get(id);
    if (pending !== undefined) {
      window.clearTimeout(pending);
      this.fadeTimers.delete(id);
    }
    tag.el.classList.remove("is-fading");
    if (!tag.visible) {
      tag.visible = true;
      tag.el.hidden = false;
      tag.el.classList.remove("is-pop");
      void tag.el.offsetWidth;
      tag.el.classList.add("is-pop");
    } else {
      tag.el.hidden = false;
    }
  }

  private hideTag(id: string, tag: TagState, immediate: boolean) {
    if (!tag.visible) {
      tag.el.hidden = true;
      return;
    }
    if (immediate) {
      const pending = this.fadeTimers.get(id);
      if (pending !== undefined) window.clearTimeout(pending);
      this.fadeTimers.delete(id);
      tag.visible = false;
      tag.el.hidden = true;
      tag.el.classList.remove("is-fading", "is-pop");
      return;
    }
    if (tag.el.classList.contains("is-fading") || this.fadeTimers.has(id)) {
      return;
    }
    tag.el.classList.add("is-fading");
    const timer = window.setTimeout(() => {
      this.fadeTimers.delete(id);
      tag.visible = false;
      tag.el.hidden = true;
      tag.el.classList.remove("is-fading", "is-pop");
    }, FADE_MS);
    this.fadeTimers.set(id, timer);
  }
}
