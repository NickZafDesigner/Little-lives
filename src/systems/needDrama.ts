import {
  NEED_CRITICAL,
  applyNeedDeltas,
  criticalNeedThoughts,
} from "../data/needs";
import type { NeedId } from "../data/types";
import type { GameState } from "./GameState";
import { sleepToMorning, emptyDailyStats, formatDailySummary } from "./dayCycle";
import { computeCozyScore } from "./cozyScore";

const THOUGHT_COOLDOWN_MS = 14_000;
const COLLAPSE_COOLDOWN_MS = 45_000;
const BLADDER_COOLDOWN_MS = 50_000;

function needHint(state: GameState, id: NeedId) {
  return { id, value: Math.round(state.needs[id]) };
}

/**
 * Soft need drama: comedy thoughts, collapse nap, bladder accident.
 * Returns true if a collapse busy action was started.
 */
export function tickNeedDrama(
  state: GameState,
  now: number,
  onCollapse: (durationMs: number) => void,
  onBladderAccident?: () => void,
  onThought?: (msg: string) => void,
): void {
  if (state.mode !== "live" || state.isBusy(now)) return;

  // Comedy thought (includes wet reminder)
  if (now - state.lastCriticalThoughtAt > THOUGHT_COOLDOWN_MS) {
    const thought = criticalNeedThoughts(state.needs, state.isWet);
    if (thought) {
      state.lastCriticalThoughtAt = now;
      state.showDialogue("player", state.playerName, thought.text, {
        needHint: needHint(state, thought.needId),
      });
    }
  }

  // Bladder emergency - wet yourself with lasting consequences
  if (
    state.needs.bladder <= 0 &&
    now - state.lastBladderAccidentAt > BLADDER_COOLDOWN_MS
  ) {
    state.lastBladderAccidentAt = now;
    state.isWet = true;
    state.needs = applyNeedDeltas(state.needs, {
      bladder: 40,
      hygiene: -40,
      fun: -15,
    });
    if (state.needs.hygiene > 20) state.needs.hygiene = 20;
    const showerLine = "Ugh… I need a shower.";
    if (onThought) onThought(showerLine);
    else state.showToast(showerLine, 2800);
    state.showDialogue("player", state.playerName, "I… I wet myself.", {
      needHint: needHint(state, "bladder"),
    });
    onBladderAccident?.();
  }

  // Energy collapse - short nap on the spot + small time skip
  if (
    state.needs.energy <= 0 &&
    now - state.lastCollapseAt > COLLAPSE_COOLDOWN_MS
  ) {
    state.lastCollapseAt = now;
    const ms = 1800;
    state.startBusy("Collapsed for a tiny nap", ms);
    onCollapse(ms);
  }
}

export function applyCollapseRecovery(state: GameState): string {
  state.needs = applyNeedDeltas(state.needs, {
    energy: 28,
    fun: -6,
    social: -4,
  });
  state.dayTime = (state.dayTime + 0.04) % 1; // ~1 hour
  state.showDialogue(
    "player",
    state.playerName,
    "Floor nap: 3 stars. Neck: 1 star.",
    { needHint: needHint(state, "energy") },
  );
  return "Bonk. Tiny nap on the spot - feeling a bit better.";
}

/** Full sleep: restore energy, advance to morning, daily summary. */
export function finishSleepNight(
  state: GameState,
  baseEnergy: number,
  bonusEnergy: number,
): string {
  const { dayTime, crossedMidnight } = sleepToMorning(state.dayTime);
  state.dayTime = dayTime;
  if (crossedMidnight) state.dayIndex += 1;
  else state.dayIndex += 1; // sleeping always ends the day in this cosy loop

  state.needs = applyNeedDeltas(state.needs, {
    energy: baseEnergy + bonusEnergy,
    fun: -5,
  });
  // Cap energy after big sleep
  if (state.needs.energy > 100) state.needs.energy = 100;

  const summary = formatDailySummary(
    state.dayIndex - 1,
    state.dailyStats,
    computeCozyScore(state.furniture),
  );
  state.dailyStats = emptyDailyStats();
  return summary;
}

export function isCriticalEnergy(state: GameState): boolean {
  return state.needs.energy < NEED_CRITICAL;
}
