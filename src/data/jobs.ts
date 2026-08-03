import type { JobDef } from "./types";

export const JOBS: JobDef[] = [
  {
    id: "cafe_barista",
    name: "Café Helper",
    lotId: "cafe",
    stationDefId: "counter",
    hireNpcId: "jun",
    pay: 55,
    closedMessage: "Café's closed - clock in from 8:30, shifts 9 to 5.",
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
    closedMessage: "Market's closed - clock in from 8:30, shifts 9 to 5.",
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
    closedMessage: "Library's closed - clock in from 8:30, shifts 9 to 5.",
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
    closedMessage: "Clinic's closed - clock in from 8:30, shifts 9 to 5.",
    tasks: [
      { id: "checkin", label: "Check in a patient", furnitureUid: "k_desk", mini: "timing" },
      { id: "tidy", label: "Tidy waiting chairs", furnitureUid: "k_sofa", mini: "sequence" },
      { id: "water", label: "Water the plant", furnitureUid: "k_plant", mini: "hold" },
      { id: "kit", label: "Fetch a kit", furnitureUid: "k_desk", mini: "hold" },
    ],
  },
  {
    id: "workshop_crafter",
    name: "Workshop Helper",
    lotId: "workshop",
    stationDefId: "workbench",
    hireNpcId: "reed",
    pay: 58,
    closedMessage: "Workshop's closed - clock in from 8:30, shifts 9 to 5.",
    tasks: [
      { id: "sand", label: "Sand a board", furnitureUid: "w_bench", mini: "timing" },
      { id: "sort", label: "Sort the tools", furnitureUid: "w_tools", mini: "sequence" },
      { id: "wipe", label: "Wipe the worktable", furnitureUid: "w_table", mini: "hold" },
      { id: "deliver", label: "Finish an order", furnitureUid: "w_bench", mini: "timing" },
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
  workshop_crafter: {
    title: "Junior Craftsperson",
    payBonus: 16,
    bossLine: "Junior Craftsperson. Your joints are true - keep it up.",
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
  if (job.lotId === "workshop") return "workshop";
  return "work";
}

/** Late or no-show days in a row before the boss fires you. */
export const WORK_MISS_LIMIT = 3;

const WORK_WARNING_LINES: Record<string, [string, string]> = {
  cafe_barista: [
    "You're late again. One more strike and I'm cutting you loose.",
    "Second warning. Be here on time tomorrow - or don't come back.",
  ],
  market_clerk: [
    "Late. I noticed. One more mess-up and you're done.",
    "Second warning. Shelves don't stock themselves - be here on time.",
  ],
  library_aide: [
    "Tardiness noted. Quietly. One more and I'll have to let you go.",
    "Second warning. The desk opens at nine. Be here - or be elsewhere.",
  ],
  clinic_aide: [
    "Patients wait. I don't. One more late day and you're out.",
    "Second warning. Reliability is care. Be on time tomorrow.",
  ],
  workshop_crafter: [
    "Late to the bench. One more miss and I'll find someone else.",
    "Second warning. Measure twice, clock in once - on time.",
  ],
};

const WORK_NO_SHOW_WARNING_LINES: Record<string, [string, string]> = {
  cafe_barista: [
    "You didn't show. That's a warning. Three misses and you're fired.",
    "Second no-show. One more and I'm giving your apron away.",
  ],
  market_clerk: [
    "You skipped a shift. Warning one. Don't make me fire you.",
    "Second no-show. Next time you're gone - permanently.",
  ],
  library_aide: [
    "You were absent. Consider this a warning. Three and you're dismissed.",
    "Second absence. One more blank day and I release you.",
  ],
  clinic_aide: [
    "You didn't come in. That's a warning. Three strikes and you're done.",
    "Second no-show. Miss again and I'll have to let you go.",
  ],
  workshop_crafter: [
    "Empty bench today. Warning one. Three misses ends this.",
    "Second no-show. One more and the job's not yours.",
  ],
};

const WORK_FIRE_LINES: Record<string, string> = {
  cafe_barista:
    "Three strikes. You're fired. Hand back the apron - and good luck.",
  market_clerk:
    "That's three. You're fired. Don't let the jam jars hit you on the way out.",
  library_aide:
    "Three misses. I'm letting you go. Quietly, but firmly - you're fired.",
  clinic_aide:
    "Three strikes. I have to let you go. Take care of yourself out there.",
  workshop_crafter:
    "Three misses. You're fired. The bench stays - you don't.",
};

export function workWarningLine(
  jobId: string,
  streak: number,
  reason: "late" | "no_show",
): string {
  const idx = streak <= 1 ? 0 : 1;
  const table =
    reason === "no_show" ? WORK_NO_SHOW_WARNING_LINES : WORK_WARNING_LINES;
  return (
    table[jobId]?.[idx] ??
    (streak <= 1
      ? "That's a warning. Three late or missed days and you're out."
      : "Second warning. One more and you're fired.")
  );
}

export function workFireLine(jobId: string): string {
  return (
    WORK_FIRE_LINES[jobId] ??
    "Three strikes - late or no-shows. You're fired."
  );
}
