export type QuestEvent =
  | "game_started"
  | "opened_build"
  | "talked_jun_job"
  | "shift_complete"
  /** First ask-about-job at any workplace (café / market / library / clinic). */
  | "asked_about_job"
  /** First completed shift at any hired job. */
  | "any_shift_complete"
  | "placed_sofa"
  | "pet_setup"
  | "adopted_pet"
  | "pet_bonded"
  | "npc_hangout"
  | "mabel_ask_flowers"
  | "picked_flowers"
  | "delivered_flowers"
  | "pip_ask_cleanup"
  | "park_cleanup"
  | "talked_vera_job"
  | "talked_theo_job"
  | "talked_sage_job"
  | "market_shift_complete"
  | "library_shift_complete"
  | "clinic_shift_complete"
  | "met_vera"
  | "met_theo"
  | "met_sage"
  | "vera_ask_delivery"
  | "delivered_parcel"
  | "theo_ask_returns"
  | "shelved_books"
  | "sage_ask_supplies"
  | "delivered_supplies";

export interface QuestStepDef {
  id: string;
  event: QuestEvent;
  objectiveLabel: string;
  /** How many times the event must fire. Default 1. */
  count?: number;
}

export interface QuestDef {
  id: string;
  title: string;
  /** Toast / journal line when the quest becomes active. */
  journalLine: string;
  autoStart?: boolean;
  /** Quest ids that must be completed first. */
  requires?: string[];
  /** Extra unlock gates. */
  unlockWhen?: {
    hiredAtCafe?: boolean;
    hiredJobId?: string;
  };
  side?: boolean;
  /** Skip journal dialogue on start (intro / silent beats). */
  silentStart?: boolean;
  steps: QuestStepDef[];
  rewards?: {
    money?: number;
    friendshipNpcId?: string;
    friendshipDelta?: number;
  };
}

export interface QuestProgress {
  active: string[];
  completed: string[];
  /** Per-quest step progress: questId → stepId → count. */
  stepCounts: Record<string, Record<string, number>>;
  flags: Record<string, boolean>;
}

export function emptyQuestProgress(): QuestProgress {
  return {
    active: [],
    completed: [],
    stepCounts: {},
    flags: {},
  };
}

