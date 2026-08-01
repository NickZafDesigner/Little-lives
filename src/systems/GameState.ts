import {
  defaultPlayerLook,
  defaultPlayerProfile,
  type PlayerLook,
  type PlayerProfile,
} from "../data/character";
import { STARTING_MONEY } from "../data/jobs";
import { FULL_NEEDS } from "../data/needs";
import { NPCS } from "../data/npcs";
import { FULL_PET_NEEDS, petById, pickShelterPets } from "../data/pets";
import { emptyQuestProgress, type QuestProgress } from "../data/quests";
import type {
  GameMode,
  NeedsState,
  PetNeedsState,
  PlacedFurniture,
  RelationshipState,
  SaveData,
} from "../data/types";
import { SAVE_VERSION } from "../save/saveLoad";
import { TILE } from "../game/constants";
import { LOTS } from "../world/lots";
import { interiorFurniture } from "../world/rooms";

export class GameState {
  money = STARTING_MONEY;
  dayTime = 0.4; // ~9:36 AM — café already open
  mode: GameMode = "live";
  playerName = "Pippin";
  playerLook: PlayerLook = defaultPlayerLook();
  playerTraits: string[] = ["Friendly", "Curious"];
  favouriteFood = "Pancakes";
  favouriteAnimals: string[] = ["Cats"];
  needs: NeedsState = FULL_NEEDS();
  playerX = 10 * TILE;
  playerY = 14 * TILE;
  furniture: PlacedFurniture[] = [];
  /** Extra build walls on home lot (tile keys). */
  walls = new Set<string>();
  floors = new Map<string, number>();
  relationships: Record<string, RelationshipState> = {};
  adoptedPet: null | {
    defId: string;
    needs: PetNeedsState;
    x: number;
    y: number;
  } = null;
  shelterPets: string[] = pickShelterPets(4);
  busyUntil = 0;
  busyStartedAt = 0;
  busyLabel = "";
  toast = "";
  toastUntil = 0;
  /** Spoken dialogue lines for the bottom dialogue box (portrait + typewriter). */
  dialogueQueue: Array<{
    speakerId: import("../data/types").NpcId;
    speakerName: string;
    text: string;
  }> = [];
  dialogueSeq = 0;
  jobTasksDone = 0;
  jobActive = false;
  /** Active job id while on a shift (cafe_barista, market_clerk, …). */
  activeJobId: string | null = null;
  hiredJobs: string[] = [];
  quests: QuestProgress = emptyQuestProgress();
  /** Null until the player picks something from the catalog. */
  selectedBuildItem: string | null = null;
  buildTool: "furniture" | "wall" | "floor" | "sell" = "furniture";

  get hiredAtCafe(): boolean {
    return this.hiredJobs.includes("cafe_barista");
  }

  set hiredAtCafe(value: boolean) {
    if (value) this.hire("cafe_barista");
    else this.hiredJobs = this.hiredJobs.filter((id) => id !== "cafe_barista");
  }

  isHired(jobId: string): boolean {
    return this.hiredJobs.includes(jobId);
  }

  hire(jobId: string) {
    if (!this.hiredJobs.includes(jobId)) this.hiredJobs.push(jobId);
  }

  constructor() {
    for (const npc of NPCS) {
      this.relationships[npc.id] = { score: 0, met: false };
    }
    this.seedStarterFurniture();
  }

  wallKey(tx: number, ty: number): string {
    return `${tx},${ty}`;
  }

  seedStarterFurniture() {
    this.furniture = [
      ...interiorFurniture("home"),
      ...interiorFurniture("neighbor"),
      ...interiorFurniture("cafe"),
      ...interiorFurniture("shelter"),
      ...interiorFurniture("market"),
      ...interiorFurniture("library"),
      ...interiorFurniture("clinic"),
    ];

    const park = LOTS.find((l) => l.id === "park")!;
    this.furniture.push({
      uid: "p_bench",
      defId: "park_bench",
      tx: park.tx + 4,
      ty: park.ty + 4,
      lotId: "park",
    });
    this.furniture.push({
      uid: "p_bench2",
      defId: "park_bench",
      tx: park.tx + 10,
      ty: park.ty + 8,
      lotId: "park",
    });
  }

  showToast(msg: string, ms = 2200) {
    this.toast = msg;
    this.toastUntil = performance.now() + ms;
  }

  /** Clamp and apply a friendship delta. Returns { before, after, becameFriend }. */
  adjustRelationship(
    npcId: string,
    delta: number,
    friendThreshold = 40,
  ): { before: number; after: number; becameFriend: boolean } {
    const rel = this.relationships[npcId];
    if (!rel) {
      return { before: 0, after: 0, becameFriend: false };
    }
    const before = rel.score;
    rel.score = Math.max(-100, Math.min(100, rel.score + delta));
    rel.met = true;
    return {
      before,
      after: rel.score,
      becameFriend: before < friendThreshold && rel.score >= friendThreshold,
    };
  }

  /** Queue a spoken line (NPC / player thought) for the dialogue box. */
  showDialogue(
    speakerId: import("../data/types").NpcId,
    speakerName: string,
    text: string,
  ) {
    this.dialogueQueue.push({ speakerId, speakerName, text });
    this.dialogueSeq += 1;
  }

  takeDialogueBatch(): typeof this.dialogueQueue {
    if (this.dialogueQueue.length === 0) return [];
    const batch = this.dialogueQueue;
    this.dialogueQueue = [];
    return batch;
  }

