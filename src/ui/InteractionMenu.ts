export interface MenuOption {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
}

export class InteractionMenu {
  private el: HTMLElement;
  private onPick: ((id: string) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "ll-menu";
    this.el.hidden = true;
    parent.appendChild(this.el);
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  containsPoint(clientX: number, clientY: number): boolean {
    if (this.el.hidden) return false;
    const r = this.el.getBoundingClientRect();
    return (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    );
  }

  show(
    title: string,
    subtitle: string,
    options: MenuOption[],
    x: number,
    y: number,
    onPick: (id: string) => void,
  ) {
    this.onPick = onPick;
    this.el.hidden = false;
    this.el.innerHTML = `
      <div class="ll-menu-title">${escapeHtml(title)}</div>
      <div class="ll-menu-sub">${escapeHtml(subtitle)}</div>
      <div class="ll-menu-opts"></div>
    `;
    const list = this.el.querySelector(".ll-menu-opts")!;
    for (const opt of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ll-menu-opt";
      btn.disabled = Boolean(opt.disabled);
      btn.innerHTML = `<span>${escapeHtml(opt.label)}</span>${
        opt.sub ? `<small>${escapeHtml(opt.sub)}</small>` : ""
      }`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (opt.disabled) return;
        // close() clears onPick, so grab the handler first
        const pick = this.onPick;
        this.close();
        pick?.(opt.id);
      });
      list.appendChild(btn);
    }

    // Position within overlay (parent is ui-root covering canvas)
    const parent = this.el.parentElement!;
    const pr = parent.getBoundingClientRect();
    this.el.style.left = `${Math.max(12, Math.min(x - 90, pr.width - 200))}px`;
    this.el.style.top = `${Math.max(12, Math.min(y, pr.height - 220))}px`;
  }

  close() {
    this.el.hidden = true;
    this.el.innerHTML = "";
    this.onPick = null;
  }

  destroy() {
    this.el.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
