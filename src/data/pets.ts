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

export function pickShelterPets(count = 4): string[] {
  const shuffled = [...PET_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => p.id);
}
