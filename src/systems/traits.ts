import type { NeedsState, NeedId } from "../data/types";
import { NEED_DECAY } from "../data/needs";

/** Species label matching favourite-animal chips (Cats/Dogs/Bunnies…). */
export function speciesFavouriteLabel(
  species: "cat" | "dog" | "bunny" | "fox" | "bird",
): string {
  if (species === "cat") return "Cats";
  if (species === "dog") return "Dogs";
  if (species === "bunny") return "Bunnies";
  if (species === "fox") return "Foxes";
  return "Birds";
}

export function hasTrait(traits: string[], trait: string): boolean {
  return traits.includes(trait);
}

/** Multipliers on base NEED_DECAY (per real second). */
export function traitDecayMultipliers(
  traits: string[],
  dayTime: number,
): Record<NeedId, number> {
  const m: Record<NeedId, number> = {
    hunger: 1,
    energy: 1,
    fun: 1,
    social: 1,
    hygiene: 1,
    bladder: 1,
  };

  if (hasTrait(traits, "Foodie")) m.hunger *= 1.35;
  if (hasTrait(traits, "Tidy")) m.hygiene *= 0.7;
  if (hasTrait(traits, "Chill")) {
    m.fun *= 0.85;
    m.social *= 0.9;
  }
  if (hasTrait(traits, "Outgoing")) m.social *= 1.2;
  if (hasTrait(traits, "Shy")) m.social *= 0.75;
  if (hasTrait(traits, "Homebody")) m.fun *= 1.15; // bored away from home handled elsewhere
  if (hasTrait(traits, "Adventurous")) m.fun *= 0.9;

  const hour = dayTime * 24;
  if (hasTrait(traits, "Early Bird")) {
    // Extra energy drain late; slower drain morning
    if (hour >= 5 && hour < 11) m.energy *= 0.75;
    else if (hour >= 21 || hour < 5) m.energy *= 1.35;
  }
  if (hasTrait(traits, "Night Owl")) {
    if (hour >= 20 || hour < 2) m.energy *= 0.7;
    else if (hour >= 6 && hour < 12) m.energy *= 1.3;
  }

  return m;
}

export function decayNeedsWithTraits(
  needs: NeedsState,
  traits: string[],
  dayTime: number,
  dt: number,
  atHome: boolean,
): NeedsState {
  const mult = traitDecayMultipliers(traits, dayTime);
  const next = { ...needs };
  for (const id of Object.keys(NEED_DECAY) as NeedId[]) {
    let rate = NEED_DECAY[id] * mult[id];
    if (hasTrait(traits, "Homebody") && !atHome && id === "fun") {
      rate *= 1.25;
    }
    if (hasTrait(traits, "Adventurous") && !atHome && id === "fun") {
      rate *= 0.8;
    }
    next[id] = Math.max(0, Math.min(100, needs[id] - rate * dt));
  }
  return next;
}

export interface TraitFeedback {
  deltas: Partial<NeedsState>;
  toast?: string;
  payMult?: number;
  socialMult?: number;
}

/** Adjust furniture / interaction need deltas based on traits & favourites. */
export function modifyInteractionDeltas(
  interactionId: string,
  defId: string,
  base: Partial<NeedsState>,
  traits: string[],
  favouriteFood: string,
): TraitFeedback {
  const deltas: Partial<NeedsState> = { ...base };
  let toast: string | undefined;

  const bump = (key: NeedId, amount: number) => {
    deltas[key] = (deltas[key] ?? 0) + amount;
  };

  if (
    (interactionId === "snack" || interactionId === "meal") &&
    hasTrait(traits, "Foodie")
  ) {
    bump("hunger", 12);
    bump("fun", 6);
    toast = `Foodie delight! ${favouriteFood} vibes.`;
  }

  if (
    (interactionId === "read" || defId === "bookshelf") &&
    hasTrait(traits, "Bookish")
  ) {
    bump("fun", 12);
    bump("energy", 4);
    toast = "Bookish bliss - lost in the page.";
  }

  if (
    (interactionId === "watch" ||
      interactionId === "doodle" ||
      interactionId === "admire" ||
      interactionId === "sit") &&
    hasTrait(traits, "Creative")
  ) {
    bump("fun", 8);
    toast = toast ?? "Creative spark!";
  }

  if (interactionId === "sleep" || interactionId === "nap") {
    const hour = 0; // caller can pass dayTime via sleep helper
    void hour;
  }

  if (hasTrait(traits, "Goofy") && interactionId === "watch") {
    bump("fun", 6);
  }

  if (hasTrait(traits, "Tidy") && interactionId === "shower") {
    bump("hygiene", 10);
    bump("fun", 4);
    toast = toast ?? "Tidy glow!";
  }

  if (hasTrait(traits, "Chill") && (interactionId === "sit" || interactionId === "relax")) {
    bump("energy", 6);
    bump("fun", 4);
    toast = toast ?? "Chill mode engaged.";
  }

  return { deltas, toast };
}

