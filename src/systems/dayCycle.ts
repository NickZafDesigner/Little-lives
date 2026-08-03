/** Day / business-hours helpers and daily summary. */

export const MORNING_TIME = 8 / 24; // 8:00 AM wake time
export const EVENING_START = 18 / 24; // 6 PM
export const NIGHT_START = 21 / 24; // 9 PM

export interface DailyStats {
  moneyEarned: number;
  friendsMade: number;
  petBondGain: number;
  shiftsDone: number;
}

export function emptyDailyStats(): DailyStats {
  return {
    moneyEarned: 0,
    friendsMade: 0,
    petBondGain: 0,
    shiftsDone: 0,
  };
}

export function isBusinessOpen(dayTime: number, start: number, end: number): boolean {
  return dayTime >= start && dayTime < end;
}

export function isEvening(dayTime: number): boolean {
  return dayTime >= EVENING_START && dayTime < NIGHT_START;
}

export function isNight(dayTime: number): boolean {
  return dayTime >= NIGHT_START || dayTime < MORNING_TIME;
}

/**
 * Advance clock to next morning. If already past midnight toward morning,
 * still lands on MORNING_TIME and increments day.
 */
export function sleepToMorning(dayTime: number): {
  dayTime: number;
  crossedMidnight: boolean;
} {
  // Always wake at morning; if sleeping before morning (late night), same calendar day
  // until we cross midnight conceptually - treat any sleep as ending the day.
  const crossedMidnight = dayTime >= MORNING_TIME;
  return { dayTime: MORNING_TIME, crossedMidnight };
}

export function formatDailySummary(
  dayIndex: number,
  stats: DailyStats,
  cozyScore: number,
): string {
  const bits: string[] = [`Day ${dayIndex} complete!`];
  if (stats.moneyEarned > 0) bits.push(`+$${stats.moneyEarned}`);
  if (stats.shiftsDone > 0) bits.push(`${stats.shiftsDone} shift${stats.shiftsDone > 1 ? "s" : ""}`);
  if (stats.friendsMade > 0) bits.push(`${stats.friendsMade} new friend${stats.friendsMade > 1 ? "s" : ""}`);
  if (stats.petBondGain > 0) bits.push(`pet +${Math.round(stats.petBondGain)} bond`);
  bits.push(`cozy ${cozyScore}`);
  return bits.join(" · ");
}

/** Weekday 0-6 from dayIndex (0 = first in-game day = "Sunday market energy"). */
export function weekday(dayIndex: number): number {
  return ((dayIndex % 7) + 7) % 7;
}

export type WeeklyBeatId =
  | "park_picnic"
  | "market_special"
  | "library_hour"
  | "clinic_wellness"
  | "pier_sunset";

export interface WeeklyBeat {
  id: WeeklyBeatId;
  weekday: number;
  title: string;
  place: string;
  /** Lot to interact at. */
  lotId: "park" | "market" | "library" | "clinic" | "pier";
  blurb: string;
  fun: number;
  social: number;
}

export const WEEKLY_BEATS: WeeklyBeat[] = [
  {
    id: "park_picnic",
    weekday: 0,
    title: "Park Picnic",
    place: "Town Park",
    lotId: "park",
    blurb: "Blankets on the grass. Join the picnic!",
    fun: 25,
    social: 18,
  },
  {
    id: "pier_sunset",
    weekday: 2,
    title: "Pier Sunset",
    place: "Sunny Pier",
    lotId: "pier",
    blurb: "Tuesday glow over the water - join the pier hangout!",
    fun: 22,
    social: 16,
  },
  {
    id: "market_special",
    weekday: 5,
    title: "Market Special",
    place: "Vera's Market",
    lotId: "market",
    blurb: "Friday specials - Vera's handing out samples.",
    fun: 16,
    social: 14,
  },
  {
    id: "library_hour",
    weekday: 6,
    title: "Reading Hour",
    place: "Town Library",
    lotId: "library",
    blurb: "Theo's hosting a quiet reading circle.",
    fun: 20,
    social: 12,
  },
  {
    id: "clinic_wellness",
    weekday: 3,
    title: "Wellness Wednesday",
    place: "Sage Clinic",
    lotId: "clinic",
    blurb: "Free stretch tips from Dr. Sage.",
    fun: 12,
    social: 16,
  },
];

export function beatForDay(dayIndex: number): WeeklyBeat | null {
  const wd = weekday(dayIndex);
  return WEEKLY_BEATS.find((b) => b.weekday === wd) ?? null;
}
