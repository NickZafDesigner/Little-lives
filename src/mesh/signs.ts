import * as THREE from "three";
import { Palette } from "../game/palette";
import type { LotId } from "../data/types";
import { lotDoorSignWorld } from "../world/lots";
import { mat } from "./materials";

export interface SignDef {
  id: string;
  lotId: LotId;
  name: string;
  blurb: string;
  accent: number;
  /** Side of the door when facing the building from the street. */
  side?: "west" | "east";
}

/** e.g. Pippin → "Pippin's Home", James → "James' Home". */
export function homeSignTitle(playerName: string): string {
  const name = playerName.trim() || "Pippin";
  const possessive = /s$/i.test(name) ? `${name}'` : `${name}'s`;
  return `${possessive} Home`;
}

/** Keep the shared home SignDef in sync for menus / look-ups. */
export function resolveHomeSignName(playerName: string): string {
  const title = homeSignTitle(playerName);
  const home = TOWN_SIGNS.find((s) => s.id === "sign_home");
  if (home) home.name = title;
  return title;
}

/** Clickable town signs - one per landmark, planted beside the front door. */
export const TOWN_SIGNS: SignDef[] = [
  {
    id: "sign_home",
    lotId: "home",
    name: "Your Home",
    blurb: "Home sweet home. A little house of your own - still finding its style.",
    side: "west",
    accent: Palette.wallTrim,
  },
  {
    id: "sign_neighbor",
    lotId: "neighbor",
    name: "Mabel's House",
    blurb: "Mabel the baker lives here. Something sweet is always in the oven.",
    side: "east",
    accent: Palette.rose,
  },
  {
    id: "sign_market",
    lotId: "market",
    name: "Vera's Market",
    blurb: "Vera's Market - jam, parcels, and she'll buy your gathered materials.",
    side: "west",
    accent: Palette.blush,
  },
  {
    id: "sign_park",
    lotId: "park",
    name: "Town Park",
    blurb: "Grass, a pond, and Pip tending the flowers. A good place to breathe.",
    side: "west",
    accent: Palette.leaf,
  },
  {
    id: "sign_playpark",
    lotId: "playpark",
    name: "Playpark",
    blurb: "Swings, a slide, and room to burn the beige away. Higher swings, more fun!",
    side: "east",
    accent: Palette.sunflower,
  },
  {
    id: "sign_cafe",
    lotId: "cafe",
    name: "Sunny Café",
    blurb: "Sunny Café - open 9 to 5. Jun runs the counter. Help wanted!",
    side: "east",
    accent: Palette.cafe,
  },
  {
    id: "sign_shelter",
    lotId: "shelter",
    name: "Pet Shelter",
    blurb: "The Pet Shelter. Soft beds, full bowls, and friends waiting for a home.",
    side: "west",
    accent: Palette.skyDeep,
  },
  {
    id: "sign_library",
    lotId: "library",
    name: "Town Library",
    blurb: "Quiet stacks, overdue stamps, and Theo behind the desk.",
    side: "east",
    accent: Palette.lavender,
  },
  {
    id: "sign_clinic",
    lotId: "clinic",
    name: "Sage Clinic",
    blurb: "Dr. Sage's clinic - bandages, checkups, and calm advice.",
    side: "west",
    accent: Palette.mint,
  },
  {
    id: "sign_workshop",
    lotId: "workshop",
    name: "Reed's Workshop",
    blurb: "Sawdust, scrap wood, and Reed's tool bench. Axes, pickaxes, shovels & rods for sale.",
    side: "east",
    accent: Palette.woodDark,
  },
  {
    id: "sign_pier",
    lotId: "pier",
    name: "Sunny Pier",
    blurb: "Boardwalk over the shallows. Bring a fishing rod and cast a line.",
    side: "west",
    accent: Palette.sunflower,
  },
  {
    id: "sign_forest",
    lotId: "forest",
    name: "Whisperwood",
    blurb: "Tall timber, fruit trees, and dig mounds. Bring an axe and a shovel.",
    side: "east",
    accent: Palette.leaf,
  },
  {
    id: "sign_mine",
    lotId: "mine",
    name: "Rocky Quarries",
    blurb: "Stone, coal, and ore. A pickaxe earns its keep here.",
    side: "west",
    accent: Palette.rock,
  },
];

