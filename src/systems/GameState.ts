import {
  emptyAspirationProgress,
  type AspirationProgress,
} from "../data/aspirations";
import {
  defaultPlayerLook,
  defaultPlayerProfile,
  type PlayerLook,
  type PlayerProfile,
} from "../data/character";
import {
  emptyInventory,
  harvestRespawnDays,
  seedHarvestNodes,
  type HarvestNodeInstance,
  type InventoryState,
  type MaterialId,
  type ToolId,
} from "../data/items";
import { STARTING_MONEY } from "../data/jobs";
import { FULL_NEEDS } from "../data/needs";
import { NPCS, RELATIONSHIP_CLOSE, RELATIONSHIP_FRIEND, RELATIONSHIP_MAX } from "../data/npcs";
import { FULL_PET_NEEDS, petById, pickShelterPets } from "../data/pets";
import { emptyQuestProgress, type QuestProgress } from "../data/quests";
import type {
  GameMode,
  NeedsState,
  NpcId,
  PetNeedsState,
  PlacedFurniture,
  PorchDrop,
  RelationshipState,
  SaveData,
} from "../data/types";
import { SAVE_VERSION } from "../save/saveLoad";
import { TILE } from "../game/constants";
import { emptyDailyStats, type DailyStats } from "./dayCycle";
import { LOTS } from "../world/lots";
import { interiorFurniture } from "../world/rooms";

/** Outdoor park seating, picnic table, and planters. */
function parkOutdoorFurniture(): PlacedFurniture[] {
  const park = LOTS.find((l) => l.id === "park")!;
  return [
    // Benches on the ring, facing the pond.
    {
      uid: "p_bench",
      defId: "park_bench",
      tx: park.tx + 3,
      ty: park.ty + 6,
      lotId: "park",
      rot: "right",
    },
    {
      uid: "p_bench2",
      defId: "park_bench",
      tx: park.tx + 16,
      ty: park.ty + 6,
      lotId: "park",
      rot: "left",
    },
    {
      uid: "p_bench3",
      defId: "park_bench",
      tx: park.tx + 6,
      ty: park.ty + 2,
      lotId: "park",
      rot: "down",
    },
    {
      uid: "p_bench4",
      defId: "park_bench",
      tx: park.tx + 12,
      ty: park.ty + 2,
      lotId: "park",
      rot: "down",
    },
    {
      uid: "p_bench5",
      defId: "park_bench",
      tx: park.tx + 6,
      ty: park.ty + 11,
      lotId: "park",
      rot: "up",
    },
    {
      uid: "p_bench6",
      defId: "park_bench",
      tx: park.tx + 12,
      ty: park.ty + 11,
      lotId: "park",
      rot: "up",
    },
    {
      uid: "p_picnic",
      defId: "picnic_set",
      tx: park.tx + 4,
      ty: park.ty + 8,
      lotId: "park",
      rot: "right",
    },
    {
      uid: "p_table",
      defId: "table",
      tx: park.tx + 15,
      ty: park.ty + 8,
      lotId: "park",
    },
    // Corner planters outside the ring.
    {
      uid: "p_plant1",
      defId: "plant",
      tx: park.tx + 1,
      ty: park.ty + 1,
      lotId: "park",
    },
    {
      uid: "p_plant2",
      defId: "fern",
      tx: park.tx + 1,
      ty: park.ty + 12,
      lotId: "park",
    },
    {
      uid: "p_plant3",
      defId: "plant",
      tx: park.tx + 18,
      ty: park.ty + 1,
      lotId: "park",
    },
    {
      uid: "p_plant4",
      defId: "fern",
      tx: park.tx + 18,
      ty: park.ty + 12,
      lotId: "park",
    },
    {
      uid: "p_plant5",
      defId: "plant",
      tx: park.tx + 8,
      ty: park.ty + 1,
      lotId: "park",
    },
    {
      uid: "p_plant6",
      defId: "fern",
      tx: park.tx + 11,
      ty: park.ty + 1,
      lotId: "park",
    },
  ];
}

