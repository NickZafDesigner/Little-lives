import type { JobDef } from "./types";

export const JOBS: JobDef[] = [
  {
    id: "cafe_barista",
    name: "Café Helper",
    lotId: "cafe",
    stationDefId: "counter",
    hireNpcId: "jun",
    pay: 55,
    shiftTasks: 2,
    durationMs: 1800,
    closedMessage: "Café's closed - come back 9 to 5.",
    taskLabels: ["Brew a drink", "Wipe the counter"],
  },
  {
    id: "market_clerk",
    name: "Market Clerk",
    lotId: "market",
    stationDefId: "counter",
    hireNpcId: "vera",
    pay: 48,
    shiftTasks: 2,
    durationMs: 1600,
    closedMessage: "Market's closed - come back 9 to 5.",
    taskLabels: ["Restock a shelf", "Ring up a sale"],
  },
  {
    id: "library_aide",
    name: "Library Aide",
    lotId: "library",
    stationDefId: "library_desk",
    hireNpcId: "theo",
    pay: 42,
    shiftTasks: 2,
    durationMs: 1700,
    closedMessage: "Library's closed - come back 9 to 5.",
    taskLabels: ["Shelve returns", "Whisper-help a patron"],
  },
  {
    id: "clinic_aide",
    name: "Clinic Aide",
    lotId: "clinic",
    stationDefId: "clinic_desk",
    hireNpcId: "sage",
    pay: 60,
    shiftTasks: 2,
    durationMs: 1900,
    closedMessage: "Clinic's closed - come back 9 to 5.",
    taskLabels: ["Fetch a kit", "Tidy the waiting chairs"],
  },
];

export const jobById = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<
  string,
  JobDef
>;

export const CAFE_JOB = JOBS[0];

export const STARTING_MONEY = 45;

/** Shifts required before promotion. */
export const PROMOTION_SHIFTS = 4;

export interface JobPromotion {
  title: string;
  payBonus: number;
  bossLine: string;
}

export const JOB_PROMOTIONS: Record<string, JobPromotion> = {
  cafe_barista: {
    title: "Lead Barista",
    payBonus: 15,
    bossLine: "Promotion! You're Lead Barista - foam's never looked better.",
  },
  market_clerk: {
    title: "Senior Clerk",
    payBonus: 12,
    bossLine: "You're Senior Clerk now. Try not to look smug near the jam.",
  },
  library_aide: {
    title: "Library Associate",
    payBonus: 12,
    bossLine: "Associate status. Soft voices - and a soft raise.",
  },
  clinic_aide: {
    title: "Clinic Associate",
    payBonus: 18,
    bossLine: "Clinic Associate. Patients already ask for you.",
  },
};

export function jobDisplayName(jobId: string, promoted: boolean): string {
  if (promoted) return JOB_PROMOTIONS[jobId]?.title ?? jobById[jobId]?.name ?? jobId;
  return jobById[jobId]?.name ?? jobId;
}

export function jobPay(jobId: string, promoted: boolean): number {
  const job = jobById[jobId];
  if (!job) return 0;
  const bonus = promoted ? (JOB_PROMOTIONS[jobId]?.payBonus ?? 0) : 0;
  const trusted = 0; // applied by caller via unlocks
  return job.pay + bonus + trusted;
}
