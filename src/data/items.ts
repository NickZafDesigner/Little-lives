/** Permanent tools and stackable gather materials. */

import { lotAtTile } from "../world/lots";

export type ToolId = "axe" | "pickaxe" | "shovel" | "fishing_rod";

export type MaterialId =
  | "wood"
  | "stone"
  | "coal"
  | "ore"
  | "clay"
  | "fish"
  | "apple";

export type HarvestKind = "tree" | "rock" | "ore" | "dig";

export interface ToolDef {
  id: ToolId;
  name: string;
  price: number;
  description: string;
}

export interface MaterialDef {
  id: MaterialId;
  name: string;
  /** Sell price per unit at Vera's market. */
  sellPrice: number;
  description: string;
  /** If set, can be eaten from the bag for this hunger relief. */
  hungerRelief?: number;
}

export interface HarvestYield {
  itemId: MaterialId;
  min: number;
  max: number;
}

export interface HarvestNodeDef {
  id: string;
  kind: HarvestKind;
  /** Tool required to harvest; null = none (unused in v1). */
  toolId: ToolId;
  label: string;
  /** Verb shown on interact tip / busy bar. */
  verb: string;
  yields: HarvestYield[];
  /** Square footprint in tiles (canopy trees are 2×2). */
  footprint?: number;
  /** Base days until respawn after chop/mine (staggered per-node). */
  respawnDays?: number;
}

export interface HarvestNodeInstance {
  uid: string;
  defId: string;
  tx: number;
  ty: number;
  /** Lot under the node, or "wild" for interstitial grass. */
  lotId: string;
}

export interface InventoryState {
  tools: ToolId[];
  materials: Partial<Record<MaterialId, number>>;
}

export const TOOLS: ToolDef[] = [
  {
    id: "axe",
    name: "Axe",
    price: 38,
    description: "Chop harvestable trees for wood.",
  },
  {
    id: "pickaxe",
    name: "Pickaxe",
    price: 45,
    description: "Crack rocks and ore veins in the quarry.",
  },
  {
    id: "shovel",
    name: "Shovel",
    price: 28,
    description: "Dig mounds for clay and odd finds.",
  },
  {
    id: "fishing_rod",
    name: "Fishing Rod",
    price: 35,
    description: "Cast a line at the Sunny Pier.",
  },
];

export const MATERIALS: MaterialDef[] = [
  {
    id: "wood",
    name: "Wood",
    sellPrice: 4,
    description: "Fresh-cut timber from Whisperwood.",
  },
  {
    id: "stone",
    name: "Stone",
    sellPrice: 3,
    description: "Rough quarry stone.",
  },
  {
    id: "coal",
    name: "Coal",
    sellPrice: 7,
    description: "Dark fuel from ore seams.",
  },
  {
    id: "ore",
    name: "Ore",
    sellPrice: 12,
    description: "Raw metal-bearing rock.",
  },
  {
    id: "clay",
    name: "Clay",
    sellPrice: 5,
    description: "Soft earth from dig mounds.",
  },
  {
    id: "fish",
    name: "Fish",
    sellPrice: 6,
    description: "Fresh catch from the pier. Eat from the bag when hungry.",
    hungerRelief: 22,
  },
  {
    id: "apple",
    name: "Apple",
    sellPrice: 3,
    description: "Crisp fruit from Whisperwood apple trees. Eat from the bag.",
    hungerRelief: 14,
  },
];

export const HARVEST_NODE_DEFS: HarvestNodeDef[] = [
  {
    id: "harvest_tree",
    kind: "tree",
    toolId: "axe",
    label: "Timber Tree",
    verb: "Chop",
    yields: [{ itemId: "wood", min: 2, max: 4 }],
    respawnDays: 2,
  },
  {
    id: "harvest_apple",
    kind: "tree",
    toolId: "axe",
    label: "Apple Tree",
    verb: "Chop",
    yields: [
      { itemId: "apple", min: 2, max: 4 },
      { itemId: "wood", min: 1, max: 2 },
    ],
    respawnDays: 2,
  },
  {
    id: "harvest_canopy",
    kind: "tree",
    toolId: "axe",
    label: "Old Oak",
    verb: "Chop",
    yields: [{ itemId: "wood", min: 4, max: 7 }],
    footprint: 2,
    respawnDays: 4,
  },
  {
    id: "harvest_rock",
    kind: "rock",
    toolId: "pickaxe",
    label: "Stone Rock",
    verb: "Mine",
    yields: [{ itemId: "stone", min: 2, max: 3 }],
    respawnDays: 2,
  },
  {
    id: "harvest_ore",
    kind: "ore",
    toolId: "pickaxe",
    label: "Ore Vein",
    verb: "Mine",
    yields: [
      { itemId: "ore", min: 1, max: 2 },
      { itemId: "coal", min: 0, max: 2 },
    ],
    respawnDays: 3,
  },
  {
    id: "harvest_dig",
    kind: "dig",
    toolId: "shovel",
    label: "Dig Mound",
    verb: "Dig",
    yields: [{ itemId: "clay", min: 1, max: 3 }],
    respawnDays: 1,
  },
];