/** Swing set + slide south of Town Park. */
function playparkOutdoorFurniture(): PlacedFurniture[] {
  const play = LOTS.find((l) => l.id === "playpark")!;
  return [
    {
      uid: "pp_swing",
      defId: "swing_set",
      tx: play.tx + 2,
      ty: play.ty + 3,
      lotId: "playpark",
      rot: "down",
    },
    {
      uid: "pp_slide",
      defId: "slide",
      tx: play.tx + 11,
      ty: play.ty + 2,
      lotId: "playpark",
      rot: "down",
    },
    {
      uid: "pp_bench",
      defId: "park_bench",
      tx: play.tx + 6,
      ty: play.ty + 6,
      lotId: "playpark",
      rot: "up",
    },
  ];
}

/** Beach benches along the south sand strip. */
function beachOutdoorFurniture(): PlacedFurniture[] {
  return [
    {
      uid: "b_bench1",
      defId: "park_bench",
      tx: 22,
      ty: 63,
      lotId: "park",
      rot: "up",
    },
    {
      uid: "b_bench2",
      defId: "park_bench",
      tx: 48,
      ty: 63,
      lotId: "park",
      rot: "up",
    },
    {
      uid: "b_bench3",
      defId: "park_bench",
      tx: 68,
      ty: 63,
      lotId: "park",
      rot: "up",
    },
  ];
}

/** Boardwalk fishing spots + seating on the Sunny Pier. */
function pierOutdoorFurniture(): PlacedFurniture[] {
  const pier = LOTS.find((l) => l.id === "pier")!;
  return [
    {
      uid: "pier_fish1",
      defId: "fishing_spot",
      tx: pier.tx + 2,
      ty: pier.ty + 3,
      lotId: "pier",
      rot: "left",
    },
    {
      uid: "pier_fish2",
      defId: "fishing_spot",
      tx: pier.tx + 15,
      ty: pier.ty + 3,
      lotId: "pier",
      rot: "right",
    },
    {
      uid: "pier_bench",
      defId: "park_bench",
      tx: pier.tx + 8,
      ty: pier.ty + 2,
      lotId: "pier",
      rot: "up",
    },
    {
      uid: "pier_plant",
      defId: "plant",
      tx: pier.tx + 10,
      ty: pier.ty + 5,
      lotId: "pier",
    },
  ];
}

export class GameState {
  money = STARTING_MONEY;
  dayTime = 0.4; // ~9:36 AM - café already open
  dayIndex = 1;
  mode: GameMode = "live";
  playerName = "Pippin";
  playerLook: PlayerLook = defaultPlayerLook();
  playerTraits: string[] = ["Friendly", "Curious"];
  favouriteFood = "Pancakes";
  favouriteAnimals: string[] = ["Cats"];
  needs: NeedsState = FULL_NEEDS();
  // Bed centre on home lot (lot 3,3 + bed rx/ry 2,1, 2×2 footprint).
  playerX = 6 * TILE;
  playerY = 5 * TILE;
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
  shelterPets: string[] = pickShelterPets(6);
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
  /** Per-task quality scores (0–1) for the active shift. */
  jobQualityScores: number[] = [];
  /** True if this shift was clocked in after WORK_LATE. */
  shiftLate = false;
  /** dayIndex of the last completed shift (−1 = never). One shift per day. */
  lastShiftDay = -1;
  hiredJobs: string[] = [];
  jobShiftCounts: Record<string, number> = {};
  jobPromoted: string[] = [];
  quests: QuestProgress = emptyQuestProgress();
  aspirations: AspirationProgress = emptyAspirationProgress();
  dailyStats: DailyStats = emptyDailyStats();
  flirtCounts: Record<string, number> = {};
  /** dayIndex when weekly beat was last claimed (−1 = never). */
  weeklyBeatDay = -1;
  lastPetCareDay = -1;
  petCareStreak = 0;
  lastCriticalThoughtAt = 0;
  lastCollapseAt = 0;
  lastBladderAccidentAt = 0;
  /** Wet after a bladder accident until shower clears it. */
  isWet = false;
  /** Null until the player picks something from the catalog. */
  selectedBuildItem: string | null = null;
  buildTool: "furniture" | "wall" | "floor" | "sell" = "furniture";
  inventory: InventoryState = emptyInventory();
  /** Harvest node placements (static seed; depletion tracked separately). */
  harvestNodes: HarvestNodeInstance[] = seedHarvestNodes();
  /** uid → dayIndex when depleted; respawns after staggered multi-day delay. */
  harvestDepleted: Record<string, number> = {};
  /** Flower tile "tx,ty" → dayIndex when picked (respawns next day). */
  flowerDepleted: Record<string, number> = {};
  /** Villagers living at the player's home. */
  roommates: NpcId[] = [];
  /** Goods left on the porch for the player to collect. */
  porchDrops: PorchDrop[] = [];
  /** Roommate id → dayIndex when last sent on a harvest errand. */
  roommateErrandDay: Record<string, number> = {};
  /** First-visit toasts for forest / mine. */
  visitedGatherLots: Partial<Record<"forest" | "mine", boolean>> = {};

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

