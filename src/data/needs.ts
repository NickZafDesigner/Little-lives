import type { NeedId, NeedsState } from "./types";

export const NEED_IDS: NeedId[] = [
  "hunger",
  "energy",
  "fun",
  "social",
  "hygiene",
  "bladder",
];

export const NEED_LABELS: Record<NeedId, string> = {
  hunger: "Hunger",
  energy: "Energy",
  fun: "Fun",
  social: "Social",
  hygiene: "Hygiene",
  bladder: "Bladder",
};

export const NEED_COLORS: Record<NeedId, number> = {
  hunger: 0xe07a5f,
  energy: 0xffd54f,
  fun: 0xf48fb1,
  social: 0x4fc3f7,
  hygiene: 0x80cbc4,
  bladder: 0x90caf9,
};

/** Decay per real second at 1x clock (needs 0-100).
 *  Tuned so urgent needs (hunger/bladder) ask once-ish per ~14min game day,
 *  not every few minutes — still a mechanic, not a constant chore. */
export const NEED_DECAY: Record<NeedId, number> = {
  hunger: 0.09,
  energy: 0.055,
  fun: 0.07,
  social: 0.045,
  hygiene: 0.04,
  bladder: 0.05,
};

export const FULL_NEEDS = (): NeedsState => ({
  hunger: 80,
  energy: 80,
  fun: 70,
  social: 60,
  hygiene: 75,
  bladder: 70,
});

export function clampNeed(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function applyNeedDeltas(
  needs: NeedsState,
  deltas: Partial<NeedsState>,
): NeedsState {
  const next = { ...needs };
  for (const key of NEED_IDS) {
    if (deltas[key] !== undefined) {
      next[key] = clampNeed(needs[key] + (deltas[key] as number));
    }
  }
  return next;
}

export function moodFromNeeds(needs: NeedsState): number {
  const avg =
    NEED_IDS.reduce((sum, id) => sum + needs[id], 0) / NEED_IDS.length;
  return avg;
}

/** Soft urgency - HUD turns red; comedy thoughts fire. */
export const NEED_CRITICAL = 10;
export const NEED_LOW = 25;

export function isNeedCritical(needs: NeedsState, id: NeedId): boolean {
  return needs[id] < NEED_CRITICAL;
}

export function criticalNeedThoughts(
  needs: NeedsState,
  isWet = false,
): string | null {
  if (isWet) {
    return "Ugh. Still damp. Shower. Please.";
  }
  if (needs.energy < NEED_CRITICAL) {
    return "Eyes… heavy… floor looks comfy…";
  }
  if (needs.hunger < NEED_CRITICAL) {
    return "Stomach says: fridge. Immediately.";
  }
  if (needs.bladder < NEED_CRITICAL) {
    return "Uh-oh. Bathroom. Now-ish.";
  }
  if (needs.hygiene < NEED_CRITICAL) {
    return "I can smell myself. Not a compliment.";
  }
  if (needs.fun < NEED_CRITICAL) {
    return "Everything feels beige. Need a spark.";
  }
  if (needs.social < NEED_CRITICAL) {
    return "I miss… people. Or at least a friendly wave.";
  }
  return null;
}

export function canHangOut(needs: NeedsState, isWet = false): boolean {
  return (
    !isWet && needs.energy >= NEED_CRITICAL && needs.bladder >= 5
  );
}

export function socialBlockedReason(
  needs: NeedsState,
  isWet = false,
): string | null {
  if (isWet) return "Still wet… shower first!";
  if (needs.energy < NEED_CRITICAL) return "Too exhausted to hang out…";
  if (needs.bladder < 5) return "Bathroom emergency — social later!";
  if (needs.hygiene < 8) return "Maybe shower before company…";
  return null;
}