  isBusy(now = performance.now()): boolean {
    return now < this.busyUntil;
  }

  startBusy(label: string, durationMs: number) {
    this.busyLabel = label;
    this.busyStartedAt = performance.now();
    this.busyUntil = this.busyStartedAt + durationMs;
  }

  busyProgress(now = performance.now()): number {
    const span = this.busyUntil - this.busyStartedAt;
    if (span <= 0) return 1;
    return Math.max(0, Math.min(1, (now - this.busyStartedAt) / span));
  }

  get adoptedPetName(): string {
    if (!this.adoptedPet) return "";
    return petById[this.adoptedPet.defId]?.name ?? "Pet";
  }

  hasPetSetup(): boolean {
    const homeItems = this.furniture.filter((f) => f.lotId === "home");
    const bed = homeItems.some((f) => f.defId === "pet_bed");
    const bowl = homeItems.some((f) => f.defId === "pet_bowl");
    return bed && bowl;
  }

  applyProfile(profile: PlayerProfile) {
    this.playerName = profile.name;
    this.playerLook = structuredClone(profile.look);
    this.playerTraits = [...profile.traits];
    this.favouriteFood = profile.favouriteFood;
    this.favouriteAnimals = [...profile.favouriteAnimals];
  }

  toSave(): SaveData {
    return {
      version: SAVE_VERSION,
      money: this.money,
      dayTime: this.dayTime,
      hiredAtCafe: this.hiredAtCafe,
      hiredJobs: [...this.hiredJobs],
      quests: {
        active: [...this.quests.active],
        completed: [...this.quests.completed],
        stepCounts: structuredClone(this.quests.stepCounts),
        flags: { ...this.quests.flags },
      },
      player: {
        x: this.playerX,
        y: this.playerY,
        needs: { ...this.needs },
        name: this.playerName,
        look: structuredClone(this.playerLook),
        traits: [...this.playerTraits],
        favouriteFood: this.favouriteFood,
        favouriteAnimals: [...this.favouriteAnimals],
      },
      furniture: this.furniture.map((f) => ({
        ...f,
        rot: f.rot ?? "down",
      })),
      walls: [...this.walls].map((k) => {
        const [tx, ty] = k.split(",").map(Number);
        return { tx, ty, lotId: "home" as const };
      }),
      floors: [...this.floors.entries()].map(([k, variant]) => {
        const [tx, ty] = k.split(",").map(Number);
        return { tx, ty, lotId: "home" as const, variant };
      }),
      relationships: structuredClone(this.relationships),
      adoptedPet: this.adoptedPet
        ? {
            defId: this.adoptedPet.defId,
            needs: { ...this.adoptedPet.needs },
            x: this.adoptedPet.x,
            y: this.adoptedPet.y,
          }
        : null,
      shelterPets: [...this.shelterPets],
      homeHasPetBed: this.furniture.some(
        (f) => f.lotId === "home" && f.defId === "pet_bed",
      ),
      homeHasPetBowl: this.furniture.some(
        (f) => f.lotId === "home" && f.defId === "pet_bowl",
      ),
    };
  }

  loadFrom(data: SaveData) {
    this.money = data.money;
    this.dayTime = data.dayTime;
    this.hiredJobs = data.hiredJobs?.length
      ? [...data.hiredJobs]
      : data.hiredAtCafe
        ? ["cafe_barista"]
        : [];
    this.quests = data.quests
      ? {
          active: [...data.quests.active],
          completed: [...data.quests.completed],
          stepCounts: structuredClone(data.quests.stepCounts ?? {}),
          flags: { ...(data.quests.flags ?? {}) },
        }
      : emptyQuestProgress();
    this.playerName = data.player.name;
    const fallback = defaultPlayerProfile();
    this.playerLook = data.player.look
      ? structuredClone(data.player.look)
      : fallback.look;
    this.playerTraits = data.player.traits?.length
      ? [...data.player.traits]
      : fallback.traits;
    this.favouriteFood = data.player.favouriteFood ?? fallback.favouriteFood;
    this.favouriteAnimals = data.player.favouriteAnimals?.length
      ? [...data.player.favouriteAnimals]
      : fallback.favouriteAnimals;
    this.needs = { ...data.player.needs };
    this.playerX = data.player.x;
    this.playerY = data.player.y;
    this.furniture = data.furniture.map((f) => ({
      ...f,
      rot: f.rot ?? "down",
    }));
    this.walls = new Set(data.walls.map((w) => this.wallKey(w.tx, w.ty)));
    this.floors = new Map(
      data.floors.map((f) => [this.wallKey(f.tx, f.ty), f.variant]),
    );
    this.relationships = structuredClone(data.relationships);
    this.adoptedPet = data.adoptedPet
      ? {
          defId: data.adoptedPet.defId,
          needs: { ...data.adoptedPet.needs },
          x: data.adoptedPet.x,
          y: data.adoptedPet.y,
        }
      : null;
    this.shelterPets = [...data.shelterPets];
  }

  adoptPet(defId: string) {
    const home = LOTS.find((l) => l.id === "home")!;
    this.adoptedPet = {
      defId,
      needs: FULL_PET_NEEDS(),
      x: (home.tx + 5) * TILE,
      y: (home.ty + 5) * TILE,
    };
    this.shelterPets = this.shelterPets.filter((id) => id !== defId);
  }
}