export function sleepEnergyBonus(traits: string[], dayTime: number): number {
  const hour = dayTime * 24;
  if (hasTrait(traits, "Early Bird") && hour >= 20) return 10;
  if (hasTrait(traits, "Night Owl") && hour >= 0 && hour < 6) return 10;
  if (hasTrait(traits, "Night Owl") && hour >= 22) return 8;
  return 0;
}

/** Social delta multiplier from traits + hygiene/mood. */
export function socialOutcomeMultiplier(
  traits: string[],
  hygiene: number,
  mood: number,
  tone?: string,
  isWet = false,
): { mult: number; toast?: string } {
  let mult = 1;
  let toast: string | undefined;

  if (hasTrait(traits, "Friendly") && tone !== "rude") {
    mult *= 1.15;
  }
  if (hasTrait(traits, "Outgoing") && (tone === "friendly" || tone === "flirty")) {
    mult *= 1.2;
    toast = "Outgoing charm!";
  }
  if (hasTrait(traits, "Shy") && tone === "flirty") {
    mult *= 0.7;
  }
  if (hasTrait(traits, "Shy") && tone === "polite") {
    mult *= 1.15;
  }
  if (hasTrait(traits, "Goofy") && tone === undefined) {
    // joke path
    mult *= 1.25;
  }
  if (isWet) {
    mult *= 0.35;
    toast = "Still damp… this is so awkward.";
  } else if (hygiene < 15) {
    mult *= 0.55;
    toast = "Eep - maybe shower first next time…";
  } else if (hygiene < 30) {
    mult *= 0.8;
  }
  if (mood < 30) mult *= 0.85;
  else if (mood > 75) mult *= 1.1;

  return { mult, toast };
}

export function jobPayMultiplier(
  traits: string[],
  jobId: string,
  mood: number,
): { mult: number; toast?: string } {
  let mult = 1;
  let toast: string | undefined;

  if (hasTrait(traits, "Bookish") && jobId === "library_aide") {
    mult *= 1.2;
    toast = "Bookish bonus!";
  }
  if (hasTrait(traits, "Foodie") && jobId === "cafe_barista") {
    mult *= 1.15;
    toast = "Foodie tip jar!";
  }
  if (hasTrait(traits, "Friendly") || hasTrait(traits, "Outgoing")) {
    mult *= 1.05;
  }
  if (hasTrait(traits, "Curious") && jobId === "clinic_aide") {
    mult *= 1.1;
  }
  if (hasTrait(traits, "Early Bird")) {
    // slight morning worker bonus baked into shifts generally
    mult *= 1.05;
  }
  if (mood < 25) mult *= 0.85;
  else if (mood > 80) mult *= 1.1;

  return { mult, toast };
}

export function favouritePetBondBonus(
  favouriteAnimals: string[],
  species: "cat" | "dog" | "bunny" | "fox" | "bird",
): { bonus: number; toast?: string } {
  const label = speciesFavouriteLabel(species);
  if (favouriteAnimals.includes(label)) {
    return { bonus: 8, toast: `Favourite ${label.toLowerCase()}! Extra bond.` };
  }
  return { bonus: 0 };
}

export function favouriteFoodMention(favouriteFood: string): string {
  return `Someone mentioned ${favouriteFood}… suddenly hungry for it.`;
}
