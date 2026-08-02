import { SIDE_QUEST_IDS } from "../data/aspirations";
import { furnitureById } from "../data/furniture";
import { RELATIONSHIP_CLOSE } from "../data/npcs";
import {
  UNLOCK_TASKS,
  unlockTaskById,
  type UnlockTaskDef,
} from "../data/unlockTasks";
import type { FurnitureDef } from "../data/types";
import { computeCozyScore } from "./cozyScore";
import type { GameState } from "./GameState";

export interface UnlockProgress {
  taskId: string;
  title: string;
  hint: string;
  current: number;
  target: number;
  done: boolean;
  /** Short progress label like "2/5". */
  label: string;
}

function closeFriendCount(state: GameState): number {
  let n = 0;
  for (const rel of Object.values(state.relationships)) {
    if (rel.score >= RELATIONSHIP_CLOSE) n += 1;
  }
  return n;
}

function sideQuestsDone(state: GameState): number {
  let n = 0;
  for (const id of SIDE_QUEST_IDS) {
    if (state.quests.completed.includes(id)) n += 1;
  }
  return n;
}

function anyShiftCount(state: GameState): number {
  if (state.aspirations.totalShifts > 0) return state.aspirations.totalShifts;
  let n = 0;
  for (const v of Object.values(state.jobShiftCounts)) n += v;
  return n;
}

export function getUnlockProgress(
  task: UnlockTaskDef,
  state: GameState,
): UnlockProgress {
  const c = task.condition;
  let current = 0;
  let target = 1;

  switch (c.kind) {
    case "job_shifts":
      current = state.jobShiftCounts[c.jobId] ?? 0;
      target = c.count;
      break;
    case "any_shifts":
      current = anyShiftCount(state);
      target = c.count;
      break;
    case "job_promoted":
      current = state.isPromoted(c.jobId) ? 1 : 0;
      target = 1;
      break;
    case "quest_complete":
      current = state.quests.completed.includes(c.questId) ? 1 : 0;
      target = 1;
      break;
    case "adopt_pet":
      current = state.adoptedPet ? 1 : 0;
      target = 1;
      break;
    case "pet_bond":
      current = Math.round(state.adoptedPet?.needs.bond ?? 0);
      target = c.min;
      break;
    case "pet_tricks":
      current = state.aspirations.petTricks;
      target = c.count;
      break;
    case "pet_care_streak":
      current = state.petCareStreak;
      target = c.count;
      break;
    case "cozy_score":
      current = computeCozyScore(state.furniture);
      target = c.min;
      break;
    case "close_friends":
      current = closeFriendCount(state);
      target = c.count;
      break;
    case "side_quests":
      current = sideQuestsDone(state);
      target = c.count;
      break;
    case "weekly_beats":
      current = state.aspirations.weeklyBeatsDone;
      target = c.count;
      break;
  }

  const done = current >= target;
  const clamped = Math.min(current, target);
  return {
    taskId: task.id,
    title: task.title,
    hint: task.hint,
    current: clamped,
    target,
    done,
    label: `${clamped}/${target}`,
  };
}

export function isFurnitureUnlocked(
  def: FurnitureDef,
  state: GameState,
): boolean {
  if (!def.unlockTaskId) return true;
  const task = unlockTaskById[def.unlockTaskId];
  if (!task) return true;
  return getUnlockProgress(task, state).done;
}

export function getFurnitureUnlockProgress(
  def: FurnitureDef,
  state: GameState,
): UnlockProgress | null {
  if (!def.unlockTaskId) return null;
  const task = unlockTaskById[def.unlockTaskId];
  if (!task) return null;
  return getUnlockProgress(task, state);
}

export function listUnlockTasks(state: GameState): UnlockProgress[] {
  return UNLOCK_TASKS.map((t) => getUnlockProgress(t, state));
}

/** Catalog pieces gated by a given unlock task (buyable only). */
export function furnitureForUnlockTask(taskId: string): FurnitureDef[] {
  const out: FurnitureDef[] = [];
  for (const def of Object.values(furnitureById)) {
    if (def.unlockTaskId === taskId && def.price > 0) out.push(def);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Snapshot of completed unlock task ids (for toast diffs). */
export function completedUnlockTaskIds(state: GameState): Set<string> {
  const done = new Set<string>();
  for (const t of UNLOCK_TASKS) {
    if (getUnlockProgress(t, state).done) done.add(t.id);
  }
  return done;
}

/** Furniture names newly unlocked by tasks that just completed. */
export function furnitureUnlockedByTasks(taskIds: string[]): string[] {
  if (taskIds.length === 0) return [];
  const set = new Set(taskIds);
  const names: string[] = [];
  for (const def of Object.values(furnitureById)) {
    if (def.unlockTaskId && set.has(def.unlockTaskId) && def.price > 0) {
      names.push(def.name);
    }
  }
  return names;
}

export function toastNewUnlocks(
  state: GameState,
  before: Set<string>,
): void {
  const after = completedUnlockTaskIds(state);
  const newly: string[] = [];
  for (const id of after) {
    if (!before.has(id)) newly.push(id);
  }
  if (newly.length === 0) return;
  const names = furnitureUnlockedByTasks(newly);
  if (names.length === 0) return;
  if (names.length === 1) {
    state.showToast(`${names[0]} is now available to buy in build mode.`);
  } else if (names.length === 2) {
    state.showToast(
      `${names[0]} & ${names[1]} are now available to buy in build mode.`,
    );
  } else {
    state.showToast(
      `${names.length} furniture pieces are now available to buy in build mode.`,
    );
  }
}
