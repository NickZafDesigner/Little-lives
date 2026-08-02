import type { DialogueTone, NpcId } from "./types";

export type ChatNpcId = Exclude<NpcId, "player">;

export interface ChatChoice {
  id: string;
  /** Button label shown to the player. */
  label: string;
  /** Spoken by the player when picked. */
  playerLine: string;
  /** Friendship change when this choice is picked. */
  affinity?: number;
  /** Next node id, or null to end after the player line. */
  next: string | null;
  /** Hide until relationship score reaches this. */
  minScore?: number;
}

export interface ChatNode {
  id: string;
  /** Lines the NPC speaks when entering this node. */
  npcLines: string[];
  choices?: ChatChoice[];
}

export interface ChatScript {
  npcId: ChatNpcId;
  start: string;
  nodes: Record<string, ChatNode>;
}

type ToneLines = Record<DialogueTone, string[]>;

const LINES: Record<ChatNpcId, ToneLines> = {
  mabel: {
    friendly: [
      "Oh honey, come in - kettle's on!",
      "You always brighten my kitchen.",
    ],
    polite: [
      "How thoughtful of you to stop by.",
      "Please, make yourself at home.",
    ],
    flirty: [
      "My, aren't you sweet today… careful, I might bake you a tart.",
      "Flattery will get you cookies, you know.",
    ],
    rude: [
      "Well! Someone woke up on the wrong side of the bed.",
      "Hmm. The oven's warmer than you right now.",
    ],
  },
  jun: {
    friendly: [
      "Hey! Perfect timing - fresh pour-over?",
      "Always good to see a familiar face.",
    ],
    polite: [
      "Welcome in. What can I get started for you?",
      "Appreciate the courtesy - rare these days!",
    ],
    flirty: [
      "Is it warm in here, or is that just you?",
      "Careful - charm like that gets free foam art.",
    ],
    rude: [
      "Whoa. Save the attitude for the espresso machine.",
      "Okay then. One black coffee, hold the manners.",
    ],
  },
  pip: {
    friendly: [
      "Hi hi! The flowers are gossiping about you.",
      "Wanna skip stones later?",
    ],
    polite: [
      "Oh! Hello. The park thanks you for visiting.",
      "Such nice manners - even the ducks approve.",
    ],
    flirty: [
      "Hehe - are you flirting with me or the sunflowers?",
      "Stop that, you're making me blush greener.",
    ],
    rude: [
      "Rude! Even the weeds have better manners.",
      "Oof. Did a goose teach you to talk?",
    ],
  },
  vera: {
    friendly: [
      "Customer and friend - my favorite combo.",
      "Got a deal with your name on it.",
    ],
    polite: [
      "Good day. Browsing or buying?",
      "I respect a civil shopper.",
    ],
    flirty: [
      "Smooth talk won't discount the jam… much.",
      "Charm's cute. Coin's cuter.",
    ],
    rude: [
      "Out. Or buy something. Preferably both quieter.",
      "I don't stock patience, dear.",
    ],
  },
  theo: {
    friendly: [
      "Shh -  oh, it's you. Hello.",
      "I set aside a book I thought you'd like.",
    ],
    polite: [
      "Welcome to the stacks. Please keep your voice soft.",
      "A courteous visitor. Refreshing.",
    ],
    flirty: [
      "I… um. The romance shelf is that way.",
      "Please don't wink at the quiet-hours sign.",
    ],
    rude: [
      "That tone doesn't belong in a library.",
      "Volume down. Attitude lower.",
    ],
  },
  sage: {
    friendly: [
      "Good to see you upright and smiling.",
      "How are you feeling today - honestly?",
    ],
    polite: [
      "Please, have a seat. I'm glad you came by.",
      "Courtesy is its own kind of medicine.",
    ],
    flirty: [
      "Flirting in a clinic? Bold. Hydrate first.",
      "Pulse is fine. Your delivery is… elevated.",
    ],
    rude: [
      "Bedside manner goes both ways.",
      "I treat patients, not tempers. Soften up.",
    ],
  },
};

