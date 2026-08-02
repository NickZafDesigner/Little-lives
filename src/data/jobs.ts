import type { JobDef } from "./types";

export const JOBS: JobDef[] = [
  {
    id: "cafe_barista",
    name: "Café Helper",
    lotId: "cafe",
    stationDefId: "counter",
    hireNpcId: "jun",
    pay: 55,
    closedMessage: "Café's closed - come back 9 to 5.",
    tasks: [
      { id: "brew", label: "Brew a drink", furnitureUid: "c_counter", mini: "timing" },
      { id: "wipe", label: "Wipe a table", furnitureUid: "c_table", mini: "sequence" },
      { id: "plant", label: "Water the plant", furnitureUid: "c_plant", mini: "hold" },
      { id: "ring", label: "Ring up a sale", furnitureUid: "c_counter", mini: "timing" },
    ],
  },
  {
    id: "market_clerk",
    name: "Market Clerk",
    lotId: "market",
    stationDefId: "counter",
    hireNpcId: "vera",
    pay: 48,
    closedMessage: "Market's closed - come back 9 to 5.",
    tasks: [
      { id: "restock", label: "Restock a shelf", furnitureUid: "m_table", mini: "sequence" },
      { id: "ring", label: "Ring up a sale", furnitureUid: "m_counter", mini: "timing" },
      { id: "sweep", label: "Sweep near the plants", furnitureUid: "m_plant", mini: "hold" },
      { id: "bag", label: "Bag a purchase", furnitureUid: "m_counter", mini: "timing" },
    ],
  },
  {
    id: "library_aide",
    name: "Library Aide",
    lotId: "library",
    stationDefId: "library_desk",
    hireNpcId: "theo",
    pay: 42,
    closedMessage: "Library's closed - come back 9 to 5.",
    tasks: [
      { id: "help", label: "Help a patron", furnitureUid: "l_desk", mini: "timing" },
      { id: "shelve", label: "Shelve returns", furnitureUid: "l_table", mini: "sequence" },
      { id: "dust", label: "Dust the plant", furnitureUid: "l_plant", mini: "hold" },
      { id: "tip", label: "Quiet tip at the desk", furnitureUid: "l_desk", mini: "timing" },
    ],
  },
  {
    id: "clinic_aide",
    name: "Clinic Aide",
    lotId: "clinic",
    stationDefId: "clinic_desk",
    hireNpcId: "sage",
    pay: 60,
    closedMessage: "Clinic's closed - come back 9 to 5.",
    tasks: [
      { id: "checkin", label: "Check in a patient", furnitureUid: "k_desk", mini: "timing" },
      { id: "tidy", label: "Tidy waiting chairs", furnitureUid: "k_sofa", mini: "sequence" },
      { id: "water", label: "Water the plant", furnitureUid: "k_plant", mini: "hold" },
      { id: "kit", label: "Fetch a kit", furnitureUid: "k_desk", mini: "hold" },
    ],
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
  return job.pay + bonus;
}

export function jobTaskCount(job: JobDef): number {
  return job.tasks?.length ?? job.shiftTasks ?? 2;
}

export function lotNameForJob(jobId: string): string {
  const job = jobById[jobId];
  if (!job) return "work";
  if (job.lotId === "cafe") return "café";
  if (job.lotId === "market") return "market";
  if (job.lotId === "library") return "library";
  if (job.lotId === "clinic") return "clinic";
  return "work";
}