  isPromoted(jobId: string): boolean {
    return this.jobPromoted.includes(jobId);
  }

  hasUnlock(id: string): boolean {
    return this.aspirations.unlocks.includes(id);
  }

  hasTool(id: ToolId): boolean {
    return this.inventory.tools.includes(id);
  }

  addTool(id: ToolId): boolean {
    if (this.hasTool(id)) return false;
    this.inventory.tools.push(id);
    return true;
  }

  materialCount(id: MaterialId): number {
    return this.inventory.materials[id] ?? 0;
  }

  addMaterial(id: MaterialId, count: number) {
    if (count <= 0) return;
    this.inventory.materials[id] = this.materialCount(id) + count;
  }

  removeMaterial(id: MaterialId, count: number): boolean {
    const have = this.materialCount(id);
    if (count <= 0 || have < count) return false;
    const next = have - count;
    if (next <= 0) delete this.inventory.materials[id];
    else this.inventory.materials[id] = next;
    return true;
  }

  isHarvestDepleted(uid: string): boolean {
    const day = this.harvestDepleted[uid];
    if (day === undefined) return false;
    const node = this.harvestNodes.find((n) => n.uid === uid);
    const need = harvestRespawnDays(node?.defId ?? "", uid);
    return this.dayIndex < day + need;
  }

  depleteHarvest(uid: string) {
    this.harvestDepleted[uid] = this.dayIndex;
  }

  flowerKey(tx: number, ty: number): string {
    return `${tx},${ty}`;
  }

  isFlowerDepleted(tx: number, ty: number): boolean {
    const day = this.flowerDepleted[this.flowerKey(tx, ty)];
    if (day === undefined) return false;
    return this.dayIndex < day + 1;
  }

  depleteFlower(tx: number, ty: number) {
    this.flowerDepleted[this.flowerKey(tx, ty)] = this.dayIndex;
  }

  isRoommate(id: string): boolean {
    return this.roommates.includes(id as NpcId);
  }

  addRoommate(id: NpcId): boolean {
    if (this.isRoommate(id)) return false;
    this.roommates.push(id);
    return true;
  }

  removeRoommate(id: NpcId): boolean {
    const before = this.roommates.length;
    this.roommates = this.roommates.filter((r) => r !== id);
    return this.roommates.length < before;
  }

  canSendRoommateErrand(id: string): boolean {
    if (!this.isRoommate(id)) return false;
    return this.roommateErrandDay[id] !== this.dayIndex;
  }

  markRoommateErrand(id: string) {
    this.roommateErrandDay[id] = this.dayIndex;
  }

  addPorchDrop(drop: Omit<PorchDrop, "uid">): PorchDrop {
    const full: PorchDrop = {
      ...drop,
      uid: `porch_${this.dayIndex}_${this.porchDrops.length}_${Math.floor(Math.random() * 9999)}`,
    };
    this.porchDrops.push(full);
    return full;
  }