/** Branching chats - player choices build (or bruise) the relationship. */
export const CHAT_SCRIPTS: Record<ChatNpcId, ChatScript> = {
  mabel: {
    npcId: "mabel",
    start: "hello",
    nodes: {
      hello: {
        id: "hello",
        npcLines: [
          "Well look who wandered into my kitchen!",
          "Sit a spell - what's on your mind, dear?",
        ],
        choices: [
          {
            id: "ask_day",
            label: "How's your day?",
            playerLine: "How's your day going, Mabel?",
            affinity: 6,
            next: "day",
          },
          {
            id: "ask_bake",
            label: "What are you baking?",
            playerLine: "Something smells amazing - what are you baking?",
            affinity: 8,
            next: "bake",
          },
          {
            id: "tease",
            label: "Steal a cookie?",
            playerLine: "If I steal a cookie, do I still get tea?",
            affinity: 3,
            next: "tease",
          },
          {
            id: "leave",
            label: "Just saying hi",
            playerLine: "Just popping in to say hi - talk soon!",
            affinity: 2,
            next: null,
          },
        ],
      },
      day: {
        id: "day",
        npcLines: [
          "Busy in the best way - dough rising, kettle singing.",
          "Though I could use a hand tasting the jam… for science.",
        ],
        choices: [
          {
            id: "offer_help",
            label: "I'll taste-test!",
            playerLine: "I volunteer as tribute. Spoon ready.",
            affinity: 10,
            next: "warm",
          },
          {
            id: "encourage",
            label: "You've got this",
            playerLine: "Sounds like you've got it under control.",
            affinity: 5,
            next: "warm",
          },
          {
            id: "busy",
            label: "I should run",
            playerLine: "Wish I could stay - next time for sure.",
            affinity: 1,
            next: null,
          },
        ],
      },
      bake: {
        id: "bake",
        npcLines: [
          "Lemon thyme shortbread. Secret's a pinch of patience.",
          "And not opening the oven every thirty seconds. Ask me how I know.",
        ],
        choices: [
          {
            id: "curious",
            label: "Teach me sometime?",
            playerLine: "Would you teach me a recipe sometime?",
            affinity: 12,
            next: "warm",
            minScore: 15,
          },
          {
            id: "compliments",
            label: "You're the best baker",
            playerLine: "Town's luckiest to have your oven.",
            affinity: 8,
            next: "warm",
          },
          {
            id: "bye_bake",
            label: "Save me one!",
            playerLine: "Save me a corner piece - the crispy one!",
            affinity: 6,
            next: null,
          },
        ],
      },
      tease: {
        id: "tease",
        npcLines: [
          "Ha! Bold. The jar's watching you.",
          "One cookie. And you wash a dish. Deal?",
        ],
        choices: [
          {
            id: "deal",
            label: "Deal!",
            playerLine: "Deal. Cookie first, then dishes - priorities.",
            affinity: 9,
            next: "warm",
          },
          {
            id: "chicken",
            label: "On second thought…",
            playerLine: "On second thought, I'll earn it properly.",
            affinity: 4,
            next: "warm",
          },
        ],
      },
      warm: {
        id: "warm",
        npcLines: [
          "You're good company, you know that?",
          "Come back whenever the world feels too loud. Door's open.",
        ],
        choices: [
          {
            id: "thanks",
            label: "Thanks, Mabel",
            playerLine: "Thanks, Mabel. That means a lot.",
            affinity: 7,
            next: null,
          },
          {
            id: "hug",
            label: "Group hug (with the oven)",
            playerLine: "Group hug - you, me, and the warm oven.",
            affinity: 9,
            next: null,
            minScore: 25,
          },
        ],
      },
    },
  },

  jun: {
    npcId: "jun",
    start: "hello",
    nodes: {
      hello: {
        id: "hello",
        npcLines: [
          "Hey! Pull up a stool - steam's on me.",
          "What's the vibe today?",
        ],
        choices: [
          {
            id: "coffee_talk",
            label: "Recommend a drink",
            playerLine: "Surprise me - what should I drink?",
            affinity: 7,
            next: "drink",
          },
          {
            id: "shift",
            label: "How's the café?",
            playerLine: "How's the rush treating you?",
            affinity: 6,
            next: "cafe",
          },
          {
            id: "flirt_light",
            label: "You look good today",
            playerLine: "Not gonna lie - that apron is working for you.",
            affinity: 5,
            next: "flirt",
          },
          {
            id: "leave",
            label: "Just passing through",
            playerLine: "Just waving hello - catch you on the flip!",
            affinity: 2,
            next: null,
          },
        ],
      },
      drink: {
        id: "drink",
        npcLines: [
          "Oat lavender latte. Floral, cozy, slightly chaotic - like this town.",
          "Unless you want rocket fuel. Then espresso, no mercy.",
        ],
        choices: [
          {
            id: "lavender",
            label: "Lavender, please",
            playerLine: "Lavender latte. Lean into cozy.",
            affinity: 8,
            next: "bond",
          },
          {
            id: "rocket",
            label: "Rocket fuel",
            playerLine: "Espresso. Make it mean.",
            affinity: 7,
            next: "bond",
          },
        ],
      },
      cafe: {
        id: "cafe",
        npcLines: [
          "Morning rush was a blur - someone ordered 'the vibe.'",
          "I gave them a smile and a cappuccino. Nailed it.",
        ],
        choices: [
          {
            id: "laugh",
            label: "That's so Jun",
            playerLine: "Only you could fulfill a vibe order.",
            affinity: 9,
            next: "bond",
          },
          {
            id: "help",
            label: "Need an extra hand?",
            playerLine: "If you ever need backup on the counter, I'm around.",
            affinity: 10,
            next: "bond",
          },
        ],
      },
      flirt: {
        id: "flirt",
        npcLines: [
          "Ohhh? Foam heart incoming - don't melt.",
          "Keep talking like that and I'll rename the special after you.",
        ],
        choices: [
          {
            id: "play",
            label: "I'll take that deal",
            playerLine: "Deal. Make it iced so I stay cool.",
            affinity: 10,
            next: "bond",
          },
          {
            id: "shy",
            label: "Too smooth!",
            playerLine: "Okay okay - you're smoother than the foam.",
            affinity: 6,
            next: "bond",
          },
        ],
      },
      bond: {
        id: "bond",
        npcLines: [
          "For real though - I like when you stop by.",
          "Café feels more like a hangout than a job then.",
        ],
        choices: [
          {
            id: "same",
            label: "Same here",
            playerLine: "Same. You're a big part of why I come in.",
            affinity: 8,
            next: null,
          },
          {
            id: "later",
            label: "Hang after close?",
            playerLine: "We should hang after close sometime - no espresso required.",
            affinity: 11,
            next: null,
            minScore: 20,
          },
        ],
      },
    },
  },

  pip: {
    npcId: "pip",
    start: "hello",
    nodes: {
      hello: {
        id: "hello",
        npcLines: [
          "Hi hi! You're just in time - the ducks are holding court.",
          "Wanna join the park committee? Membership is free. Payment is giggles.",
        ],
        choices: [
          {
            id: "nature",
            label: "Show me something cool",
            playerLine: "Show me the coolest thing in the park right now!",
            affinity: 8,
            next: "cool",
          },
          {
            id: "feel",
            label: "How are you?",
            playerLine: "How are you doing, Pip? Really.",
            affinity: 7,
            next: "feel",
          },
          {
            id: "race",
            label: "Race you to the pond!",
            playerLine: "Race you to the pond - loser feeds the ducks!",
            affinity: 6,
            next: "race",
          },
          {
            id: "leave",
            label: "Just waving",
            playerLine: "Just waving! Keep the flowers happy!",
            affinity: 2,
            next: null,
          },
        ],
      },
      cool: {
        id: "cool",
        npcLines: [
          "Okay okay - see that sunflower? It turned toward YOU.",
          "Science? Magic? Friendship? I vote all three.",
        ],
        choices: [
          {
            id: "believe",
            label: "I believe it",
            playerLine: "I'm choosing magic. And friendship.",
            affinity: 10,
            next: "pals",
          },
          {
            id: "science",
            label: "Definitely science",
            playerLine: "Science. But adorable science.",
            affinity: 7,
            next: "pals",
          },
        ],
      },
      feel: {
        id: "feel",
        npcLines: [
          "Sunny with a chance of muddy knees!",
          "Some days the weeds win. Today we're winning. Thanks for asking.",
        ],
        choices: [
          {
            id: "proud",
            label: "Proud of you",
            playerLine: "I'm proud of you. The park looks loved.",
            affinity: 11,
            next: "pals",
          },
          {
            id: "help_weeds",
            label: "I'll help with weeds",
            playerLine: "Point me at a weed patch and I'll earn my giggles.",
            affinity: 9,
            next: "pals",
          },
        ],
      },
      race: {
        id: "race",
        npcLines: [
          "YOU CHEATED with kindness! I tripped on a compliment!",
          "Fine - ducks get snacks either way. Rematch tomorrow?",
        ],
        choices: [
          {
            id: "rematch",
            label: "You're on",
            playerLine: "Rematch tomorrow. Bring your fastest sneakers.",
            affinity: 9,
            next: "pals",
          },
          {
            id: "draw",
            label: "Call it a draw",
            playerLine: "Draw! We both win. Ducks win hardest.",
            affinity: 7,
            next: "pals",
          },
        ],
      },
      pals: {
        id: "pals",
        npcLines: [
          "You're park people now. Official.",
          "If you ever need a cheer, I'll be under the big tree.",
        ],
        choices: [
          {
            id: "cheer",
            label: "Right back at you",
            playerLine: "And I'll cheer you right back, Pip.",
            affinity: 8,
            next: null,
          },
          {
            id: "secret",
            label: "Park pals forever",
            playerLine: "Park pals forever. Pinky promise?",
            affinity: 12,
            next: null,
            minScore: 20,
          },
        ],
      },
    },
  },

  vera: {
    npcId: "vera",
    start: "hello",
    nodes: {
      hello: {
        id: "hello",
        npcLines: [
          "Browsing or buying? Don't make me guess - I'm not psychic.",
          "…Though I am very good at reading faces.",
        ],
        choices: [
          {
            id: "browse",
            label: "Just browsing",
            playerLine: "Just browsing - your stall's half the fun.",
            affinity: 5,
            next: "browse",
          },
          {
            id: "respect",
            label: "Respect the hustle",
            playerLine: "Gotta respect the hustle. How's business?",
            affinity: 8,
            next: "biz",
          },
          {
            id: "bargain",
            label: "Any deals?",
            playerLine: "Any deals for a loyal customer?",
            affinity: 3,
            next: "deal",
          },
          {
            id: "leave",
            label: "Maybe later",
            playerLine: "Maybe later - don't sell out of the good jam.",
            affinity: 1,
            next: null,
          },
        ],
      },
      browse: {
        id: "browse",
        npcLines: [
          "Fine. Look with your eyes, not your elbows.",
          "If something makes you smile, that's inventory doing its job.",
        ],
        choices: [
          {
            id: "honest",
            label: "I like your taste",
            playerLine: "You've got great taste - stall always feels sharp.",
            affinity: 9,
            next: "soft",
          },
          {
            id: "joke_v",
            label: "Do you take smiles?",
            playerLine: "Do you take smiles as currency? I've got plenty.",
            affinity: 4,
            next: "soft",
          },
        ],
      },
      biz: {
        id: "biz",
        npcLines: [
          "Steady. Jam's flying, patience isn't.",
          "Helpful customers tip the scales. Hint hint.",
        ],
        choices: [
          {
            id: "offer",
            label: "I can help out",
            playerLine: "If you need a runner or a restock hand, say the word.",
            affinity: 11,
            next: "soft",
          },
          {
            id: "buy_in",
            label: "I'll buy something soon",
            playerLine: "I'll be back with coin. Fair's fair.",
            affinity: 7,
            next: "soft",
          },
        ],
      },
      deal: {
        id: "deal",
        npcLines: [
          "Deals are for people who don't waste my time.",
          "You haven't… yet. Keep it that way.",
        ],
        choices: [
          {
            id: "fair",
            label: "Fair enough",
            playerLine: "Fair. Full price, full respect.",
            affinity: 8,
            next: "soft",
          },
          {
            id: "pushy",
            label: "C'mon, hook me up",
            playerLine: "C'mon, just a little hookup on the honey?",
            affinity: -4,
            next: "soft",
          },
        ],
      },
      soft: {
        id: "soft",
        npcLines: [
          "…Alright. You're not the worst person who's stopped by.",
          "That's Vera-speak for 'I don't mind you.' Don't get mushy.",
        ],
        choices: [
          {
            id: "nod",
            label: "Wouldn't dream of it",
            playerLine: "Wouldn't dream of it. See you around, Vera.",
            affinity: 7,
            next: null,
          },
          {
            id: "mush",
            label: "Too late - we're friends",
            playerLine: "Too late. I already filed us under friends.",
            affinity: 10,
            next: null,
            minScore: 25,
          },
        ],
      },
    },
  },

  theo: {
    npcId: "theo",
    start: "hello",
    nodes: {
      hello: {
        id: "hello",
        npcLines: [
          "Oh - hello. I was mid-sentence with a footnote.",
          "You may speak. Softly.",
        ],
        choices: [
          {
            id: "book",
            label: "Book recommendation?",
            playerLine: "Got a book you'd recommend for me?",
            affinity: 8,
            next: "book",
          },
          {
            id: "quiet",
            label: "I'll keep quiet",
            playerLine: "I'll keep quiet - just wanted to say hi.",
            affinity: 6,
            next: "quiet",
          },
          {
            id: "ask_day",
            label: "How are the stacks?",
            playerLine: "How are the stacks treating you today?",
            affinity: 5,
            next: "stacks",
          },
          {
            id: "leave",
            label: "Sorry to interrupt",
            playerLine: "Sorry to interrupt - enjoy the footnote.",
            affinity: 2,
            next: null,
          },
        ],
      },
      book: {
        id: "book",
        npcLines: [
          "A slim travel diary. Short chapters. Kind endings.",
          "Return it with your thoughts. I… collect those.",
        ],
        choices: [
          {
            id: "accept",
            label: "I'd love that",
            playerLine: "I'd love that. I'll bring notes.",
            affinity: 12,
            next: "trust",
          },
          {
            id: "poem",
            label: "Poetry instead?",
            playerLine: "Any poetry that won't make me cry in public?",
            affinity: 9,
            next: "trust",
          },
        ],
      },
      quiet: {
        id: "quiet",
        npcLines: [
          "Appreciated. Most people fill silence like a debt.",
          "You don't. That's rare.",
        ],
        choices: [
          {
            id: "share_silence",
            label: "Silence is nice",
            playerLine: "Silence with a friend is still company.",
            affinity: 11,
            next: "trust",
            minScore: 15,
          },
          {
            id: "smile",
            label: "…",
            playerLine: "…",
            affinity: 7,
            next: "trust",
          },
        ],
      },
      stacks: {
        id: "stacks",
        npcLines: [
          "Slightly chaotic. Someone reshelved romance into gardening.",
          "I almost left it. The metaphor was too good.",
        ],
        choices: [
          {
            id: "funny",
            label: "That's hilarious",
            playerLine: "Please tell me you kept a photo of that.",
            affinity: 8,
            next: "trust",
          },
          {
            id: "help_shelve",
            label: "I can help shelve",
            playerLine: "I can help shelve - carefully, quietly.",
            affinity: 10,
            next: "trust",
          },
        ],
      },
      trust: {
        id: "trust",
        npcLines: [
          "I don't say this lightly… it's nice that you visit.",
          "The library feels less like a cave when you're here.",
        ],
        choices: [
          {
            id: "honor",
            label: "Honored",
            playerLine: "That means a lot, coming from you.",
            affinity: 9,
            next: null,
          },
          {
            id: "again",
            label: "I'll keep coming",
            playerLine: "Then I'll keep coming. Footnotes and all.",
            affinity: 11,
            next: null,
            minScore: 20,
          },
        ],
      },
    },
  },

  sage: {
    npcId: "sage",
    start: "hello",
    nodes: {
      hello: {
        id: "hello",
        npcLines: [
          "Hello. No clipboard this time - unless you want one.",
          "How are you feeling? And don't say 'fine' on autopilot.",
        ],
        choices: [
          {
            id: "honest",
            label: "Pretty good, actually",
            playerLine: "Pretty good, actually. Town helps.",
            affinity: 7,
            next: "well",
          },
          {
            id: "tired",
            label: "A bit worn out",
            playerLine: "A bit worn out… trying to keep up with everything.",
            affinity: 8,
            next: "care",
          },
          {
            id: "clinic",
            label: "How's the clinic?",
            playerLine: "How's the clinic holding up?",
            affinity: 6,
            next: "clinic",
          },
          {
            id: "leave",
            label: "Just checking in",
            playerLine: "Just checking in on you - doctor needs care too.",
            affinity: 5,
            next: null,
          },
        ],
      },
      well: {
        id: "well",
        npcLines: [
          "Good. Hold onto that - joy is preventive medicine.",
          "What have you been caring for lately? Besides yourself, hopefully.",
        ],
        choices: [
          {
            id: "people",
            label: "My neighbors",
            playerLine: "My neighbors, mostly. Trying to be a good friend.",
            affinity: 9,
            next: "trust",
          },
          {
            id: "pet",
            label: "Home & pets",
            playerLine: "Home, and whoever has paws there.",
            affinity: 8,
            next: "trust",
          },
        ],
      },
      care: {
        id: "care",
        npcLines: [
          "Thank you for saying so. Exhaustion lies - it says you're alone.",
          "You're not. Rest is productive. Hydrate. Then rest again.",
        ],
        choices: [
          {
            id: "listen",
            label: "I'll try",
            playerLine: "I'll try. Thanks for not brushing it off.",
            affinity: 12,
            next: "trust",
          },
          {
            id: "joke_s",
            label: "Prescribe cookies?",
            playerLine: "Can you prescribe Mabel's cookies?",
            affinity: 6,
            next: "trust",
          },
        ],
      },
      clinic: {
        id: "clinic",
        npcLines: [
          "Busy but calm. Prefer it that way.",
          "Supplies come and go. Kindness is the one stock I refuse to run out of.",
        ],
        choices: [
          {
            id: "admire",
            label: "That's admirable",
            playerLine: "That's admirable. This town's lucky.",
            affinity: 9,
            next: "trust",
          },
          {
            id: "help_c",
            label: "I can help",
            playerLine: "If the clinic needs hands, I'm willing.",
            affinity: 10,
            next: "trust",
          },
        ],
      },
      trust: {
        id: "trust",
        npcLines: [
          "I don't open up easily at work… but I trust you.",
          "Visit even when you're healthy. That's an order.",
        ],
        choices: [
          {
            id: "salute",
            label: "Yes, doctor",
            playerLine: "Yes, doctor. Healthy visits only - mostly.",
            affinity: 8,
            next: null,
          },
          {
            id: "friend",
            label: "We're friends",
            playerLine: "We're friends. Clipboard optional forever.",
            affinity: 11,
            next: null,
            minScore: 20,
          },
        ],
      },
    },
  },
};

