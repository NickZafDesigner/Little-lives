import type { Dir } from "./types";
import type { PlayerLook } from "./character";
import { Palette } from "../game/palette";

export type AmbientVibe = "funny" | "charming" | "cute" | "rude";

export interface AmbientNpcDef {
  id: string;
  name: string;
  vibe: AmbientVibe;
  /** One-shot lines — talk once, no menu, no relationship. */
  lines: string[];
  look: PlayerLook;
  spawnTx: number;
  spawnTy: number;
  facing: Dir;
}

/**
 * Stationary street hangabouts. Cute noise in the town — chat for a line, then done.
 * Spawn tiles sit on outdoor paths (not inside lots).
 */
export const AMBIENT_NPCS: AmbientNpcDef[] = [
  {
    id: "nibs",
    name: "Nibs",
    vibe: "funny",
    facing: "down",
    spawnTx: 19,
    spawnTy: 8,
    look: {
      sex: "enby",
      height: "short",
      build: "stocky",
      face: "round",
      clothing: "cozy",
      hairStyle: "bun",
      skin: Palette.skin,
      hair: 0xe8899a,
      shirt: 0xffb4c8,
      pants: 0x7a5c8c,
    },
    lines: [
      "I named my left shoe Gordon. The right one is still deciding.",
      "If bread is a carb and carbs are energy, then sandwiches are batteries. Science.",
      "I practiced waving at clouds. Two waved back. Don't ruin this for me.",
    ],
  },
  {
    id: "crumb",
    name: "Crumb",
    vibe: "cute",
    facing: "left",
    spawnTx: 28,
    spawnTy: 14,
    look: {
      sex: "girl",
      height: "short",
      build: "slim",
      face: "freckled",
      clothing: "casual",
      hairStyle: "wavy",
      skin: 0xffe0bd,
      hair: 0xe8b73c,
      shirt: 0xffd166,
      pants: 0x5b6b8c,
    },
    lines: [
      "Shh — I'm collecting nice pebbles. This one's shaped like a tiny loaf.",
      "Do you think ants have favourite crumbs? I hope so.",
      "I said hi to a beetle and it ignored me. Rude? Or mysterious. I'm going mysterious.",
    ],
  },
  {
    id: "sprocket",
    name: "Sprocket",
    vibe: "funny",
    facing: "right",
    spawnTx: 46,
    spawnTy: 14,
    look: {
      sex: "boy",
      height: "tall",
      build: "slim",
      face: "sharp",
      clothing: "sporty",
      hairStyle: "short",
      skin: Palette.skin2,
      hair: 0x2f3a45,
      shirt: 0x54a597,
      pants: 0x4a5560,
    },
    lines: [
      "I'm inventing a machine that peels bananas politely.",
      "My hobby is timing how long it takes for toast to cool. It's chaotic.",
      "If anyone needs a wrench, I have seventeen. Emotionally.",
    ],
  },
  {
    id: "dusk",
    name: "Dusk",
    vibe: "charming",
    facing: "down",
    spawnTx: 67,
    spawnTy: 18,
    look: {
      sex: "enby",
      height: "average",
      build: "average",
      face: "soft",
      clothing: "fancy",
      hairStyle: "long",
      skin: 0xc68642,
      hair: 0x5aaa9a,
      shirt: 0xb9a6e6,
      pants: 0x4e3a5c,
    },
    lines: [
      "The evening light on this street? Chef's kiss. You're part of the painting now.",
      "I collect sunsets. Can't fit them in a pocket, so I stand here instead.",
      "You have excellent timing. The breeze just got complimentary.",
    ],
  },
  {
    id: "pickle",
    name: "Pickle",
    vibe: "rude",
    facing: "up",
    spawnTx: 11,
    spawnTy: 35,
    look: {
      sex: "boy",
      height: "average",
      build: "stocky",
      face: "sharp",
      clothing: "casual",
      hairStyle: "cap",
      skin: Palette.skin,
      hair: 0x8d5a3b,
      shirt: 0xc0554a,
      pants: 0x3d4a3a,
    },
    lines: [
      "Nice outfit. Did a laundry basket lose a fight?",
      "Oh good, another person with opinions. The street was almost peaceful.",
      "Don't trip on my vibe. It's load-bearing.",
    ],
  },
  {
    id: "marzipan",
    name: "Marzipan",
    vibe: "charming",
    facing: "left",
    spawnTx: 22,
    spawnTy: 25,
    look: {
      sex: "girl",
      height: "tall",
      build: "slim",
      face: "soft",
      clothing: "fancy",
      hairStyle: "bun",
      skin: 0x8d5524,
      hair: 0x2f3a45,
      shirt: 0xf49ab6,
      pants: 0x5c3d55,
    },
    lines: [
      "You smell like adventure and slightly burnt toast. I mean that kindly.",
      "If charm were jam, I'd spread you on a scone. Too much? Perfect.",
      "Stay a second — the street looks better with you in it.",
    ],
  },
  {
    id: "wisp",
    name: "Wisp",
    vibe: "cute",
    facing: "down",
    spawnTx: 51,
    spawnTy: 25,
    look: {
      sex: "enby",
      height: "short",
      build: "slim",
      face: "round",
      clothing: "cozy",
      hairStyle: "short",
      skin: Palette.skin2,
      hair: 0xe8899a,
      shirt: 0xbedcf7,
      pants: 0x7a8fa8,
    },
    lines: [
      "I practiced being a ghost. Boo? …Okay, softer boo.",
      "Can we be quiet friends? I'll nod. You can nod back. Deal sealed.",
      "I brought imaginary cookies. Want one? They're zero calories and very crumbly.",
    ],
  },
  {
    id: "boggle",
    name: "Boggle",
    vibe: "funny",
    facing: "right",
    spawnTx: 34,
    spawnTy: 35,
    look: {
      sex: "boy",
      height: "short",
      build: "average",
      face: "freckled",
      clothing: "sporty",
      hairStyle: "short",
      skin: 0xffe0bd,
      hair: 0xc0554a,
      shirt: 0x7ec8e3,
      pants: 0x3a5a40,
    },
    lines: [
      "I lost an argument with a pigeon. It had better footnotes.",
      "Currently accepting compliments, snacks, and conspiracy theories about ducks.",
      "My posture coach is a lamppost. Harsh, but fair.",
    ],
  },
  {
    id: "velvet",
    name: "Velvet",
    vibe: "charming",
    facing: "left",
    spawnTx: 61,
    spawnTy: 35,
    look: {
      sex: "girl",
      height: "average",
      build: "average",
      face: "soft",
      clothing: "fancy",
      hairStyle: "wavy",
      skin: Palette.skin,
      hair: 0x5c3d2e,
      shirt: 0xd4708f,
      pants: 0x2f3a45,
    },
    lines: [
      "Darling, the town's gossip is free, but my wink costs eye contact.",
      "You're glowing. Hydration? Heartbreak? Either way, stunning.",
      "Walk past again later — I ration my best hellos.",
    ],
  },
  {
    id: "grumble",
    name: "Grumble",
    vibe: "rude",
    facing: "down",
    spawnTx: 19,
    spawnTy: 41,
    look: {
      sex: "enby",
      height: "tall",
      build: "stocky",
      face: "sharp",
      clothing: "casual",
      hairStyle: "short",
      skin: 0xc68642,
      hair: 0x3e2723,
      shirt: 0x6b5b4a,
      pants: 0x3a332c,
    },
    lines: [
      "What. No. I wasn't waiting for anyone. Especially not you.",
      "The pavement's busy. Emotionally. Move along.",
      "If you're selling joy, I'm closed. Forever. Soft launch: forever.",
    ],
  },
  {
    id: "pebble",
    name: "Pebble",
    vibe: "cute",
    facing: "up",
    spawnTx: 35,
    spawnTy: 49,
    look: {
      sex: "girl",
      height: "short",
      build: "average",
      face: "round",
      clothing: "cozy",
      hairStyle: "cap",
      skin: 0x8d5524,
      hair: 0x8d5a3b,
      shirt: 0x8ec44f,
      pants: 0x5a6b4a,
    },
    lines: [
      "I made a leaf hat for a worm. Fashion is for everyone.",
      "Want to hear my frog impression? Ribbit. Okay that's the whole show.",
      "You're my third favourite person today. Second is a cloud. First is lunch.",
    ],
  },
  {
    id: "zesty",
    name: "Zesty",
    vibe: "funny",
    facing: "right",
    spawnTx: 4,
    spawnTy: 16,
    look: {
      sex: "enby",
      height: "average",
      build: "slim",
      face: "freckled",
      clothing: "sporty",
      hairStyle: "long",
      skin: Palette.skin,
      hair: 0xe8b73c,
      shirt: 0xff9f43,
      pants: 0x2d3436,
    },
    lines: [
      "I put lemon on everything. Including conversations. Zing!",
      "Is it weird to high-five a mailbox? Asking for a friend named me.",
      "My life coach is a seagull. Harsh feedback. Great energy.",
    ],
  },
];

export const ambientNpcById: Record<string, AmbientNpcDef> = Object.fromEntries(
  AMBIENT_NPCS.map((n) => [n.id, n]),
);

export function isAmbientNpcId(id: string): boolean {
  return id in ambientNpcById;
}

export function randomAmbientLine(def: AmbientNpcDef): string {
  return def.lines[Math.floor(Math.random() * def.lines.length)]!;
}
