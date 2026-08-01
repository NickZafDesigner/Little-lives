import type { PlayerLook } from "../data/character";
import { ambientNpcById } from "../data/ambientNpcs";
import { Palette } from "../game/palette";

export type PortraitId =
  | "mabel"
  | "jun"
  | "pip"
  | "vera"
  | "theo"
  | "sage"
  | "player"
  | string;

const SIZE = 32;

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  w = 1,
  h = 1,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Draw a cute 8-bit face into a canvas (32×32, scaled up by CSS). */
export function drawPortrait(
  canvas: HTMLCanvasElement,
  id: PortraitId,
  look?: PlayerLook,
) {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Soft backdrop
  fillRect(ctx, 0, 0, SIZE, SIZE, hex(Palette.cream));

  switch (id) {
    case "mabel":
      drawMabel(ctx);
      break;
    case "jun":
      drawJun(ctx);
      break;
    case "pip":
      drawPip(ctx);
      break;
    case "vera":
      drawVera(ctx);
      break;
    case "theo":
      drawTheo(ctx);
      break;
    case "sage":
      drawSage(ctx);
      break;
    case "player":
      drawPlayer(ctx, look);
      break;
    default: {
      const ambient = ambientNpcById[id];
      if (ambient) drawAmbient(ctx, ambient.look, ambient.vibe);
      else drawPlayer(ctx, look);
      break;
    }
  }
}

function drawMabel(ctx: CanvasRenderingContext2D) {
  const skin = hex(Palette.skin);
  const shade = hex(Palette.skinShade);
  const hair = "#c46b7a";
  const hairDark = "#9a4558";
  const shirt = hex(Palette.rose);
  const flour = hex(Palette.cream);

  // Hair bob
  fillRect(ctx, 8, 4, 16, 14, hair);
  fillRect(ctx, 6, 8, 3, 10, hair);
  fillRect(ctx, 23, 8, 3, 10, hair);
  fillRect(ctx, 9, 3, 14, 3, hairDark);

  // Baker flour puff / bun
  fillRect(ctx, 12, 1, 8, 4, flour);
  fillRect(ctx, 13, 0, 6, 2, "#fff8ee");
  px(ctx, 14, 2, hairDark);
  px(ctx, 17, 2, hairDark);

  // Face
  fillRect(ctx, 10, 8, 12, 12, skin);
  fillRect(ctx, 11, 20, 10, 2, shade);

  // Blush
  fillRect(ctx, 11, 15, 2, 2, hex(Palette.rose));
  fillRect(ctx, 19, 15, 2, 2, hex(Palette.rose));

  // Eyes (kind crescents)
  fillRect(ctx, 12, 12, 3, 2, hex(Palette.ink));
  fillRect(ctx, 17, 12, 3, 2, hex(Palette.ink));
  px(ctx, 13, 12, "#ffffff");
  px(ctx, 18, 12, "#ffffff");

  // Smile
  fillRect(ctx, 14, 17, 4, 1, hex(Palette.inkSoft));
  px(ctx, 13, 16, hex(Palette.inkSoft));
  px(ctx, 18, 16, hex(Palette.inkSoft));

  // Shirt / apron
  fillRect(ctx, 8, 22, 16, 10, shirt);
  fillRect(ctx, 12, 22, 8, 10, flour);
  fillRect(ctx, 14, 24, 4, 2, hair);
}

function drawJun(ctx: CanvasRenderingContext2D) {
  const skin = hex(Palette.skin2);
  const shade = hex(Palette.skin2Shade);
  const hair = "#2f3a45";
  const shirt = hex(Palette.mint);
  const apron = hex(Palette.cream);

  // Hair — neat short with side swoop
  fillRect(ctx, 9, 4, 14, 8, hair);
  fillRect(ctx, 8, 7, 3, 6, hair);
  fillRect(ctx, 21, 7, 3, 5, hair);
  fillRect(ctx, 10, 3, 10, 2, "#1a2229");
  // Swoop bang
  fillRect(ctx, 11, 5, 7, 3, "#1a2229");

  // Face
  fillRect(ctx, 10, 9, 12, 11, skin);
  fillRect(ctx, 11, 19, 10, 2, shade);

  // Bright eyes
  fillRect(ctx, 12, 12, 3, 3, hex(Palette.ink));
  fillRect(ctx, 17, 12, 3, 3, hex(Palette.ink));
  px(ctx, 13, 12, "#ffffff");
  px(ctx, 18, 12, "#ffffff");
  px(ctx, 14, 14, hex(Palette.mintDark));
  px(ctx, 19, 14, hex(Palette.mintDark));

  // Big cheerful grin
  fillRect(ctx, 13, 17, 6, 2, hex(Palette.inkSoft));
  px(ctx, 12, 17, hex(Palette.inkSoft));
  px(ctx, 19, 17, hex(Palette.inkSoft));

  // Mint shirt + apron strap
  fillRect(ctx, 8, 22, 16, 10, shirt);
  fillRect(ctx, 11, 22, 10, 10, apron);
  fillRect(ctx, 15, 24, 2, 6, shirt);
  // Tiny coffee steam dots
  px(ctx, 26, 24, hex(Palette.inkSoft));
  px(ctx, 27, 22, hex(Palette.inkSoft));
}

