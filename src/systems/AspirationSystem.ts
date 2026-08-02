import {
  ASPIRATIONS,
  aspirationById,
  SIDE_QUEST_IDS,
  type AspirationId,
  type AspirationProgress,
} from "../data/aspirations";
import { RELATIONSHIP_CLOSE } from "../data/npcs";
import type { GameState } from "./GameState";
import { computeCozyScore } from "./cozyScore";

export interface AspirationTrackerInfo {
  title: string;
  objective: string;
}

/**
 * Lifestyle goals that keep the sandbox alive after Heart of Town.
 * Progress is recomputed from world state + counters on GameState.aspirations.
 */
export class AspirationSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  ensureSelected() {
    const a = this.state.aspirations;
    if (!a.selected && this.state.quests.completed.includes("heart_of_town")) {
      // Auto-offer: pick first incomplete
      const next = ASPIRATIONS.find((d) => !a.completed.includes(d.id));
      if (next) {
        a.selected = next.id;
        this.state.showDialogue(
          "player",
          this.state.playerName,
          `New lifestyle goal: ${next.title}. ${next.description}`,
        );
      }
    }
  }

  /** Recompute meters and complete any finished aspirations. */
  refresh() {
    this.ensureSelected();
    const a = this.state.aspirations;
    a.progress.homebody = computeCozyScore(this.state.furniture);
    a.progress.social_butterfly = this.closeFriendCount();
    a.progress.pet_parent = a.petTricks;
    a.progress.career_kid = a.totalShifts;
    a.progress.town_helper =
      this.sideQuestsDone() + Math.min(3, a.weeklyBeatsDone);

    for (const def of ASPIRATIONS) {
      if (a.completed.includes(def.id)) continue;
      const value = a.progress[def.id] ?? 0;
      // Pet parent also needs max bond
      if (def.id === "pet_parent") {
        const bond = this.state.adoptedPet?.needs.bond ?? 0;
        if (bond < 100 || value < def.target) continue;
      } else if (value < def.target) {
        continue;
      }
      this.complete(def.id);
    }
  }

  private complete(id: AspirationId) {
    const a = this.state.aspirations;
    const def = aspirationById[id];
    if (!def || a.completed.includes(id)) return;
    a.completed.push(id);
    if (!a.unlocks.includes(def.unlockId)) a.unlocks.push(def.unlockId);
    this.state.money += def.rewardMoney;
    if (def.rewardToast) this.state.showToast(def.rewardToast, 3200);
    // Pick next focus
    if (a.selected === id) {
      const next = ASPIRATIONS.find((d) => !a.completed.includes(d.id));
      a.selected = next?.id ?? null;
      if (next) {
        this.state.showDialogue(
          "player",
          this.state.playerName,
          `Next goal: ${next.title}. ${next.description}`,
        );
      }
    }
  }

  noteShift() {
    this.state.aspirations.totalShifts += 1;
    this.refresh();
  }

  noteWeeklyBeat() {
    this.state.aspirations.weeklyBeatsDone += 1;
    this.refresh();
  }

  notePetTrick() {
    this.state.aspirations.petTricks += 1;
    this.refresh();
  }

  private closeFriendCount(): number {
    let n = 0;
    for (const rel of Object.values(this.state.relationships)) {
      if (rel.score >= RELATIONSHIP_CLOSE) n += 1;
    }
    return n;
  }

  private sideQuestsDone(): number {
    let n = 0;
    for (const id of SIDE_QUEST_IDS) {
      if (this.state.quests.completed.includes(id)) n += 1;
    }
    return n;
  }

  getTracker(): AspirationTrackerInfo | null {
    // Only show after main chain (or if already selected)
    const a = this.state.aspirations;
    if (
      !a.selected &&
      !this.state.quests.completed.includes("heart_of_town")
    ) {
      return null;
    }
    this.refresh();
    const id = a.selected;
    if (!id) {
      if (a.completed.length >= ASPIRATIONS.length) {
        return {
          title: "Lifestyle",
          objective: "Every aspiration complete - enjoy the town!",
        };
      }
      return null;
    }
    const def = aspirationById[id];
    const have = Math.min(def.target, a.progress[id] ?? 0);
    let objective = `${def.description} (${have}/${def.target})`;
    if (id === "pet_parent") {
      const bond = Math.round(this.state.adoptedPet?.needs.bond ?? 0);
      objective = `Teach tricks (${a.petTricks}/2) · bond ${bond}/100`;
    }
    if (id === "town_helper") {
      objective = `Side quests ${this.sideQuestsDone()}/5 · weekly beats ${Math.min(3, a.weeklyBeatsDone)}/3`;
    }
    return { title: def.title, objective };
  }
}

export type { AspirationProgress };
