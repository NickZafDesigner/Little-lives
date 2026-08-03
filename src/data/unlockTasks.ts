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
    hint: "Work 3 shifts at the café",
    condition: { kind: "job_shifts", jobId: "cafe_barista", count: 3 },
  },
  {
    id: "cafe_shifts_5",
    title: "Café Pro",
    hint: "Work 5 shifts at the café",
    condition: { kind: "job_shifts", jobId: "cafe_barista", count: 5 },
  },
  {
    id: "cafe_promoted",
    title: "Trusted Barista",
    hint: "Get promoted at the café",
    condition: { kind: "job_promoted", jobId: "cafe_barista" },
  },
  {
    id: "library_shifts_1",
    title: "Library Volunteer",
    hint: "Work 1 shift at the library",
    condition: { kind: "job_shifts", jobId: "library_aide", count: 1 },
  },
  {
    id: "library_shifts_2",
    title: "Shelf Stacker",
    hint: "Work 2 shifts at the library",
    condition: { kind: "job_shifts", jobId: "library_aide", count: 2 },
  },
  {
    id: "market_shifts_2",
    title: "Market Helper",
    hint: "Work 2 shifts at the market",
    condition: { kind: "job_shifts", jobId: "market_clerk", count: 2 },
  },
  {
    id: "market_shifts_3",
    title: "Market Regular",
    hint: "Work 3 shifts at the market",
    condition: { kind: "job_shifts", jobId: "market_clerk", count: 3 },
  },
  {
    id: "clinic_shifts_3",
    title: "Clinic Aide",
    hint: "Work 3 shifts at the clinic",
    condition: { kind: "job_shifts", jobId: "clinic_aide", count: 3 },
  },
  {
    id: "any_shifts_4",
    title: "Working Life",
    hint: "Complete 4 work shifts",
    condition: { kind: "any_shifts", count: 4 },
  },
  {
    id: "any_shifts_8",
    title: "Shift Warrior",
    hint: "Complete 8 work shifts",
    condition: { kind: "any_shifts", count: 8 },
  },
  {
    id: "quest_theo_returns",
    title: "Book Friend",
    hint: "Help Theo with book returns",
    condition: { kind: "quest_complete", questId: "theo_returns" },
  },
  {
    id: "quest_mabel_cookies",
    title: "Flower Delivery",
    hint: "Bring Mabel her flowers",
    condition: { kind: "quest_complete", questId: "mabel_cookies" },
  },
  {
    id: "quest_first_paycheck",
    title: "First Paycheck",
    hint: "Earn your first paycheck",
    condition: { kind: "quest_complete", questId: "first_paycheck" },
  },
  {
    id: "adopt_pet",
    title: "New Companion",
    hint: "Adopt a pet",
    condition: { kind: "adopt_pet" },
  },
  {
    id: "pet_bond_60",
    title: "Best Friends",
    hint: "Raise pet bond to 60",
    condition: { kind: "pet_bond", min: 60 },
  },
  {
    id: "pet_tricks_1",
    title: "Trick Trainer",
    hint: "Teach your pet 1 trick",
    condition: { kind: "pet_tricks", count: 1 },
  },
  {
    id: "pet_care_streak_3",
    title: "Daily Care",
    hint: "Care for your pet 3 days in a row",
    condition: { kind: "pet_care_streak", count: 3 },
  },
  {
    id: "cozy_40",
    title: "Homey Nest",
    hint: "Reach cozy score 40",
    condition: { kind: "cozy_score", min: 40 },
  },
  {
    id: "close_friends_2",
    title: "Social Circle",
    hint: "Become close friends with 2 townsfolk",
    condition: { kind: "close_friends", count: 2 },
  },
  {
    id: "side_quests_2",
    title: "Town Helper",
    hint: "Finish 2 side quests",
    condition: { kind: "side_quests", count: 2 },
  },
  {
    id: "weekly_beats_1",
    title: "Town Spirit",
    hint: "Join 1 weekly town beat",
    condition: { kind: "weekly_beats", count: 1 },
  },
  {
    id: "any_shifts_6",
    title: "Steady Work",
    hint: "Complete 6 work shifts",
    condition: { kind: "any_shifts", count: 6 },
  },
  {
    id: "library_promoted",
    title: "Library Associate",
    hint: "Get promoted at the library",
    condition: { kind: "job_promoted", jobId: "library_aide" },
  },
  {
    id: "market_promoted",
    title: "Senior Clerk",
    hint: "Get promoted at the market",
    condition: { kind: "job_promoted", jobId: "market_clerk" },
  },
  {
    id: "clinic_promoted",
    title: "Clinic Associate",
    hint: "Get promoted at the clinic",
    condition: { kind: "job_promoted", jobId: "clinic_aide" },
  },
  {
    id: "cozy_60",
    title: "Cozy Nest",
    hint: "Reach cozy score 60",
    condition: { kind: "cozy_score", min: 60 },
  },
  {
    id: "close_friends_3",
    title: "Wide Circle",
    hint: "Become close friends with 3 townsfolk",
    condition: { kind: "close_friends", count: 3 },
  },
  {
    id: "pet_bond_80",
    title: "Deep Bond",
    hint: "Raise pet bond to 80",
    condition: { kind: "pet_bond", min: 80 },
  },
  {
    id: "side_quests_4",
    title: "Local Legend",
    hint: "Finish 4 side quests",
    condition: { kind: "side_quests", count: 4 },
  },
  {
    id: "weekly_beats_2",
    title: "Community Regular",
    hint: "Join 2 weekly town beats",
    condition: { kind: "weekly_beats", count: 2 },
  },
  {
    id: "workshop_shifts_2",
    title: "Sawdust Starter",
    hint: "Work 2 shifts at the workshop",
    condition: { kind: "job_shifts", jobId: "workshop_crafter", count: 2 },
  },
  {
    id: "workshop_shifts_3",
    title: "Steady Hands",
    hint: "Work 3 shifts at the workshop",
    condition: { kind: "job_shifts", jobId: "workshop_crafter", count: 3 },
  },
  {
    id: "workshop_shifts_4",
    title: "Workshop Regular",
    hint: "Work 4 shifts at the workshop",
    condition: { kind: "job_shifts", jobId: "workshop_crafter", count: 4 },
  },
  {
    id: "workshop_promoted",
    title: "Trusted Crafter",
    hint: "Get promoted at the workshop",
    condition: { kind: "job_promoted", jobId: "workshop_crafter" },
  },
  {
    id: "any_shifts_10",
    title: "Town Workhorse",
    hint: "Complete 10 work shifts",
    condition: { kind: "any_shifts", count: 10 },
  },
  {
    id: "quest_pier_day",
    title: "Pier Day",
    hint: "Finish the Sunny Pier quest",
    condition: { kind: "quest_complete", questId: "pier_day" },
  },
  {
    id: "quest_pip_pier",
    title: "Pier Pal",
    hint: "Help Pip at the pier",
    condition: { kind: "quest_complete", questId: "pip_pier" },
  },
  {
    id: "side_quests_3",
    title: "Busybody",
    hint: "Finish 3 side quests",
    condition: { kind: "side_quests", count: 3 },
  },
  {
    id: "side_quests_5",
    title: "Town Fixture",
    hint: "Finish 5 side quests",
    condition: { kind: "side_quests", count: 5 },
  },
  {
    id: "weekly_beats_3",
    title: "Calendar Keeper",
    hint: "Join 3 weekly town beats",
    condition: { kind: "weekly_beats", count: 3 },
  },
  {
    id: "cozy_70",
    title: "Nest Perfected",
    hint: "Reach cozy score 70",
    condition: { kind: "cozy_score", min: 70 },
  },
];

export const unlockTaskById = Object.fromEntries(
  UNLOCK_TASKS.map((t) => [t.id, t]),
) as Record<string, UnlockTaskDef>;
