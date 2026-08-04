/** Shared close-control glyph — stroke X, optically centered in a 24 viewBox. */
export const CLOSE_ICON_SVG = `<svg class="ll-close-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"/></svg>`;

/** Circle close button markup used by menus, modals, and cards. */
export function closeButtonHtml(opts: {
  /** Extra classes (layout hooks). Always includes `ll-close`. */
  className?: string;
  ariaLabel?: string;
  /** Raw attribute string, e.g. `data-shop-close` or `data-act="dismiss"`. */
  attrs?: string;
  size?: "sm" | "md";
}): string {
  const size = opts.size === "sm" ? " ll-close--sm" : "";
  const extra = opts.className ? ` ${opts.className}` : "";
  const attrs = opts.attrs ? ` ${opts.attrs}` : "";
  const label = opts.ariaLabel ?? "Close";
  return `<button type="button" class="ll-close${size}${extra}"${attrs} aria-label="${label}">${CLOSE_ICON_SVG}</button>`;
}
