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

export const MAP_W = 72;
export const MAP_H = 52;

export interface TownMapData {
  ground: number[][];
  collision: boolean[][];
  doors: Array<{ tx: number; ty: number; label: string }>;
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

  // Path network around lots (see LOTS footprints).
  // Main spine between west lots and the park.
  fillRect(ground, 18, 2, 2, MAP_H - 4, Tile.path);
  // Northern belt above the park / houses.
  fillRect(ground, 18, 2, 50, 1, Tile.path);
  // Home frontage.
  fillRect(ground, 2, 14, 18, 2, Tile.path);
  // Far-east lane past market / library.
  fillRect(ground, 66, 2, 2, 46, Tile.path);
  // Mid-east lane between shelter and library gap.
  fillRect(ground, 50, 2, 2, 34, Tile.path);
  // Neighbor + market frontage (south of both).
  fillRect(ground, 36, 13, 32, 2, Tile.path);
  // West lane.
  fillRect(ground, 2, 16, 2, 18, Tile.path);
  // South of park / between café & shelter.
  fillRect(ground, 18, 24, 18, 2, Tile.path);
  // Park entrance.
  fillRect(ground, 20, 18, 2, 2, Tile.path);
  // Café / shelter / library frontage.
  fillRect(ground, 2, 34, 66, 2, Tile.path);
  // Connector east to library/market gap.
  fillRect(ground, 50, 24, 16, 2, Tile.path);
  // Clinic approach — south spine + frontage.
  fillRect(ground, 18, 36, 2, 14, Tile.path);
  fillRect(ground, 18, 48, 20, 2, Tile.path);
  fillRect(ground, 2, 48, 16, 2, Tile.path);

  // Door welcome mats
  fillRect(ground, 9, 14, 3, 2, Tile.path); // home
  fillRect(ground, 40, 13, 3, 2, Tile.path); // neighbor
  fillRect(ground, 59, 13, 3, 2, Tile.path); // market
  fillRect(ground, 9, 34, 3, 2, Tile.path); // café
  fillRect(ground, 41, 34, 3, 2, Tile.path); // shelter
  fillRect(ground, 59, 34, 3, 2, Tile.path); // library
  fillRect(ground, 25, 48, 3, 2, Tile.path); // clinic

  // Pond in park
  fillRect(ground, 26, 16, 4, 3, Tile.water);
  fillRect(ground, 25, 17, 6, 1, Tile.sand);
  for (let y = 16; y < 19; y++) {
    for (let x = 26; x < 30; x++) collision[y][x] = true;
  }

  // South cove / beach accent
  fillRect(ground, 40, 48, 8, 2, Tile.sand);
  fillRect(ground, 42, 49, 4, 1, Tile.water);
  for (let x = 42; x < 46; x++) collision[49][x] = true;

  const decorSpots = [
    [6, 16],
    [12, 16],
    [22, 6],
    [30, 10],
    [33, 22],
    [22, 30],
    [40, 18],
    [48, 16],
    [62, 16],
    [28, 36],
    [10, 40],
  ];
  for (const [x, y] of decorSpots) {
    if (ground[y]?.[x] === Tile.path) continue;
    set(ground, x, y, Tile.flower);
  }
  const bushSpots = [
    [6, 15],
    [21, 10],
    [34, 10],
    [6, 28],
    [45, 20],
    [62, 20],
    [16, 42],
  ];
  for (const [x, y] of bushSpots) {
    if (ground[y]?.[x] === Tile.path) continue;
    set(ground, x, y, Tile.bush);
    collision[y][x] = true;
  }

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
  fillRect(ground, park.tx + 2, park.ty + 2, park.tw - 4, park.th - 4, Tile.parkPath);
  fillRect(ground, 26, 16, 4, 3, Tile.water);
  fillRect(ground, 25, 17, 6, 1, Tile.sand);

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

  return { ground, collision, doors };
}

export const SOLID_TILES = new Set<number>([Tile.water, Tile.wall, Tile.bush]);
