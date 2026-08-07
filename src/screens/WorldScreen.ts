import * as THREE from "three";
import type { Screen } from "../app/ScreenRouter";
import type { App } from "../app/App";
import type { PlayerProfile } from "../data/character";
import { furnitureById } from "../data/furniture";
import {
  DEFAULT_FLOOR_STYLE_ID,
  floorStyleById,
} from "../data/floorStyles";
import {
  JOB_PROMOTIONS,
  PROMOTION_SHIFTS,
  WORK_MISS_LIMIT,
  jobById,
  jobClockInArrowLabel,
  jobDisplayName,
  jobFirstDayWelcomeLine,
  jobPay,
  jobTaskCount,
  lotNameForJob,
  workFireLine,
  workWarningLine,
  JOBS,
} from "../data/jobs";
import {
  applyNeedDeltas,
  clampNeed,
  moodFromNeeds,
  NEED_CRITICAL,
  socialBlockedReason,
} from "../data/needs";
import {
  AMBIENT_NPCS,
  ambientGiftThanks,
  ambientNpcById,
  isAmbientNpcId,
  randomAmbientBeat,
  type AmbientChoice,
} from "../data/ambientNpcs";
import {
  BAG_GIFTS,
  CRAFTED_GIFTS,
  NPCS,
  RELATIONSHIP_CLOSE,
  RELATIONSHIP_FRIEND,
  RELATIONSHIP_MAX,
  SOCIAL_ACTIONS,
} from "../data/npcs";
import { recipeById, type CraftedId } from "../data/crafting";
import { TownBoardSystem } from "../systems/TownBoardSystem";
import { CraftModal } from "../ui/CraftModal";
import { TownBoardModal } from "../ui/TownBoardModal";
import {
  chatScript,
  favouriteFoodNpcLine,
  friendUnlockLine,
  type ChatChoice,
  type ChatNpcId,
} from "../data/dialogue";
import { petById } from "../data/pets";
import { VILLAGE_ANIMALS } from "../data/villageAnimals";
import {
  GORDON_SHOE_TILE,
  PARK_LITTER_SPOTS,
  PIER_LITTER_SPOTS,
  WORK_END,
  WORK_LATE,
  WORK_OPEN,
  WORK_START,
  questItemClearedFlag,
  type QuestDef,
  type QuestEvent,
  type QuestGroundItemId,
} from "../data/quests";
import {
  harvestFootprint,
  harvestNodeById,
  materialById,
  rollHarvestYields,
  rollShakeYields,
  toolById,
  type MaterialId,
  type ToolId,
} from "../data/items";
import {
  forageById,
  rollForageYield,
  type ForageItemId,
} from "../data/forage";
import type {
  Dir,
  JobDef,
  JobTaskDef,
  LotId,
  NpcId,
  PlacedFurniture,
} from "../data/types";
import { TILE } from "../game/constants";
import { hasSave, loadSave, writeSave, clearSave } from "../save/saveLoad";
import { TownRenderer } from "../render/TownRenderer";
import { AspirationSystem } from "../systems/AspirationSystem";
import {
  beatForDay,
  isEvening,
  isNight,
  MORNING_TIME,
  NIGHT_START,
  SUNSET_DEEP,
  SUNSET_GOLDEN,
  SUNSET_GONE,
  type WeeklyBeat,
} from "../systems/dayCycle";
import { GameState } from "../systems/GameState";
import {
  ensureWeather,
  weatherThought,
  weatherToast,
} from "../systems/weather";
import {
  applyCollapseRecovery,
  finishSleepNight,
  tickNeedDrama,
} from "../systems/needDrama";
import { QuestSystem } from "../systems/QuestSystem";
import {
  closeFriendUnlockLine,
  bestieUnlockLine,
  EXCLUSIVE_HANGOUTS,
  tierFromScore,
  tierLabel,
} from "../systems/relationshipTiers";
import {
  findPathToAny,
  nearestWalkable,
  type GridPos,
} from "../systems/pathfinding";
import {
  decayNeedsWithTraits,
  favouritePetBondBonus,
  hasTrait,
  jobPayMultiplier,
  modifyInteractionDeltas,
  sleepEnergyBonus,
  socialOutcomeMultiplier,
  speciesFavouriteLabel,
} from "../systems/traits";
import { LOTS, lotAtTile, lotDoorWorld } from "../world/lots";
import { createTownMap, MAP_H, MAP_W, Tile, type TownMapData } from "../world/townMap";
import { createActor, createNpcActor, type ActorHandle, type SitStyle } from "../mesh/actors";
import { matFlat } from "../mesh/materials";
import {
  createPet,
  furnitureFootprint,
  placeFurniture,
  surfaceHeightFor,
  type PetHandle,
} from "../mesh/furniture";
import {
  updateWallFlushFurnitureFade,
  wallFlushObscuresPlayer,
} from "../mesh/buildings";
import {
  buildHarvestMeshes,
  type HarvestMeshHandle,
} from "../mesh/harvest";
import { BuildFeedback, createPaintFloorMesh, rotateDir } from "../build/BuildFeedback";
import { signById } from "../mesh/signs";
import { Hud } from "../ui/Hud";
import { DialogueBox } from "../ui/DialogueBox";
import { NpcNameTags } from "../ui/NpcNameTags";
import { BuildingNameTags } from "../ui/BuildingNameTags";
import { ThoughtBubble } from "../ui/ThoughtBubble";
import { HintArrow } from "../ui/HintArrow";
import { InteractTip } from "../ui/InteractTip";
import { TimeMontage } from "../ui/TimeMontage";
import { WorkMinigame, gradeScore, type MiniGrade } from "../ui/WorkMinigame";
import { PlayMinigame, type PlayMiniGrade, type PlayMiniKind, type PlayMiniTick } from "../ui/PlayMinigame";
import { TvViewer, TV_FULL_WATCH_MS } from "../ui/TvViewer";
import { TV_SHOWS, type TvShowId } from "../data/tvShows";
import { ConfettiBurst } from "../ui/ConfettiBurst";
import { PayCelebration } from "../ui/PayCelebration";
import { MomentCelebration } from "../ui/MomentCelebration";
import { GiftHandoffCard } from "../ui/GiftHandoffCard";
import {
  StoryPrologue,
  arrivalPrologueLines,
} from "../ui/StoryPrologue";
import { BuildCatalog } from "../ui/BuildCatalog";
import {
  completedUnlockTaskIds,
  isFurnitureUnlocked,
  toastNewUnlocks,
} from "../systems/unlockProgress";
import { InteractionMenu, type MenuOption } from "../ui/InteractionMenu";
import { muteButtonHtml, wireMute } from "../ui/mute";
import { Audio } from "../audio/AudioManager";
import { WetTrail, WET_TRAIL_INDOOR_Y, WET_TRAIL_OUTDOOR_Y } from "../fx/WetTrail";
import { LootBurst } from "../fx/LootBurst";
import { GiftToss } from "../fx/GiftToss";
import { AmbientAtmosphere } from "../fx/AmbientAtmosphere";
import { createInventoryItemMesh } from "../mesh/inventoryItems";
import { createQuestItemMesh } from "../mesh/questItems";

interface NpcRuntime {
  id: string;
  actor: ActorHandle;
  dir: Dir;
  path: GridPos[];
  waitUntil: number;
  /** Street hangabout - light local wander + reply-menu banter. */
  ambient?: boolean;
  /** Seated patrons stay put on their chair. */
  seated?: boolean;
  /** Closing-time exit: stand up and walk out the door. */
  leavingClosing?: boolean;
  /** Hidden after leaving for the day - restored next morning. */
  leftForDay?: boolean;
  /** Anchor tile for local wandering. */
  homeTx?: number;
  homeTy?: number;
  /** Max tile radius from home when strolling. */
  wanderR?: number;
  /** Scripted walk-up: boss warning/firing, or first-day welcome. */
  seekingPlayer?: boolean;
}

interface VillageAnimalRuntime {
  id: string;
  handle: PetHandle;
  path: GridPos[];
  waitUntil: number;
  homeTx: number;
  homeTy: number;
  wanderR: number;
}

type TargetKind =
  | "furniture"
  | "npc"
  | "pet"
  | "sign"
  | "harvest"
  | "forage"
  | "porch"
  | "quest_item";

interface Target {
  kind: TargetKind;
  id: string;
  label: string;
  tiles: GridPos[];
  x: number;
  z: number;
  /** Set for forage targets. */
  forageItemId?: ForageItemId;
}

const WALK_SPEED = 237;

