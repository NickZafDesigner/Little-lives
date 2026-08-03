import { LOTS } from "./lots";
import { allStructuralWallTiles } from "./rooms";
import {
  seedHarvestNodes,
  type HarvestNodeInstance,
} from "../data/items";

/** Tile codes for the overworld. */
export const Tile = {
  grass: 0,
  grassVar: 1,
  path: 2,
  water: 3,
  sand: 4,
  floor: 5,
  floorAlt: 6,
  wall: 7,
  door: 8,
  flower: 9,
  bush: 10,
  counter: 11,
  cafeFloor: 12,
  shelterFloor: 13,
  parkPath: 14,
  marketFloor: 15,
  libraryFloor: 16,
  clinicFloor: 17,
  workshopFloor: 18,
  pierDeck: 19,
  rock: 20,
  dirt: 21,
} as const;

export type TileCode = (typeof Tile)[keyof typeof Tile];

export const MAP_W = 132;
export const MAP_H = 82;

export interface TownMapData {
  ground: number[][];
  collision: boolean[][];
  doors: Array<{ tx: number; ty: number; label: string }>;
  /** Decorative world props placed on top of grass (not tile codes). */
  rocks: Array<[number, number]>;
  fencePosts: Array<[number, number]>;
  /** Explicit canopy trees (2×2 footprint; always rendered). */
  trees: Array<[number, number]>;
  /** Path / plaza lamps. */
  lamps: Array<[number, number]>;
  /** Chop / mine / dig nodes (timber fills empty grass). */
  harvestNodes: HarvestNodeInstance[];
}

function fillRect(
  grid: number[][],
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
) {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
        grid[ty][tx] = value;
      }
    }
  }
}

function set(grid: number[][], x: number, y: number, value: number) {
  if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) {
    grid[y][x] = value;
  }
}

function drawBuildingShell(
  ground: number[][],
  collision: boolean[][],
  tx: number,
  ty: number,
  tw: number,
  th: number,
  floorTile: number,
  doorTx: number,
  doorTy: number,
) {
  fillRect(ground, tx, ty, tw, th, floorTile);
  for (let x = tx; x < tx + tw; x++) {
    collision[ty][x] = true;
    collision[ty + th - 1][x] = true;
  }
  for (let y = ty; y < ty + th; y++) {
    collision[y][tx] = true;
    collision[y][tx + tw - 1] = true;
  }
  set(ground, doorTx, doorTy, Tile.door);
  collision[doorTy][doorTx] = false;
}

function clearInterior(
  collision: boolean[][],
  tx: number,
  ty: number,
  tw: number,
  th: number,
) {
  for (let y = ty + 1; y < ty + th - 1; y++) {
    for (let x = tx + 1; x < tx + tw - 1; x++) {
      collision[y][x] = false;
    }
  }
}

