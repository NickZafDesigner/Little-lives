/**
 * Town Notice Board: daily commissions, favor, and craft unlock helpers.
 */

import {
  COMMISSION_TEMPLATES,
  TOWN_FAVOR_UNLOCKS,
  commissionById,
  recipeById,
  type BoardOffer,
  type CommissionTemplate,
  type CraftedId,
  type RecipeDef,
  type TownBoardState,
} from "../data/crafting";
import { furnitureById } from "../data/furniture";
import type { MaterialId } from "../data/items";
import { jobById, lotNameForJob } from "../data/jobs";
import { NPCS } from "../data/npcs";
import type { WorkMiniKind } from "../data/types";
import type { MiniGrade } from "../ui/WorkMinigame";
import { gradeScore } from "../ui/WorkMinigame";
import { beatForDay } from "./dayCycle";
import type { GameState } from "./GameState";

export interface WorkAssistTarget {
  offerUid: string;
  template: CommissionTemplate;
  jobId: string;
  furnitureUid: string;
  mini: WorkMiniKind;
  label: string;
  lotLabel: string;
  stationLabel: string;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function isRecipeUnlocked(recipe: RecipeDef, state: GameState): boolean {
  const u = recipe.unlock;
  if (u.kind === "always") return true;
  if (u.kind === "workshop_shifts") {
    return (state.jobShiftCounts["workshop_crafter"] ?? 0) >= u.count;
  }
  if (u.kind === "friendship") {
    return (state.relationships[u.npcId]?.score ?? 0) >= u.min;
  }
  if (u.kind === "town_favor") {
    return state.townBoard.favor >= u.min;
  }
  return false;
}

export function canAffordRecipe(recipe: RecipeDef, state: GameState): boolean {
  return recipe.costs.every(
    (c) => state.materialCount(c.itemId) >= c.count,
  );
}

export function recipeUnlockHint(recipe: RecipeDef, state: GameState): string {
  if (isRecipeUnlocked(recipe, state)) return "";
  const u = recipe.unlock;
  if (u.kind === "workshop_shifts") {
    const have = state.jobShiftCounts["workshop_crafter"] ?? 0;
    return `Need ${u.count} workshop shift${u.count > 1 ? "s" : ""} (${have}/${u.count})`;
  }
  if (u.kind === "friendship") {
    const npc = NPCS.find((n) => n.id === u.npcId);
    const have = Math.round(state.relationships[u.npcId]?.score ?? 0);
    return `Friends with ${npc?.name ?? u.npcId} (${have}/${u.min})`;
  }
  if (u.kind === "town_favor") {
    return `Town Favor ${state.townBoard.favor}/${u.min}`;
  }
  return "Locked";
}

export class TownBoardSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /** Ensure today's offers exist (call on load + after sleep). */
  refreshIfNeeded() {
    const board = this.state.townBoard;
    if (board.day === this.state.dayIndex && board.offers.length > 0) return;
    this.rollOffers();
  }

  rollOffers() {
    const state = this.state;
    const rand = mulberry32(state.dayIndex * 9973 + 42);
    const pool = COMMISSION_TEMPLATES.filter((t) => this.templateAvailable(t));
    shuffleInPlace(pool, rand);
    const count = Math.min(3, Math.max(2, pool.length));
    const picked = pool.slice(0, count);
    const offers: BoardOffer[] = picked.map((t, i) => ({
      uid: `board_${state.dayIndex}_${i}_${t.id}`,
      templateId: t.id,
      dayPosted: state.dayIndex,
      done: false,
    }));
    state.townBoard.day = state.dayIndex;
    state.townBoard.offers = offers;
  }

  private templateAvailable(t: CommissionTemplate): boolean {
    if (t.kind === "pet_care" && !this.state.adoptedPet) return false;
    if (t.kind === "bring_beat") {
      const beat = beatForDay(this.state.dayIndex);
      if (!beat || beat.id !== t.beatId) return false;
    }
    if (t.craftedId) {
      const recipe = recipeById[t.craftedId];
      if (
        recipe?.unlock.kind === "town_favor" &&
        this.state.townBoard.favor < recipe.unlock.min
      ) {
        return false;
      }
    }
    return true;
  }

  openOffers(): Array<{ offer: BoardOffer; template: CommissionTemplate }> {
    const out: Array<{ offer: BoardOffer; template: CommissionTemplate }> = [];
    for (const offer of this.state.townBoard.offers) {
      const template = commissionById[offer.templateId];
      if (template) out.push({ offer, template });
    }
    return out;
  }

