/**
 * Crafting recipes, handmade goods, and Town Notice Board commissions.
 * Connects gather → craft → gift/place/board into one return loop.
 */

import type { MaterialId } from "./items";
import type { NpcId, WorkMiniKind } from "./types";
import type { WeeklyBeatId } from "../systems/dayCycle";

export type CraftedId =
  | "flower_crown"
  | "fruit_jam"
  | "clay_mug"
  | "ore_trinket"
  | "pet_toy_mouse"
  | "craft_stool"
  | "craft_planter"
  | "craft_frame";

export type RecipeUnlock =
  | { kind: "always" }
  | { kind: "workshop_shifts"; count: number }
  | { kind: "friendship"; npcId: NpcId; min: number }
  | { kind: "town_favor"; min: number };

export type CraftOutputKind = "gift" | "furniture" | "pet_toy";

export interface RecipeDef {
  id: CraftedId;
  name: string;
  description: string;
  costs: Array<{ itemId: MaterialId; count: number }>;
  mini: WorkMiniKind;
  unlock: RecipeUnlock;
  output: CraftOutputKind;
  /** Friendship when gifted (gifts only). */
  giftDelta?: number;
  giftPreference?: Partial<Record<NpcId, number>>;
  /** Catalog furniture unlocked + placeable after craft (furniture only). */
  furnitureId?: string;
}

export const RECIPES: RecipeDef[] = [
  {
    id: "flower_crown",
    name: "Flower Crown",
    description: "A soft ring of wildflowers for someone special.",
    costs: [
      { itemId: "flower", count: 3 },
      { itemId: "wood", count: 1 },
    ],
    mini: "timing",
    unlock: { kind: "always" },
    output: "gift",
    giftDelta: 28,
    giftPreference: { mabel: 6, pip: 8, jun: 3 },
  },
  {
    id: "fruit_jam",
    name: "Fruit Jam",
    description: "Sunny jar of mashed orchard fruit.",
    costs: [
      { itemId: "apple", count: 1 },
      { itemId: "orange", count: 1 },
      { itemId: "grape", count: 1 },
    ],
    mini: "hold",
    unlock: { kind: "always" },
    output: "gift",
    giftDelta: 26,
    giftPreference: { jun: 7, vera: 5, mabel: 4 },
  },
  {
    id: "clay_mug",
    name: "Clay Mug",
    description: "A sturdy little cup from dug clay.",
    costs: [
      { itemId: "clay", count: 2 },
      { itemId: "stone", count: 1 },
    ],
    mini: "sequence",
    unlock: { kind: "workshop_shifts", count: 1 },
    output: "gift",
    giftDelta: 24,
    giftPreference: { sage: 8, theo: 4, reed: 3 },
  },
  {
    id: "ore_trinket",
    name: "Ore Trinket",
    description: "Polished quarry gleam on a wood loop.",
    costs: [
      { itemId: "ore", count: 1 },
      { itemId: "coal", count: 1 },
      { itemId: "wood", count: 1 },
    ],
    mini: "timing",
    unlock: { kind: "workshop_shifts", count: 2 },
    output: "gift",
    giftDelta: 30,
    giftPreference: { reed: 8, theo: 5, vera: 3 },
  },
  {
    id: "pet_toy_mouse",
    name: "Pet Mouse Toy",
    description: "Squeaky enrichment for a bonded companion.",
    costs: [
      { itemId: "wood", count: 1 },
      { itemId: "flower", count: 1 },
    ],
    mini: "hold",
    unlock: { kind: "always" },
    output: "pet_toy",
  },
  {
    id: "craft_stool",
    name: "Handmade Stool",
    description: "A picnic-ready seat you shaped yourself.",
    costs: [
      { itemId: "wood", count: 3 },
      { itemId: "stone", count: 1 },
    ],
    mini: "sequence",
    unlock: { kind: "workshop_shifts", count: 2 },
    output: "furniture",
    furnitureId: "craft_stool",
  },
  {
    id: "craft_planter",
    name: "Stone Planter",
    description: "Clay-lined stone bowl for a home bloom.",
    costs: [
      { itemId: "stone", count: 2 },
      { itemId: "clay", count: 2 },
      { itemId: "flower", count: 1 },
    ],
    mini: "timing",
    unlock: { kind: "friendship", npcId: "pip", min: 40 },
    output: "furniture",
    furnitureId: "craft_planter",
  },
  {
    id: "craft_frame",
    name: "Harbor Frame",
    description: "Ore-trimmed wood frame for a sunny wall.",
    costs: [
      { itemId: "wood", count: 2 },
      { itemId: "ore", count: 1 },
    ],
    mini: "hold",
    unlock: { kind: "town_favor", min: 4 },
    output: "furniture",
    furnitureId: "craft_frame",
  },
];

export const recipeById = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
) as Record<CraftedId, RecipeDef>;

export type CommissionKind =
  | "deliver_craft"
  | "deliver_material"
  | "work_assist"
  | "bring_beat"
  | "pet_care";

export interface CommissionTemplate {
  id: string;
  kind: CommissionKind;
  title: string;
  blurb: string;
  npcId: NpcId;
  craftedId?: CraftedId;
  materialId?: MaterialId;
  materialCount?: number;
  jobId?: string;
  /** work_assist: interact here (defaults to job.tasks[0].furnitureUid). */
  furnitureUid?: string;
  beatId?: WeeklyBeatId;
  rewardMoney: number;
  rewardFriendship: number;
  rewardFavor: number;
}

