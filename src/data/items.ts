/** Permanent tools and stackable gather materials. */

export type ToolId = "axe" | "pickaxe" | "shovel" | "fishing_rod";

export type MaterialId = "wood" | "stone" | "coal" | "ore" | "clay" | "fish";

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
}

export interface HarvestNodeInstance {
  uid: string;
  defId: string;
  tx: number;
  ty: number;
  lotId: "forest" | "mine";
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
    description: "Fresh catch from the pier.",
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
  },
  {
    id: "harvest_rock",
    kind: "rock",
    toolId: "pickaxe",
    label: "Stone Rock",
    verb: "Mine",
    yields: [{ itemId: "stone", min: 2, max: 3 }],
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
  },
  {
    id: "harvest_dig",
    kind: "dig",
    toolId: "shovel",
    label: "Dig Mound",
    verb: "Dig",
    yields: [{ itemId: "clay", min: 1, max: 3 }],
  },
];

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

/** Seeded harvest node placements for forest + mine lots. */
export function seedHarvestNodes(): HarvestNodeInstance[] {
  const nodes: HarvestNodeInstance[] = [];
  let n = 0;
  const add = (
    defId: string,
    tx: number,
    ty: number,
    lotId: "forest" | "mine",
  ) => {
    nodes.push({ uid: `h_${n++}`, defId, tx, ty, lotId });
  };

  // Whisperwood — lot roughly (2,16) 16×16; keep clear of path spine.
  const forestTrees: Array<[number, number]> = [
    [4, 18],
    [7, 19],
    [10, 17],
    [13, 18],
    [5, 22],
    [9, 23],
    [12, 21],
    [15, 22],
    [4, 26],
    [8, 27],
    [11, 25],
    [14, 28],
    [6, 29],
    [3, 24],
  ];
  for (const [tx, ty] of forestTrees) {
    add("harvest_tree", tx, ty, "forest");
  }
  const forestDigs: Array<[number, number]> = [
    [6, 20],
    [11, 28],
    [15, 25],
  ];
  for (const [tx, ty] of forestDigs) {
    add("harvest_dig", tx, ty, "forest");
  }

  // Rocky Quarries — lot ~ (114, 16) 14×16
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
  for (const [tx, ty] of mineRocks) {
    add("harvest_rock", tx, ty, "mine");
  }
  const mineOres: Array<[number, number]> = [
    [120, 21],
    [125, 24],
    [117, 29],
    [122, 30],
  ];
  for (const [tx, ty] of mineOres) {
    add("harvest_ore", tx, ty, "mine");
  }
  const mineDigs: Array<[number, number]> = [
    [119, 26],
    [124, 29],
  ];
  for (const [tx, ty] of mineDigs) {
    add("harvest_dig", tx, ty, "mine");
  }

  return nodes;
}
