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
  | "cafe"
  | "shelter"
  | "market"
  | "library"
  | "clinic";

export type NpcId =
  | "mabel"
  | "jun"
  | "pip"
  | "vera"
  | "theo"
  | "sage"
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

export interface JobDef {
  id: string;
  name: string;
  lotId: LotId;
  /** Furniture defId that opens this job's shift menu. */
  stationDefId: string;
  hireNpcId: string;
  pay: number;
  shiftTasks: number;
  durationMs: number;
  closedMessage: string;
  /** Per-task flavour labels during a shift. */
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

export interface SaveData {
  version: number;
  money: number;
  dayTime: number;
  /** Calendar days lived (increments on sleep-to-morning). */
  dayIndex: number;
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
  lastPetCareDay: number;
  petCareStreak: number;
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