export function createWorldScreen(
  app: App,
  goto: (id: "title") => void,
  data: { continue?: boolean; profile?: PlayerProfile; fresh?: boolean },
): Screen {
  const state = new GameState();
  const quests = new QuestSystem(state);
  const aspirations = new AspirationSystem(state);
  const townBoard = new TownBoardSystem(state);
  const isContinue = Boolean(data.continue && hasSave());
  if (data.fresh) clearSave();
  if (isContinue) {
    const save = loadSave();
    if (save) state.loadFrom(save);
  } else if (data.profile) {
    state.applyProfile(data.profile);
  }
  quests.bootstrap(!isContinue);
  aspirations.refresh();
  townBoard.refreshIfNeeded();
  ensureWeather(state);

  let map!: TownMapData;
  let baseCollision!: boolean[][];
  let collision!: boolean[][];
  let player!: ActorHandle;
  let playerDir: Dir = "down";
  let playerPath: GridPos[] = [];
  let onArrive: (() => void) | null = null;
  let playerX = state.playerX;
  let playerZ = state.playerY; // legacy save uses Y as map-south axis
  let npcs: NpcRuntime[] = [];
  let villageAnimals: VillageAnimalRuntime[] = [];
  let pet: PetHandle | null = null;
  let furnitureMeshes = new Map<string, THREE.Group>();
  let harvestHandles = new Map<string, HarvestMeshHandle>();
  let porchMeshes = new Map<string, THREE.Group>();
  let questItemMeshes = new Map<string, THREE.Group>();
  let lastHarvestDay = -1;
  /** Live shrink/tip while harvesting a node (trees especially). */
  let harvestAnim: {
    uid: string;
    startMs: number;
    durationMs: number;
    isTree: boolean;
  } | null = null;
  /** Knockback after walking into a tree. */
  let treeBumpVelX = 0;
  let treeBumpVelZ = 0;
  let treeBumpCooldown = 0;
  /** Brief sway on the tree that got bumped. */
  let treeBumpWobble: { uid: string; t: number; dur: number } | null = null;
  /** Restore walk position after seated / play activities. */
  let activityRestore: { x: number; z: number; dir: Dir } | null = null;
  /** One-shot slide/swing ride after a playground mini resolves. */
  let playRideRaf = 0;
  let wallMeshes = new Map<string, THREE.Mesh>();
  let floorMeshes = new Map<string, THREE.Mesh>();
  let uidCounter = 1000;
  let hud!: Hud;
  let dialogue!: DialogueBox;
  let nametags!: NpcNameTags;
  let buildingTags!: BuildingNameTags;
  let thoughtBubble!: ThoughtBubble;
  let hintArrow!: HintArrow;
  let interactTip!: InteractTip;
  /** Target currently advertised by the proximity tip (for tip clicks). */
  let tipTarget: Target | null = null;
  let timeMontage!: TimeMontage;
  /** In-world dayTime lerp (Pier Sunset) - no montage overlay. */
  let timeScrub: {
    from: number;
    to: number;
    elapsed: number;
    durationMs: number;
    onDone: () => void;
  } | null = null;
  let workMini!: WorkMinigame;
  let playMini!: PlayMinigame;
  let craftModal!: CraftModal;
  let boardModal!: TownBoardModal;
  let tvViewer!: TvViewer;
  let confetti!: ConfettiBurst;
  let payCelebration!: PayCelebration;
  let momentCelebration!: MomentCelebration;
  type PendingSideCelebration = {
    def: QuestDef;
    unlockFurniture: string[];
  };
  let pendingSideQuestCelebration: PendingSideCelebration | null = null;
  let giftHandoff!: GiftHandoffCard;
  let storyPrologue!: StoryPrologue;
  /** NPC under the cursor in live mode (for name tooltips). */
  let hoveredNpcId: string | null = null;
  let menu!: InteractionMenu;
  let catalog!: BuildCatalog;
  /** New-game wake-up cutscene - blocks movement / menus until done. */
  let introActive = false;
  /** Soft post-sleep morning commute thought (hired days). */
  let morningBeatActive = false;
  /** Edge-detect leaving home / arriving at café for guidance hints. */
  let wasAtCafe = false;
  /** First-day boss walks up to welcome + point at the clock-in station. */
  let pendingJobWelcome: string | null = null;
  /**
   * Closing time: patrons leave (staggered). Unfinished shifts then get a
   * boss warning; completed shifts just clear the floor. Boss approach is
   * paused while this is set (needed for exit pathfinding lotId).
   */
  let shiftClosing: null | {
    jobId: string;
    lotId: LotId;
    startedAt: number;
    warnQueued: boolean;
    unfinished: boolean;
  } = null;
  /** Edge-detect dayTime crossing WORK_END. */
  let prevDayTimeForClosing = -1;
  let guidanceReady = false;
  const firedHints = new Set<string>();
  let nightNudgeAt = 0;
  let introPhase:
    | "lie"
    | "sit"
    | "stretch"
    | "yawn"
    | "think"
    | "bounce"
    | "speak"
    | "done" = "done";
  /** Elapsed seconds in the wake cutscene (dt-driven - survives mount hitches). */
  let introT = 0;
  /** Wake thought beats: 0 none → 1 bare room → 2 lonely TV → 3 sofa doodle. */
  let introThinkStep = 0;
  /** Ignore advance until this time (stops the open click from skipping). */
  let introAdvanceAt = 0;
  /** Elapsed seconds since bouncing out of bed (dt-driven). */
  let introPostBounceT = 0;
  let introBounced = false;
  let introSpoke = false;
  /** Feet-hit-floor SFX after the bed hop. */
  let introLanded = false;
  let unMute: (() => void) | null = null;
  let autosaveTimer = 0;
  let lastDialogueSeq = 0;
  /** Keep cinematic zoom through brief gaps between chained dialogue lines. */
  let focusHoldUntil = 0;
  /** Last-frame focus state so zoom SFX only fire on transitions. */
  let wasFocusZoom = false;
  /** Last-frame indoor state so enter/exit zoom SFX only fire on transitions. */
  let wasIndoors = false;
  /** Skip the first indoor sample so loading in a building doesn't whoosh. */
  let indoorSfxReady = false;
  /** Tight face zoom after a bladder accident. */
  let wetFaceUntil = 0;
  let wetTrail: WetTrail | null = null;
  let lootBurst: LootBurst | null = null;
  let giftToss: GiftToss | null = null;
  let ambientAtmosphere: AmbientAtmosphere | null = null;
  let keyLatch = new Set<string>();
  let onPointerMove: ((e: PointerEvent) => void) | null = null;
  let onWheel: ((e: WheelEvent) => void) | null = null;
  let lastBuildTile: { tx: number; ty: number } | null = null;
  let lastBuildPickedUid: string | null = null;
  /** Pending facing while placing / moving furniture. */
  let placeRot: Dir = "down";
  /** Item picked up from the house to move (removed from world until placed). */
  let heldFurniture: PlacedFurniture | null = null;
  /** Children of a held surface host, with tile offsets from the host origin. */
  let heldChildren: Array<{ piece: PlacedFurniture; dx: number; dy: number }> =
    [];
  let buildFeedback: BuildFeedback | null = null;
  /** NPC currently in conversation / interaction - stays put and faces the player. */
  let engagedNpcId: string | null = null;

  const faceNpcTowardPlayer = (npc: NpcRuntime) => {
    const p = npc.actor.getPosition();
    const dx = playerX - p.x;
    const dz = playerZ - p.z;
    if (Math.abs(dx) > Math.abs(dz)) npc.dir = dx > 0 ? "right" : "left";
    else npc.dir = dz > 0 ? "down" : "up";
    npc.actor.setFacing(npc.dir);
  };

  const holdNpcStill = (npcId: string) => {
    engagedNpcId = npcId;
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return;
    npc.path = [];
    npc.waitUntil = performance.now() + 60_000;
    npc.actor.setWalking(false);
    faceNpcTowardPlayer(npc);
  };

  const releaseEngagedNpc = () => {
    if (!engagedNpcId) return;
    const npc = npcs.find((n) => n.id === engagedNpcId);
    if (npc) {
      npc.path = [];
      npc.waitUntil = performance.now() + 1600 + Math.random() * 1200;
      npc.actor.setWalking(false);
    }
    engagedNpcId = null;
  };

  const affinityHint = (delta: number): string | undefined => {
    if (!delta) return undefined;
    return delta > 0 ? `+${delta} friendship` : `${delta} friendship`;
  };

  const presentChatChoices = (
    npcId: ChatNpcId,
    defName: string,
    choices: ChatChoice[],
  ) => {
    const rel = state.relationships[npcId];
    const available = choices.filter(
      (c) => c.minScore === undefined || (rel?.score ?? 0) >= c.minScore,
    );
    if (available.length === 0) return;

    dialogue.offerChoices(
      available.map((c) => ({
        id: c.id,
        label: c.label,
        sub: affinityHint(c.affinity ?? 0),
      })),
      (choiceId) => {
        const choice = available.find((c) => c.id === choiceId);
        if (!choice) return;
        pickChatChoice(npcId, defName, choice);
      },
    );
  };

  const pickChatChoice = (
    npcId: ChatNpcId,
    defName: string,
    choice: ChatChoice,
  ) => {
    const delta = choice.affinity ?? 0;
    const result =
      delta !== 0
        ? state.adjustRelationship(npcId, delta, RELATIONSHIP_FRIEND)
        : {
            before: state.relationships[npcId]?.score ?? 0,
            after: state.relationships[npcId]?.score ?? 0,
            becameFriend: false,
          };

    state.needs = applyNeedDeltas(state.needs, {
      social: 8 + Math.max(0, delta),
      fun: delta > 0 ? 4 : 0,
    });

    const lines: Array<{
      speakerId: NpcId;
      speakerName: string;
      text: string;
    }> = [];
    if (choice.playerLine.trim()) {
      lines.push({
        speakerId: "player",
        speakerName: state.playerName,
        text: choice.playerLine,
      });
    }

    if (result.becameFriend) {
      Audio.sfx("success");
      lines.push({
        speakerId: npcId,
        speakerName: defName,
        text: friendUnlockLine(npcId),
      });
    }

    const script = chatScript(npcId);
    if (choice.next) {
      const node = script.nodes[choice.next];
      if (node) {
        for (const text of node.npcLines) {
          lines.push({ speakerId: npcId, speakerName: defName, text });
        }
        if (!result.becameFriend && delta !== 0) {
          Audio.sfx(delta < 0 ? "deny" : "chime");
        }
        dialogue.say(lines);
        if (node.choices?.length) {
          presentChatChoices(npcId, defName, node.choices);
        }
        return;
      }
    }

    if (!result.becameFriend && delta !== 0) {
      Audio.sfx(delta < 0 ? "deny" : "chime");
    }
    if (lines.length) dialogue.say(lines);
    else releaseEngagedNpc();
  };

  const startChat = (npcId: ChatNpcId, defName: string) => {
    holdNpcStill(npcId);
    const script = chatScript(npcId);
    const start = script.nodes[script.start];
    if (!start) return;
    Audio.sfx("talk");
    dialogue.say(
      start.npcLines.map((text) => ({
        speakerId: npcId,
        speakerName: defName,
        text,
      })),
    );
    if (start.choices?.length) {
      presentChatChoices(npcId, defName, start.choices);
    }
  };

  /** Proactive side-quest pitch before normal chat when an ask step is pending. */
  const pitchSideOffer = (
    npcId: string,
    defName: string,
    onDecline: () => void,
  ) => {
    const offer = quests.pendingOfferFor(npcId);
    if (!offer) {
      onDecline();
      return;
    }
    holdNpcStill(npcId);
    Audio.sfx("talk");
    const pitch =
      offer.def.offerPitch ?? ["Could use a hand with something, if you've got a minute…"];
    dialogue.say(
      pitch.map((text) => ({
        speakerId: npcId,
        speakerName: defName,
        text,
      })),
    );
    dialogue.offerChoices(
      [
        { id: "accept", label: "Sure, I'll help!", sub: "Accept side quest" },
        { id: "later", label: "Maybe later", sub: "Just chat" },
      ],
      (choiceId) => {
        if (choiceId === "accept") {
          Audio.sfx("chime");
          quests.emit(offer.askEvent);
          afterGroundQuestUnlocked(offer.askEvent);
          dialogue.say({
            speakerId: npcId,
            speakerName: defName,
            text: "You're a lifesaver!",
          });
          state.showToast(`Side quest: ${offer.def.title}`, 2600);
          return;
        }
        onDecline();
      },
    );
  };

  const tryChatWithOffer = (
    npcId: string,
    defName: string,
    startNormal: () => void,
  ) => {
    if (quests.hasPendingSideOffer(npcId)) {
      pitchSideOffer(npcId, defName, startNormal);
      return;
    }
    startNormal();
  };

  const presentAmbientChoices = (npcId: string, choices: AmbientChoice[]) => {
    if (!choices.length) return;
    dialogue.offerChoices(
      choices.map((c) => ({
        id: c.id,
        label: c.label,
        portrait: c.portrait,
      })),
      (choiceId) => {
        const choice = choices.find((c) => c.id === choiceId);
        if (choice) pickAmbientChoice(npcId, choice);
      },
    );
  };

  const pickAmbientChoice = (npcId: string, choice: AmbientChoice) => {
    const def = ambientNpcById[npcId];
    if (!def) return;

    const npc = npcs.find((n) => n.id === npcId);
    if (choice.anim && npc) npc.actor.playReaction(choice.anim);

    if (choice.anim === "jump") Audio.sfx("success");
    else if (choice.anim === "pop") Audio.sfx("chime");
    else if (choice.anim === "vibrate") Audio.sfx("deny");
    else Audio.sfx("talk");

    state.needs = applyNeedDeltas(state.needs, {
      social: 5,
      fun: choice.anim === "jump" ? 10 : choice.anim === "vibrate" ? 8 : 6,
    });
    const chatDelta =
      choice.anim === "jump" ? 5 : choice.anim === "vibrate" ? 1 : 3;
    state.adjustRelationship(npcId, chatDelta, RELATIONSHIP_FRIEND);

    const lines: Array<{
      speakerId: string;
      speakerName: string;
      text: string;
    }> = [];
    if (choice.playerLine.trim()) {
      lines.push({
        speakerId: "player",
        speakerName: state.playerName,
        text: choice.playerLine,
      });
    }
    for (const text of choice.npcLines) {
      lines.push({ speakerId: def.id, speakerName: def.name, text });
    }
    dialogue.say(lines);
    if (choice.id === "__ask_reed") pointToReed();
    if (choice.choices?.length) {
      presentAmbientChoices(npcId, choice.choices);
    }
  };

  /** True once the player has opened Reed's menu (or hired him). */
  const hasMetReed = () =>
    !!state.relationships.reed?.met || state.isHired("workshop_crafter");

  const talkToAmbient = (id: string) => {
    const def = ambientNpcById[id];
    if (!def) return;
    holdNpcStill(id);
    Audio.sfx("talk");
    const beat = randomAmbientBeat(def);
    dialogue.say(
      beat.open.map((text) => ({
        speakerId: def.id,
        speakerName: def.name,
        text,
      })),
    );
    const choices = [...beat.choices];
    if (!hasMetReed()) {
      choices.unshift({
        id: "__ask_reed",
        label: "Where's Reed?",
        playerLine: "Do you know where I can find Reed?",
        npcLines: [reedDirectionLine(def.id)],
        anim: "pop",
        portrait: "reed",
      });
    }
    presentAmbientChoices(id, choices);
  };

  const facePlayerToward = (x: number, z: number) => {
    const dx = x - playerX;
    const dz = z - playerZ;
    if (Math.abs(dx) > Math.abs(dz)) playerDir = dx > 0 ? "right" : "left";
    else playerDir = dz > 0 ? "down" : "up";
    player.setFacing(playerDir);
  };

  const ownedBagGifts = () =>
    BAG_GIFTS.filter((g) => state.materialCount(g.itemId) > 0);

  const ownedCraftedGifts = () =>
    CRAFTED_GIFTS.filter((g) => state.craftedCount(g.craftedId) > 0);

  const bagGiftThankLines = (itemId: MaterialId): string[] => {
    const matName = materialById[itemId]?.name ?? "gift";
    if (itemId === "flower") {
      return [
        "Wildflowers! You remembered how much I love these.",
        "A little bouquet just for me? You're sweet.",
        "These brighten the whole day. Thank you!",
      ];
    }
    if (itemId === "apple" || itemId === "orange" || itemId === "grape") {
      return [
        `Fresh ${matName.toLowerCase()} - perfect snack. Thanks!`,
        "Ooh, fresh fruit! You're a peach.",
      ];
    }
    if (itemId === "shell") {
      return [
        "A seashell from the pier? How thoughtful!",
        "I can almost hear the waves. Thank you!",
      ];
    }
    if (itemId === "mushroom") {
      return [
        "A Whisperwood find! I'll handle it carefully.",
        "Forest treasure - you're so thoughtful.",
      ];
    }
    if (itemId === "feather") {
      return [
        "A soft feather - perfect for a bookmark.",
        "Light as a wish. Thank you!",
      ];
    }
    return [
      `Fresh ${matName.toLowerCase()}? You spoil me!`,
      "A thoughtful gift - thank you.",
    ];
  };

  /** Apply friendship / vibes after the item has arrived in their hands. */
  const applyBagGiftResult = (npcId: string, itemId: MaterialId) => {
    const gift = BAG_GIFTS.find((g) => g.itemId === itemId);
    if (!gift) return;

    const npc = npcs.find((n) => n.id === npcId);
    npc?.actor.playReaction("pop");
    npc?.actor.playSmile();

    if (isAmbientNpcId(npcId)) {
      const def = ambientNpcById[npcId];
      if (!def) return;
      const { mult, toast } = socialOutcomeMultiplier(
        state.playerTraits,
        state.needs.hygiene,
        moodFromNeeds(state.needs),
        "friendly",
        state.isWet,
      );
      const result = state.adjustRelationship(
        npcId,
        Math.round(gift.delta * mult),
        RELATIONSHIP_FRIEND,
      );
      state.needs = applyNeedDeltas(state.needs, { social: 12, fun: 8 });
      if (result.becameFriend || result.becameClose || result.becameBestie) {
        if (result.becameFriend) state.dailyStats.friendsMade += 1;
        Audio.sfx("success");
        hud?.pulseAvatar();
        if (result.becameBestie) confetti.burst("big");
        const text = result.becameBestie
          ? "Besties. Absolute besties. Don't tell the others."
          : result.becameClose
            ? "We're properly close now. Soft high-five."
            : "Friends! Official street-corner friends.";
        dialogue.say([
          { speakerId: def.id, speakerName: def.name, text },
        ]);
      } else {
        Audio.sfx("chime");
        dialogue.say([
          {
            speakerId: def.id,
            speakerName: def.name,
            text: ambientGiftThanks(def.vibe),
          },
        ]);
      }
      if (toast) think(toast, 2800);
      aspirations.refresh();
      return;
    }

    const def = NPCS.find((n) => n.id === npcId);
    if (!def) return;
    const villagerId = npcId as NpcId;
    const { mult, toast } = socialOutcomeMultiplier(
      state.playerTraits,
      state.needs.hygiene,
      moodFromNeeds(state.needs),
      "friendly",
      state.isWet,
    );
    const bonus = gift.preference?.[villagerId] ?? 0;
    const result = state.adjustRelationship(
      villagerId,
      Math.round((gift.delta + bonus) * mult),
      RELATIONSHIP_FRIEND,
    );
    state.needs = applyNeedDeltas(state.needs, { social: 18 });
    if (result.becameFriend || result.becameClose || result.becameBestie) {
      noteFriendshipGain(villagerId as ChatNpcId, result, def.name);
    } else {
      Audio.sfx("chime");
      const lines = bagGiftThankLines(itemId);
      state.showDialogue(
        villagerId,
        def.name,
        lines[Math.floor(Math.random() * lines.length)]!,
      );
    }
    if (toast) think(toast, 2800);
    aspirations.refresh();
  };

  /** Apply friendship / vibes after a handmade gift arrives. */
  const applyCraftedGiftResult = (npcId: string, craftedId: CraftedId) => {
    const gift = CRAFTED_GIFTS.find((g) => g.craftedId === craftedId);
    if (!gift) return;
    const recipe = recipeById[craftedId];

    const npc = npcs.find((n) => n.id === npcId);
    npc?.actor.playReaction("pop");
    npc?.actor.playSmile();

    const { mult, toast } = socialOutcomeMultiplier(
      state.playerTraits,
      state.needs.hygiene,
      moodFromNeeds(state.needs),
      "friendly",
      state.isWet,
    );

    if (isAmbientNpcId(npcId)) {
      const def = ambientNpcById[npcId];
      if (!def) return;
      const result = state.adjustRelationship(
        npcId,
        Math.round(gift.delta * mult),
        RELATIONSHIP_FRIEND,
      );
      state.needs = applyNeedDeltas(state.needs, { social: 14, fun: 10 });
      if (result.becameFriend || result.becameClose || result.becameBestie) {
        if (result.becameFriend) state.dailyStats.friendsMade += 1;
        Audio.sfx("success");
        hud?.pulseAvatar();
        if (result.becameBestie) confetti.burst("big");
      } else {
        Audio.sfx("chime");
      }
      dialogue.say([
        {
          speakerId: def.id,
          speakerName: def.name,
          text: `A handmade ${recipe?.name ?? "gift"}? You're something else.`,
        },
      ]);
      if (toast) think(toast, 2800);
      aspirations.refresh();
      return;
    }

    const def = NPCS.find((n) => n.id === npcId);
    if (!def) return;
    const villagerId = npcId as NpcId;
    const bonus = gift.preference?.[villagerId] ?? 0;
    const result = state.adjustRelationship(
      villagerId,
      Math.round((gift.delta + bonus) * mult),
      RELATIONSHIP_FRIEND,
    );
    state.needs = applyNeedDeltas(state.needs, { social: 20, fun: 8 });
    if (result.becameFriend || result.becameClose || result.becameBestie) {
      noteFriendshipGain(villagerId as ChatNpcId, result, def.name);
    } else {
      Audio.sfx("chime");
      state.showDialogue(
        villagerId,
        def.name,
        `You made this ${recipe?.name ?? "gift"} yourself? I'm keeping it forever.`,
      );
    }
    if (toast) think(toast, 2800);
    aspirations.refresh();
  };

  const craftedGiftVisual = (craftedId: CraftedId): MaterialId => {
    if (craftedId === "flower_crown") return "flower";
    if (craftedId === "fruit_jam") return "grape";
    if (craftedId === "clay_mug") return "clay";
    if (craftedId === "ore_trinket") return "ore";
    if (craftedId === "shell_charm") return "shell";
    if (craftedId === "keepsake_jar") return "flower";
    return "wood";
  };

  /** Remove from bag, show handoff card + world arc, then resolve thanks. */
  const giveBagGift = (npcId: string, itemId: MaterialId) => {
    if (!state.canGiftNpc(npcId)) {
      Audio.sfx("deny");
      think("I already gave them a gift today…");
      return;
    }
    const gift = BAG_GIFTS.find((g) => g.itemId === itemId);
    if (!gift || !state.removeMaterial(itemId, 1)) {
      Audio.sfx("deny");
      think("I don't have that anymore…");
      return;
    }
    state.markNpcGifted(npcId);

    holdNpcStill(npcId);
    const npc = npcs.find((n) => n.id === npcId);
    if (npc) {
      const p = npc.actor.getPosition();
      facePlayerToward(p.x, p.z);
    }

    const ambient = isAmbientNpcId(npcId) ? ambientNpcById[npcId] : undefined;
    const villager = !ambient ? NPCS.find((n) => n.id === npcId) : undefined;
    const npcName = ambient?.name ?? villager?.name ?? "friend";
    const itemName = materialById[itemId]?.name ?? gift.label;
    const handoffMs = 3200;

    Audio.sfx("pickup");
    player.playWave();
    state.startBusy(gift.label, handoffMs);

    const finish = () => applyBagGiftResult(npcId, itemId);

    giftHandoff?.show({
      itemId,
      itemName,
      playerLook: state.playerLook,
      playerName: state.playerName,
      npcId,
      npcName,
      npcLook: ambient?.look,
      durationMs: handoffMs,
      onDone: finish,
    });
    hud?.pulseAvatar();
    confetti?.burst("soft");

    const from = { x: playerX, y: 16, z: playerZ };
    giftToss?.spawn(
      itemId,
      from,
      () => {
        const target = npcs.find((n) => n.id === npcId);
        if (!target) return { x: from.x, y: 16, z: from.z };
        const p = target.actor.getPosition();
        return { x: p.x, y: 16, z: p.z };
      },
      { onComplete: () => {} },
    );
  };

  const giveCraftedGift = (npcId: string, craftedId: CraftedId) => {
    if (!state.canGiftNpc(npcId)) {
      Audio.sfx("deny");
      think("I already gave them a gift today…");
      return;
    }
    const gift = CRAFTED_GIFTS.find((g) => g.craftedId === craftedId);
    if (!gift || !state.removeCrafted(craftedId, 1)) {
      Audio.sfx("deny");
      think("I don't have that anymore…");
      return;
    }
    state.markNpcGifted(npcId);

    holdNpcStill(npcId);
    const npc = npcs.find((n) => n.id === npcId);
    if (npc) {
      const p = npc.actor.getPosition();
      facePlayerToward(p.x, p.z);
    }

    const ambient = isAmbientNpcId(npcId) ? ambientNpcById[npcId] : undefined;
    const villager = !ambient ? NPCS.find((n) => n.id === npcId) : undefined;
    const npcName = ambient?.name ?? villager?.name ?? "friend";
    const recipe = recipeById[craftedId];
    const itemName = recipe?.name ?? gift.label;
    const visual = craftedGiftVisual(craftedId);
    const handoffMs = 3200;

    Audio.sfx("pickup");
    player.playWave();
    state.startBusy(gift.label, handoffMs);

    giftHandoff?.show({
      itemId: visual,
      itemName,
      playerLook: state.playerLook,
      playerName: state.playerName,
      npcId,
      npcName,
      npcLook: ambient?.look,
      durationMs: handoffMs,
      onDone: () => applyCraftedGiftResult(npcId, craftedId),
    });
    hud?.pulseAvatar();
    confetti?.burst("soft");

    const from = { x: playerX, y: 16, z: playerZ };
    giftToss?.spawn(
      visual,
      from,
      () => {
        const target = npcs.find((n) => n.id === npcId);
        if (!target) return { x: from.x, y: 16, z: from.z };
        const p = target.actor.getPosition();
        return { x: p.x, y: 16, z: p.z };
      },
      { onComplete: () => {} },
    );
  };

  const showBagGiftPicker = (
    npcId: string,
    name: string,
    x: number,
    y: number,
    onCancel: () => void,
  ) => {
    if (!state.canGiftNpc(npcId)) {
      Audio.sfx("deny");
      think("I already gave them a gift today…");
      return;
    }
    const owned = ownedBagGifts();
    const crafted = ownedCraftedGifts();
    if (!owned.length && !crafted.length) {
      Audio.sfx("deny");
      think("Nothing giftable in my bag yet…");
      return;
    }
    holdNpcStill(npcId);
    const isAmbient = isAmbientNpcId(npcId);
    const giftOptions: MenuOption[] = owned.map((g) => {
      if (isAmbient) {
        return {
          id: `gift_item_${g.itemId}`,
          label: g.label,
          sub: `${state.materialCount(g.itemId)} in bag · a little treat`,
        };
      }
      const bonus = g.preference?.[npcId as NpcId] ?? 0;
      return {
        id: `gift_item_${g.itemId}`,
        label: g.label,
        sub: `${state.materialCount(g.itemId)} in bag · +${g.delta + bonus} friendship`,
      };
    });
    for (const g of crafted) {
      const bonus = isAmbient ? 0 : (g.preference?.[npcId as NpcId] ?? 0);
      giftOptions.push({
        id: `gift_craft_${g.craftedId}`,
        label: g.label,
        sub: `${state.craftedCount(g.craftedId)} handmade · +${g.delta + bonus} friendship`,
      });
    }
    giftOptions.push({
      id: "gift_cancel",
      label: "Never mind",
      sub: "Keep chatting",
    });
    menu.show(
      name,
      "Pick a gift from your bag",
      giftOptions,
      x,
      y,
      (giftId) => {
        if (giftId === "gift_cancel") {
          onCancel();
          return;
        }
        if (giftId.startsWith("gift_craft_")) {
          const craftedId = giftId.slice("gift_craft_".length) as CraftedId;
          giveCraftedGift(npcId, craftedId);
          return;
        }
        if (!giftId.startsWith("gift_item_")) return;
        const itemId = giftId.slice("gift_item_".length) as MaterialId;
        giveBagGift(npcId, itemId);
      },
      { id: npcId },
    );
  };

  const openAmbientMenu = (target: Target, x: number, y: number) => {
    if (nightBlocksLeisure()) {
      Audio.sfx("deny");
      thinkSeq([
        "Too late for chats…",
        "Better head home and sleep.",
      ]);
      const t = buildingHintTarget("home");
      hintArrow?.showAt(t.x, t.z, "Home", 5000);
      return;
    }
    const def = ambientNpcById[target.id];
    if (!def) return;
    holdNpcStill(def.id);
    const owned = ownedBagGifts();
    const craftedOwned = ownedCraftedGifts();
    const options: MenuOption[] = [];

    const offer = quests.pendingOfferFor(def.id);
    if (offer) {
      options.push({
        id: "side_offer",
        label: "Offer to help",
        sub: offer.def.title,
        accent: "quest",
      });
    }

    if (def.id === "nibs" && quests.isActive("nibs_shoe")) {
      const step = quests.currentStepId("nibs_shoe");
      if (step === "deliver") {
        options.push({
          id: "nibs_shoe_deliver",
          label: "Return Gordon",
          sub: "Left shoe, reunited",
          accent: "quest",
        });
      }
    }
    if (def.id === "crumb" && quests.isActive("crumb_snack")) {
      const step = quests.currentStepId("crumb_snack");
      if (step === "deliver") {
        options.push({
          id: "crumb_snack_deliver",
          label: "Deliver snack",
          sub: "From Vera's Market",
          accent: "quest",
        });
      }
    }
    if (def.id === "sprocket" && quests.isActive("sprocket_scrap")) {
      const step = quests.currentStepId("sprocket_scrap");
      if (step === "deliver") {
        options.push({
          id: "sprocket_scrap_deliver",
          label: "Deliver scrap wood",
          sub: "For the contraption",
          accent: "quest",
        });
      }
    }

    options.push({
      id: "chat",
      label: "Have a chat",
      sub: "Banter · vibes · nonsense",
    });
    if (owned.length > 0 || craftedOwned.length > 0) {
      const canGift = state.canGiftNpc(def.id);
      const names = [
        ...owned.map((g) => materialById[g.itemId]?.name ?? g.itemId),
        ...craftedOwned.map((g) => recipeById[g.craftedId]?.name ?? g.craftedId),
      ];
      options.push({
        id: "gift_bag",
        label: "Gift from bag",
        sub: canGift ? names.join(" · ") : "Already gifted today",
        disabled: !canGift,
      });
    }
    menu.show(
      def.name,
      `${def.vibe} · street hangabout`,
      options,
      x,
      y,
      (id) => {
        if (id === "side_offer") {
          const pending = quests.pendingOfferFor(def.id);
          if (!pending) return;
          Audio.sfx("talk");
          state.startBusy(`Helping ${def.name}`, 900);
          delayed(900, () => {
            Audio.sfx("chime");
            const line =
              pending.def.offerPitch?.[0] ??
              "Could use a hand with something…";
            dialogue.say({
              speakerId: def.id,
              speakerName: def.name,
              text: line,
            });
            quests.emit(pending.askEvent);
            afterGroundQuestUnlocked(pending.askEvent);
            state.showToast(`Side quest: ${pending.def.title}`, 2600);
          });
          return;
        }
        if (id === "nibs_shoe_deliver") {
          Audio.sfx("talk");
          delayed(800, () => {
            dialogue.say({
              speakerId: "nibs",
              speakerName: "Nibs",
              text: "GORDON! You glorious lace. Brenda will be so jealous.",
            });
            quests.emit("delivered_gordon_shoe");
          });
          return;
        }
        if (id === "crumb_snack_deliver") {
          Audio.sfx("talk");
          delayed(800, () => {
            dialogue.say({
              speakerId: "crumb",
              speakerName: "Crumb",
              text: "Bless. My stomach withdraws the complaint.",
            });
            quests.emit("delivered_crumb_snack");
          });
          return;
        }
        if (id === "sprocket_scrap_deliver") {
          Audio.sfx("talk");
          delayed(800, () => {
            dialogue.say({
              speakerId: "sprocket",
              speakerName: "Sprocket",
              text: "Perfect scrap. This contraption will definitely not explode.",
            });
            quests.emit("delivered_sprocket_scrap");
          });
          return;
        }
        if (id === "chat") {
          tryChatWithOffer(def.id, def.name, () => talkToAmbient(def.id));
          return;
        }
        if (id === "gift_bag") {
          showBagGiftPicker(def.id, def.name, x, y, () =>
            openAmbientMenu(target, x, y),
          );
        }
      },
      { id: def.id },
    );
  };

  const playerTile = (): GridPos => ({
    x: Math.floor(playerX / TILE),
    y: Math.floor(playerZ / TILE),
  });

  const inBounds = (tx: number, ty: number) =>
    tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

  const furnitureAt = (tx: number, ty: number, lotId?: LotId) => {
    // Prefer surface children so pick/click targets the appliance first.
    for (const f of state.furniture) {
      if (!f.parentUid) continue;
      if (lotId && f.lotId !== lotId) continue;
      if (f.tx === tx && f.ty === ty) return f;
    }
    // Prefer standing furniture over rugs so click picks the sofa, not the mat.
    let covering: (typeof state.furniture)[number] | null = null;
    for (const f of state.furniture) {
      if (f.parentUid) continue;
      if (lotId && f.lotId !== lotId) continue;
      const def = furnitureById[f.defId];
      if (!def) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      if (tx >= f.tx && ty >= f.ty && tx < f.tx + tw && ty < f.ty + th) {
        if (def.floorCovering) {
          covering ??= f;
          continue;
        }
        return f;
      }
    }
    return covering;
  };

  /** Floor-level piece covering a tile (ignores countertop children + rugs). */
  const floorFurnitureAt = (tx: number, ty: number, lotId?: LotId) => {
    for (const f of state.furniture) {
      if (f.parentUid) continue;
      if (lotId && f.lotId !== lotId) continue;
      const def = furnitureById[f.defId];
      if (!def || def.floorCovering) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      if (tx >= f.tx && ty >= f.ty && tx < f.tx + tw && ty < f.ty + th) {
        return f;
      }
    }
    return null;
  };

  /** Rug / mat covering a tile (floorCovering pieces only). */
  const floorCoveringAt = (tx: number, ty: number, lotId?: LotId) => {
    for (const f of state.furniture) {
      if (f.parentUid) continue;
      if (lotId && f.lotId !== lotId) continue;
      const def = furnitureById[f.defId];
      if (!def?.floorCovering) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      if (tx >= f.tx && ty >= f.ty && tx < f.tx + tw && ty < f.ty + th) {
        return f;
      }
    }
    return null;
  };

  /** Host that supports countertop items covering this tile. */
  const surfaceHostAt = (tx: number, ty: number, lotId?: LotId) => {
    for (const f of state.furniture) {
      if (f.parentUid) continue;
      if (lotId && f.lotId !== lotId) continue;
      const def = furnitureById[f.defId];
      if (!def?.supportsItems) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      if (tx >= f.tx && ty >= f.ty && tx < f.tx + tw && ty < f.ty + th) {
        return f;
      }
    }
    return null;
  };

  const surfaceChildAt = (tx: number, ty: number, lotId?: LotId) => {
    for (const f of state.furniture) {
      if (!f.parentUid) continue;
      if (lotId && f.lotId !== lotId) continue;
      if (f.tx === tx && f.ty === ty) return f;
    }
    return null;
  };

  const removeFurnitureMesh = (uid: string) => {
    const mesh = furnitureMeshes.get(uid);
    if (mesh) {
      app.renderer.remove(mesh);
      furnitureMeshes.delete(uid);
    }
  };

  const rebuildCollision = () => {
    collision = baseCollision.map((row) => [...row]);
    for (const key of state.walls) {
      const [tx, ty] = key.split(",").map(Number);
      if (inBounds(tx, ty)) collision[ty][tx] = true;
    }
    for (const f of state.furniture) {
      if (f.parentUid) continue;
      const def = furnitureById[f.defId];
      if (!def?.blocksMovement) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
          const tx = f.tx + dx;
          const ty = f.ty + dy;
          if (inBounds(tx, ty)) collision[ty][tx] = true;
        }
      }
    }
    // Depleted harvest nodes become walkable until they respawn.
    for (const node of state.harvestNodes) {
      if (!state.isHarvestDepleted(node.uid)) continue;
      const fp = harvestFootprint(node.defId);
      for (let dy = 0; dy < fp; dy++) {
        for (let dx = 0; dx < fp; dx++) {
          const tx = node.tx + dx;
          const ty = node.ty + dy;
          if (inBounds(tx, ty)) collision[ty][tx] = false;
        }
      }
    }
  };

  const syncHarvestVisuals = () => {
    for (const node of state.harvestNodes) {
      const handle = harvestHandles.get(node.uid);
      if (!handle) continue;
      const depleted = state.isHarvestDepleted(node.uid);
      handle.root.visible = !depleted;
      if (!depleted && harvestAnim?.uid !== node.uid) {
        handle.root.scale.set(1, 1, 1);
        handle.root.rotation.x = 0;
        handle.root.rotation.z = 0;
      }
      const fruit = handle.root.getObjectByName("fruit");
      if (fruit) fruit.visible = !depleted && !state.isHarvestShaken(node.uid);
    }
  };

  const syncForageVisuals = () => {
    for (const handle of app.renderer.getForageHandles()) {
      handle.root.visible = !state.isForageDepleted(handle.tx, handle.ty);
    }
  };

  const clearPorchMeshes = () => {
    for (const mesh of porchMeshes.values()) {
      app.renderer.remove(mesh);
    }
    porchMeshes.clear();
  };

  const spawnPorchMesh = (uid: string, itemId: MaterialId, x: number, z: number) => {
    const existing = porchMeshes.get(uid);
    if (existing) {
      app.renderer.remove(existing);
      porchMeshes.delete(uid);
    }
    const mesh = createInventoryItemMesh(`mat:${itemId}`);
    mesh.scale.setScalar(0.7);
    mesh.position.set(x, 2.4, z);
    mesh.userData.porchUid = uid;
    mesh.castShadow = true;
    app.renderer.add(mesh);
    porchMeshes.set(uid, mesh);
  };

  const syncPorchVisuals = () => {
    const keep = new Set(state.porchDrops.map((d) => d.uid));
    for (const [uid, mesh] of porchMeshes) {
      if (!keep.has(uid)) {
        app.renderer.remove(mesh);
        porchMeshes.delete(uid);
      }
    }
    for (const drop of state.porchDrops) {
      if (!porchMeshes.has(drop.uid)) {
        spawnPorchMesh(drop.uid, drop.itemId as MaterialId, drop.x, drop.z);
      }
    }
  };

  type ActiveQuestGroundItem = {
    id: QuestGroundItemId;
    label: string;
    tx: number;
    ty: number;
    visual: "litter" | "shoe";
  };

  const activeQuestGroundItems = (): ActiveQuestGroundItem[] => {
    const out: ActiveQuestGroundItem[] = [];
    if (
      quests.isActive("nibs_shoe") &&
      quests.currentStepId("nibs_shoe") === "find" &&
      !state.hasStoryFlag(questItemClearedFlag("gordon_shoe"))
    ) {
      out.push({
        id: "gordon_shoe",
        label: "Gordon (shoe)",
        tx: GORDON_SHOE_TILE.x,
        ty: GORDON_SHOE_TILE.y,
        visual: "shoe",
      });
    }
    if (
      quests.isActive("pip_pond") &&
      quests.currentStepId("pip_pond") === "clean"
    ) {
      for (const spot of PARK_LITTER_SPOTS) {
        if (state.hasStoryFlag(questItemClearedFlag(spot.id))) continue;
        out.push({
          id: spot.id,
          label: spot.label,
          tx: spot.x,
          ty: spot.y,
          visual: "litter",
        });
      }
    }
    if (
      quests.isActive("pip_pier") &&
      quests.currentStepId("pip_pier") === "clean"
    ) {
      for (const spot of PIER_LITTER_SPOTS) {
        if (state.hasStoryFlag(questItemClearedFlag(spot.id))) continue;
        out.push({
          id: spot.id,
          label: spot.label,
          tx: spot.x,
          ty: spot.y,
          visual: "litter",
        });
      }
    }
    return out;
  };

  const clearQuestItemMeshes = () => {
    for (const mesh of questItemMeshes.values()) {
      app.renderer.remove(mesh);
    }
    questItemMeshes.clear();
  };

  const spawnQuestItemMesh = (item: ActiveQuestGroundItem) => {
    const existing = questItemMeshes.get(item.id);
    if (existing) {
      app.renderer.remove(existing);
      questItemMeshes.delete(item.id);
    }
    const mesh = createQuestItemMesh(item.visual);
    mesh.scale.setScalar(item.visual === "shoe" ? 0.85 : 0.75);
    mesh.position.set(
      item.tx * TILE + TILE / 2,
      1.6,
      item.ty * TILE + TILE / 2,
    );
    mesh.userData.questItemId = item.id;
    mesh.castShadow = true;
    app.renderer.add(mesh);
    questItemMeshes.set(item.id, mesh);
  };

  const syncQuestItemVisuals = () => {
    const active = activeQuestGroundItems();
    const keep = new Set(active.map((i) => i.id));
    for (const [id, mesh] of questItemMeshes) {
      if (!keep.has(id as QuestGroundItemId)) {
        app.renderer.remove(mesh);
        questItemMeshes.delete(id);
      }
    }
    for (const item of active) {
      if (!questItemMeshes.has(item.id)) spawnQuestItemMesh(item);
    }
  };

  const pointToNearestLitter = (
    spots: readonly { id: QuestGroundItemId; x: number; y: number }[],
    label: string,
  ) => {
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    for (const spot of spots) {
      if (state.hasStoryFlag(questItemClearedFlag(spot.id))) continue;
      const x = spot.x * TILE + TILE / 2;
      const z = spot.y * TILE + TILE / 2;
      const d = Math.hypot(x - playerX, z - playerZ);
      if (d < bestD) {
        bestD = d;
        best = { x, z };
      }
    }
    if (best) hintArrow?.showAt(best.x, best.z, label, 7000);
  };

  /** After a find/cleanup ask step unlocks, spawn props and nudge the player. */
  const afterGroundQuestUnlocked = (askEvent: QuestEvent) => {
    syncQuestItemVisuals();
    if (askEvent === "pip_ask_cleanup") {
      pointToNearestLitter(PARK_LITTER_SPOTS, "Litter");
    } else if (askEvent === "pip_ask_pier") {
      pointToNearestLitter(PIER_LITTER_SPOTS, "Litter");
    } else if (askEvent === "nibs_ask_shoe") {
      const x = GORDON_SHOE_TILE.x * TILE + TILE / 2;
      const z = GORDON_SHOE_TILE.y * TILE + TILE / 2;
      hintArrow?.showAt(x, z, "Gordon", 7000);
    }
  };

  const porchSpawnPoint = (index: number): { x: number; z: number } => {
    const door = lotDoorWorld("home");
    const baseX = door?.x ?? 8 * TILE;
    const baseZ = door?.z ?? 15 * TILE;
    const col = index % 4;
    const row = Math.floor(index / 4);
    return {
      x: baseX + (col - 1.5) * 10,
      z: baseZ + 18 + row * 10,
    };
  };

  const updateHarvestAnim = () => {
    if (!harvestAnim) return;
    const handle = harvestHandles.get(harvestAnim.uid);
    if (!handle || !handle.root.visible) return;
    const t = Math.min(
      1,
      (performance.now() - harvestAnim.startMs) / harvestAnim.durationMs,
    );
    // Ease-in so early chops nibble and the last stretch collapses.
    const fall = t * t;
    if (harvestAnim.isTree) {
      const s = Math.max(0.04, 1 - fall * 0.96);
      handle.root.scale.set(s * (1 - fall * 0.2), s, s * (1 - fall * 0.2));
      handle.root.rotation.z = fall * 0.55;
      handle.root.rotation.x = fall * 0.12;
    } else {
      const s = Math.max(0.2, 1 - fall * 0.75);
      handle.root.scale.setScalar(s);
      handle.root.rotation.z = Math.sin(fall * Math.PI * 4) * 0.08 * (1 - fall);
    }
  };

  /** Brief rubbery sway after bumping a tree (skipped while chopping). */
  const updateTreeBumpWobble = (dt: number) => {
    if (!treeBumpWobble) return;
    treeBumpWobble.t += dt;
    const handle = harvestHandles.get(treeBumpWobble.uid);
    const chopping = harvestAnim?.uid === treeBumpWobble.uid;
    if (handle && handle.root.visible && !chopping) {
      const u = Math.min(1, treeBumpWobble.t / treeBumpWobble.dur);
      const fade = 1 - u;
      handle.root.rotation.z = Math.sin(treeBumpWobble.t * 26) * 0.14 * fade;
      handle.root.rotation.x = Math.sin(treeBumpWobble.t * 18) * 0.04 * fade;
      const squash = 1 + Math.sin(u * Math.PI) * 0.06 * fade;
      handle.root.scale.set(squash, 1 - (squash - 1) * 0.5, squash);
    }
    if (treeBumpWobble.t >= treeBumpWobble.dur) {
      if (handle && !chopping) {
        handle.root.rotation.z = 0;
        handle.root.rotation.x = 0;
        handle.root.scale.set(1, 1, 1);
      }
      treeBumpWobble = null;
    }
  };

  /**
   * Tiles NPCs must not idle on: blocked ground plus any interactive furniture
   * footprint (desks, counters, etc.) so they never obstruct use / clicks.
   */
  const npcStandBlocked = (): boolean[][] => {
    const blocked = collision.map((row) => [...row]);
    for (const f of state.furniture) {
      if (f.parentUid) continue;
      const def = furnitureById[f.defId];
      if (!def?.interactions?.length) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
          const tx = f.tx + dx;
          const ty = f.ty + dy;
          if (inBounds(tx, ty)) blocked[ty][tx] = true;
        }
      }
    }
    return blocked;
  };

  /** Snap an authored spawn off desks / counters / walls onto a free stand tile. */
  const snapNpcStand = (tx: number, ty: number): GridPos => {
    const blocked = npcStandBlocked();
    return (
      nearestWalkable(blocked, { x: tx, y: ty }, MAP_W, MAP_H, 6) ?? {
        x: tx,
        y: ty,
      }
    );
  };

  /** Pick a walkable tile within `radius` of an anchor (for short strolls). */
  const pickLocalWanderGoal = (
    homeTx: number,
    homeTy: number,
    radius: number,
    blocked: boolean[][],
  ): GridPos | null => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const gx =
        homeTx + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const gy =
        homeTy + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      if (!inBounds(gx, gy) || blocked[gy]![gx]) continue;
      const walkable = nearestWalkable(
        blocked,
        { x: gx, y: gy },
        MAP_W,
        MAP_H,
        2,
      );
      if (walkable && (walkable.x !== homeTx || walkable.y !== homeTy || attempt > 3)) {
        return walkable;
      }
      if (walkable) return walkable;
    }
    return null;
  };

  const spawnFurniture = (f: PlacedFurniture) => {
    let surfaceY = 0;
    let host: PlacedFurniture | undefined;
    if (f.parentUid) {
      host = state.furniture.find((h) => h.uid === f.parentUid);
      if (host) surfaceY = surfaceHeightFor(host.defId);
    }
    const mesh = placeFurniture(f, { surfaceY, host });
    furnitureMeshes.set(f.uid, mesh);
    app.renderer.add(mesh);
    return mesh;
  };

  const addWall = (tx: number, ty: number) => {
    const key = state.wallKey(tx, ty);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 0.9, 22, TILE * 0.9),
      matFlat(0xfdf3e0),
    );
    mesh.position.set(tx * TILE + TILE / 2, 11, ty * TILE + TILE / 2);
    mesh.castShadow = true;
    wallMeshes.set(key, mesh);
    app.renderer.add(mesh);
  };

  const addFloor = (tx: number, ty: number, variant = 1, rot: Dir = "down") => {
    const key = state.wallKey(tx, ty);
    const existing = floorMeshes.get(key);
    if (existing) {
      app.renderer.remove(existing);
      floorMeshes.delete(key);
    }
    const mesh = createPaintFloorMesh(tx, ty, variant, rot);
    floorMeshes.set(key, mesh);
    app.renderer.add(mesh);
  };

  /** Build-mode ray targets: home furniture only (never pets/NPCs/signs). */
  const buildFurniturePickables = (): THREE.Object3D[] => {
    const out: THREE.Object3D[] = [];
    for (const f of state.furniture) {
      if (f.lotId !== "home") continue;
      const mesh = furnitureMeshes.get(f.uid);
      if (mesh) out.push(mesh);
    }
    return out;
  };

  const insideHomeTile = (tx: number, ty: number) => {
    const home = LOTS.find((l) => l.id === "home")!;
    return (
      tx > home.tx &&
      ty > home.ty &&
      tx < home.tx + home.tw - 1 &&
      ty < home.ty + home.th - 1
    );
  };

  const syncPet = () => {
    if (pet) {
      app.renderer.remove(pet.root);
      pet.dispose();
      pet = null;
    }
    if (!state.adoptedPet) return;
    const def = petById[state.adoptedPet.defId];
    if (!def) return;
    pet = createPet(def);
    pet.root.userData.petPick = true;
    pet.setPosition(state.adoptedPet.x, state.adoptedPet.y);
    app.renderer.add(pet.root);
  };

  /** Interactions that claim a seat / bed (player snaps on). */
  const SEAT_INTERACTION_IDS = new Set([
    "relax",
    "sit",
    "sit_soft",
    "nap",
    "sleep",
    "lounge",
    "flop",
    "cuddle_seat",
    "picnic",
    "perch",
  ]);

  const isSeatingDef = (defId: string): boolean => {
    const def = furnitureById[defId];
    return !!def?.interactions.some((i) => SEAT_INTERACTION_IDS.has(i.id));
  };

  /** Seat furniture whose footprint covers this tile. */
  const seatingUidAtTile = (tx: number, ty: number): string | null => {
    for (const f of state.furniture) {
      if (!isSeatingDef(f.defId)) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      if (tx >= f.tx && tx < f.tx + tw && ty >= f.ty && ty < f.ty + th) {
        return f.uid;
      }
    }
    return null;
  };

  /** Furniture uids currently claimed by a sitting/lying NPC. */
  const occupiedSeatUids = (): Set<string> => {
    const occupied = new Set<string>();
    for (const npc of npcs) {
      if (npc.leftForDay || npc.leavingClosing) continue;
      const pose = npc.actor.getPose();
      if (pose !== "sit" && pose !== "lie") continue;
      const p = npc.actor.getPosition();
      const uid = seatingUidAtTile(
        Math.floor(p.x / TILE),
        Math.floor(p.z / TILE),
      );
      if (uid) occupied.add(uid);
    }
    return occupied;
  };

  const npcOnSeat = (uid: string): string | null => {
    for (const npc of npcs) {
      if (npc.leftForDay || npc.leavingClosing) continue;
      const pose = npc.actor.getPose();
      if (pose !== "sit" && pose !== "lie") continue;
      const p = npc.actor.getPosition();
      if (
        seatingUidAtTile(Math.floor(p.x / TILE), Math.floor(p.z / TILE)) === uid
      ) {
        return npc.id;
      }
    }
    return null;
  };

  const denyOccupiedSeat = () => {
    Audio.sfx("deny");
    think("Someone's already sitting there.");
  };

  const allTargets = (): Target[] => {
    const out: Target[] = [];
    const takenSeats = occupiedSeatUids();
    for (const f of state.furniture) {
      const def = furnitureById[f.defId];
      if (!def || def.interactions.length === 0) continue;
      // Taken seats tip as the sitter (Talk), not the chair.
      if (takenSeats.has(f.uid)) continue;
      const rot = f.rot ?? "down";
      const { tw, th } = furnitureFootprint(f.defId, rot);
      const tiles: GridPos[] = [];
      for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
          tiles.push({ x: f.tx + dx, y: f.ty + dy });
        }
      }
      out.push({
        kind: "furniture",
        id: f.uid,
        label: def.name,
        tiles,
        x: f.tx * TILE + (tw * TILE) / 2,
        z: f.ty * TILE + (th * TILE) / 2,
      });
    }
    for (const npc of npcs) {
      if (npc.leftForDay || npc.leavingClosing) continue;
      const def =
        NPCS.find((n) => n.id === npc.id) ?? ambientNpcById[npc.id];
      if (!def) continue;
      const p = npc.actor.getPosition();
      out.push({
        kind: "npc",
        id: npc.id,
        label: def.name,
        tiles: [{ x: Math.floor(p.x / TILE), y: Math.floor(p.z / TILE) }],
        x: p.x,
        z: p.z,
      });
    }
    if (pet && state.adoptedPet) {
      const p = pet.getPosition();
      out.push({
        kind: "pet",
        id: "pet",
        label: state.adoptedPetName,
        tiles: [{ x: Math.floor(p.x / TILE), y: Math.floor(p.z / TILE) }],
        x: p.x,
        z: p.z,
      });
    }
    for (const sign of app.renderer.getSigns()) {
      out.push({
        kind: "sign",
        id: sign.def.id,
        label: sign.def.name,
        tiles: [sign.tile],
        x: sign.worldX,
        z: sign.worldZ,
      });
    }
    for (const node of state.harvestNodes) {
      if (state.isHarvestDepleted(node.uid)) continue;
      const def = harvestNodeById[node.defId];
      if (!def) continue;
      const fp = harvestFootprint(node.defId);
      const tiles: GridPos[] = [];
      for (let dy = 0; dy < fp; dy++) {
        for (let dx = 0; dx < fp; dx++) {
          tiles.push({ x: node.tx + dx, y: node.ty + dy });
        }
      }
      out.push({
        kind: "harvest",
        id: node.uid,
        label: def.label,
        tiles,
        x: (node.tx + fp / 2) * TILE,
        z: (node.ty + fp / 2) * TILE,
      });
    }
    for (const handle of app.renderer.getForageHandles()) {
      if (state.isForageDepleted(handle.tx, handle.ty)) continue;
      const def = forageById[handle.itemId];
      out.push({
        kind: "forage",
        id: `${handle.tx},${handle.ty}`,
        label: def?.label ?? handle.itemId,
        tiles: [{ x: handle.tx, y: handle.ty }],
        x: handle.tx * TILE + TILE / 2,
        z: handle.ty * TILE + TILE / 2,
        forageItemId: handle.itemId,
      });
    }
    for (const drop of state.porchDrops) {
      const mat = materialById[drop.itemId as MaterialId];
      out.push({
        kind: "porch",
        id: drop.uid,
        label: mat?.name ?? "Delivery",
        tiles: [
          {
            x: Math.floor(drop.x / TILE),
            y: Math.floor(drop.z / TILE),
          },
        ],
        x: drop.x,
        z: drop.z,
      });
    }
    for (const item of activeQuestGroundItems()) {
      out.push({
        kind: "quest_item",
        id: item.id,
        label: item.label,
        tiles: [{ x: item.tx, y: item.ty }],
        x: item.tx * TILE + TILE / 2,
        z: item.ty * TILE + TILE / 2,
      });
    }
    // Indoor ↔ outdoor: only tip / interact with things in the same space.
    // Walking past a house must not autofocus sofas, beds, or people inside.
    const playerLot = app.renderer.buildingLotAt(playerX, playerZ);
    return out.filter(
      (t) => app.renderer.buildingLotAt(t.x, t.z) === playerLot,
    );
  };

  /**
   * Distance to the edge of a target's tile footprint, not its centre - a
   * two-by-two bed reaches 45 units from its middle, so centre distance would
   * miss clicks on the visible ends.
   */
  const distanceToTarget = (wx: number, wz: number, t: Target): number => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const tile of t.tiles) {
      minX = Math.min(minX, tile.x);
      maxX = Math.max(maxX, tile.x);
      minY = Math.min(minY, tile.y);
      maxY = Math.max(maxY, tile.y);
    }
    const halfW = ((maxX - minX + 1) * TILE) / 2;
    const halfD = ((maxY - minY + 1) * TILE) / 2;
    const dx = Math.max(0, Math.abs(wx - t.x) - halfW);
    const dz = Math.max(0, Math.abs(wz - t.z) - halfD);
    return Math.hypot(dx, dz);
  };

  /** Everything the cursor can hit directly, props and characters alike. */
  const pickables = (): THREE.Object3D[] => {
    const out: THREE.Object3D[] = [];
    for (const mesh of furnitureMeshes.values()) out.push(mesh);
    for (const handle of harvestHandles.values()) {
      if (handle.root.visible) out.push(handle.root);
    }
    for (const handle of app.renderer.getForageHandles()) {
      if (handle.root.visible) out.push(handle.root);
    }
    for (const mesh of porchMeshes.values()) out.push(mesh);
    for (const mesh of questItemMeshes.values()) out.push(mesh);
    for (const npc of npcs) {
      if (!npc.leftForDay) out.push(npc.actor.root);
    }
    if (pet) out.push(pet.root);
    for (const sign of app.renderer.getSigns()) out.push(sign.root);
    return out;
  };

  const targetForObject = (obj: THREE.Object3D): Target | null => {
    const targets = allTargets();
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      const uid = cur.userData.uid as string | undefined;
      if (uid) {
        const furnTarget = targets.find(
          (t) => t.kind === "furniture" && t.id === uid,
        );
        if (furnTarget) return furnTarget;
        // Occupied chair mesh: talk to the sitter instead of walking onto them.
        const sitter = npcOnSeat(uid);
        if (sitter) {
          return (
            targets.find((t) => t.kind === "npc" && t.id === sitter) ?? null
          );
        }
        return null;
      }
      const harvestUid = cur.userData.harvestUid as string | undefined;
      if (harvestUid) {
        return (
          targets.find((t) => t.kind === "harvest" && t.id === harvestUid) ??
          null
        );
      }
      const forageTile = cur.userData.forageTile as string | undefined;
      if (forageTile) {
        return (
          targets.find((t) => t.kind === "forage" && t.id === forageTile) ?? null
        );
      }
      const porchUid = cur.userData.porchUid as string | undefined;
      if (porchUid) {
        return (
          targets.find((t) => t.kind === "porch" && t.id === porchUid) ?? null
        );
      }
      const questItemId = cur.userData.questItemId as string | undefined;
      if (questItemId) {
        return (
          targets.find((t) => t.kind === "quest_item" && t.id === questItemId) ??
          null
        );
      }
      const npcId = cur.userData.npcId as string | undefined;
      if (npcId) {
        return targets.find((t) => t.kind === "npc" && t.id === npcId) ?? null;
      }
      if (cur.userData.petPick) {
        return targets.find((t) => t.kind === "pet") ?? null;
      }
      const signId = cur.userData.signId as string | undefined;
      if (signId) {
        return targets.find((t) => t.kind === "sign" && t.id === signId) ?? null;
      }
      cur = cur.parent;
    }
    return null;
  };

  const targetAt = (wx: number, wz: number): Target | null => {
    let best: Target | null = null;
    let bestD = 12;
    for (const t of allTargets()) {
      const d = distanceToTarget(wx, wz, t);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  };

  const nearestTarget = (maxDist: number): Target | null => {
    let best: Target | null = null;
    let bestD = maxDist;
    for (const t of allTargets()) {
      const d = distanceToTarget(playerX, playerZ, t);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  };

  /** Walk-to-interact range (~2 tiles from footprint edge). */
  const INTERACT_RANGE = 2 * TILE;

  const tipHeightFor = (t: Target): number => {
    if (t.kind === "npc" || t.kind === "pet") return 40;
    if (t.kind === "sign") return 48;
    if (t.kind === "harvest") {
      const node = state.harvestNodes.find((n) => n.uid === t.id);
      return harvestFootprint(node?.defId ?? "") >= 2 ? 56 : 36;
    }
    if (t.kind === "forage") return 22;
    if (t.kind === "porch" || t.kind === "quest_item") return 18;
    return 28;
  };

  /** Primary verb shown on the proximity tip (Talk / Watch TV / Brew Coffee…). */
  const actionLabelFor = (t: Target): string => {
    if (t.kind === "npc") {
      if (quests.hasPendingSideOffer(t.id)) return "Side quest";
      return "Talk";
    }
    if (t.kind === "quest_item") return "Pick up";
    if (t.kind === "pet") return "Cuddle";
    if (t.kind === "sign") return "Read";
    if (t.kind === "forage") {
      const itemId = t.forageItemId;
      return (itemId && forageById[itemId]?.verb) || "Pick";
    }
    if (t.kind === "porch") return "Collect";
    if (t.kind === "harvest") {
      const node = state.harvestNodes.find((n) => n.uid === t.id);
      const def = node ? harvestNodeById[node.defId] : null;
      return def?.verb ?? "Gather";
    }

    const furn = state.furniture.find((f) => f.uid === t.id);
    if (!furn) return "Use";
    const def = furnitureById[furn.defId];
    if (!def) return "Use";

    // Mid-shift: tip the active task station with its task label.
    if (state.jobActive && state.activeJobId) {
      const active = jobById[state.activeJobId];
      const task = active?.tasks[state.jobTasksDone];
      if (active && task && furn.uid === task.furnitureUid) {
        return task.label;
      }
    }

    const assist = townBoard.getAcceptedWorkAssist();
    if (
      assist &&
      !state.jobActive &&
      townBoard.furnitureMatchesAssist(furn.uid, assist.furnitureUid)
    ) {
      return assist.label;
    }

    if (
      quests.isActive("jun_favor") &&
      quests.currentStepId("jun_favor") === "water" &&
      furn.lotId === "cafe" &&
      townBoard.furnitureMatchesAssist(furn.uid, "c_coffee")
    ) {
      return "Brew a drink";
    }

    const job = JOBS.find(
      (j) => j.lotId === furn.lotId && j.stationDefId === furn.defId,
    );
    if (job) {
      if (state.hiredJobs.includes(job.id)) return "Work";
      if (assist?.jobId === job.id) return assist.label;
      return "Ask about work";
    }

    if (furn.defId === "shelter_desk") return "See pets";

    const first = def.interactions[0];
    if (!first) return "Use";
    if (first.id === "sleep") return "Sleep";
    if (first.id === "watch") return "Watch";
    return first.label;
  };

  const syncInteractTip = () => {
    if (
      state.mode !== "live" ||
      uiBusy() ||
      hud?.isAnyModalOpen() ||
      state.isBusy()
    ) {
      tipTarget = null;
      interactTip?.hide();
      return;
    }
    const t = nearestTarget(INTERACT_RANGE);
    if (!t) {
      tipTarget = null;
      interactTip?.hide();
      return;
    }
    tipTarget = t;
    const questOffer = t.kind === "npc" && quests.hasPendingSideOffer(t.id);
    interactTip?.showAt(
      t.x,
      t.z,
      t.label,
      actionLabelFor(t),
      tipHeightFor(t),
      { questOffer },
    );
  };

  const activateTipTarget = () => {
    if (
      introActive ||
      storyPrologue?.isOpen() ||
      timeMontage?.isPlaying() ||
      workMini?.isOpen() ||
      playMini?.isOpen() ||
      tvViewer?.isOpen() ||
      dialogue?.isOpen() ||
      menu?.isOpen() ||
      hud?.isAnyModalOpen() ||
      state.mode !== "live" ||
      state.isBusy()
    ) {
      return;
    }
    const t = tipTarget ?? nearestTarget(INTERACT_RANGE);
    if (!t) {
      think("Hmm… nothing to use nearby.");
      return;
    }
    approach(t);
  };

  const tryInteractNearby = () => {
    if (
      introActive ||
      timeMontage?.isPlaying() ||
      workMini?.isOpen() ||
      playMini?.isOpen() ||
      tvViewer?.isOpen() ||
      dialogue?.isOpen() ||
      menu?.isOpen() ||
      hud?.isAnyModalOpen() ||
      state.mode !== "live" ||
      state.isBusy()
    ) {
      return false;
    }
    const t = tipTarget ?? nearestTarget(INTERACT_RANGE);
    if (t) {
      approach(t);
      return true;
    }
    think("Hmm… nothing to use nearby.");
    return false;
  };

  const approachTiles = (target: Target): GridPos[] => {
    const out: GridPos[] = [];
    const seen = new Set<string>();
    const push = (x: number, y: number) => {
      if (!inBounds(x, y) || collision[y][x]) return;
      const key = `${x},${y}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ x, y });
    };
    for (const t of target.tiles) {
      // Footprint + 8-neighbors (diagonals matter in packed interiors).
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          push(t.x + dx, t.y + dy);
        }
      }
    }
    // Pocketed props (corner plants, etc.): ring-search any walkable stand tile.
    if (out.length === 0) {
      for (const t of target.tiles) {
        const near = nearestWalkable(collision, t, MAP_W, MAP_H, 3);
        if (near) push(near.x, near.y);
      }
    }
    return out;
  };

  const setPath = (path: GridPos[], arrive: (() => void) | null) => {
    playerPath = path;
    onArrive = arrive;
    if (path.length === 0) {
      arrive?.();
      onArrive = null;
    }
  };

  const faceTowards = (x: number, z: number) => {
    const dx = x - playerX;
    const dz = z - playerZ;
    if (Math.abs(dx) > Math.abs(dz)) playerDir = dx > 0 ? "right" : "left";
    else playerDir = dz > 0 ? "down" : "up";
    player.setFacing(playerDir);
  };

  const canStand = (x: number, z: number): boolean => {
    const points: Array<[number, number]> = [
      [x - 7, z - 4],
      [x + 7, z - 4],
      [x, z - 1],
    ];
    return points.every(([px, pz]) => {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(pz / TILE);
      if (!inBounds(tx, ty)) return false;
      return !collision[ty][tx];
    });
  };

  /** Live (non-depleted) harvest tree covering this tile. */
  const treeUidAtTile = (tx: number, ty: number): string | null => {
    for (const node of state.harvestNodes) {
      if (state.isHarvestDepleted(node.uid)) continue;
      const def = harvestNodeById[node.defId];
      if (def?.kind !== "tree") continue;
      const fp = harvestFootprint(node.defId);
      if (tx >= node.tx && tx < node.tx + fp && ty >= node.ty && ty < node.ty + fp) {
        return node.uid;
      }
    }
    return null;
  };

  /** Whether a would-be stand pose collides with a tree footprint. */
  const treeBlockingStand = (x: number, z: number): string | null => {
    const points: Array<[number, number]> = [
      [x - 7, z - 4],
      [x + 7, z - 4],
      [x, z - 1],
    ];
    for (const [px, pz] of points) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(pz / TILE);
      if (!inBounds(tx, ty)) continue;
      const uid = treeUidAtTile(tx, ty);
      if (uid) return uid;
    }
    return null;
  };

  const bounceOffTree = (uid: string, dirX: number, dirZ: number) => {
    if (treeBumpCooldown > 0) return;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len;
    const nz = dirZ / len;
    treeBumpVelX = nx * 260;
    treeBumpVelZ = nz * 260;
    treeBumpCooldown = 0.4;
    treeBumpWobble = { uid, t: 0, dur: 0.42 };
    // Instant nudge so the rebound reads on the impact frame.
    const nudge = 11;
    const bx = playerX + nx * nudge;
    const bz = playerZ + nz * nudge;
    if (dirX !== 0 && canStand(bx, playerZ)) playerX = bx;
    if (dirZ !== 0 && canStand(playerX, bz)) playerZ = bz;
    Audio.sfx("boing");
    player.playReaction("jump");
    tryShakeFruit(uid);
  };

  /** Knock ripe fruit loose when bumping a fruit tree (once per day). */
  const tryShakeFruit = (uid: string) => {
    if (state.isHarvestDepleted(uid) || state.isHarvestShaken(uid)) return;
    const node = state.harvestNodes.find((n) => n.uid === uid);
    if (!node) return;
    const def = harvestNodeById[node.defId];
    if (!def?.shakeYields?.length) return;
    const yields = rollShakeYields(def);
    if (!yields.length) return;

    state.shakeHarvest(uid);
    syncHarvestVisuals();
    Audio.sfx("rustle");

    const parts: string[] = [];
    const remaining = new Map<MaterialId, number>();
    for (const y of yields) {
      const mat = materialById[y.itemId];
      parts.push(`+${y.count} ${mat?.name ?? y.itemId}`);
      remaining.set(y.itemId, (remaining.get(y.itemId) ?? 0) + y.count);
    }

    const fp = harvestFootprint(node.defId);
    const cx = (node.tx + fp / 2) * TILE;
    const cz = (node.ty + fp / 2) * TILE;

    const finishLoot = () => {
      for (const [itemId, count] of remaining) {
        if (count > 0) state.addMaterial(itemId, count);
      }
      remaining.clear();
      Audio.sfx("chime");
      state.showToast(parts.join(" · "), 2400);
    };

    if (!lootBurst) {
      finishLoot();
      return;
    }

    lootBurst.spawn(cx, 52, cz, yields, {
      onPieceCollect: (itemId) => {
        const left = remaining.get(itemId) ?? 0;
        if (left <= 0) return;
        remaining.set(itemId, left - 1);
        state.addMaterial(itemId, 1);
        Audio.sfx("coin");
      },
      onComplete: finishLoot,
    });
  };

  const walkSpeed = () => {
    if (state.needs.energy < NEED_CRITICAL) return WALK_SPEED * 0.45;
    if (state.needs.energy < 15) return WALK_SPEED * 0.6;
    return WALK_SPEED;
  };

  const playerLotId = (): LotId | undefined =>
    lotAtTile(Math.floor(playerX / TILE), Math.floor(playerZ / TILE))?.id;

  const playerAtHome = () => playerLotId() === "home";

  const buildingHintTarget = (lotId: LotId) => lotDoorWorld(lotId)!;

  const uiBusy = () =>
    introActive ||
    morningBeatActive ||
    !!dialogue?.isOpen() ||
    !!menu?.isOpen() ||
    !!timeMontage?.isPlaying() ||
    !!workMini?.isOpen() ||
    !!playMini?.isOpen() ||
    !!tvViewer?.isOpen() ||
    !!craftModal?.isOpen() ||
    !!boardModal?.isOpen() ||
    !!payCelebration?.isVisible() ||
    !!momentCelebration?.isVisible();

  let sofaAffordQueued = false;
  /** Sequenced milestone banners so reward / unlock / afford don't collide. */
  const celebQueue: Array<(done: () => void) => void> = [];
  let celebBusy = false;
  let celebThoughtWait: (() => void) | null = null;

  const pumpCelebQueue = () => {
    if (celebBusy) return;
    if (thoughtBubble?.isVisible()) {
      if (!celebThoughtWait) {
        celebThoughtWait = () => {
          celebThoughtWait = null;
          pumpCelebQueue();
        };
        thoughtBubble.whenCleared(celebThoughtWait);
      }
      return;
    }
    celebThoughtWait = null;
    const job = celebQueue.shift();
    if (!job) return;
    celebBusy = true;
    job(() => {
      celebBusy = false;
      pumpCelebQueue();
    });
  };

  const enqueueCelebration = (job: (done: () => void) => void) => {
    celebQueue.push(job);
    pumpCelebQueue();
  };

  /** Hold toasts while thoughts are up; resume celebrations when they clear. */
  const syncThoughtGate = (thinking: boolean) => {
    state.setToastHeld(thinking);
    if (!thinking) pumpCelebQueue();
  };

  const primaryJobId = (): string | null => {
    if (state.activeJobId) return state.activeJobId;
    if (state.hiredJobs.length) return state.hiredJobs[0];
    return null;
  };

  const furnitureWorldPos = (uid: string): { x: number; z: number } | null => {
    const f = state.furniture.find((x) => x.uid === uid);
    if (!f) return null;
    const def = furnitureById[f.defId];
    const w = def?.width ?? 1;
    const h = def?.height ?? 1;
    return {
      x: (f.tx + w / 2) * TILE,
      z: (f.ty + h / 2) * TILE,
    };
  };

  const sitStyleForDef = (defId: string): SitStyle => {
    if (defId === "bed") return "bed";
    if (
      defId === "park_bench" ||
      defId === "floor_cushion" ||
      defId === "picnic_set"
    ) {
      return "bench";
    }
    return "couch";
  };

  /** Offset in the facing direction (down = +Z). */
  const alongFacing = (dir: Dir, dist: number) => {
    switch (dir) {
      case "down":
        return { x: 0, z: dist };
      case "up":
        return { x: 0, z: -dist };
      case "right":
        return { x: dist, z: 0 };
      case "left":
        return { x: -dist, z: 0 };
    }
  };

  const cancelPlayRide = () => {
    if (playRideRaf) {
      cancelAnimationFrame(playRideRaf);
      playRideRaf = 0;
    }
  };

  const endActivityPose = () => {
    cancelPlayRide();
    player.setPoseMotion(null);
    player.setPose("stand");
    player.setWalking(false);
    if (activityRestore) {
      playerX = activityRestore.x;
      playerZ = activityRestore.z;
      playerDir = activityRestore.dir;
      player.setPosition(playerX, playerZ);
      player.setFacing(playerDir);
      activityRestore = null;
    }
  };

  /** Snap onto furniture and strike a sit/lie pose for busy interactions. */
  const beginSeatedUse = (
    furn: PlacedFurniture,
    pose: "sit" | "lie",
  ) => {
    if (occupiedSeatUids().has(furn.uid)) {
      denyOccupiedSeat();
      return;
    }
    const pos = furnitureWorldPos(furn.uid);
    if (!pos) return;
    if (!activityRestore) {
      activityRestore = { x: playerX, z: playerZ, dir: playerDir };
    }
    playerPath = [];
    onArrive = null;
    player.setWalking(false);
    playerX = pos.x;
    playerZ = pos.z;
    playerDir = furn.rot ?? "down";
    player.setPosition(playerX, playerZ);
    player.setFacing(playerDir);
    if (pose === "lie") player.setPose("lie");
    else player.setPose("sit", { sitStyle: sitStyleForDef(furn.defId) });
  };

  /** Mount play equipment and keep the avatar animated while the mini runs. */
  const beginPlayPose = (kind: PlayMiniKind, furn: PlacedFurniture) => {
    const def = furnitureById[furn.defId];
    const w = def?.width ?? 1;
    const h = def?.height ?? 1;
    const cx = (furn.tx + w / 2) * TILE;
    const cz = (furn.ty + h / 2) * TILE;
    if (!activityRestore) {
      activityRestore = { x: playerX, z: playerZ, dir: playerDir };
    }
    playerPath = [];
    onArrive = null;
    player.setWalking(false);
    playerDir = furn.rot ?? "down";
    player.setFacing(playerDir);

    if (kind === "swing") {
      playerX = cx;
      playerZ = cz;
      player.setPosition(playerX, playerZ);
      player.setPose("sit", { sitStyle: "swing" });
      player.setPoseMotion({ swingPhase: 0, swingAmp: 0.35, hopY: 0 });
    } else if (kind === "slide") {
      // Start near the top of the chute (opposite the facing).
      const rot = furn.rot ?? "down";
      if (rot === "down") {
        playerX = cx;
        playerZ = furn.ty * TILE + TILE * 0.45;
      } else if (rot === "up") {
        playerX = cx;
        playerZ = (furn.ty + h) * TILE - TILE * 0.45;
      } else if (rot === "right") {
        playerX = furn.tx * TILE + TILE * 0.45;
        playerZ = cz;
      } else {
        playerX = (furn.tx + w) * TILE - TILE * 0.45;
        playerZ = cz;
      }
      player.setPosition(playerX, playerZ);
      player.setPose("sit", { sitStyle: "slide" });
      // Perch high at the top until the ride starts.
      player.setPoseMotion({ slideT: 0, hopY: 12.5, leanX: -0.06 });
    } else if (kind === "bounce") {
      playerX = cx;
      playerZ = cz;
      player.setPosition(playerX, playerZ);
      player.setPose("stand");
    } else if (kind === "fish") {
      playerX = cx;
      playerZ = cz;
      player.setPosition(playerX, playerZ);
      player.setPose("stand");
      player.playToolSwing("fishing_rod", 24);
    } else {
      // Tune / arcade - stay near the prop with a light bob.
      playerX = cx;
      playerZ = cz;
      player.setPosition(playerX, playerZ);
      player.setPose("stand");
    }
  };

  const syncPlayPose = (furn: PlacedFurniture, tick: PlayMiniTick) => {
    const def = furnitureById[furn.defId];
    const w = def?.width ?? 1;
    const h = def?.height ?? 1;
    const cx = (furn.tx + w / 2) * TILE;
    const cz = (furn.ty + h / 2) * TILE;
    const rot = furn.rot ?? "down";

    if (tick.kind === "swing") {
      // Pendulum along facing: phase -1..1, amp from pump height.
      const amp = Math.max(0.12, tick.height);
      const maxAlong = TILE * (0.42 + amp * 0.95);
      const along = tick.angle * maxAlong;
      // Rise at the extremes like a real hanging seat.
      const lift =
        (1 - Math.cos(tick.angle * (Math.PI * 0.5))) * (2.2 + amp * 5.5);
      const off = alongFacing(rot, along);
      playerX = cx + off.x;
      playerZ = cz + off.z;
      player.setPosition(playerX, playerZ);
      player.setPoseMotion({
        swingPhase: tick.angle,
        swingAmp: amp,
        hopY: lift,
      });
    } else if (tick.kind === "slide") {
      const t = tick.marker;
      const travel = Math.max(TILE * 1.15, (Math.max(w, h) - 0.85) * TILE);
      if (rot === "down") {
        playerX = cx;
        playerZ = furn.ty * TILE + TILE * 0.45 + t * travel;
      } else if (rot === "up") {
        playerX = cx;
        playerZ = (furn.ty + h) * TILE - TILE * 0.45 - t * travel;
      } else if (rot === "right") {
        playerX = furn.tx * TILE + TILE * 0.45 + t * travel;
        playerZ = cz;
      } else {
        playerX = (furn.tx + w) * TILE - TILE * 0.45 - t * travel;
        playerZ = cz;
      }
      player.setPosition(playerX, playerZ);
      // Drop height down the chute; slight ease so the launch feels snappy.
      const drop = 12.5 * (1 - t) * (1 - t * 0.15);
      player.setPoseMotion({
        slideT: t,
        hopY: drop,
        leanX: -0.04 - t * 0.1,
      });
    } else if (tick.kind === "bounce") {
      const hop = Math.abs(Math.sin(((tick.angle + 1) * 0.5) * Math.PI)) * (0.15 + tick.height * 0.55);
      player.setPoseMotion({ hopY: hop });
    } else if (tick.kind === "fish") {
      const bite = Math.abs(tick.marker - 0.7) < 0.12;
      player.setPoseMotion({ leanX: bite ? 0.22 : 0.08 });
    } else if (tick.kind === "tune" || tick.kind === "arcade") {
      player.setPoseMotion({
        swayZ: tick.kind === "tune" ? tick.angle * 0.2 : 0,
        hopY: tick.kind === "arcade" ? Math.sin(tick.marker * Math.PI) * 0.12 : Math.abs(tick.angle) * 0.06,
      });
    }
  };

  /** One-shot slide down after the timing mini resolves (not during the looping meter). */
  const playSlideRideOnce = (
    furn: PlacedFurniture,
    durationMs: number,
    done: () => void,
  ) => {
    cancelPlayRide();
    beginPlayPose("slide", furn);
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / durationMs);
      // Ease-in then settle - acceleration down the chute.
      const eased = u * u * (2.2 - 1.2 * u);
      syncPlayPose(furn, {
        kind: "slide",
        angle: 0,
        height: 1,
        marker: Math.min(1, eased),
      });
      if (u < 1) {
        playRideRaf = requestAnimationFrame(step);
      } else {
        playRideRaf = 0;
        done();
      }
    };
    playRideRaf = requestAnimationFrame(step);
  };

  /** Decaying pendulum arc after the pump mini resolves. */
  const playSwingRideOnce = (
    furn: PlacedFurniture,
    height: number,
    durationMs: number,
    done: () => void,
  ) => {
    cancelPlayRide();
    beginPlayPose("swing", furn);
    const start = performance.now();
    const cycles = 1.65;
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / durationMs);
      // Soft landing: amplitude decays toward rest.
      const decay = (1 - u) * (1 - u * 0.35) + 0.08 * (1 - u);
      const angle = Math.sin(u * Math.PI * 2 * cycles) * decay;
      syncPlayPose(furn, {
        kind: "swing",
        angle,
        height,
        marker: 0,
      });
      if (u < 1) {
        playRideRaf = requestAnimationFrame(step);
      } else {
        playRideRaf = 0;
        player.setPoseMotion({ swingPhase: 0, swingAmp: height * 0.2, hopY: 0 });
        done();
      }
    };
    playRideRaf = requestAnimationFrame(step);
  };

  const pinTaskArrow = (job: JobDef) => {
    const task = job.tasks[state.jobTasksDone];
    if (!task) {
      hintArrow?.hide();
      return;
    }
    const pos = furnitureWorldPos(task.furnitureUid);
    if (pos) hintArrow?.pinAt(pos.x, pos.z, task.label);
  };

  const nightBlocksLeisure = () => isNight(state.dayTime);

  /** Character-status feedback as a thought bubble (not a toast pill). */
  const think = (text: string, ms = 4200) => {
    thoughtBubble?.showText(text, ms);
  };

  /** Multi-beat character thought (auto-advances). */
  const thinkSeq = (lines: string[], msPerBeat = 2800) => {
    thoughtBubble?.showSequence(lines, msPerBeat);
  };

  /** Play a moment banner immediately (caller owns sequencing via celeb queue). */
  const playMomentCelebration = (
    opts: {
      eyebrow: string;
      title: string;
      note?: string;
      badge?: string;
      thumbId?: import("../mesh/inventoryItems").InventoryThumbId;
      furnitureDefId?: string;
      accent?: "gold" | "mint" | "rose";
      confetti?: "soft" | "big" | "huge";
      palette?: "party" | "gold";
      sfx?: "success" | "chime" | "adopt" | "cash";
      durationMs?: number;
      onDone?: () => void;
    },
    done?: () => void,
  ) => {
    Audio.sfx(opts.sfx ?? "success");
    confetti.burst(opts.confetti ?? "big", undefined, opts.palette ?? "party");
    hud?.pulseAvatar();
    momentCelebration.show({
      eyebrow: opts.eyebrow,
      title: opts.title,
      note: opts.note,
      badge: opts.badge,
      thumbId: opts.thumbId,
      furnitureDefId: opts.furnitureDefId,
      accent: opts.accent ?? "gold",
      durationMs: opts.durationMs ?? 3400,
      onDone: () => {
        opts.onDone?.();
        done?.();
      },
    });
  };

  /** Big centered banner + confetti for tools, pets, promotions, and similar milestones. */
  const celebrateKeyItem = (opts: {
    eyebrow: string;
    title: string;
    note?: string;
    badge?: string;
    thumbId?: import("../mesh/inventoryItems").InventoryThumbId;
    furnitureDefId?: string;
    accent?: "gold" | "mint" | "rose";
    confetti?: "soft" | "big" | "huge";
    palette?: "party" | "gold";
    sfx?: "success" | "chime" | "adopt" | "cash";
    durationMs?: number;
    onDone?: () => void;
  }) => {
    enqueueCelebration((done) => playMomentCelebration(opts, done));
  };

  const ownsHomeSofa = () =>
    state.furniture.some((f) => f.defId === "sofa" && f.lotId === "home");

  /** First time the player can afford a Sunny Sofa - nudge them into build mode. */
  const queueSofaAffordCelebration = (opts?: { forceCheck?: boolean }) => {
    const price = furnitureById.sofa?.price ?? 100;
    if (sofaAffordQueued || state.hasStoryFlag("first_sofa_afford")) return;
    if (ownsHomeSofa()) {
      state.setStoryFlag("first_sofa_afford");
      return;
    }
    if (state.money < price) return;

    sofaAffordQueued = true;
    enqueueCelebration((done) => {
      sofaAffordQueued = false;
      // Re-check after earlier celebrations (and any spending) finish.
      if (ownsHomeSofa() || state.money < price) {
        if (ownsHomeSofa()) state.setStoryFlag("first_sofa_afford");
        done();
        return;
      }
      if (!state.setStoryFlag("first_sofa_afford")) {
        done();
        return;
      }
      if (!momentCelebration) {
        done();
        return;
      }
      playMomentCelebration(
        {
          eyebrow: "You can buy it!",
          title: "Sunny Sofa",
          note: `You have $${state.money} · sofa costs $${price} · press B at home`,
          furnitureDefId: "sofa",
          badge: "★",
          accent: "gold",
          confetti: "big",
          palette: "gold",
          sfx: "chime",
          durationMs: 4200,
        },
        done,
      );
    });
    void opts;
  };

  /** True while spoken lines are up or still queued for the dialogue box. */
  const dialoguePending = () =>
    !!dialogue?.isOpen() || state.dialogueQueue.length > 0;

  /** Side-quest hand-in: wait for dialogue to finish, then banner + confetti. */
  const flushSideQuestCelebration = () => {
    const pending = pendingSideQuestCelebration;
    if (!pending || !momentCelebration) return;
    // Thank-you lines are often queued the same tick as quest complete —
    // wait until they've been shown and dismissed before rewarding.
    if (dialoguePending()) return;
    pendingSideQuestCelebration = null;

    const { def, unlockFurniture } = pending;
    const money = def.rewards?.money ?? 0;
    const mats = def.rewards?.materials ?? [];
    const friendId = def.rewards?.friendshipNpcId;
    const friendDelta = def.rewards?.friendshipDelta ?? 0;
    const friend =
      (friendId && NPCS.find((n) => n.id === friendId)) ||
      (friendId ? ambientNpcById[friendId] : undefined);
    const noteBits: string[] = [];
    if (money > 0) noteBits.push(`+$${money}`);
    for (const m of mats) {
      const name = materialById[m.id]?.name ?? m.id;
      noteBits.push(`+${m.count} ${name}`);
    }
    if (friend && friendDelta > 0) {
      noteBits.push(`+${friendDelta} with ${friend.name}`);
    }

    if (friendId) {
      const npc = npcs.find((n) => n.id === friendId);
      npc?.actor.playSmile();
      npc?.actor.playReaction("pop");
    }

    const rewardThumb =
      mats[0] != null
        ? (`mat:${mats[0].id}` as import("../mesh/inventoryItems").InventoryThumbId)
        : undefined;

    celebrateKeyItem({
      eyebrow: "Rewards!",
      title: def.title,
      note: noteBits.length
        ? noteBits.join(" · ")
        : "Thanks for helping out.",
      badge: money > 0 ? "$" : "✓",
      thumbId: rewardThumb,
      accent: "mint",
      confetti: money > 0 || mats.length > 0 ? "huge" : "big",
      palette: "party",
      sfx: money > 0 ? "cash" : "chime",
      durationMs: 4500,
    });

    // Separate unlock moment(s) — available to buy, not "you can afford".
    for (const name of unlockFurniture) {
      const defId = Object.values(furnitureById).find((f) => f.name === name)?.id;
      celebrateKeyItem({
        eyebrow: "Catalog unlock!",
        title: name,
        note: "Now available to buy in build mode",
        furnitureDefId: defId,
        badge: "★",
        accent: "rose",
        confetti: "soft",
        palette: "party",
        sfx: "chime",
        durationMs: 3600,
      });
    }

    // Only after rewards land visually — and only if they can still afford it.
    queueSofaAffordCelebration();
  };

  const queueSideQuestCelebration = (
    def: QuestDef,
    unlockFurniture: string[] = [],
  ) => {
    pendingSideQuestCelebration = { def, unlockFurniture };
    // Poll until thank-you dialogue has opened and closed (or none arrives).
    let tries = 0;
    const tryFlush = () => {
      if (!pendingSideQuestCelebration) return;
      if (dialoguePending()) {
        tries = 0;
        window.setTimeout(tryFlush, 120);
        return;
      }
      // Brief grace so a just-queued line can land in the dialogue box.
      if (tries < 4) {
        tries += 1;
        window.setTimeout(tryFlush, 80);
        return;
      }
      flushSideQuestCelebration();
    };
    window.setTimeout(tryFlush, 80);
  };

  const celebrateToolPurchase = (toolId: import("../data/items").ToolId) => {
    const def = toolById[toolId];
    if (!def) return;
    hud.closeShop();
    celebrateKeyItem({
      eyebrow: "New tool!",
      title: def.name,
      note: def.description,
      thumbId: `tool:${toolId}`,
      badge: "★",
      accent: "mint",
      confetti: "big",
      palette: "party",
      sfx: "success",
      durationMs: 3600,
      onDone: () => {
        if (toolId !== "axe") return;
        if (!state.setStoryFlag("first_axe_buy")) return;
        thoughtBubble?.showText(
          "I got an axe! now I can chop some wood and maybe even collect some fruit!",
          6200,
        );
        Audio.sfx("chime");
        const forest = LOTS.find((l) => l.id === "forest");
        if (forest) {
          hintArrow?.showAt(
            (forest.tx + forest.tw / 2) * TILE,
            (forest.ty + 2) * TILE,
            "Whisperwood",
            8000,
          );
        }
      },
    });
  };

  /** Adjacent walkable tiles the boss can stand on to confront the player. */
  const tilesBesidePlayer = (): GridPos[] => {
    const t = playerTile();
    const blocked = npcStandBlocked();
    const out: GridPos[] = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = t.x + dx;
      const y = t.y + dy;
      if (!inBounds(x, y) || blocked[y][x]) continue;
      out.push({ x, y });
    }
    return out;
  };

  const deliverBossTalk = (npc: NpcRuntime) => {
    const talk = state.pendingBossTalk;
    if (!talk) {
      npc.seekingPlayer = false;
      return;
    }
    const job = jobById[talk.jobId];
    const def = NPCS.find((n) => n.id === npc.id);
    if (!job || !def) {
      state.pendingBossTalk = null;
      npc.seekingPlayer = false;
      return;
    }

    holdNpcStill(npc.id);
    npc.seekingPlayer = false;
    const kind = talk.kind;
    const reason = talk.reason;
    const streak = state.workMissStreak;
    state.pendingBossTalk = null;

    if (kind === "fire") {
      state.fire(job.id);
      Audio.playMusic("world");
      Audio.sfx("deny");
      state.showDialogue(npc.id as NpcId, def.name, workFireLine(job.id));
      think("I… I lost my job.", 4200);
    } else {
      Audio.sfx("talk");
      state.showDialogue(
        npc.id as NpcId,
        def.name,
        workWarningLine(job.id, streak, reason),
      );
      think(
        streak <= 1
          ? "That's a warning… I need to do better."
          : "Final warning. One more miss and I'm out…",
        4200,
      );
    }
  };

  const jobStationWorldPos = (job: JobDef): { x: number; z: number } | null => {
    const station = state.furniture.find(
      (f) => f.lotId === job.lotId && f.defId === job.stationDefId,
    );
    if (station) return furnitureWorldPos(station.uid);
    const firstTask = job.tasks[0];
    return firstTask ? furnitureWorldPos(firstTask.furnitureUid) : null;
  };

  const pinClockInArrow = (job: JobDef) => {
    const pos = jobStationWorldPos(job);
    if (pos) hintArrow?.pinAt(pos.x, pos.z, jobClockInArrowLabel(job.id));
  };

  const storyFlagJobWelcome = (jobId: string) => `job_welcome_${jobId}`;

  const deliverJobWelcome = (npc: NpcRuntime) => {
    const jobId = pendingJobWelcome;
    pendingJobWelcome = null;
    npc.seekingPlayer = false;
    if (!jobId) return;
    const job = jobById[jobId];
    const def = NPCS.find((n) => n.id === npc.id);
    if (!job || !def) return;

    state.setStoryFlag(storyFlagJobWelcome(jobId));
    holdNpcStill(npc.id);
    Audio.sfx("talk");
    state.showDialogue(
      npc.id as NpcId,
      def.name,
      jobFirstDayWelcomeLine(job.id),
    );
    pinClockInArrow(job);
    think(`Clock in at the ${jobClockInArrowLabel(job.id).toLowerCase()}.`, 3600);
  };

  const clearWelcomeSeek = () => {
    if (!pendingJobWelcome) return;
    const job = jobById[pendingJobWelcome];
    const npc = job ? npcs.find((n) => n.id === job.hireNpcId) : null;
    if (npc) npc.seekingPlayer = false;
    pendingJobWelcome = null;
  };

  /**
   * Queue a one-shot first-day welcome when the player steps onto their
   * workplace before their first clock-in for that job.
   */
  const maybeQueueFirstDayWelcome = (job: JobDef) => {
    if (pendingJobWelcome || state.pendingBossTalk) return;
    if (introActive || morningBeatActive || timeMontage?.isPlaying()) return;
    if (uiBusy() || state.isBusy() || state.jobActive) return;
    if (state.hasStoryFlag(storyFlagJobWelcome(job.id))) return;
    // Already worked this job before - treat as veteran (skip welcome forever).
    if ((state.jobShiftCounts[job.id] ?? 0) > 0) {
      state.setStoryFlag(storyFlagJobWelcome(job.id));
      return;
    }
    // Hire day / already worked today - not the open first shift.
    if (state.lastShiftDay === state.dayIndex) return;
    // Too late to start a shift today.
    if (state.dayTime >= WORK_END) return;

    pendingJobWelcome = job.id;
  };

  const finishPatronLeave = (npc: NpcRuntime) => {
    npc.leavingClosing = false;
    npc.leftForDay = true;
    npc.seated = false;
    npc.path = [];
    npc.waitUntil = Number.POSITIVE_INFINITY;
    npc.actor.setWalking(false);
    npc.actor.root.visible = false;
  };

  /** Collision plus tiles occupied by other visible NPCs (avoids exit pile-ups). */
  const closingNpcBlocked = (selfId: string): boolean[][] => {
    const blocked = collision.map((row) => [...row]);
    for (const other of npcs) {
      if (other.id === selfId || other.leftForDay) continue;
      if (!other.actor.root.visible) continue;
      const p = other.actor.getPosition();
      const tx = Math.floor(p.x / TILE);
      const ty = Math.floor(p.z / TILE);
      if (inBounds(tx, ty)) blocked[ty][tx] = true;
      // Reserve the next step of anyone already walking out.
      if (other.leavingClosing && other.path.length > 0) {
        const next = other.path[0]!;
        if (inBounds(next.x, next.y)) blocked[next.y][next.x] = true;
      }
    }
    const pt = playerTile();
    if (inBounds(pt.x, pt.y)) blocked[pt.y][pt.x] = true;
    return blocked;
  };

  /** Walkable tiles just outside / beside the lot door for staggered exits. */
  const closingExitGoals = (lotId: LotId, selfId: string): GridPos[] => {
    const door = lotDoorWorld(lotId);
    if (!door) return [];
    const doorTx = Math.floor(door.x / TILE);
    const doorTy = Math.floor(door.z / TILE);
    const blocked = closingNpcBlocked(selfId);
    const candidates: GridPos[] = [
      { x: doorTx, y: doorTy + 1 },
      { x: doorTx - 1, y: doorTy + 1 },
      { x: doorTx + 1, y: doorTy + 1 },
      { x: doorTx - 2, y: doorTy + 1 },
      { x: doorTx + 2, y: doorTy + 1 },
      { x: doorTx, y: doorTy + 2 },
      { x: doorTx - 1, y: doorTy + 2 },
      { x: doorTx + 1, y: doorTy + 2 },
      { x: doorTx, y: doorTy },
      { x: doorTx - 1, y: doorTy },
      { x: doorTx + 1, y: doorTy },
    ];
    const open = candidates.filter(
      (c) => inBounds(c.x, c.y) && !blocked[c.y][c.x],
    );
    if (open.length > 0) return open;
    const near = nearestWalkable(
      blocked,
      { x: doorTx, y: doorTy + 1 },
      MAP_W,
      MAP_H,
      5,
    );
    return near ? [near] : [];
  };

  const patronsOnLot = (lotId: LotId): NpcRuntime[] =>
    npcs.filter((npc) => {
      if (!npc.ambient || npc.leftForDay) return false;
      const tx = npc.homeTx ?? Math.floor(npc.actor.getPosition().x / TILE);
      const ty = npc.homeTy ?? Math.floor(npc.actor.getPosition().z / TILE);
      return lotAtTile(tx, ty)?.id === lotId;
    });

  /** Stagger stand-ups so patrons don't all rise into the same aisle. */
  const queuePatronsLeave = (lotId: LotId) => {
    const door = lotDoorWorld(lotId);
    const patrons = patronsOnLot(lotId);
    patrons.sort((a, b) => {
      if (!door) return 0;
      const pa = a.actor.getPosition();
      const pb = b.actor.getPosition();
      return (
        Math.hypot(pa.x - door.x, pa.z - door.z) -
        Math.hypot(pb.x - door.x, pb.z - door.z)
      );
    });

    const now = performance.now();
    const STAGGER_MS = 950;
    for (let i = 0; i < patrons.length; i++) {
      const npc = patrons[i]!;
      if (engagedNpcId === npc.id) releaseEngagedNpc();
      npc.leavingClosing = true;
      npc.seekingPlayer = false;
      npc.path = [];
      // Closest to the door leaves first; others wait their turn.
      npc.waitUntil = now + 350 + i * STAGGER_MS;
    }
  };

  const restoreDayPatrons = () => {
    for (const npc of npcs) {
      if (!npc.ambient) continue;
      if (!npc.leftForDay && !npc.leavingClosing) continue;
      const def = ambientNpcById[npc.id];
      if (!def) continue;
      npc.leavingClosing = false;
      npc.leftForDay = false;
      npc.path = [];
      const seated = def.pose === "sit";
      const tile = seated
        ? { x: def.spawnTx, y: def.spawnTy }
        : snapNpcStand(def.spawnTx, def.spawnTy);
      npc.homeTx = tile.x;
      npc.homeTy = tile.y;
      npc.actor.root.visible = true;
      npc.actor.setPosition(tile.x * TILE + TILE / 2, tile.y * TILE + TILE / 2);
      npc.actor.setFacing(def.facing);
      npc.dir = def.facing;
      npc.actor.setWalking(false);
      if (seated) {
        npc.seated = true;
        npc.actor.setPose("sit", { sitStyle: def.sitStyle ?? "couch" });
        npc.waitUntil = Number.POSITIVE_INFINITY;
      } else {
        npc.seated = false;
        npc.actor.setPose("stand");
        npc.waitUntil = performance.now() + 800 + Math.random() * 2800;
      }
    }
  };

  /** Start staggered patron exits for this job's lot (shared by both end paths). */
  const beginShiftClosing = (
    job: JobDef,
    opts: { unfinished: boolean },
  ) => {
    if (shiftClosing) return;

    shiftClosing = {
      jobId: job.id,
      lotId: job.lotId,
      startedAt: performance.now(),
      warnQueued: false,
      unfinished: opts.unfinished,
    };
    queuePatronsLeave(job.lotId);
  };

  const beginUnfinishedShiftClosing = (jobId: string) => {
    const job = jobById[jobId];
    if (!job || shiftClosing) return;

    workMini?.forceClose();
    menu?.close();
    hintArrow?.hide();
    clearWelcomeSeek();
    Audio.playMusic("world");

    state.jobActive = false;
    state.activeJobId = null;
    state.jobTasksDone = 0;
    state.jobQualityScores = [];
    state.shiftLate = false;

    beginShiftClosing(job, { unfinished: true });
    think("Closing time - customers are heading out…", 3800);
  };

  const tickShiftClosingProgress = () => {
    if (!shiftClosing || shiftClosing.warnQueued) return;

    const stillLeaving = npcs.some((n) => n.leavingClosing);
    const elapsed = performance.now() - shiftClosing.startedAt;
    // Short beat even with no patrons; long timeout for stragglers.
    const minWait = 1600;
    const maxWait = 24000;
    if (stillLeaving && elapsed < maxWait) return;
    if (!stillLeaving && elapsed < minWait) return;

    for (const n of npcs) {
      if (n.leavingClosing) finishPatronLeave(n);
    }

    shiftClosing.warnQueued = true;
    const jobId = shiftClosing.jobId;
    const unfinished = shiftClosing.unfinished;
    shiftClosing = null;

    if (!unfinished) return;

    // Late clock-in may already have noted a miss today - don't double-strike.
    if (state.lastWorkMissDay !== state.dayIndex) {
      state.noteWorkMiss(jobId, "unfinished");
      think("Uh-oh… the boss wants a word.", 3600);
    } else if (state.pendingBossTalk) {
      think("Uh-oh… the boss wants a word.", 3600);
    }
  };

  /**
   * Mid-shift when the clock hits 5: patrons leave (staggered), then boss warning.
   */
  const tickUnfinishedShiftClosing = () => {
    if (prevDayTimeForClosing < 0) {
      prevDayTimeForClosing = state.dayTime;
      // Save/load still on shift after hours - start closing immediately.
      if (
        state.jobActive &&
        state.activeJobId &&
        state.dayTime >= WORK_END &&
        !timeMontage?.isPlaying()
      ) {
        beginUnfinishedShiftClosing(state.activeJobId);
      }
    } else {
      const prev = prevDayTimeForClosing;
      const nowT = state.dayTime;
      prevDayTimeForClosing = nowT;

      if (
        !shiftClosing &&
        state.jobActive &&
        state.activeJobId &&
        !timeMontage?.isPlaying() &&
        prev < WORK_END &&
        nowT >= WORK_END
      ) {
        beginUnfinishedShiftClosing(state.activeJobId);
      }
    }

    if (shiftClosing) tickShiftClosingProgress();
  };

  /** Walk a seeking NPC (boss write-up or first-day welcome) up to the player. */
  const tickBossApproach = () => {
    // Patrons clear out at closing before any write-up.
    if (shiftClosing) return;
    if (uiBusy() || state.mode !== "live") return;
    if (state.isBusy()) return;

    // Write-ups take priority over the friendly welcome.
    const talk = state.pendingBossTalk;
    if (talk) {
      clearWelcomeSeek();
      const job = jobById[talk.jobId];
      if (!job) {
        state.pendingBossTalk = null;
        return;
      }
      const npc = npcs.find((n) => n.id === job.hireNpcId);
      if (!npc || npc.ambient) return;

      if (!npc.seekingPlayer) {
        npc.seekingPlayer = true;
        npc.waitUntil = 0;
        npc.path = [];
      }

      const p = npc.actor.getPosition();
      const dist = Math.hypot(p.x - playerX, p.z - playerZ);
      if (dist <= TILE * 1.55) {
        deliverBossTalk(npc);
        return;
      }

      const goals = tilesBesidePlayer();
      if (goals.length === 0) return;

      if (npc.path.length > 0) {
        const dest = npc.path[npc.path.length - 1];
        const pt = playerTile();
        const destDist = Math.abs(dest.x - pt.x) + Math.abs(dest.y - pt.y);
        if (destDist <= 2) return;
      }

      const start = {
        x: Math.floor(p.x / TILE),
        y: Math.floor(p.z / TILE),
      };
      const path = findPathToAny(collision, start, goals, MAP_W, MAP_H);
      if (path.length === 0) {
        const near =
          nearestWalkable(npcStandBlocked(), goals[0], MAP_W, MAP_H, 4) ??
          goals[0];
        npc.actor.setPosition(near.x * TILE + TILE / 2, near.y * TILE + TILE / 2);
        deliverBossTalk(npc);
        return;
      }
      npc.path = path.slice(1);
      if (npc.path.length === 0) deliverBossTalk(npc);
      return;
    }

    const welcomeId = pendingJobWelcome;
    if (!welcomeId) return;
    const job = jobById[welcomeId];
    if (!job) {
      pendingJobWelcome = null;
      return;
    }
    // Left the workplace or no longer eligible - drop the scripted approach.
    if (
      playerLotId() !== job.lotId ||
      state.hasStoryFlag(storyFlagJobWelcome(job.id)) ||
      state.lastShiftDay === state.dayIndex ||
      state.jobActive
    ) {
      clearWelcomeSeek();
      return;
    }

    const npc = npcs.find((n) => n.id === job.hireNpcId);
    if (!npc || npc.ambient) {
      // Boss missing - still pin the station so the player isn't stranded.
      state.setStoryFlag(storyFlagJobWelcome(job.id));
      pendingJobWelcome = null;
      pinClockInArrow(job);
      think(jobFirstDayWelcomeLine(job.id), 4200);
      return;
    }

    if (!npc.seekingPlayer) {
      npc.seekingPlayer = true;
      npc.waitUntil = 0;
      npc.path = [];
    }

    const p = npc.actor.getPosition();
    const dist = Math.hypot(p.x - playerX, p.z - playerZ);
    if (dist <= TILE * 1.55) {
      deliverJobWelcome(npc);
      return;
    }

    const goals = tilesBesidePlayer();
    if (goals.length === 0) return;

    if (npc.path.length > 0) {
      const dest = npc.path[npc.path.length - 1];
      const pt = playerTile();
      const destDist = Math.abs(dest.x - pt.x) + Math.abs(dest.y - pt.y);
      if (destDist <= 2) return;
    }

    const start = {
      x: Math.floor(p.x / TILE),
      y: Math.floor(p.z / TILE),
    };
    const path = findPathToAny(collision, start, goals, MAP_W, MAP_H);
    if (path.length === 0) {
      const near =
        nearestWalkable(npcStandBlocked(), goals[0], MAP_W, MAP_H, 4) ??
        goals[0];
      npc.actor.setPosition(near.x * TILE + TILE / 2, near.y * TILE + TILE / 2);
      deliverJobWelcome(npc);
      return;
    }
    npc.path = path.slice(1);
    if (npc.path.length === 0) deliverJobWelcome(npc);
  };

  /**
   * End-of-day attendance: hired but no completed shift today counts as a no-show
   * (hire-day lock sets lastShiftDay to today, so it correctly skips).
   */
  const noteEndOfDayWorkAttendance = () => {
    if (state.hiredJobs.length === 0) return;
    if (state.lastWorkMissDay === state.dayIndex) return;
    if (state.lastShiftDay === state.dayIndex) return;
    const jobId = primaryJobId() ?? state.hiredJobs[0];
    if (!jobId) return;
    state.noteWorkMiss(jobId, "no_show");
  };

  const fireHint = (
    id: string,
    thought: string,
    arrow?: { x: number; z: number; label: string },
  ) => {
    if (firedHints.has(id) || uiBusy()) return false;
    firedHints.add(id);
    think(thought);
    if (arrow) hintArrow?.showAt(arrow.x, arrow.z, arrow.label);
    Audio.sfx("chime");
    return true;
  };

  const tickGuidanceHints = () => {
    if (introActive || morningBeatActive || timeMontage?.isPlaying()) return;
    const tx = Math.floor(playerX / TILE);
    const ty = Math.floor(playerZ / TILE);
    const lot = playerLotId();
    if (lot === "pier") quests.emit("visited_pier");
    if (lot === "forest" && !state.visitedGatherLots.forest) {
      state.visitedGatherLots.forest = true;
      thinkSeq(
        [
          "Whisperwood… lots of timber and fruit trees out here.",
          "I'll need an axe if I want to chop anything.",
        ],
        3000,
      );
    }
    if (lot === "mine" && !state.visitedGatherLots.mine) {
      state.visitedGatherLots.mine = true;
      thinkSeq(
        [
          "Rocky Quarries… stone and ore everywhere.",
          "A pickaxe would earn its keep here.",
        ],
        3000,
      );
    }
    const ground = map.ground[ty]?.[tx];
    const onPathOutsideHome =
      lot !== "home" &&
      (ground === Tile.path ||
        ground === Tile.parkPath ||
        ground === Tile.pierDeck ||
        ground === Tile.dirt);
    const atCafe = lot === "cafe";
    const hiredJobHere =
      state.hiredJobs
        .map((id) => jobById[id])
        .find((j) => j && j.lotId === lot) ?? null;

    if (!guidanceReady) {
      wasAtCafe = atCafe;
      guidanceReady = true;
    }

    if (
      onPathOutsideHome &&
      !state.isHired("cafe_barista") &&
      (quests.isActive("get_a_job") || quests.isCompleted("empty_nest"))
    ) {
      const t = buildingHintTarget("cafe");
      fireHint(
        "leave_home_cafe",
        "Hmm… I think the café was looking for workers.",
        { x: t.x, z: t.z, label: "Café" },
      );
    }

    if (!wasAtCafe && atCafe && !state.isHired("cafe_barista")) {
      hintArrow?.hide();
      fireHint(
        "arrive_cafe_ask_jun",
        "There's Jun - ask about that Help Wanted sign!",
      );
    }

    // First eligible shift day: boss walks up and points at the clock-in station.
    if (hiredJobHere) maybeQueueFirstDayWelcome(hiredJobHere);

    const jobId = primaryJobId();
    const job = jobId ? jobById[jobId] : null;

    // Morning commute 8-8:30
    if (
      job &&
      state.lastShiftDay !== state.dayIndex &&
      !state.jobActive &&
      state.dayTime >= MORNING_TIME &&
      state.dayTime < WORK_OPEN &&
      lot !== job.lotId
    ) {
      const t = buildingHintTarget(job.lotId);
      fireHint(
        `commute_${state.dayIndex}_${job.id}`,
        `I got to get to my new job at the ${lotNameForJob(job.id)} by 9, otherwise I'll be late!`,
        { x: t.x, z: t.z, label: "Work" },
      );
      if (state.needs.hunger < 40) {
        fireHint(
          `morning_hunger_${state.dayIndex}`,
          "Maybe a quick snack before work…",
        );
      } else if (state.needs.energy < 45) {
        fireHint(
          `morning_energy_${state.dayIndex}`,
          "Still a bit sleepy - coffee would help.",
        );
      }
    }

    // Work hours / late nudge (doors open 8:30)
    if (
      job &&
      state.lastShiftDay !== state.dayIndex &&
      !state.jobActive &&
      state.dayTime >= WORK_OPEN &&
      state.dayTime < WORK_END &&
      lot !== job.lotId
    ) {
      const t = buildingHintTarget(job.lotId);
      const late = state.dayTime >= WORK_LATE;
      const early = state.dayTime < WORK_START;
      fireHint(
        `shift_time_${state.dayIndex}_${job.id}`,
        late
          ? `I'm late for the ${lotNameForJob(job.id)} - hurry!`
          : early
            ? `Doors are open at the ${lotNameForJob(job.id)} - I can clock in early!`
            : `Shift hours! Better head to the ${lotNameForJob(job.id)}.`,
        { x: t.x, z: t.z, label: "Work" },
      );
    }

    // Soft evening after shift
    if (
      state.lastShiftDay === state.dayIndex &&
      !state.jobActive &&
      state.dayTime >= WORK_END &&
      state.dayTime < NIGHT_START &&
      lot !== "home"
    ) {
      const t = buildingHintTarget("home");
      fireHint(
        `evening_home_${state.dayIndex}`,
        "Long day - head home when you're ready.",
        { x: t.x, z: t.z, label: "Home" },
      );
    }

    // Hard night bedtime
    if (nightBlocksLeisure() && lot !== "home") {
      const now = performance.now();
      if (now - nightNudgeAt > 9000) {
        nightNudgeAt = now;
        const t = buildingHintTarget("home");
        thoughtBubble?.showText(
          "It's late - go home to bed and sleep until morning.",
          9000,
          {
            label: "Take me home",
            onClick: () => {
              thoughtBubble?.hide();
              hintArrow?.hide();
              placePlayerAtHomeBed();
              Audio.sfx("zoom_in");
              nightNudgeAt = performance.now();
            },
          },
        );
        hintArrow?.showAt(t.x, t.z, "Bed", 6000);
        Audio.sfx("chime");
      }
    } else if (nightBlocksLeisure() && lot === "home") {
      const now = performance.now();
      if (now - nightNudgeAt > 12000) {
        nightNudgeAt = now;
        const bed = state.furniture.find(
          (f) => f.lotId === "home" && f.defId === "bed",
        );
        const pos = bed ? furnitureWorldPos(bed.uid) : null;
        think("Time for bed - sleep until morning.");
        if (pos) hintArrow?.showAt(pos.x, pos.z, "Sleep", 6000);
      }
    }

    wasAtCafe = atCafe;
  };

  const startMorningCommuteBeat = (opts?: { softAudio?: boolean }) => {
    const jobId = primaryJobId();
    if (!jobId) return;
    const job = jobById[jobId];
    if (!job) return;
    if (state.lastShiftDay === state.dayIndex) return;
    morningBeatActive = true;
    const line = `I got to get to my new job at the ${lotNameForJob(job.id)} by 9, otherwise I'll be late!`;
    thoughtBubble.showText(line, 5200);
    const t = buildingHintTarget(job.lotId);
    hintArrow.showAt(t.x, t.z, "Work", 7000);
    if (!opts?.softAudio) Audio.sfx("chime");
    window.setTimeout(() => {
      morningBeatActive = false;
    }, 2800);
  };

  const placePlayerAtHomeBed = () => {
    const home = LOTS.find((l) => l.id === "home")!;
    const bedTx = home.tx + 2;
    const bedTy = home.ty + 1;
    const land =
      nearestWalkable(
        collision,
        { x: bedTx + 1, y: bedTy + 3 },
        MAP_W,
        MAP_H,
        6,
      ) ?? { x: bedTx + 1, y: bedTy + 3 };
    playerPath = [];
    onArrive = null;
    playerX = land.x * TILE + TILE / 2;
    playerZ = land.y * TILE + TILE / 2;
    player.setPosition(playerX, playerZ);
    player.setFacing("down");
    player.setPose("stand");
    player.setWalking(false);
  };

  const clearDayScopedHints = () => {
    for (const id of [...firedHints]) {
      if (
        id.startsWith("commute_") ||
        id.startsWith("shift_time_") ||
        id.startsWith("evening_home_") ||
        id.startsWith("morning_")
      ) {
        firedHints.delete(id);
      }
    }
  };

  /** Full night→morning montage (bed sleep or post-hire tuck-in). */
  const runSleepToMorning = (opts?: {
    caption?: string;
    alarm?: boolean;
  }) => {
    if (timeMontage?.isPlaying()) return;
    menu?.close();
    releaseEngagedNpc();
    const from = state.dayTime;
    const bonus = sleepEnergyBonus(state.playerTraits, state.dayTime);
    timeMontage.play({
      from,
      to: MORNING_TIME,
      wrap: true,
      durationMs: 2600,
      caption: opts?.caption ?? "Zzz…",
      theme: "night",
      onTick: (t) => {
        state.dayTime = t;
        app.renderer.setDayTime(t);
      },
      onDone: () => {
        noteEndOfDayWorkAttendance();
        const summary = finishSleepNight(state, 45, bonus);
        placePlayerAtHomeBed();
        ensureWeather(state);
        app.renderer.setWeather(state.weather);
        app.renderer.setDayTime(state.dayTime);
        if (opts?.alarm) Audio.sfx("alarm");
        else Audio.sfx("success");
        state.showToast(summary, 3600);
        window.setTimeout(() => {
          state.showToast(weatherToast(state.weather), 2800);
          const line = weatherThought(state.weather);
          if (line) think(line, 3600);
        }, 2200);
        // Keep alarm wakes clear for the commute thought (no trait dialogue pile-up).
        if (bonus > 0 && !opts?.alarm) {
          state.showDialogue(
            "player",
            state.playerName,
            hasTrait(state.playerTraits, "Night Owl")
              ? "Night Owl sleep - peak restoration."
              : "Early Bird rest - bright-eyed!",
          );
        }
        aspirations.refresh();
        townBoard.refreshIfNeeded();
        clearDayScopedHints();
        restoreDayPatrons();
        shiftClosing = null;
        prevDayTimeForClosing = state.dayTime;
        if (primaryJobId()) {
          startMorningCommuteBeat({ softAudio: !!opts?.alarm });
        }
      },
    });
  };

  /** Scrub dayTime in-world (sky/sun visible) - no TimeMontage overlay. */
  const startInWorldTimeScrub = (
    to: number,
    durationMs: number,
    busyLabel: string,
    onDone: () => void,
  ) => {
    const from = state.dayTime;
    const target = Math.max(from, to);
    timeScrub = {
      from,
      to: target,
      elapsed: 0,
      durationMs,
      onDone,
    };
    state.startBusy(busyLabel, durationMs);
  };

  const tickTimeScrub = (dt: number) => {
    if (!timeScrub) return;
    timeScrub.elapsed += dt * 1000;
    const u = Math.min(1, timeScrub.elapsed / timeScrub.durationMs);
    state.dayTime = timeScrub.from + (timeScrub.to - timeScrub.from) * u;
    if (u >= 1) {
      state.dayTime = timeScrub.to;
      const done = timeScrub.onDone;
      timeScrub = null;
      done();
    }
  };

  /** Tuesday Pier Sunset: watch dusk scrub, then Fun to full. */
  const joinPierSunset = (beat: WeeklyBeat) => {
    if (isNight(state.dayTime) || state.dayTime >= SUNSET_GONE) {
      Audio.sfx("deny");
      thinkSeq(["Glow's gone…", "Try next Tuesday."]);
      return;
    }
    Audio.sfx("interact");
    const from = state.dayTime;
    let to = SUNSET_DEEP;
    let durationMs = 4500;
    if (from >= SUNSET_GOLDEN && from < SUNSET_DEEP) {
      durationMs = 2200;
    } else if (from >= SUNSET_DEEP) {
      to = Math.min(SUNSET_GONE - 0.01, from + 0.01);
      durationMs = 1800;
    }
    startInWorldTimeScrub(to, durationMs, beat.title, () => {
      state.weeklyBeatDay = state.dayIndex;
      state.needs = applyNeedDeltas(state.needs, { social: beat.social });
      state.needs = { ...state.needs, fun: 100 };
      Audio.sfx("success");
      think("Pier sunset - full glow. Perfect.", 3600);
      aspirations.noteWeeklyBeat();
    });
  };

  const noteFriendshipGain = (
    npcId: string,
    result: {
      becameFriend: boolean;
      becameClose: boolean;
      becameBestie?: boolean;
    },
    defName: string,
  ) => {
    if (result.becameFriend) {
      state.dailyStats.friendsMade += 1;
      Audio.sfx("success");
      hud?.pulseAvatar();
      state.showDialogue(
        npcId as NpcId,
        defName,
        friendUnlockLine(npcId as ChatNpcId),
      );
    } else if (result.becameClose) {
      Audio.sfx("success");
      hud?.pulseAvatar();
      state.showDialogue(
        npcId as NpcId,
        defName,
        closeFriendUnlockLine(npcId as ChatNpcId),
      );
    } else if (result.becameBestie) {
      celebrateKeyItem({
        eyebrow: "Best friends!",
        title: defName,
        note: "A forever-friendship kind of day.",
        badge: "♥",
        accent: "rose",
        confetti: "huge",
        palette: "party",
        sfx: "success",
        durationMs: 3600,
        onDone: () => {
          state.showDialogue(
            npcId as NpcId,
            defName,
            bestieUnlockLine(npcId as ChatNpcId),
          );
        },
      });
    }
    aspirations.refresh();
    // Relationship already updated - toast only when we just hit the unlock threshold.
    if (result.becameClose) {
      let closeCount = 0;
      for (const rel of Object.values(state.relationships)) {
        if (rel.score >= RELATIONSHIP_CLOSE) closeCount += 1;
      }
      if (closeCount === 2) {
        const after = completedUnlockTaskIds(state);
        const before = new Set(after);
        before.delete("close_friends_2");
        toastNewUnlocks(state, before);
      }
    }
  };

  /**
   * Doorways are a single tile wide, so free movement needs a nudge toward the
   * gap's centre - otherwise the player silently jams on the frame.
   */
  const slideIntoGap = (vx: number, vz: number, step: number) => {
    if (vz !== 0 && vx === 0) {
      const ty = Math.floor((playerZ + Math.sign(vz) * TILE * 0.75) / TILE);
      const tx = Math.floor(playerX / TILE);
      if (!inBounds(tx, ty) || collision[ty][tx]) return;
      const centre = tx * TILE + TILE / 2;
      const delta = Math.max(-step, Math.min(step, centre - playerX));
      if (canStand(playerX + delta, playerZ)) playerX += delta;
    } else if (vx !== 0 && vz === 0) {
      const tx = Math.floor((playerX + Math.sign(vx) * TILE * 0.75) / TILE);
      const ty = Math.floor(playerZ / TILE);
      if (!inBounds(tx, ty) || collision[ty][tx]) return;
      const centre = ty * TILE + TILE / 2;
      const delta = Math.max(-step, Math.min(step, centre - playerZ));
      if (canStand(playerX, playerZ + delta)) playerZ += delta;
    }
  };

  const commandMove = (tx: number, ty: number) => {
    const goal = nearestWalkable(collision, { x: tx, y: ty }, MAP_W, MAP_H, 3);
    if (!goal) {
      Audio.sfx("deny");
      think("Can't walk there…");
      return;
    }
    const path = findPathToAny(collision, playerTile(), [goal], MAP_W, MAP_H);
    if (path.length === 0) {
      Audio.sfx("deny");
      think("No path that way…");
      return;
    }
    Audio.sfx("walk");
    setPath(path.slice(1), null);
    app.renderer.showMoveMarker(goal.x, goal.y);
  };

  const openTargetMenu = (target: Target) => {
    const rect = app.canvas.getBoundingClientRect();
    const screen = app.renderer.projectToScreen(target.x, 24, target.z, {
      width: rect.width,
      height: rect.height,
      left: 0,
      top: 0,
      x: 0,
      y: 0,
      bottom: rect.height,
      right: rect.width,
      toJSON() {
        return {};
      },
    } as DOMRect);

    if (target.kind === "npc") {
      if (isAmbientNpcId(target.id)) {
        openAmbientMenu(target, screen.x, screen.y);
        return;
      }
      openNpcMenu(target, screen.x, screen.y);
      return;
    }
    if (target.kind === "pet") {
      openPetMenu(screen.x, screen.y);
      return;
    }
    if (target.kind === "sign") {
      openSignMenu(target, screen.x, screen.y);
      return;
    }
    if (target.kind === "harvest") {
      beginHarvest(target);
      return;
    }
    if (target.kind === "forage") {
      beginForagePick(target);
      return;
    }
    if (target.kind === "porch") {
      beginPorchPickup(target);
      return;
    }
    if (target.kind === "quest_item") {
      beginQuestItemPickup(target);
      return;
    }
    const furn = state.furniture.find((f) => f.uid === target.id);
    if (furn) openFurnitureMenu(furn, screen.x, screen.y);
  };

  const beginQuestItemPickup = (target: Target) => {
    const id = target.id as QuestGroundItemId;
    if (id === "gordon_shoe") {
      if (
        !quests.isActive("nibs_shoe") ||
        quests.currentStepId("nibs_shoe") !== "find"
      ) {
        return;
      }
      Audio.sfx("interact");
      state.startBusy("Picking up Gordon", 700);
      delayed(700, () => {
        state.setStoryFlag(questItemClearedFlag("gordon_shoe"));
        syncQuestItemVisuals();
        Audio.sfx("chime");
        confetti.burst("soft");
        quests.emit("found_gordon_shoe");
        think("Found Gordon! Better take him back to Nibs.", 3600);
        player.playReaction("jump");
      });
      return;
    }

    const parkSpot = PARK_LITTER_SPOTS.find((s) => s.id === id);
    if (parkSpot) {
      if (
        !quests.isActive("pip_pond") ||
        quests.currentStepId("pip_pond") !== "clean" ||
        state.hasStoryFlag(questItemClearedFlag(parkSpot.id))
      ) {
        return;
      }
      Audio.sfx("interact");
      state.startBusy("Bagging litter", 900);
      delayed(900, () => {
        state.setStoryFlag(questItemClearedFlag(parkSpot.id));
        syncQuestItemVisuals();
        Audio.sfx("chime");
        quests.emit("park_cleanup");
        const have = quests.stepProgress("pip_pond", "clean");
        if (have >= 2) {
          think("Park looks great - Pip will be pleased!", 3600);
        } else {
          think(`Litter bagged (${have}/2). One more spot!`, 3200);
          pointToNearestLitter(PARK_LITTER_SPOTS, "Litter");
        }
      });
      return;
    }

    const pierSpot = PIER_LITTER_SPOTS.find((s) => s.id === id);
    if (pierSpot) {
      if (
        !quests.isActive("pip_pier") ||
        quests.currentStepId("pip_pier") !== "clean" ||
        state.hasStoryFlag(questItemClearedFlag(pierSpot.id))
      ) {
        return;
      }
      Audio.sfx("interact");
      state.startBusy("Bagging pier litter", 900);
      delayed(900, () => {
        state.setStoryFlag(questItemClearedFlag(pierSpot.id));
        syncQuestItemVisuals();
        Audio.sfx("chime");
        quests.emit("pier_cleanup");
        const have = quests.stepProgress("pip_pier", "clean");
        if (have >= 2) {
          think("Pier's tidy - Pip will be thrilled!", 3600);
        } else {
          think(`Pier litter bagged (${have}/2). One more!`, 3200);
          pointToNearestLitter(PIER_LITTER_SPOTS, "Litter");
        }
      });
    }
  };

  const pointToReed = () => {
    const t = lotDoorWorld("workshop");
    if (t) hintArrow?.showAt(t.x, t.z, "Reed", 8000);
  };

  const reedDirectionLine = (speakerId: string): string => {
    const lines = [
      "Reed? Workshop on the far east lane - past Vera's market. Follow the path east and look for sawdust.",
      "Tool guy is Reed. East side of town, past the market - Reed's Workshop. He sells axes and such.",
      "Head east along the main lanes. Reed's Workshop is out past the market. Can't miss the wood stacks.",
    ];
    let h = 0;
    for (let i = 0; i < speakerId.length; i++) h = (h + speakerId.charCodeAt(i) * (i + 1)) | 0;
    return lines[Math.abs(h) % lines.length]!;
  };

  const beginHarvest = (target: Target) => {
    const node = state.harvestNodes.find((n) => n.uid === target.id);
    if (!node || state.isHarvestDepleted(node.uid)) return;
    const def = harvestNodeById[node.defId];
    if (!def) return;
    const toolId = def.toolId as ToolId;
    if (!state.hasTool(toolId)) {
      const tool = toolById[toolId];
      Audio.sfx("deny");
      if (tool) {
        const article = /^[aeiou]/i.test(tool.name) ? "an" : "a";
        thinkSeq([
          `I need ${article} ${tool.name.toLowerCase()} for that…`,
          "Reed sells tools - east past the market.",
        ]);
      } else {
        think("I need the right tool for that…");
      }
      pointToReed();
      return;
    }
    Audio.sfx("interact");
    const duration = harvestFootprint(node.defId) >= 2 ? 2600 : 1800;
    // Face the node and swing the matching tool while it shrinks.
    {
      const fp = harvestFootprint(node.defId);
      const cx = (node.tx + fp / 2) * TILE;
      const cz = (node.ty + fp / 2) * TILE;
      const dx = cx - playerX;
      const dz = cz - playerZ;
      if (Math.abs(dx) > Math.abs(dz)) playerDir = dx > 0 ? "right" : "left";
      else playerDir = dz > 0 ? "down" : "up";
      player.setFacing(playerDir);
      player.setWalking(false);
    }
    const swingTool =
      toolId === "axe" || toolId === "pickaxe" || toolId === "shovel"
        ? toolId
        : "axe";
    player.playToolSwing(swingTool, duration / 1000);
    harvestAnim = {
      uid: node.uid,
      startMs: performance.now(),
      durationMs: duration,
      isTree: def.kind === "tree",
    };
    state.startBusy(def.verb, duration);
    delayed(duration, () => {
      harvestAnim = null;
      if (state.isHarvestDepleted(node.uid)) return;
      const yields = rollHarvestYields(def).filter((y) => {
        // Already knocked fruit loose today - chopping is timber only.
        if (!state.isHarvestShaken(node.uid)) return true;
        return y.itemId === "wood";
      });
      const parts: string[] = [];
      const remaining = new Map<MaterialId, number>();
      for (const y of yields) {
        const mat = materialById[y.itemId];
        parts.push(`+${y.count} ${mat?.name ?? y.itemId}`);
        remaining.set(y.itemId, (remaining.get(y.itemId) ?? 0) + y.count);
      }
      state.depleteHarvest(node.uid);
      // Clear shake so a respawned tree shows fruit again.
      delete state.harvestShaken[node.uid];
      state.needs = applyNeedDeltas(state.needs, { energy: -4 });
      rebuildCollision();
      syncHarvestVisuals();
      Audio.sfx("success");
      if (yields.some((y) => y.itemId === "wood")) {
        quests.emit("gathered_wood");
      }

      const fp = harvestFootprint(node.defId);
      const cx = (node.tx + fp / 2) * TILE;
      const cz = (node.ty + fp / 2) * TILE;
      const originY = def.kind === "tree" ? 36 : 14;

      const finishLoot = () => {
        for (const [itemId, count] of remaining) {
          if (count > 0) state.addMaterial(itemId, count);
        }
        remaining.clear();
        player.playReaction("jump");
        Audio.sfx("chime");
        confetti.burst(def.kind === "tree" ? "big" : "soft");
        state.showToast(
          parts.length ? parts.join(" · ") : "Nothing this time.",
          2800,
        );
      };

      if (!lootBurst || !yields.length) {
        finishLoot();
        return;
      }

      confetti.burst("soft");
      lootBurst.spawn(cx, originY, cz, yields, {
        onPieceCollect: (itemId) => {
          const left = remaining.get(itemId) ?? 0;
          if (left <= 0) return;
          remaining.set(itemId, left - 1);
          state.addMaterial(itemId, 1);
          Audio.sfx("coin");
        },
        onComplete: finishLoot,
      });
    });
  };

  const beginForagePick = (target: Target) => {
    const [txS, tyS] = target.id.split(",");
    const tx = Number(txS);
    const ty = Number(tyS);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    if (state.isForageDepleted(tx, ty)) return;
    const itemId: ForageItemId =
      target.forageItemId ??
      app.renderer.getForageHandles().find((h) => h.tx === tx && h.ty === ty)
        ?.itemId ??
      "flower";
    const def = forageById[itemId];
    Audio.sfx("interact");
    const cx = tx * TILE + TILE / 2;
    const cz = ty * TILE + TILE / 2;
    const dx = cx - playerX;
    const dz = cz - playerZ;
    if (Math.abs(dx) > Math.abs(dz)) playerDir = dx > 0 ? "right" : "left";
    else playerDir = dz > 0 ? "down" : "up";
    player.setFacing(playerDir);
    player.setWalking(false);
    player.setPoseMotion({ leanX: 0.42, hopY: -0.06 });
    const duration = 900;
    const busyLabel = def?.verb === "Scoop" ? "Scooping" : "Picking";
    state.startBusy(busyLabel, duration);
    delayed(duration, () => {
      player.setPoseMotion(null);
      if (state.isForageDepleted(tx, ty)) return;
      const count = rollForageYield(itemId);
      state.depleteForage(tx, ty);
      syncForageVisuals();
      Audio.sfx("success");
      if (itemId === "flower") quests.emit("picked_flowers");
      const yields = [{ itemId: itemId as MaterialId, count }];
      const remaining = { n: count };
      const matName = materialById[itemId]?.name ?? def?.label ?? itemId;
      const finish = () => {
        if (remaining.n > 0) state.addMaterial(itemId, remaining.n);
        remaining.n = 0;
        player.playReaction("jump");
        Audio.sfx("chime");
        confetti.burst("soft");
        const toastMsg = `+${count} ${matName}${count > 1 && !matName.endsWith("s") ? "s" : ""}`;
        if (state.setStoryFlag("first_flower_pick") && itemId === "flower") {
          thoughtBubble?.showText(
            "Maybe I can give these to someone so I can make friends!",
            5600,
          );
          Audio.sfx("chime");
          state.showToast(toastMsg, 2200);
        } else if (state.setStoryFlag("first_forage_find") && itemId !== "flower") {
          thoughtBubble?.showText(
            "Neat find! Shells by the pier, mushrooms in Whisperwood, feathers in the park…",
            5600,
          );
          Audio.sfx("chime");
          state.showToast(toastMsg, 2200);
        } else {
          state.showToast(toastMsg, 2200);
        }
      };
      if (!lootBurst) {
        finish();
        return;
      }
      lootBurst.spawn(cx, 10, cz, yields, {
        onPieceCollect: () => {
          if (remaining.n <= 0) return;
          remaining.n -= 1;
          state.addMaterial(itemId, 1);
          Audio.sfx("coin");
        },
        onComplete: finish,
      });
    });
  };

  const beginPorchPickup = (target: Target) => {
    const drop = state.porchDrops.find((d) => d.uid === target.id);
    if (!drop) return;
    Audio.sfx("interact");
    state.startBusy("Collecting", 600);
    delayed(600, () => {
      const taken = state.takePorchDrop(target.id);
      if (!taken) return;
      syncPorchVisuals();
      const itemId = taken.itemId as MaterialId;
      const count = taken.count;
      const remaining = { n: count };
      const finish = () => {
        if (remaining.n > 0) state.addMaterial(itemId, remaining.n);
        remaining.n = 0;
        Audio.sfx("chime");
        confetti.burst("soft");
        const mat = materialById[itemId];
        state.showToast(
          `+${count} ${mat?.name ?? itemId}`,
          2200,
        );
      };
      if (!lootBurst) {
        finish();
        return;
      }
      lootBurst.spawn(taken.x, 8, taken.z, [{ itemId, count }], {
        onPieceCollect: () => {
          if (remaining.n <= 0) return;
          remaining.n -= 1;
          state.addMaterial(itemId, 1);
          Audio.sfx("coin");
        },
        onComplete: finish,
      });
    });
  };

  const openSignMenu = (target: Target, x: number, y: number) => {
    const def = signById[target.id];
    if (!def) return;
    menu.show(
      def.name,
      "Town sign",
      [{ id: "read", label: "Read the sign", sub: "See what this place is" }],
      x,
      y,
      () => {
        Audio.sfx("interact");
        state.startBusy("Reading", 700);
        delayed(700, () => {
          Audio.sfx("chime");
          state.showDialogue("player", state.playerName, def.blurb);
        });
      },
      { id: "player", look: state.playerLook },
    );
  };

  const describeDeltas = (deltas: Partial<Record<string, number>>): string => {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(deltas)) {
      if (!v) continue;
      parts.push(`${v > 0 ? "+" : ""}${v} ${k}`);
    }
    return parts.slice(0, 3).join("  ");
  };

  const delayed = (ms: number, fn: () => void) => {
    window.setTimeout(fn, ms);
  };

  const openFurnitureMenu = (furn: PlacedFurniture, x: number, y: number) => {
    const def = furnitureById[furn.defId];
    if (!def) return;

    if (occupiedSeatUids().has(furn.uid)) {
      denyOccupiedSeat();
      return;
    }

    // Library returns side-quest: shelve at the desk between shifts
    if (
      furn.defId === "library_desk" &&
      quests.isActive("theo_returns") &&
      quests.currentStepId("theo_returns") === "shelve"
    ) {
      menu.show(
        "Return cart",
        "Books waiting to be shelved",
        [
          { id: "shelve", label: "Shelve returns", sub: "Help Theo" },
          { id: "work", label: "Work a shift instead", sub: "Library Aide" },
        ],
        x,
        y,
        (id) => {
          if (id === "work") {
            openJobMenu("library_aide", x, y);
            return;
          }
          Audio.sfx("interact");
          state.startBusy("Shelving books", 1200);
          delayed(1200, () => {
            Audio.sfx("chime");
            quests.emit("shelved_books");
            think("Returns shelved - Theo will be pleased.", 3200);
          });
        },
        { id: "theo" },
      );
      return;
    }

    // Board work-assist: finish at the pinned station (e.g. café coffee machine)
    const assist = townBoard.getAcceptedWorkAssist();
    if (
      assist &&
      !state.jobActive &&
      townBoard.furnitureMatchesAssist(furn.uid, assist.furnitureUid)
    ) {
      beginCommissionAssist(assist);
      return;
    }

    // Jun café favor — brew at the coffee machine / its counter (no hire needed).
    if (
      !state.jobActive &&
      quests.isActive("jun_favor") &&
      quests.currentStepId("jun_favor") === "water" &&
      furn.lotId === "cafe" &&
      townBoard.furnitureMatchesAssist(furn.uid, "c_coffee")
    ) {
      beginJunFavorBrew();
      return;
    }

    // Mid-shift: only the current task station runs the minigame
    if (state.jobActive && state.activeJobId) {
      const active = jobById[state.activeJobId];
      const task = active?.tasks[state.jobTasksDone];
      if (active && task) {
        if (furn.uid === task.furnitureUid) {
          beginWorkTask(active, task);
          return;
        }
        if (active.tasks.some((t) => t.furnitureUid === furn.uid)) {
          Audio.sfx("deny");
          think("Not that one - follow the arrow.");
          pinTaskArrow(active);
          return;
        }
      }
    }

    const job = JOBS.find(
      (j) => j.lotId === furn.lotId && j.stationDefId === furn.defId,
    );
    if (job) {
      if (!state.isHired(job.id)) {
        const pendingAssist = townBoard.getAcceptedWorkAssist();
        if (pendingAssist?.jobId === job.id) {
          pinWorkAssistArrow(pendingAssist);
          think(
            `Use the ${pendingAssist.stationLabel} — ${pendingAssist.label}.`,
            3400,
          );
          return;
        }
        if (
          quests.isActive("jun_favor") &&
          quests.currentStepId("jun_favor") === "water" &&
          job.id === "cafe_barista"
        ) {
          const coffee = state.furniture.find((f) => f.uid === "c_coffee");
          if (coffee) {
            const pos = furnitureWorldPos(coffee.uid);
            if (pos) hintArrow?.pinAt(pos.x, pos.z, "Brew a drink");
          }
          think("Brew a drink on the coffee machine for Jun.", 3400);
          return;
        }
      }
      openJobMenu(job.id, x, y);
      return;
    }

    if (furn.defId === "shelter_desk") {
      openShelterMenu(x, y);
      return;
    }

    if (furn.defId === "notice_board") {
      openTownBoard();
      return;
    }

    const options: MenuOption[] = [];

    if (furn.defId === "park_bench") {
      if (
        quests.isActive("mabel_cookies") &&
        quests.currentStepId("mabel_cookies") === "pick"
      ) {
        options.push({
          id: "pick_flowers",
          label: "Pick wildflowers",
          sub: "For Mabel's baking table",
        });
      }
    }

    // Weekly town beat at matching lot furniture
    const beat = beatForDay(state.dayIndex);
    if (
      beat &&
      state.weeklyBeatDay !== state.dayIndex &&
      furn.lotId === beat.lotId &&
      (furn.defId === "park_bench" ||
        furn.defId === "counter" ||
        furn.defId === "library_desk" ||
        furn.defId === "clinic_desk" ||
        furn.defId === "fishing_spot" ||
        furn.defId === "workbench")
    ) {
      options.push({
        id: "weekly_beat",
        label: `Join ${beat.title}`,
        sub: beat.blurb,
        accent: "critical",
      });
    }

    const petItems = new Set(["pet_bed", "pet_bowl", "toy_ball", "yarn_ball"]);
    for (const i of def.interactions) {
      const needsPet = petItems.has(furn.defId) && Boolean(i.petNeedDeltas);
      const blocked = needsPet && !state.adoptedPet;
      const waterFavor =
        i.id === "brew" &&
        furn.defId === "coffee_machine" &&
        furn.lotId === "cafe" &&
        quests.isActive("jun_favor") &&
        quests.currentStepId("jun_favor") === "water";
      const sleepLabel = waterFavor
        ? "Brew a drink"
        : i.id === "sleep"
          ? "Sleep (wake at 8 AM)"
          : i.label;
      const watchSub = waterFavor
        ? "Jun's café favor"
        : i.id === "watch"
          ? "Pick a show"
          : describeDeltas(i.needDeltas);
      options.push({
        id: i.id,
        label: sleepLabel,
        sub: blocked ? "Adopt a pet first" : watchSub,
        disabled: blocked,
        ...(waterFavor ? { accent: "quest" as const } : {}),
      });
    }

    menu.show(
      def.name,
      def.category,
      options,
      x,
      y,
      (id) => {
      if (id === "weekly_beat" && beat) {
        if (beat.id === "pier_sunset") {
          joinPierSunset(beat);
          return;
        }
        if (nightBlocksLeisure()) {
          Audio.sfx("deny");
          thinkSeq(["Too late for that…", "Better head home and sleep."]);
          return;
        }
        Audio.sfx("interact");
        state.startBusy(beat.title, 1400);
        delayed(1400, () => {
          state.weeklyBeatDay = state.dayIndex;
          let fun = beat.fun;
          let social = beat.social;
          if (townBoard.tryCompleteBringBeat(beat.id)) {
            fun += 10;
            social += 8;
            think(`${beat.title} — and they loved your handmade stool!`, 3600);
          } else {
            think(`${beat.title} - lovely!`, 3200);
          }
          state.needs = applyNeedDeltas(state.needs, { fun, social });
          Audio.sfx("success");
          aspirations.noteWeeklyBeat();
          aspirations.refresh();
        });
        return;
      }
      if (id === "pick_flowers") {
        Audio.sfx("interact");
        state.startBusy("Picking wildflowers", 1100);
        delayed(1100, () => {
          state.addMaterial("flower", 2);
          Audio.sfx("success");
          confetti.burst("soft");
          think("A little park bouquet - perfect for someone.", 3200);
          quests.emit("picked_flowers");
          if (state.setStoryFlag("first_flower_pick")) {
            delayed(400, () => {
              thoughtBubble?.showText(
                "Maybe I can give these to someone so I can make friends!",
                5600,
              );
              Audio.sfx("chime");
            });
          }
        });
        return;
      }

      const interaction = def.interactions.find((i) => i.id === id);
      if (!interaction) return;

      if (
        interaction.id === "brew" &&
        furn.defId === "coffee_machine" &&
        furn.lotId === "cafe" &&
        quests.isActive("jun_favor") &&
        quests.currentStepId("jun_favor") === "water"
      ) {
        beginJunFavorBrew();
        return;
      }
      if (
        interaction.id === "admire" &&
        furn.defId === "plant" &&
        furn.lotId === "cafe" &&
        quests.isActive("jun_favor") &&
        quests.currentStepId("jun_favor") === "water"
      ) {
        think("Jun asked for a drink — use the coffee machine.", 3600);
        const coffee = state.furniture.find((f) => f.uid === "c_coffee");
        if (coffee) {
          const pos = furnitureWorldPos(coffee.uid);
          if (pos) hintArrow?.pinAt(pos.x, pos.z, "Brew a drink");
        }
        return;
      }

      if (interaction.id === "craft" && furn.defId === "craft_table") {
        openCraftTable(furn);
        return;
      }

      const playKinds: Record<string, PlayMiniKind> = {
        swing: "swing",
        slide: "slide",
        fish: "fish",
        tune: "tune",
        dance: "tune",
        play_arcade: "arcade",
        play_piano: "tune",
        bounce: "bounce",
      };
      const playKind = playKinds[interaction.id];
      if (playKind) {
        if (nightBlocksLeisure()) {
          Audio.sfx("deny");
          thinkSeq(["Too late for that…", "Better head home and sleep."]);
          return;
        }
        if (playMini.isOpen() || workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) {
          return;
        }
        beginPlayActivity(playKind, interaction.label, furn);
        return;
      }

      if (interaction.id === "watch") {
        if (playMini.isOpen() || workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) {
          return;
        }
        openTvShowMenu(x, y);
        return;
      }

      Audio.sfx("interact");
      const seated = SEAT_INTERACTION_IDS.has(interaction.id);
      if (seated) {
        if (occupiedSeatUids().has(furn.uid)) {
          denyOccupiedSeat();
          return;
        }
        beginSeatedUse(
          furn,
          interaction.id === "nap" || interaction.id === "sleep" ? "lie" : "sit",
        );
      } else if (
        interaction.id === "shower" ||
        interaction.id === "craft" ||
        interaction.id === "spin_clay" ||
        interaction.id === "cook" ||
        interaction.id === "snack" ||
        interaction.id === "eat"
      ) {
        // Lean into appliances / counters while the busy bar runs.
        faceTowards(
          furnitureWorldPos(furn.uid)?.x ?? playerX,
          furnitureWorldPos(furn.uid)?.z ?? playerZ,
        );
        player.setWalking(false);
        player.setPoseMotion({ leanX: 0.18 });
      }
      state.startBusy(interaction.label, interaction.durationMs);
      delayed(interaction.durationMs, () => {
        // Full sleep advances to morning via night montage (stay lying).
        if (interaction.id === "sleep") {
          activityRestore = null;
          runSleepToMorning({
            caption: "Zzz…",
            alarm: !!primaryJobId(),
          });
          return;
        }
        if (seated) endActivityPose();
        else player.setPoseMotion(null);

        const mod = modifyInteractionDeltas(
          interaction.id,
          furn.defId,
          interaction.needDeltas,
          state.playerTraits,
          state.favouriteFood,
        );
        if (interaction.id === "nap") {
          const bonus = sleepEnergyBonus(state.playerTraits, state.dayTime);
          if (bonus) mod.deltas.energy = (mod.deltas.energy ?? 0) + Math.floor(bonus / 2);
          if (nightBlocksLeisure()) {
            think("A nap won't advance the day - use Sleep for morning.");
          }
        }
        state.needs = applyNeedDeltas(state.needs, mod.deltas);
        if (interaction.id === "shower") {
          if (state.isWet) {
            state.isWet = false;
            state.showDialogue(
              "player",
              state.playerName,
              "Clean. Dry. Dignity… mostly restored.",
            );
          }
        } else if (state.isWet && state.needs.hygiene > 20) {
          state.needs.hygiene = 20;
        }
        const unlockBefore = completedUnlockTaskIds(state);
        if (interaction.petNeedDeltas && state.adoptedPet) {
          const pn = state.adoptedPet.needs;
          const beforeBond = pn.bond;
          for (const [k, v] of Object.entries(interaction.petNeedDeltas)) {
            const key = k as keyof typeof pn;
            pn[key] = clampNeed(pn[key] + (v as number));
          }
          const fav = favouritePetBondBonus(
            state.favouriteAnimals,
            petById[state.adoptedPet.defId]?.species ?? "cat",
          );
          if (fav.bonus) {
            pn.bond = clampNeed(pn.bond + fav.bonus);
            think(fav.toast ?? "Favourite pet bond!", 2800);
          }
          state.dailyStats.petBondGain += Math.max(0, pn.bond - beforeBond);
          state.notePetCare();
        }
        if (interaction.moneyDelta) {
          state.money += interaction.moneyDelta;
          if (interaction.moneyDelta > 0) {
            Audio.sfx("coin");
            queueSofaAffordCelebration();
          }
        }
        Audio.sfx("success");
        think(mod.toast ?? `${interaction.label} - that's better!`, 3200);
        if (
          interaction.petNeedDeltas &&
          (interaction.id === "pet_rest" ||
            interaction.id === "play_pet" ||
            interaction.id === "feed_pet")
        ) {
          quests.emit("pet_bonded");
        }
        aspirations.refresh();
        toastNewUnlocks(state, unlockBefore);
      });
      },
      { id: "player", look: state.playerLook },
    );
  };

  const jobShiftEvent = (jobId: string): QuestEvent => {
    if (jobId === "market_clerk") return "market_shift_complete";
    if (jobId === "library_aide") return "library_shift_complete";
    if (jobId === "clinic_aide") return "clinic_shift_complete";
    if (jobId === "workshop_crafter") return "workshop_shift_complete";
    return "shift_complete";
  };

  const completeShift = (job: JobDef) => {
    const promoted = state.isPromoted(job.id);
    const basePay =
      jobPay(job.id, promoted) +
      (state.hasUnlock("trusted_employee") ? 8 : 0) +
      (state.hasUnlock("town_favor_helper") ? 3 : 0);
    const mood = moodFromNeeds(state.needs);
    const payMod = jobPayMultiplier(state.playerTraits, job.id, mood);
    const scores = state.jobQualityScores;
    const qualityAvg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0.55;
    const wasLate = state.shiftLate;
    let pay = Math.round(basePay * payMod.mult * (0.85 + 0.15 * qualityAvg));
    if (wasLate) pay = Math.round(pay * 0.9);

    const from = state.dayTime;
    const to = Math.max(from, WORK_END);
    hintArrow?.hide();

    // Same orderly patron exit as letting the clock hit five unfinished.
    beginShiftClosing(job, { unfinished: false });

    timeMontage.play({
      from,
      to,
      durationMs: 2000,
      caption: "Closing time",
      theme: "dusk",
      onTick: (t) => {
        state.dayTime = t;
        app.renderer.setDayTime(t);
      },
      onDone: () => {
        state.dayTime = to;
        app.renderer.setDayTime(to);
        const unlockBefore = completedUnlockTaskIds(state);
        state.money += pay;
        state.dailyStats.moneyEarned += pay;
        state.dailyStats.shiftsDone += 1;
        state.jobShiftCounts[job.id] =
          (state.jobShiftCounts[job.id] ?? 0) + 1;
        state.lastShiftDay = state.dayIndex;
        state.jobActive = false;
        state.activeJobId = null;
        state.jobTasksDone = 0;
        state.jobQualityScores = [];
        state.shiftLate = false;
        if (!wasLate) state.clearWorkMissStreak();
        Audio.playMusic("world");

        const tip = payMod.toast?.trim() ?? "";
        const lateNote = wasLate ? "Late start - small pay trim." : "";
        const qualityNote =
          !wasLate && qualityAvg >= 0.85 ? "Great work today!" : "";
        const note = [tip, lateNote, qualityNote].filter(Boolean).join(" ");
        const willPromote =
          !state.isPromoted(job.id) &&
          (state.jobShiftCounts[job.id] ?? 0) >= PROMOTION_SHIFTS;

        // Beat 1: payday only - cash + confetti + banner (waits if a thought is up)
        enqueueCelebration((done) => {
          Audio.sfx("cash");
          confetti.burst("huge", undefined, "gold");
          hud?.pulseAvatar();
          payCelebration.show({
            amount: pay,
            title: qualityAvg >= 0.85 && !wasLate ? "Big payday!" : "Payday!",
            note,
            durationMs: 2800,
            onDone: () => {
              // Beat 2: quest / aspiration / promotion story beats
              quests.emit(jobShiftEvent(job.id), undefined, {
                unlockToast: false,
              });
              quests.emit("any_shift_complete", undefined, {
                unlockToast: false,
              });
              aspirations.noteShift();

              if (willPromote) {
                state.jobPromoted.push(job.id);
                const promo = JOB_PROMOTIONS[job.id];
                if (promo) {
                  const boss = NPCS.find((n) => n.id === job.hireNpcId);
                  state.showDialogue(
                    (boss?.id ?? "player") as NpcId,
                    boss?.name ?? "Boss",
                    promo.bossLine,
                  );
                  celebrateKeyItem({
                    eyebrow: "Promoted!",
                    title: promo.title,
                    note: `New rank at ${lotNameForJob(job.id)}`,
                    badge: "★",
                    accent: "gold",
                    confetti: "huge",
                    palette: "gold",
                    sfx: "chime",
                    durationMs: 3800,
                  });
                }
              }

              toastNewUnlocks(state, unlockBefore);
              queueSofaAffordCelebration();
              done();

              // Beat 3: home hint once dialogue / other UI clears
              const home = buildingHintTarget("home");
              const hintId = `evening_home_${state.dayIndex}`;
              let tries = 0;
              const tryEveningHint = () => {
                tries += 1;
                if (uiBusy() && tries < 40) {
                  window.setTimeout(tryEveningHint, 350);
                  return;
                }
                fireHint(hintId, "Long day - head home when you're ready.", {
                  x: home.x,
                  z: home.z,
                  label: "Home",
                });
              };
              window.setTimeout(tryEveningHint, willPromote ? 500 : 350);
            },
          });
        });
      },
    });
  };

  const celebrateGrade = (
    grade: MiniGrade | PlayMiniGrade,
    opts?: { finale?: boolean },
  ) => {
    // Skip mid-task confetti on the last work beat - payday owns the finale.
    if (opts?.finale) return;
    if (grade === "perfect") {
      confetti.burst("big");
      hud?.pulseAvatar();
    } else if (grade === "ok") {
      confetti.burst("soft");
      hud?.pulseAvatar();
    }
  };

  const beginPlayActivity = (
    kind: PlayMiniKind,
    labelOverride?: string,
    furn?: PlacedFurniture,
  ) => {
    if (playMini.isOpen() || workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) return;
    if (kind === "fish" && !state.hasTool("fishing_rod")) {
      Audio.sfx("deny");
      thinkSeq([
        "I need a fishing rod for that…",
        "Reed sells them - east past the market.",
      ]);
      pointToReed();
      return;
    }
    Audio.sfx("interact");
    const labels: Record<PlayMiniKind, string> = {
      swing: "Ride the Swings",
      slide: "Down the Slide",
      fish: "Cast a Line",
      tune: "Tune In",
      arcade: "Play a Round",
      bounce: "Bounce!",
    };
    const label = labelOverride ?? labels[kind];
    if (furn) beginPlayPose(kind, furn);
    playMini.play(
      kind,
      label,
      (grade: PlayMiniGrade) => {
        const finish = () => {
          endActivityPose();
          const fun = grade === "perfect" ? 40 : grade === "ok" ? 24 : 10;
          const energy = grade === "perfect" ? -6 : grade === "ok" ? -8 : -10;
          state.needs = applyNeedDeltas(state.needs, { fun, energy });
          if (kind === "fish" && grade !== "miss") {
            quests.emit("visited_pier");
            quests.emit("caught_fish");
            const count = grade === "perfect" ? 2 : 1;
            state.addMaterial("fish", count);
          }
          const toast =
            grade === "perfect"
              ? kind === "swing"
                ? "Highest swing!"
                : kind === "slide"
                  ? "Perfect whoosh!"
                  : kind === "fish"
                    ? "Biggest catch! Fish in bag."
                    : kind === "tune"
                      ? "Music gold!"
                      : kind === "bounce"
                        ? "Sky-high bounce!"
                        : "High score!"
              : grade === "ok"
                ? kind === "fish"
                  ? "Fish stashed in bag!"
                  : kind === "tune"
                    ? "Catchy!"
                    : kind === "arcade"
                      ? "Continue?"
                      : kind === "bounce"
                        ? "Boing!"
                        : "Whee!"
                : kind === "fish"
                  ? "Got away…"
                  : kind === "tune"
                    ? "Static…"
                    : kind === "arcade"
                      ? "Game over."
                      : "Oof - dusty knees.";
          think(toast, 2800);
          aspirations.refresh();
        };

        // Slide world pose is a one-shot ride after the mini - the looping
        // meter would otherwise yo-yo them up the chute. Swing mirrors live.
        if (furn && kind === "slide") {
          const ms = grade === "perfect" ? 1100 : grade === "ok" ? 1300 : 1500;
          playSlideRideOnce(furn, ms, finish);
          return;
        }
        if (furn && kind === "swing") {
          const height =
            grade === "perfect" ? 1 : grade === "ok" ? 0.72 : 0.4;
          const ms = grade === "perfect" ? 1800 : grade === "ok" ? 1600 : 1300;
          playSwingRideOnce(furn, height, ms, finish);
          return;
        }
        finish();
      },
      celebrateGrade,
      furn
        ? (tick) => {
            // Swing rocks with the meter; slide stays perched until the ride.
            if (tick.kind === "slide") return;
            syncPlayPose(furn, tick);
          }
        : undefined,
    );
  };

  const openTvShowMenu = (x: number, y: number) => {
    const options: MenuOption[] = TV_SHOWS.map((s) => ({
      id: s.id,
      label: s.title,
      sub: `${s.channel.split("·")[1]?.trim() ?? s.id} · ${describeDeltas(s.needDeltas)}`,
    }));
    menu.show(
      "What's on?",
      "Pick a show",
      options,
      x,
      y,
      (id) => {
        if (id !== "comedy" && id !== "action" && id !== "horror") return;
        beginWatchTv(id);
      },
    );
  };

  const beginWatchTv = (showId: TvShowId) => {
    if (playMini.isOpen() || workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) {
      return;
    }
    Audio.sfx("interact");
    tvViewer.play(showId, (watchedMs, show) => {
      Audio.playMusic(state.jobActive ? "work" : "world");
      const full = watchedMs >= TV_FULL_WATCH_MS;
      if (full) {
        const mod = modifyInteractionDeltas(
          "watch",
          "tv",
          show.needDeltas,
          state.playerTraits,
          state.favouriteFood,
        );
        state.needs = applyNeedDeltas(state.needs, mod.deltas);
        Audio.sfx("success");
        think(mod.toast ?? show.toast, 3200);
      } else {
        state.needs = applyNeedDeltas(state.needs, { fun: 8, energy: -2 });
        Audio.sfx("chime");
        think(show.snackToast, 2800);
      }
      aspirations.refresh();
    });
  };

  const openCraftTable = (furn: PlacedFurniture) => {
    if (
      craftModal?.isOpen() ||
      boardModal?.isOpen() ||
      workMini.isOpen() ||
      playMini.isOpen() ||
      timeMontage.isPlaying() ||
      tvViewer.isOpen()
    ) {
      return;
    }
    faceTowards(
      furnitureWorldPos(furn.uid)?.x ?? playerX,
      furnitureWorldPos(furn.uid)?.z ?? playerZ,
    );
    player.setWalking(false);
    craftModal.open((recipeId) => {
      const recipe = recipeById[recipeId];
      if (!recipe) return;
      faceTowards(
        furnitureWorldPos(furn.uid)?.x ?? playerX,
        furnitureWorldPos(furn.uid)?.z ?? playerZ,
      );
      player.setPoseMotion({ leanX: 0.18 });
      workMini.play(
        recipe.mini,
        recipe.name,
        (grade) => {
          player.setPoseMotion(null);
          if (!townBoard.finishCraft(recipeId, grade)) {
            Audio.sfx("deny");
            think("Couldn’t finish that craft…");
            return;
          }
          Audio.sfx("success");
          confetti.burst(grade === "perfect" ? "big" : "soft");
          const label =
            grade === "perfect"
              ? `Perfect ${recipe.name}!`
              : grade === "ok"
                ? `Made a ${recipe.name}.`
                : `Rough ${recipe.name}, but it’ll do.`;
          think(label, 3200);
          aspirations.refresh();
        },
        (grade) => celebrateGrade(grade),
      );
    });
  };

  const openTownBoard = () => {
    if (
      craftModal?.isOpen() ||
      boardModal?.isOpen() ||
      workMini.isOpen() ||
      playMini.isOpen() ||
      timeMontage.isPlaying() ||
      tvViewer.isOpen()
    ) {
      return;
    }
    boardModal.open((action) => {
      if (action.kind === "turn_in") {
        if (!townBoard.completeOffer(action.offerUid)) {
          Audio.sfx("deny");
          think("Not ready to turn that in yet.");
          return;
        }
        Audio.sfx("success");
        confetti.burst("soft");
        think("Commission done — the town noticed!", 3000);
        aspirations.refresh();
        boardModal.refresh();
        return;
      }
      if (action.kind === "pet_care") {
        if (!townBoard.completeOffer(action.offerUid)) {
          Audio.sfx("deny");
          think("Need a pet toy and a pet first.");
          return;
        }
        Audio.sfx("success");
        confetti.burst("soft");
        think("Enrichment win — pet and board both happy!", 3200);
        aspirations.refresh();
        return;
      }
      if (action.kind === "work_assist") {
        const assist = townBoard.acceptOffer(action.offerUid);
        if (!assist) {
          Audio.sfx("deny");
          return;
        }
        pinWorkAssistArrow(assist);
        Audio.sfx("chime");
        state.showToast(
          `${assist.template.title}: head to the ${assist.lotLabel}`,
          3200,
        );
        think(
          `Help at the ${assist.lotLabel} — use the ${assist.stationLabel}.`,
          3600,
        );
      }
    });
    const pendingAssist = townBoard.getAcceptedWorkAssist();
    if (pendingAssist) pinWorkAssistArrow(pendingAssist);
  };

  const pinWorkAssistArrow = (
    assist: NonNullable<ReturnType<TownBoardSystem["getAcceptedWorkAssist"]>>,
  ) => {
    const pos = furnitureWorldPos(assist.furnitureUid);
    if (pos) {
      hintArrow?.pinAt(pos.x, pos.z, assist.label);
      return;
    }
    const job = jobById[assist.jobId];
    if (!job) return;
    const door = lotDoorWorld(job.lotId);
    if (door) hintArrow?.pinAt(door.x, door.z, assist.lotLabel);
  };

  const beginCommissionAssist = (
    assist: NonNullable<ReturnType<TownBoardSystem["getAcceptedWorkAssist"]>>,
  ) => {
    if (workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) return;
    Audio.sfx("interact");
    workMini.play(
      assist.mini,
      `Help: ${assist.label}`,
      (grade) => {
        if (!townBoard.completeOffer(assist.offerUid, { grade })) {
          Audio.sfx("deny");
          return;
        }
        hintArrow?.hide();
        Audio.sfx("success");
        confetti.burst(grade === "perfect" ? "big" : "soft");
        state.needs = applyNeedDeltas(state.needs, {
          energy: grade === "perfect" ? -4 : -6,
          fun: 8,
          social: 10,
        });
        const boss =
          NPCS.find((n) => n.id === jobById[assist.jobId]?.hireNpcId)
            ?.name ?? "town";
        think(`Helped ${boss} — favor up!`, 3200);
        aspirations.refresh();
      },
      (grade) => celebrateGrade(grade),
    );
  };

  /** Jun café favor: brew without needing a hired shift. */
  const beginJunFavorBrew = () => {
    if (workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) return;
    Audio.sfx("interact");
    workMini.play(
      "timing",
      "Brew a drink",
      () => {
        hintArrow?.hide();
        Audio.sfx("success");
        confetti.burst("soft");
        quests.emit("watered_cafe_plant");
        think("Drink's ready — better tell Jun.", 3600);
        state.needs = applyNeedDeltas(state.needs, {
          energy: -4,
          fun: 6,
          social: 4,
        });
      },
      (grade) => celebrateGrade(grade),
    );
  };

  const beginWorkTask = (job: JobDef, task: JobTaskDef) => {
    if (workMini.isOpen() || timeMontage.isPlaying() || tvViewer.isOpen()) return;
    Audio.sfx("interact");
    const isFinale = state.jobTasksDone + 1 >= jobTaskCount(job);
    workMini.play(
      task.mini,
      task.label,
      (grade: MiniGrade) => {
        state.jobQualityScores.push(gradeScore(grade));
        state.jobTasksDone += 1;
        const energy =
          grade === "perfect" ? -6 : grade === "ok" ? -8 : -10;
        const fun = grade === "perfect" ? -2 : -4;
        state.needs = applyNeedDeltas(state.needs, {
          energy,
          fun,
          social: 6,
        });
        const total = jobTaskCount(job);
        if (state.jobTasksDone >= total) {
          completeShift(job);
        } else {
          think(`${task.label} done - ${state.jobTasksDone}/${total}`, 2800);
          pinTaskArrow(job);
        }
      },
      (grade) => celebrateGrade(grade, { finale: isFinale }),
    );
  };

  const openJobMenu = (jobId: string, x: number, y: number) => {
    const job = jobById[jobId];
    if (!job) return;
    if (!state.isHired(job.id)) {
      Audio.sfx("deny");
      const boss = NPCS.find((n) => n.id === job.hireNpcId);
      think(
        boss
          ? `I should talk to ${boss.name} about a job first…`
          : "I need to get hired first…",
      );
      return;
    }
    if (state.jobActive && state.activeJobId === job.id) {
      const task = job.tasks[state.jobTasksDone];
      if (task) {
        pinTaskArrow(job);
        think(`Next up: ${task.label}`);
      }
      return;
    }
    if (state.jobActive && state.activeJobId && state.activeJobId !== job.id) {
      Audio.sfx("deny");
      think("Gotta finish my current shift first…");
      return;
    }
    if (state.lastShiftDay === state.dayIndex) {
      Audio.sfx("deny");
      const anyShifts = Object.values(state.jobShiftCounts).some((n) => n > 0);
      think(
        anyShifts
          ? "Done for today - come back tomorrow."
          : "First shift starts tomorrow - sleep until 8 AM!",
      );
      return;
    }
    const hourOk =
      state.dayTime >= WORK_OPEN && state.dayTime < WORK_END;
    if (!hourOk) {
      Audio.sfx("deny");
      think(job.closedMessage);
      return;
    }

    const promoted = state.isPromoted(job.id);
    const basePay =
      jobPay(job.id, promoted) +
      (state.hasUnlock("trusted_employee") ? 8 : 0) +
      (state.hasUnlock("town_favor_helper") ? 3 : 0);
    const mood = moodFromNeeds(state.needs);
    const payMod = jobPayMultiplier(state.playerTraits, job.id, mood);
    const estPay = Math.round(basePay * payMod.mult);
    const early = state.dayTime < WORK_START;
    const late = state.dayTime >= WORK_LATE;
    const lot = LOTS.find((l) => l.id === job.lotId);
    const beat = beatForDay(state.dayIndex);
    const options: MenuOption[] = [
      {
        id: "shift",
        label: late
          ? "Clock in (late!)"
          : early
            ? "Clock in early"
            : "Clock in",
        sub: `${jobDisplayName(job.id, promoted)} · ~$${estPay} · ${jobTaskCount(job)} tasks`,
        accent: "critical",
      },
    ];
    if (
      beat &&
      state.weeklyBeatDay !== state.dayIndex &&
      beat.lotId === job.lotId &&
      !nightBlocksLeisure()
    ) {
      options.push({
        id: "weekly_beat",
        label: `Join ${beat.title}`,
        sub: beat.blurb,
        accent: "critical",
      });
    }
    menu.show(
      jobDisplayName(job.id, promoted),
      lot?.name ?? "Work",
      options,
      x,
      y,
      (id) => {
        if (id === "weekly_beat" && beat) {
          if (beat.id === "pier_sunset") {
            joinPierSunset(beat);
            return;
          }
          if (nightBlocksLeisure()) {
            Audio.sfx("deny");
            thinkSeq(["Too late for that…", "Better head home and sleep."]);
            return;
          }
          Audio.sfx("interact");
          state.startBusy(beat.title, 1400);
          delayed(1400, () => {
            state.weeklyBeatDay = state.dayIndex;
            let fun = beat.fun;
            let social = beat.social;
            if (townBoard.tryCompleteBringBeat(beat.id)) {
              fun += 10;
              social += 8;
              think(`${beat.title} — and they loved your handmade stool!`, 3600);
            } else {
              think(`${beat.title} - lovely!`, 3200);
            }
            state.needs = applyNeedDeltas(state.needs, { fun, social });
            Audio.sfx("success");
            aspirations.noteWeeklyBeat();
            aspirations.refresh();
          });
          return;
        }
        if (!(state.dayTime >= WORK_OPEN && state.dayTime < WORK_END)) {
          Audio.sfx("deny");
          think(job.closedMessage);
          return;
        }
        if (state.lastShiftDay === state.dayIndex) {
          Audio.sfx("deny");
          const anyShifts = Object.values(state.jobShiftCounts).some(
            (n) => n > 0,
          );
          think(
            anyShifts
              ? "Done for today - come back tomorrow."
              : "First shift starts tomorrow - sleep until 8 AM!",
          );
          return;
        }
        state.jobActive = true;
        state.activeJobId = job.id;
        state.jobTasksDone = 0;
        state.jobQualityScores = [];
        state.shiftLate = state.dayTime >= WORK_LATE;
        Audio.sfx("interact");
        if (state.shiftLate) {
          const streak = state.noteWorkMiss(job.id, "late");
          if (streak >= WORK_MISS_LIMIT) {
            // Third strike - don't start the shift; boss will walk over and fire.
            state.jobActive = false;
            state.activeJobId = null;
            state.jobTasksDone = 0;
            state.jobQualityScores = [];
            state.shiftLate = false;
            Audio.playMusic("world");
            think("Uh-oh… the boss looks serious.", 3600);
            return;
          }
          Audio.playMusic("work");
          think("Ugh - late. Better hustle…", 3600);
        } else if (state.dayTime < WORK_START) {
          Audio.playMusic("work");
          think("Nice and early - let's get to work!", 3200);
        } else {
          Audio.playMusic("work");
          think("Alright - let's get to work!", 3200);
        }
        pinTaskArrow(job);
      },
      { id: "player", look: state.playerLook },
    );
  };

  const openNpcMenu = (target: Target, x: number, y: number) => {
    if (nightBlocksLeisure()) {
      Audio.sfx("deny");
      thinkSeq([
        "Too late for chats…",
        "Better head home and sleep.",
      ]);
      const t = buildingHintTarget("home");
      hintArrow?.showAt(t.x, t.z, "Home", 5000);
      return;
    }
    const def = NPCS.find((n) => n.id === target.id)!;
    const rel = state.relationships[def.id];
    rel.met = true;
    const npcId = def.id as ChatNpcId;
    holdNpcStill(npcId);

    if (def.id === "vera") quests.emit("met_vera");
    if (def.id === "theo") quests.emit("met_theo");
    if (def.id === "sage") quests.emit("met_sage");
    if (def.id === "reed") quests.emit("met_reed");

    const options: MenuOption[] = [];

    options.push({
      id: "chat",
      label: "Have a chat",
      sub: "Talk · choices · grow closer",
    });

    options.push({
      id: "food_chat",
      label: `Mention ${state.favouriteFood}`,
      sub: "Favourite food small talk",
    });

    const hireJob = JOBS.find((j) => j.hireNpcId === def.id);
    if (hireJob) {
      if (!state.isHired(hireJob.id)) {
        options.push({
          id: "ask_job",
          label: "Ask about a job",
          sub: hireJob.name,
          accent: "critical",
        });
      } else {
        options.push({
          id: "shift_chat",
          label: "Ask about work",
          sub: "Hours: 9 AM - 5 PM",
          accent: "critical",
        });
      }
    }

    if (def.id === "reed") {
      options.push({
        id: "browse_tools",
        label: "Browse tools",
        sub: "Axes, pickaxes, shovels & rods",
        accent: "critical",
      });
    } else if (!hasMetReed()) {
      options.push({
        id: "ask_reed",
        label: "Where's Reed?",
        sub: "Tools · east workshop",
        portrait: "reed",
      });
    }
    if (def.id === "vera") {
      options.push({
        id: "sell_materials",
        label: "Sell materials",
        sub: "Wood, stone, ore, fish…",
        accent: "critical",
      });
    }

    if (def.id === "mabel" && quests.isActive("mabel_cookies")) {
      const step = quests.currentStepId("mabel_cookies");
      if (step === "ask") {
        options.push({
          id: "mabel_ask",
          label: "Offer to help",
          sub: "She might need something…",
          accent: "quest",
        });
      } else if (step === "deliver") {
        options.push({
          id: "mabel_deliver",
          label: "Deliver wildflowers",
          sub: "Fresh from the park",
          accent: "quest",
        });
      }
    }

    if (def.id === "pip" && quests.isActive("pip_pond")) {
      const step = quests.currentStepId("pip_pond");
      if (step === "ask") {
        options.push({
          id: "pip_ask",
          label: "Offer to help",
          sub: "Park could use a tidy-up",
          accent: "quest",
        });
      }
    }

    if (def.id === "vera" && quests.isActive("vera_parcel")) {
      const step = quests.currentStepId("vera_parcel");
      if (step === "ask") {
        options.push({
          id: "vera_ask",
          label: "Offer to help",
          sub: "Maybe a delivery…",
          accent: "quest",
        });
      }
    }

    if (def.id === "theo" && quests.isActive("vera_parcel")) {
      const step = quests.currentStepId("vera_parcel");
      if (step === "deliver") {
        options.push({
          id: "theo_parcel",
          label: "Deliver Vera's parcel",
          sub: "From the market",
          accent: "quest",
        });
      }
    }

    if (def.id === "theo" && quests.isActive("theo_returns")) {
      const step = quests.currentStepId("theo_returns");
      if (step === "ask") {
        options.push({
          id: "theo_ask",
          label: "Offer to help",
          sub: "Return cart looks heavy",
          accent: "quest",
        });
      }
    }

    if (def.id === "sage" && quests.isActive("sage_supplies")) {
      const step = quests.currentStepId("sage_supplies");
      if (step === "ask") {
        options.push({
          id: "sage_ask",
          label: "Offer to help",
          sub: "Clinic supplies?",
          accent: "quest",
        });
      } else if (step === "deliver") {
        options.push({
          id: "sage_deliver",
          label: "Deliver supplies",
          sub: "From Vera's Market",
          accent: "quest",
        });
      }
    }

    if (def.id === "reed" && quests.isActive("reed_planks")) {
      const step = quests.currentStepId("reed_planks");
      if (step === "ask") {
        options.push({
          id: "reed_ask",
          label: "Offer to help",
          sub: "Maybe a delivery…",
          accent: "quest",
        });
      }
    }

    if (def.id === "jun" && quests.isActive("jun_favor")) {
      const step = quests.currentStepId("jun_favor");
      if (step === "ask") {
        options.push({
          id: "jun_ask",
          label: "Offer to help",
          sub: "Café favor?",
          accent: "quest",
        });
      } else if (step === "report") {
        options.push({
          id: "jun_report",
          label: "Drink's ready",
          sub: "Report back to Jun",
          accent: "quest",
        });
      }
    }

    if (def.id === "jun" && quests.isActive("reed_planks")) {
      const step = quests.currentStepId("reed_planks");
      if (step === "deliver") {
        options.push({
          id: "jun_planks",
          label: "Deliver Reed's planks",
          sub: "From the workshop",
          accent: "quest",
        });
      }
    }

    if (def.id === "pip" && quests.isActive("pip_pier")) {
      const step = quests.currentStepId("pip_pier");
      if (step === "ask") {
        options.push({
          id: "pip_pier_ask",
          label: "Offer to help",
          sub: "Pier could use a tidy-up",
          accent: "quest",
        });
      }
    }

    if (
      def.id === "vera" &&
      quests.isActive("sage_supplies") &&
      quests.currentStepId("sage_supplies") === "deliver"
    ) {
      options.push({
        id: "vera_kit",
        label: "Buy clinic kit ($10)",
        sub: state.money < 10 ? "Not enough money" : "For Dr. Sage",
        disabled: state.money < 10,
        accent: "quest",
      });
    }

    if (
      def.id === "vera" &&
      quests.isActive("crumb_snack") &&
      quests.currentStepId("crumb_snack") === "buy"
    ) {
      options.push({
        id: "vera_crumb_snack",
        label: "Buy snack for Crumb ($8)",
        sub: state.money < 8 ? "Not enough money" : "Street hangabout run",
        disabled: state.money < 8,
        accent: "quest",
      });
    }

    // Side-quest / critical / tip rows are promoted by InteractionMenu.
    for (const a of SOCIAL_ACTIONS) {
      const cost = "cost" in a ? a.cost : undefined;
      const minScore = "minScore" in a ? a.minScore : undefined;
      const tooPoor = cost !== undefined && state.money < cost;
      const locked = minScore !== undefined && rel.score < minScore;
      const socialBlock = socialBlockedReason(state.needs, state.isWet);
      const tired = a.id === "hangout" && socialBlock !== null;
      if (a.id === "gift_bag") {
        const owned = ownedBagGifts();
        const crafted = ownedCraftedGifts();
        if (owned.length === 0 && crafted.length === 0) continue;
        const canGift = state.canGiftNpc(npcId);
        const names = [
          ...owned.map((g) => materialById[g.itemId]?.name ?? g.itemId),
          ...crafted.map((g) => recipeById[g.craftedId]?.name ?? g.craftedId),
        ];
        options.push({
          id: a.id,
          label: a.label,
          sub: canGift ? names.join(" · ") : "Already gifted today",
          disabled: !canGift,
        });
        continue;
      }
      if (a.id === "gift") {
        const canGift = state.canGiftNpc(npcId);
        options.push({
          id: a.id,
          label: a.label,
          sub: !canGift
            ? "Already gifted today"
            : tooPoor
              ? "Not enough money"
              : `+${a.delta} friendship`,
          disabled: !canGift || tooPoor || locked || tired,
        });
        continue;
      }
      options.push({
        id: a.id,
        label: a.label,
        sub: tired
          ? socialBlock!
          : locked
            ? "Become better friends first"
            : tooPoor
              ? "Not enough money"
              : `+${a.delta} friendship`,
        disabled: tooPoor || locked || tired,
      });
    }

    const socialBlock = socialBlockedReason(state.needs, state.isWet);
    const tier = tierFromScore(
      rel.score,
      rel.met,
      state.flirtCounts[npcId] ?? 0,
    );
    if (tier === "close" || tier === "crush" || tier === "bestie") {
      const exclusive = EXCLUSIVE_HANGOUTS[npcId];
      options.push({
        id: exclusive.id,
        label: exclusive.label,
        sub: socialBlock ?? exclusive.sub,
        disabled: socialBlock !== null,
      });
    }

    if (state.isRoommate(npcId)) {
      const canErrand = state.canSendRoommateErrand(npcId);
      options.push({
        id: "roommate_errand",
        label: "Go harvest for me",
        sub: canErrand
          ? "Leave a haul by the porch"
          : "Already gathered today",
        disabled: !canErrand,
        accent: "critical",
      });
      options.push({
        id: "roommate_move_out",
        label: "Ask to move out",
        sub: "Back to their own place",
        accent: "critical",
      });
    } else if (rel.score >= RELATIONSHIP_MAX) {
      options.push({
        id: "roommate_move_in",
        label: "Ask to move in",
        sub: "Live with you at home",
        accent: "critical",
      });
    }

    const status = tierLabel(tier);
    menu.show(
      def.name,
      `${def.traits.join(" · ")} · ${status} · ${rel.score}`,
      options,
      x,
      y,
      (id) => {
        if (id === "chat") {
          tryChatWithOffer(npcId, def.name, () => startChat(npcId, def.name));
          return;
        }
        if (id === "roommate_move_in") {
          holdNpcStill(npcId);
          Audio.sfx("talk");
          state.startBusy("Asking…", 1000);
          delayed(1000, () => {
            state.addRoommate(npcId);
            Audio.sfx("success");
            confetti.burst("big");
            state.showDialogue(
              npcId,
              def.name,
              "I'd love to! I'll settle in at your place - chat anytime, and send me out gathering when you need a haul.",
            );
            think(`${def.name} is moving in - how exciting!`, 3600);
            player.playReaction("jump");
          });
          return;
        }
        if (id === "roommate_move_out") {
          holdNpcStill(npcId);
          Audio.sfx("talk");
          state.startBusy("Talking it over", 900);
          delayed(900, () => {
            state.removeRoommate(npcId);
            Audio.sfx("chime");
            state.showDialogue(
              npcId,
              def.name,
              "Of course. I'll head back to my usual spot - still friends, always.",
            );
            think(`${def.name} moved back out… still friends though.`, 3600);
          });
          return;
        }
        if (id === "roommate_errand") {
          if (!state.canSendRoommateErrand(npcId)) {
            Audio.sfx("deny");
            think("They already gathered for me today…");
            return;
          }
          holdNpcStill(npcId);
          Audio.sfx("talk");
          state.markRoommateErrand(npcId);
          state.startBusy(`${def.name} is gathering…`, 3200);
          delayed(3200, () => {
            const pool: MaterialId[] = [
              "wood",
              "apple",
              "orange",
              "grape",
              "flower",
              "clay",
            ];
            const drops = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < drops; i++) {
              const itemId = pool[Math.floor(Math.random() * pool.length)]!;
              const count = 1 + Math.floor(Math.random() * 2);
              const pos = porchSpawnPoint(state.porchDrops.length);
              state.addPorchDrop({ itemId, count, x: pos.x, z: pos.z });
            }
            syncPorchVisuals();
            Audio.sfx("success");
            confetti.burst("soft");
            state.showDialogue(
              npcId,
              def.name,
              "All done! I left everything by your porch - go scoop it up whenever.",
            );
            think("Haul on the porch - nice!", 3200);
          });
          return;
        }
        if (id === "food_chat") {
          Audio.sfx("talk");
          state.startBusy("Food chat", 900);
          delayed(900, () => {
            const { mult, toast } = socialOutcomeMultiplier(
              state.playerTraits,
              state.needs.hygiene,
              moodFromNeeds(state.needs),
              "friendly",
              state.isWet,
            );
            const delta = Math.round(6 * mult);
            const result = state.adjustRelationship(
              npcId,
              delta,
              RELATIONSHIP_FRIEND,
            );
            state.needs = applyNeedDeltas(state.needs, {
              social: 10,
              hunger: -4,
            });
            state.showDialogue(
              npcId,
              def.name,
              favouriteFoodNpcLine(npcId, state.favouriteFood),
            );
            if (toast) think(toast, 2800);
            noteFriendshipGain(npcId, result, def.name);
          });
          return;
        }
        if (id === "ask_job" && hireJob) {
          Audio.sfx("talk");
          state.startBusy("Asking about work", 1200);
          delayed(1200, () => {
            state.hire(hireJob.id);
            // First shift is tomorrow - lock out same-day clock-in.
            state.lastShiftDay = state.dayIndex;
            Audio.sfx("success");
            const hireLines: Record<string, string> = {
              cafe_barista:
                "You're hired! Start tomorrow - counter's yours 9 to 5.",
              market_clerk:
                "Fine. Be here tomorrow - don't break the jam jars. 9 to 5.",
              library_aide:
                "Very well. Start tomorrow. Aide hours are 9 to 5.",
              clinic_aide:
                "I'd welcome the help. Come tomorrow - shifts run 9 to 5.",
              workshop_crafter:
                "You're hired. Start tomorrow - measure twice, clock in 9 to 5.",
            };
            state.showDialogue(
              npcId,
              def.name,
              hireLines[hireJob.id] ?? "You're hired. Start tomorrow, 9 to 5.",
            );
            dialogue.offerChoices(
              [
                {
                  id: "bed",
                  label: "Go home to bed",
                  sub: "Wake at 8 AM · first shift ready",
                },
                {
                  id: "stay",
                  label: "Stay out a bit",
                  sub: "Sleep by 9 PM for morning",
                },
              ],
              (choiceId) => {
                if (choiceId === "bed") {
                  dialogue.close();
                  runSleepToMorning({
                    caption: "Early night before the big day…",
                    alarm: true,
                  });
                  return;
                }
                thinkSeq([
                  "First shift is tomorrow…",
                  "I should sleep by 9 so I'm up at 8.",
                ]);
                const t = buildingHintTarget("home");
                hintArrow?.showAt(t.x, t.z, "Home", 7000);
              },
            );
            if (hireJob.id === "cafe_barista") quests.emit("talked_jun_job");
            if (hireJob.id === "market_clerk") quests.emit("talked_vera_job");
            if (hireJob.id === "library_aide") quests.emit("talked_theo_job");
            if (hireJob.id === "clinic_aide") quests.emit("talked_sage_job");
            if (hireJob.id === "workshop_crafter") quests.emit("talked_reed_job");
            quests.emit("asked_about_job");
          });
          return;
        }
        if (id === "shift_chat") {
          Audio.sfx("talk");
          state.showDialogue(
            npcId,
            def.name,
            "Clock in at the station when we're open - 9 to 5!",
          );
          return;
        }
        if (id === "browse_tools") {
          Audio.sfx("ui");
          // Clear focus engagement so indoor/outdoor zoom works after the shop.
          releaseEngagedNpc();
          hud.openShop("buy_tools", "Reed's Tools");
          return;
        }
        if (id === "ask_reed") {
          Audio.sfx("talk");
          state.showDialogue(npcId, def.name, reedDirectionLine(npcId));
          pointToReed();
          return;
        }
        if (id === "sell_materials") {
          Audio.sfx("ui");
          releaseEngagedNpc();
          hud.openShop("sell_materials", "Vera's Buyback");
          return;
        }
        if (id === "mabel_ask") {
          Audio.sfx("talk");
          state.startBusy("Chatting with Mabel", 1000);
          delayed(1000, () => {
            Audio.sfx("chime");
            state.showDialogue(
              "mabel",
              "Mabel",
              "Could you pick wildflowers at the park for my baking table?",
            );
            quests.emit("mabel_ask_flowers");
          });
          return;
        }
        if (id === "jun_ask") {
          Audio.sfx("talk");
          state.startBusy("Chatting with Jun", 1000);
          delayed(1000, () => {
            Audio.sfx("chime");
            state.showDialogue(
              "jun",
              "Jun",
              "Perfect - brew a quick drink on the coffee machine at the counter, then come tell me how it turned out.",
            );
            quests.emit("jun_ask_favor");
            const coffee = state.furniture.find((f) => f.uid === "c_coffee");
            if (coffee) {
              const pos = furnitureWorldPos(coffee.uid);
              if (pos) hintArrow?.pinAt(pos.x, pos.z, "Brew a drink");
            }
          });
          return;
        }
        if (id === "jun_report") {
          Audio.sfx("talk");
          state.startBusy("Reporting back", 900);
          delayed(900, () => {
            Audio.sfx("success");
            state.showDialogue(
              "jun",
              "Jun",
              "Smells perfect! You're a natural. Thanks for jumping in.",
            );
            quests.emit("jun_favor_done");
          });
          return;
        }
        if (id === "mabel_deliver") {
          Audio.sfx("talk");
          state.startBusy("Delivering flowers", 900);
          delayed(900, () => {
            Audio.sfx("success");
            state.showDialogue(
              "mabel",
              "Mabel",
              "Perfect! These smell wonderful.",
            );
            quests.emit("delivered_flowers");
          });
          return;
        }
        if (id === "pip_ask") {
          Audio.sfx("talk");
          state.startBusy("Talking with Pip", 1000);
          delayed(1000, () => {
            Audio.sfx("chime");
            state.showDialogue(
              "pip",
              "Pip",
              "Litter near the benches - two bags and we're golden!",
            );
            quests.emit("pip_ask_cleanup");
            afterGroundQuestUnlocked("pip_ask_cleanup");
          });
          return;
        }
        if (id === "vera_ask") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "vera",
              "Vera",
              "Run this parcel to Theo at the library. Don't shake it.",
            );
            quests.emit("vera_ask_delivery");
          });
          return;
        }
        if (id === "theo_parcel") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "theo",
              "Theo",
              "Ah - Vera's parcel. Thank you. Quietly appreciated.",
            );
            quests.emit("delivered_parcel");
          });
          return;
        }
        if (id === "theo_ask") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "theo",
              "Theo",
              "Two carts of returns. Shelve them at the desk when you can.",
            );
            quests.emit("theo_ask_returns");
          });
          return;
        }
        if (id === "sage_ask") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "sage",
              "Dr. Sage",
              "We're low on bandages. Vera should have a clinic kit.",
            );
            quests.emit("sage_ask_supplies");
          });
          return;
        }
        if (id === "vera_kit") {
          if (state.money < 10) return;
          state.money -= 10;
          Audio.sfx("coin");
          think("Clinic kit bought - take it to Sage!", 3600);
          releaseEngagedNpc();
          return;
        }
        if (id === "vera_crumb_snack") {
          if (state.money < 8) return;
          state.money -= 8;
          Audio.sfx("coin");
          quests.emit("bought_crumb_snack");
          think("Snack bought - take it to Crumb!", 3600);
          releaseEngagedNpc();
          return;
        }
        if (id === "sage_deliver") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "sage",
              "Dr. Sage",
              "Perfect timing. The clinic thanks you.",
            );
            quests.emit("delivered_supplies");
          });
          return;
        }
        if (id === "reed_ask") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "reed",
              "Reed",
              "Leftover planks for Jun's café patio. Don't splinter anyone.",
            );
            quests.emit("reed_ask_delivery");
          });
          return;
        }
        if (id === "jun_planks") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "jun",
              "Jun",
              "Reed's planks! Perfect - patio's going to look sharp.",
            );
            quests.emit("delivered_planks");
          });
          return;
        }
        if (id === "pip_pier_ask") {
          Audio.sfx("talk");
          delayed(800, () => {
            state.showDialogue(
              "pip",
              "Pip",
              "Windy day trash on the pier - two bags and we're golden!",
            );
            quests.emit("pip_ask_pier");
            afterGroundQuestUnlocked("pip_ask_pier");
          });
          return;
        }

        const exclusive = EXCLUSIVE_HANGOUTS[npcId];
        if (id === exclusive.id) {
          const blockEx = socialBlockedReason(state.needs, state.isWet);
          if (blockEx) {
            Audio.sfx("deny");
            think(blockEx);
            return;
          }
          holdNpcStill(npcId);
          Audio.sfx("talk");
          state.startBusy(exclusive.label, exclusive.durationMs);
          delayed(exclusive.durationMs, () => {
            const { mult, toast } = socialOutcomeMultiplier(
              state.playerTraits,
              state.needs.hygiene,
              moodFromNeeds(state.needs),
              undefined,
              state.isWet,
            );
            const result = state.adjustRelationship(
              npcId,
              Math.round(exclusive.delta * mult),
              RELATIONSHIP_FRIEND,
            );
            state.needs = applyNeedDeltas(state.needs, {
              social: exclusive.needSocial,
              fun: exclusive.needFun,
            });
            Audio.sfx("success");
            state.showDialogue(npcId, def.name, exclusive.line);
            if (toast) think(toast, 2800);
            noteFriendshipGain(npcId, result, def.name);
            quests.emit("npc_hangout");
          });
          return;
        }

        const action = SOCIAL_ACTIONS.find((a) => a.id === id);
        if (!action) return;
        if (action.id === "hangout") {
          const block = socialBlockedReason(state.needs, state.isWet);
          if (block) {
            Audio.sfx("deny");
            think(block);
            return;
          }
        }
        if (action.id === "gift_bag") {
          showBagGiftPicker(npcId, def.name, x, y, () =>
            openNpcMenu(target, x, y),
          );
          return;
        }
        if (action.id === "gift") {
          if (!state.canGiftNpc(npcId)) {
            Audio.sfx("deny");
            think("I already gave them a gift today…");
            return;
          }
        }
        const cost = "cost" in action ? action.cost : undefined;
        if (cost !== undefined) {
          if (state.money < cost) return;
          state.money -= cost;
        }
        if (action.id === "gift") state.markNpcGifted(npcId);
        holdNpcStill(npcId);
        Audio.sfx(action.id === "gift" ? "cash" : "talk");
        if (action.id === "gift") {
          const npc = npcs.find((n) => n.id === npcId);
          if (npc) {
            const p = npc.actor.getPosition();
            facePlayerToward(p.x, p.z);
          }
          player.playWave();
        }
        state.startBusy(action.label, action.durationMs);
        delayed(action.durationMs, () => {
          const { mult, toast } = socialOutcomeMultiplier(
            state.playerTraits,
            state.needs.hygiene,
            moodFromNeeds(state.needs),
            action.id === "joke" ? undefined : "friendly",
            state.isWet,
          );
          const goofyBoost =
            action.id === "joke" && hasTrait(state.playerTraits, "Goofy")
              ? 1.25
              : 1;
          const result = state.adjustRelationship(
            npcId,
            Math.round(action.delta * mult * goofyBoost),
            RELATIONSHIP_FRIEND,
          );
          state.needs = applyNeedDeltas(state.needs, {
            social: action.needSocial,
            fun: "needFun" in action ? action.needFun : 0,
          });
          if (action.id === "gift") {
            const npc = npcs.find((n) => n.id === npcId);
            npc?.actor.playReaction("pop");
            npc?.actor.playSmile();
          }
          if (
            result.becameFriend ||
            result.becameClose ||
            result.becameBestie
          ) {
            noteFriendshipGain(npcId, result, def.name);
          } else {
            Audio.sfx("chime");
            const lines =
              action.id === "joke"
                ? hasTrait(state.playerTraits, "Goofy")
                  ? ["I'm crying - that was ridiculous!", "Goofy genius!"]
                  : ["Ha! That one got me.", "Okay, that was actually funny."]
                  : action.id === "gift"
                    ? ["Aww, you shouldn't have!", "This is so sweet of you."]
                    : action.id === "hangout"
                      ? [
                          "This was lovely. Same time tomorrow?",
                          "I needed that. Thanks for hanging out!",
                        ]
                      : ["Lovely to see you!", "Hey hey! What's new?"];
            const line = lines[Math.floor(Math.random() * lines.length)]!;
            state.showDialogue(npcId, def.name, line);
          }
          if (toast) think(toast, 2800);
          if (action.id === "hangout") quests.emit("npc_hangout");
          aspirations.refresh();
        });
      },
      { id: npcId },
    );
  };

  const openPetMenu = (x: number, y: number) => {
    const adopted = state.adoptedPet;
    if (!adopted) return;
    const def = petById[adopted.defId];
    const options: MenuOption[] = [
      { id: "cuddle", label: "Cuddle", sub: "+bond, +fun for you both" },
      { id: "play", label: "Play together", sub: "+big fun, costs energy" },
      {
        id: "treat",
        label: "Give a treat ($5)",
        sub: state.money < 5 ? "Not enough money" : "+hunger, +bond",
        disabled: state.money < 5,
      },
    ];
    if (
      adopted.needs.bond >= 80 &&
      state.aspirations.petTricks < 2
    ) {
      options.push({
        id: "trick",
        label: state.hasUnlock("pet_bow")
          ? "Practice show-off trick"
          : "Teach a trick",
        sub: `Tricks ${state.aspirations.petTricks}/2 · needs high bond`,
      });
    }
    // Pet personality moment
    if (def.traits.includes("Sassy") || def.traits.includes("Night Owl")) {
      options.push({
        id: "personality",
        label: "Watch them be themselves",
        sub: def.traits.join(" · "),
      });
    }
    menu.show(
      def.name,
      `${def.traits.join(" · ")} - bond ${Math.round(adopted.needs.bond)}`,
      options,
      x,
      y,
      (id) => {
        const apply = (
          label: string,
          ms: number,
          playerDeltas: Record<string, number>,
          petDeltas: Record<string, number>,
          bondQuest = false,
        ) => {
          Audio.sfx("pet");
          state.startBusy(label, ms);
          delayed(ms, () => {
            const unlockBefore = completedUnlockTaskIds(state);
            const beforeBond = adopted.needs.bond;
            state.needs = applyNeedDeltas(state.needs, playerDeltas);
            for (const [k, v] of Object.entries(petDeltas)) {
              const key = k as keyof typeof adopted.needs;
              adopted.needs[key] = clampNeed(adopted.needs[key] + v);
            }
            const fav = favouritePetBondBonus(
              state.favouriteAnimals,
              def.species,
            );
            if (fav.bonus) {
              adopted.needs.bond = clampNeed(adopted.needs.bond + fav.bonus);
            }
            state.dailyStats.petBondGain += Math.max(
              0,
              adopted.needs.bond - beforeBond,
            );
            state.notePetCare();
            Audio.sfx("success");
            think(fav.toast ?? `${def.name} loves it!`, 3200);
            if (bondQuest) quests.emit("pet_bonded");
            aspirations.refresh();
            toastNewUnlocks(state, unlockBefore);
          });
        };
        if (id === "cuddle")
          apply(
            "Cuddling",
            900,
            { fun: 10, social: 12 },
            { bond: 10, fun: 12 },
            true,
          );
        else if (id === "play")
          apply(
            "Playing",
            1300,
            { fun: 20, social: 8, energy: -8 },
            { bond: 12, fun: 32, energy: -8 },
            true,
          );
        else if (id === "treat") {
          if (state.money < 5) return;
          state.money -= 5;
          apply("Sharing a treat", 800, { social: 6 }, { hunger: 30, bond: 8 });
        } else if (id === "trick") {
          Audio.sfx("pet");
          state.startBusy("Teaching a trick", 1600);
          delayed(1600, () => {
            adopted.needs.bond = clampNeed(adopted.needs.bond + 6);
            state.needs = applyNeedDeltas(state.needs, { fun: 14, social: 10 });
            aspirations.notePetTrick();
            Audio.sfx("success");
            think(
              `${def.name} learned trick #${state.aspirations.petTricks}!`,
              3200,
            );
            state.notePetCare();
          });
        } else if (id === "personality") {
          Audio.sfx("pet");
          const line = def.traits.includes("Night Owl")
            ? `${def.name} stares at the moon like it owes them snacks.`
            : `${def.name} gives you a judgmental little side-eye. Iconic.`;
          state.showDialogue("player", state.playerName, line);
          state.needs = applyNeedDeltas(state.needs, { fun: 10, social: 6 });
        }
      },
      { id: "player", look: state.playerLook },
    );
  };

  const openShelterMenu = (x: number, y: number) => {
    if (state.adoptedPet) {
      menu.show(
        "Pet Shelter",
        "You already have a companion at home",
        [{ id: "close", label: "Say hello to the pets" }],
        x,
        y,
        () => {
          state.needs = applyNeedDeltas(state.needs, { fun: 12, social: 8 });
          think("So many happy tails!", 3200);
        },
        { id: "player", look: state.playerLook },
      );
      return;
    }
    const ready = state.hasPetSetup();
    const options: MenuOption[] = state.shelterPets.map((id) => {
      const p = petById[id];
      const affordable = state.money >= p.fee;
      const fav = state.favouriteAnimals.includes(
        speciesFavouriteLabel(p.species),
      );
      return {
        id,
        label: `${p.name} the ${p.species}${fav ? " ♥" : ""}`,
        sub: !ready
          ? "Needs a pet bed & bowl at home"
          : affordable
            ? `${fav ? "Favourite! · " : ""}${p.traits.join(", ")} · $${p.fee}`
            : `Costs $${p.fee} - save up a little`,
        disabled: !ready || !affordable,
      };
    });
    menu.show(
      "Adoption Desk",
      ready
        ? "Choose a friend to take home"
        : "Place a Pet Bed and Pet Bowl at home first",
      options,
      x,
      y,
      (id) => {
        const pdef = petById[id];
        if (!pdef || state.money < pdef.fee || !state.hasPetSetup()) return;
        const unlockBefore = completedUnlockTaskIds(state);
        state.money -= pdef.fee;
        state.adoptPet(id);
        syncPet();
        menu.close();
        const fav = state.favouriteAnimals.includes(
          speciesFavouriteLabel(pdef.species),
        );
        celebrateKeyItem({
          eyebrow: "New friend!",
          title: pdef.name,
          note: fav
            ? `A favourite ${pdef.species} · ${pdef.traits.join(" · ")}`
            : `${pdef.species} · ${pdef.traits.join(" · ")}`,
          badge: "♥",
          accent: "rose",
          confetti: "huge",
          palette: "party",
          sfx: "adopt",
          durationMs: 4200,
          onDone: () => {
            think(
              fav
                ? `${pdef.name} joined the family - a favourite!`
                : `${pdef.name} joined the family!`,
              4000,
            );
          },
        });
        if (fav && state.adoptedPet) {
          state.adoptedPet.needs.bond = clampNeed(
            state.adoptedPet.needs.bond + 12,
          );
        }
        quests.emit("adopted_pet");
        aspirations.refresh();
        toastNewUnlocks(state, unlockBefore);
      },
      { id: "player", look: state.playerLook },
    );
  };

  const approach = (target: Target) => {
    // Already close enough to reach through packed décor.
    if (distanceToTarget(playerX, playerZ, target) <= TILE * 1.2) {
      faceTowards(target.x, target.z);
      openTargetMenu(target);
      return;
    }
    const start = playerTile();
    let goals = approachTiles(target);
    if (goals.length === 0) {
      // Last resort: nearest walkable to footprint centre.
      const near = nearestWalkable(
        collision,
        {
          x: Math.floor(target.x / TILE),
          y: Math.floor(target.z / TILE),
        },
        MAP_W,
        MAP_H,
        4,
      );
      if (near) goals = [near];
    }
    if (goals.length === 0) {
      Audio.sfx("deny");
      think("Can't reach that…");
      return;
    }
    if (goals.some((g) => g.x === start.x && g.y === start.y)) {
      faceTowards(target.x, target.z);
      openTargetMenu(target);
      return;
    }
    let path = findPathToAny(collision, start, goals, MAP_W, MAP_H);
    if (path.length === 0) {
      // Expand stand goals out to a short ring so boxed-in props stay usable.
      const expanded: GridPos[] = [...goals];
      const seen = new Set(goals.map((g) => `${g.x},${g.y}`));
      for (const t of target.tiles) {
        for (let r = 2; r <= 3; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
              const x = t.x + dx;
              const y = t.y + dy;
              if (!inBounds(x, y) || collision[y][x]) continue;
              const key = `${x},${y}`;
              if (seen.has(key)) continue;
              seen.add(key);
              expanded.push({ x, y });
            }
          }
        }
      }
      path = findPathToAny(collision, start, expanded, MAP_W, MAP_H);
    }
    if (path.length === 0) {
      Audio.sfx("deny");
      think("Can't reach that…");
      return;
    }
    Audio.sfx("walk");
    const dest = path[path.length - 1];
    app.renderer.showMoveMarker(dest.x, dest.y);
    setPath(path.slice(1), () => {
      faceTowards(target.x, target.z);
      openTargetMenu(target);
    });
  };

  const canPlace = (
    defId: string,
    tx: number,
    ty: number,
    rot: Dir = placeRot,
    opts?: { free?: boolean },
  ): boolean => {
    const def = furnitureById[defId];
    if (!def) return false;
    if (!opts?.free && state.money < def.price) return false;
    const { tw, th } = furnitureFootprint(defId, rot);
    const home = LOTS.find((l) => l.id === "home")!;

    const inHomeInterior = (x: number, y: number) =>
      x > home.tx &&
      y > home.ty &&
      x < home.tx + home.tw - 1 &&
      y < home.ty + home.th - 1;

    /** Countertop / table slot check for surface-only or surface-optional pieces. */
    const canPlaceOnHost = (): boolean => {
      for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
          const x = tx + dx;
          const y = ty + dy;
          if (!inHomeInterior(x, y)) return false;
          const host = surfaceHostAt(x, y, "home");
          if (!host) return false;
          const child = surfaceChildAt(x, y, "home");
          if (child && child.uid !== heldFurniture?.uid) return false;
        }
      }
      return true;
    };

    if (def.placeOnSurface) return canPlaceOnHost();

    // Optional surface pieces: prefer a free host tile when one is under the cursor.
    if (def.allowsSurface && surfaceHostAt(tx, ty, "home")) {
      return canPlaceOnHost();
    }

    for (let dy = 0; dy < th; dy++) {
      for (let dx = 0; dx < tw; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (!inHomeInterior(x, y)) return false;
        if (map.ground[y][x] === Tile.door) return false;
        if (baseCollision[y]?.[x]) return false;
        if (state.walls.has(state.wallKey(x, y))) return false;
        if (def.floorCovering) {
          // Rugs can sit under furniture, but not stack on other rugs.
          if (floorCoveringAt(x, y, "home")) return false;
        } else if (floorFurnitureAt(x, y, "home")) {
          return false;
        }
      }
    }
    // Held host with children must keep each child on the new footprint.
    if (heldFurniture?.defId === defId && heldChildren.length > 0) {
      for (const { dx, dy } of heldChildren) {
        const cx = tx + dx;
        const cy = ty + dy;
        if (cx < tx || cy < ty || cx >= tx + tw || cy >= ty + th) return false;
      }
    }
    return true;
  };

  /** Parent uid when placing onto a table/counter (required or optional). */
  const surfaceParentUid = (
    def: (typeof furnitureById)[string],
    tx: number,
    ty: number,
  ): string | undefined => {
    if (!def?.placeOnSurface && !def?.allowsSurface) return undefined;
    if (def.allowsSurface && !def.placeOnSurface) {
      // Only parent when there's actually a free host under the cursor.
      if (!surfaceHostAt(tx, ty, "home")) return undefined;
      const child = surfaceChildAt(tx, ty, "home");
      if (child && child.uid !== heldFurniture?.uid) return undefined;
    }
    return surfaceHostAt(tx, ty, "home")?.uid;
  };

  const denyPlaceThought = (
    def: (typeof furnitureById)[string],
    tx: number,
    ty: number,
  ) => {
    if (def?.placeOnSurface) {
      think(
        surfaceHostAt(tx, ty, "home")
          ? "That spot on the surface is taken…"
          : "Needs a free spot on a counter or table…",
      );
    } else if (def?.allowsSurface && surfaceHostAt(tx, ty, "home")) {
      think("That spot on the surface is taken…");
    } else if (def?.floorCovering) {
      think("Can't stack rugs there…");
    } else {
      think("Doesn't fit there - try R to rotate.");
    }
  };

  const restoreHeldFurniture = () => {
    if (!heldFurniture) return;
    state.furniture.push(heldFurniture);
    spawnFurniture(heldFurniture);
    for (const { piece } of heldChildren) {
      state.furniture.push(piece);
      spawnFurniture(piece);
    }
    heldFurniture = null;
    heldChildren = [];
    rebuildCollision();
  };

  const pickUpFurniture = (hit: PlacedFurniture) => {
    const def = furnitureById[hit.defId];
    heldChildren = [];
    if (def?.supportsItems) {
      const kids = state.furniture.filter((f) => f.parentUid === hit.uid);
      heldChildren = kids.map((k) => ({
        piece: { ...k },
        dx: k.tx - hit.tx,
        dy: k.ty - hit.ty,
      }));
      for (const k of kids) {
        state.furniture = state.furniture.filter((f) => f.uid !== k.uid);
        removeFurnitureMesh(k.uid);
      }
    }
    heldFurniture = {
      ...hit,
      rot: hit.rot ?? "down",
      parentUid: undefined,
    };
    placeRot = heldFurniture.rot ?? "down";
    state.furniture = state.furniture.filter((f) => f.uid !== hit.uid);
    removeFurnitureMesh(hit.uid);
    state.selectedBuildItem = null;
    rebuildCollision();
    Audio.sfx("pickup");
    const kidNote =
      heldChildren.length > 0
        ? ` (+${heldChildren.length} on top)`
        : "";
    state.showToast(
      `Moving ${def?.name ?? "item"}${kidNote} - R to rotate, click to place, Esc to cancel`,
    );
    catalog.rebuild();
  };

  const sellFurniture = (hit: PlacedFurniture) => {
    const def = furnitureById[hit.defId];
    let refund = Math.floor((def?.price ?? 0) * 0.6);
    const kids = state.furniture.filter((f) => f.parentUid === hit.uid);
    for (const k of kids) {
      const kd = furnitureById[k.defId];
      refund += Math.floor((kd?.price ?? 0) * 0.6);
      state.furniture = state.furniture.filter((f) => f.uid !== k.uid);
      removeFurnitureMesh(k.uid);
    }
    state.money += refund;
    state.furniture = state.furniture.filter((f) => f.uid !== hit.uid);
    removeFurnitureMesh(hit.uid);
    rebuildCollision();
    Audio.sfx("sell");
    const extra =
      kids.length > 0 ? ` (+${kids.length} countertop item${kids.length > 1 ? "s" : ""})` : "";
    state.showToast(`Sold ${def?.name ?? "item"}${extra} for $${refund}`);
    catalog.rebuild();
    queueSofaAffordCelebration();
  };

  const toggleBuild = () => {
    if (state.mode === "live" && nightBlocksLeisure()) {
      Audio.sfx("deny");
      thinkSeq(["Too late to build…", "Better head home and sleep."]);
      return;
    }
    const lot = lotAtTile(Math.floor(playerX / TILE), Math.floor(playerZ / TILE));
    if (state.mode === "live") {
      if (!lot?.buildable) {
        Audio.sfx("deny");
        think("I can only build at my own home…");
        return;
      }
      state.mode = "build";
      playerPath = [];
      onArrive = null;
      player.setWalking(false);
      menu.close();
      hud.closeStatus();
      catalog.setBuildActive(true);
      catalog.show();
      const home = LOTS.find((l) => l.id === "home")!;
      app.renderer.setGridVisible(true, home);
      placeRot = "down";
      heldFurniture = null;
      heldChildren = [];
      state.selectedBuildItem = null;
      state.buildTool = "furniture";
      lastBuildTile = {
        tx: Math.floor(playerX / TILE),
        ty: Math.floor(playerZ / TILE),
      };
      lastBuildPickedUid = null;
      catalog.rebuild();
      updateGhost();
      Audio.sfx("build");
      Audio.playMusic("build");
      state.showToast("Build mode - pick from the catalog · R rotates items");
      quests.emit("opened_build");
      if (quests.isActive("empty_nest")) quests.emit("game_started");
    } else {
      restoreHeldFurniture();
      state.mode = "live";
      catalog.hide();
      catalog.setBuildActive(false);
      app.renderer.setGridVisible(false);
      buildFeedback?.clear();
      lastBuildTile = null;
      lastBuildPickedUid = null;
      rebuildCollision();
      Audio.sfx("ui");
      Audio.playMusic(state.jobActive ? "work" : "world");
      state.showToast("Back to live mode");
    }
  };

  const handleBuildClick = (tx: number, ty: number, pickedUid?: string) => {
    if (!insideHomeTile(tx, ty)) {
      Audio.sfx("deny");
      think("I can only change the inside of my home…");
      return;
    }

    if (state.buildTool === "sell") {
      if (heldFurniture) {
        const def = furnitureById[heldFurniture.defId];
        let refund = Math.floor((def?.price ?? 0) * 0.6);
        for (const { piece } of heldChildren) {
          const kd = furnitureById[piece.defId];
          refund += Math.floor((kd?.price ?? 0) * 0.6);
        }
        state.money += refund;
        heldFurniture = null;
        heldChildren = [];
        Audio.sfx("sell");
        state.showToast(`Sold ${def?.name ?? "item"} for $${refund}`);
        catalog.rebuild();
        buildFeedback?.clear();
        queueSofaAffordCelebration();
        return;
      }
      const hit =
        state.furniture.find((f) => f.uid === pickedUid && f.lotId === "home") ??
        furnitureAt(tx, ty, "home");
      if (!hit) {
        think("Click furniture to sell it…");
        return;
      }
      sellFurniture(hit);
      return;
    }

    if (state.buildTool === "wall") {
      if (map.ground[ty][tx] === Tile.door) {
        Audio.sfx("deny");
        think("Can't wall over the door…");
        return;
      }
      const key = state.wallKey(tx, ty);
      if (state.walls.has(key)) {
        state.walls.delete(key);
        const m = wallMeshes.get(key);
        if (m) {
          app.renderer.remove(m);
          wallMeshes.delete(key);
        }
        state.money += 5;
        Audio.sfx("sell");
        state.showToast("Wall removed (+$5)");
        queueSofaAffordCelebration();
      } else {
        const wallCost = state.hasUnlock("wall_sky") ? 6 : 10;
        if (state.money < wallCost) {
          Audio.sfx("deny");
          state.showToast(`A wall costs $${wallCost}.`);
          return;
        }
        if (furnitureAt(tx, ty, "home")) {
          Audio.sfx("deny");
          think("Move the furniture first…");
          return;
        }
        if (baseCollision[ty]?.[tx]) {
          Audio.sfx("deny");
          think("There's already a wall there…");
          return;
        }
        state.money -= wallCost;
        state.walls.add(key);
        addWall(tx, ty);
        Audio.sfx("place");
        state.showToast("Wall placed");
      }
      rebuildCollision();
      return;
    }

    if (state.buildTool === "floor") {
      const key = state.wallKey(tx, ty);
      const styleId = state.selectedFloorStyle ?? DEFAULT_FLOOR_STYLE_ID;
      const style = floorStyleById[styleId];
      if (!style) {
        Audio.sfx("deny");
        state.showToast("Pick a floor style from the catalog (Tab).");
        return;
      }
      if (style.unlockId && !state.hasUnlock(style.unlockId)) {
        Audio.sfx("deny");
        state.showToast("That floor style is still locked.");
        return;
      }
      if (state.floors.has(key)) {
        Audio.sfx("deny");
        think("Already floored - pick another tile.");
        return;
      }
      if (state.money < style.price) {
        Audio.sfx("deny");
        state.showToast(`${style.name} costs $${style.price} a tile.`);
        return;
      }
      state.money -= style.price;
      state.floors.set(key, { variant: style.variant, rot: placeRot });
      addFloor(tx, ty, style.variant, placeRot);
      Audio.sfx("place");
      state.showToast(`${style.name} · R to rotate pattern`);
      return;
    }

    // Furniture tool: place held / buy from catalog / pick up existing.
    // When an item is ready to place, prefer placing (onto tables, under sofas,
    // etc.) instead of picking up whatever mesh was clicked.
    const placeDefId = heldFurniture?.defId ?? state.selectedBuildItem;
    const placeDef = placeDefId ? furnitureById[placeDefId] : undefined;

    if (placeDefId && placeDef) {
      if (!heldFurniture) {
        if (!isFurnitureUnlocked(placeDef, state)) {
          Audio.sfx("deny");
          think("That piece is still locked…");
          state.selectedBuildItem = null;
          return;
        }
      }

      if (canPlace(placeDefId, tx, ty, placeRot, { free: !!heldFurniture })) {
        if (heldFurniture) {
          const hostUid = surfaceParentUid(placeDef, tx, ty);
          const placed: PlacedFurniture = {
            ...heldFurniture,
            tx,
            ty,
            rot: placeRot,
            lotId: "home",
            parentUid: hostUid,
          };
          const kids = heldChildren;
          heldFurniture = null;
          heldChildren = [];
          state.furniture.push(placed);
          spawnFurniture(placed);
          for (const { piece, dx, dy } of kids) {
            const child: PlacedFurniture = {
              ...piece,
              tx: tx + dx,
              ty: ty + dy,
              lotId: "home",
              parentUid: placed.uid,
            };
            state.furniture.push(child);
            spawnFurniture(child);
          }
          rebuildCollision();
          Audio.sfx("place");
          state.showToast(`Placed ${placeDef.name}`);
          catalog.rebuild();
          if (state.hasPetSetup()) quests.emit("pet_setup");
          return;
        }

        // Buy & place from catalog
        const unlockBefore = completedUnlockTaskIds(state);
        state.money -= placeDef.price;
        const hostUid = surfaceParentUid(placeDef, tx, ty);
        const placed: PlacedFurniture = {
          uid: `f_${uidCounter++}`,
          defId: placeDefId,
          tx,
          ty,
          lotId: "home",
          rot: placeRot,
          parentUid: hostUid,
        };
        state.selectedBuildItem = null;
        state.furniture.push(placed);
        spawnFurniture(placed);
        rebuildCollision();
        Audio.sfx("place");
        if (hasTrait(state.playerTraits, "Creative")) {
          state.needs = applyNeedDeltas(state.needs, { fun: 4 });
          think(`Placed ${placeDef.name} - creative spark!`, 2800);
        } else {
          state.showToast(
            hostUid
              ? `Placed ${placeDef.name} on the surface`
              : `Placed ${placeDef.name}`,
          );
        }
        catalog.rebuild();
        if (placeDefId === "sofa") {
          quests.emit("placed_sofa");
          if (state.setStoryFlag("first_sofa_place")) {
            celebrateKeyItem({
              eyebrow: "Home upgrade!",
              title: placeDef.name,
              note: "Your place is starting to feel like yours.",
              furnitureDefId: placeDefId,
              badge: "★",
              accent: "gold",
              confetti: "big",
              palette: "gold",
              sfx: "chime",
              durationMs: 3400,
            });
          }
        }
        if (state.hasPetSetup()) quests.emit("pet_setup");
        aspirations.refresh();
        toastNewUnlocks(state, unlockBefore);
        return;
      }

      // Can't place - maybe free a taken surface slot by picking up the child.
      if (placeDef.placeOnSurface || placeDef.allowsSurface) {
        const child = surfaceChildAt(tx, ty, "home");
        if (child) {
          pickUpFurniture(child);
          return;
        }
        Audio.sfx("deny");
        if (!heldFurniture && state.money < placeDef.price) {
          state.showToast("Not enough money.");
        } else {
          denyPlaceThought(placeDef, tx, ty);
        }
        return;
      }

      // Rug / normal furniture: fall through to pick-up if something is there.
      if (!heldFurniture && state.money < placeDef.price) {
        Audio.sfx("deny");
        state.showToast("Not enough money.");
        return;
      }
    }

    // Prefer mesh uid; fall back to footprint under the tile
    const existing =
      state.furniture.find((f) => f.uid === pickedUid && f.lotId === "home") ??
      furnitureAt(tx, ty, "home");
    if (existing) {
      // Don't yank a table out from under a kettle you're trying to place.
      if (
        placeDef &&
        (placeDef.placeOnSurface || placeDef.allowsSurface) &&
        furnitureById[existing.defId]?.supportsItems
      ) {
        Audio.sfx("deny");
        denyPlaceThought(placeDef, tx, ty);
        return;
      }
      pickUpFurniture(existing);
      return;
    }

    if (placeDefId && placeDef) {
      Audio.sfx("deny");
      denyPlaceThought(placeDef, tx, ty);
      return;
    }

    state.showToast(
      "Open the catalog (Tab) to pick an item, or click furniture to move.",
    );
  };

  const overUi = (cx: number, cy: number) => {
    if (dialogue?.isOpen()) return true;
    if (menu.containsPoint(cx, cy)) return true;
    if (catalog.containsPoint(cx, cy)) return true;
    if (hud.containsHudCluster(cx, cy)) return true;
    if (interactTip?.containsPoint(cx, cy)) return true;
    if (tvViewer?.isOpen()) return true;
    if (workMini?.isOpen()) return true;
    if (playMini?.isOpen()) return true;
    if (craftModal?.isOpen()) return true;
    if (boardModal?.isOpen()) return true;
    return false;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (introActive) return;
    // Dialogue wrap owns dismiss clicks while open
    if (dialogue?.isOpen()) return;
    if (overUi(e.clientX, e.clientY)) return;
    if (menu.isOpen()) {
      // Backdrop / outside clicks are owned by the wheel overlay itself.
      return;
    }
    const rect = app.canvas.getBoundingClientRect();
    const tile = app.renderer.pickTile(e.clientX, e.clientY, rect);

    if (state.mode === "build") {
      // Furniture-only pick - pets/NPCs must never steal build clicks.
      const hitMesh = app.renderer.pickFrom(
        e.clientX,
        e.clientY,
        rect,
        buildFurniturePickables(),
      );
      const pickedUid = hitMesh?.userData.uid as string | undefined;
      const pickedFurniture = pickedUid
        ? state.furniture.find((f) => f.uid === pickedUid && f.lotId === "home")
        : undefined;

      if (pickedFurniture && state.buildTool === "furniture" && !heldFurniture) {
        const placing = Boolean(state.selectedBuildItem);
        // While placing, use the cursor tile so multi-tile tables get the
        // correct free slot (not always the host's origin corner).
        const clickTx =
          placing && tile ? tile.tx : pickedFurniture.tx;
        const clickTy =
          placing && tile ? tile.ty : pickedFurniture.ty;
        lastBuildTile = { tx: clickTx, ty: clickTy };
        lastBuildPickedUid = placing ? null : pickedFurniture.uid;
        handleBuildClick(
          clickTx,
          clickTy,
          placing ? undefined : pickedFurniture.uid,
        );
        lastBuildPickedUid = null;
        updateGhost();
        return;
      }
      if (pickedFurniture && state.buildTool === "sell") {
        handleBuildClick(
          pickedFurniture.tx,
          pickedFurniture.ty,
          pickedFurniture.uid,
        );
        updateGhost();
        return;
      }
      if (!tile) return;
      lastBuildTile = tile;
      lastBuildPickedUid = null;
      handleBuildClick(tile.tx, tile.ty, pickedUid);
      updateGhost();
      return;
    }
    if (!tile) return;
    if (state.isBusy()) {
      think("Busy right now…");
      return;
    }

    // Prefer a direct hit on a prop or character over the ground point
    const picked = app.renderer.pickFrom(e.clientX, e.clientY, rect, pickables());
    if (picked) {
      const target = targetForObject(picked);
      if (target) {
        approach(target);
        return;
      }
    }
    const world = app.renderer.worldFromScreen(e.clientX, e.clientY, rect);
    if (world) {
      const target = targetAt(world.x, world.z);
      if (target) {
        approach(target);
        return;
      }
    }
    commandMove(tile.tx, tile.ty);
  };

  const justPressed = (code: string): boolean => {
    if (app.isDown(code)) {
      if (keyLatch.has(code)) return false;
      keyLatch.add(code);
      return true;
    }
    keyLatch.delete(code);
    return false;
  };

  const saveGame = () => {
    writeSave(state.toSave());
    Audio.sfx("save");
    state.showToast("Game saved");
  };

  const updateGhost = () => {
    if (!buildFeedback) return;
    if (state.mode !== "build") {
      buildFeedback.clear();
      return;
    }

    if (
      heldFurniture &&
      state.buildTool !== "furniture" &&
      state.buildTool !== "sell"
    ) {
      restoreHeldFurniture();
    }

    if (!lastBuildTile) {
      buildFeedback.clear();
      return;
    }

    const { tx, ty } = lastBuildTile;
    const okTile = insideHomeTile(tx, ty);

    if (state.buildTool === "floor") {
      const key = state.wallKey(tx, ty);
      const style =
        floorStyleById[state.selectedFloorStyle ?? DEFAULT_FLOOR_STYLE_ID];
      const price = style?.price ?? 5;
      const unlocked =
        !style?.unlockId || state.hasUnlock(style.unlockId);
      const ok =
        okTile &&
        !state.floors.has(key) &&
        unlocked &&
        !!style &&
        state.money >= price;
      buildFeedback.showTileTool(tx, ty, ok, "floor");
      return;
    }

    if (state.buildTool === "wall") {
      const key = state.wallKey(tx, ty);
      const removing = state.walls.has(key);
      const ok =
        okTile &&
        map.ground[ty]?.[tx] !== Tile.door &&
        (removing ||
          (!furnitureAt(tx, ty, "home") &&
            !baseCollision[ty]?.[tx] &&
            state.money >= 10));
      buildFeedback.showTileTool(tx, ty, ok, "wall");
      return;
    }

    if (state.buildTool === "sell") {
      const hit =
        state.furniture.find(
          (f) => f.uid === lastBuildPickedUid && f.lotId === "home",
        ) ?? furnitureAt(tx, ty, "home");
      if (hit) {
        buildFeedback.showFurnitureSelect(furnitureMeshes.get(hit.uid) ?? null);
      } else {
        buildFeedback.showTileTool(tx, ty, false, "sell");
      }
      return;
    }

    // Furniture tool
    if (!heldFurniture && lastBuildPickedUid) {
      const existing = state.furniture.find(
        (f) => f.uid === lastBuildPickedUid && f.lotId === "home",
      );
      if (existing) {
        buildFeedback.showFurnitureSelect(
          furnitureMeshes.get(existing.uid) ?? null,
        );
        return;
      }
    }

    const defId = heldFurniture?.defId ?? state.selectedBuildItem;
    if (!defId) {
      buildFeedback.clear();
      if (okTile) app.renderer.setHoverTile(lastBuildTile, { ok: true });
      return;
    }

    const ok = canPlace(defId, tx, ty, placeRot, { free: !!heldFurniture });
    let surfaceY = 0;
    let surfaceHost: PlacedFurniture | null = null;
    const ghostDef = furnitureById[defId];
    if (ghostDef?.placeOnSurface || ghostDef?.allowsSurface) {
      const host = surfaceHostAt(tx, ty, "home");
      if (
        host &&
        (ghostDef.placeOnSurface ||
          canPlace(defId, tx, ty, placeRot, { free: !!heldFurniture }))
      ) {
        surfaceY = surfaceHeightFor(host.defId);
        surfaceHost = host;
      }
    }
    buildFeedback.showFurniturePlace(
      defId,
      tx,
      ty,
      placeRot,
      ok,
      surfaceY,
      surfaceHost,
    );
  };

  const finishWakeIntro = () => {
    introActive = false;
    introPhase = "done";
    thoughtBubble?.hide();
    player.setPose("stand");
    Audio.sfx("confirm");

    // Do NOT switch to the dense world theme under the hiring journal line —
    // scheduling ~500 world notes while dialogue voice starts was killing the
    // AudioContext. Keep the quiet story bed until that card closes.
    let worldStarted = false;
    const startWorldTheme = () => {
      if (worldStarted) return;
      worldStarted = true;
      Audio.playMusic("world");
    };

    dialogue.setOnClosed(() => {
      if (!menu.isOpen()) releaseEngagedNpc();
      startWorldTheme();
      dialogue.setOnClosed(() => {
        if (!menu.isOpen()) releaseEngagedNpc();
      });
    });

    if (quests.isActive("empty_nest")) {
      quests.emit("game_started");
    }
    // If no journal line opened, still get the town theme going.
    window.setTimeout(() => {
      if (!dialogue.isOpen()) startWorldTheme();
    }, 80);
  };

  const bounceOutOfBed = () => {
    hintArrow?.hide();
    player.setPose("stand");
    const home = LOTS.find((l) => l.id === "home")!;
    const bedTx = home.tx + 2;
    const bedTy = home.ty + 1;
    const land =
      nearestWalkable(
        collision,
        { x: bedTx + 1, y: bedTy + 3 },
        MAP_W,
        MAP_H,
        6,
      ) ?? { x: bedTx + 1, y: bedTy + 3 };
    playerX = land.x * TILE + TILE / 2;
    playerZ = land.y * TILE + TILE / 2;
    player.setPosition(playerX, playerZ);
    player.setFacing("down");
    player.playReaction("jump");
    Audio.sfx("jump");
    introLanded = false;
  };

  const WAKE_THOUGHTS = [
    {
      kind: "text" as const,
      text: "First morning light through my window… still doesn't feel quite like mine yet.",
    },
    {
      kind: "text" as const,
      text: "I've got a TV… and nowhere to sit for it. Classic.",
    },
    {
      kind: "sofa" as const,
      text: "A sunny sofa would look perfect right there…",
    },
  ];

  const showWakeThought = (step: number) => {
    const beat = WAKE_THOUGHTS[step - 1];
    if (!beat) return;
    introThinkStep = step;
    introPhase = "think";
    introAdvanceAt = performance.now() + 350;
    if (beat.kind === "sofa") {
      thoughtBubble.showSofa(beat.text);
      Audio.sfx("thought");
      Audio.sfx("chime");
    } else {
      thoughtBubble.showText(beat.text, 0);
      Audio.sfx("thought");
    }
  };

  const advanceWakeThought = () => {
    if (!introActive || introPhase !== "think") return;
    if (performance.now() < introAdvanceAt) return;

    if (introThinkStep < WAKE_THOUGHTS.length) {
      showWakeThought(introThinkStep + 1);
      return;
    }

    // Last thought acknowledged - hop out of bed, then speak.
    if (!introBounced) {
      introBounced = true;
      introPhase = "bounce";
      introPostBounceT = 0;
      bounceOutOfBed();
    }
  };

  const beginWakeSpeech = () => {
    thoughtBubble.hide();
    Audio.sfx("interact");
    dialogue.setOnClosed(() => {
      if (!menu.isOpen()) releaseEngagedNpc();
      if (introActive && introPhase === "speak") {
        // finishWakeIntro installs its own onClosed for the hiring journal card.
        finishWakeIntro();
        return;
      }
      dialogue.setOnClosed(() => {
        if (!menu.isOpen()) releaseEngagedNpc();
      });
    });
    const name = state.playerName;
    state.showDialogue(
      "player",
      name,
      "If I'm going to call this home, I need furniture - starting with somewhere to actually sit.",
    );
    state.showDialogue(
      "player",
      name,
      "Furniture costs money, though. Let's see who's hiring.",
    );
  };

  const startWakeIntro = () => {
    introActive = true;
    introPhase = "lie";
    introT = 0;
    introThinkStep = 0;
    introAdvanceAt = 0;
    introPostBounceT = 0;
    introBounced = false;
    introSpoke = false;
    introLanded = false;
    player.setPose("lie");
    player.setWalking(false);
    playerPath = [];
    onArrive = null;
    Audio.sfx("birds");
  };

  /** Arrival story wash, then the bed wake cutscene. */
  const startArrivalPrologue = () => {
    introActive = true;
    // Match the story's "until morning" beat when the wash lifts.
    state.dayTime = MORNING_TIME;
    app.renderer.setDayTime(MORNING_TIME);
    player.setPose("lie");
    player.setWalking(false);
    playerPath = [];
    onArrive = null;
    Audio.playMusic("story");
    // Brief hold on the shared night curtain after the create→world fade,
    // then ease the storybook content in.
    window.setTimeout(() => {
      if (!introActive || !storyPrologue) return;
      storyPrologue.play({
        lines: arrivalPrologueLines(state.playerName, state.playerLook.sex),
        onDone: () => {
          // Keep the quieter story bed through the wake cutscene - switching to
          // the denser world theme here was burying rustle/stretch/yawn/thought.
          startWakeIntro();
        },
      });
    }, 320);
  };

  /** Advance wake cutscene from real frame time (not wall-clock timeouts). */
  const tickWakeIntro = (dt: number) => {
    if (!introActive || introPhase === "done" || introPhase === "speak") return;

    // Thought beats wait for click / Space - don't auto-advance.
    if (introPhase === "think") return;

    if (introPhase === "bounce") {
      introPostBounceT += dt;
      if (!introLanded && introPostBounceT >= 0.2) {
        introLanded = true;
        Audio.sfx("thud");
      }
      if (introPostBounceT >= 1.35 && !introSpoke) {
        introSpoke = true;
        introPhase = "speak";
        beginWakeSpeech();
      }
      return;
    }

    introT += dt;

    if (introT >= 1.05 && introPhase === "lie") {
      introPhase = "sit";
      player.setPose("sit");
      Audio.sfx("rustle");
    }
    if (introT >= 1.85 && (introPhase === "sit" || introPhase === "lie")) {
      introPhase = "stretch";
      player.playStretch();
      Audio.sfx("stretch");
    }
    if (introT >= 2.9 && introPhase === "stretch") {
      introPhase = "yawn";
      player.playYawn();
      Audio.sfx("yawn");
    }
    // First thought appears after the yawn; further beats are click-to-advance.
    if (introT >= 3.9 && introThinkStep < 1) {
      showWakeThought(1);
    }
  };

  const onIntroAdvancePointer = (e: PointerEvent) => {
    if (!introActive || introPhase !== "think") return;
    const t = e.target as Element | null;
    if (t?.closest?.(".ll-mute, .ll-dialogue-wrap")) return;
    advanceWakeThought();
  };

  return {
    id: "world",
    mount(root) {
      Audio.playMusic(
        !isContinue ? "story" : state.jobActive ? "work" : "world",
      );
      root.innerHTML = `<div class="ll-world-ui"></div>${muteButtonHtml()}`;
      const ui = root.querySelector(".ll-world-ui") as HTMLElement;
      unMute = wireMute(root.querySelector(".ll-mute") as HTMLElement);

      // Opaque curtain first so the village never flashes before the story.
      storyPrologue = new StoryPrologue(ui);
      if (!isContinue) storyPrologue.cover();

      map = createTownMap();
      state.harvestNodes = map.harvestNodes;
      baseCollision = map.collision.map((row) => [...row]);
      collision = baseCollision.map((row) => [...row]);
      app.renderer.buildWorld(map, state.playerName);

      player = createActor(state.playerLook);
      if (!isContinue) {
        // Wake on the starter bed (collision blocks bed tiles - skip nearestWalkable).
        const home = LOTS.find((l) => l.id === "home")!;
        const bedTx = home.tx + 2;
        const bedTy = home.ty + 1;
        playerX = (bedTx + 1) * TILE;
        playerZ = (bedTy + 1) * TILE;
        player.setPosition(playerX, playerZ);
        player.setFacing("down");
        player.setPose("lie");
      } else {
        const spawn = {
          x: Math.floor(state.playerX / TILE),
          y: Math.floor(state.playerY / TILE),
        };
        const safeSpawn =
          nearestWalkable(collision, spawn, MAP_W, MAP_H, 4) ?? spawn;
        playerX = safeSpawn.x * TILE + TILE / 2;
        playerZ = safeSpawn.y * TILE + TILE / 2;
        player.setPosition(playerX, playerZ);
      }
      app.renderer.add(player.root);

      for (const f of state.furniture) spawnFurniture(f);
      {
        const built = buildHarvestMeshes(state.harvestNodes);
        app.renderer.add(built.group);
        harvestHandles.clear();
        for (const h of built.handles) harvestHandles.set(h.uid, h);
        syncHarvestVisuals();
        syncForageVisuals();
        syncPorchVisuals();
        syncQuestItemVisuals();
      }
      for (const key of state.walls) {
        const [tx, ty] = key.split(",").map(Number);
        addWall(tx, ty);
      }
      for (const [key, paint] of state.floors.entries()) {
        const [tx, ty] = key.split(",").map(Number);
        addFloor(tx, ty, paint.variant, paint.rot);
      }
      rebuildCollision();

      npcs = [
        ...NPCS.map((def) => {
          const actor = createNpcActor(def.color);
          actor.root.userData.npcId = def.id;
          const homeLot = LOTS.find((l) => l.id === "home")!;
          const spawnTx = state.isRoommate(def.id)
            ? homeLot.tx + 2 + Math.floor(Math.random() * (homeLot.tw - 4))
            : def.spawnTx;
          const spawnTy = state.isRoommate(def.id)
            ? homeLot.ty + 2 + Math.floor(Math.random() * (homeLot.th - 4))
            : def.spawnTy;
          const stand = snapNpcStand(spawnTx, spawnTy);
          const x = stand.x * TILE + TILE / 2;
          const z = stand.y * TILE + TILE / 2;
          actor.setPosition(x, z);
          app.renderer.add(actor.root);
          return {
            id: def.id,
            actor,
            dir: "down" as Dir,
            path: [],
            waitUntil: 0,
          };
        }),
        ...AMBIENT_NPCS.map((def) => {
          const actor = createActor(def.look);
          actor.root.userData.npcId = def.id;
          const seated = def.pose === "sit";
          const tile = seated
            ? { x: def.spawnTx, y: def.spawnTy }
            : snapNpcStand(def.spawnTx, def.spawnTy);
          const x = tile.x * TILE + TILE / 2;
          const z = tile.y * TILE + TILE / 2;
          actor.setPosition(x, z);
          actor.setFacing(def.facing);
          actor.setWalking(false);
          if (seated) {
            actor.setPose("sit", { sitStyle: def.sitStyle ?? "couch" });
          }
          app.renderer.add(actor.root);
          return {
            id: def.id,
            actor,
            dir: def.facing,
            path: [],
            // Seated patrons stay put; street hangabouts stroll after a short idle.
            waitUntil: seated
              ? Number.POSITIVE_INFINITY
              : performance.now() + 800 + Math.random() * 2800,
            ambient: true,
            seated,
            homeTx: tile.x,
            homeTy: tile.y,
            wanderR: 3,
          };
        }),
      ];
      villageAnimals = VILLAGE_ANIMALS.map((def) => {
        const stand = snapNpcStand(def.spawnTx, def.spawnTy);
        const handle = createPet({
          id: def.id,
          name: def.name,
          species: def.species,
          color: def.color,
          accent: def.accent,
          traits: [],
          fee: 0,
        });
        handle.setPosition(
          stand.x * TILE + TILE / 2,
          stand.y * TILE + TILE / 2,
        );
        handle.setWalking(false);
        handle.setFacingRight(Math.random() > 0.5);
        app.renderer.add(handle.root);
        return {
          id: def.id,
          handle,
          path: [],
          waitUntil: performance.now() + Math.random() * 3500,
          homeTx: stand.x,
          homeTy: stand.y,
          wanderR: def.wanderRadius,
        };
      });
      syncPet();

      hud = new Hud(
        ui,
        state,
        () => quests.getTracker(),
        () => aspirations.getTracker(),
        (toolId) => {
          celebrateToolPurchase(toolId);
        },
        () => {
          const beat = beatForDay(state.dayIndex);
          if (!beat || state.weeklyBeatDay === state.dayIndex) return;
          const t = lotDoorWorld(beat.lotId);
          if (!t) return;
          Audio.sfx("ui");
          hintArrow?.showAt(t.x, t.z, beat.place, 7000);
        },
      );
      dialogue = new DialogueBox(ui);
      dialogue.setPlayerLook(state.playerLook);
      dialogue.setOnClosed(() => {
        if (!menu.isOpen()) releaseEngagedNpc();
        flushSideQuestCelebration();
      });
      nametags = new NpcNameTags(ui);
      buildingTags = new BuildingNameTags(ui, state.playerName);
      thoughtBubble = new ThoughtBubble(ui);
      thoughtBubble.onVisibilityChange = syncThoughtGate;
      hintArrow = new HintArrow(ui);
      interactTip = new InteractTip(ui);
      interactTip.setOnAction(() => activateTipTarget());
      timeMontage = new TimeMontage(ui);
      confetti = new ConfettiBurst(ui);
      payCelebration = new PayCelebration(ui);
      momentCelebration = new MomentCelebration(ui);
      quests.onQuestComplete((def, meta) => {
        if (def.side) {
          queueSideQuestCelebration(def, meta.unlockFurniture);
          return;
        }
        queueSofaAffordCelebration();
      });
      giftHandoff = new GiftHandoffCard(ui);
      wetTrail = new WetTrail(
        (o) => app.renderer.add(o),
        (o) => app.renderer.remove(o),
        (x, z) => {
          const lot = lotAtTile(Math.floor(x / TILE), Math.floor(z / TILE));
          // Building lots have a floor plinth (top ≈ y=2); parks are outdoor turf.
          if (lot && lot.id !== "park" && lot.id !== "playpark" && lot.id !== "pier" && lot.id !== "forest" && lot.id !== "mine") {
            return WET_TRAIL_INDOOR_Y;
          }
          return WET_TRAIL_OUTDOOR_Y;
        },
      );
      lootBurst = new LootBurst(
        (o) => app.renderer.add(o),
        (o) => app.renderer.remove(o),
        () => ({ x: playerX, y: 14, z: playerZ }),
      );
      giftToss = new GiftToss(
        (o) => app.renderer.add(o),
        (o) => app.renderer.remove(o),
      );
      ambientAtmosphere = new AmbientAtmosphere(
        (o) => app.renderer.add(o),
        (o) => app.renderer.remove(o),
      );
      app.renderer.setWeather(state.weather);
      app.renderer.setDayTime(state.dayTime);
      workMini = new WorkMinigame(ui);
      playMini = new PlayMinigame(ui);
      craftModal = new CraftModal(ui, state);
      boardModal = new TownBoardModal(ui, state, townBoard);
      tvViewer = new TvViewer(ui);
      menu = new InteractionMenu(ui);
      menu.setPlayerLook(state.playerLook);
      menu.setOnDismiss(() => {
        if (!dialogue.isOpen() && !state.isBusy()) releaseEngagedNpc();
      });
      buildFeedback = new BuildFeedback(app.renderer);
      catalog = new BuildCatalog(ui, state, () => {
        if (heldFurniture && state.selectedBuildItem) {
          restoreHeldFurniture();
          state.showToast("Put previous item back - placing from catalog");
        }
        // Buying from catalog clears hover-select so place ghost can show
        lastBuildPickedUid = null;
        if (!lastBuildTile) {
          lastBuildTile = {
            tx: Math.floor(playerX / TILE),
            ty: Math.floor(playerZ / TILE),
          };
        }
        if (state.selectedBuildItem) {
          const def = furnitureById[state.selectedBuildItem];
          const rugNote = def?.floorCovering
            ? " · sits under furniture"
            : "";
          const surfaceNote = def?.placeOnSurface
            ? " · click a table or counter"
            : def?.allowsSurface
              ? " · floor or table"
              : "";
          state.showToast(
            `${def?.name ?? "Item"} ready - R to rotate, click to place${surfaceNote}${rugNote}`,
          );
        } else if (state.buildTool === "floor" && state.selectedFloorStyle) {
          const style = floorStyleById[state.selectedFloorStyle];
          state.showToast(
            `${style?.name ?? "Floor"} ready - click tiles · R rotates pattern`,
          );
        }
        updateGhost();
      });

      // Catch money from shops / aspirations / saves that already cross the sofa price.
      queueSofaAffordCelebration();

      // Flush any quest journal lines queued during bootstrap.
      const starterLines = state.takeDialogueBatch();
      if (starterLines.length) dialogue.say(starterLines);
      lastDialogueSeq = state.dialogueSeq;

      app.canvas.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerdown", onIntroAdvancePointer, true);

      onPointerMove = (e: PointerEvent) => {
        if (state.mode !== "build") {
          lastBuildTile = null;
          lastBuildPickedUid = null;
          buildFeedback?.clear();

          // Live-mode character hover for name tooltips
          if (
            state.mode === "live" &&
            !introActive &&
            !overUi(e.clientX, e.clientY)
          ) {
            const rect = app.canvas.getBoundingClientRect();
            const npcRoots = npcs.map((n) => n.actor.root);
            const hit = app.renderer.pickFrom(
              e.clientX,
              e.clientY,
              rect,
              npcRoots,
            );
            let id: string | null = null;
            let cur: THREE.Object3D | null = hit;
            while (cur) {
              const npcId = cur.userData.npcId as string | undefined;
              if (npcId) {
                id = npcId;
                break;
              }
              cur = cur.parent;
            }
            hoveredNpcId = id;
          } else {
            hoveredNpcId = null;
          }
          return;
        }
        hoveredNpcId = null;
        // Don't update hover while over catalog buttons
        if (catalog.containsPoint(e.clientX, e.clientY)) return;
        if (hud.containsHudCluster(e.clientX, e.clientY)) return;

        const rect = app.canvas.getBoundingClientRect();
        const tile = app.renderer.pickTile(e.clientX, e.clientY, rect);
        if (!tile) return;

        const hitMesh =
          state.buildTool === "furniture" || state.buildTool === "sell"
            ? app.renderer.pickFrom(
                e.clientX,
                e.clientY,
                rect,
                buildFurniturePickables(),
              )
            : null;
        lastBuildTile = tile;
        lastBuildPickedUid =
          (hitMesh?.userData.uid as string | undefined) ?? null;
        updateGhost();
      };
      app.canvas.addEventListener("pointermove", onPointerMove);
      app.canvas.addEventListener("pointerleave", () => {
        hoveredNpcId = null;
      });

      onWheel = (e: WheelEvent) => {
        // Eat pinch gestures over the stage so Chrome can't page-zoom.
        // Camera zoom is cinematic-only - no manual pinch / scroll zoom.
        if (!(e.ctrlKey || e.metaKey)) return;

        const stage = document.getElementById("stage");
        const overStage = !!stage && (() => {
          const r = stage.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          );
        })();
        if (!overStage) return;

        e.preventDefault();
      };
      window.addEventListener("wheel", onWheel, { passive: false, capture: true });

      app.renderer.setZoom(1);
      app.renderer.setFollow(playerX, playerZ);

      if (!isContinue) {
        startArrivalPrologue();
      } else {
        think("Home again - welcome back.", 3600);
      }
    },

    unmount() {
      introActive = false;
      app.canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerdown", onIntroAdvancePointer, true);
      if (onPointerMove)
        app.canvas.removeEventListener("pointermove", onPointerMove);
      if (onWheel) app.canvas.removeEventListener("wheel", onWheel);
      if (onWheel) window.removeEventListener("wheel", onWheel, true);
      unMute?.();
      hud?.destroy();
      dialogue?.destroy();
      nametags?.destroy();
      buildingTags?.destroy();
      thoughtBubble?.destroy();
      state.setToastHeld(false);
      hintArrow?.destroy();
      interactTip?.destroy();
      timeMontage?.destroy();
      timeScrub = null;
      workMini?.destroy();
      playMini?.destroy();
      craftModal?.destroy();
      boardModal?.destroy();
      cancelPlayRide();
      tvViewer?.destroy();
      confetti?.destroy();
      payCelebration?.destroy();
      momentCelebration?.destroy();
      quests.onQuestComplete(null);
      pendingSideQuestCelebration = null;
      giftHandoff?.destroy();
      storyPrologue?.destroy();
      wetTrail?.dispose();
      wetTrail = null;
      lootBurst?.dispose();
      lootBurst = null;
      giftToss?.dispose();
      giftToss = null;
      ambientAtmosphere?.dispose();
      ambientAtmosphere = null;
      Audio.setAmbience("none");
      clearPorchMeshes();
      clearQuestItemMeshes();
      hoveredNpcId = null;
      interactTip?.hide();
      menu?.destroy();
      catalog?.destroy();

      app.renderer.remove(player.root);
      player.dispose();
      for (const npc of npcs) {
        app.renderer.remove(npc.actor.root);
        npc.actor.dispose();
      }
      for (const animal of villageAnimals) {
        app.renderer.remove(animal.handle.root);
        animal.handle.dispose();
      }
      villageAnimals = [];
      if (pet) {
        app.renderer.remove(pet.root);
        pet.dispose();
      }
      for (const m of furnitureMeshes.values()) app.renderer.remove(m);
      for (const m of wallMeshes.values()) app.renderer.remove(m);
      for (const m of floorMeshes.values()) app.renderer.remove(m);
      furnitureMeshes.clear();
      wallMeshes.clear();
      floorMeshes.clear();
      app.renderer.setGhost(null);
      app.renderer.setGridVisible(false);
      app.renderer.setZoom(1);
      wasFocusZoom = false;
    },

    update(dt: number) {
      const freezeClock =
        introActive ||
        !!timeMontage?.isPlaying() ||
        !!workMini?.isOpen() ||
        !!playMini?.isOpen() ||
        !!tvViewer?.isOpen() ||
        !!craftModal?.isOpen() ||
        !!boardModal?.isOpen() ||
        !!timeScrub;
      if (!freezeClock) {
        state.dayTime = (state.dayTime + dt / (14 * 60)) % 1;
      }
      tickTimeScrub(dt);
      if (introActive) tickWakeIntro(dt);
      if (state.mode === "live") {
        state.needs = decayNeedsWithTraits(
          state.needs,
          state.playerTraits,
          state.dayTime,
          freezeClock ? 0 : dt,
          playerAtHome(),
        );
        if (!freezeClock) {
          tickNeedDrama(
            state,
            performance.now(),
            (ms) => {
              delayed(ms, () => {
                think(applyCollapseRecovery(state));
              });
            },
            () => {
              player.playBlush();
              wetFaceUntil = performance.now() + 3200;
              wetTrail?.splash(playerX, playerZ);
              Audio.sfx("deny");
            },
            (msg) => think(msg),
          );
        }
      }
      if (state.adoptedPet) {
        const p = state.adoptedPet;
        p.needs.hunger = clampNeed(p.needs.hunger - 0.06 * dt);
        p.needs.energy = clampNeed(p.needs.energy - 0.04 * dt);
        p.needs.fun = clampNeed(p.needs.fun - 0.055 * dt);
      }

      app.renderer.setWeather(state.weather);
      app.renderer.setDayTime(state.dayTime);

      // Hotkeys - Space advances wake thoughts, else E / Space walk-to-interact.
      if (
        introActive &&
        introPhase === "think" &&
        (justPressed("Space") || justPressed("Enter"))
      ) {
        advanceWakeThought();
      } else if (
        !dialogue?.isOpen() &&
        !menu?.isOpen() &&
        (justPressed("KeyE") || justPressed("Space")) &&
        tryInteractNearby()
      ) {
        // Handled.
      } else if (
        !introActive &&
        !timeMontage?.isPlaying() &&
        !workMini?.isOpen() &&
        !playMini?.isOpen() &&
        !tvViewer?.isOpen() &&
        justPressed("KeyB") &&
        !dialogue.isOpen()
      ) {
        toggleBuild();
      }
      if (!introActive && justPressed("KeyQ") && !dialogue.isOpen()) saveGame();
      if (
        !introActive &&
        justPressed("KeyI") &&
        state.mode === "live" &&
        !dialogue.isOpen() &&
        !menu.isOpen() &&
        !timeMontage?.isPlaying() &&
        !workMini?.isOpen() &&
        !playMini?.isOpen() &&
        !tvViewer?.isOpen()
      ) {
        hud.toggleInventory();
      }
      if (
        !introActive &&
        justPressed("Tab") &&
        state.mode === "build" &&
        !menu.isOpen() &&
        !dialogue.isOpen() &&
        !hud.isAnyModalOpen()
      ) {
        catalog.toggle();
      }
      if (
        !introActive &&
        justPressed("KeyR") &&
        state.mode === "build" &&
        (state.buildTool === "furniture" || state.buildTool === "floor") &&
        !dialogue.isOpen()
      ) {
        if (state.buildTool === "floor") {
          if (!state.selectedFloorStyle) {
            state.showToast("Pick a floor style from the catalog to rotate");
          } else {
            placeRot = rotateDir(placeRot);
            Audio.sfx("rotate");
            state.showToast(`Floor pattern facing ${placeRot}`);
            updateGhost();
          }
        } else if (heldFurniture || state.selectedBuildItem) {
          // Rotate held piece or catalog preview - clear hover-select so ghost shows
          placeRot = rotateDir(placeRot);
          lastBuildPickedUid = null;
          if (!lastBuildTile) {
            lastBuildTile = {
              tx: Math.floor(playerX / TILE),
              ty: Math.floor(playerZ / TILE),
            };
          }
          updateGhost();
          Audio.sfx("rotate");
          state.showToast(`Facing ${placeRot}`);
        } else {
          state.showToast("Pick up furniture or a catalog item to rotate");
        }
      }
      // Wake thoughts: click also advances (Space / Enter handled above).
      // Space / Enter / Esc for dialogue are handled inside DialogueBox
      if (!introActive && justPressed("Escape") && !dialogue.isOpen()) {
        if (hud.isShopOpen()) {
          hud.closeShop();
        } else if (hud.isInventoryOpen()) {
          hud.closeInventory();
        } else if (hud.isStatusOpen()) {
          hud.closeStatus();
        } else if (menu.isOpen()) {
          menu.close();
        } else if (state.mode === "build" && catalog.isVisible()) {
          catalog.hide();
          Audio.sfx("ui");
        } else if (state.mode === "build" && heldFurniture) {
          restoreHeldFurniture();
          buildFeedback?.clear();
          Audio.sfx("ui");
          state.showToast("Put back where it was");
          catalog.rebuild();
          updateGhost();
        } else if (state.mode === "build") toggleBuild();
        else {
          saveGame();
          goto("title");
          return;
        }
      }

      // Movement
      if (treeBumpCooldown > 0) treeBumpCooldown = Math.max(0, treeBumpCooldown - dt);
      if (treeBumpVelX !== 0 || treeBumpVelZ !== 0) {
        const bx = playerX + treeBumpVelX * dt;
        const bz = playerZ + treeBumpVelZ * dt;
        if (canStand(bx, playerZ)) playerX = bx;
        if (canStand(playerX, bz)) playerZ = bz;
        const damp = Math.exp(-9 * dt);
        treeBumpVelX *= damp;
        treeBumpVelZ *= damp;
        if (Math.hypot(treeBumpVelX, treeBumpVelZ) < 12) {
          treeBumpVelX = 0;
          treeBumpVelZ = 0;
        }
      }
      if (
        !introActive &&
        !timeMontage?.isPlaying() &&
        !workMini?.isOpen() &&
        !playMini?.isOpen() &&
        !tvViewer?.isOpen() &&
        !timeScrub &&
        state.mode === "live" &&
        !state.isBusy() &&
        !menu.isOpen() &&
        !dialogue.isOpen() &&
        !hud.isAnyModalOpen()
      ) {
        let vx = 0;
        let vz = 0;
        if (app.isDown("KeyA") || app.isDown("ArrowLeft")) vx -= 1;
        if (app.isDown("KeyD") || app.isDown("ArrowRight")) vx += 1;
        if (app.isDown("KeyW") || app.isDown("ArrowUp")) vz -= 1;
        if (app.isDown("KeyS") || app.isDown("ArrowDown")) vz += 1;

        if (vx !== 0 || vz !== 0) {
          playerPath = [];
          onArrive = null;
          const len = Math.hypot(vx, vz) || 1;
          const step = walkSpeed() * dt;
          const nx = playerX + (vx / len) * step;
          const nz = playerZ + (vz / len) * step;
          let movedX = vx !== 0 && canStand(nx, playerZ);
          let movedZ = vz !== 0 && canStand(playerX, nz);
          if (movedX) playerX = nx;
          if (movedZ) playerZ = nz;
          if ((vx !== 0 && !movedX) || (vz !== 0 && !movedZ)) {
            slideIntoGap(vx, vz, step);
            if (vx !== 0 && !movedX && canStand(nx, playerZ)) {
              playerX = nx;
              movedX = true;
            }
            if (vz !== 0 && !movedZ && canStand(playerX, nz)) {
              playerZ = nz;
              movedZ = true;
            }
          }
          // Walked into a tree? Boing + bounce back.
          if ((vx !== 0 && !movedX) || (vz !== 0 && !movedZ)) {
            const hitX =
              vx !== 0 && !movedX ? treeBlockingStand(nx, playerZ) : null;
            const hitZ =
              vz !== 0 && !movedZ ? treeBlockingStand(playerX, nz) : null;
            const hitUid = hitX ?? hitZ;
            if (hitUid) {
              bounceOffTree(
                hitUid,
                hitX ? -Math.sign(vx) : 0,
                hitZ ? -Math.sign(vz) : 0,
              );
            }
          }
          if (Math.abs(vx) > Math.abs(vz))
            playerDir = vx > 0 ? "right" : "left";
          else playerDir = vz > 0 ? "down" : "up";
          player.setFacing(playerDir);
          player.setWalking(true);
          Audio.sfx("step");
        } else if (playerPath.length > 0) {
          const next = playerPath[0];
          const tx = next.x * TILE + TILE / 2;
          const tz = next.y * TILE + TILE / 2;
          const dx = tx - playerX;
          const dz = tz - playerZ;
          const dist = Math.hypot(dx, dz);
          const step = walkSpeed() * dt;
          if (dist <= step) {
            playerX = tx;
            playerZ = tz;
            playerPath.shift();
            if (playerPath.length === 0) {
              player.setWalking(false);
              const done = onArrive;
              onArrive = null;
              done?.();
            }
          } else {
            playerX += (dx / dist) * step;
            playerZ += (dz / dist) * step;
            if (Math.abs(dx) > Math.abs(dz))
              playerDir = dx > 0 ? "right" : "left";
            else playerDir = dz > 0 ? "down" : "up";
            player.setFacing(playerDir);
            player.setWalking(true);
            Audio.sfx("step");
          }
        } else {
          player.setWalking(false);
        }
      } else {
        player.setWalking(false);
      }

      player.setPosition(playerX, playerZ);
      player.update(dt);
      updateHarvestAnim();
      updateTreeBumpWobble(dt);
      state.playerX = playerX;
      state.playerY = playerZ;
      wetTrail?.update(dt, playerX, playerZ, state.isWet);
      lootBurst?.update(dt);
      giftToss?.update(dt);
      ambientAtmosphere?.update(
        dt,
        state.dayTime,
        playerX,
        playerZ,
        !app.renderer.isIndoors(),
        state.weather,
        app.renderer.getFrustumSize(),
        app.renderer.getViewAspect(),
      );
      Audio.setAmbience(
        !app.renderer.isIndoors() && state.weather === "rain" ? "rain" : "none",
      );

      // Boss / hire NPC walk-up (write-ups, first-day welcome).
      tickUnfinishedShiftClosing();
      tickBossApproach();

      // NPCs
      const now = performance.now();
      const conversationOpen = dialogue.isOpen() || menu.isOpen();
      for (const npc of npcs) {
        if (npc.leftForDay) {
          npc.actor.setWalking(false);
          continue;
        }

        // Closing-time exit: stand on a stagger, then path out the door.
        if (npc.leavingClosing) {
          if (npc.seated) {
            if (now < npc.waitUntil) {
              npc.actor.setWalking(false);
              npc.actor.update(dt);
              continue;
            }
            npc.seated = false;
            npc.actor.setPose("stand");
          }
          if (npc.id === engagedNpcId) {
            npc.path = [];
            npc.actor.setWalking(false);
            faceNpcTowardPlayer(npc);
            npc.actor.update(dt);
            continue;
          }
          if (conversationOpen && !shiftClosing) {
            npc.path = [];
            npc.actor.setWalking(false);
            npc.actor.update(dt);
            continue;
          }
          if (npc.path.length === 0) {
            if (now < npc.waitUntil) {
              npc.actor.setWalking(false);
              npc.actor.update(dt);
              continue;
            }
            const lotId = shiftClosing?.lotId;
            const goals = lotId ? closingExitGoals(lotId, npc.id) : [];
            if (goals.length === 0) {
              finishPatronLeave(npc);
              continue;
            }
            const p = npc.actor.getPosition();
            const start = {
              x: Math.floor(p.x / TILE),
              y: Math.floor(p.z / TILE),
            };
            const path = findPathToAny(
              closingNpcBlocked(npc.id),
              start,
              goals,
              MAP_W,
              MAP_H,
            );
            if (path.length <= 1) {
              finishPatronLeave(npc);
              continue;
            }
            npc.path = path.slice(1);
          }
          const next = npc.path[0]!;
          const tx = next.x * TILE + TILE / 2;
          const tz = next.y * TILE + TILE / 2;
          const p = npc.actor.getPosition();
          const dx = tx - p.x;
          const dz = tz - p.z;
          const dist = Math.hypot(dx, dz);
          const step = 48 * dt;
          if (dist <= step) {
            npc.actor.setPosition(tx, tz);
            npc.path.shift();
            if (npc.path.length === 0) {
              finishPatronLeave(npc);
              continue;
            }
          } else {
            npc.actor.setPosition(
              p.x + (dx / dist) * step,
              p.z + (dz / dist) * step,
            );
            if (Math.abs(dx) > Math.abs(dz))
              npc.dir = dx > 0 ? "right" : "left";
            else npc.dir = dz > 0 ? "down" : "up";
            npc.actor.setFacing(npc.dir);
            npc.actor.setWalking(true);
          }
          npc.actor.update(dt);
          continue;
        }

        // Seated hangabouts stay on their chair.
        if (npc.seated) {
          npc.actor.setWalking(false);
          if (npc.id === engagedNpcId) faceNpcTowardPlayer(npc);
          npc.actor.update(dt);
          continue;
        }
        // Stay put while engaged in conversation.
        if (npc.id === engagedNpcId) {
          npc.path = [];
          npc.actor.setWalking(false);
          faceNpcTowardPlayer(npc);
          npc.actor.update(dt);
          continue;
        }
        // Other NPCs freeze during menus; a seeking boss keeps walking.
        if (conversationOpen && !npc.seekingPlayer) {
          npc.path = [];
          npc.actor.setWalking(false);
          npc.actor.update(dt);
          continue;
        }
        if (!npc.seekingPlayer && now < npc.waitUntil) {
          npc.actor.setWalking(false);
          npc.actor.update(dt);
          continue;
        }
        if (npc.path.length === 0) {
          if (npc.seekingPlayer) {
            npc.actor.setWalking(false);
            npc.actor.update(dt);
            continue;
          }
          npc.waitUntil = now + 1600 + Math.random() * 2800;
          const standBlocked = npcStandBlocked();
          let walkable: GridPos | null = null;

          if (npc.ambient) {
            // Street hangabouts pottering near their corner.
            walkable = pickLocalWanderGoal(
              npc.homeTx ?? 0,
              npc.homeTy ?? 0,
              npc.wanderR ?? 3,
              standBlocked,
            );
          } else {
            const def = NPCS.find((n) => n.id === npc.id)!;
            // Roommates linger at the player's home; others keep their schedule.
            let lotId = state.isRoommate(npc.id) ? "home" : def.homeLot;
            if (!state.isRoommate(npc.id)) {
              if (isEvening(state.dayTime) && Math.random() < 0.35) {
                lotId = "park";
              } else if (isNight(state.dayTime)) {
                lotId = def.homeLot;
              }
            }
            const lot = LOTS.find((l) => l.id === lotId)!;
            const p = npc.actor.getPosition();
            const cx = Math.floor(p.x / TILE);
            const cy = Math.floor(p.z / TILE);
            // Short local stroll inside the lot (not a cross-lot trek).
            const r = 3;
            const goal = {
              x: Math.max(
                lot.tx + 1,
                Math.min(
                  lot.tx + lot.tw - 2,
                  cx + Math.floor(Math.random() * (r * 2 + 1)) - r,
                ),
              ),
              y: Math.max(
                lot.ty + 1,
                Math.min(
                  lot.ty + lot.th - 2,
                  cy + Math.floor(Math.random() * (r * 2 + 1)) - r,
                ),
              ),
            };
            walkable = nearestWalkable(standBlocked, goal, MAP_W, MAP_H, 3);
          }

          if (!walkable) continue;
          const p = npc.actor.getPosition();
          npc.path = findPathToAny(
            collision,
            { x: Math.floor(p.x / TILE), y: Math.floor(p.z / TILE) },
            [walkable],
            MAP_W,
            MAP_H,
          ).slice(1);
          continue;
        }
        const next = npc.path[0];
        const tx = next.x * TILE + TILE / 2;
        const tz = next.y * TILE + TILE / 2;
        const p = npc.actor.getPosition();
        const dx = tx - p.x;
        const dz = tz - p.z;
        const dist = Math.hypot(dx, dz);
        const step = (npc.seekingPlayer ? 70 : npc.ambient ? 42 : 55) * dt;
        if (dist <= step) {
          npc.actor.setPosition(tx, tz);
          npc.path.shift();
          if (npc.path.length === 0) npc.actor.setWalking(false);
        } else {
          npc.actor.setPosition(p.x + (dx / dist) * step, p.z + (dz / dist) * step);
          if (Math.abs(dx) > Math.abs(dz))
            npc.dir = dx > 0 ? "right" : "left";
          else npc.dir = dz > 0 ? "down" : "up";
          npc.actor.setFacing(npc.dir);
          npc.actor.setWalking(true);
        }
        npc.actor.update(dt);
      }

      // Village animals pottering around town.
      for (const animal of villageAnimals) {
        if (conversationOpen || now < animal.waitUntil) {
          animal.handle.setWalking(false);
          animal.handle.update(dt);
          continue;
        }
        if (animal.path.length === 0) {
          animal.waitUntil = now + 2200 + Math.random() * 4200;
          const goal = pickLocalWanderGoal(
            animal.homeTx,
            animal.homeTy,
            animal.wanderR,
            collision,
          );
          if (!goal) continue;
          const p = animal.handle.getPosition();
          animal.path = findPathToAny(
            collision,
            { x: Math.floor(p.x / TILE), y: Math.floor(p.z / TILE) },
            [goal],
            MAP_W,
            MAP_H,
          ).slice(1);
          continue;
        }
        const next = animal.path[0]!;
        const tx = next.x * TILE + TILE / 2;
        const tz = next.y * TILE + TILE / 2;
        const p = animal.handle.getPosition();
        const dx = tx - p.x;
        const dz = tz - p.z;
        const dist = Math.hypot(dx, dz);
        const step = 38 * dt;
        if (dist <= step) {
          animal.handle.setPosition(tx, tz);
          animal.path.shift();
          if (animal.path.length === 0) animal.handle.setWalking(false);
        } else {
          animal.handle.setPosition(
            p.x + (dx / dist) * step,
            p.z + (dz / dist) * step,
          );
          animal.handle.setFacingRight(dx >= 0);
          animal.handle.setWalking(true);
        }
        animal.handle.update(dt);
      }

      // Pet follow
      if (pet && state.adoptedPet) {
        const targetX = playerX - 22;
        const targetZ = playerZ + 6;
        const p = pet.getPosition();
        const dx = targetX - p.x;
        const dz = targetZ - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 26) {
          const speed = Math.min(150, 60 + dist) * dt;
          pet.setPosition(p.x + (dx / dist) * speed, p.z + (dz / dist) * speed);
          pet.setFacingRight(dx >= 0);
          pet.setWalking(true);
        } else {
          pet.setWalking(false);
        }
        pet.update(dt);
        const pp = pet.getPosition();
        state.adoptedPet.x = pp.x;
        state.adoptedPet.y = pp.z;
      }

      // Pull newly queued dialogue before focus so zoom doesn't flicker a frame.
      if (state.dialogueSeq !== lastDialogueSeq) {
        lastDialogueSeq = state.dialogueSeq;
        const batch = state.takeDialogueBatch();
        if (batch.length) dialogue.say(batch);
      }

      // Cinematic close-up while talking / thinking / browsing interactions.
      // Hold briefly after close so chained lines (quest → thought → reply)
      // don't zoom out and back in between sentences.
      {
        const nowFocus = performance.now();
        const wetFace = nowFocus < wetFaceUntil;
        // Build mode needs a steady wide view for placement - no cinematic lean-in.
        const wantFocus =
          state.mode !== "build" &&
          (wetFace ||
            !!thoughtBubble?.isVisible() ||
            dialogue.isOpen() ||
            menu.isOpen() ||
            !!workMini?.isOpen() ||
            !!playMini?.isOpen() ||
            !!tvViewer?.isOpen() ||
            morningBeatActive ||
            !!engagedNpcId ||
            (introActive &&
              (introPhase === "think" ||
                introPhase === "bounce" ||
                introPhase === "speak")));
        if (wantFocus) focusHoldUntil = nowFocus + 450;
        const focus = wantFocus || nowFocus < focusHoldUntil;
        if (focus !== wasFocusZoom) {
          Audio.sfx(focus ? "zoom_in" : "zoom_out");
          wasFocusZoom = focus;
        }
        if (focus) {
          if (wetFace) {
            app.renderer.beginFocusZoom(
              TownRenderer.FRUSTUM_FACE,
              TownRenderer.FACE_FRAME_Y,
            );
          } else {
            app.renderer.beginFocusZoom();
          }
        } else app.renderer.endFocusZoom();
        thoughtBubble?.setZoomed(focus);
      }

      app.renderer.update(dt, playerX, playerZ);
      if (state.dayIndex !== lastHarvestDay) {
        lastHarvestDay = state.dayIndex;
        rebuildCollision();
        syncHarvestVisuals();
        syncForageVisuals();
      }
      syncQuestItemVisuals();
      syncInteractTip();

      {
        // Wall-flush props (fridge on the hallway wall, etc.) sit on the
        // camera-near face - ghost them with their wall when you're behind.
        const indoors = !!app.renderer.buildingLotAt(playerX, playerZ);
        for (const f of state.furniture) {
          if (f.parentUid) continue;
          const def = furnitureById[f.defId];
          if (!def?.wallFlush) continue;
          const mesh = furnitureMeshes.get(f.uid);
          if (!mesh) continue;
          const want =
            indoors &&
            wallFlushObscuresPlayer(
              mesh.position.x,
              mesh.position.z,
              f.rot ?? "down",
              playerX,
              playerZ,
            );
          updateWallFlushFurnitureFade(mesh, dt, want);
        }
      }

      {
        const indoors = app.renderer.isIndoors();
        if (indoorSfxReady && indoors !== wasIndoors) {
          // Skip SFX if cinematic focus already whooshed this frame.
          if (!wasFocusZoom) Audio.sfx(indoors ? "zoom_in" : "zoom_out");
        }
        wasIndoors = indoors;
        indoorSfxReady = true;
      }

      dialogue.setPlayerLook(state.playerLook);
      dialogue.update(dt);
      hud.update();

      {
        const rect = app.canvas.getBoundingClientRect();
        const positions = new Map<string, { x: number; z: number }>();
        for (const npc of npcs) {
          if (npc.leftForDay) continue;
          positions.set(npc.id, npc.actor.getPosition());
        }
        nametags.setQuestOfferIds(quests.pendingOfferNpcIds());
        nametags.update(
          positions,
          (x, y, z) => app.renderer.projectToScreen(x, y, z, rect),
          rect.width,
          rect.height,
          hoveredNpcId,
        );
        buildingTags.update(
          (x, y, z) => app.renderer.projectToScreen(x, y, z, rect),
          rect.width,
          rect.height,
        );
        thoughtBubble?.update(
          player.getHeadWorldPos(),
          (x, y, z) => app.renderer.projectToScreen(x, y, z, rect),
          rect.width,
          rect.height,
        );
        hintArrow?.update(
          (x, y, z) => app.renderer.projectToScreen(x, y, z, rect),
          rect.width,
          rect.height,
          playerX,
          playerZ,
        );
        interactTip?.update(
          (x, y, z) => app.renderer.projectToScreen(x, y, z, rect),
          rect.width,
          rect.height,
        );
      }

      if (state.mode === "live") tickGuidanceHints();

      autosaveTimer += dt;
      if (autosaveTimer > 60) {
        autosaveTimer = 0;
        writeSave(state.toSave());
      }
    },
  };
}
