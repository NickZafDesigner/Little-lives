import { Palette } from "../game/palette";

export interface FloorStyleDef {
  id: string;
  name: string;
  /** Cost per tile. */
  price: number;
  /** Numeric id persisted in saves (1+). */
  variant: number;
  color: number;
  accent: number;
  /** Aspiration unlock id (e.g. Homebody → floor_blush). */
  unlockId?: string;
}

/** Buyable paint-floor styles for build mode. */
export const FLOOR_STYLES: FloorStyleDef[] = [
  {
    id: "honey",
    name: "Honey Planks",
    price: 5,
    variant: 1,
    color: Palette.woodDeep,
    accent: Palette.mintDark,
  },
  {
    id: "cream",
    name: "Cream Checker",
    price: 6,
    variant: 2,
    color: Palette.cream,
    accent: Palette.wood,
  },
  {
    id: "slate",
    name: "Cool Slate",
    price: 7,
    variant: 3,
    color: Palette.rock,
    accent: Palette.sky,
  },
  {
    id: "sage",
    name: "Sage Wash",
    price: 6,
    variant: 4,
    color: Palette.mint,
    accent: Palette.cream,
  },
  {
    id: "terracotta",
    name: "Clay Tile",
    price: 8,
    variant: 5,
    color: Palette.blush,
    accent: Palette.woodDeep,
  },
  {
    id: "blush",
    name: "Blush Boards",
    price: 5,
    variant: 6,
    color: Palette.rose,
    accent: Palette.cream,
    unlockId: "floor_blush",
  },
];

export const floorStyleById: Record<string, FloorStyleDef> = Object.fromEntries(
  FLOOR_STYLES.map((s) => [s.id, s]),
);

export const floorStyleByVariant: Record<number, FloorStyleDef> =
  Object.fromEntries(FLOOR_STYLES.map((s) => [s.variant, s]));

export const DEFAULT_FLOOR_STYLE_ID = "honey";