function drawPip(ctx: CanvasRenderingContext2D) {
  const skin = hex(0xffe0bd);
  const shade = hex(0xe8c49a);
  const hair = hex(Palette.sunflowerDark);
  const shirt = hex(Palette.sunflower);
  const leaf = hex(Palette.leaf);

  // Messy sunny hair
  fillRect(ctx, 8, 3, 16, 10, hair);
  px(ctx, 7, 6, hair);
  px(ctx, 24, 5, hair);
  px(ctx, 9, 2, hair);
  px(ctx, 14, 1, hair);
  px(ctx, 20, 2, hair);
  px(ctx, 22, 4, leaf); // leaf stuck in hair

  // Face
  fillRect(ctx, 10, 9, 12, 11, skin);
  fillRect(ctx, 11, 19, 10, 2, shade);

  // Freckles
  px(ctx, 12, 15, hex(Palette.blushDark));
  px(ctx, 14, 16, hex(Palette.blushDark));
  px(ctx, 18, 15, hex(Palette.blushDark));
  px(ctx, 20, 16, hex(Palette.blushDark));

  // Playful eyes (wink left)
  fillRect(ctx, 12, 12, 3, 1, hex(Palette.ink));
  fillRect(ctx, 17, 11, 3, 3, hex(Palette.ink));
  px(ctx, 18, 11, "#ffffff");

  // Toothy grin
  fillRect(ctx, 13, 17, 6, 2, hex(Palette.inkSoft));
  fillRect(ctx, 14, 17, 4, 1, "#ffffff");

  // Sunny shirt
  fillRect(ctx, 8, 22, 16, 10, shirt);
  fillRect(ctx, 14, 24, 4, 4, leaf);
}

function drawVera(ctx: CanvasRenderingContext2D) {
  const skin = hex(Palette.skin2);
  const shade = hex(Palette.skin2Shade);
  const hair = "#5c3d2e";
  const shirt = hex(Palette.blush);

  fillRect(ctx, 8, 4, 16, 12, hair);
  fillRect(ctx, 6, 8, 3, 10, hair);
  fillRect(ctx, 23, 8, 3, 10, hair);
  fillRect(ctx, 10, 9, 12, 11, skin);
  fillRect(ctx, 11, 19, 10, 2, shade);
  fillRect(ctx, 12, 12, 3, 3, hex(Palette.ink));
  fillRect(ctx, 17, 12, 3, 3, hex(Palette.ink));
  px(ctx, 13, 12, "#ffffff");
  px(ctx, 18, 12, "#ffffff");
  fillRect(ctx, 13, 17, 6, 1, hex(Palette.inkSoft));
  fillRect(ctx, 8, 22, 16, 10, shirt);
  fillRect(ctx, 14, 24, 4, 5, hex(Palette.sunflower));
}

function drawTheo(ctx: CanvasRenderingContext2D) {
  const skin = hex(Palette.skin);
  const shade = hex(Palette.skinShade);
  const hair = "#3e2723";
  const shirt = hex(Palette.lavender);

  fillRect(ctx, 9, 5, 14, 7, hair);
  fillRect(ctx, 10, 9, 12, 11, skin);
  fillRect(ctx, 11, 19, 10, 2, shade);
  // Glasses
  fillRect(ctx, 11, 12, 4, 3, hex(Palette.inkSoft));
  fillRect(ctx, 17, 12, 4, 3, hex(Palette.inkSoft));
  fillRect(ctx, 15, 13, 2, 1, hex(Palette.inkSoft));
  fillRect(ctx, 12, 13, 2, 1, hex(Palette.ink));
  fillRect(ctx, 18, 13, 2, 1, hex(Palette.ink));
  fillRect(ctx, 14, 17, 4, 1, hex(Palette.inkSoft));
  fillRect(ctx, 8, 22, 16, 10, shirt);
  fillRect(ctx, 12, 24, 8, 3, hex(Palette.cream));
}

