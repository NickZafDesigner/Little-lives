export type ScreenId = "title" | "create" | "world";

export interface Screen {
  id: ScreenId;
  mount(root: HTMLElement): void;
  unmount(): void;
  update?(dt: number): void;
}

export class ScreenRouter {
  private current: Screen | null = null;
  private uiRoot: HTMLElement;
  private screens: Map<ScreenId, () => Screen>;

  constructor(uiRoot: HTMLElement, factories: Record<ScreenId, () => Screen>) {
    this.uiRoot = uiRoot;
    this.screens = new Map(
      Object.entries(factories) as Array<[ScreenId, () => Screen]>,
    );
  }

  goto(id: ScreenId) {
    this.current?.unmount();
    this.uiRoot.replaceChildren();
    const factory = this.screens.get(id);
    if (!factory) throw new Error(`Unknown screen ${id}`);
    this.current = factory();
    this.current.mount(this.uiRoot);
  }

  update(dt: number) {
    this.current?.update?.(dt);
  }

  get active(): Screen | null {
    return this.current;
  }
}