  takePorchDrop(uid: string): PorchDrop | null {
    const i = this.porchDrops.findIndex((d) => d.uid === uid);
    if (i < 0) return null;
    const [drop] = this.porchDrops.splice(i, 1);
    return drop ?? null;
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
      ...interiorFurniture("workshop"),
      ...parkOutdoorFurniture(),
      ...playparkOutdoorFurniture(),
      ...beachOutdoorFurniture(),
      ...pierOutdoorFurniture(),
    ];
  }

  /** Bring older saves up to the current park / beach / playpark scenery set. */
  ensureParkFurniture() {
    const byUid = new Map(this.furniture.map((f) => [f.uid, f]));
    for (const piece of [
      ...parkOutdoorFurniture(),
      ...playparkOutdoorFurniture(),
      ...beachOutdoorFurniture(),
      ...pierOutdoorFurniture(),
    ]) {
      const existing = byUid.get(piece.uid);
      if (existing) {
        existing.tx = piece.tx;
        existing.ty = piece.ty;
        existing.rot = piece.rot;
        existing.defId = piece.defId;
      } else {
        this.furniture.push({ ...piece });
      }
    }
    this.ensureWorkplaceFurniture();
  }

  /**
   * Keep authored workplace / NPC interior pieces on their designed tiles/rots,
   * and backfill any missing hop-stations for older saves.
   * Home starters only come from seedStarterFurniture - players may rearrange them.
   */
  ensureWorkplaceFurniture() {
    const byUid = new Map(this.furniture.map((f) => [f.uid, f]));
    for (const lotId of [
      "neighbor",
      "cafe",
      "shelter",
      "market",
      "library",
      "clinic",
      "workshop",
    ] as const) {
      for (const piece of interiorFurniture(lotId)) {
        const existing = byUid.get(piece.uid);
        if (existing) {
          existing.tx = piece.tx;
          existing.ty = piece.ty;
          existing.rot = piece.rot ?? "down";
          existing.defId = piece.defId;
          existing.lotId = piece.lotId;
        } else {
          this.furniture.push({
            uid: piece.uid,
            defId: piece.defId,
            tx: piece.tx,
            ty: piece.ty,
            lotId: piece.lotId,
            rot: piece.rot,
          });
          byUid.set(piece.uid, this.furniture[this.furniture.length - 1]);
        }
      }
    }
  }

  showToast(msg: string, ms = 2200) {
    this.toast = msg;
    this.toastUntil = performance.now() + ms;
  }

  /**
   * Clamp and apply a friendship delta.
   * Returns tier-crossing flags for Friend / Close Friend.
   */
  adjustRelationship(
    npcId: string,
    delta: number,
    friendThreshold = RELATIONSHIP_FRIEND,
  ): {
    before: number;
    after: number;
    becameFriend: boolean;
    becameClose: boolean;
    becameBestie: boolean;
  } {
    const rel = this.relationships[npcId];
    if (!rel) {
      return {
        before: 0,
        after: 0,
        becameFriend: false,
        becameClose: false,
        becameBestie: false,
      };
    }
    const before = rel.score;
    rel.score = Math.max(-100, Math.min(100, rel.score + delta));
    rel.met = true;
    return {
      before,
      after: rel.score,
      becameFriend: before < friendThreshold && rel.score >= friendThreshold,
      becameClose:
        before < RELATIONSHIP_CLOSE && rel.score >= RELATIONSHIP_CLOSE,
      becameBestie: before < RELATIONSHIP_MAX && rel.score >= RELATIONSHIP_MAX,
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

  notePetCare() {
    if (this.lastPetCareDay !== this.dayIndex) {
      if (this.lastPetCareDay === this.dayIndex - 1) {
        this.petCareStreak += 1;
      } else {
        this.petCareStreak = 1;
      }
      this.lastPetCareDay = this.dayIndex;
    }
  }

  toSave(): SaveData {
    return {
      version: SAVE_VERSION,
      money: this.money,
      dayTime: this.dayTime,
      dayIndex: this.dayIndex,
      isWet: this.isWet,
      hiredAtCafe: this.hiredAtCafe,
      hiredJobs: [...this.hiredJobs],
      jobShiftCounts: { ...this.jobShiftCounts },
      jobPromoted: [...this.jobPromoted],
      quests: {
        active: [...this.quests.active],
        completed: [...this.quests.completed],
        stepCounts: structuredClone(this.quests.stepCounts),
        flags: { ...this.quests.flags },
      },
      aspirations: {
        selected: this.aspirations.selected,
        progress: { ...this.aspirations.progress },
        completed: [...this.aspirations.completed],
        unlocks: [...this.aspirations.unlocks],
        weeklyBeatsDone: this.aspirations.weeklyBeatsDone,
        totalShifts: this.aspirations.totalShifts,
        petTricks: this.aspirations.petTricks,
      },
      dailyStats: { ...this.dailyStats },
      flirtCounts: { ...this.flirtCounts },
      weeklyBeatDay: this.weeklyBeatDay,
      lastShiftDay: this.lastShiftDay,
      lastPetCareDay: this.lastPetCareDay,
      petCareStreak: this.petCareStreak,
      inventory: {
        tools: [...this.inventory.tools],
        materials: { ...this.inventory.materials } as Record<string, number>,
      },
      harvestDepleted: { ...this.harvestDepleted },
      flowerDepleted: { ...this.flowerDepleted },
      roommates: [...this.roommates],
      porchDrops: this.porchDrops.map((d) => ({ ...d })),
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
        ...(f.parentUid ? { parentUid: f.parentUid } : {}),
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
    this.dayIndex = data.dayIndex ?? 1;
    this.hiredJobs = data.hiredJobs?.length
      ? [...data.hiredJobs]
      : data.hiredAtCafe
        ? ["cafe_barista"]
        : [];
    this.jobShiftCounts = { ...(data.jobShiftCounts ?? {}) };
    this.jobPromoted = [...(data.jobPromoted ?? [])];
    this.quests = data.quests
      ? {
          active: [...data.quests.active],
          completed: [...data.quests.completed],
          stepCounts: structuredClone(data.quests.stepCounts ?? {}),
          flags: { ...(data.quests.flags ?? {}) },
        }
      : emptyQuestProgress();
    this.aspirations = data.aspirations
      ? {
          selected: (data.aspirations.selected as AspirationProgress["selected"]) ?? null,
          progress: { ...(data.aspirations.progress ?? {}) },
          completed: [...(data.aspirations.completed ?? [])],
          unlocks: [...(data.aspirations.unlocks ?? [])],
          weeklyBeatsDone: data.aspirations.weeklyBeatsDone ?? 0,
          totalShifts: data.aspirations.totalShifts ?? 0,
          petTricks: data.aspirations.petTricks ?? 0,
        }
      : emptyAspirationProgress();
    this.dailyStats = data.dailyStats
      ? { ...emptyDailyStats(), ...data.dailyStats }
      : emptyDailyStats();
    this.flirtCounts = { ...(data.flirtCounts ?? {}) };
    this.weeklyBeatDay = data.weeklyBeatDay ?? -1;
    this.lastShiftDay = data.lastShiftDay ?? -1;
    this.lastPetCareDay = data.lastPetCareDay ?? -1;
    this.petCareStreak = data.petCareStreak ?? 0;
    this.isWet = data.isWet ?? false;
    this.inventory = emptyInventory();
    if (data.inventory) {
      this.inventory.tools = (data.inventory.tools ?? []).filter(
        (id): id is ToolId =>
          id === "axe" ||
          id === "pickaxe" ||
          id === "shovel" ||
          id === "fishing_rod",
      );
      const mats = data.inventory.materials ?? {};
      for (const [k, v] of Object.entries(mats)) {
        if (typeof v === "number" && v > 0) {
          this.inventory.materials[k as MaterialId] = v;
        }
      }
    }
    this.harvestDepleted = { ...(data.harvestDepleted ?? {}) };
    this.flowerDepleted = { ...(data.flowerDepleted ?? {}) };
    this.roommates = (data.roommates ?? []).filter((id): id is NpcId =>
      NPCS.some((n) => n.id === id),
    );
    this.porchDrops = (data.porchDrops ?? []).map((d) => ({ ...d }));
    this.roommateErrandDay = {};
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
    this.ensureParkFurniture();
    this.walls = new Set(data.walls.map((w) => this.wallKey(w.tx, w.ty)));
    this.floors = new Map(
      data.floors.map((f) => [this.wallKey(f.tx, f.ty), f.variant]),
    );
    this.relationships = structuredClone(data.relationships);
    for (const npc of NPCS) {
      if (!this.relationships[npc.id]) {
        this.relationships[npc.id] = { score: 0, met: false };
      }
    }
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