function drawSage(ctx: CanvasRenderingContext2D) {
  const skin = hex(0xe2ac7d);
  const shade = hex(0xc1875c);
  const hair = "#eceff1";
  const shirt = hex(Palette.mint);

  fillRect(ctx, 8, 4, 16, 10, hair);
  fillRect(ctx, 10, 9, 12, 11, skin);
  fillRect(ctx, 11, 19, 10, 2, shade);
  fillRect(ctx, 12, 12, 3, 3, hex(Palette.ink));
  fillRect(ctx, 17, 12, 3, 3, hex(Palette.ink));
  px(ctx, 13, 12, "#ffffff");
  px(ctx, 18, 12, "#ffffff");
  fillRect(ctx, 13, 17, 6, 1, hex(Palette.inkSoft));
  fillRect(ctx, 8, 22, 16, 10, shirt);
  fillRect(ctx, 11, 22, 10, 8, hex(Palette.white));
  fillRect(ctx, 15, 24, 2, 6, hex(Palette.mintDark));
}

function drawPlayer(ctx: CanvasRenderingContext2D, look?: PlayerLook) {
  const skin = hex(look?.skin ?? Palette.skin);
  const shade = hex(
    look?.skin === Palette.skin2
      ? Palette.skin2Shade
      : look?.skin === 0xc68642
        ? 0xa06830
        : look?.skin === 0x8d5524
          ? 0x6b3f1a
          : look?.skin === 0xffe0bd
            ? 0xe8c49a
            : Palette.skinShade,
  );
  const hair = hex(look?.hair ?? 0x8d5a3b);
  const shirt = hex(look?.shirt ?? 0x7ec8e3);
  const style = look?.hairStyle ?? "short";
  const face = look?.face ?? "soft";

  // Hair by style
  fillRect(ctx, 9, 4, 14, 8, hair);
  if (style === "long" || style === "wavy") {
    fillRect(ctx, 7, 8, 3, 12, hair);
    fillRect(ctx, 22, 8, 3, 12, hair);
  }
  if (style === "bun") {
    fillRect(ctx, 13, 1, 6, 4, hair);
  }
  if (style === "cap") {
    fillRect(ctx, 8, 4, 16, 4, hex(look?.shirt ?? Palette.mint));
    fillRect(ctx, 7, 6, 18, 2, hex(look?.shirt ?? Palette.mint));
  }
  if (style === "wavy") {
    px(ctx, 8, 10, hair);
    px(ctx, 23, 11, hair);
  }

  // Face
  fillRect(ctx, 10, 9, 12, 11, skin);
  fillRect(ctx, 11, 19, 10, 2, shade);

  if (face === "freckled") {
    px(ctx, 12, 15, hex(Palette.blushDark));
    px(ctx, 15, 16, hex(Palette.blushDark));
    px(ctx, 19, 15, hex(Palette.blushDark));
  }
  if (face === "round") {
    fillRect(ctx, 9, 14, 2, 4, skin);
    fillRect(ctx, 21, 14, 2, 4, skin);
  }

  // Blush
  fillRect(ctx, 11, 15, 2, 1, hex(Palette.rose));
  fillRect(ctx, 19, 15, 2, 1, hex(Palette.rose));

  // Eyes
  if (face === "sharp") {
    fillRect(ctx, 12, 12, 3, 2, hex(Palette.ink));
    fillRect(ctx, 17, 12, 3, 2, hex(Palette.ink));
  } else {
    fillRect(ctx, 12, 12, 3, 3, hex(Palette.ink));
    fillRect(ctx, 17, 12, 3, 3, hex(Palette.ink));
    px(ctx, 13, 12, "#ffffff");
    px(ctx, 18, 12, "#ffffff");
  }

  // Smile
  fillRect(ctx, 14, 17, 4, 1, hex(Palette.inkSoft));
  px(ctx, 13, 16, hex(Palette.inkSoft));
  px(ctx, 18, 16, hex(Palette.inkSoft));

  // Shirt
  fillRect(ctx, 8, 22, 16, 10, shirt);
}

function drawAmbient(
  ctx: CanvasRenderingContext2D,
  look: PlayerLook,
  vibe: string,
) {
  drawPlayer(ctx, look);

  // Tiny vibe accents so street faces read as distinct personalities
  if (vibe === "rude") {
    // Unimpressed brow
    fillRect(ctx, 12, 11, 3, 1, hex(Palette.ink));
    fillRect(ctx, 17, 11, 3, 1, hex(Palette.ink));
  } else if (vibe === "cute") {
    // Extra blush + tiny sparkle
    fillRect(ctx, 11, 15, 2, 2, hex(Palette.rose));
    fillRect(ctx, 19, 15, 2, 2, hex(Palette.rose));
    px(ctx, 24, 6, hex(Palette.sunflower));
    px(ctx, 7, 7, hex(Palette.sunflower));
  } else if (vibe === "charming") {
    // Soft wink
    fillRect(ctx, 17, 12, 3, 1, hex(Palette.ink));
    px(ctx, 22, 8, hex(Palette.rose));
  } else if (vibe === "funny") {
    // Goofy open grin
    fillRect(ctx, 13, 17, 6, 2, hex(Palette.inkSoft));
    fillRect(ctx, 14, 17, 4, 1, "#ffffff");
  }
}
