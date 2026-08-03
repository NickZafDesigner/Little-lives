import type { Dir, LotId } from "../data/types";
import { LOT_DOOR_TX, LOTS } from "./lots";

/**
 * Internal partition walls. Coordinates are relative to the lot origin
 * (lot.tx / lot.ty). Each run sits on grid tiles; door offsets stay open.
 *
 * `axis: "x"` → wall runs east-west (thin in Z).
 * `axis: "y"` → wall runs north-south (thin in X).
 */
export interface InternalWallRun {
  rx: number;
  ry: number;
  length: number;
  axis: "x" | "y";
  /** Offsets along the run (0 … length-1) left open as doorways. */
  doors?: number[];
}

export interface InteriorFurnitureSeed {
  defId: string;
  rx: number;
  ry: number;
  uid: string;
  /** Front faces this way; omit for "down". Back should sit against a wall. */
  rot?: Dir;
  /** When set, this piece sits on the named host's surface. */
  parentUid?: string;
}

export interface LotInterior {
  walls: InternalWallRun[];
  furniture: InteriorFurnitureSeed[];
}

/**
 * Home (14×11): bedroom NW, bathroom NE, living south-west, kitchen south-east.
 * Starter set stays lean - the player builds this place themselves.
 */
const HOME: LotInterior = {
  walls: [
    { rx: 6, ry: 1, length: 4, axis: "y" },
    { rx: 1, ry: 4, length: 12, axis: "x", doors: [3, 4, 8, 9] },
    { rx: 8, ry: 4, length: 6, axis: "y", doors: [2, 3] },
  ],
  furniture: [
    { defId: "bed", rx: 2, ry: 1, uid: "start_bed", rot: "down" },
    { defId: "plant", rx: 1, ry: 1, uid: "start_plant" },
    { defId: "shower", rx: 7, ry: 1, uid: "start_shower", rot: "down" },
    { defId: "toilet", rx: 12, ry: 2, uid: "start_toilet", rot: "left" },
    { defId: "tv", rx: 1, ry: 7, uid: "start_tv", rot: "right" },
    { defId: "fridge", rx: 11, ry: 5, uid: "start_fridge", rot: "down" },
    { defId: "kitchen_counter", rx: 12, ry: 7, uid: "start_counter", rot: "left" },
    { defId: "table", rx: 9, ry: 7, uid: "start_table" },
  ],
};

/** Neighbor (12×10): lived-in bedroom north, cozy living south. */
const NEIGHBOR: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "bed", rx: 1, ry: 1, uid: "n_bed", rot: "down" },
    { defId: "nightstand", rx: 3, ry: 1, uid: "n_nightstand", rot: "down" },
    { defId: "reading_lamp", rx: 3, ry: 2, uid: "n_lamp" },
    { defId: "dresser", rx: 5, ry: 1, uid: "n_dresser", rot: "down" },
    { defId: "bookshelf", rx: 8, ry: 1, uid: "n_shelf", rot: "down" },
    { defId: "plant", rx: 10, ry: 1, uid: "n_plant" },
    { defId: "wall_art", rx: 10, ry: 2, uid: "n_art" },
    { defId: "welcome_mat", rx: 5, ry: 8, uid: "n_mat" },
    { defId: "sofa", rx: 2, ry: 5, uid: "n_sofa", rot: "down" },
    { defId: "side_table", rx: 4, ry: 5, uid: "n_side" },
    { defId: "radio", rx: 4, ry: 5, uid: "n_radio", parentUid: "n_side" },
    { defId: "footstool", rx: 3, ry: 6, uid: "n_stool" },
    { defId: "table", rx: 6, ry: 7, uid: "n_table" },
    { defId: "kettle", rx: 6, ry: 7, uid: "n_kettle", parentUid: "n_table" },
    { defId: "lounge_chair", rx: 9, ry: 5, uid: "n_chair", rot: "left" },
    { defId: "floor_cushion", rx: 9, ry: 7, uid: "n_cushion" },
    { defId: "fern", rx: 10, ry: 8, uid: "n_fern" },
    { defId: "storybook", rx: 8, ry: 8, uid: "n_book" },
  ],
};

