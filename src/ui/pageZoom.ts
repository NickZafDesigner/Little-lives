/** Detect browser page-zoom (from trackpad pinch) and show a reset hint. */
export function mountPageZoomBanner(parent: HTMLElement): () => void {
  let el: HTMLElement | null = null;

  const sync = () => {
    const scale = window.visualViewport?.scale ?? 1;
    if (scale <= 1.02) {
      el?.remove();
      el = null;
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.className = "ll-pagezoom-banner";
      const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
      el.innerHTML = `Browser zoom is on - press <kbd>${mod}+0</kbd> to fit the screen`;
      parent.appendChild(el);
    }
  };

  sync();
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);

  return () => {
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
    el?.remove();
    el = null;
  };
}
