import type { ScreenRouter } from "./ScreenRouter";
import { TownRenderer } from "../render/TownRenderer";
import { Audio } from "../audio/AudioManager";

export class App {
  readonly canvas: HTMLCanvasElement;
  readonly uiRoot: HTMLElement;
  readonly renderer: TownRenderer;
  router!: ScreenRouter;
  private last = performance.now();
  private keys = new Set<string>();

  constructor(gameRoot: HTMLElement, uiRoot: HTMLElement) {
    this.uiRoot = uiRoot;
    this.canvas = document.createElement("canvas");
    this.canvas.tabIndex = 0;
    gameRoot.appendChild(this.canvas);

    this.renderer = new TownRenderer(this.canvas);

    const unlock = () => Audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (["Tab", "Space"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    const resize = () => this.fit();
    window.addEventListener("resize", resize);
    // Only react to visualViewport when page-zoom is actually on - scroll
    // events at 100% zoom are noise and were resizing the canvas mid-walk.
    const onVv = () => {
      const scale = window.visualViewport?.scale ?? 1;
      if (Math.abs(scale - 1) > 0.02) this.fit();
    };
    window.visualViewport?.addEventListener("resize", onVv);
    window.visualViewport?.addEventListener("scroll", onVv);
    this.fit();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.router?.update(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  private fit() {
    const stage = document.getElementById("stage");
    const vv = window.visualViewport;

    // Trackpad pinch can leave Chrome page-zoom stuck (>100%). Pin #stage to
    // the visual viewport so menus/UI aren't clipped off-screen.
    if (stage && vv && Math.abs(vv.scale - 1) > 0.02) {
      const left = `${vv.offsetLeft}px`;
      const top = `${vv.offsetTop}px`;
      const width = `${vv.width}px`;
      const height = `${vv.height}px`;
      if (!stage.classList.contains("ll-vv-fit")) stage.classList.add("ll-vv-fit");
      if (stage.style.left !== left) stage.style.left = left;
      if (stage.style.top !== top) stage.style.top = top;
      if (stage.style.width !== width) stage.style.width = width;
      if (stage.style.height !== height) stage.style.height = height;
    } else if (stage?.classList.contains("ll-vv-fit")) {
      stage.classList.remove("ll-vv-fit");
      stage.style.left = "";
      stage.style.top = "";
      stage.style.width = "";
      stage.style.height = "";
    }

    const parent = this.canvas.parentElement!;
    const w = Math.max(1, Math.floor(parent.clientWidth));
    const h = Math.max(1, Math.floor(parent.clientHeight));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.renderer.resize(w, h);

    // Mirror canvas box onto ui-root content via CSS variables
    const rect = this.canvas.getBoundingClientRect();
    if (stage) {
      const sr = stage.getBoundingClientRect();
      stage.style.setProperty("--ll-canvas-left", `${rect.left - sr.left}px`);
      stage.style.setProperty("--ll-canvas-top", `${rect.top - sr.top}px`);
      stage.style.setProperty("--ll-canvas-width", `${rect.width}px`);
      stage.style.setProperty("--ll-canvas-height", `${rect.height}px`);
    }
  }
}
