import { LOTS } from "./lots";
import { allStructuralWallTiles } from "./rooms";

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
} as const;

export type TileCode = (typeof Tile)[keyof typeof Tile];

export const MAP_W = 96;
export const MAP_H = 68;

export interface TownMapData {
  ground: number[][];
  collision: boolean[][];
  doors: Array<{ tx: number; ty: number; label: string }>;
  /** Decorative world props placed on top of grass (not tile codes). */
  rocks: Array<[number, number]>;
  fencePosts: Array<[number, number]>;
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
  fillRect(ground, 20, 2, 2, 58, Tile.path);
  // Northern belt above houses.
  fillRect(ground, 20, 2, 72, 1, Tile.path);
  // Home frontage.
  fillRect(ground, 2, 14, 20, 2, Tile.path);
  // Far-east lane past market / library.
  fillRect(ground, 90, 2, 2, 52, Tile.path);
  // Mid-east lane between shelter and library gap.
  fillRect(ground, 68, 2, 2, 44, Tile.path);
  // Neighbor + market frontage.
  fillRect(ground, 50, 13, 42, 2, Tile.path);
  // West lane by café.
  fillRect(ground, 2, 16, 2, 28, Tile.path);
  // South of park / between café & shelter.
  fillRect(ground, 20, 30, 30, 2, Tile.path);
  // Park west entrance from spine.
  fillRect(ground, 22, 20, 2, 2, Tile.path);
  // Café / shelter / library frontage.
  fillRect(ground, 2, 44, 90, 2, Tile.path);
  // Connector east to library/market gap.
  fillRect(ground, 68, 30, 24, 2, Tile.path);
  // Clinic approach - south spine + frontage.
  fillRect(ground, 20, 46, 2, 16, Tile.path);
  fillRect(ground, 20, 60, 30, 2, Tile.path);
  fillRect(ground, 2, 60, 18, 2, Tile.path);
  // Beach promenade (walkable sand corridor later painted sand).
  fillRect(ground, 2, 62, 92, 2, Tile.path);

  // Door welcome mats
  fillRect(ground, 9, 14, 3, 2, Tile.path); // home
  fillRect(ground, 54, 13, 3, 2, Tile.path); // neighbor
  fillRect(ground, 79, 13, 3, 2, Tile.path); // market
  fillRect(ground, 9, 44, 3, 2, Tile.path); // café
  fillRect(ground, 55, 44, 3, 2, Tile.path); // shelter
  fillRect(ground, 79, 44, 3, 2, Tile.path); // library
  fillRect(ground, 33, 60, 3, 2, Tile.path); // clinic

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
  fillRect(ground, park.tx + 2, park.ty + 7, 16, 2, Tile.parkPath);
  fillRect(ground, park.tx + 9, park.ty + 2, 2, 10, Tile.parkPath);
  fillRect(ground, park.tx + 2, park.ty + 2, 2, 2, Tile.parkPath);
  fillRect(ground, park.tx + 16, park.ty + 2, 2, 2, Tile.parkPath);
  fillRect(ground, park.tx + 2, park.ty + 10, 2, 2, Tile.parkPath);
  fillRect(ground, park.tx + 16, park.ty + 10, 2, 2, Tile.parkPath);
  fillRect(ground, park.tx + 7, park.ty + 5, 6, 3, Tile.water);
  fillRect(ground, park.tx + 6, park.ty + 6, 8, 1, Tile.sand);
  for (let y = park.ty + 5; y < park.ty + 8; y++) {
    for (let x = park.tx + 7; x < park.tx + 13; x++) collision[y][x] = true;
  }

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

