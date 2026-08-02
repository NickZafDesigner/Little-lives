export type UnlockTaskKind =
  | { kind: "job_shifts"; jobId: string; count: number }
  | { kind: "any_shifts"; count: number }
  | { kind: "job_promoted"; jobId: string }
  | { kind: "quest_complete"; questId: string }
  | { kind: "adopt_pet" }
  | { kind: "pet_bond"; min: number }
  | { kind: "pet_tricks"; count: number }
  | { kind: "pet_care_streak"; count: number }
  | { kind: "cozy_score"; min: number }
  | { kind: "close_friends"; count: number }
  | { kind: "side_quests"; count: number }
  | { kind: "weekly_beats"; count: number };

export interface UnlockTaskDef {
  id: string;
  title: string;
  /** Tooltip / journal line shown on locked furniture. */
  hint: string;
  condition: UnlockTaskKind;
}

export const UNLOCK_TASKS: UnlockTaskDef[] = [
  {
    id: "cafe_shifts_3",
    title: "Café Regular",
    hint: "Work 3 shifts at the café to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "cafe_barista", count: 3 },
  },
  {
    id: "cafe_shifts_5",
    title: "Café Pro",
    hint: "Work 5 shifts at the café to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "cafe_barista", count: 5 },
  },
  {
    id: "cafe_promoted",
    title: "Trusted Barista",
    hint: "Get promoted at the café to unlock this for purchase",
    condition: { kind: "job_promoted", jobId: "cafe_barista" },
  },
  {
    id: "library_shifts_1",
    title: "Library Volunteer",
    hint: "Work 1 shift at the library to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "library_aide", count: 1 },
  },
  {
    id: "library_shifts_2",
    title: "Shelf Stacker",
    hint: "Work 2 shifts at the library to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "library_aide", count: 2 },
  },
  {
    id: "market_shifts_2",
    title: "Market Helper",
    hint: "Work 2 shifts at the market to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "market_clerk", count: 2 },
  },
  {
    id: "market_shifts_3",
    title: "Market Regular",
    hint: "Work 3 shifts at the market to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "market_clerk", count: 3 },
  },
  {
    id: "clinic_shifts_3",
    title: "Clinic Aide",
    hint: "Work 3 shifts at the clinic to unlock this for purchase",
    condition: { kind: "job_shifts", jobId: "clinic_aide", count: 3 },
  },
  {
    id: "any_shifts_4",
    title: "Working Life",
    hint: "Complete 4 work shifts to unlock this for purchase",
    condition: { kind: "any_shifts", count: 4 },
  },
  {
    id: "any_shifts_8",
    title: "Shift Warrior",
    hint: "Complete 8 work shifts to unlock this for purchase",
    condition: { kind: "any_shifts", count: 8 },
  },
  {
    id: "quest_theo_returns",
    title: "Book Friend",
    hint: "Help Theo with book returns to unlock this for purchase",
    condition: { kind: "quest_complete", questId: "theo_returns" },
  },
  {
    id: "quest_mabel_cookies",
    title: "Flower Delivery",
    hint: "Bring Mabel her flowers to unlock this for purchase",
    condition: { kind: "quest_complete", questId: "mabel_cookies" },
  },
  {
    id: "quest_first_paycheck",
    title: "First Paycheck",
    hint: "Earn your first paycheck to unlock this for purchase",
    condition: { kind: "quest_complete", questId: "first_paycheck" },
  },
  {
    id: "adopt_pet",
    title: "New Companion",
    hint: "Adopt a pet to unlock this for purchase",
    condition: { kind: "adopt_pet" },
  },
  {
    id: "pet_bond_60",
    title: "Best Friends",
    hint: "Raise pet bond to 60 to unlock this for purchase",
    condition: { kind: "pet_bond", min: 60 },
  },
  {
    id: "pet_tricks_1",
    title: "Trick Trainer",
    hint: "Teach your pet 1 trick to unlock this for purchase",
    condition: { kind: "pet_tricks", count: 1 },
  },
  {
    id: "pet_care_streak_3",
    title: "Daily Care",
    hint: "Care for your pet 3 days in a row to unlock this for purchase",
    condition: { kind: "pet_care_streak", count: 3 },
  },
  {
    id: "cozy_40",
    title: "Homey Nest",
    hint: "Reach cozy score 40 to unlock this for purchase",
    condition: { kind: "cozy_score", min: 40 },
  },
  {
    id: "close_friends_2",
    title: "Social Circle",
    hint: "Become close friends with 2 townsfolk to unlock this for purchase",
    condition: { kind: "close_friends", count: 2 },
  },
  {
    id: "side_quests_2",
    title: "Town Helper",
    hint: "Finish 2 side quests to unlock this for purchase",
    condition: { kind: "side_quests", count: 2 },
  },
  {
    id: "weekly_beats_1",
    title: "Town Spirit",
    hint: "Join 1 weekly town beat to unlock this for purchase",
    condition: { kind: "weekly_beats", count: 1 },
  },
  {
    id: "any_shifts_6",
    title: "Steady Work",
    hint: "Complete 6 work shifts to unlock this for purchase",
    condition: { kind: "any_shifts", count: 6 },
  },
  {
    id: "library_promoted",
    title: "Library Associate",
    hint: "Get promoted at the library to unlock this for purchase",
    condition: { kind: "job_promoted", jobId: "library_aide" },
  },
  {
    id: "market_promoted",
    title: "Senior Clerk",
    hint: "Get promoted at the market to unlock this for purchase",
    condition: { kind: "job_promoted", jobId: "market_clerk" },
  },
  {
    id: "clinic_promoted",
    title: "Clinic Associate",
    hint: "Get promoted at the clinic to unlock this for purchase",
    condition: { kind: "job_promoted", jobId: "clinic_aide" },
  },
  {
    id: "cozy_60",
    title: "Cozy Nest",
    hint: "Reach cozy score 60 to unlock this for purchase",
    condition: { kind: "cozy_score", min: 60 },
  },
  {
    id: "close_friends_3",
    title: "Wide Circle",
    hint: "Become close friends with 3 townsfolk to unlock this for purchase",
    condition: { kind: "close_friends", count: 3 },
  },
  {
    id: "pet_bond_80",
    title: "Deep Bond",
    hint: "Raise pet bond to 80 to unlock this for purchase",
    condition: { kind: "pet_bond", min: 80 },
  },
  {
    id: "side_quests_4",
    title: "Local Legend",
    hint: "Finish 4 side quests to unlock this for purchase",
    condition: { kind: "side_quests", count: 4 },
  },
  {
    id: "weekly_beats_2",
    title: "Community Regular",
    hint: "Join 2 weekly town beats to unlock this for purchase",
    condition: { kind: "weekly_beats", count: 2 },
  },
];

export const unlockTaskById = Object.fromEntries(
  UNLOCK_TASKS.map((t) => [t.id, t]),
) as Record<string, UnlockTaskDef>;