export const COMMISSION_TEMPLATES: CommissionTemplate[] = [
  {
    id: "mabel_crown",
    kind: "deliver_craft",
    title: "Mabel's Flower Crown",
    blurb: "Bake day needs a pretty crown. Can you craft one?",
    npcId: "mabel",
    craftedId: "flower_crown",
    rewardMoney: 18,
    rewardFriendship: 12,
    rewardFavor: 1,
  },
  {
    id: "jun_jam",
    kind: "deliver_craft",
    title: "Café Jam Jar",
    blurb: "Jun wants a homemade jam for the specials board.",
    npcId: "jun",
    craftedId: "fruit_jam",
    rewardMoney: 20,
    rewardFriendship: 12,
    rewardFavor: 1,
  },
  {
    id: "reed_trinket",
    kind: "deliver_craft",
    title: "Workshop Trinket",
    blurb: "Reed's showing off quarry craft - bring an ore trinket.",
    npcId: "reed",
    craftedId: "ore_trinket",
    rewardMoney: 28,
    rewardFriendship: 14,
    rewardFavor: 2,
  },
  {
    id: "sage_mug",
    kind: "deliver_craft",
    title: "Clinic Clay Mug",
    blurb: "Dr. Sage needs a sturdy mug for herbal tea.",
    npcId: "sage",
    craftedId: "clay_mug",
    rewardMoney: 22,
    rewardFriendship: 12,
    rewardFavor: 1,
  },
  {
    id: "pip_crown",
    kind: "deliver_craft",
    title: "Park Crown",
    blurb: "Pip wants a flower crown for the duck parade.",
    npcId: "pip",
    craftedId: "flower_crown",
    rewardMoney: 16,
    rewardFriendship: 14,
    rewardFavor: 1,
  },
  {
    id: "pip_flowers",
    kind: "deliver_material",
    title: "Pond Bouquet",
    blurb: "Pip needs 3 wildflowers for the park beds.",
    npcId: "pip",
    materialId: "flower",
    materialCount: 3,
    rewardMoney: 12,
    rewardFriendship: 10,
    rewardFavor: 1,
  },
  {
    id: "vera_wood",
    kind: "deliver_material",
    title: "Crate Planks",
    blurb: "Vera's short on wood for market crates - bring 5.",
    npcId: "vera",
    materialId: "wood",
    materialCount: 5,
    rewardMoney: 14,
    rewardFriendship: 8,
    rewardFavor: 1,
  },
  {
    id: "theo_ore",
    kind: "deliver_material",
    title: "Library Paperweight",
    blurb: "Theo wants 2 ore chunks for desk weights.",
    npcId: "theo",
    materialId: "ore",
    materialCount: 2,
    rewardMoney: 18,
    rewardFriendship: 10,
    rewardFavor: 1,
  },
  {
    id: "cafe_help",
    kind: "work_assist",
    title: "Extra Café Hands",
    blurb: "Rush hour at Jun's - hop in for one quick task.",
    npcId: "jun",
    jobId: "cafe_barista",
    furnitureUid: "c_coffee",
    rewardMoney: 15,
    rewardFriendship: 8,
    rewardFavor: 1,
  },
  {
    id: "market_help",
    kind: "work_assist",
    title: "Market Stock Assist",
    blurb: "Vera needs a quick restock challenge completed.",
    npcId: "vera",
    jobId: "market_clerk",
    rewardMoney: 15,
    rewardFriendship: 8,
    rewardFavor: 1,
  },
  {
    id: "picnic_stool",
    kind: "bring_beat",
    title: "Picnic Seat",
    blurb: "Bring a handmade stool to Sunday's Park Picnic.",
    npcId: "pip",
    craftedId: "craft_stool",
    beatId: "park_picnic",
    rewardMoney: 25,
    rewardFriendship: 14,
    rewardFavor: 2,
  },
  {
    id: "pet_enrichment",
    kind: "pet_care",
    title: "Pet Enrichment",
    blurb: "Craft a mouse toy and treat your companion.",
    npcId: "sage",
    craftedId: "pet_toy_mouse",
    rewardMoney: 14,
    rewardFriendship: 6,
    rewardFavor: 1,
  },
];

export const commissionById = Object.fromEntries(
  COMMISSION_TEMPLATES.map((c) => [c.id, c]),
) as Record<string, CommissionTemplate>;

export interface BoardOffer {
  /** Stable instance id for UI keys. */
  uid: string;
  templateId: string;
  dayPosted: number;
  /** True once turned in / completed. */
  done: boolean;
  /** work_assist: accepted from the board; finish at the job station. */
  accepted?: boolean;
}

export interface TownBoardState {
  /** dayIndex the current offers were rolled for (−1 = never). */
  day: number;
  offers: BoardOffer[];
  favor: number;
  /** Lifetime commissions completed. */
  completedCount: number;
  /** Lifetime crafts finished. */
  craftsMade: number;
}

export function emptyTownBoard(): TownBoardState {
  return {
    day: -1,
    offers: [],
    favor: 0,
    completedCount: 0,
    craftsMade: 0,
  };
}

/** Favor thresholds that grant unlock ids via TownBoardSystem. */
export const TOWN_FAVOR_UNLOCKS: Array<{ favor: number; unlockId: string; toast: string }> = [
  {
    favor: 3,
    unlockId: "town_favor_helper",
    toast: "Town Favor! Locals tip you a little extra on jobs.",
  },
  {
    favor: 8,
    unlockId: "notice_star",
    toast: "Your name is on the notice board - Town star!",
  },
];

export function formatRecipeCost(recipe: RecipeDef): string {
  return recipe.costs
    .map((c) => `${c.count}× ${c.itemId}`)
    .join(", ");
}