  /** Resolve where a work_assist commission is completed. */
  resolveWorkAssist(template: CommissionTemplate): WorkAssistTarget | null {
    if (template.kind !== "work_assist" || !template.jobId) return null;
    const job = jobById[template.jobId];
    const task = job?.tasks[0];
    if (!job || !task) return null;
    const furnitureUid = template.furnitureUid ?? task.furnitureUid;
    const placed = this.state.furniture.find((f) => f.uid === furnitureUid);
    const stationLabel =
      (placed && furnitureById[placed.defId]?.name) ||
      furnitureById[
        this.state.furniture.find((f) => f.uid === task.furnitureUid)?.defId ?? ""
      ]?.name ||
      "station";
    return {
      offerUid: "",
      template,
      jobId: job.id,
      furnitureUid,
      mini: task.mini,
      label: task.label,
      lotLabel: lotNameForJob(job.id),
      stationLabel,
    };
  }

  /** Accepted, incomplete work_assist commission (at most one actionable). */
  getAcceptedWorkAssist(): WorkAssistTarget | null {
    for (const offer of this.state.townBoard.offers) {
      if (offer.done || !offer.accepted) continue;
      const template = commissionById[offer.templateId];
      if (!template || template.kind !== "work_assist") continue;
      const resolved = this.resolveWorkAssist(template);
      if (!resolved) continue;
      return { ...resolved, offerUid: offer.uid };
    }
    return null;
  }

  acceptOffer(offerUid: string): WorkAssistTarget | null {
    const offer = this.state.townBoard.offers.find((o) => o.uid === offerUid);
    if (!offer || offer.done) return null;
    const template = commissionById[offer.templateId];
    if (!template || template.kind !== "work_assist") return null;
    const resolved = this.resolveWorkAssist(template);
    if (!resolved) return null;
    offer.accepted = true;
    return { ...resolved, offerUid: offer.uid };
  }

  /** Whether furniture is the assist station (or its host / surface appliance). */
  furnitureMatchesAssist(
    furnUid: string,
    targetUid: string,
  ): boolean {
    if (furnUid === targetUid) return true;
    const furn = this.state.furniture.find((f) => f.uid === furnUid);
    if (!furn) return false;
    if (furn.parentUid === targetUid) return true;
    return this.state.furniture.some(
      (f) => f.parentUid === furnUid && f.uid === targetUid,
    );
  }

  /** Whether the player can turn in / complete this offer right now. */
  canComplete(template: CommissionTemplate): boolean {
    const s = this.state;
    switch (template.kind) {
      case "deliver_craft":
        return !!template.craftedId && s.craftedCount(template.craftedId) > 0;
      case "deliver_material":
        return (
          !!template.materialId &&
          !!template.materialCount &&
          s.materialCount(template.materialId) >= template.materialCount
        );
      case "work_assist":
        return true;
      case "bring_beat":
        return false;
      case "pet_care":
        return (
          !!s.adoptedPet &&
          !!template.craftedId &&
          s.craftedCount(template.craftedId) > 0
        );
      default:
        return false;
    }
  }

  completeStatus(template: CommissionTemplate, offer?: BoardOffer): string {
    switch (template.kind) {
      case "deliver_craft":
        return this.canComplete(template)
          ? "Ready to turn in"
          : `Craft ${recipeById[template.craftedId!]?.name ?? "item"} first`;
      case "deliver_material": {
        const have = this.state.materialCount(template.materialId as MaterialId);
        const need = template.materialCount ?? 0;
        return have >= need
          ? "Ready to turn in"
          : `Need ${need}× ${template.materialId} (${have}/${need})`;
      }
      case "work_assist": {
        const target = this.resolveWorkAssist(template);
        if (!target) return "Help at the workplace";
        if (offer?.accepted) {
          return `Go to the ${target.lotLabel} · use the ${target.stationLabel}`;
        }
        return `Accept, then help at the ${target.lotLabel}`;
      }
      case "bring_beat":
        return this.state.craftedCount(template.craftedId!) > 0
          ? "Bring it to today's Park Picnic"
          : "Craft a Handmade Stool, then join the picnic";
      case "pet_care":
        if (!this.state.adoptedPet) return "Adopt a pet first";
        return this.canComplete(template)
          ? "Ready — play with your pet"
          : "Craft a Pet Mouse Toy first";
      default:
        return "";
    }
  }