/**
 * Café (14×10): packed service west, busy seating east.
 * Keep divider doorway at rows 4–5 clear (tiles 7,4 / 7,5).
 */
const CAFE: LotInterior = {
  walls: [{ rx: 7, ry: 1, length: 8, axis: "y", doors: [3, 4] }],
  furniture: [
    // —— Service ——
    { defId: "welcome_mat", rx: 6, ry: 8, uid: "c_mat" },
    { defId: "kitchen_counter", rx: 3, ry: 1, uid: "c_prep", rot: "down" },
    { defId: "microwave", rx: 3, ry: 1, uid: "c_micro", parentUid: "c_prep" },
    { defId: "spice_rack", rx: 5, ry: 1, uid: "c_spice" },
    { defId: "wall_art", rx: 6, ry: 1, uid: "c_art_n" },
    { defId: "counter", rx: 1, ry: 2, uid: "c_counter", rot: "right" },
    { defId: "coffee_machine", rx: 1, ry: 2, uid: "c_coffee", parentUid: "c_counter" },
    // Counter is rot-right (1×2 south), so second appliance sits on (1,3) not (2,2).
    { defId: "smoothie_blender", rx: 1, ry: 3, uid: "c_blender", parentUid: "c_counter" },
    { defId: "counter", rx: 1, ry: 4, uid: "c_counter2", rot: "right" },
    { defId: "kettle", rx: 1, ry: 4, uid: "c_kettle", parentUid: "c_counter2" },
    { defId: "toaster", rx: 1, ry: 5, uid: "c_toaster", parentUid: "c_counter2" },
    { defId: "kitchen_cart", rx: 4, ry: 3, uid: "c_cart" },
    { defId: "radio", rx: 4, ry: 3, uid: "c_radio", parentUid: "c_cart" },
    { defId: "mini_fridge", rx: 1, ry: 6, uid: "c_fridge", rot: "right" },
    { defId: "counter", rx: 1, ry: 7, uid: "c_counter3", rot: "right" },
    { defId: "lantern", rx: 1, ry: 7, uid: "c_lantern", parentUid: "c_counter3" },
    { defId: "plant", rx: 5, ry: 8, uid: "c_plant_svc" },
    { defId: "party_lights", rx: 4, ry: 8, uid: "c_lights" },
    // —— Seating ——
    { defId: "table", rx: 9, ry: 2, uid: "c_table", rot: "down" },
    { defId: "lounge_chair", rx: 9, ry: 1, uid: "c_chair_n", rot: "down" },
    { defId: "lounge_chair", rx: 11, ry: 2, uid: "c_chair_e", rot: "left" },
    { defId: "lounge_chair", rx: 8, ry: 2, uid: "c_chair_w", rot: "right" },
    { defId: "lounge_chair", rx: 9, ry: 3, uid: "c_chair_s", rot: "up" },
    { defId: "side_table", rx: 11, ry: 1, uid: "c_side1" },
    { defId: "plant", rx: 12, ry: 1, uid: "c_plant" },
    { defId: "love_seat", rx: 12, ry: 2, uid: "c_booth", rot: "left" },
    { defId: "jukebox", rx: 12, ry: 5, uid: "c_jukebox", rot: "left" },
    { defId: "wall_art", rx: 12, ry: 6, uid: "c_art_e" },
    { defId: "table", rx: 9, ry: 7, uid: "c_table2", rot: "down" },
    { defId: "lounge_chair", rx: 9, ry: 6, uid: "c_chair2_n", rot: "down" },
    { defId: "lounge_chair", rx: 11, ry: 7, uid: "c_chair2_e", rot: "left" },
    { defId: "lounge_chair", rx: 8, ry: 7, uid: "c_chair2_w", rot: "right" },
    { defId: "lounge_chair", rx: 9, ry: 8, uid: "c_chair2_s", rot: "up" },
    { defId: "side_table", rx: 11, ry: 8, uid: "c_side2" },
    { defId: "fern", rx: 12, ry: 8, uid: "c_fern" },
    { defId: "footstool", rx: 8, ry: 5, uid: "c_stool" },
    { defId: "floor_cushion", rx: 8, ry: 8, uid: "c_cushion" },
  ],
};

