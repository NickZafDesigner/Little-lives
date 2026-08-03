export type NeedId =
  | "hunger"
  | "energy"
  | "fun"
  | "social"
  | "hygiene"
  | "bladder";

export type PetNeedId = "hunger" | "energy" | "fun" | "bond";

export type Dir = "down" | "up" | "left" | "right";

export type GameMode = "live" | "build";

export type LotId =
  | "home"
  | "neighbor"
  | "park"
  | "playpark"
  | "cafe"
  | "shelter"
  | "market"
  | "library"
  | "clinic"
  | "workshop"
  | "pier"
  | "forest"
  | "mine";

export type NpcId =
  | "mabel"
  | "jun"
  | "pip"
  | "vera"
  | "theo"
  | "sage"
  | "reed"
  | "player";

export type DialogueTone = "friendly" | "flirty" | "rude" | "polite";

export type FurnitureCategory =
  | "seating"
  | "surface"
  | "appliance"
  | "decor"
  | "pet"
  | "plumbing"
  | "bed";

export interface NeedsState {
  hunger: number;
  energy: number;
  fun: number;
  social: number;
  hygiene: number;
  bladder: number;
}

export interface PetNeedsState {
  hunger: number;
  energy: number;
  fun: number;
  bond: number;
}

export interface FurnitureDef {
  id: string;
  name: string;
  category: FurnitureCategory;
  price: number;
  width: number;
  height: number;
  color: number;
  accent?: number;
  interactions: InteractionDef[];
  blocksMovement?: boolean;
  petRequired?: boolean;
  /** When set, catalog item stays locked until this unlock task completes. */
  unlockTaskId?: string;
  /**
   * Bias the mesh toward its back so it sits flush on the exterior shell
   * when placed on the first interior tile (TVs, fridges, etc.).
   */
  wallFlush?: boolean;
  /** Host can hold placeOnSurface items (one per tile). */
  supportsItems?: boolean;
  /** Countertop Y in world units; defaults to 18 when supportsItems. */
  surfaceHeight?: number;
  /** Must be placed on a supportsItems host, not bare floor. */
  placeOnSurface?: boolean;
}

export interface InteractionDef {
  id: string;
  label: string;
  durationMs: number;
  needDeltas: Partial<NeedsState>;
  moneyDelta?: number;
  relationshipDelta?: number;
  petNeedDeltas?: Partial<PetNeedsState>;
}

export interface PlacedFurniture {
  uid: string;
  defId: string;
  tx: number;
  ty: number;
  lotId: LotId;
  /** Which way the front of the piece faces. Default "down" (toward camera). */
  rot?: Dir;
  /** When set, this piece sits on the named host's surface. */
  parentUid?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  color: number;
  homeLot: LotId;
  traits: string[];
  spawnTx: number;
  spawnTy: number;
}

export interface PetDef {
  id: string;
  name: string;
  species: "cat" | "dog" | "bunny" | "fox" | "bird";
  color: number;
  accent: number;
  traits: string[];
  fee: number;
}

export type WorkMiniKind = "timing" | "sequence" | "hold";

export interface JobTaskDef {
  id: string;
  label: string;
  /** Placed furniture uid in the workplace lot. */
  furnitureUid: string;
  mini: WorkMiniKind;
}

export interface JobDef {
  id: string;
  name: string;
  lotId: LotId;
  /** Furniture defId that clocks you in for this job. */
  stationDefId: string;
  hireNpcId: string;
  pay: number;
  /** Ordered station-hop tasks for a shift. */
  tasks: JobTaskDef[];
  closedMessage: string;
  /** @deprecated use tasks.length */
  shiftTasks?: number;
  /** @deprecated busy-bar duration; minigames replace this */
  durationMs?: number;
  /** @deprecated use tasks[].label */
  taskLabels?: string[];
}

export interface RelationshipState {
  score: number;
  met: boolean;
}

export interface DailyStatsSave {
  moneyEarned: number;
  friendsMade: number;
  petBondGain: number;
  shiftsDone: number;
}

export interface AspirationSave {
  selected: string | null;
  progress: Record<string, number>;
  completed: string[];
  unlocks: string[];
  weeklyBeatsDone: number;
  totalShifts: number;
  petTricks: number;
}

export type {
  Sex,
  Height,
  Build,
  FaceStyle,
  ClothingStyle,
  HairStyle,
  PlayerLook,
  PlayerProfile,
} from "./character";

export interface QuestSaveData {
  active: string[];
  completed: string[];
  stepCounts: Record<string, Record<string, number>>;
  flags: Record<string, boolean>;
}

export interface InventorySave {
  tools: string[];
  materials: Record<string, number>;
}

export interface PorchDrop {
  uid: string;
  itemId: string;
  count: number;
  x: number;
  z: number;
}

export interface SaveData {
  version: number;
  money: number;
  dayTime: number;
  /** Calendar days lived (increments on sleep-to-morning). */
  dayIndex: number;
  /** True after a bladder accident until the player showers. */
  isWet?: boolean;
  hiredAtCafe: boolean;
  /** Job ids the player has been hired for (café, market, library, clinic…). */
  hiredJobs: string[];
  /** Completed shifts per job id. */
  jobShiftCounts: Record<string, number>;
  /** Promoted job ids. */
  jobPromoted: string[];
  quests: QuestSaveData;
  aspirations: AspirationSave;
  dailyStats: DailyStatsSave;
  flirtCounts: Record<string, number>;
  weeklyBeatDay: number;
  /** dayIndex when a shift was last completed (−1 = never). */
  lastShiftDay?: number;
  lastPetCareDay: number;
  petCareStreak: number;
  /** Permanent tools + stackable materials. */
  inventory?: InventorySave;
  /** Harvest node uid → dayIndex when depleted (respawns over following days). */
  harvestDepleted?: Record<string, number>;
  /** Flower tile key "tx,ty" → dayIndex when picked. */
  flowerDepleted?: Record<string, number>;
  /** Villagers who have moved into the player's home. */
  roommates?: string[];
  /** Gathered goods left on the home porch for pickup. */
  porchDrops?: PorchDrop[];
  /** One-shot tutorial / discovery thoughts. */
  storyFlags?: Record<string, boolean>;
  player: {
    x: number;
    y: number;
    needs: NeedsState;
    name: string;
    look: import("./character").PlayerLook;
    traits: string[];
    favouriteFood: string;
    favouriteAnimals: string[];
  };
  furniture: PlacedFurniture[];
  walls: Array<{ tx: number; ty: number; lotId: LotId }>;
  floors: Array<{ tx: number; ty: number; lotId: LotId; variant: number }>;
  relationships: Record<string, RelationshipState>;
  adoptedPet: null | {
    defId: string;
    needs: PetNeedsState;
    x: number;
    y: number;
  };
  shelterPets: string[];
  homeHasPetBed: boolean;
  homeHasPetBowl: boolean;
}
