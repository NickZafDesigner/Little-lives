import { Palette } from "../game/palette";
import type { DialogueTone, NpcDef, NpcId } from "./types";

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
    spawnTx: 79,
    spawnTy: 38,
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
];

export const RELATIONSHIP_ACQUAINTANCE = 10;
export const RELATIONSHIP_GOOD = 20;
export const RELATIONSHIP_FRIEND = 40;
export const RELATIONSHIP_CLOSE = 70;
export const RELATIONSHIP_CRUSH = 75;

/** How you choose to speak — shown before other social actions. */
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
};