/** Shelter (14×10): reception north, lively pet floor south. */
const SHELTER: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 12, axis: "x", doors: [5, 6] }],
  furniture: [
    { defId: "welcome_mat", rx: 6, ry: 8, uid: "s_mat" },
    { defId: "shelter_desk", rx: 2, ry: 1, uid: "s_desk", rot: "down" },
    { defId: "side_table", rx: 4, ry: 1, uid: "s_desk_side" },
    { defId: "radio", rx: 4, ry: 1, uid: "s_radio", parentUid: "s_desk_side" },
    { defId: "reading_lamp", rx: 5, ry: 2, uid: "s_lamp" },
    { defId: "plant", rx: 1, ry: 1, uid: "s_plant" },
    { defId: "love_seat", rx: 6, ry: 1, uid: "s_wait", rot: "down" },
    { defId: "storybook", rx: 8, ry: 1, uid: "s_mags" },
    { defId: "aquarium", rx: 9, ry: 1, uid: "s_fish", rot: "down" },
    { defId: "fern", rx: 12, ry: 1, uid: "s_fern" },
    { defId: "wall_art", rx: 12, ry: 2, uid: "s_art" },
    // Pet floor - beds, bowls, toys, climbing.
    { defId: "pet_bed", rx: 1, ry: 6, uid: "s_bed" },
    { defId: "pet_bed", rx: 3, ry: 6, uid: "s_bed2" },
    { defId: "pet_bed", rx: 5, ry: 6, uid: "s_bed3" },
    { defId: "pet_bed", rx: 1, ry: 8, uid: "s_bed4" },
    { defId: "nest_basket", rx: 3, ry: 8, uid: "s_nest" },
    { defId: "toy_ball", rx: 5, ry: 8, uid: "s_ball" },
    { defId: "yarn_ball", rx: 6, ry: 7, uid: "s_yarn" },
    { defId: "cat_tree", rx: 8, ry: 6, uid: "s_tree" },
    { defId: "scratching_post", rx: 8, ry: 8, uid: "s_scratch" },
    { defId: "dog_house", rx: 10, ry: 6, uid: "s_house" },
    { defId: "pet_bowl", rx: 12, ry: 6, uid: "s_bowl" },
    { defId: "pet_bowl", rx: 12, ry: 7, uid: "s_bowl2" },
    { defId: "pet_bowl", rx: 10, ry: 8, uid: "s_bowl3" },
    { defId: "plant", rx: 12, ry: 8, uid: "s_plant_s" },
    { defId: "party_lights", rx: 7, ry: 5, uid: "s_lights" },
  ],
};

/** Market (12×10): counter + jam wall north, packed stock south. */
const MARKET: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "welcome_mat", rx: 6, ry: 8, uid: "m_mat" },
    { defId: "jam_shelf", rx: 1, ry: 1, uid: "m_jam", rot: "down" },
    { defId: "counter", rx: 3, ry: 1, uid: "m_counter", rot: "down" },
    { defId: "radio", rx: 3, ry: 1, uid: "m_radio", parentUid: "m_counter" },
    { defId: "jam_shelf", rx: 6, ry: 1, uid: "m_jam2", rot: "down" },
    { defId: "market_crate", rx: 8, ry: 1, uid: "m_crate_n", rot: "down" },
    { defId: "spice_rack", rx: 9, ry: 1, uid: "m_spice_n" },
    { defId: "plant", rx: 10, ry: 1, uid: "m_plant_n" },
    { defId: "wall_art", rx: 10, ry: 2, uid: "m_art" },
    { defId: "kitchen_cart", rx: 1, ry: 2, uid: "m_cart" },
    { defId: "kettle", rx: 1, ry: 2, uid: "m_kettle", parentUid: "m_cart" },
    { defId: "mini_fridge", rx: 8, ry: 2, uid: "m_fridge", rot: "down" },
    // Stock aisle - crates + produce tables.
    { defId: "market_crate", rx: 1, ry: 6, uid: "m_crate1", rot: "right" },
    { defId: "market_crate", rx: 3, ry: 6, uid: "m_crate2", rot: "right" },
    { defId: "market_crate", rx: 5, ry: 6, uid: "m_crate3", rot: "right" },
    { defId: "table", rx: 7, ry: 6, uid: "m_table", rot: "down" },
    { defId: "toaster", rx: 7, ry: 6, uid: "m_sample", parentUid: "m_table" },
    { defId: "market_crate", rx: 1, ry: 7, uid: "m_crate4", rot: "right" },
    { defId: "market_crate", rx: 3, ry: 7, uid: "m_crate5", rot: "right" },
    { defId: "wood_shelf", rx: 1, ry: 8, uid: "m_shelf", rot: "up" },
    { defId: "jam_shelf", rx: 5, ry: 8, uid: "m_jam3", rot: "up" },
    { defId: "spice_rack", rx: 7, ry: 8, uid: "m_spice" },
    { defId: "plant", rx: 8, ry: 8, uid: "m_plant" },
    { defId: "fern", rx: 10, ry: 8, uid: "m_fern" },
    { defId: "lantern", rx: 8, ry: 6, uid: "m_lantern", parentUid: "m_table" },
  ],
};

