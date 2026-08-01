/** Small colour helpers shared by the mesh builders. */

/** Darken (f < 1) or lighten (f > 1) a hex colour. */
export function tint(color: number, f: number): number {
  const ch = (shift: number) =>
    Math.min(255, Math.round(((color >> shift) & 0xff) * f));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Blend two hex colours; t = 0 returns a, t = 1 returns b. */
export function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
