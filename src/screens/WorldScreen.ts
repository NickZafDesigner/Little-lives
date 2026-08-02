import * as THREE from "three";
import type { Screen } from "../app/ScreenRouter";
import type { App } from "../app/App";
import type { PlayerProfile } from "../data/character";
import { furnitureById } from "../data/furniture";
import {
  JOB_PROMOTIONS,
  PROMOTION_SHIFTS,
  jobById,
  jobDisplayName,
  jobPay,
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
  ambientNpcById,
  isAmbientNpcId,
  randomAmbientBeat,
  type AmbientChoice,
} from "../data/ambientNpcs";
import {
  DIALOGUE_TONES,
  NPCS,
  RELATIONSHIP_CRUSH,
  RELATIONSHIP_FRIEND,
  SOCIAL_ACTIONS,
  TONE_RECEPTIVENESS,
} from "../data/npcs";
import {
  chatScript,
  favouriteFoodNpcLine,
  friendUnlockLine,
  toneReply,
  type ChatChoice,
  type ChatNpcId,
} from "../data/dialogue";
import { petById } from "../data/pets";
import {
  SHIFT_TIME_ADVANCE,
  WORK_END,
  WORK_START,
  type QuestEvent,
} from "../data/quests";
import type { DialogueTone, Dir, LotId, NpcId, PlacedFurniture } from "../data/types";
import { TILE } from "../game/constants";
import { hasSave, loadSave, writeSave, clearSave } from "../save/saveLoad";
import { AspirationSystem } from "../systems/AspirationSystem";
import { beatForDay, isEvening, isNight } from "../systems/dayCycle";
import { GameState } from "../systems/GameState";
import {
  applyCollapseRecovery,
  finishSleepNight,
  tickNeedDrama,
} from "../systems/needDrama";
import { QuestSystem } from "../systems/QuestSystem";
import {
  closeFriendUnlockLine,
  crushUnlockLine,
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
import { createActor, createNpcActor, type ActorHandle } from "../mesh/actors";
import { matFlat } from "../mesh/materials";
import {
  createPet,
  furnitureFootprint,
  placeFurniture,
  type PetHandle,
} from "../mesh/furniture";
import { BuildFeedback, createPaintFloorMesh, rotateDir } from "../build/BuildFeedback";
import { signById } from "../mesh/signs";
import { Hud } from "../ui/Hud";
import { DialogueBox } from "../ui/DialogueBox";
import { NpcNameTags } from "../ui/NpcNameTags";
import { BuildingNameTags } from "../ui/BuildingNameTags";
import { ThoughtBubble } from "../ui/ThoughtBubble";
import { HintArrow } from "../ui/HintArrow";
import { BuildCatalog } from "../ui/BuildCatalog";
import { InteractionMenu, type MenuOption } from "../ui/InteractionMenu";
import { muteButtonHtml, wireMute } from "../ui/mute";
import { Audio } from "../audio/AudioManager";

interface NpcRuntime {
  id: string;
  actor: ActorHandle;
  dir: Dir;
  path: GridPos[];
  waitUntil: number;
  /** Street hangabout - stays put, reply-menu banter only. */
  ambient?: boolean;
}

type TargetKind = "furniture" | "npc" | "pet" | "sign";

interface Target {
  kind: TargetKind;
  id: string;
  label: string;
  tiles: GridPos[];
  x: number;
  z: number;
}

const WALK_SPEED = 165;

export function createWorldScreen(
  app: App,
  goto: (id: "title") => void,
  data: { continue?: boolean; profile?: PlayerProfile; fresh?: boolean },
): Screen {
  const state = new GameState();
  const quests = new QuestSystem(state);
  const aspirations = new AspirationSystem(state);
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
  let pet: PetHandle | null = null;
  let furnitureMeshes = new Map<string, THREE.Group>();
  let wallMeshes = new Map<string, THREE.Mesh>();
  let floorMeshes = new Map<string, THREE.Mesh>();
  let uidCounter = 1000;
  let hud!: Hud;
  let dialogue!: DialogueBox;
  let nametags!: NpcNameTags;
  let buildingTags!: BuildingNameTags;
  let thoughtBubble!: ThoughtBubble;
  let hintArrow!: HintArrow;
  /** NPC under the cursor in live mode (for name tooltips). */
  let hoveredNpcId: string | null = null;
  let menu!: InteractionMenu;
  let catalog!: BuildCatalog;
  /** New-game wake-up cutscene — blocks movement / menus until done. */
  let introActive = false;
  /** Edge-detect leaving home / arriving at café for guidance hints. */
  let wasAtCafe = false;
  let guidanceReady = false;
  const firedHints = new Set<string>();
  let introPhase:
    | "lie"
    | "sit"
    | "stretch"
    | "yawn"
    | "think"
    | "bounce"
    | "speak"
    | "done" = "done";
  /** Elapsed seconds in the wake cutscene (dt-driven — survives mount hitches). */
  let introT = 0;
  let introThinkShown = false;
  let introBounced = false;
  let introSpoke = false;
  let unMute: (() => void) | null = null;
  let autosaveTimer = 0;
  let lastDialogueSeq = 0;
  /** Keep cinematic zoom through brief gaps between chained dialogue lines. */
  let focusHoldUntil = 0;
  let keyLatch = new Set<string>();
  let onPointerMove: ((e: PointerEvent) => void) | null = null;
  let onWheel: ((e: WheelEvent) => void) | null = null;
  let lastBuildTile: { tx: number; ty: number } | null = null;
  let lastBuildPickedUid: string | null = null;
  /** Pending facing while placing / moving furniture. */
  let placeRot: Dir = "down";
  /** Item picked up from the house to move (removed from world until placed). */
  let heldFurniture: PlacedFurniture | null = null;
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

  const presentAmbientChoices = (npcId: string, choices: AmbientChoice[]) => {
    if (!choices.length) return;
    dialogue.offerChoices(
      choices.map((c) => ({ id: c.id, label: c.label })),
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
    if (choice.choices?.length) {
      presentAmbientChoices(npcId, choice.choices);
    }
  };

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
    if (beat.choices.length) {
      presentAmbientChoices(id, beat.choices);
    }
  };

  const playerTile = (): GridPos => ({
    x: Math.floor(playerX / TILE),
    y: Math.floor(playerZ / TILE),
  });

  const inBounds = (tx: number, ty: number) =>
    tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

  const furnitureAt = (tx: number, ty: number, lotId?: LotId) => {
    for (const f of state.furniture) {
      if (lotId && f.lotId !== lotId) continue;
      const def = furnitureById[f.defId];
      if (!def) continue;
      const { tw, th } = furnitureFootprint(f.defId, f.rot ?? "down");
      if (tx >= f.tx && ty >= f.ty && tx < f.tx + tw && ty < f.ty + th) {
        return f;
      }
    }
    return null;
  };

  const rebuildCollision = () => {
    collision = baseCollision.map((row) => [...row]);
    for (const key of state.walls) {
      const [tx, ty] = key.split(",").map(Number);
      if (inBounds(tx, ty)) collision[ty][tx] = true;
    }
    for (const f of state.furniture) {
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
  };

  const spawnFurniture = (f: PlacedFurniture) => {
    const mesh = placeFurniture(f);
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

  const addFloor = (tx: number, ty: number) => {
    const key = state.wallKey(tx, ty);
    const mesh = createPaintFloorMesh(tx, ty);
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

  const allTargets = (): Target[] => {
    const out: Target[] = [];
    for (const f of state.furniture) {
      const def = furnitureById[f.defId];
      if (!def) continue;
      const tiles: GridPos[] = [];
      for (let dy = 0; dy < def.height; dy++) {
        for (let dx = 0; dx < def.width; dx++) {
          tiles.push({ x: f.tx + dx, y: f.ty + dy });
        }
      }
      out.push({
        kind: "furniture",
        id: f.uid,
        label: def.name,
        tiles,
        x: f.tx * TILE + (def.width * TILE) / 2,
        z: f.ty * TILE + (def.height * TILE) / 2,
      });
    }
    for (const npc of npcs) {
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
    return out;
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
    for (const npc of npcs) out.push(npc.actor.root);
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
        return targets.find((t) => t.kind === "furniture" && t.id === uid) ?? null;
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
      push(t.x, t.y);
      push(t.x + 1, t.y);
      push(t.x - 1, t.y);
      push(t.x, t.y + 1);
      push(t.x, t.y - 1);
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
    introActive || !!dialogue?.isOpen() || !!menu?.isOpen();

  const fireHint = (
    id: string,
    thought: string,
    arrow?: { x: number; z: number; label: string },
  ) => {
    if (firedHints.has(id) || uiBusy()) return false;
    firedHints.add(id);
    thoughtBubble?.showText(thought);
    if (arrow) hintArrow?.showAt(arrow.x, arrow.z, arrow.label);
    Audio.sfx("chime");
    return true;
  };

  const tickGuidanceHints = () => {
    if (introActive) return;
    const tx = Math.floor(playerX / TILE);
    const ty = Math.floor(playerZ / TILE);
    const lot = playerLotId();
    const ground = map.ground[ty]?.[tx];
    // Town paths outside your lot (door mat / street) — not the yard
    const onPathOutsideHome =
      lot !== "home" &&
      (ground === Tile.path || ground === Tile.parkPath);
    const atCafe = lot === "cafe";

    // Seed café arrival edge (continue may already be mid-lot).
    if (!guidanceReady) {
      wasAtCafe = atCafe;
      guidanceReady = true;
    }

    // First time stepping onto the path outside home → point at the café
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

    // Arriving at the café before you're hired
    if (!wasAtCafe && atCafe && !state.isHired("cafe_barista")) {
      hintArrow?.hide();
      fireHint(
        "arrive_cafe_ask_jun",
        "There's Jun — ask about that Help Wanted sign!",
      );
    }

    // Hired but not yet worked a shift, and it's work hours
    if (
      state.isHired("cafe_barista") &&
      quests.isActive("first_paycheck") &&
      !atCafe &&
      state.dayTime >= WORK_START &&
      state.dayTime < WORK_END
    ) {
      const t = buildingHintTarget("cafe");
      fireHint(
        "shift_time_cafe",
        "Shift hours! Better head to the café counter.",
        { x: t.x, z: t.z, label: "Work" },
      );
    }

    wasAtCafe = atCafe;
  };

  const noteFriendshipGain = (
    npcId: string,
    result: {
      becameFriend: boolean;
      becameClose: boolean;
    },
    defName: string,
  ) => {
    if (result.becameFriend) {
      state.dailyStats.friendsMade += 1;
      Audio.sfx("success");
      state.showDialogue(
        npcId as NpcId,
        defName,
        friendUnlockLine(npcId as ChatNpcId),
      );
    } else if (result.becameClose) {
      Audio.sfx("success");
      state.showDialogue(
        npcId as NpcId,
        defName,
        closeFriendUnlockLine(npcId as ChatNpcId),
      );
    }
    aspirations.refresh();
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
      state.showToast("Can't walk there.");
      return;
    }
    const path = findPathToAny(collision, playerTile(), [goal], MAP_W, MAP_H);
    if (path.length === 0) {
      Audio.sfx("deny");
      state.showToast("No path that way.");
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
        talkToAmbient(target.id);
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
    const furn = state.furniture.find((f) => f.uid === target.id);
    if (furn) openFurnitureMenu(furn, screen.x, screen.y);
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
            state.showToast("Returns shelved!");
          });
        },
        { id: "theo" },
      );
      return;
    }

    const job = JOBS.find(
      (j) => j.lotId === furn.lotId && j.stationDefId === furn.defId,
    );
    if (job) {
      openJobMenu(job.id, x, y);
      return;
    }

    if (furn.defId === "shelter_desk") {
      openShelterMenu(x, y);
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
      if (
        quests.isActive("pip_pond") &&
        quests.currentStepId("pip_pond") === "clean"
      ) {
        const have = quests.stepProgress("pip_pond", "clean");
        options.push({
          id: "clear_litter",
          label: "Clear litter",
          sub: `Bag ${have}/2`,
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
        furn.defId === "clinic_desk")
    ) {
      options.push({
        id: "weekly_beat",
        label: `Join ${beat.title}`,
        sub: beat.blurb,
      });
    }

    const petItems = new Set(["pet_bed", "pet_bowl", "toy_ball", "yarn_ball"]);
    for (const i of def.interactions) {
      const needsPet = petItems.has(furn.defId) && Boolean(i.petNeedDeltas);
      const blocked = needsPet && !state.adoptedPet;
      const sleepLabel =
        i.id === "sleep" ? "Sleep (wake at 7 AM)" : i.label;
      options.push({
        id: i.id,
        label: sleepLabel,
        sub: blocked ? "Adopt a pet first" : describeDeltas(i.needDeltas),
        disabled: blocked,
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
        Audio.sfx("interact");
        state.startBusy(beat.title, 1400);
        delayed(1400, () => {
          state.weeklyBeatDay = state.dayIndex;
          state.needs = applyNeedDeltas(state.needs, {
            fun: beat.fun,
            social: beat.social,
          });
          Audio.sfx("success");
          state.showToast(`${beat.title} - lovely!`, 2800);
          aspirations.noteWeeklyBeat();
        });
        return;
      }
      if (id === "pick_flowers") {
        Audio.sfx("interact");
        state.startBusy("Picking wildflowers", 1100);
        delayed(1100, () => {
          Audio.sfx("success");
          state.showToast("A little bouquet of park flowers - perfect.");
          quests.emit("picked_flowers");
        });
        return;
      }
      if (id === "clear_litter") {
        Audio.sfx("interact");
        state.startBusy("Clearing litter", 1000);
        delayed(1000, () => {
          Audio.sfx("chime");
          quests.emit("park_cleanup");
          const have = quests.stepProgress("pip_pond", "clean");
          if (have >= 2) {
            state.showToast("Park looks great - Pip will be pleased!");
          } else {
            state.showToast(`Litter bagged (${have}/2). One more spot!`);
          }
        });
        return;
      }

      const interaction = def.interactions.find((i) => i.id === id);
      if (!interaction) return;
      Audio.sfx("interact");
      state.startBusy(interaction.label, interaction.durationMs);
      delayed(interaction.durationMs, () => {
        // Full sleep advances to morning
        if (interaction.id === "sleep") {
          const bonus = sleepEnergyBonus(state.playerTraits, state.dayTime);
          const summary = finishSleepNight(state, 45, bonus);
          Audio.sfx("success");
          state.showToast(summary, 3600);
          if (bonus > 0) {
            state.showDialogue(
              "player",
              state.playerName,
              hasTrait(state.playerTraits, "Night Owl")
                ? "Night Owl sleep - peak restoration."
                : "Early Bird rest - bright-eyed!",
            );
          }
          aspirations.refresh();
          return;
        }

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
        }
        state.needs = applyNeedDeltas(state.needs, mod.deltas);
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
            state.showToast(fav.toast ?? "Favourite pet bond!", 2400);
          }
          state.dailyStats.petBondGain += Math.max(0, pn.bond - beforeBond);
          state.notePetCare();
        }
        if (interaction.moneyDelta) {
          state.money += interaction.moneyDelta;
          if (interaction.moneyDelta > 0) Audio.sfx("coin");
        }
        Audio.sfx("success");
        state.showToast(
          mod.toast ?? `${interaction.label} - that's better!`,
        );
        if (
          interaction.petNeedDeltas &&
          (interaction.id === "pet_rest" ||
            interaction.id === "play_pet" ||
            interaction.id === "feed_pet")
        ) {
          quests.emit("pet_bonded");
        }
        aspirations.refresh();
      });
      },
      { id: "player", look: state.playerLook },
    );
  };

  const jobShiftEvent = (jobId: string): QuestEvent => {
    if (jobId === "market_clerk") return "market_shift_complete";
    if (jobId === "library_aide") return "library_shift_complete";
    if (jobId === "clinic_aide") return "clinic_shift_complete";
    return "shift_complete";
  };

  const openJobMenu = (jobId: string, x: number, y: number) => {
    const job = jobById[jobId];
    if (!job) return;
    if (!state.isHired(job.id)) {
      Audio.sfx("deny");
      const boss = NPCS.find((n) => n.id === job.hireNpcId);
      state.showToast(
        boss
          ? `Talk to ${boss.name} about a job first.`
          : "You need to get hired first.",
      );
      return;
    }
    const hourOk =
      state.dayTime >= WORK_START && state.dayTime < WORK_END;
    if (!state.jobActive && !hourOk) {
      Audio.sfx("deny");
      state.showToast(job.closedMessage);
      return;
    }
    if (state.jobActive && state.activeJobId && state.activeJobId !== job.id) {
      Audio.sfx("deny");
      state.showToast("Finish your current shift first.");
      return;
    }

    const promoted = state.isPromoted(job.id);
    const basePay =
      jobPay(job.id, promoted) + (state.hasUnlock("trusted_employee") ? 8 : 0);
    const mood = moodFromNeeds(state.needs);
    const payMod = jobPayMultiplier(state.playerTraits, job.id, mood);
    const estPay = Math.round(basePay * payMod.mult);

    const lot = LOTS.find((l) => l.id === job.lotId);
    const taskIdx = state.jobTasksDone;
    const taskLabel =
      job.taskLabels?.[taskIdx] ??
      (state.jobActive ? "Do a task" : "Clock in");
    const beat = beatForDay(state.dayIndex);
    const options: MenuOption[] = [
      {
        id: "shift",
        label: state.jobActive ? taskLabel : "Clock in",
        sub: state.jobActive
          ? `${state.jobTasksDone}/${job.shiftTasks} tasks · ${jobDisplayName(job.id, promoted)}`
          : `${jobDisplayName(job.id, promoted)} · ~$${estPay}`,
      },
    ];
    if (
      beat &&
      state.weeklyBeatDay !== state.dayIndex &&
      beat.lotId === job.lotId
    ) {
      options.push({
        id: "weekly_beat",
        label: `Join ${beat.title}`,
        sub: beat.blurb,
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
        Audio.sfx("interact");
        state.startBusy(beat.title, 1400);
        delayed(1400, () => {
          state.weeklyBeatDay = state.dayIndex;
          state.needs = applyNeedDeltas(state.needs, {
            fun: beat.fun,
            social: beat.social,
          });
          Audio.sfx("success");
          state.showToast(`${beat.title} — lovely!`, 2800);
          aspirations.noteWeeklyBeat();
        });
        return;
      }
      if (!state.jobActive) {
        if (!(state.dayTime >= WORK_START && state.dayTime < WORK_END)) {
          Audio.sfx("deny");
          state.showToast(job.closedMessage);
          return;
        }
        state.jobActive = true;
        state.activeJobId = job.id;
        state.jobTasksDone = 0;
        state.showToast("Shift started - keep working!");
      }
      const label =
        job.taskLabels?.[state.jobTasksDone] ?? "Working";
      Audio.sfx("interact");
      state.startBusy(label, job.durationMs);
      delayed(job.durationMs, () => {
        state.jobTasksDone += 1;
        state.needs = applyNeedDeltas(state.needs, {
          energy: -8,
          fun: -4,
          social: 6,
        });
        if (state.jobTasksDone >= job.shiftTasks) {
          const pay = Math.round(basePay * payMod.mult);
          state.money += pay;
          state.dailyStats.moneyEarned += pay;
          state.dailyStats.shiftsDone += 1;
          state.jobShiftCounts[job.id] =
            (state.jobShiftCounts[job.id] ?? 0) + 1;
          state.jobActive = false;
          state.activeJobId = null;
          state.jobTasksDone = 0;
          state.dayTime = (state.dayTime + SHIFT_TIME_ADVANCE) % 1;
          Audio.sfx("coin");
          Audio.sfx("success");
          const tip = payMod.toast ? ` ${payMod.toast}` : "";
          state.showToast(`Shift complete! You earned $${pay}.${tip}`);
          quests.emit(jobShiftEvent(job.id));
          quests.emit("any_shift_complete");
          aspirations.noteShift();

          // Promotion check
          if (
            !state.isPromoted(job.id) &&
            (state.jobShiftCounts[job.id] ?? 0) >= PROMOTION_SHIFTS
          ) {
            state.jobPromoted.push(job.id);
            const promo = JOB_PROMOTIONS[job.id];
            if (promo) {
              const boss = NPCS.find((n) => n.id === job.hireNpcId);
              state.showDialogue(
                (boss?.id ?? "player") as NpcId,
                boss?.name ?? "Boss",
                promo.bossLine,
              );
              state.showToast(`Promoted to ${promo.title}!`, 3000);
            }
          }
        } else {
          Audio.sfx("chime");
          state.showToast(
            `${label} done! ${state.jobTasksDone}/${job.shiftTasks}`,
          );
        }
      });
      },
      { id: "player", look: state.playerLook },
    );
  };

  const openNpcMenu = (target: Target, x: number, y: number) => {
    const def = NPCS.find((n) => n.id === target.id)!;
    const rel = state.relationships[def.id];
    rel.met = true;
    const npcId = def.id as ChatNpcId;
    holdNpcStill(npcId);

    if (def.id === "vera") quests.emit("met_vera");
    if (def.id === "theo") quests.emit("met_theo");
    if (def.id === "sage") quests.emit("met_sage");

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
        });
      } else {
        options.push({
          id: "shift_chat",
          label: "Ask about work",
          sub: "Hours: 9 AM - 5 PM",
        });
      }
    }

    if (def.id === "mabel" && quests.isActive("mabel_cookies")) {
      const step = quests.currentStepId("mabel_cookies");
      if (step === "ask") {
        options.push({
          id: "mabel_ask",
          label: "Offer to help",
          sub: "She might need something…",
        });
      } else if (step === "deliver") {
        options.push({
          id: "mabel_deliver",
          label: "Deliver wildflowers",
          sub: "Fresh from the park",
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
        });
      } else if (step === "deliver") {
        options.push({
          id: "sage_deliver",
          label: "Deliver supplies",
          sub: "From Vera's Market",
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
      });
    }

    for (const tone of DIALOGUE_TONES) {
      options.push({
        id: `tone_${tone.id}`,
        label: tone.label,
        sub: tone.sub,
      });
    }

    for (const a of SOCIAL_ACTIONS) {
      const cost = "cost" in a ? a.cost : undefined;
      const minScore = "minScore" in a ? a.minScore : undefined;
      const tooPoor = cost !== undefined && state.money < cost;
      const locked = minScore !== undefined && rel.score < minScore;
      const socialBlock = socialBlockedReason(state.needs);
      const tired = a.id === "hangout" && socialBlock !== null;
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

    const socialBlock = socialBlockedReason(state.needs);
    const tier = tierFromScore(
      rel.score,
      rel.met,
      state.flirtCounts[npcId] ?? 0,
    );
    if (tier === "close" || tier === "crush") {
      const exclusive = EXCLUSIVE_HANGOUTS[npcId];
      options.push({
        id: exclusive.id,
        label: exclusive.label,
        sub: socialBlock ?? exclusive.sub,
        disabled: socialBlock !== null,
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
          startChat(npcId, def.name);
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
            if (toast) state.showToast(toast);
            noteFriendshipGain(npcId, result, def.name);
          });
          return;
        }
        if (id === "ask_job" && hireJob) {
          Audio.sfx("talk");
          state.startBusy("Asking about work", 1200);
          delayed(1200, () => {
            state.hire(hireJob.id);
            Audio.sfx("success");
            const hireLines: Record<string, string> = {
              cafe_barista: "You're hired! Counter's yours - but only 9 to 5!",
              market_clerk:
                "Fine. You can clerk - don't break the jam jars. 9 to 5.",
              library_aide:
                "Very well. Aide hours are 9 to 5. Soft voices, please.",
              clinic_aide:
                "I'd welcome the help. Clinic shifts run 9 to 5.",
            };
            state.showDialogue(
              npcId,
              def.name,
              hireLines[hireJob.id] ?? "You're hired. 9 to 5.",
            );
            if (hireJob.id === "cafe_barista") quests.emit("talked_jun_job");
            if (hireJob.id === "market_clerk") quests.emit("talked_vera_job");
            if (hireJob.id === "library_aide") quests.emit("talked_theo_job");
            if (hireJob.id === "clinic_aide") quests.emit("talked_sage_job");
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
          state.showToast("Clinic kit purchased - take it to Sage!");
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

        if (id.startsWith("tone_")) {
          const tone = id.slice(5) as DialogueTone;
          const toneDef = DIALOGUE_TONES.find((t) => t.id === tone);
          if (!toneDef) return;
          holdNpcStill(npcId);
          Audio.sfx("talk");
          state.startBusy(toneDef.label, toneDef.durationMs);
          delayed(toneDef.durationMs, () => {
            const recept = TONE_RECEPTIVENESS[npcId][tone];
            const { mult, toast } = socialOutcomeMultiplier(
              state.playerTraits,
              state.needs.hygiene,
              moodFromNeeds(state.needs),
              tone,
            );
            const raw = Math.round(toneDef.delta * recept * mult);
            if (tone === "flirty" && raw > 0) {
              state.flirtCounts[npcId] = (state.flirtCounts[npcId] ?? 0) + 1;
            }
            const before = state.relationships[npcId]?.score ?? 0;
            const result = state.adjustRelationship(
              npcId,
              raw,
              RELATIONSHIP_FRIEND,
            );
            state.needs = applyNeedDeltas(state.needs, {
              social: toneDef.needSocial,
              fun: toneDef.needFun ?? 0,
            });
            const flirts = state.flirtCounts[npcId] ?? 0;
            const becameCrush =
              before < RELATIONSHIP_CRUSH &&
              result.after >= RELATIONSHIP_CRUSH &&
              flirts >= 3;
            if (becameCrush) {
              Audio.sfx("success");
              state.showDialogue(npcId, def.name, crushUnlockLine(npcId));
            } else if (result.becameFriend || result.becameClose) {
              noteFriendshipGain(npcId, result, def.name);
            } else {
              Audio.sfx(raw < 0 ? "deny" : "chime");
              state.showDialogue(npcId, def.name, toneReply(npcId, tone));
            }
            if (toast) state.showToast(toast);
            aspirations.refresh();
          });
          return;
        }

        const exclusive = EXCLUSIVE_HANGOUTS[npcId];
        if (id === exclusive.id) {
          const blockEx = socialBlockedReason(state.needs);
          if (blockEx) {
            Audio.sfx("deny");
            state.showToast(blockEx);
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
            if (toast) state.showToast(toast);
            noteFriendshipGain(npcId, result, def.name);
            quests.emit("npc_hangout");
          });
          return;
        }

        const action = SOCIAL_ACTIONS.find((a) => a.id === id);
        if (!action) return;
        if (action.id === "hangout") {
          const block = socialBlockedReason(state.needs);
          if (block) {
            Audio.sfx("deny");
            state.showToast(block);
            return;
          }
        }
        const cost = "cost" in action ? action.cost : undefined;
        if (cost !== undefined) {
          if (state.money < cost) return;
          state.money -= cost;
        }
        holdNpcStill(npcId);
        Audio.sfx("talk");
        state.startBusy(action.label, action.durationMs);
        delayed(action.durationMs, () => {
          const { mult, toast } = socialOutcomeMultiplier(
            state.playerTraits,
            state.needs.hygiene,
            moodFromNeeds(state.needs),
            action.id === "joke" ? undefined : "friendly",
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
          if (result.becameFriend || result.becameClose) {
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
          if (toast) state.showToast(toast);
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
            state.showToast(
              fav.toast ?? `${def.name} loves it!`,
            );
            if (bondQuest) quests.emit("pet_bonded");
            aspirations.refresh();
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
            state.showToast(
              `${def.name} learned trick #${state.aspirations.petTricks}!`,
              2800,
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
          state.showToast("So many happy tails!");
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
        state.money -= pdef.fee;
        state.adoptPet(id);
        syncPet();
        Audio.sfx("adopt");
        const fav = state.favouriteAnimals.includes(
          speciesFavouriteLabel(pdef.species),
        );
        state.showToast(
          fav
            ? `${pdef.name} joined your family  -  a favourite!`
            : `${pdef.name} joined your family!`,
          3200,
        );
        if (fav && state.adoptedPet) {
          state.adoptedPet.needs.bond = clampNeed(
            state.adoptedPet.needs.bond + 12,
          );
        }
        quests.emit("adopted_pet");
        aspirations.refresh();
      },
      { id: "player", look: state.playerLook },
    );
  };

  const approach = (target: Target) => {
    const start = playerTile();
    const goals = approachTiles(target);
    if (goals.length === 0) {
      Audio.sfx("deny");
      state.showToast("Can't reach that.");
      return;
    }
    if (goals.some((g) => g.x === start.x && g.y === start.y)) {
      faceTowards(target.x, target.z);
      openTargetMenu(target);
      return;
    }
    const path = findPathToAny(collision, start, goals, MAP_W, MAP_H);
    if (path.length === 0) {
      Audio.sfx("deny");
      state.showToast("Can't reach that.");
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
    const { tw, th } = furnitureFootprint(defId, rot);
    const home = LOTS.find((l) => l.id === "home")!;
    for (let dy = 0; dy < th; dy++) {
      for (let dx = 0; dx < tw; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (
          x <= home.tx ||
          y <= home.ty ||
          x >= home.tx + home.tw - 1 ||
          y >= home.ty + home.th - 1
        ) {
          return false;
        }
        if (map.ground[y][x] === Tile.door) return false;
        if (baseCollision[y]?.[x]) return false;
        if (state.walls.has(state.wallKey(x, y))) return false;
        if (furnitureAt(x, y)) return false;
      }
    }
    if (!opts?.free && state.money < def.price) return false;
    return true;
  };

  const restoreHeldFurniture = () => {
    if (!heldFurniture) return;
    state.furniture.push(heldFurniture);
    spawnFurniture(heldFurniture);
    heldFurniture = null;
    rebuildCollision();
  };

  const pickUpFurniture = (hit: PlacedFurniture) => {
    heldFurniture = { ...hit, rot: hit.rot ?? "down" };
    placeRot = heldFurniture.rot ?? "down";
    state.furniture = state.furniture.filter((f) => f.uid !== hit.uid);
    const mesh = furnitureMeshes.get(hit.uid);
    if (mesh) {
      app.renderer.remove(mesh);
      furnitureMeshes.delete(hit.uid);
    }
    state.selectedBuildItem = null;
    rebuildCollision();
    Audio.sfx("pickup");
    const def = furnitureById[hit.defId];
    state.showToast(
      `Moving ${def?.name ?? "item"} - R to rotate, click to place, Esc to cancel`,
    );
    catalog.rebuild();
  };

  const sellFurniture = (hit: PlacedFurniture) => {
    const def = furnitureById[hit.defId];
    const refund = Math.floor((def?.price ?? 0) * 0.6);
    state.money += refund;
    state.furniture = state.furniture.filter((f) => f.uid !== hit.uid);
    const mesh = furnitureMeshes.get(hit.uid);
    if (mesh) {
      app.renderer.remove(mesh);
      furnitureMeshes.delete(hit.uid);
    }
    rebuildCollision();
    Audio.sfx("sell");
    state.showToast(`Sold ${def?.name ?? "item"} for $${refund}`);
    catalog.rebuild();
  };

  const toggleBuild = () => {
    const lot = lotAtTile(Math.floor(playerX / TILE), Math.floor(playerZ / TILE));
    if (state.mode === "live") {
      if (!lot?.buildable) {
        Audio.sfx("deny");
        state.showToast("You can only build at your own home.");
        return;
      }
      state.mode = "build";
      playerPath = [];
      onArrive = null;
      player.setWalking(false);
      menu.close();
      catalog.show();
      const home = LOTS.find((l) => l.id === "home")!;
      app.renderer.setGridVisible(true, home);
      hud.setBottomInfoVisible(false);
      placeRot = "down";
      heldFurniture = null;
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
      state.showToast("Build mode - click furniture to move, or pick a catalog item");
      quests.emit("opened_build");
      if (quests.isActive("empty_nest")) quests.emit("game_started");
    } else {
      restoreHeldFurniture();
      state.mode = "live";
      catalog.hide();
      app.renderer.setGridVisible(false);
      buildFeedback?.clear();
      lastBuildTile = null;
      lastBuildPickedUid = null;
      hud.setBottomInfoVisible(true);
      rebuildCollision();
      Audio.sfx("ui");
      Audio.playMusic("world");
      state.showToast("Back to live mode");
    }
  };

  const handleBuildClick = (tx: number, ty: number, pickedUid?: string) => {
    if (!insideHomeTile(tx, ty)) {
      Audio.sfx("deny");
      state.showToast("Only the inside of your home can be changed.");
      return;
    }

    if (state.buildTool === "sell") {
      if (heldFurniture) {
        const def = furnitureById[heldFurniture.defId];
        const refund = Math.floor((def?.price ?? 0) * 0.6);
        state.money += refund;
        heldFurniture = null;
        Audio.sfx("sell");
        state.showToast(`Sold ${def?.name ?? "item"} for $${refund}`);
        catalog.rebuild();
        buildFeedback?.clear();
        return;
      }
      const hit =
        state.furniture.find((f) => f.uid === pickedUid && f.lotId === "home") ??
        furnitureAt(tx, ty, "home");
      if (!hit) {
        state.showToast("Click furniture to sell it.");
        return;
      }
      sellFurniture(hit);
      return;
    }

    if (state.buildTool === "wall") {
      if (map.ground[ty][tx] === Tile.door) {
        Audio.sfx("deny");
        state.showToast("Can't wall over the door.");
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
      } else {
        const wallCost = state.hasUnlock("wall_sky") ? 6 : 10;
        if (state.money < wallCost) {
          Audio.sfx("deny");
          state.showToast(`A wall costs $${wallCost}.`);
          return;
        }
        if (furnitureAt(tx, ty, "home")) {
          Audio.sfx("deny");
          state.showToast("Move the furniture first.");
          return;
        }
        if (baseCollision[ty]?.[tx]) {
          Audio.sfx("deny");
          state.showToast("There's already a wall there.");
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
      if (state.floors.has(key)) {
        Audio.sfx("deny");
        state.showToast("Already floored - pick another tile.");
        return;
      }
      if (state.money < 5) {
        Audio.sfx("deny");
        state.showToast("Flooring costs $5 a tile.");
        return;
      }
      state.money -= 5;
      state.floors.set(key, 1);
      addFloor(tx, ty);
      Audio.sfx("place");
      state.showToast("Fresh flooring!");
      return;
    }

    // Furniture tool: place held / pick up existing / buy new
    if (heldFurniture) {
      const defId = heldFurniture.defId;
      if (!canPlace(defId, tx, ty, placeRot, { free: true })) {
        Audio.sfx("deny");
        state.showToast("Doesn't fit there - try R to rotate.");
        return;
      }
      const placed: PlacedFurniture = {
        ...heldFurniture,
        tx,
        ty,
        rot: placeRot,
        lotId: "home",
      };
      heldFurniture = null;
      state.furniture.push(placed);
      spawnFurniture(placed);
      rebuildCollision();
      Audio.sfx("place");
      const def = furnitureById[defId];
      state.showToast(`Placed ${def?.name ?? "item"}`);
      catalog.rebuild();
      if (state.hasPetSetup()) quests.emit("pet_setup");
      return;
    }

    // Prefer mesh uid; fall back to footprint under the tile
    const existing =
      state.furniture.find((f) => f.uid === pickedUid && f.lotId === "home") ??
      furnitureAt(tx, ty, "home");
    if (existing) {
      pickUpFurniture(existing);
      return;
    }

    const defId = state.selectedBuildItem;
    if (!defId) {
      state.showToast("Pick a catalog item, or click furniture to move it.");
      return;
    }
    const def = furnitureById[defId];
    if (!def) return;
    if (!canPlace(defId, tx, ty, placeRot)) {
      Audio.sfx("deny");
      state.showToast(
        state.money < def.price ? "Not enough money." : "Doesn't fit - try R.",
      );
      return;
    }
    state.money -= def.price;
    const placed: PlacedFurniture = {
      uid: `f_${uidCounter++}`,
      defId,
      tx,
      ty,
      lotId: "home",
      rot: placeRot,
    };
    state.furniture.push(placed);
    spawnFurniture(placed);
    rebuildCollision();
    Audio.sfx("place");
    if (hasTrait(state.playerTraits, "Creative")) {
      state.needs = applyNeedDeltas(state.needs, { fun: 4 });
      state.showToast(`Placed ${def.name} — Creative spark!`);
    } else {
      state.showToast(`Placed ${def.name}`);
    }
    catalog.rebuild();
    if (defId === "sofa") quests.emit("placed_sofa");
    if (state.hasPetSetup()) quests.emit("pet_setup");
    aspirations.refresh();
  };

  const overUi = (cx: number, cy: number) => {
    if (dialogue?.isOpen()) return true;
    if (menu.containsPoint(cx, cy)) return true;
    if (catalog.containsPoint(cx, cy)) return true;
    if (hud.containsHudCluster(cx, cy)) return true;
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
        lastBuildTile = { tx: pickedFurniture.tx, ty: pickedFurniture.ty };
        lastBuildPickedUid = pickedFurniture.uid;
        handleBuildClick(
          pickedFurniture.tx,
          pickedFurniture.ty,
          pickedFurniture.uid,
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
      state.showToast("Busy right now…");
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
      const ok = okTile && !state.floors.has(key) && state.money >= 5;
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
    buildFeedback.showFurniturePlace(defId, tx, ty, placeRot, ok);
  };

  const finishWakeIntro = () => {
    introActive = false;
    introPhase = "done";
    thoughtBubble?.hide();
    player.setPose("stand");
    if (quests.isActive("empty_nest")) quests.emit("game_started");
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
    Audio.sfx("ui");
  };

  const beginWakeSpeech = () => {
    thoughtBubble.hide();
    dialogue.setOnClosed(() => {
      if (!menu.isOpen()) releaseEngagedNpc();
      if (introActive && introPhase === "speak") finishWakeIntro();
      dialogue.setOnClosed(() => {
        if (!menu.isOpen()) releaseEngagedNpc();
      });
    });
    state.showDialogue(
      "player",
      state.playerName,
      "I need to furnish my house. I need money for that though — let's see who's hiring.",
    );
  };

  const startWakeIntro = () => {
    introActive = true;
    introPhase = "lie";
    introT = 0;
    introThinkShown = false;
    introBounced = false;
    introSpoke = false;
    player.setPose("lie");
    player.setWalking(false);
    playerPath = [];
    onArrive = null;
  };

  /** Advance wake cutscene from real frame time (not wall-clock timeouts). */
  const tickWakeIntro = (dt: number) => {
    if (!introActive || introPhase === "done" || introPhase === "speak") return;
    introT += dt;

    if (introT >= 0.9 && introPhase === "lie") {
      introPhase = "sit";
      player.setPose("sit");
    }
    if (introT >= 1.6 && (introPhase === "sit" || introPhase === "lie")) {
      introPhase = "stretch";
      player.playStretch();
    }
    if (introT >= 2.6 && introPhase === "stretch") {
      introPhase = "yawn";
      player.playYawn();
    }
    if (introT >= 3.4 && !introThinkShown) {
      introThinkShown = true;
      introPhase = "think";
      thoughtBubble.showSofa("A sunny sofa would look perfect…");
    }
    // Keep the sofa thought up ~2.4s so zoom + caption are readable.
    if (introT >= 5.8 && !introBounced) {
      introBounced = true;
      introPhase = "bounce";
      bounceOutOfBed();
    }
    if (introT >= 7.2 && !introSpoke) {
      introSpoke = true;
      introPhase = "speak";
      beginWakeSpeech();
    }
  };

  return {
    id: "world",
    mount(root) {
      Audio.playMusic("world");
      root.innerHTML = `<div class="ll-world-ui"></div>${muteButtonHtml()}`;
      const ui = root.querySelector(".ll-world-ui") as HTMLElement;
      unMute = wireMute(root.querySelector(".ll-mute") as HTMLElement);

      map = createTownMap();
      baseCollision = map.collision.map((row) => [...row]);
      collision = baseCollision.map((row) => [...row]);
      app.renderer.buildWorld(map);

      player = createActor(state.playerLook);
      if (!isContinue) {
        // Wake on the starter bed (collision blocks bed tiles — skip nearestWalkable).
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
      for (const key of state.walls) {
        const [tx, ty] = key.split(",").map(Number);
        addWall(tx, ty);
      }
      for (const key of state.floors.keys()) {
        const [tx, ty] = key.split(",").map(Number);
        addFloor(tx, ty);
      }
      rebuildCollision();

      npcs = [
        ...NPCS.map((def) => {
          const actor = createNpcActor(def.color);
          actor.root.userData.npcId = def.id;
          const x = def.spawnTx * TILE + TILE / 2;
          const z = def.spawnTy * TILE + TILE / 2;
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
          const x = def.spawnTx * TILE + TILE / 2;
          const z = def.spawnTy * TILE + TILE / 2;
          actor.setPosition(x, z);
          actor.setFacing(def.facing);
          actor.setWalking(false);
          app.renderer.add(actor.root);
          return {
            id: def.id,
            actor,
            dir: def.facing,
            path: [],
            waitUntil: Number.POSITIVE_INFINITY,
            ambient: true,
          };
        }),
      ];
      syncPet();

      hud = new Hud(
        ui,
        state,
        () => quests.getTracker(),
        () => aspirations.getTracker(),
      );
      dialogue = new DialogueBox(ui);
      dialogue.setPlayerLook(state.playerLook);
      dialogue.setOnClosed(() => {
        if (!menu.isOpen()) releaseEngagedNpc();
      });
      nametags = new NpcNameTags(ui);
      buildingTags = new BuildingNameTags(ui);
      thoughtBubble = new ThoughtBubble(ui);
      hintArrow = new HintArrow(ui);
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
        updateGhost();
      });

      // Flush any quest journal lines queued during bootstrap.
      const starterLines = state.takeDialogueBatch();
      if (starterLines.length) dialogue.say(starterLines);
      lastDialogueSeq = state.dialogueSeq;

      app.canvas.addEventListener("pointerdown", onPointerDown);

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
        // Always eat the gesture while the world is up so Chrome can't page-zoom.
        if (e.ctrlKey || e.metaKey) e.preventDefault();

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

        if (menu.isOpen()) return;
        if (catalog.containsPoint(e.clientX, e.clientY)) return;
        if (hud.containsHudCluster(e.clientX, e.clientY)) return;
        if (dialogue?.isOpen()) return;

        e.preventDefault();
        // Pinch only - plain scroll must never zoom (causes walk-time wobble).
        if (e.ctrlKey || e.metaKey) {
          app.renderer.zoomByWheel(e.deltaY, true);
        }
      };
      // Listen on window so pinch works even when the pointer is over
      // pointer-events UI layers that sit above the canvas.
      window.addEventListener("wheel", onWheel, { passive: false, capture: true });

      app.renderer.setZoom(1);
      app.renderer.setFollow(playerX, playerZ);

      if (!isContinue) {
        startWakeIntro();
      } else {
        state.showToast("Welcome back to Little Lives!");
      }
    },

    unmount() {
      introActive = false;
      app.canvas.removeEventListener("pointerdown", onPointerDown);
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
      hintArrow?.destroy();
      hoveredNpcId = null;
      menu?.destroy();
      catalog?.destroy();

      app.renderer.remove(player.root);
      player.dispose();
      for (const npc of npcs) {
        app.renderer.remove(npc.actor.root);
        npc.actor.dispose();
      }
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
    },

    update(dt: number) {
      state.dayTime = (state.dayTime + dt / (14 * 60)) % 1;
      if (introActive) tickWakeIntro(dt);
      if (state.mode === "live") {
        state.needs = decayNeedsWithTraits(
          state.needs,
          state.playerTraits,
          state.dayTime,
          dt,
          playerAtHome(),
        );
        tickNeedDrama(state, performance.now(), (ms) => {
          delayed(ms, () => applyCollapseRecovery(state));
        });
      }
      if (state.adoptedPet) {
        const p = state.adoptedPet;
        p.needs.hunger = clampNeed(p.needs.hunger - 0.25 * dt);
        p.needs.energy = clampNeed(p.needs.energy - 0.15 * dt);
        p.needs.fun = clampNeed(p.needs.fun - 0.22 * dt);
      }

      app.renderer.setDayTime(state.dayTime);

      // Hotkeys
      if (!introActive && justPressed("KeyE") && !dialogue.isOpen()) {
        const t = nearestTarget(40);
        if (t) approach(t);
        else state.showToast("Nothing to use nearby.");
      }
      if (!introActive && justPressed("KeyB") && !dialogue.isOpen()) toggleBuild();
      if (!introActive && justPressed("KeyQ") && !dialogue.isOpen()) saveGame();
      if (!introActive && justPressed("Tab") && state.mode === "build") catalog.toggle();
      if (
        !introActive &&
        justPressed("KeyR") &&
        state.mode === "build" &&
        state.buildTool === "furniture" &&
        !dialogue.isOpen()
      ) {
        // Rotate held piece or catalog preview - clear hover-select so ghost shows
        if (heldFurniture || state.selectedBuildItem) {
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
      if (justPressed("Equal") || justPressed("NumpadAdd")) {
        app.renderer.adjustZoom(1.12);
      }
      if (justPressed("Minus") || justPressed("NumpadSubtract")) {
        app.renderer.adjustZoom(1 / 1.12);
      }
      if (justPressed("Digit0") || justPressed("Numpad0")) {
        app.renderer.setZoom(1);
      }
      // Space / Enter / Esc for dialogue are handled inside DialogueBox
      if (!introActive && justPressed("Escape") && !dialogue.isOpen()) {
        if (menu.isOpen()) {
          menu.close();
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
      if (
        !introActive &&
        state.mode === "live" &&
        !state.isBusy() &&
        !menu.isOpen() &&
        !dialogue.isOpen()
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
          const movedX = vx !== 0 && canStand(nx, playerZ);
          const movedZ = vz !== 0 && canStand(playerX, nz);
          if (movedX) playerX = nx;
          if (movedZ) playerZ = nz;
          if ((vx !== 0 && !movedX) || (vz !== 0 && !movedZ)) {
            slideIntoGap(vx, vz, step);
            if (vx !== 0 && !movedX && canStand(nx, playerZ)) playerX = nx;
            if (vz !== 0 && !movedZ && canStand(playerX, nz)) playerZ = nz;
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
      state.playerX = playerX;
      state.playerY = playerZ;

      // NPCs
      const now = performance.now();
      const conversationOpen = dialogue.isOpen() || menu.isOpen();
      for (const npc of npcs) {
        // Street hangabouts never wander - idle in place.
        if (npc.ambient) {
          npc.actor.setWalking(false);
          if (npc.id === engagedNpcId) faceNpcTowardPlayer(npc);
          npc.actor.update(dt);
          continue;
        }
        // Stay put while the player is talking / browsing their menu.
        if (conversationOpen || npc.id === engagedNpcId) {
          npc.path = [];
          npc.actor.setWalking(false);
          if (npc.id === engagedNpcId) faceNpcTowardPlayer(npc);
          npc.actor.update(dt);
          continue;
        }
        if (now < npc.waitUntil) {
          npc.actor.setWalking(false);
          npc.actor.update(dt);
          continue;
        }
        if (npc.path.length === 0) {
          npc.waitUntil = now + 1400 + Math.random() * 2200;
          const def = NPCS.find((n) => n.id === npc.id)!;
          // Evenings: linger at the park; nights: head home; work hours: home lot
          let lotId = def.homeLot;
          if (isEvening(state.dayTime) && Math.random() < 0.55) {
            lotId = "park";
          } else if (isNight(state.dayTime)) {
            lotId = def.homeLot;
          }
          const lot = LOTS.find((l) => l.id === lotId)!;
          const goal = {
            x: lot.tx + 1 + Math.floor(Math.random() * (lot.tw - 2)),
            y: lot.ty + 1 + Math.floor(Math.random() * (lot.th - 2)),
          };
          const walkable = nearestWalkable(collision, goal, MAP_W, MAP_H, 3);
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
        const step = 55 * dt;
        if (dist <= step) {
          npc.actor.setPosition(tx, tz);
          npc.path.shift();
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
        const wantFocus =
          !!thoughtBubble?.isVisible() ||
          dialogue.isOpen() ||
          menu.isOpen() ||
          !!engagedNpcId ||
          (introActive &&
            (introPhase === "think" ||
              introPhase === "bounce" ||
              introPhase === "speak"));
        const nowFocus = performance.now();
        if (wantFocus) focusHoldUntil = nowFocus + 450;
        const focus = wantFocus || nowFocus < focusHoldUntil;
        if (focus) app.renderer.beginFocusZoom();
        else app.renderer.endFocusZoom();
        thoughtBubble?.setZoomed(focus);
      }

      app.renderer.update(dt, playerX, playerZ);

      dialogue.setPlayerLook(state.playerLook);
      dialogue.update(dt);
      hud.setBottomInfoVisible(
        state.mode === "live" && !dialogue.isOpen(),
      );
      hud.update();

      {
        const rect = app.canvas.getBoundingClientRect();
        const positions = new Map<string, { x: number; z: number }>();
        for (const npc of npcs) {
          positions.set(npc.id, npc.actor.getPosition());
        }
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
          playerX,
          playerZ,
          (x, y, z) => app.renderer.projectToScreen(x, y, z, rect),
          rect.width,
          rect.height,
        );
        hintArrow?.update(
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