/**
 * Library (12×10): wall-to-wall stacks, desk north, reading nook south.
 * Job stations l_desk / l_table stay put.
 * Keep exterior door col 6 clear (tiles 6,5–6,8) and divider doors at row 4.
 */
const LIBRARY: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "welcome_mat", rx: 6, ry: 8, uid: "l_mat" },
    // Front desk + continuous north stacks.
    { defId: "reading_lamp", rx: 1, ry: 1, uid: "l_lamp_desk" },
    { defId: "library_desk", rx: 2, ry: 1, uid: "l_desk", rot: "down" },
    { defId: "storybook", rx: 4, ry: 1, uid: "l_stack_desk" },
    { defId: "grand_bookshelf", rx: 5, ry: 1, uid: "l_grand_n", rot: "down" },
    { defId: "bookshelf", rx: 7, ry: 1, uid: "l_shelf_n0", rot: "down" },
    { defId: "bookshelf", rx: 8, ry: 1, uid: "l_shelf_n1", rot: "down" },
    { defId: "bookshelf", rx: 9, ry: 1, uid: "l_shelf_n2", rot: "down" },
    { defId: "bookshelf", rx: 10, ry: 1, uid: "l_shelf_n3", rot: "down" },
    { defId: "wall_art", rx: 1, ry: 2, uid: "l_art_n" },
    { defId: "storybook", rx: 4, ry: 2, uid: "l_stack2" },
    { defId: "plant", rx: 10, ry: 2, uid: "l_plant_n" },
    // Reading room - shelves wrap the walls; door aisle (col 6) stays open.
    { defId: "bookshelf", rx: 1, ry: 5, uid: "l_shelf_w1", rot: "right" },
    { defId: "bookshelf", rx: 1, ry: 6, uid: "l_shelf_w2", rot: "right" },
    { defId: "bookshelf", rx: 1, ry: 7, uid: "l_shelf_w3", rot: "right" },
    { defId: "table", rx: 2, ry: 6, uid: "l_table" },
    { defId: "storybook", rx: 4, ry: 6, uid: "l_stack" },
    { defId: "storybook", rx: 4, ry: 7, uid: "l_stack3" },
    { defId: "writing_desk", rx: 7, ry: 6, uid: "l_write", rot: "down" },
    { defId: "reading_lamp", rx: 7, ry: 5, uid: "l_lamp" },
    { defId: "lounge_chair", rx: 9, ry: 6, uid: "l_chair", rot: "left" },
    { defId: "bookshelf", rx: 10, ry: 5, uid: "l_shelf_e1", rot: "left" },
    { defId: "bookshelf", rx: 10, ry: 6, uid: "l_shelf_e2", rot: "left" },
    { defId: "bookshelf", rx: 10, ry: 7, uid: "l_shelf_e3", rot: "left" },
    { defId: "grand_bookshelf", rx: 2, ry: 8, uid: "l_grand_s", rot: "up" },
    { defId: "bookshelf", rx: 4, ry: 8, uid: "l_shelf_s1", rot: "up" },
    // East reading nook — do not place blocking pieces on door col 6.
    { defId: "puzzle_table", rx: 8, ry: 7, uid: "l_puzzle", rot: "up" },
    { defId: "bean_bag", rx: 8, ry: 8, uid: "l_bean" },
    { defId: "floor_cushion", rx: 9, ry: 8, uid: "l_cushion" },
    { defId: "plant", rx: 3, ry: 5, uid: "l_plant" },
    { defId: "fern", rx: 8, ry: 5, uid: "l_fern" },
    { defId: "telescope", rx: 10, ry: 8, uid: "l_scope", rot: "up" },
  ],
};

