import { Palette } from "../game/palette";
import type { PetDef } from "./types";

/** Decorative strays that wander a small patch of town (not adoptable). */
export interface VillageAnimalDef {
  id: string;
  name: string;
  species: PetDef["species"];
  color: number;
  accent: number;
  spawnTx: number;
  spawnTy: number;
  /** How far (tiles) they roam from spawn. */
  wanderRadius: number;
}

export const VILLAGE_ANIMALS: VillageAnimalDef[] = [
  {
    id: "stray_park_dog",
    name: "Scout",
    species: "dog",
    color: Palette.wood,
    accent: Palette.cream,
    spawnTx: 30,
    spawnTy: 18,
    wanderRadius: 5,
  },
  {
    id: "stray_park_cat",
    name: "Miso",
    species: "cat",
    color: Palette.wallTrim,
    accent: Palette.rose,
    spawnTx: 38,
    spawnTy: 22,
    wanderRadius: 4,
  },
  {
    id: "stray_play_bunny",
    name: "Hop",
    species: "bunny",
    color: Palette.white,
    accent: Palette.blush,
    spawnTx: 32,
    spawnTy: 33,
    wanderRadius: 4,
  },
  {
    id: "stray_cafe_cat",
    name: "Latte Cat",
    species: "cat",
    color: Palette.ink,
    accent: Palette.sunflower,
    spawnTx: 10,
    spawnTy: 32,
    wanderRadius: 3,
  },
  {
    id: "stray_market_bird",
    name: "Pippin",
    species: "bird",
    color: Palette.skyDeep,
    accent: Palette.sunflower,
    spawnTx: 78,
    spawnTy: 14,
    wanderRadius: 4,
  },
  {
    id: "stray_pier_fox",
    name: "Tide",
    species: "fox",
    color: Palette.blush,
    accent: Palette.cream,
    spawnTx: 48,
    spawnTy: 64,
    wanderRadius: 5,
  },
  {
    id: "stray_street_dog",
    name: "Crumb",
    species: "dog",
    color: Palette.cafe,
    accent: Palette.woodDark,
    spawnTx: 55,
    spawnTy: 46,
    wanderRadius: 4,
  },
  {
    id: "stray_library_cat",
    name: "Quill",
    species: "cat",
    color: Palette.creamDark,
    accent: Palette.woodDark,
    spawnTx: 72,
    spawnTy: 32,
    wanderRadius: 3,
  },
];
