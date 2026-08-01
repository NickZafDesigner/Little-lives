import { Palette } from "../game/palette";

export type Sex = "girl" | "boy" | "enby";
export type Height = "short" | "average" | "tall";
export type Build = "slim" | "average" | "stocky";
export type FaceStyle = "round" | "soft" | "sharp" | "freckled";
export type ClothingStyle = "casual" | "cozy" | "sporty" | "fancy";
export type HairStyle = "short" | "bun" | "long" | "wavy" | "cap";

export interface PlayerLook {
  sex: Sex;
  height: Height;
  build: Build;
  face: FaceStyle;
  clothing: ClothingStyle;
  hairStyle: HairStyle;
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
}

export interface PlayerProfile {
  name: string;
  look: PlayerLook;
  traits: string[];
  favouriteFood: string;
  favouriteAnimals: string[];
}

export const SEX_OPTIONS: Sex[] = ["boy", "girl", "enby"];
export const HEIGHT_OPTIONS: Height[] = ["short", "average", "tall"];
export const BUILD_OPTIONS: Build[] = ["slim", "average", "stocky"];
export const FACE_OPTIONS: FaceStyle[] = ["round", "soft", "sharp", "freckled"];
export const CLOTHING_OPTIONS: ClothingStyle[] = [
  "casual",
  "cozy",
  "sporty",
  "fancy",
];
export const HAIR_OPTIONS: HairStyle[] = ["short", "bun", "long", "wavy", "cap"];

export const SKIN_TONES = [
  { label: "Peach", skin: Palette.skin, shade: Palette.skinShade },
  { label: "Honey", skin: Palette.skin2, shade: Palette.skin2Shade },
  { label: "Warm", skin: 0xc68642, shade: 0xa06830 },
  { label: "Deep", skin: 0x8d5524, shade: 0x6b3f1a },
  { label: "Fair", skin: 0xffe0bd, shade: 0xe8c49a },
] as const;

export const HAIR_COLORS = [
  { label: "Brown", color: 0x8d5a3b },
  { label: "Black", color: 0x2f3a45 },
  { label: "Blonde", color: 0xe8b73c },
  { label: "Ginger", color: 0xc0554a },
  { label: "Pink", color: 0xe8899a },
  { label: "Mint", color: 0x5aaa9a },
] as const;

export const CLOTHING_PALETTES: Record<
  ClothingStyle,
  { shirt: number; pants: number; label: string }
> = {
  casual: { shirt: 0x7ec8e3, pants: 0x5b6b8c, label: "Casual" },
  cozy: { shirt: Palette.rose, pants: 0x7a5c8c, label: "Cozy" },
  sporty: { shirt: Palette.mint, pants: 0x4a5560, label: "Sporty" },
  fancy: { shirt: Palette.sunflower, pants: Palette.leaf, label: "Fancy" },
};

export const TRAIT_OPTIONS = [
  "Friendly",
  "Curious",
  "Creative",
  "Chill",
  "Outgoing",
  "Shy",
  "Bookish",
  "Foodie",
  "Early Bird",
  "Night Owl",
  "Tidy",
  "Adventurous",
  "Homebody",
  "Goofy",
] as const;

export const FOOD_OPTIONS = [
  "Pancakes",
  "Pizza",
  "Ramen",
  "Salad",
  "Cookies",
  "Soup",
  "Berries",
  "Toast",
  "Curry",
  "Ice Cream",
  "Tacos",
  "Mac & Cheese",
] as const;

export const ANIMAL_OPTIONS = [
  "Cats",
  "Dogs",
  "Bunnies",
  "Birds",
  "Fish",
  "Frogs",
  "Foxes",
  "Horses",
] as const;

export const MAX_TRAITS = 3;
export const MAX_ANIMALS = 2;

export const SEX_LABELS: Record<Sex, string> = {
  boy: "Male",
  girl: "Female",
  enby: "Non-binary",
};

export const HEIGHT_LABELS: Record<Height, string> = {
  short: "Short",
  average: "Average",
  tall: "Tall",
};

export const BUILD_LABELS: Record<Build, string> = {
  slim: "Slim",
  average: "Average",
  stocky: "Stocky",
};

export const FACE_LABELS: Record<FaceStyle, string> = {
  round: "Round",
  soft: "Soft",
  sharp: "Sharp",
  freckled: "Freckled",
};

export const HAIR_LABELS: Record<HairStyle, string> = {
  short: "Short",
  bun: "Bun",
  long: "Long",
  wavy: "Wavy",
  cap: "Cap",
};

export function defaultPlayerLook(): PlayerLook {
  return {
    sex: "boy",
    height: "average",
    build: "average",
    face: "soft",
    clothing: "casual",
    hairStyle: "short",
    skin: Palette.skin,
    hair: 0x8d5a3b,
    shirt: CLOTHING_PALETTES.casual.shirt,
    pants: CLOTHING_PALETTES.casual.pants,
  };
}

export function defaultPlayerProfile(): PlayerProfile {
  return {
    name: "Pippin",
    look: defaultPlayerLook(),
    traits: ["Friendly", "Curious"],
    favouriteFood: "Pancakes",
    favouriteAnimals: ["Cats"],
  };
}

export function applyClothingStyle(look: PlayerLook, style: ClothingStyle): PlayerLook {
  const palette = CLOTHING_PALETTES[style];
  return {
    ...look,
    clothing: style,
    shirt: palette.shirt,
    pants: palette.pants,
  };
}

/** Sensible hair defaults when sex changes (player can still override). */
export function hairForSex(sex: Sex): HairStyle {
  if (sex === "girl") return "long";
  if (sex === "boy") return "short";
  return "wavy";
}
