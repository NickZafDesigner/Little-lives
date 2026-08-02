import {
  QUESTS,
  questById,
  type QuestDef,
  type QuestEvent,
} from "../data/quests";
import type { GameState } from "./GameState";
import {
  completedUnlockTaskIds,
  toastNewUnlocks,
} from "./unlockProgress";

export interface QuestTrackerInfo {
  title: string;
  objective: string;
  side?: boolean;
}

/**
 * Data-driven quest runner. Gameplay emits events; this advances steps,
 * unlocks follow-ups, applies rewards, and feeds the HUD tracker.
 */
export class QuestSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /** Call once when entering the world (new game or continue). */
  bootstrap(isNewGame: boolean) {
    if (isNewGame) {
      this.tryUnlockQuests();
    } else {
      this.tryUnlockQuests();
    }
  }

  emit(
    event: QuestEvent,
    _payload?: Record<string, unknown>,
    opts?: { unlockToast?: boolean },
  ) {
    const unlockToast = opts?.unlockToast !== false;
    const unlockBefore = completedUnlockTaskIds(this.state);
    const q = this.state.quests;
    let changed = false;

    for (const questId of [...q.active]) {
      const def = questById[questId];
      if (!def) continue;
      const counts = q.stepCounts[questId] ?? (q.stepCounts[questId] = {});

      for (const step of def.steps) {
        if (step.event !== event) continue;
        const need = step.count ?? 1;
        const have = counts[step.id] ?? 0;
        if (have >= need) continue;
        counts[step.id] = have + 1;
        changed = true;
      }

      if (this.isQuestFullyDone(def, counts)) {
        this.completeQuest(def);
        changed = true;
      }
    }

    if (changed) {
      this.tryUnlockQuests();
      if (unlockToast) toastNewUnlocks(this.state, unlockBefore);
    }
  }

  getTracker(): QuestTrackerInfo | null {
    const q = this.state.quests;
    // Prefer main (non-side) active quests, then side.
    const ordered = [...q.active].sort((a, b) => {
      const da = questById[a];
      const db = questById[b];
      const sa = da?.side ? 1 : 0;
      const sb = db?.side ? 1 : 0;
      return sa - sb;
    });

    for (const id of ordered) {
      const def = questById[id];
      if (!def) continue;
      const counts = q.stepCounts[id] ?? {};
      const step = def.steps.find((s) => (counts[s.id] ?? 0) < (s.count ?? 1));
      if (!step) continue;
      const have = counts[step.id] ?? 0;
      const need = step.count ?? 1;
      let objective = step.objectiveLabel;
      if (need > 1) {
        objective = objective.replace(/\(\d+\/\d+\)/, `(${have}/${need})`);
        if (!/\(\d+\/\d+\)/.test(step.objectiveLabel)) {
          objective = `${step.objectiveLabel} (${have}/${need})`;
        }
      }
      // settled_in: mention remaining if multiple incomplete
      const incomplete = def.steps.filter(
        (s) => (counts[s.id] ?? 0) < (s.count ?? 1),
      );
      if (incomplete.length > 1 && def.id === "settled_in") {
        objective = incomplete.map((s) => s.objectiveLabel).join(" · ");
      }
      return { title: def.title, objective, side: def.side };
    }
    return null;
  }

  isActive(questId: string): boolean {
    return this.state.quests.active.includes(questId);
  }

  isCompleted(questId: string): boolean {
    return this.state.quests.completed.includes(questId);
  }

  /** Current incomplete step id for an active quest, or null. */
  currentStepId(questId: string): string | null {
    const def = questById[questId];
    if (!def || !this.isActive(questId)) return null;
    const counts = this.state.quests.stepCounts[questId] ?? {};
    const step = def.steps.find((s) => (counts[s.id] ?? 0) < (s.count ?? 1));
    return step?.id ?? null;
  }

  stepProgress(questId: string, stepId: string): number {
    return this.state.quests.stepCounts[questId]?.[stepId] ?? 0;
  }

  private isQuestFullyDone(
    def: QuestDef,
    counts: Record<string, number>,
  ): boolean {
    return def.steps.every((s) => (counts[s.id] ?? 0) >= (s.count ?? 1));
  }

  private completeQuest(def: QuestDef) {
    const q = this.state.quests;
    q.active = q.active.filter((id) => id !== def.id);
    if (!q.completed.includes(def.id)) q.completed.push(def.id);

    if (def.rewards) {
      if (def.rewards.money) {
        this.state.money += def.rewards.money;
      }
      if (def.rewards.friendshipNpcId && def.rewards.friendshipDelta) {
        const rel = this.state.relationships[def.rewards.friendshipNpcId];
        if (rel) {
          rel.score = Math.max(
            -100,
            Math.min(100, rel.score + def.rewards.friendshipDelta),
          );
        }
      }
      const bits: string[] = [`${def.title} complete!`];
      if (def.rewards.money) bits.push(`+$${def.rewards.money}`);
      this.state.showToast(bits.join(" "), 2800);
    }
    // Main-chain completions rely on the next quest's journal dialogue.
  }

  private canUnlock(def: QuestDef): boolean {
    const q = this.state.quests;
    if (q.active.includes(def.id) || q.completed.includes(def.id)) return false;
    if (def.requires) {
      for (const req of def.requires) {
        if (!q.completed.includes(req)) return false;
      }
    }
    if (def.unlockWhen?.hiredAtCafe && !this.state.hiredAtCafe) return false;
    if (
      def.unlockWhen?.hiredJobId &&
      !this.state.isHired(def.unlockWhen.hiredJobId)
    ) {
      return false;
    }
    return true;
  }

  private startQuest(def: QuestDef) {
    const q = this.state.quests;
    if (q.active.includes(def.id) || q.completed.includes(def.id)) return;
    q.active.push(def.id);
    q.stepCounts[def.id] = {};
    // Side / silent quests stay quiet until gameplay surfaces the beat.
    if (!def.side && !def.silentStart) {
      this.state.showDialogue("player", this.state.playerName, def.journalLine);
    }
  }

  tryUnlockQuests() {
    for (const def of QUESTS) {
      if (def.autoStart && this.canUnlock(def)) {
        this.startQuest(def);
        continue;
      }
      if (!def.autoStart && this.canUnlock(def)) {
        // Main chain unlocks when requires met; side quests when hired.
        if (def.requires?.length || def.unlockWhen) {
          this.startQuest(def);
        }
      }
    }
  }
}