export const signById = Object.fromEntries(
  TOWN_SIGNS.map((s) => [s.id, s]),
) as Record<string, SignDef>;

function makeSignTexture(title: string, accent: number): THREE.CanvasTexture {
  const w = 256;
  const h = 140;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#f4e2c0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e6cfa0";
  ctx.fillRect(8, 8, w - 16, h - 16);

  const hex = `#${accent.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = hex;
  ctx.fillRect(8, 8, w - 16, 14);
  ctx.fillRect(8, h - 22, w - 16, 14);

  ctx.fillStyle = "#4a3428";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = title.split(" ");
  const lines: string[] =
    words.length > 2 || title.length > 12
      ? [
          words.slice(0, Math.ceil(words.length / 2)).join(" "),
          words.slice(Math.ceil(words.length / 2)).join(" "),
        ]
      : [title];

  const size = lines.length > 1 ? 28 : 34;
  ctx.font = `800 ${size}px Nunito, system-ui, sans-serif`;
  const startY = h / 2 - ((lines.length - 1) * (size + 4)) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * (size + 6));
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export interface SignHandle {
  def: SignDef;
  root: THREE.Group;
  /** Tile under the post for pathfinding approach. */
  tile: { x: number; y: number };
  worldX: number;
  worldZ: number;
}

export function buildTownSigns(playerName = "Pippin"): {
  group: THREE.Group;
  signs: SignHandle[];
} {
  resolveHomeSignName(playerName);

  const group = new THREE.Group();
  group.name = "signs";
  const signs: SignHandle[] = [];

  for (const def of TOWN_SIGNS) {
    const pose = lotDoorSignWorld(def.lotId, def.side ?? "east");
    if (!pose) continue;

    const root = new THREE.Group();
    root.name = def.id;
    root.userData.signId = def.id;

    // Path tile tops sit near y≈0.6 - plant posts there so they don't sink.
    // Board faces +Z (street), post hugged to the south wall face.
    root.position.set(pose.x, 0.55, pose.z);

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 26, 3.2),
      mat(Palette.woodDark),
    );
    post.position.y = 13;
    post.castShadow = true;
    root.add(post);

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(22, 2.4, 2.4),
      mat(Palette.wood),
    );
    bar.position.set(0, 24, 0.4);
    bar.castShadow = true;
    root.add(bar);

    const tex = makeSignTexture(def.name, def.accent);
    const boardMat = new THREE.MeshLambertMaterial({
      map: tex,
      flatShading: true,
    });
    const boardBack = mat(def.accent);
    const board = new THREE.Mesh(new THREE.BoxGeometry(28, 16, 1.6), [
      boardBack,
      boardBack,
      boardBack,
      boardBack,
      boardMat,
      boardBack,
    ]);
    // Face the street; keep the board just proud of the wall line.
    board.position.set(0, 24, 2.2);
    board.castShadow = true;
    board.receiveShadow = true;
    root.add(board);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(30, 2, 4),
      mat(Palette.woodDeep),
    );
    cap.position.set(0, 33, 1.2);
    cap.castShadow = true;
    root.add(cap);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 5, 1.5, 8),
      mat(Palette.pathDark),
    );
    base.position.y = 0.75;
    root.add(base);

    group.add(root);
    signs.push({
      def,
      root,
      tile: { x: pose.tileX, y: pose.tileY },
      worldX: pose.x,
      worldZ: pose.z,
    });
  }

  return { group, signs };
}