export function harvestFootprint(defId: string): number {
  return harvestNodeById[defId]?.footprint ?? 1;
}

export function materialHungerRelief(id: MaterialId): number {
  return materialById[id]?.hungerRelief ?? 0;
}

export function isConsumableMaterial(id: MaterialId): boolean {
  return materialHungerRelief(id) > 0;
}

/** Days until a depleted node can return (base + 0–2 stagger). */
export function harvestRespawnDays(defId: string, uid: string): number {
  const base = harvestNodeById[defId]?.respawnDays ?? 2;
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
  return base + (Math.abs(h) % 3);
}
export const toolById: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
);

export const materialById: Record<string, MaterialDef> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m]),
);

export const harvestNodeById: Record<string, HarvestNodeDef> = Object.fromEntries(
  HARVEST_NODE_DEFS.map((n) => [n.id, n]),
);

export function emptyInventory(): InventoryState {
  return { tools: [], materials: {} };
}

/** Roll yield counts for a harvest def (0-max inclusive; skips 0 totals). */
export function rollHarvestYields(
  def: HarvestNodeDef,
): Array<{ itemId: MaterialId; count: number }> {
  const out: Array<{ itemId: MaterialId; count: number }> = [];
  for (const y of def.yields) {
    const count =
      y.min + Math.floor(Math.random() * (y.max - y.min + 1));
    if (count > 0) out.push({ itemId: y.itemId, count });
  }
  return out;
}

/** Optional map context so timber can fill empty grass, not just Whisperwood. */
export interface HarvestPlacementContext {
  ground: number[][];
  collision: boolean[][];
  mapW: number;
  mapH: number;
  /** Tile codes that can host a timber tree. */
  plantable: Set<number>;
  /** Extra blocked tiles (canopy trees, rocks, lamps, fences). */
  blocked: Iterable<[number, number]>;
  /** Big decorative oaks — become choppable canopy harvest nodes. */
  canopyTrees?: Array<[number, number]>;
}

let installedHarvestNodes: HarvestNodeInstance[] | null = null;

export function installHarvestNodes(nodes: HarvestNodeInstance[]): void {
  installedHarvestNodes = nodes;
}

/**
 * Harvest placements. Prefer `buildHarvestNodes(ctx)` from the town map so
 * timber fills empty grass; falls back to a sparse static seed before map build.
 */
export function seedHarvestNodes(
  ctx?: HarvestPlacementContext,
): HarvestNodeInstance[] {
  if (ctx) {
    const nodes = buildHarvestNodes(ctx);
    installHarvestNodes(nodes);
    return nodes;
  }
  if (installedHarvestNodes) return installedHarvestNodes;
  return buildHarvestNodes();
}

