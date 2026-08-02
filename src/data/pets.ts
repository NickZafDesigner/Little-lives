import { Palette } from "../game/palette";
import type { PetDef, PetNeedsState } from "./types";

export const PET_POOL: PetDef[] = [
  {
    id: "biscuit",
    name: "Biscuit",
    species: "dog",
    color: Palette.wood,
    accent: Palette.cream,
    traits: ["Loyal", "Bouncy"],
    fee: 80,
  },
  {
    id: "mochi",
    name: "Mochi",
    species: "cat",
    color: Palette.wallTrim,
    accent: Palette.rose,
    traits: ["Curious", "Soft"],
    fee: 70,
  },
  {
    id: "nibble",
    name: "Nibble",
    species: "bunny",
    color: Palette.white,
    accent: Palette.blush,
    traits: ["Gentle", "Hopping"],
    fee: 60,
  },
  {
    id: "pepper",
    name: "Pepper",
    species: "cat",
    color: Palette.ink,
    accent: Palette.sunflower,
    traits: ["Sassy", "Night Owl"],
    fee: 75,
  },
  {
    id: "toast",
    name: "Toast",
    species: "dog",
    color: Palette.cafe,
    accent: Palette.woodDark,
    traits: ["Hungry", "Cuddly"],
    fee: 85,
  },
  {
    id: "cloud",
    name: "Cloud",
    species: "bunny",
    color: Palette.sky,
    accent: Palette.white,
    traits: ["Dreamy", "Quiet"],
    fee: 65,
  },
  {
    id: "ember",
    name: "Ember",
    species: "fox",
    color: Palette.blush,
    accent: Palette.cream,
    traits: ["Clever", "Sneaky"],
    fee: 90,
  },
  {
    id: "rust",
    name: "Rust",
    species: "fox",
    color: Palette.roof,
    accent: Palette.white,
    traits: ["Bold", "Playful"],
    fee: 88,
  },
  {
    id: "pebble",
    name: "Pebble",
    species: "bird",
    color: Palette.skyDeep,
    accent: Palette.sunflower,
    traits: ["Chirpy", "Bright"],
    fee: 55,
  },
  {
    id: "mango",
    name: "Mango",
    species: "bird",
    color: Palette.sunflower,
    accent: Palette.leaf,
    traits: ["Sunny", "Talkative"],
    fee: 58,
  },
  {
    id: "olive",
    name: "Olive",
    species: "cat",
    color: Palette.leaf,
    accent: Palette.cream,
    traits: ["Calm", "Curious"],
    fee: 72,
  },
  {
    id: "dumpling",
    name: "Dumpling",
    species: "dog",
    color: Palette.cream,
    accent: Palette.blush,
    traits: ["Round", "Friendly"],
    fee: 82,
  },
];

export const petById = Object.fromEntries(
  PET_POOL.map((p) => [p.id, p]),
) as Record<string, PetDef>;

export const FULL_PET_NEEDS = (): PetNeedsState => ({
  hunger: 70,
  energy: 70,
  fun: 60,
  bond: 20,
});

export function pickShelterPets(count = 6): string[] {
  const shuffled = [...PET_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => p.id);
}
