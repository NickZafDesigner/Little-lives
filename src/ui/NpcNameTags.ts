import { AMBIENT_NPCS } from "../data/ambientNpcs";
import { NPCS } from "../data/npcs";

const FADE_MS = 220;
const HEAD_Y = 38;
const MARKER_Y = 48;
const MARGIN = 28;

interface TagState {
  el: HTMLElement;
  visible: boolean;
}

interface MarkerState {
  el: HTMLElement;
}

/**
 * Floating name pills above characters - shown while the cursor hovers them.
 * Quest givers also get a persistent "!" marker above their head.
 */
export class NpcNameTags {
  private root: HTMLElement;
  private tags = new Map<string, TagState>();
  private markers = new Map<string, MarkerState>();
  private fadeTimers = new Map<string, number>();
  private questOfferIds = new Set<string>();

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

      const marker = document.createElement("div");
      marker.className = "ll-quest-marker";
      marker.innerHTML = `<span class="ll-quest-marker-bang">!</span>`;
      marker.hidden = true;
      this.root.appendChild(marker);
      this.markers.set(npc.id, { el: marker });
    }
  }

  /** NPCs who currently have a side-quest offer ready. */
  setQuestOfferIds(ids: Set<string>) {
    this.questOfferIds = ids;
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
      const marker = this.markers.get(id);
      if (!pos) {
        this.hideTag(id, tag, true);
        if (marker) marker.el.hidden = true;
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

      const offer = this.questOfferIds.has(id);
      tag.el.classList.toggle("is-quest-offer", offer);
      tag.el.classList.toggle("ll-quest-glow", offer);

      const shouldShow = hoveredId === id && onScreen;
      if (shouldShow) this.showTag(id, tag);
      else this.hideTag(id, tag, false);

      if (marker) {
        if (offer && onScreen) {
          const markerScreen = project(pos.x, MARKER_Y, pos.z);
          marker.el.style.transform = `translate(-50%, -100%) translate(${markerScreen.x}px, ${markerScreen.y}px)`;
          marker.el.hidden = false;
        } else {
          marker.el.hidden = true;
        }
      }
    }
  }

  destroy() {
    for (const t of this.fadeTimers.values()) window.clearTimeout(t);
    this.fadeTimers.clear();
    this.root.remove();
    this.tags.clear();
    this.markers.clear();
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
