import type { Dir } from "./types";
import type { PlayerLook } from "./character";
import { Palette } from "../game/palette";

export type AmbientVibe = "funny" | "charming" | "cute" | "rude";

/** Silly body reaction when a reply lands. */
export type AmbientAnim = "vibrate" | "pop" | "jump";

/** One player reply in an ambient back-and-forth. */
export interface AmbientChoice {
  id: string;
  label: string;
  playerLine: string;
  npcLines: string[];
  /** Silly body reaction when this reply lands. */
  anim?: AmbientAnim;
  /** Optional follow-up replies for another beat. */
  choices?: AmbientChoice[];
}

/** Opening line(s) + a small menu of funny responses. */
export interface AmbientBeat {
  open: string[];
  choices: AmbientChoice[];
}

export interface AmbientNpcDef {
  id: string;
  name: string;
  vibe: AmbientVibe;
  /** Random interactive chats - pick replies, get silly reactions. */
  chats: AmbientBeat[];
  look: PlayerLook;
  spawnTx: number;
  spawnTy: number;
  facing: Dir;
}

/**
 * Stationary street hangabouts. Pointless, delightful, and now mildly
 * conversational - reply menus, no relationships, all vibes.
 */
export const AMBIENT_NPCS: AmbientNpcDef[] = [
  {
    id: "nibs",
    name: "Nibs",
    vibe: "funny",
    facing: "down",
    spawnTx: 25,
    spawnTy: 10,
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
    chats: [
      {
        open: ["I named my left shoe Gordon. The right one is still deciding."],
        choices: [
          {
            id: "ask_right",
            label: "And the right?",
            playerLine: "What's the right one's name?",
            npcLines: ["Still in committee. Very political. Lots of laces."],
            anim: "pop",
            choices: [
              {
                id: "brenda",
                label: "Call it Brenda",
                playerLine: "Brenda. Final answer.",
                npcLines: [
                  "…Okay. Brenda it is.",
                  "You've changed fashion forever. Gordon is weeping proudly.",
                ],
                anim: "jump",
              },
              {
                id: "leave_unnamed",
                label: "Keep the mystery",
                playerLine: "Some shoes deserve anonymity.",
                npcLines: ["Deep. I'm putting that on a sock."],
                anim: "pop",
              },
            ],
          },
          {
            id: "salute",
            label: "Salute Gordon",
            playerLine: "Respect to Gordon. Solid name.",
            npcLines: ["He appreciates that. Heel click of honour."],
            anim: "jump",
          },
          {
            id: "roast_shoes",
            label: "Weird flex",
            playerLine: "Naming shoes is a cry for help.",
            npcLines: ["Rude. Accurate. Leave Gordon out of this."],
            anim: "vibrate",
          },
        ],
      },
      {
        open: [
          "Okay so hear me out.",
          "If bread is a carb and carbs are energy… sandwiches are batteries.",
        ],
        choices: [
          {
            id: "science",
            label: "Peer review: approve",
            playerLine: "Published. You're a genius.",
            npcLines: ["Thank you. My lab is a lunchbox."],
            anim: "jump",
          },
          {
            id: "counter",
            label: "What about wraps?",
            playerLine: "Where do wraps fit in this thesis?",
            npcLines: [
              "Portable power banks. Obviously.",
              "You're asking the right questions.",
            ],
            anim: "pop",
          },
          {
            id: "deny_science",
            label: "That's not science",
            playerLine: "That's vibes with breadcrumbs.",
            npcLines: ["Then vibes are peer-reviewed now. Cope."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "crumb",
    name: "Crumb",
    vibe: "cute",
    facing: "left",
    spawnTx: 37,
    spawnTy: 18,
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
    chats: [
      {
        open: ["Shh - I'm collecting nice pebbles. This one's shaped like a tiny loaf."],
        choices: [
          {
            id: "admire",
            label: "Gorgeous loaf",
            playerLine: "That pebble has bakery energy.",
            npcLines: ["Right?! I'm putting it in the VIP pocket."],
            anim: "pop",
            choices: [
              {
                id: "name_it",
                label: "Name it Sourdough",
                playerLine: "Sourdough Pebble. Limited edition.",
                npcLines: ["Official. Certificate pending. Drawn in crayon."],
                anim: "jump",
              },
            ],
          },
          {
            id: "trade",
            label: "Trade you a stick",
            playerLine: "I'll trade you this premium stick.",
            npcLines: ["…Deal. Capitalism, but whimsical."],
            anim: "jump",
          },
          {
            id: "mean",
            label: "It's just a rock",
            playerLine: "Crumb. It's a rock.",
            npcLines: ["And you're just a critic. Softer volume, please."],
            anim: "vibrate",
          },
        ],
      },
      {
        open: [
          "Do you think ants have favourite crumbs?",
          "I hope so. Everyone deserves a signature snack.",
        ],
        choices: [
          {
            id: "yes_ants",
            label: "Absolutely",
            playerLine: "Of course. Fancy ants demand fancy crumbs.",
            npcLines: ["I'm writing a cookbook for them. Tiny fonts."],
            anim: "pop",
          },
          {
            id: "offer_crumb",
            label: "Want my snack?",
            playerLine: "You can have the edge of my imaginary biscuit.",
            npcLines: ["Generosity unlocked. Ants will sing of you."],
            anim: "jump",
          },
        ],
      },
    ],
  },
  {
    id: "sprocket",
    name: "Sprocket",
    vibe: "funny",
    facing: "right",
    spawnTx: 61,
    spawnTy: 18,
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
    chats: [
      {
        open: ["I'm inventing a machine that peels bananas politely."],
        choices: [
          {
            id: "invest",
            label: "I'll invest",
            playerLine: "Take my imaginary money.",
            npcLines: [
              "Series A closed. Valuation: one high-five.",
              "Please don't sue if it peels you instead.",
            ],
            anim: "jump",
          },
          {
            id: "ask_please",
            label: "Does it say please?",
            playerLine: "Does the machine say please first?",
            npcLines: ["Obviously. Rude peelers get recalled."],
            anim: "pop",
          },
          {
            id: "doubt",
            label: "Sounds fake",
            playerLine: "That sounds like a hazard with manners.",
            npcLines: ["All innovation is a hazard with branding."],
            anim: "vibrate",
          },
        ],
      },
      {
        open: [
          "My hobby is timing how long toast takes to cool.",
          "Yesterday: forty-one seconds. Chaos.",
        ],
        choices: [
          {
            id: "data",
            label: "Share the spreadsheet",
            playerLine: "I need the full toast dataset.",
            npcLines: ["Columns: crunch, regret, butter delay. You're in."],
            anim: "pop",
          },
          {
            id: "forgot",
            label: "I forgot toast once",
            playerLine: "I once forgot the toast entirely.",
            npcLines: ["Pure data loss. Tragic. Beautiful. Same."],
            anim: "jump",
          },
        ],
      },
    ],
  },
  {
    id: "dusk",
    name: "Dusk",
    vibe: "charming",
    facing: "down",
    spawnTx: 89,
    spawnTy: 24,
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
    chats: [
      {
        open: [
          "The evening light on this street? Chef's kiss.",
          "You're part of the painting now.",
        ],
        choices: [
          {
            id: "blush",
            label: "Stop, I'm blushing",
            playerLine: "Okay that was unfairly poetic.",
            npcLines: ["Good. Poets ration fairness."],
            anim: "pop",
            choices: [
              {
                id: "pose",
                label: "Strike a pose",
                playerLine: "*poses like a lamppost with confidence*",
                npcLines: ["Masterpiece. Limited edition. Street-certified."],
                anim: "jump",
              },
            ],
          },
          {
            id: "borrow",
            label: "Can I borrow a sunset?",
            playerLine: "Any chance I can borrow one?",
            npcLines: ["No late fees. Only vibes. Return it by tomorrow's dusk."],
            anim: "jump",
          },
          {
            id: "too_much",
            label: "Bit much",
            playerLine: "You're laying it on thick.",
            npcLines: ["Thickness is my medium. Oil paint energy."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "pickle",
    name: "Pickle",
    vibe: "rude",
    facing: "up",
    spawnTx: 15,
    spawnTy: 46,
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
    chats: [
      {
        open: ["Nice outfit. Did a laundry basket lose a fight?"],
        choices: [
          {
            id: "clap_back",
            label: "Your hat lost harder",
            playerLine: "Bold words from a sentient jar.",
            npcLines: [
              "…Okay. That landed.",
              "Don't get used to me respecting you.",
            ],
            anim: "vibrate",
            choices: [
              {
                id: "truce",
                label: "Truce?",
                playerLine: "Truce. Mutual roasting rights.",
                npcLines: ["Fine. Temporary alliance. Don't smile about it."],
                anim: "pop",
              },
            ],
          },
          {
            id: "agree",
            label: "Fair",
            playerLine: "Yeah, fashion abandoned me.",
            npcLines: ["Honesty? Gross. Refreshing. Leave."],
            anim: "pop",
          },
          {
            id: "compliment",
            label: "You look great though",
            playerLine: "Meanwhile you look aggressively intentional.",
            npcLines: ["Flattery detected. Suspicious. Accepted."],
            anim: "jump",
          },
        ],
      },
      {
        open: [
          "Oh good. Another person with opinions.",
          "Fine. Say your thing. Quickly.",
        ],
        choices: [
          {
            id: "speedrun",
            label: "Hi. Bye.",
            playerLine: "Hi. Bye. Efficiency.",
            npcLines: ["…Respect. Get out of my sunlight."],
            anim: "pop",
          },
          {
            id: "essay",
            label: "Long speech incoming",
            playerLine: "So basically I think the town should-",
            npcLines: ["NOPE. Timer exploded. Conversation refunded."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "marzipan",
    name: "Marzipan",
    vibe: "charming",
    facing: "left",
    spawnTx: 29,
    spawnTy: 33,
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
    chats: [
      {
        open: [
          "You smell like adventure and slightly burnt toast.",
          "I mean that kindly.",
        ],
        choices: [
          {
            id: "take_kindly",
            label: "I'll take it",
            playerLine: "Burnt toast chic. New brand.",
            npcLines: ["Limited drop. You're wearing it well."],
            anim: "pop",
          },
          {
            id: "jam",
            label: "Spread me on a scone",
            playerLine: "If charm were jam…?",
            npcLines: [
              "I'd spread you on a scone.",
              "Too much? Perfect. I never measure.",
            ],
            anim: "jump",
            choices: [
              {
                id: "scone_yes",
                label: "Be the scone",
                playerLine: "I'll be the scone. Bold career move.",
                npcLines: ["Iconic. Crumbs of destiny everywhere."],
                anim: "jump",
              },
            ],
          },
          {
            id: "shower",
            label: "I showered!",
            playerLine: "Excuse you, I showered this week.",
            npcLines: ["And yet: toast notes. It's a gift."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "wisp",
    name: "Wisp",
    vibe: "cute",
    facing: "down",
    spawnTx: 68,
    spawnTy: 33,
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
    chats: [
      {
        open: ["I practiced being a ghost. Boo? …Okay, softer boo."],
        choices: [
          {
            id: "scared",
            label: "AH!",
            playerLine: "AH! Terrifying. 10/10.",
            npcLines: ["Really?! I'm putting that on my haunt résumé."],
            anim: "jump",
          },
          {
            id: "soft_boo",
            label: "Softer boo back",
            playerLine: "booo… (tiny)",
            npcLines: ["Perfect duet. We are a gentle haunting."],
            anim: "pop",
            choices: [
              {
                id: "quiet_friends",
                label: "Quiet friends?",
                playerLine: "Can we be quiet friends? Nod once.",
                npcLines: ["*nods*", "Deal sealed. Legends of silence."],
                anim: "pop",
              },
            ],
          },
          {
            id: "not_scared",
            label: "Not spooky",
            playerLine: "That was adorable, not scary.",
            npcLines: ["Rude to my brand. Accurate to my soul."],
            anim: "vibrate",
          },
        ],
      },
      {
        open: ["I brought imaginary cookies. Want one? Zero calories. Very crumbly."],
        choices: [
          {
            id: "eat",
            label: "Nom nom",
            playerLine: "*eats imaginary cookie with commitment*",
            npcLines: ["Crumbs everywhere. Spiritually."],
            anim: "jump",
          },
          {
            id: "politely",
            label: "One polite nibble",
            playerLine: "Just a polite nibble, thank you.",
            npcLines: ["Etiquette ghost. I love that."],
            anim: "pop",
          },
        ],
      },
    ],
  },
  {
    id: "boggle",
    name: "Boggle",
    vibe: "funny",
    facing: "right",
    spawnTx: 45,
    spawnTy: 46,
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
    chats: [
      {
        open: ["I lost an argument with a pigeon. It had better footnotes."],
        choices: [
          {
            id: "rematch",
            label: "Demand a rematch",
            playerLine: "Rematch. Best of three. Bring bread.",
            npcLines: ["Risky. Pigeons never forget a citation."],
            anim: "pop",
            choices: [
              {
                id: "forfeit",
                label: "Forfeit gracefully",
                playerLine: "On second thought, the bird won.",
                npcLines: ["Wise. I'll send a formal apology crumb."],
                anim: "jump",
              },
            ],
          },
          {
            id: "side_pigeon",
            label: "Side with the pigeon",
            playerLine: "I'm with the bird. It had sources.",
            npcLines: ["Betrayed by my own sidewalk. Classic."],
            anim: "vibrate",
          },
          {
            id: "highfive",
            label: "High-five instead",
            playerLine: "Forget pigeons. High-five?",
            npcLines: ["Yes. Soft slap of healing."],
            anim: "jump",
          },
        ],
      },
      {
        open: [
          "Currently accepting compliments, snacks, and duck conspiracies.",
          "The ducks know something. Look at their eyes.",
        ],
        choices: [
          {
            id: "duck_truth",
            label: "The ducks KNOW",
            playerLine: "I've seen it. The pond is a briefing room.",
            npcLines: ["FINALLY. Someone literate in waterfowl."],
            anim: "jump",
          },
          {
            id: "compliment",
            label: "You look sharp",
            playerLine: "You look like trouble with freckles.",
            npcLines: ["Accepted. Filing under snacks emotionally."],
            anim: "pop",
          },
        ],
      },
    ],
  },
  {
    id: "velvet",
    name: "Velvet",
    vibe: "charming",
    facing: "left",
    spawnTx: 81,
    spawnTy: 46,
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
    chats: [
      {
        open: ["Darling, the town's gossip is free, but my wink costs eye contact."],
        choices: [
          {
            id: "eye_contact",
            label: "Hold eye contact",
            playerLine: "*locks eyes like a legend*",
            npcLines: ["Paid in full. Here's your complimentary wink."],
            anim: "pop",
            choices: [
              {
                id: "encore",
                label: "Encore wink",
                playerLine: "One more. For science.",
                npcLines: ["Greedy. Charming. Approved."],
                anim: "jump",
              },
            ],
          },
          {
            id: "gossip",
            label: "Any free gossip?",
            playerLine: "Got a free sample of gossip?",
            npcLines: [
              "Someone named a shoe Gordon.",
              "That's all you're getting. I'm not a charity.",
            ],
            anim: "pop",
          },
          {
            id: "too_cool",
            label: "Look away coolly",
            playerLine: "*looks away, mysterious*",
            npcLines: ["Oh we're doing aloof? Fine. I'm better at it."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "grumble",
    name: "Grumble",
    vibe: "rude",
    facing: "down",
    spawnTx: 25,
    spawnTy: 54,
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
    chats: [
      {
        open: ["What. No. I wasn't waiting for anyone. Especially not you."],
        choices: [
          {
            id: "caught",
            label: "You WERE waiting",
            playerLine: "You totally were waiting.",
            npcLines: [
              "Prove it.",
              "…You can't. Because I have rights. And a scowl.",
            ],
            anim: "vibrate",
          },
          {
            id: "stay",
            label: "I'll stay anyway",
            playerLine: "Cool. I'll stand here cheerfully.",
            npcLines: ["…Fine. Stay. Don't look cheerful about it."],
            anim: "pop",
            choices: [
              {
                id: "smile",
                label: "Smile harder",
                playerLine: "*smiles with illegal brightness*",
                npcLines: ["I hate this. Emotionally. Stay forever."],
                anim: "jump",
              },
            ],
          },
          {
            id: "leave",
            label: "Okay bye",
            playerLine: "Alright, leaving your gloom bubble.",
            npcLines: ["Good. …Wait. I mean good. Leave."],
            anim: "pop",
          },
        ],
      },
    ],
  },
  {
    id: "pebble",
    name: "Pebble",
    vibe: "cute",
    facing: "up",
    spawnTx: 47,
    spawnTy: 63,
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
    chats: [
      {
        open: [
          "Want to hear my frog impression?",
          "Ribbit.",
          "Okay that's the whole show.",
        ],
        choices: [
          {
            id: "five_stars",
            label: "Five stars",
            playerLine: "Standing ovation. Encore ribbit?",
            npcLines: ["Ribbit (deluxe). Merch table is a leaf."],
            anim: "jump",
          },
          {
            id: "critique",
            label: "Needs more frog",
            playerLine: "Bold start. Thin middle. No third act.",
            npcLines: ["Critics. I'll croak about this later."],
            anim: "vibrate",
          },
          {
            id: "duet",
            label: "Ribbit back",
            playerLine: "Ribbit.",
            npcLines: ["DUET!!! We should tour ponds."],
            anim: "pop",
            choices: [
              {
                id: "band_name",
                label: "Band name: The Ribbits",
                playerLine: "We're called The Ribbits now.",
                npcLines: ["Sold out forever. Emotionally."],
                anim: "jump",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "zesty",
    name: "Zesty",
    vibe: "funny",
    facing: "right",
    spawnTx: 5,
    spawnTy: 21,
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
    chats: [
      {
        open: ["I put lemon on everything. Including conversations. Zing!"],
        choices: [
          {
            id: "zing_back",
            label: "Zing right back",
            playerLine: "ZANG. Citrus combat initiated.",
            npcLines: ["YES. Mouth-puckering friendship."],
            anim: "jump",
          },
          {
            id: "too_sour",
            label: "Too sour",
            playerLine: "I'm more of a mild banana person.",
            npcLines: ["Coward. Respectfully. Still zesty at you."],
            anim: "vibrate",
          },
          {
            id: "mailbox",
            label: "High-five a mailbox?",
            playerLine: "Is it weird to high-five a mailbox?",
            npcLines: [
              "Asking for a friend named me.",
              "The mailbox didn't high-five back. Still networking.",
            ],
            anim: "pop",
          },
        ],
      },
    ],
  },
  {
    id: "thimble",
    name: "Thimble",
    vibe: "cute",
    facing: "right",
    spawnTx: 24,
    spawnTy: 7,
    look: {
      sex: "girl",
      height: "short",
      build: "slim",
      face: "round",
      clothing: "cozy",
      hairStyle: "bun",
      skin: Palette.skin,
      hair: 0xc0554a,
      shirt: 0xffc8dd,
      pants: 0x6d6875,
    },
    chats: [
      {
        open: ["I'm knitting a scarf for a squirrel. Measurements pending."],
        choices: [
          {
            id: "help_measure",
            label: "I'll help measure",
            playerLine: "Need a tiny tape measure holder?",
            npcLines: ["Yes. Hold still. The squirrel is shy and judgmental."],
            anim: "pop",
            choices: [
              {
                id: "scarf_done",
                label: "It's couture",
                playerLine: "That scarf is runway-ready.",
                npcLines: ["Paris wishes. Acorn sponsorship pending."],
                anim: "jump",
              },
            ],
          },
          {
            id: "sock_art",
            label: "Saw your sock art",
            playerLine: "The tiny sock on the fence? Iconic.",
            npcLines: ["Installation title: Lost Softly. Please clap."],
            anim: "jump",
          },
          {
            id: "impatient",
            label: "Just freehand it",
            playerLine: "Skip measuring. Chaos knitting.",
            npcLines: ["Bold. Dangerous. The squirrel will sue."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "bramble",
    name: "Bramble",
    vibe: "rude",
    facing: "down",
    spawnTx: 33,
    spawnTy: 18,
    look: {
      sex: "enby",
      height: "tall",
      build: "average",
      face: "sharp",
      clothing: "casual",
      hairStyle: "wavy",
      skin: 0x8d5524,
      hair: 0x2f3a45,
      shirt: 0x588157,
      pants: 0x344e41,
    },
    chats: [
      {
        open: ["Touch my bushes and we have a problem. Look at them? Fine. Briefly."],
        choices: [
          {
            id: "admire_bush",
            label: "Nice bushes",
            playerLine: "Those are… assertive shrubs.",
            npcLines: ["Correct. They do push-ups. Emotionally."],
            anim: "pop",
          },
          {
            id: "directions",
            label: "Directions to café?",
            playerLine: "Which way to the café?",
            npcLines: [
              "Left. No - right. Actually, invent your own path.",
              "Builds character. Mostly mine.",
            ],
            anim: "vibrate",
            choices: [
              {
                id: "caught_lying",
                label: "You're lying",
                playerLine: "You're sending me into a hedge on purpose.",
                npcLines: ["And yet you're still talking to me. Curious."],
                anim: "pop",
              },
            ],
          },
          {
            id: "relocate",
            label: "I'll move",
            playerLine: "Sorry - relocating from your void patch.",
            npcLines: ["Appreciated. The nothing thanks you."],
            anim: "jump",
          },
        ],
      },
    ],
  },
  {
    id: "cello",
    name: "Cello",
    vibe: "charming",
    facing: "left",
    spawnTx: 53,
    spawnTy: 18,
    look: {
      sex: "boy",
      height: "tall",
      build: "slim",
      face: "soft",
      clothing: "fancy",
      hairStyle: "long",
      skin: Palette.skin2,
      hair: 0x3e2723,
      shirt: 0xcdb4db,
      pants: 0x22223b,
    },
    chats: [
      {
        open: [
          "I hum in public so the town has a soundtrack.",
          "You're the percussion - footsteps count.",
        ],
        choices: [
          {
            id: "stomp",
            label: "Stomp the beat",
            playerLine: "*stomps a tiny rhythm*",
            npcLines: ["Yes! Bridge into chorus. The pavement approves."],
            anim: "jump",
          },
          {
            id: "shush",
            label: "A bit loud",
            playerLine: "Love the energy. Neighbours might not.",
            npcLines: ["Artists are used to heartbreak. And noise complaints."],
            anim: "vibrate",
          },
          {
            id: "rest_note",
            label: "Favourite rest note?",
            playerLine: "Is this corner your favourite rest note?",
            npcLines: ["It is. Stay for the fermata."],
            anim: "pop",
          },
        ],
      },
    ],
  },
  {
    id: "fig",
    name: "Fig",
    vibe: "funny",
    facing: "up",
    spawnTx: 73,
    spawnTy: 18,
    look: {
      sex: "girl",
      height: "average",
      build: "stocky",
      face: "freckled",
      clothing: "sporty",
      hairStyle: "short",
      skin: 0xffe0bd,
      hair: 0x5aaa9a,
      shirt: 0x90be6d,
      pants: 0x577590,
    },
    chats: [
      {
        open: ["I tried to start a fruit-based religion. The bananas formed a union."],
        choices: [
          {
            id: "join_union",
            label: "Solidarity",
            playerLine: "Solidarity with the bananas.",
            npcLines: ["They demand better bunch conditions. Fair."],
            anim: "pop",
            choices: [
              {
                id: "convert",
                label: "Convert me",
                playerLine: "Baptise me in smoothie.",
                npcLines: ["Dip complete. Go forth and snack."],
                anim: "jump",
              },
            ],
          },
          {
            id: "watermelon",
            label: "Watermelon story?",
            playerLine: "Any other fruit beef?",
            npcLines: [
              "Lost a staring contest to a watermelon.",
              "It didn't blink. Absolute unit.",
            ],
            anim: "vibrate",
          },
          {
            id: "snack",
            label: "Snack break forever",
            playerLine: "Snack break is a lifestyle.",
            npcLines: ["PREACH. Calendar? Never heard of her."],
            anim: "jump",
          },
        ],
      },
    ],
  },
  {
    id: "mirage",
    name: "Mirage",
    vibe: "charming",
    facing: "down",
    spawnTx: 89,
    spawnTy: 10,
    look: {
      sex: "enby",
      height: "average",
      build: "slim",
      face: "soft",
      clothing: "fancy",
      hairStyle: "cap",
      skin: 0xc68642,
      hair: 0xe8899a,
      shirt: 0xffcad4,
      pants: 0x4a4e69,
    },
    chats: [
      {
        open: ["Am I real, or a heat shimmer with good taste? Don't answer. Mystery sells."],
        choices: [
          {
            id: "fortune",
            label: "Read my fortune",
            playerLine: "Read my sidewalk cracks, oracle.",
            npcLines: [
              "Mild chaos. Excellent snacks.",
              "Also a duck. Ignore the duck. Or don't.",
            ],
            anim: "pop",
            choices: [
              {
                id: "duck",
                label: "Explain the duck",
                playerLine: "I need the duck lore.",
                npcLines: ["No. The duck explains you. Spooky."],
                anim: "vibrate",
              },
            ],
          },
          {
            id: "wave",
            label: "Just wave",
            playerLine: "*waves at the shimmer*",
            npcLines: ["Caught. Or not. Waving is freer than answers."],
            anim: "jump",
          },
          {
            id: "poke",
            label: "Poke the mystery",
            playerLine: "I'm poking the fourth wall. Softly.",
            npcLines: ["Ow. Existential bruise. Worth it."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "clank",
    name: "Clank",
    vibe: "funny",
    facing: "left",
    spawnTx: 89,
    spawnTy: 37,
    look: {
      sex: "boy",
      height: "short",
      build: "stocky",
      face: "round",
      clothing: "sporty",
      hairStyle: "cap",
      skin: Palette.skin,
      hair: 0x8d5a3b,
      shirt: 0xadb5bd,
      pants: 0x495057,
    },
    chats: [
      {
        open: [
          "I collect interesting noises.",
          "That footstep? Mid. Your laugh? Archive material.",
        ],
        choices: [
          {
            id: "laugh",
            label: "Ha ha HA",
            playerLine: "HA HA HA (for the archives)",
            npcLines: ["Sampled. Looping forever in my brain attic."],
            anim: "jump",
          },
          {
            id: "robot",
            label: "How's Me 2.0?",
            playerLine: "How's the complaining robot?",
            npcLines: [
              "Funding: vibes and loose screws.",
              "Personality: already too much like me.",
            ],
            anim: "pop",
          },
          {
            id: "rattle",
            label: "I rattle",
            playerLine: "If I rattle, am I broken or festive?",
            npcLines: ["Festive. Always festive. Broken is a mindset."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "moss",
    name: "Moss",
    vibe: "cute",
    facing: "right",
    spawnTx: 5,
    spawnTy: 37,
    look: {
      sex: "enby",
      height: "short",
      build: "average",
      face: "soft",
      clothing: "cozy",
      hairStyle: "wavy",
      skin: 0x8d5524,
      hair: 0x40916c,
      shirt: 0x95d5b2,
      pants: 0x2d6a4f,
    },
    chats: [
      {
        open: ["I water the cracks in the pavement. Someone has to believe in them."],
        choices: [
          {
            id: "believe",
            label: "I believe",
            playerLine: "Grow, little weeds. Grow.",
            npcLines: ["They heard you. Tiny cheer from the asphalt."],
            anim: "pop",
            choices: [
              {
                id: "lichen",
                label: "Meet your lichen?",
                playerLine: "Can I meet the lichen?",
                npcLines: [
                  "It's shy. Lives on that rock.",
                  "Wave from here. Boundaries matter.",
                ],
                anim: "jump",
              },
            ],
          },
          {
            id: "green",
            label: "Green is a personality",
            playerLine: "Green is a personality and you're thriving.",
            npcLines: ["Slowly. Like moss. Best pace."],
            anim: "jump",
          },
          {
            id: "skeptic",
            label: "It's just dirt",
            playerLine: "It's just dirt in a crack.",
            npcLines: ["And you're just a temporary arrangement of hope. Hush."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "drizzle",
    name: "Drizzle",
    vibe: "charming",
    facing: "up",
    spawnTx: 16,
    spawnTy: 44,
    look: {
      sex: "girl",
      height: "tall",
      build: "slim",
      face: "soft",
      clothing: "casual",
      hairStyle: "long",
      skin: Palette.skin2,
      hair: 0x4a6fa5,
      shirt: 0xa8dadc,
      pants: 0x457b9d,
    },
    chats: [
      {
        open: [
          "I rate puddles.",
          "That one? A soft 7. Reflective, but emotionally unavailable.",
        ],
        choices: [
          {
            id: "rate_me",
            label: "Rate me as a puddle",
            playerLine: "Be honest. Puddle score?",
            npcLines: ["A 9. Splash potential: elite. Depth: mysterious."],
            anim: "pop",
          },
          {
            id: "umbrella",
            label: "Umbrella for aesthetic",
            playerLine: "I carry an umbrella for the look.",
            npcLines: ["Weather optional. Taste mandatory. Icon."],
            anim: "jump",
          },
          {
            id: "hate_rain",
            label: "Rain is rude",
            playerLine: "Rain ruins my hair and my plans.",
            npcLines: ["Hair gives up. Shoes confess secrets. It's honest."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "huff",
    name: "Huff",
    vibe: "rude",
    facing: "right",
    spawnTx: 40,
    spawnTy: 44,
    look: {
      sex: "boy",
      height: "average",
      build: "stocky",
      face: "sharp",
      clothing: "casual",
      hairStyle: "short",
      skin: 0xc68642,
      hair: 0x1b1b1b,
      shirt: 0xe76f51,
      pants: 0x264653,
    },
    chats: [
      {
        open: ["Whatever you're selling, I'm not buying. Especially optimism."],
        choices: [
          {
            id: "sell_doom",
            label: "Selling doom?",
            playerLine: "What if I'm selling premium doom?",
            npcLines: [
              "…Go on.",
              "No. Still no. But I listened. That's worse.",
            ],
            anim: "vibrate",
          },
          {
            id: "nice_day",
            label: "Nice day!",
            playerLine: "Nice day, huh?",
            npcLines: ["Disagree. Next question."],
            anim: "vibrate",
            choices: [
              {
                id: "next_q",
                label: "Why the sigh?",
                playerLine: "Why the industrial-strength sigh?",
                npcLines: ["Earned. Birds are unionising. Don't smile."],
                anim: "pop",
              },
            ],
          },
          {
            id: "agree_gloom",
            label: "Gloom buddy",
            playerLine: "I'm also closed for joy. Soft launch.",
            npcLines: ["…Fine. Sit in the gloom. No eye contact."],
            anim: "pop",
          },
        ],
      },
    ],
  },
  {
    id: "pippit",
    name: "Pippit",
    vibe: "cute",
    facing: "down",
    spawnTx: 60,
    spawnTy: 44,
    look: {
      sex: "girl",
      height: "short",
      build: "slim",
      face: "freckled",
      clothing: "cozy",
      hairStyle: "short",
      skin: 0xffe0bd,
      hair: 0xf4a261,
      shirt: 0xffef9f,
      pants: 0xbc6c25,
    },
    chats: [
      {
        open: ["I taught a sparrow my phone number. It hasn't called. Ghosted by nature."],
        choices: [
          {
            id: "chirp",
            label: "Chirp solidarity",
            playerLine: "Chirp. Snacks fix most problems.",
            npcLines: ["CHIRP. Treaty signed in crumbs."],
            anim: "jump",
          },
          {
            id: "crumb_trail",
            label: "Crumb trail tip",
            playerLine: "Leave a crumb trail home when dramatic.",
            npcLines: [
              "I already do. Works 60% of the time, every time.",
              "The other 40% I invent new landmarks.",
            ],
            anim: "pop",
          },
          {
            id: "tough_love",
            label: "Birds are flaky",
            playerLine: "Birds are flaky. Get a pen pal rock.",
            npcLines: ["Harsh. The rock wouldn't ghost me… probably."],
            anim: "vibrate",
          },
        ],
      },
    ],
  },
  {
    id: "folio",
    name: "Folio",
    vibe: "charming",
    facing: "left",
    spawnTx: 73,
    spawnTy: 44,
    look: {
      sex: "enby",
      height: "average",
      build: "average",
      face: "sharp",
      clothing: "fancy",
      hairStyle: "bun",
      skin: Palette.skin,
      hair: 0x6b4226,
      shirt: 0xd4a373,
      pants: 0x3c2f2f,
    },
    chats: [
      {
        open: [
          "I'm outlining a novel where the protagonist never leaves this sidewalk.",
          "Riveting.",
        ],
        choices: [
          {
            id: "chapter",
            label: "I'm chapter one",
            playerLine: "A stranger approaches…",
            npcLines: [
              "Chapter two: they say something ordinary.",
              "Chapter three: I pretend it was profound. Standing ovation.",
            ],
            anim: "pop",
            choices: [
              {
                id: "twist",
                label: "Plot twist me",
                playerLine: "Twist: I was interesting all along.",
                npcLines: ["Borrowed ending. Critics weep. I keep the royalties."],
                anim: "jump",
              },
            ],
          },
          {
            id: "boring",
            label: "Sounds boring",
            playerLine: "That sounds aggressively uneventful.",
            npcLines: ["Uneventful is the new literary. Cope, darling."],
            anim: "vibrate",
          },
          {
            id: "agent",
            label: "I'll be your agent",
            playerLine: "I'll represent the sidewalk saga.",
            npcLines: ["15%. Paid in compliments and pastries."],
            anim: "jump",
          },
        ],
      },
    ],
  },
  {
    id: "nudge",
    name: "Nudge",
    vibe: "funny",
    facing: "up",
    spawnTx: 24,
    spawnTy: 59,
    look: {
      sex: "boy",
      height: "average",
      build: "slim",
      face: "round",
      clothing: "sporty",
      hairStyle: "wavy",
      skin: 0x8d5524,
      hair: 0xffd166,
      shirt: 0xef476f,
      pants: 0x073b4c,
    },
    chats: [
      {
        open: ["I dare you to walk normally now that I mentioned walking. Gotcha."],
        choices: [
          {
            id: "moonwalk",
            label: "Moonwalk away",
            playerLine: "*moonwalks with commitment*",
            npcLines: ["CHEATING. Beautiful cheating. 10 points."],
            anim: "jump",
          },
          {
            id: "frozen",
            label: "Freeze in place",
            playerLine: "I can never walk again. Thanks.",
            npcLines: ["My work here is done. Chaos seeded."],
            anim: "vibrate",
          },
          {
            id: "doorway",
            label: "Tuesday doorways?",
            playerLine: "Are doorways shorter on Tuesdays?",
            npcLines: [
              "Conspiracy confirmed. I duck just in case.",
              "Dignity optional. Craniums are not.",
            ],
            anim: "pop",
            choices: [
              {
                id: "duck_with",
                label: "Duck with me",
                playerLine: "*ducks under nothing*",
                npcLines: ["Fourth wall poked. Softly. It's shy."],
                anim: "jump",
              },
            ],
          },
        ],
      },
    ],
  },
];

export const ambientNpcById: Record<string, AmbientNpcDef> = Object.fromEntries(
  AMBIENT_NPCS.map((n) => [n.id, n]),
);

export function isAmbientNpcId(id: string): boolean {
  return id in ambientNpcById;
}

export function randomAmbientBeat(def: AmbientNpcDef): AmbientBeat {
  return def.chats[Math.floor(Math.random() * def.chats.length)]!;
}