/** Clinic (14×10): calm reception north, waiting + exam south. */
const CLINIC: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 12, axis: "x", doors: [5, 6] }],
  furniture: [
    { defId: "welcome_mat", rx: 6, ry: 8, uid: "k_mat" },
    { defId: "clinic_desk", rx: 2, ry: 1, uid: "k_desk", rot: "down" },
    { defId: "side_table", rx: 4, ry: 1, uid: "k_desk_side" },
    { defId: "lantern", rx: 4, ry: 1, uid: "k_desk_lamp", parentUid: "k_desk_side" },
    { defId: "medicine_cabinet", rx: 5, ry: 1, uid: "k_meds", rot: "down" },
    { defId: "medicine_cabinet", rx: 6, ry: 1, uid: "k_meds2", rot: "down" },
    { defId: "aquarium", rx: 8, ry: 1, uid: "k_fish", rot: "down" },
    { defId: "healing_plant", rx: 10, ry: 1, uid: "k_heal_n" },
    { defId: "plant", rx: 12, ry: 1, uid: "k_plant_n" },
    { defId: "wall_art", rx: 1, ry: 2, uid: "k_art" },
    { defId: "reading_lamp", rx: 12, ry: 2, uid: "k_lamp_n" },
    // Waiting lounge + exam bay.
    { defId: "sofa", rx: 1, ry: 6, uid: "k_sofa", rot: "right" },
    { defId: "love_seat", rx: 1, ry: 8, uid: "k_wait2", rot: "down" },
    { defId: "side_table", rx: 3, ry: 7, uid: "k_side" },
    { defId: "storybook", rx: 4, ry: 6, uid: "k_mags" },
    { defId: "storybook", rx: 4, ry: 7, uid: "k_mags2" },
    { defId: "floor_cushion", rx: 5, ry: 8, uid: "k_cushion" },
    { defId: "bed", rx: 7, ry: 6, uid: "k_exam", rot: "down" },
    { defId: "side_table", rx: 9, ry: 6, uid: "k_exam_side" },
    { defId: "kettle", rx: 9, ry: 6, uid: "k_tea", parentUid: "k_exam_side" },
    { defId: "vanity", rx: 9, ry: 8, uid: "k_vanity", rot: "up" },
    { defId: "healing_plant", rx: 11, ry: 6, uid: "k_heal" },
    { defId: "plant", rx: 12, ry: 8, uid: "k_plant" },
    { defId: "fern", rx: 12, ry: 6, uid: "k_fern" },
    // Keep door tile (6,8) free for the welcome mat.
    { defId: "footstool", rx: 5, ry: 7, uid: "k_stool" },
  ],
};

