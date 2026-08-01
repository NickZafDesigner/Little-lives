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
    closedMessage: "Café's closed — come back 9 to 5.",
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
    closedMessage: "Market's closed — come back 9 to 5.",
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
    closedMessage: "Library's closed — come back 9 to 5.",
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
    closedMessage: "Clinic's closed — come back 9 to 5.",
  },
];

export const jobById = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<
  string,
  JobDef
>;

export const CAFE_JOB = JOBS[0];

export const STARTING_MONEY = 45;