function buildHarvestNodes(
  ctx?: HarvestPlacementContext,
): HarvestNodeInstance[] {
  const nodes: HarvestNodeInstance[] = [];
  let n = 0;
  const occupied = new Set<string>();
  const key = (tx: number, ty: number) => `${tx},${ty}`;

  const add = (defId: string, tx: number, ty: number, lotId: string) => {
    if (occupied.has(key(tx, ty))) return;
    occupied.add(key(tx, ty));
    nodes.push({ uid: `h_${n++}`, defId, tx, ty, lotId });
  };

  if (ctx) {
    for (const [tx, ty] of ctx.blocked) occupied.add(key(tx, ty));
  }

  // Rocky Quarries — keep dedicated rock / ore / dig spots.
  const mineRocks: Array<[number, number]> = [
    [116, 18],
    [119, 19],
    [122, 18],
    [125, 20],
    [117, 23],
    [121, 24],
    [124, 22],
    [118, 27],
    [123, 28],
    [126, 26],
  ];
  for (const [tx, ty] of mineRocks) add("harvest_rock", tx, ty, "mine");
  const mineOres: Array<[number, number]> = [
    [120, 21],
    [125, 24],
    [117, 29],
    [122, 30],
  ];
  for (const [tx, ty] of mineOres) add("harvest_ore", tx, ty, "mine");
  const mineDigs: Array<[number, number]> = [
    [119, 26],
    [124, 29],
  ];
  for (const [tx, ty] of mineDigs) add("harvest_dig", tx, ty, "mine");

  // Whisperwood dig mounds.
  for (const [tx, ty] of [
    [6, 20],
    [11, 28],
    [15, 25],
  ] as Array<[number, number]>) {
    add("harvest_dig", tx, ty, "forest");
  }

  if (!ctx) {
    // Pre-map fallback — sparse forest only (mix timber + apple).
    const fallback: Array<[number, number, string]> = [
      [4, 18, "harvest_tree"],
      [7, 19, "harvest_apple"],
      [10, 17, "harvest_tree"],
      [13, 18, "harvest_apple"],
      [5, 22, "harvest_tree"],
      [9, 23, "harvest_apple"],
      [12, 21, "harvest_tree"],
      [15, 22, "harvest_tree"],
      [4, 26, "harvest_apple"],
      [8, 27, "harvest_tree"],
      [11, 25, "harvest_apple"],
      [14, 28, "harvest_tree"],
      [6, 29, "harvest_tree"],
      [3, 24, "harvest_apple"],
    ];
    for (const [tx, ty, defId] of fallback) {
      add(defId, tx, ty, "forest");
    }
    return nodes;
  }

  const { ground, collision, mapW, mapH, plantable } = ctx;
  // Buildings + parks (parks already have authored canopy oaks).
  const SKIP_LOTS = new Set([
    "mine",
    "pier",
    "home",
    "neighbor",
    "market",
    "cafe",
    "shelter",
    "library",
    "clinic",
    "workshop",
    "park",
    "playpark",
  ]);

  const nearOccupied = (tx: number, ty: number, radius: number) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (occupied.has(key(tx + dx, ty + dy))) return true;
      }
    }
    return false;
  };

  // Keep timber light — Whisperwood is a grove, town grass is rare accents.
  for (let ty = 2; ty < mapH - 2; ty++) {
    for (let tx = 2; tx < mapW - 2; tx++) {
      // Beach / water band
      if (ty >= 62) continue;
      const tile = ground[ty]?.[tx];
      if (tile === undefined || !plantable.has(tile)) continue;
      if (collision[ty]?.[tx]) continue;
      if (occupied.has(key(tx, ty))) continue;

      const lot = lotAtTile(tx, ty);
      const lotId = lot?.id ?? "wild";
      if (lot && SKIP_LOTS.has(lot.id)) continue;

      const inForest = lotId === "forest";
      // Forest: a walkable grove. Town: a few accents only (oaks carry the skyline).
      const spacing = inForest ? 3 : 10;
      if (nearOccupied(tx, ty, spacing - 1)) continue;

      const hash = (tx * 73856093) ^ (ty * 19349663) ^ (tx * ty + 17);
      if (inForest) {
        if ((tx + ty) % 3 !== 0) continue;
        if (hash % 3 === 0) continue;
      } else {
        if (tx % 12 !== 5 || ty % 12 !== 4) continue;
        if (hash % 3 !== 0) continue;
      }

      // Whisperwood: mix in apple trees (~2/5 of placements).
      const defId =
        inForest && Math.abs(hash) % 5 < 2 ? "harvest_apple" : "harvest_tree";
      add(defId, tx, ty, lotId);
    }
  }

  // Big oaks from the town layout — choppable, 2×2 footprint.
  for (const [tx, ty] of ctx.canopyTrees ?? []) {
    const lot = lotAtTile(tx, ty);
    nodes.push({
      uid: `h_${n++}`,
      defId: "harvest_canopy",
      tx,
      ty,
      lotId: lot?.id ?? "wild",
    });
  }

  return nodes;
}
