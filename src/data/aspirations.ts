export type AspirationId =
  | "homebody"
  | "social_butterfly"
  | "pet_parent"
  | "career_kid"
  | "town_helper"
  | "maker";

export interface AspirationDef {
  id: AspirationId;
  title: string;
  description: string;
  /** Target progress value. */
  target: number;
  rewardMoney: number;
  rewardToast: string;
  /** Cosmetic unlock id granted on complete. */
  unlockId: string;
}

export const ASPIRATIONS: AspirationDef[] = [
  {
    id: "homebody",
    title: "Homebody",
    description: "Reach cozy score 70 with a well-loved home.",
    target: 70,
    rewardMoney: 40,
    rewardToast: "Blush Boards unlocked in the floor catalog!",
    unlockId: "floor_blush",
  },
  {
    id: "social_butterfly",
    title: "Social Butterfly",
    description: "Become close friends with all six townsfolk.",
    target: 6,
    rewardMoney: 50,
    rewardToast: "Social Butterfly! Everyone saves you a seat.",
    unlockId: "wall_sky",
  },
  {
    id: "pet_parent",
    title: "Pet Parent",
    description: "Max pet bond and teach 2 tricks.",
    target: 2,
    rewardMoney: 35,
    rewardToast: "Pet Parent! Your companion learned show-off mode.",
    unlockId: "pet_bow",
  },
  {
    id: "career_kid",
    title: "Career Kid",
    description: "Finish 12 shifts across town jobs.",
    target: 12,
    rewardMoney: 60,
    rewardToast: "Career Kid! Trusted-employee perks unlocked.",
    unlockId: "trusted_employee",
  },
  {
    id: "town_helper",
    title: "Town Helper",
    description: "Finish all side quests and join 3 weekly town beats.",
    target: 11,
    rewardMoney: 45,
    rewardToast: "Town Helper! The notice board has your name on it.",
    unlockId: "notice_star",
  },
  {
    id: "maker",
    title: "Maker",
    description: "Craft 8 handmade goods and finish 5 board commissions.",
    target: 13,
    rewardMoney: 55,
    rewardToast: "Maker! Reed left you a craft-table polish kit.",
    unlockId: "maker_kit",
  },
];

export const aspirationById = Object.fromEntries(
  ASPIRATIONS.map((a) => [a.id, a]),
) as Record<AspirationId, AspirationDef>;

export interface AspirationProgress {
  /** Player-selected focus; null = track all passively. */
  selected: AspirationId | null;
  /** Progress meters keyed by aspiration id. */
  progress: Record<string, number>;
  completed: string[];
  unlocks: string[];
  weeklyBeatsDone: number;
  totalShifts: number;
  petTricks: number;
}

export function emptyAspirationProgress(): AspirationProgress {
  return {
    selected: null,
    progress: {},
    completed: [],
    unlocks: [],
    weeklyBeatsDone: 0,
    totalShifts: 0,
    petTricks: 0,
  };
}

export const SIDE_QUEST_IDS = [
  "mabel_cookies",
  "pip_pond",
  "vera_parcel",
  "theo_returns",
  "sage_supplies",
  "reed_planks",
  "pip_pier",
  "nibs_shoe",
  "crumb_snack",
  "sprocket_scrap",
] as const;