export const QUESTS: QuestDef[] = [
  {
    id: "empty_nest",
    title: "Empty Nest",
    journalLine:
      "If I want a real living room, I need furniture - and that means finding work.",
    autoStart: true,
    silentStart: true,
    steps: [
      {
        id: "realize",
        event: "game_started",
        objectiveLabel: "Furnish the house - but first, find work",
      },
    ],
  },
  {
    id: "get_a_job",
    title: "Get a Job",
    journalLine: "Someone in town must be hiring. Time to ask around.",
    requires: ["empty_nest"],
    steps: [
      {
        id: "ask_anyone",
        event: "asked_about_job",
        objectiveLabel: "Ask around town who's hiring",
      },
    ],
  },
  {
    id: "first_paycheck",
    title: "First Paycheck",
    journalLine: "I'm on the books! Shifts run 9 to 5 - better clock in.",
    requires: ["get_a_job"],
    steps: [
      {
        id: "shift",
        event: "any_shift_complete",
        objectiveLabel: "Work a full shift (9 AM – 5 PM)",
      },
    ],
  },
  {
    id: "make_it_home",
    title: "Make It Home",
    journalLine: "Time to spend that paycheck. A sunny sofa would help…",
    requires: ["first_paycheck"],
    steps: [
      {
        id: "place_sofa",
        event: "placed_sofa",
        objectiveLabel: "Buy & place a Sunny Sofa at home (Build mode)",
      },
    ],
  },
  {
    id: "pet_prep",
    title: "Pet Prep",
    journalLine:
      "Looking better. A little friend would make it feel like home…",
    requires: ["make_it_home"],
    steps: [
      {
        id: "setup",
        event: "pet_setup",
        objectiveLabel: "Buy & place a Pet Bed and Pet Bowl at home",
      },
    ],
  },
  {
    id: "new_friend",
    title: "New Friend",
    journalLine: "The shelter has animals waiting. I'm ready!",
    requires: ["pet_prep"],
    steps: [
      {
        id: "adopt",
        event: "adopted_pet",
        objectiveLabel: "Adopt a pet at the Pet Shelter",
      },
    ],
  },
  {
    id: "settled_in",
    title: "Settled In",
    journalLine:
      "We're a proper household now. Time to make some friends in town.",
    requires: ["new_friend"],
    steps: [
      {
        id: "bond",
        event: "pet_bonded",
        objectiveLabel: "Cuddle or play with your pet",
      },
      {
        id: "hangout",
        event: "npc_hangout",
        objectiveLabel: "Hang Out with a town friend (need friendship 20+)",
      },
    ],
  },
  {
    id: "explore_east",
    title: "East District",
    journalLine:
      "There's a whole east side I haven't explored - market, library… people!",
    requires: ["settled_in"],
    steps: [
      {
        id: "meet_vera",
        event: "met_vera",
        objectiveLabel: "Meet Vera at Vera's Market",
      },
      {
        id: "meet_theo",
        event: "met_theo",
        objectiveLabel: "Meet Theo at the Town Library",
      },
    ],
  },
  {
    id: "second_gig",
    title: "Second Gig",
    journalLine: "One job's fine. Two jobs? That's a lifestyle.",
    requires: ["explore_east"],
    steps: [
      {
        id: "hire",
        event: "talked_vera_job",
        objectiveLabel: "Ask Vera about clerk work at the market",
      },
      {
        id: "shift",
        event: "market_shift_complete",
        objectiveLabel: "Finish a market shift",
      },
    ],
  },
  {
    id: "quiet_hours",
    title: "Quiet Hours",
    journalLine: "Theo looked buried in returns. Maybe I can help… for pay.",
    requires: ["second_gig"],
    steps: [
      {
        id: "hire",
        event: "talked_theo_job",
        objectiveLabel: "Ask Theo about library aide work",
      },
      {
        id: "shift",
        event: "library_shift_complete",
        objectiveLabel: "Finish a library shift",
      },
    ],
  },
  {
    id: "south_side",
    title: "South Side Care",
    journalLine: "Dr. Sage runs a clinic south of the park. Worth a visit.",
    requires: ["quiet_hours"],
    steps: [
      {
        id: "meet",
        event: "met_sage",
        objectiveLabel: "Meet Dr. Sage at the clinic",
      },
      {
        id: "hire",
        event: "talked_sage_job",
        objectiveLabel: "Ask Sage about clinic aide work",
      },
    ],
  },
  {
    id: "heart_of_town",
    title: "Heart of Town",
    journalLine:
      "I've worked half the town. One clinic shift and I'll feel like a real local.",
    requires: ["south_side"],
    steps: [
      {
        id: "shift",
        event: "clinic_shift_complete",
        objectiveLabel: "Finish a clinic shift",
      },
    ],
    rewards: { money: 40 },
  },
  {
    id: "mabel_cookies",
    title: "Mabel's Flowers",
    journalLine: "Mabel wants wildflowers from the park for her baking table.",
    side: true,
    unlockWhen: { hiredAtCafe: true },
    requires: ["get_a_job"],
    steps: [
      {
        id: "ask",
        event: "mabel_ask_flowers",
        objectiveLabel: "Chat with Mabel about helping out",
      },
      {
        id: "pick",
        event: "picked_flowers",
        objectiveLabel: "Pick wildflowers at a park bench",
      },
      {
        id: "deliver",
        event: "delivered_flowers",
        objectiveLabel: "Deliver the wildflowers to Mabel",
      },
    ],
    rewards: {
      money: 25,
      friendshipNpcId: "mabel",
      friendshipDelta: 15,
    },
  },
  {
    id: "pip_pond",
    title: "Park Cleanup",
    journalLine: "Pip could use a hand keeping the park tidy.",
    side: true,
    unlockWhen: { hiredAtCafe: true },
    requires: ["get_a_job"],
    steps: [
      {
        id: "ask",
        event: "pip_ask_cleanup",
        objectiveLabel: "Talk to Pip about helping at the park",
      },
      {
        id: "clean",
        event: "park_cleanup",
        objectiveLabel: "Clear litter near park benches (0/2)",
        count: 2,
      },
    ],
    rewards: {
      money: 20,
      friendshipNpcId: "pip",
      friendshipDelta: 15,
    },
  },
  {
    id: "vera_parcel",
    title: "Market Run",
    journalLine: "Vera needs a parcel walked over to the library.",
    side: true,
    unlockWhen: { hiredJobId: "market_clerk" },
    requires: ["second_gig"],
    steps: [
      {
        id: "ask",
        event: "vera_ask_delivery",
        objectiveLabel: "Talk to Vera about a delivery",
      },
      {
        id: "deliver",
        event: "delivered_parcel",
        objectiveLabel: "Deliver Vera's parcel to Theo",
      },
    ],
    rewards: {
      money: 30,
      friendshipNpcId: "vera",
      friendshipDelta: 12,
    },
  },
  {
    id: "theo_returns",
    title: "Overdue Returns",
    journalLine: "Theo's return cart is tipping over.",
    side: true,
    unlockWhen: { hiredJobId: "library_aide" },
    requires: ["quiet_hours"],
    steps: [
      {
        id: "ask",
        event: "theo_ask_returns",
        objectiveLabel: "Offer to help Theo with returns",
      },
      {
        id: "shelve",
        event: "shelved_books",
        objectiveLabel: "Shelve returns at the library desk (0/2)",
        count: 2,
      },
    ],
    rewards: {
      money: 28,
      friendshipNpcId: "theo",
      friendshipDelta: 14,
    },
  },
  {
    id: "sage_supplies",
    title: "Clinic Supplies",
    journalLine: "Sage is low on bandages - market should have a kit.",
    side: true,
    unlockWhen: { hiredJobId: "clinic_aide" },
    requires: ["south_side"],
    steps: [
      {
        id: "ask",
        event: "sage_ask_supplies",
        objectiveLabel: "Ask Sage what the clinic needs",
      },
      {
        id: "deliver",
        event: "delivered_supplies",
        objectiveLabel: "Bring supplies from Vera to Sage",
      },
    ],
    rewards: {
      money: 35,
      friendshipNpcId: "sage",
      friendshipDelta: 15,
    },
  },
];

export const questById = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
) as Record<string, QuestDef>;

/** Earliest clock-in (8:30 AM) - arrive early before official start. */
export const WORK_OPEN = 8.5 / 24;
/** Official shift start (9 AM). */
export const WORK_START = 9 / 24;
export const WORK_END = 17 / 24;
/** Clock-in after this counts as late (9:15 AM). */
export const WORK_LATE = 9.25 / 24;
/** @deprecated Shift now montages to WORK_END instead of a fixed jump. */
export const SHIFT_TIME_ADVANCE = 0.145;
