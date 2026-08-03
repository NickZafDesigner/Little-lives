import type { ChatNpcId } from "../data/dialogue";
import {
  RELATIONSHIP_ACQUAINTANCE,
  RELATIONSHIP_CLOSE,
  RELATIONSHIP_CRUSH,
  RELATIONSHIP_FRIEND,
} from "../data/npcs";

export type RelationshipTier =
  | "stranger"
  | "acquaintance"
  | "friend"
  | "close"
  | "crush";

export function tierFromScore(
  score: number,
  met: boolean,
  flirtCount: number,
): RelationshipTier {
  if (!met && score <= 0) return "stranger";
  if (
    score >= RELATIONSHIP_CLOSE &&
    flirtCount >= 3 &&
    score >= RELATIONSHIP_CRUSH
  ) {
    return "crush";
  }
  if (score >= RELATIONSHIP_CLOSE) return "close";
  if (score >= RELATIONSHIP_FRIEND) return "friend";
  if (score >= RELATIONSHIP_ACQUAINTANCE || met) return "acquaintance";
  return "stranger";
}

export function tierLabel(tier: RelationshipTier): string {
  switch (tier) {
    case "crush":
      return "Crush";
    case "close":
      return "Close friend";
    case "friend":
      return "Friend";
    case "acquaintance":
      return "Acquaintance";
    default:
      return "Just met";
  }
}

/** Exclusive hangout unlocked at close friend (or crush). */
export interface ExclusiveHangout {
  id: string;
  label: string;
  sub: string;
  delta: number;
  needSocial: number;
  needFun: number;
  durationMs: number;
  line: string;
}

export const EXCLUSIVE_HANGOUTS: Record<ChatNpcId, ExclusiveHangout> = {
  mabel: {
    id: "exclusive_bake",
    label: "Bake together",
    sub: "Close friends only",
    delta: 18,
    needSocial: 20,
    needFun: 16,
    durationMs: 1600,
    line: "Flour on our noses - perfect. You're my favourite sous-chef.",
  },
  jun: {
    id: "exclusive_latte",
    label: "Secret latte art",
    sub: "Close friends only",
    delta: 16,
    needSocial: 18,
    needFun: 14,
    durationMs: 1500,
    line: "Okay, don't tell the regulars - this foam swan is just for you.",
  },
  pip: {
    id: "exclusive_garden",
    label: "Garden mischief",
    sub: "Close friends only",
    delta: 18,
    needSocial: 22,
    needFun: 20,
    durationMs: 1600,
    line: "We named a daisy after you. It already looks smug.",
  },
  vera: {
    id: "exclusive_inventory",
    label: "After-hours inventory",
    sub: "Close friends only",
    delta: 15,
    needSocial: 16,
    needFun: 10,
    durationMs: 1500,
    line: "Between us: the good jam's under the counter. Don't snitch.",
  },
  theo: {
    id: "exclusive_rare_book",
    label: "Share a rare book",
    sub: "Close friends only",
    delta: 17,
    needSocial: 14,
    needFun: 18,
    durationMs: 1700,
    line: "I don't lend this to just anyone. …Turn the pages gently.",
  },
  sage: {
    id: "exclusive_tea",
    label: "Herbal tea break",
    sub: "Close friends only",
    delta: 16,
    needSocial: 18,
    needFun: 12,
    durationMs: 1500,
    line: "Physician's orders: breathe, sip, stay a while.",
  },
  reed: {
    id: "exclusive_build",
    label: "Build something together",
    sub: "Close friends only",
    delta: 17,
    needSocial: 16,
    needFun: 14,
    durationMs: 1600,
    line: "Pass me that clamp. …Okay, this one's ours. Don't sell it.",
  },
};

export function closeFriendUnlockLine(npcId: ChatNpcId): string {
  const lines: Record<ChatNpcId, string> = {
    mabel: "You're not just a neighbour anymore - you're kitchen family.",
    jun: "Close-friend status. Your usual is already half-poured.",
    pip: "Best-best park pals. Want to plant something wild later?",
    vera: "Fine. Close friends get the real deals. Don't make me regret it.",
    theo: "I trust you with the quiet corners of the library. That's… a lot.",
    sage: "You've become someone I rely on. That means a great deal.",
    reed: "Close friends get first pick of the scrap maple. Don't waste it.",
  };
  return lines[npcId];
}

export function crushUnlockLine(npcId: ChatNpcId): string {
  const lines: Record<ChatNpcId, string> = {
    mabel: "Oh my - are my cheeks pink, or is the oven on?",
    jun: "Okay wow. That smile? Extra shot of courage, coming up.",
    pip: "Hehe… you make the sunflowers look shy.",
    vera: "Don't get cocky. …But yes, I noticed.",
    theo: "I -  ahem. Your company is… distracting. In a good way.",
    sage: "My pulse just did something unprofessional. Ignore that.",
    reed: "Huh. Usually I notice wood grain first. Not today.",
  };
  return lines[npcId];
}