/** Workshop (12×10): tool wall north, full craft floor south. */
const WORKSHOP: LotInterior = {
  walls: [{ rx: 1, ry: 4, length: 10, axis: "x", doors: [4, 5] }],
  furniture: [
    { defId: "welcome_mat", rx: 6, ry: 8, uid: "w_mat" },
    { defId: "workbench", rx: 2, ry: 1, uid: "w_bench", rot: "down" },
    { defId: "tool_rack", rx: 4, ry: 1, uid: "w_tools", rot: "down" },
    { defId: "tool_rack", rx: 5, ry: 1, uid: "w_tools2", rot: "down" },
    { defId: "tool_rack", rx: 6, ry: 1, uid: "w_tools3", rot: "down" },
    { defId: "tool_rack", rx: 8, ry: 1, uid: "w_tools4", rot: "down" },
    { defId: "wood_shelf", rx: 9, ry: 1, uid: "w_scraps_n", rot: "down" },
    { defId: "wall_art", rx: 1, ry: 1, uid: "w_art" },
    { defId: "wood_shelf", rx: 1, ry: 2, uid: "w_scraps", rot: "right" },
    { defId: "plant", rx: 3, ry: 3, uid: "w_plant_n" },
    // Craft floor.
    { defId: "table", rx: 2, ry: 6, uid: "w_table" },
    { defId: "sewing_machine", rx: 2, ry: 6, uid: "w_sew", parentUid: "w_table" },
    { defId: "lantern", rx: 3, ry: 6, uid: "w_bench_light", parentUid: "w_table" },
    // Keep door col 6 clear — craft table sits west of the aisle.
    { defId: "craft_table", rx: 4, ry: 6, uid: "w_craft", rot: "down" },
    { defId: "radio", rx: 4, ry: 6, uid: "w_radio", parentUid: "w_craft" },
    { defId: "pottery_wheel", rx: 8, ry: 6, uid: "w_pottery" },
    { defId: "kitchen_cart", rx: 10, ry: 6, uid: "w_cart" },
    { defId: "kettle", rx: 10, ry: 6, uid: "w_tea", parentUid: "w_cart" },
    { defId: "tool_rack", rx: 10, ry: 8, uid: "w_tools_s", rot: "up" },
    { defId: "wood_shelf", rx: 1, ry: 8, uid: "w_scraps_s", rot: "up" },
    { defId: "footstool", rx: 4, ry: 8, uid: "w_stool" },
    // Keep door tile (6,8) free for the welcome mat.
    { defId: "plant", rx: 7, ry: 8, uid: "w_plant" },
    { defId: "fern", rx: 8, ry: 8, uid: "w_fern" },
    { defId: "party_lights", rx: 7, ry: 5, uid: "w_lights" },
  ],
};

export const LOT_INTERIORS: Partial<Record<LotId, LotInterior>> = {
  home: HOME,
  neighbor: NEIGHBOR,
  cafe: CAFE,
  shelter: SHELTER,
  market: MARKET,
  library: LIBRARY,
  clinic: CLINIC,
  workshop: WORKSHOP,
};

/** Absolute tile cells occupied by structural internal walls (no doorways). */
export function structuralWallTiles(lotId: LotId): Array<{ tx: number; ty: number }> {
  const lot = LOTS.find((l) => l.id === lotId);
  const interior = LOT_INTERIORS[lotId];
  if (!lot || !interior) return [];
  const out: Array<{ tx: number; ty: number }> = [];
  for (const run of interior.walls) {
    const doors = new Set(run.doors ?? []);
    for (let i = 0; i < run.length; i++) {
      if (doors.has(i)) continue;
      const tx = lot.tx + (run.axis === "x" ? run.rx + i : run.rx);
      const ty = lot.ty + (run.axis === "y" ? run.ry + i : run.ry);
      out.push({ tx, ty });
    }
  }
  return out;
}

export function allStructuralWallTiles(): Array<{ tx: number; ty: number }> {
  const out: Array<{ tx: number; ty: number }> = [];
  for (const id of Object.keys(LOT_INTERIORS) as LotId[]) {
    out.push(...structuralWallTiles(id));
  }
  return out;
}

/** Starter furniture for a lot, with absolute tile coords. */
export function interiorFurniture(lotId: LotId): Array<{
  uid: string;
  defId: string;
  tx: number;
  ty: number;
  lotId: LotId;
  rot?: Dir;
  parentUid?: string;
}> {
  const lot = LOTS.find((l) => l.id === lotId);
  const interior = LOT_INTERIORS[lotId];
  if (!lot || !interior) return [];
  // Always seat welcome mats on the interior tile just inside the south door.
  const doorRx = LOT_DOOR_TX[lotId];
  const matRy = lot.th - 2;
  return interior.furniture.map((f) => {
    const onDoorMat =
      f.defId === "welcome_mat" && doorRx !== undefined
        ? { rx: doorRx, ry: matRy }
        : { rx: f.rx, ry: f.ry };
    return {
      uid: f.uid,
      defId: f.defId,
      tx: lot.tx + onDoorMat.rx,
      ty: lot.ty + onDoorMat.ry,
      lotId,
      rot: f.rot,
      ...(f.parentUid ? { parentUid: f.parentUid } : {}),
    };
  });
}
