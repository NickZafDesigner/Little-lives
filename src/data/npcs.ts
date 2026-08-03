import { Palette } from "../game/palette";
import type { DialogueTone, NpcDef, NpcId } from "./types";
import type { MaterialId } from "./items";

export const NPCS: NpcDef[] = [
  {
    id: "mabel",
    name: "Mabel",
    color: Palette.rose,
    homeLot: "neighbor",
    traits: ["Friendly", "Baker"],
    spawnTx: 55,
    spawnTy: 7,
  },
  {
    id: "jun",
    name: "Jun",
    color: Palette.mint,
    homeLot: "cafe",
    traits: ["Cheerful", "Barista"],
    spawnTx: 10,
    spawnTy: 38,
  },
  {
    id: "pip",
    name: "Pip",
    color: Palette.sunflower,
    homeLot: "park",
    traits: ["Playful", "Gardener"],
    spawnTx: 34,
    spawnTy: 20,
  },
  {
    id: "vera",
    name: "Vera",
    color: Palette.blush,
    homeLot: "market",
    traits: ["Sharp", "Merchant"],
    spawnTx: 79,
    spawnTy: 7,
  },
  {
    id: "theo",
    name: "Theo",
    color: Palette.lavender,
    homeLot: "library",
    traits: ["Quiet", "Bookish"],
    spawnTx: 77,
    spawnTy: 36,
  },
  {
    id: "sage",
    name: "Dr. Sage",
    color: Palette.mintDark,
    homeLot: "clinic",
    traits: ["Kind", "Careful"],
    spawnTx: 34,
    spawnTy: 54,
  },
  {
    id: "reed",
    name: "Reed",
    color: Palette.woodDark,
    homeLot: "workshop",
    traits: ["Steady", "Crafty"],
    spawnTx: 101,
    spawnTy: 22,
  },
];

export const RELATIONSHIP_ACQUAINTANCE = 10;
export const RELATIONSHIP_GOOD = 20;
export const RELATIONSHIP_FRIEND = 40;
export const RELATIONSHIP_CLOSE = 70;
export const RELATIONSHIP_CRUSH = 75;
/** True max score - unlocks asking a villager to move in. */
export const RELATIONSHIP_MAX = 100;

/** Extra friendship when gifting a wildflower (base + preference). */
export const FLOWER_GIFT_BASE = 22;
export const FLOWER_GIFT_PREFERENCE: Partial<Record<NpcId, number>> = {
  pip: 8,
  mabel: 6,
  jun: 3,
  sage: 3,
};

/** Bag items players can gift to anyone (villagers or street hangabouts). */
export const BAG_GIFTS: Array<{
  itemId: MaterialId;
  label: string;
  delta: number;
  preference?: Partial<Record<NpcId, number>>;
}> = [
  {
    itemId: "flower",
    label: "Give Flowers",
    delta: FLOWER_GIFT_BASE,
    preference: FLOWER_GIFT_PREFERENCE,
  },
  {
    itemId: "apple",
    label: "Give Apple",
    delta: 14,
    preference: { mabel: 5, jun: 4, pip: 3 },
  },
  {
    itemId: "orange",
    label: "Give Orange",
    delta: 14,
    preference: { vera: 4, jun: 3, reed: 2 },
  },
  {
    itemId: "grape",
    label: "Give Grapes",
    delta: 15,
    preference: { pip: 5, mabel: 3, vera: 3 },
  },
  {
    itemId: "fish",
    label: "Give Fish",
    delta: 16,
    preference: { reed: 4, pip: 3, vera: 2 },
  },
];

/** Handmade gifts from the craft table. */
export const CRAFTED_GIFTS: Array<{
  craftedId: import("./crafting").CraftedId;
  label: string;
  delta: number;
  preference?: Partial<Record<NpcId, number>>;
}> = [
  {
    craftedId: "flower_crown",
    label: "Give Flower Crown",
    delta: 28,
    preference: { mabel: 6, pip: 8, jun: 3 },
  },
  {
    craftedId: "fruit_jam",
    label: "Give Fruit Jam",
    delta: 26,
    preference: { jun: 7, vera: 5, mabel: 4 },
  },
  {
    craftedId: "clay_mug",
    label: "Give Clay Mug",
    delta: 24,
    preference: { sage: 8, theo: 4, reed: 3 },
  },
  {
    craftedId: "ore_trinket",
    label: "Give Ore Trinket",
    delta: 30,
    preference: { reed: 8, theo: 5, vera: 3 },
  },
];

/** How you choose to speak - shown before other social actions. */
export const DIALOGUE_TONES: Array<{
  id: DialogueTone;
  label: string;
  sub: string;
  /** Base friendship delta before NPC receptiveness. */
  delta: number;
  needSocial: number;
  needFun?: number;
  durationMs: number;
}> = [
  {
    id: "friendly",
    label: "Friendly chat",
    sub: "Warm & open",
    delta: 8,
    needSocial: 12,
    durationMs: 900,
  },
  {
    id: "polite",
    label: "Be polite",
    sub: "Courteous & careful",
    delta: 6,
    needSocial: 10,
    durationMs: 850,
  },
  {
    id: "flirty",
    label: "Flirt a little",
    sub: "Playful charm",
    delta: 4,
    needSocial: 14,
    needFun: 6,
    durationMs: 1000,
  },
  {
    id: "rude",
    label: "Be rude",
    sub: "Sharp tongue",
    delta: -10,
    needSocial: 4,
    durationMs: 700,
  },
];

export const SOCIAL_ACTIONS = [
  {
    id: "joke",
    label: "Tell Joke",
    delta: 12,
    needSocial: 15,
    needFun: 8,
    durationMs: 1000,
  },
  {
    id: "gift_bag",
    label: "Gift from bag",
    delta: FLOWER_GIFT_BASE,
    needSocial: 18,
    durationMs: 900,
  },
  {
    id: "gift",
    label: "Give Gift ($15)",
    delta: 20,
    cost: 15,
    needSocial: 18,
    durationMs: 800,
  },
  {
    id: "hangout",
    label: "Hang Out",
    delta: 15,
    needSocial: 22,
    needFun: 12,
    minScore: RELATIONSHIP_GOOD,
    durationMs: 1400,
  },
] as const;

/** Per-NPC multiplier on tone deltas (flirty/rude land differently). */
export const TONE_RECEPTIVENESS: Record<
  Exclude<NpcId, "player">,
  Record<DialogueTone, number>
> = {
  mabel: { friendly: 1.2, polite: 1.1, flirty: 0.6, rude: 1.3 },
  jun: { friendly: 1.1, polite: 0.9, flirty: 1.2, rude: 1.1 },
  pip: { friendly: 1.3, polite: 0.8, flirty: 0.9, rude: 0.7 },
  vera: { friendly: 0.9, polite: 1.2, flirty: 0.5, rude: 1.4 },
  theo: { friendly: 1.0, polite: 1.4, flirty: 0.3, rude: 1.5 },
  sage: { friendly: 1.2, polite: 1.3, flirty: 0.4, rude: 1.6 },
  reed: { friendly: 1.1, polite: 1.2, flirty: 0.5, rude: 1.2 },
};