export function createTownMap(): TownMapData {
  const ground: number[][] = [];
  const collision: boolean[][] = [];

  for (let y = 0; y < MAP_H; y++) {
    ground[y] = [];
    collision[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const variegate = (x * 7 + y * 13) % 5 === 0;
      ground[y][x] = variegate ? Tile.grassVar : Tile.grass;
      collision[y][x] = false;
    }
  }

  // Outer water border
  for (let x = 0; x < MAP_W; x++) {
    set(ground, x, 0, Tile.water);
    set(ground, x, MAP_H - 1, Tile.water);
    collision[0][x] = true;
    collision[MAP_H - 1][x] = true;
  }
  for (let y = 0; y < MAP_H; y++) {
    set(ground, 0, y, Tile.water);
    set(ground, MAP_W - 1, y, Tile.water);
    collision[y][0] = true;
    collision[y][MAP_W - 1] = true;
  }

  // Path network around the spread-out lots.
  // Main west spine between home / café and the park.
  fillRect(ground, 20, 2, 2, 72, Tile.path);
  // Northern belt above houses.
  fillRect(ground, 20, 2, 108, 1, Tile.path);
  // Home frontage.
  fillRect(ground, 2, 14, 20, 2, Tile.path);
  // Far-east lane past market / library / workshop / mine.
  fillRect(ground, 106, 2, 2, 62, Tile.path);
  fillRect(ground, 112, 2, 2, 40, Tile.path);
  // Mid-east lane between shelter and library gap.
  fillRect(ground, 68, 2, 2, 44, Tile.path);
  // Workshop approach from mid-east.
  fillRect(ground, 90, 2, 2, 40, Tile.path);
  fillRect(ground, 90, 28, 18, 2, Tile.path);
  // Mine approach from workshop lane.
  fillRect(ground, 108, 22, 10, 2, Tile.path);
  fillRect(ground, 120, 22, 2, 8, Tile.path);
  // Neighbor + market frontage.
  fillRect(ground, 50, 13, 58, 2, Tile.path);
  // West lane by café.
  fillRect(ground, 2, 16, 2, 28, Tile.path);
  // South of park / between café & shelter.
  fillRect(ground, 20, 30, 30, 2, Tile.path);
  // Park west entrance from spine (widened into the ring below).
  fillRect(ground, 22, 20, 4, 2, Tile.path);
  // Café / shelter / library frontage.
  fillRect(ground, 2, 44, 90, 2, Tile.path);
  // Connector east to library/market gap.
  fillRect(ground, 68, 30, 24, 2, Tile.path);
  // Clinic approach - south spine + frontage.
  fillRect(ground, 20, 46, 2, 16, Tile.path);
  fillRect(ground, 20, 60, 30, 2, Tile.path);
  fillRect(ground, 2, 60, 18, 2, Tile.path);
  // Beach promenade + pier approach.
  fillRect(ground, 2, 62, MAP_W - 4, 2, Tile.path);
  fillRect(ground, 82, 62, 2, 10, Tile.path);

  // Door welcome mats
  fillRect(ground, 9, 14, 3, 2, Tile.path); // home
  fillRect(ground, 54, 13, 3, 2, Tile.path); // neighbor
  fillRect(ground, 79, 13, 3, 2, Tile.path); // market
  fillRect(ground, 9, 44, 3, 2, Tile.path); // café
  fillRect(ground, 55, 44, 3, 2, Tile.path); // shelter
  fillRect(ground, 79, 44, 3, 2, Tile.path); // library
  fillRect(ground, 33, 60, 3, 2, Tile.path); // clinic
  fillRect(ground, 101, 28, 3, 2, Tile.path); // workshop
  fillRect(ground, 119, 30, 3, 2, Tile.path); // mine
  fillRect(ground, 82, 68, 3, 2, Tile.path); // pier approach

  // Forest dirt trails through Whisperwood.
  fillRect(ground, 8, 16, 2, 16, Tile.dirt);
  fillRect(ground, 2, 24, 14, 2, Tile.dirt);
  fillRect(ground, 2, 16, 6, 1, Tile.path); // from home frontage
  fillRect(ground, 8, 31, 2, 3, Tile.path); // toward café lane

  const home = LOTS.find((l) => l.id === "home")!;
  drawBuildingShell(
    ground,
    collision,
    home.tx,
    home.ty,
    home.tw,
    home.th,
    Tile.floor,
    home.tx + 7,
    home.ty + home.th - 1,
  );
  fillRect(ground, home.tx + 1, home.ty + 1, home.tw - 2, home.th - 2, Tile.floor);
  clearInterior(collision, home.tx, home.ty, home.tw, home.th);

  const neighbor = LOTS.find((l) => l.id === "neighbor")!;
  drawBuildingShell(
    ground,
    collision,
    neighbor.tx,
    neighbor.ty,
    neighbor.tw,
    neighbor.th,
    Tile.floorAlt,
    neighbor.tx + 5,
    neighbor.ty + neighbor.th - 1,
  );
  fillRect(
    ground,
    neighbor.tx + 1,
    neighbor.ty + 1,
    neighbor.tw - 2,
    neighbor.th - 2,
    Tile.floorAlt,
  );
  clearInterior(collision, neighbor.tx, neighbor.ty, neighbor.tw, neighbor.th);

  const market = LOTS.find((l) => l.id === "market")!;
  drawBuildingShell(
    ground,
    collision,
    market.tx,
    market.ty,
    market.tw,
    market.th,
    Tile.marketFloor,
    market.tx + 6,
    market.ty + market.th - 1,
  );
  fillRect(
    ground,
    market.tx + 1,
    market.ty + 1,
    market.tw - 2,
    market.th - 2,
    Tile.marketFloor,
  );
  clearInterior(collision, market.tx, market.ty, market.tw, market.th);

  const park = LOTS.find((l) => l.id === "park")!;
  // Formal ring plaza: outer walk frame, cardinal spurs, centered pond.
  fillRect(ground, park.tx + 2, park.ty + 2, 16, 2, Tile.parkPath); // north walk
  fillRect(ground, park.tx + 2, park.ty + 10, 16, 2, Tile.parkPath); // south walk
  fillRect(ground, park.tx + 2, park.ty + 2, 2, 10, Tile.parkPath); // west walk
  fillRect(ground, park.tx + 16, park.ty + 2, 2, 10, Tile.parkPath); // east walk
  // Spurs from the west/east walks in toward the sand rim.
  fillRect(ground, park.tx + 4, park.ty + 6, 2, 2, Tile.parkPath); // west spur
  fillRect(ground, park.tx + 14, park.ty + 6, 2, 2, Tile.parkPath); // east spur
  // Pond + sand beach rim (sand first, water on top).
  // N/S sand already butts the ring walks, so no extra spurs needed there.
  fillRect(ground, park.tx + 6, park.ty + 4, 8, 6, Tile.sand);
  fillRect(ground, park.tx + 7, park.ty + 5, 6, 4, Tile.water);
  for (let y = park.ty + 5; y < park.ty + 9; y++) {
    for (let x = park.tx + 7; x < park.tx + 13; x++) collision[y][x] = true;
  }
  // West street approach already painted with the park ring above.

  // Playpark south of Town Park - mulch paths + spur from the park road.
  const playpark = LOTS.find((l) => l.id === "playpark")!;
  fillRect(
    ground,
    playpark.tx + 1,
    playpark.ty + 1,
    playpark.tw - 2,
    playpark.th - 2,
    Tile.parkPath,
  );
  fillRect(ground, park.tx + 9, park.ty + park.th - 1, 2, 3, Tile.path);
  fillRect(ground, playpark.tx + 6, playpark.ty, 4, 1, Tile.path);

  const cafe = LOTS.find((l) => l.id === "cafe")!;
  drawBuildingShell(
    ground,
    collision,
    cafe.tx,
    cafe.ty,
    cafe.tw,
    cafe.th,
    Tile.cafeFloor,
    cafe.tx + 6,
    cafe.ty + cafe.th - 1,
  );
  fillRect(ground, cafe.tx + 1, cafe.ty + 1, cafe.tw - 2, cafe.th - 2, Tile.cafeFloor);
  clearInterior(collision, cafe.tx, cafe.ty, cafe.tw, cafe.th);

  const shelter = LOTS.find((l) => l.id === "shelter")!;
  drawBuildingShell(
    ground,
    collision,
    shelter.tx,
    shelter.ty,
    shelter.tw,
    shelter.th,
    Tile.shelterFloor,
    shelter.tx + 6,
    shelter.ty + shelter.th - 1,
  );
  fillRect(
    ground,
    shelter.tx + 1,
    shelter.ty + 1,
    shelter.tw - 2,
    shelter.th - 2,
    Tile.shelterFloor,
  );
  clearInterior(collision, shelter.tx, shelter.ty, shelter.tw, shelter.th);

  const library = LOTS.find((l) => l.id === "library")!;
  drawBuildingShell(
    ground,
    collision,
    library.tx,
    library.ty,
    library.tw,
    library.th,
    Tile.libraryFloor,
    library.tx + 6,
    library.ty + library.th - 1,
  );
  fillRect(
    ground,
    library.tx + 1,
    library.ty + 1,
    library.tw - 2,
    library.th - 2,
    Tile.libraryFloor,
  );
  clearInterior(collision, library.tx, library.ty, library.tw, library.th);

  const clinic = LOTS.find((l) => l.id === "clinic")!;
  drawBuildingShell(
    ground,
    collision,
    clinic.tx,
    clinic.ty,
    clinic.tw,
    clinic.th,
    Tile.clinicFloor,
    clinic.tx + 6,
    clinic.ty + clinic.th - 1,
  );
  fillRect(
    ground,
    clinic.tx + 1,
    clinic.ty + 1,
    clinic.tw - 2,
    clinic.th - 2,
    Tile.clinicFloor,
  );
  clearInterior(collision, clinic.tx, clinic.ty, clinic.tw, clinic.th);

  const workshop = LOTS.find((l) => l.id === "workshop")!;
  drawBuildingShell(
    ground,
    collision,
    workshop.tx,
    workshop.ty,
    workshop.tw,
    workshop.th,
    Tile.workshopFloor,
    workshop.tx + 6,
    workshop.ty + workshop.th - 1,
  );
  fillRect(
    ground,
    workshop.tx + 1,
    workshop.ty + 1,
    workshop.tw - 2,
    workshop.th - 2,
    Tile.workshopFloor,
  );
  clearInterior(collision, workshop.tx, workshop.ty, workshop.tw, workshop.th);

  // Whisperwood Forest trails were painted earlier; keep grass under the oaks.
  const forest = LOTS.find((l) => l.id === "forest")!;

  // Rocky Quarries - rock / dirt floor east of the workshop.
  const mine = LOTS.find((l) => l.id === "mine")!;
  fillRect(ground, mine.tx, mine.ty, mine.tw, mine.th, Tile.rock);
  fillRect(ground, mine.tx + 2, mine.ty + 4, 4, 3, Tile.dirt);
  fillRect(ground, mine.tx + 7, mine.ty + 9, 5, 3, Tile.dirt);
  for (let y = mine.ty; y < mine.ty + mine.th; y++) {
    for (let x = mine.tx; x < mine.tx + mine.tw; x++) {
      collision[y][x] = false;
    }
  }
  // Keep path tiles walkable into the quarry.
  fillRect(ground, 120, 22, 2, 8, Tile.path);

  // South beach strip - sand above deep water, walkable promenade.
  fillRect(ground, 2, 62, MAP_W - 4, 6, Tile.sand);
  fillRect(ground, 2, 67, MAP_W - 4, 2, Tile.water);
  for (let x = 2; x < MAP_W - 2; x++) {
    collision[67][x] = true;
    collision[68][x] = true;
  }
  // Keep a dry walk band on sand.
  for (let x = 2; x < MAP_W - 2; x++) {
    collision[62][x] = false;
    collision[63][x] = false;
    collision[64][x] = false;
    collision[65][x] = false;
    collision[66][x] = false;
  }
  // Soft wave line
  fillRect(ground, 10, 66, 8, 1, Tile.water);
  fillRect(ground, 30, 66, 10, 1, Tile.water);
  fillRect(ground, 55, 66, 12, 1, Tile.water);
  fillRect(ground, 88, 66, 10, 1, Tile.water);
  for (const [x0, w] of [
    [10, 8],
    [30, 10],
    [55, 12],
    [88, 10],
  ] as Array<[number, number]>) {
    for (let x = x0; x < x0 + w; x++) collision[66][x] = true;
  }

  // Sunny Pier - boardwalk over the south beach / shallows.
  const pier = LOTS.find((l) => l.id === "pier")!;
  fillRect(ground, pier.tx, pier.ty, pier.tw, pier.th, Tile.pierDeck);
  for (let y = pier.ty; y < pier.ty + pier.th; y++) {
    for (let x = pier.tx; x < pier.tx + pier.tw; x++) {
      collision[y][x] = false;
    }
  }
  // Water beside the pier for fishing ambience.
  fillRect(ground, pier.tx - 2, pier.ty + 2, 2, pier.th - 2, Tile.water);
  fillRect(ground, pier.tx + pier.tw, pier.ty + 2, 2, pier.th - 2, Tile.water);
  for (let y = pier.ty + 2; y < pier.ty + pier.th; y++) {
    collision[y][pier.tx - 2] = true;
    collision[y][pier.tx - 1] = true;
    collision[y][pier.tx + pier.tw] = true;
    collision[y][pier.tx + pier.tw + 1] = true;
  }
  // Deeper water south of pier.
  fillRect(ground, 2, 76, MAP_W - 4, 5, Tile.water);
  for (let y = 76; y < MAP_H - 1; y++) {
    for (let x = 2; x < MAP_W - 2; x++) collision[y][x] = true;
  }
  // Path down to beach from clinic / west / pier
  fillRect(ground, 33, 60, 2, 3, Tile.path);
  fillRect(ground, 20, 60, 2, 3, Tile.path);
  fillRect(ground, 55, 60, 2, 3, Tile.path);
  fillRect(ground, 82, 64, 2, 4, Tile.path);

  for (const { tx, ty } of allStructuralWallTiles()) {
    if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
      collision[ty][tx] = true;
    }
  }

  const doors = [
    { tx: home.tx + 7, ty: home.ty + home.th - 1, label: "Home" },
    { tx: neighbor.tx + 5, ty: neighbor.ty + neighbor.th - 1, label: "Neighbor" },
    { tx: market.tx + 6, ty: market.ty + market.th - 1, label: "Market" },
    { tx: cafe.tx + 6, ty: cafe.ty + cafe.th - 1, label: "Café" },
    { tx: shelter.tx + 6, ty: shelter.ty + shelter.th - 1, label: "Shelter" },
    { tx: library.tx + 6, ty: library.ty + library.th - 1, label: "Library" },
    { tx: clinic.tx + 6, ty: clinic.ty + clinic.th - 1, label: "Clinic" },
    {
      tx: workshop.tx + 6,
      ty: workshop.ty + workshop.th - 1,
      label: "Workshop",
    },
    {
      tx: forest.tx + 8,
      ty: forest.ty + forest.th - 1,
      label: "Whisperwood",
    },
    {
      tx: mine.tx + 7,
      ty: mine.ty + mine.th - 1,
      label: "Quarries",
    },
  ];

  const isPlantable = (x: number, y: number) => {
    const t = ground[y]?.[x];
    return t === Tile.grass || t === Tile.grassVar;
  };

  const decorSpots: Array<[number, number]> = [
    // Park lawn flower beds (inside the ring, beside the pond)
    [28, 18],
    [29, 18],
    [38, 18],
    [39, 18],
    [28, 22],
    [29, 22],
    [38, 22],
    [39, 22],
    [28, 20],
    [39, 20],
    [30, 15],
    [33, 15],
    [36, 15],
    [30, 26],
    [33, 26],
    [36, 26],
    [31, 19],
    [35, 19],
    [32, 23],
    [36, 23],
    [27, 17],
    [40, 17],
    [27, 24],
    [40, 24],
    // Home garden
    [6, 15],
    [12, 15],
    [16, 15],
    [4, 15],
    [8, 15],
    [10, 15],
    [14, 15],
    [5, 14],
    [11, 14],
    // Between home & park
    [22, 10],
    [24, 10],
    [30, 10],
    [36, 10],
    [22, 6],
    [32, 6],
    [26, 8],
    [34, 8],
    [20, 12],
    [38, 12],
    // Neighbor / market frontage
    [52, 15],
    [58, 15],
    [64, 15],
    [78, 15],
    [84, 15],
    [88, 14],
    [54, 14],
    [62, 14],
    [80, 14],
    [86, 16],
    // Café block
    [3, 32],
    [8, 32],
    [14, 32],
    [3, 46],
    [12, 46],
    [16, 46],
    [6, 45],
    [10, 33],
    [15, 44],
    // Shelter / library
    [52, 46],
    [60, 46],
    [70, 46],
    [78, 46],
    [84, 46],
    [88, 32],
    [56, 44],
    [66, 44],
    [74, 44],
    [82, 34],
    // Clinic + beach approach
    [24, 48],
    [30, 48],
    [38, 48],
    [42, 58],
    [48, 58],
    [16, 58],
    [60, 58],
    [70, 58],
    [26, 56],
    [34, 56],
    [44, 56],
    [54, 56],
    [66, 56],
    // Far lanes
    [92, 8],
    [92, 20],
    [92, 40],
    [100, 8],
    [100, 32],
    [104, 16],
    [96, 14],
    [98, 28],
    [106, 22],
    [80, 70],
    [88, 72],
    [8, 8],
    [14, 8],
    // Whisperwood fringe
    [2, 16],
    [8, 16],
    [14, 16],
    [4, 30],
    [10, 32],
    [16, 28],
    // Playpark edges
    [25, 31],
    [40, 31],
    [25, 37],
    [40, 37],
    // Mid-town accents
    [46, 20],
    [70, 20],
    [46, 28],
    [70, 28],
    [110, 18],
    [118, 22],
  ];
  for (const [x, y] of decorSpots) {
    if (!isPlantable(x, y)) continue;
    set(ground, x, y, Tile.flower);
  }

  const bushSpots: Array<[number, number]> = [
    // Park hedge corners (outside the ring)
    [25, 14],
    [28, 14],
    [39, 14],
    [42, 14],
    [25, 27],
    [28, 27],
    [39, 27],
    [42, 27],
    [24, 18],
    [24, 22],
    [43, 18],
    [43, 22],
    // Home & café yards
    [6, 14],
    [16, 14],
    [2, 28],
    [6, 38],
    [17, 38],
    [2, 42],
    // Neighbor / market / east lane
    [50, 14],
    [62, 14],
    [72, 14],
    [86, 14],
    [58, 20],
    [82, 20],
    [90, 14],
    [90, 38],
    // Shelter / library / clinic
    [48, 38],
    [66, 38],
    [88, 38],
    [50, 46],
    [66, 46],
    [88, 46],
    [22, 52],
    [26, 52],
    [42, 52],
    [42, 58],
    [58, 58],
    // Beach dunes (grass just above sand)
    [12, 61],
    [24, 61],
    [40, 61],
    [52, 61],
    [68, 61],
    [82, 61],
    [98, 30],
    [104, 30],
    [96, 16],
    // North belt accents
    [24, 4],
    [36, 4],
    [56, 4],
    [76, 4],
    [100, 4],
  ];
  for (const [x, y] of bushSpots) {
    if (!isPlantable(x, y)) continue;
    set(ground, x, y, Tile.bush);
    collision[y][x] = true;
  }

  const canHostProp = (x: number, y: number) => {
    const t = ground[y]?.[x];
    return (
      t === Tile.grass ||
      t === Tile.grassVar ||
      t === Tile.flower ||
      t === Tile.sand ||
      t === Tile.dirt ||
      t === Tile.rock
    );
  };

  const rockCandidates: Array<[number, number]> = [
    // Pond rim accents
    [30, 18],
    [37, 18],
    [30, 23],
    [37, 23],
    // Beach
    [14, 63],
    [36, 63],
    [58, 63],
    [80, 63],
    [100, 64],
    // Scattered town rocks
    [22, 28],
    [46, 32],
    [70, 18],
    [92, 22],
    [104, 22],
    [8, 56],
    [40, 48],
    // Mine décor rocks (avoid harvest nodes)
    [115, 21],
    [127, 19],
    [114, 31],
  ];
  const rocks: Array<[number, number]> = [];
  for (const [x, y] of rockCandidates) {
    if (!canHostProp(x, y)) continue;
    rocks.push([x, y]);
    collision[y][x] = true;
  }

  const fenceCandidates: Array<[number, number]> = [
    // Park south edge (even spacing)
    [25, 28],
    [29, 28],
    [33, 28],
    [37, 28],
    [41, 28],
    // Park north edge
    [25, 15],
    [29, 15],
    [37, 15],
    [41, 15],
    // Home side garden
    [18, 5],
    [18, 7],
    [18, 9],
    [18, 11],
    // South of home frontage
    [5, 16],
    [8, 16],
    [12, 16],
    [15, 16],
    // Café patio
    [4, 45],
    [7, 45],
    [11, 45],
    [15, 45],
    // Beach lookout posts
    [18, 61],
    [32, 61],
    [46, 61],
    [60, 61],
    [74, 61],
    [98, 29],
    [104, 29],
  ];
  const fencePosts: Array<[number, number]> = [];
  for (const [x, y] of fenceCandidates) {
    if (!canHostProp(x, y)) continue;
    fencePosts.push([x, y]);
    collision[y][x] = true;
  }

  // Big canopy trees - each needs a clear 2×2 grass footprint.
  const treeCandidates: Array<[number, number]> = [
    // Park corners (outside the ring walks)
    [24, 15],
    [41, 15],
    [24, 25],
    [41, 25],
    [30, 13],
    [36, 27],
    // Between home and park
    [21, 8],
    [36, 8],
    [28, 10],
    // West lane / café block (avoid Whisperwood harvest tiles)
    [16, 40],
    [10, 44],
    [18, 48],
    // Neighbor & market yards
    [48, 12],
    [64, 12],
    [56, 10],
    [72, 16],
    [88, 16],
    [92, 8],
    [100, 14],
    [104, 22],
    [108, 10],
    // Forest fringe (outside harvest node tiles)
    [3, 17],
    [15, 30],
    [1, 34],
    // Mine fringe
    [115, 17],
    [126, 30],
    [112, 26],
    // Mid-east / shelter-library
    [48, 34],
    [64, 34],
    [56, 38],
    [72, 42],
    [88, 40],
    [92, 30],
    [80, 34],
    // Clinic approach + beach fringe
    [24, 50],
    [38, 52],
    [16, 56],
    [32, 54],
    [48, 54],
    [64, 56],
    [78, 56],
    [88, 52],
    // North belt
    [28, 4],
    [48, 4],
    [68, 4],
    [84, 4],
    [100, 4],
    [118, 4],
    [40, 2],
    [76, 6],
    // Playpark flanks
    [24, 32],
    [42, 32],
    [18, 36],
    // South-east lanes
    [96, 46],
    [110, 44],
    [120, 50],
  ];
  const treeFootprintClear = (x: number, y: number) => {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        const t = ground[ty]?.[tx];
        const ok =
          t === Tile.grass ||
          t === Tile.grassVar ||
          t === Tile.flower ||
          t === Tile.bush ||
          t === Tile.dirt;
        if (!ok) return false;
        if (rocks.some(([rx, ry]) => rx === tx && ry === ty)) return false;
        if (fencePosts.some(([fx, fy]) => fx === tx && fy === ty)) return false;
        if (trees.some(([sx, sy]) => tx >= sx && tx < sx + 2 && ty >= sy && ty < sy + 2)) {
          return false;
        }
      }
    }
    return true;
  };
  const trees: Array<[number, number]> = [];
  for (const [x, y] of treeCandidates) {
    if (!treeFootprintClear(x, y)) continue;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        const t = ground[ty]?.[tx];
        if (t === Tile.bush || t === Tile.flower) set(ground, tx, ty, Tile.grass);
        collision[ty][tx] = true;
      }
    }
    trees.push([x, y]);
  }

  // Lamps at path junctions and plaza entrances.
  const lampCandidates: Array<[number, number]> = [
    // Park ring corners
    [26, 16],
    [41, 16],
    [26, 25],
    [41, 25],
    // Park west entrance
    [24, 20],
    // Street junctions
    [20, 14],
    [20, 30],
    [20, 44],
    [20, 60],
    [50, 14],
    [68, 14],
    [90, 14],
    [112, 22],
    [2, 44],
    [50, 44],
    [68, 44],
    [90, 44],
    [33, 60],
    // Beach promenade
    [20, 62],
    [48, 62],
    [72, 62],
    // Playpark entrance
    [33, 30],
  ];
  const lamps: Array<[number, number]> = [];
  const canHostLamp = (x: number, y: number) => {
    const t = ground[y]?.[x];
    return (
      t === Tile.path ||
      t === Tile.parkPath ||
      t === Tile.grass ||
      t === Tile.grassVar ||
      t === Tile.sand
    );
  };
  for (const [x, y] of lampCandidates) {
    if (!canHostLamp(x, y)) continue;
    if (trees.some(([tx, ty]) => x >= tx && x < tx + 2 && y >= ty && y < ty + 2)) {
      continue;
    }
    if (rocks.some(([rx, ry]) => rx === x && ry === y)) continue;
    if (fencePosts.some(([fx, fy]) => fx === x && fy === y)) continue;
    lamps.push([x, y]);
    // Lamps sit on path edges - block the tile so you walk around them.
    collision[y][x] = true;
  }

  // Harvest nodes: timber on empty grass town-wide + mine rocks/ore.
  const blocked: Array<[number, number]> = [
    ...rocks,
    ...fencePosts,
    ...lamps,
  ];
  for (const [tx, ty] of trees) {
    blocked.push([tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]);
  }
  const harvestNodes = seedHarvestNodes({
    ground,
    collision,
    mapW: MAP_W,
    mapH: MAP_H,
    plantable: new Set([
      Tile.grass,
      Tile.grassVar,
      Tile.dirt,
      Tile.flower,
    ]),
    blocked,
    canopyTrees: trees,
  });
  for (const node of harvestNodes) {
    if (
      node.ty >= 0 &&
      node.ty < MAP_H &&
      node.tx >= 0 &&
      node.tx < MAP_W
    ) {
      collision[node.ty][node.tx] = true;
    }
  }

  return { ground, collision, doors, rocks, fencePosts, trees, lamps, harvestNodes };
}

export const SOLID_TILES = new Set<number>([Tile.water, Tile.wall, Tile.bush]);