  /**
   * Consume requirements and grant rewards. Returns false if not completable.
   * work_assist should call this after the minigame resolves.
   */
  completeOffer(offerUid: string, opts?: { grade?: MiniGrade }): boolean {
    const state = this.state;
    const offer = state.townBoard.offers.find((o) => o.uid === offerUid);
    if (!offer || offer.done) return false;
    const template = commissionById[offer.templateId];
    if (!template) return false;

    if (template.kind === "bring_beat") return false;

    if (template.kind !== "work_assist" && !this.canComplete(template)) {
      return false;
    }

    if (template.kind === "deliver_craft" && template.craftedId) {
      if (!state.removeCrafted(template.craftedId, 1)) return false;
    } else if (
      template.kind === "deliver_material" &&
      template.materialId &&
      template.materialCount
    ) {
      if (!state.removeMaterial(template.materialId, template.materialCount)) {
        return false;
      }
    } else if (template.kind === "pet_care" && template.craftedId) {
      if (!state.removeCrafted(template.craftedId, 1)) return false;
      if (state.adoptedPet) {
        state.adoptedPet.needs.fun = Math.min(
          100,
          state.adoptedPet.needs.fun + 28,
        );
        state.adoptedPet.needs.bond = Math.min(
          100,
          state.adoptedPet.needs.bond + 12,
        );
        state.dailyStats.petBondGain += 12;
      }
    }

    this.grantRewards(template, opts?.grade);
    offer.done = true;
    return true;
  }

  /**
   * If an open bring_beat offer matches today's beat and the player has the item,
   * consume it and complete during weekly beat claim.
   */
  tryCompleteBringBeat(beatId: string): boolean {
    const state = this.state;
    for (const offer of state.townBoard.offers) {
      if (offer.done) continue;
      const template = commissionById[offer.templateId];
      if (!template || template.kind !== "bring_beat") continue;
      if (template.beatId !== beatId) continue;
      if (!template.craftedId || state.craftedCount(template.craftedId) <= 0) {
        continue;
      }
      if (!state.removeCrafted(template.craftedId, 1)) continue;
      this.grantRewards(template);
      offer.done = true;
      return true;
    }
    return false;
  }

  private grantRewards(template: CommissionTemplate, grade?: MiniGrade) {
    const state = this.state;
    let money = template.rewardMoney;
    if (grade) {
      money = Math.round(money * (0.7 + 0.35 * gradeScore(grade)));
    }
    if (state.hasUnlock("town_favor_helper")) {
      money += 3;
    }
    state.money += money;
    state.dailyStats.moneyEarned += money;
    state.adjustRelationship(template.npcId, template.rewardFriendship);
    state.townBoard.favor += template.rewardFavor;
    state.townBoard.completedCount += 1;
    state.dailyStats.commissionsDone =
      (state.dailyStats.commissionsDone ?? 0) + 1;
    this.applyFavorUnlocks();
  }

  applyFavorUnlocks() {
    const state = this.state;
    for (const row of TOWN_FAVOR_UNLOCKS) {
      if (state.townBoard.favor < row.favor) continue;
      if (state.aspirations.unlocks.includes(row.unlockId)) continue;
      state.aspirations.unlocks.push(row.unlockId);
      state.showToast(row.toast, 3200);
    }
  }

  /**
   * Spend materials and grant crafted output. Caller runs the minigame first.
   */
  finishCraft(recipeId: CraftedId, grade: MiniGrade): boolean {
    const recipe = recipeById[recipeId];
    if (!recipe || !isRecipeUnlocked(recipe, this.state)) return false;
    if (!canAffordRecipe(recipe, this.state)) return false;

    for (const c of recipe.costs) {
      if (!this.state.removeMaterial(c.itemId, c.count)) {
        return false;
      }
    }

    if (recipe.output === "furniture" && recipe.furnitureId) {
      if (!this.state.craftedUnlocks.includes(recipe.furnitureId)) {
        this.state.craftedUnlocks.push(recipe.furnitureId);
      }
      this.state.addCrafted(recipe.id, 1);
      this.state.showToast(`${recipe.name} unlocked in build mode!`, 3000);
    } else {
      this.state.addCrafted(recipe.id, 1);
    }

    this.state.townBoard.craftsMade += 1;
    const fun = grade === "perfect" ? 22 : grade === "ok" ? 14 : 8;
    this.state.needs.fun = Math.min(100, this.state.needs.fun + fun);
    this.state.needs.energy = Math.max(0, this.state.needs.energy - 6);
    return true;
  }

  /** Use a pet toy from the bag (also completes matching board offer). */
  usePetToy(craftedId: CraftedId): boolean {
    const recipe = recipeById[craftedId];
    if (!recipe || recipe.output !== "pet_toy") return false;
    if (!this.state.adoptedPet) return false;
    if (!this.state.removeCrafted(craftedId, 1)) return false;
    const pet = this.state.adoptedPet;
    pet.needs.fun = Math.min(100, pet.needs.fun + 30);
    pet.needs.bond = Math.min(100, pet.needs.bond + 14);
    this.state.dailyStats.petBondGain += 14;

    for (const offer of this.state.townBoard.offers) {
      if (offer.done) continue;
      const t = commissionById[offer.templateId];
      if (t?.kind === "pet_care" && t.craftedId === craftedId) {
        this.grantRewards(t);
        offer.done = true;
        break;
      }
    }
    return true;
  }
}

export type { TownBoardState };