  // South beach strip — sand above deep water, walkable promenade.
  fillRect(ground, 2, 62, 92, 4, Tile.sand);
  fillRect(ground, 2, 65, 92, 2, Tile.water);
  for (let x = 2; x < 94; x++) {
    collision[65][x] = true;
    collision[66][x] = true;
  }
  // Keep a dry walk band on sand (overwrite water collision on y=64).
  for (let x = 2; x < 94; x++) {
    collision[62][x] = false;
    collision[63][x] = false;
    collision[64][x] = false;
  }
  // Soft wave line
  fillRect(ground, 10, 64, 8, 1, Tile.water);
  fillRect(ground, 30, 64, 10, 1, Tile.water);
  fillRect(ground, 55, 64, 12, 1, Tile.water);
  fillRect(ground, 78, 64, 8, 1, Tile.water);
  for (const [x0, w] of [
    [10, 8],
    [30, 10],
    [55, 12],
    [78, 8],
  ] as Array<[number, number]>) {
    for (let x = x0; x < x0 + w; x++) collision[64][x] = true;
  }
  // Path down to beach from clinic / west
  fillRect(ground, 33, 60, 2, 3, Tile.path);
  fillRect(ground, 20, 60, 2, 3, Tile.path);
  fillRect(ground, 55, 60, 2, 3, Tile.path);

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
  ];

  const isPlantable = (x: number, y: number) => {
    const t = ground[y]?.[x];
    return t === Tile.grass || t === Tile.grassVar;
  };

  const decorSpots: Array<[number, number]> = [
    // Park flower beds
    [28, 16],
    [29, 16],
    [38, 16],
    [39, 16],
    [28, 25],
    [29, 25],
    [38, 25],
    [39, 25],
    [26, 18],
    [26, 22],
    [41, 18],
    [41, 22],
    [32, 15],
    [35, 15],
    [32, 26],
    [35, 26],
    // Home garden
    [6, 15],
    [12, 15],
    [16, 15],
    [4, 15],
    // Between home & park
    [22, 10],
    [24, 10],
    [30, 10],
    [36, 10],
    [22, 6],
    [32, 6],
    // Neighbor / market frontage
    [52, 15],
    [58, 15],
    [64, 15],
    [78, 15],
    [84, 15],
    [88, 14],
    // Café block
    [3, 32],
    [8, 32],
    [14, 32],
    [3, 46],
    [12, 46],
    [16, 46],
    // Shelter / library
    [52, 46],
    [60, 46],
    [70, 46],
    [78, 46],
    [84, 46],
    [88, 32],
    // Clinic + beach approach
    [24, 48],
    [30, 48],
    [38, 48],
    [42, 58],
    [48, 58],
    [16, 58],
    [60, 58],
    [70, 58],
    // Far lanes
    [92, 8],
    [92, 20],
    [92, 40],
    [8, 8],
    [14, 8],
  ];
  for (const [x, y] of decorSpots) {
    if (!isPlantable(x, y)) continue;
    set(ground, x, y, Tile.flower);
  }

  const bushSpots: Array<[number, number]> = [
    // Park hedge frame
    [25, 14],
    [28, 14],
    [40, 14],
    [43, 14],
    [25, 27],
    [43, 27],
    [25, 18],
    [43, 20],
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
    // North belt accents
    [24, 4],
    [36, 4],
    [56, 4],
    [76, 4],
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
      t === Tile.sand
    );
  };

  const rockCandidates: Array<[number, number]> = [
    [31, 19],
    [38, 19],
    [30, 24],
    [39, 24],
    [34, 18],
    [28, 20],
    [42, 20],
    [14, 63],
    [36, 63],
    [58, 63],
    [80, 63],
    [22, 28],
    [46, 32],
    [70, 18],
    [92, 22],
    [8, 56],
    [40, 48],
    [3, 22],
  ];
  const rocks: Array<[number, number]> = [];
  for (const [x, y] of rockCandidates) {
    if (!canHostProp(x, y)) continue;
    rocks.push([x, y]);
    collision[y][x] = true;
  }

  const fenceCandidates: Array<[number, number]> = [
    // Park south edge
    [25, 28],
    [28, 28],
    [32, 28],
    [36, 28],
    [40, 28],
    [43, 28],
    // Park north
    [25, 15],
    [28, 15],
    [40, 15],
    [43, 15],
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
  ];
  const fencePosts: Array<[number, number]> = [];
  for (const [x, y] of fenceCandidates) {
    if (!canHostProp(x, y)) continue;
    fencePosts.push([x, y]);
    collision[y][x] = true;
  }

  return { ground, collision, doors, rocks, fencePosts };
}

export const SOLID_TILES = new Set<number>([Tile.water, Tile.wall, Tile.bush]);