export function toneReply(npcId: ChatNpcId, tone: DialogueTone): string {
  const pool = LINES[npcId]?.[tone] ?? ["…"];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function friendUnlockLine(npcId: ChatNpcId): string {
  const lines: Record<ChatNpcId, string> = {
    mabel: "You're family now. Don't you dare skip tea.",
    jun: "You're the best! Shift buddy status: unlocked.",
    pip: "Best park pals forever!!",
    vera: "Alright, you're on the friends-and-family list.",
    theo: "I… consider you a friend. That's rare.",
    sage: "I'm glad we connected. Take care of yourself - and visit.",
  };
  return lines[npcId];
}

/** Flavour when the player's favourite food comes up. */
export function favouriteFoodNpcLine(
  npcId: ChatNpcId,
  food: string,
): string {
  const lines: Record<ChatNpcId, string> = {
    mabel: `Someone with taste! I could bake something like ${food}…`,
    jun: `${food}? Bold order. I respect it.`,
    pip: `Ooh ${food}! Can flowers taste like that? Asking for a friend.`,
    vera: `${food} sells. Bring coin if you want the good batch.`,
    theo: `There's a slim volume on the history of ${food}. Riveting, actually.`,
    sage: `${food} in moderation. Doctor's gentle advice.`,
  };
  return lines[npcId];
}

export function chatScript(npcId: ChatNpcId): ChatScript {
  return CHAT_SCRIPTS[npcId];
}
