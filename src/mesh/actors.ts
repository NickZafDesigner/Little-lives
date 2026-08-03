import * as THREE from "three";
import type {
  Build,
  ClothingStyle,
  FaceStyle,
  Height,
  PlayerLook,
  Sex,
} from "../data/character";
import type { Dir } from "../data/types";
import { Palette } from "../game/palette";
import { AssetLibrary } from "../render/AssetLibrary";
import { applyTints } from "../render/tint";
import { addOutline } from "../render/outline";
import { mat } from "./materials";
import { createInventoryItemMesh } from "./inventoryItems";

/** Short chat-outcome flourishes for ambient (and other) talk. */
export type ActorReaction = "vibrate" | "pop" | "jump";

/** Bed / wake poses for the new-game intro (and reusable elsewhere). */
export type ActorPose = "lie" | "sit" | "stand";

/** Seat height profile - bed sit is taller than outdoor benches. */
export type SitStyle = "bed" | "bench" | "couch";

/** Overlay motion while posed (swing sway, slide lean, bounce hop). */
export interface PoseMotion {
  swayZ?: number;
  leanX?: number;
  hopY?: number;
}

export type HeldTool = "axe" | "pickaxe" | "shovel" | "fishing_rod";

export interface ActorHandle {
  root: THREE.Group;
  setPosition(x: number, z: number): void;
  getPosition(): { x: number; z: number };
  /**
   * World-space crown of the head (top of Head mesh bounds, includes hair).
   * Tracks pose / hop / lie so UI anchors can follow.
   */
  getHeadWorldPos(): { x: number; y: number; z: number };
  setFacing(dir: Dir): void;
  setWalking(walking: boolean): void;
  /** One-shot silly body reaction (shake / squash-pop / hop). */
  playReaction(kind: ActorReaction): void;
  /** Snap body into a bed/stand pose (overrides walk/idle until stand). */
  setPose(pose: ActorPose, opts?: { sitStyle?: SitStyle }): void;
  /** Live overlay on the current pose (swing / slide / bounce). */
  setPoseMotion(motion: PoseMotion | null): void;
  /** Arms-up stretch, ~0.75s. */
  playStretch(): void;
  /** Brief head tip / open-mouth yawn, ~0.65s. */
  playYawn(): void;
  /** Friendly raised-hand wave, ~1.0s. */
  playWave(): void;
  /** Swing a held tool (axe/pickaxe/shovel/rod) for `durationSec`. */
  playToolSwing(tool: HeldTool, durationSec: number): void;
  /** Big grin + ^ ^ happy eyes, ~0.85s. */
  playSmile(): void;
  /** Embarrassed blush bloom + head duck, ~2.4s. */
  playBlush(): void;
  update(dt: number): void;
  rebuild(look: PlayerLook): void;
  dispose(): void;
}

function yawFor(dir: Dir): number {
  switch (dir) {
    case "down":
      return 0;
    case "up":
      return Math.PI;
    case "left":
      return -Math.PI / 2;
    case "right":
      return Math.PI / 2;
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

interface Limbs {
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
}

function scaleForLook(_look: PlayerLook): { y: number; xz: number } {
  // Height/build are limb proportions (applyHeightStyle / applyBuildStyle).
  // Uniform body scale made stocky look squashed and tall look like taffy.
  return { y: 1, xz: 1 };
}

/**
 * Slim / stocky via torso + limb bulk, not whole-body XZ squash.
 * Keeps the head/face from ballooning with the belly.
 */
function applyBuildStyle(body: THREE.Object3D, build: Build) {
  if (build === "average") return;

  const head = AssetLibrary.findNamed(body, "Head");
  const torso = AssetLibrary.findNamed(body, "Torso");
  const hips = AssetLibrary.findNamed(body, "Hips");
  const neck = AssetLibrary.findNamed(body, "Neck");
  const armL = AssetLibrary.findNamed(body, "Arm_L");
  const armR = AssetLibrary.findNamed(body, "Arm_R");
  const legL = AssetLibrary.findNamed(body, "Leg_L");
  const legR = AssetLibrary.findNamed(body, "Leg_R");
  const legs = [legL, legR].filter(Boolean) as THREE.Object3D[];
  const arms = [armL, armR].filter(Boolean) as THREE.Object3D[];

  if (build === "stocky") {
    // Broad chest / hips; limbs thick; head stays close to average
    if (torso) torso.scale.multiply(new THREE.Vector3(1.24, 1.04, 1.2));
    if (hips) hips.scale.multiply(new THREE.Vector3(1.3, 1.06, 1.24));
    if (neck) neck.scale.multiply(new THREE.Vector3(1.22, 0.92, 1.18));
    for (const leg of legs) {
      leg.scale.x *= 1.24;
      leg.scale.z *= 1.24;
    }
    for (const arm of arms) {
      arm.scale.x *= 1.22;
      arm.scale.z *= 1.22;
      arm.scale.y *= 0.95;
    }
    // Sit arms on the broader frame
    if (armL) armL.position.x -= 0.65;
    if (armR) armR.position.x += 0.65;
    if (head) {
      head.scale.x *= 0.94;
      head.scale.z *= 0.94;
    }
  } else {
    // Slim: narrow midsection, thinner limbs, head reads slightly larger
    if (torso) torso.scale.multiply(new THREE.Vector3(0.86, 1.02, 0.88));
    if (hips) hips.scale.multiply(new THREE.Vector3(0.84, 1.0, 0.86));
    if (neck) neck.scale.multiply(new THREE.Vector3(0.88, 1.06, 0.9));
    for (const leg of legs) {
      leg.scale.x *= 0.86;
      leg.scale.z *= 0.86;
    }
    for (const arm of arms) {
      arm.scale.x *= 0.86;
      arm.scale.z *= 0.86;
      arm.scale.y *= 1.04;
    }
    if (armL) armL.position.x += 0.4;
    if (armR) armR.position.x -= 0.4;
    if (head) {
      head.scale.x *= 1.05;
      head.scale.z *= 1.05;
    }
  }
}

/**
 * Tall / short via leg length + placement, not whole-body squash.
 * Keeps the head readable instead of stretching the face.
 */
function applyHeightStyle(body: THREE.Object3D, height: Height) {
  if (height === "average") return;

  const legL = AssetLibrary.findNamed(body, "Leg_L");
  const legR = AssetLibrary.findNamed(body, "Leg_R");
  const hips = AssetLibrary.findNamed(body, "Hips");
  const neck = AssetLibrary.findNamed(body, "Neck");
  const head = AssetLibrary.findNamed(body, "Head");
  const armL = AssetLibrary.findNamed(body, "Arm_L");
  const armR = AssetLibrary.findNamed(body, "Arm_R");
  const torso = AssetLibrary.findNamed(body, "Torso");
  const legs = [legL, legR].filter(Boolean) as THREE.Object3D[];
  const upper = [hips, neck, head, armL, armR, torso].filter(
    Boolean,
  ) as THREE.Object3D[];

  const tall = height === "tall";
  const legStretch = tall ? 1.28 : 0.78;
  const legXZ = tall ? 0.96 : 1.06;

  for (const leg of legs) {
    leg.scale.set(legXZ, legStretch, legXZ);
  }

  // Plant feet after leg scale (pivot is at the hip).
  let lift = 0;
  if (legs.length) {
    body.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const leg of legs) box.expandByObject(leg);
    // Target sole roughly at y≈1.1 (authored rest).
    lift = 1.1 - box.min.y;
  }

  for (const p of [...legs, ...upper]) {
    p.position.y += lift;
  }

  if (tall) {
    // Extra waist length - raise shoulders/head a bit more than hips.
    const waist = 1.6;
    for (const p of [neck, head, armL, armR, torso]) {
      if (p) p.position.y += waist;
    }
    if (hips) hips.scale.y *= 1.1;
    // Slightly longer arms to match the frame
    for (const arm of [armL, armR]) {
      if (arm) arm.scale.y *= 1.1;
    }
    // Head stays closer to average size so the face doesn't elongate
    if (head) {
      head.scale.x *= 0.93;
      head.scale.y *= 0.9;
      head.scale.z *= 0.93;
    }
  } else {
    // Short: compact torso, bigger chibi-ish head
    const tuck = 1.2;
    for (const p of [neck, head, armL, armR, torso]) {
      if (p) p.position.y -= tuck;
    }
    if (hips) hips.scale.y *= 0.9;
    for (const arm of [armL, armR]) {
      if (arm) arm.scale.y *= 0.9;
    }
    if (head) {
      head.scale.x *= 1.1;
      head.scale.y *= 1.12;
      head.scale.z *= 1.1;
    }
  }
}

function setNamedScale(root: THREE.Object3D, name: string, sx: number, sy = sx, sz = sx) {
  const obj = AssetLibrary.findNamed(root, name);
  if (obj) obj.scale.set(sx, sy, sz);
}

function multiplyNamedScale(
  root: THREE.Object3D,
  name: string,
  sx: number,
  sy = sx,
  sz = sx,
) {
  const obj = AssetLibrary.findNamed(root, name);
  if (obj) obj.scale.multiply(new THREE.Vector3(sx, sy, sz));
}

function nudgeNamed(root: THREE.Object3D, name: string, dx: number, dy: number, dz = 0) {
  const obj = AssetLibrary.findNamed(root, name);
  if (obj) obj.position.add(new THREE.Vector3(dx, dy, dz));
}

/** Scatter freckle dots across the cheeks (FaceAccent). */
function attachFreckles(head: THREE.Object3D) {
  head.getObjectByName("FaceAccent")?.removeFromParent();
  const group = new THREE.Group();
  group.name = "FaceAccent";
  const freckleMat = mat(Palette.blushDark, { name: "Freckle" });
  const spots: Array<[number, number, number, number]> = [
    [-2.2, -0.35, 5.55, 0.22],
    [-1.55, -0.85, 5.62, 0.18],
    [-2.55, -0.95, 5.48, 0.16],
    [2.15, -0.4, 5.55, 0.22],
    [1.5, -0.9, 5.62, 0.18],
    [2.5, -1.0, 5.48, 0.16],
    [-0.35, -0.7, 5.7, 0.14],
    [0.45, -0.55, 5.68, 0.15],
  ];
  for (const [x, y, z, r] of spots) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), freckleMat);
    dot.position.set(x, y, z);
    dot.userData.noOutline = true;
    group.add(dot);
  }
  head.add(group);
}

/**
 * Face toggle: cheek shape, eyes, brows, mouth, blush, freckles.
 * Stacks on sex style via multiply (order: sex → face → height).
 */
function applyFaceStyle(body: THREE.Object3D, face: FaceStyle) {
  const head = AssetLibrary.findNamed(body, "Head");
  head?.getObjectByName("FaceAccent")?.removeFromParent();

  const browL = head?.getObjectByName("Brow_L");
  const browR = head?.getObjectByName("Brow_R");

  if (face === "round") {
    // Chubby cheeks, wide soft eyes, full blush
    head?.scale.multiply(new THREE.Vector3(1.14, 0.96, 1.12));
    multiplyNamedScale(body, "Eye_L", 1.18, 1.22, 1.1);
    multiplyNamedScale(body, "Eye_R", 1.18, 1.22, 1.1);
    multiplyNamedScale(body, "Highlight_L", 1.15);
    multiplyNamedScale(body, "Highlight_R", 1.15);
    multiplyNamedScale(body, "Blush_L", 1.45, 1.25, 1.15);
    multiplyNamedScale(body, "Blush_R", 1.45, 1.25, 1.15);
    multiplyNamedScale(body, "Mouth", 0.95, 1.15, 1);
    nudgeNamed(body, "Eye_L", -0.22, -0.08);
    nudgeNamed(body, "Eye_R", 0.22, -0.08);
    nudgeNamed(body, "Highlight_L", -0.22, -0.08);
    nudgeNamed(body, "Highlight_R", 0.22, -0.08);
    if (browL) {
      browL.position.y -= 0.12;
      browL.scale.x *= 1.15;
      browL.rotation.z = 0.05;
    }
    if (browR) {
      browR.position.y -= 0.12;
      browR.scale.x *= 1.15;
      browR.rotation.z = -0.05;
    }
  } else if (face === "soft") {
    // Gentle oval, medium eyes, warm blush - readable baseline
    head?.scale.multiply(new THREE.Vector3(1.05, 1.03, 1.04));
    multiplyNamedScale(body, "Eye_L", 1.08, 1.12, 1.05);
    multiplyNamedScale(body, "Eye_R", 1.08, 1.12, 1.05);
    multiplyNamedScale(body, "Highlight_L", 1.08);
    multiplyNamedScale(body, "Highlight_R", 1.08);
    multiplyNamedScale(body, "Blush_L", 1.15, 1.05, 1);
    multiplyNamedScale(body, "Blush_R", 1.15, 1.05, 1);
    multiplyNamedScale(body, "Mouth", 0.92, 1.05, 1);
    // Keep brows soft: flat / slightly outer tip up (never inward = angry)
    if (browL) {
      browL.scale.set(1.08, 0.36, 0.5);
      browL.rotation.z = 0.18;
    }
    if (browR) {
      browR.scale.set(1.08, 0.36, 0.5);
      browR.rotation.z = -0.18;
    }
  } else if (face === "sharp") {
    // Narrower jaw/cheeks, smaller almond eyes, angled brows, less blush
    head?.scale.multiply(new THREE.Vector3(0.9, 1.06, 0.94));
    multiplyNamedScale(body, "Eye_L", 0.88, 0.78, 0.95);
    multiplyNamedScale(body, "Eye_R", 0.88, 0.78, 0.95);
    multiplyNamedScale(body, "Highlight_L", 0.8, 0.7, 0.85);
    multiplyNamedScale(body, "Highlight_R", 0.8, 0.7, 0.85);
    multiplyNamedScale(body, "Blush_L", 0.45, 0.4, 0.4);
    multiplyNamedScale(body, "Blush_R", 0.45, 0.4, 0.4);
    multiplyNamedScale(body, "Mouth", 1.2, 0.75, 1);
    nudgeNamed(body, "Eye_L", 0.18, 0.12);
    nudgeNamed(body, "Eye_R", -0.18, 0.12);
    nudgeNamed(body, "Highlight_L", 0.18, 0.12);
    nudgeNamed(body, "Highlight_R", -0.18, 0.12);
    nudgeNamed(body, "Mouth", 0, 0.1);
    if (browL) {
      browL.position.set(-1.85, 1.95, 5.72);
      browL.scale.set(1.25, 0.32, 0.5);
      browL.rotation.z = -0.42;
    }
    if (browR) {
      browR.position.set(1.85, 1.95, 5.72);
      browR.scale.set(1.25, 0.32, 0.5);
      browR.rotation.z = 0.42;
    }
  } else {
    // Freckled - soft-ish features + cheek freckles
    head?.scale.multiply(new THREE.Vector3(1.06, 1.0, 1.05));
    multiplyNamedScale(body, "Eye_L", 1.1, 1.08, 1.05);
    multiplyNamedScale(body, "Eye_R", 1.1, 1.08, 1.05);
    multiplyNamedScale(body, "Highlight_L", 1.05);
    multiplyNamedScale(body, "Highlight_R", 1.05);
    multiplyNamedScale(body, "Blush_L", 0.85, 0.8, 0.85);
    multiplyNamedScale(body, "Blush_R", 0.85, 0.8, 0.85);
    multiplyNamedScale(body, "Mouth", 1.05, 1.0, 1);
    if (head) attachFreckles(head);
    if (browL) {
      browL.scale.set(1.1, 0.36, 0.5);
      browL.rotation.z = 0.16;
    }
    if (browR) {
      browR.scale.set(1.1, 0.36, 0.5);
      browR.rotation.z = -0.16;
    }
  }
}

/** Two small oval brow blobs above the eyes (never a monobrow). */
function attachEyebrows(head: THREE.Object3D | undefined) {
  if (!head) return;
  head.getObjectByName("Eyebrows")?.removeFromParent();
  const group = new THREE.Group();
  group.name = "Eyebrows";
  const ink = mat(0x3a2818, { name: "Ink" });
  for (const side of [-1, 1] as const) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), ink);
    blob.name = side < 0 ? "Brow_L" : "Brow_R";
    blob.position.set(side * 1.95, 1.72, 5.72);
    // Flat little pads, tipped slightly outward
    blob.scale.set(1.15, 0.4, 0.55);
    blob.rotation.z = side * -0.2;
    blob.userData.noOutline = true;
    group.add(blob);
  }
  head.add(group);
}

/** Smooth ink stroke along a short curve (smile eyes / mouth). */
function makeInkCurve(
  points: THREE.Vector3[],
  radius: number,
  tubular = 14,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubular, radius, 6, false),
    mat(Palette.ink, { name: "Ink" }),
  );
  mesh.userData.noOutline = true;
  return mesh;
}

/** Soft ^ happy eye - one continuous stroke. */
function makeCaretEye(): THREE.Group {
  const g = new THREE.Group();
  g.name = "SmileCaret";
  g.add(
    makeInkCurve(
      [
        new THREE.Vector3(-0.78, -0.28, 0),
        new THREE.Vector3(-0.28, 0.32, 0),
        new THREE.Vector3(0.28, 0.32, 0),
        new THREE.Vector3(0.78, -0.28, 0),
      ],
      0.13,
      12,
    ),
  );
  return g;
}

/** Wide cozy grin - single U-curve with lifted corners. */
function makeSmileMouth(): THREE.Group {
  const g = new THREE.Group();
  g.name = "SmileMouth";
  g.add(
    makeInkCurve(
      [
        new THREE.Vector3(-1.65, 0.42, 0),
        new THREE.Vector3(-0.85, -0.08, 0),
        new THREE.Vector3(0, -0.32, 0),
        new THREE.Vector3(0.85, -0.08, 0),
        new THREE.Vector3(1.65, 0.42, 0),
      ],
      0.145,
      16,
    ),
  );
  return g;
}

/**
 * Attach smile overlays under Head. Normal eyes+mouth hide while these show.
 * Always rebuilds so mesh tweaks take effect after hot reload.
 */
function ensureSmileOverlays(body: THREE.Object3D): {
  eyeL: THREE.Object3D;
  eyeR: THREE.Object3D;
  mouth: THREE.Object3D;
  eyeLY: number;
  eyeRY: number;
  mouthY: number;
} | null {
  const head = AssetLibrary.findNamed(body, "Head");
  if (!head) return null;

  for (const n of ["SmileEye_L", "SmileEye_R", "SmileMouth"]) {
    head.getObjectByName(n)?.removeFromParent();
  }

  const srcL = AssetLibrary.findNamed(body, "Eye_L");
  const srcR = AssetLibrary.findNamed(body, "Eye_R");
  const srcM = AssetLibrary.findNamed(body, "Mouth");

  const eyeL = makeCaretEye();
  eyeL.name = "SmileEye_L";
  const eyeLY = (srcL?.position.y ?? 0.55) + 0.08;
  eyeL.position.set(srcL?.position.x ?? -1.85, eyeLY, 5.78);
  head.add(eyeL);

  const eyeR = makeCaretEye();
  eyeR.name = "SmileEye_R";
  const eyeRY = (srcR?.position.y ?? 0.55) + 0.08;
  eyeR.position.set(srcR?.position.x ?? 1.85, eyeRY, 5.78);
  head.add(eyeR);

  const mouth = makeSmileMouth();
  const mouthY = (srcM?.position.y ?? -2.15) + 0.08;
  mouth.position.set(0, mouthY, 5.92);
  head.add(mouth);

  eyeL.visible = false;
  eyeR.visible = false;
  mouth.visible = false;
  return { eyeL, eyeR, mouth, eyeLY, eyeRY, mouthY };
}

/** Distinct silhouettes + face accents so identity reads at a glance. */
function applySexStyle(body: THREE.Object3D, sex: Sex, hairColor: number) {
  const head = AssetLibrary.findNamed(body, "Head");
  const torso = AssetLibrary.findNamed(body, "Torso");
  const hips = AssetLibrary.findNamed(body, "Hips");
  const neck = AssetLibrary.findNamed(body, "Neck");
  const armL = AssetLibrary.findNamed(body, "Arm_L");
  const armR = AssetLibrary.findNamed(body, "Arm_R");
  const hair = AssetLibrary.findNamed(body, "Hair");

  head?.getObjectByName("SexAccent")?.removeFromParent();
  attachEyebrows(head ?? undefined);

  if (sex === "boy") {
    head?.scale.set(0.94, 0.96, 0.94);
    setNamedScale(body, "Eye_L", 0.82);
    setNamedScale(body, "Eye_R", 0.82);
    setNamedScale(body, "Highlight_L", 0.75);
    setNamedScale(body, "Highlight_R", 0.75);
    setNamedScale(body, "Blush_L", 0.35, 0.3, 0.3);
    setNamedScale(body, "Blush_R", 0.35, 0.3, 0.3);
    setNamedScale(body, "Mouth", 1.15, 1, 1);
    if (torso) torso.scale.set(1.08, 1.04, 1.06);
    if (hips) hips.scale.multiply(new THREE.Vector3(0.95, 0.95, 0.95));
    if (neck) neck.scale.set(1.2, 1, 1.15);
    if (armL) armL.position.x = -6.15;
    if (armR) armR.position.x = 6.15;
    if (hair) hair.scale.set(0.98, 0.95, 0.98);
  } else if (sex === "girl") {
    head?.scale.set(1.1, 1.08, 1.08);
    setNamedScale(body, "Eye_L", 1.22);
    setNamedScale(body, "Eye_R", 1.22);
    setNamedScale(body, "Highlight_L", 1.15);
    setNamedScale(body, "Highlight_R", 1.15);
    setNamedScale(body, "Blush_L", 1.35, 1.1, 1.0);
    setNamedScale(body, "Blush_R", 1.35, 1.1, 1.0);
    setNamedScale(body, "Mouth", 0.9, 1, 1);
    if (torso) torso.scale.set(0.94, 1.0, 0.96);
    if (hips) hips.scale.multiply(new THREE.Vector3(1.28, 1.08, 1.15));
    if (neck) neck.scale.set(0.9, 1, 0.9);
    if (armL) armL.position.x = -5.25;
    if (armR) armR.position.x = 5.25;
    if (hair) hair.scale.set(1.06, 1.08, 1.05);

    // Hair bow
    if (head) {
      const accent = new THREE.Group();
      accent.name = "SexAccent";
      accent.position.set(2.4, 5.8, 1.2);
      const ribbon = mat(0xf49ab6, { name: "Secondary" });
      const knot = mat(hairColor, { name: "Hair" });
      const left = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), ribbon);
      left.position.set(-1.1, 0, 0);
      left.scale.set(1.1, 0.7, 0.45);
      const right = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), ribbon);
      right.position.set(1.1, 0, 0);
      right.scale.set(1.1, 0.7, 0.45);
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), knot);
      accent.add(left, right, center);
      head.add(accent);
    }
  } else {
    // Non-binary - mid proportions with a clear geometric accent
    head?.scale.set(1.02, 1.04, 1.0);
    setNamedScale(body, "Eye_L", 1.08);
    setNamedScale(body, "Eye_R", 1.08);
    setNamedScale(body, "Highlight_L", 1.05);
    setNamedScale(body, "Highlight_R", 1.05);
    setNamedScale(body, "Blush_L", 0.95);
    setNamedScale(body, "Blush_R", 0.55); // soft asymmetry
    setNamedScale(body, "Mouth", 1.05, 1.1, 1);
    if (torso) torso.scale.set(1.0, 1.02, 1.02);
    if (hips) hips.scale.multiply(new THREE.Vector3(1.1, 1.0, 1.05));
    if (neck) neck.scale.set(1.0, 1, 1.0);
    if (armL) armL.position.x = -5.7;
    if (armR) armR.position.x = 5.7;
    if (hair) {
      hair.scale.set(1.02, 1.0, 1.0);
      hair.rotation.z = 0.06;
    }

    // Ear cuff + chest pin
    if (head) {
      const accent = new THREE.Group();
      accent.name = "SexAccent";
      const metal = mat(0xe8b73c, { name: "Primary" });
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.22, 6, 12), metal);
      cuff.position.set(5.4, 0.2, 1.5);
      cuff.rotation.y = Math.PI / 2;
      accent.add(cuff);
      head.add(accent);
    }
    if (torso) {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), mat(0x5aaa9a, { name: "Primary" }));
      pin.name = "SexAccent";
      pin.position.set(-3.2, 22.5, 4.8);
      torso.add(pin);
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat(0xe8b73c, { name: "Primary" }));
      diamond.position.set(-3.2, 22.5, 5.3);
      diamond.scale.set(0.7, 1, 0.4);
      diamond.name = "SexAccentPin";
      torso.add(diamond);
    }
  }
}

/**
 * Bed pose targets (actorBody-local, before root scale 1.2).
 * Mattress top is ~9; after Rx(-90°) the back hangs ~6 below the
 * feet-pivot, so Y must clear that. Z slides toward the foot so the head
 * rests on the pillow instead of clipping through the headboard.
 *
 * Bed sit drops the feet-pivot near the floor and folds the legs so hips /
 * thighs land on the mattress (~9 world) - a tall Y reads as floating.
 */
const LIE_Y = 14.2;
const LIE_Z = 18;
const SIT_BY_STYLE: Record<
  SitStyle,
  { y: number; z: number; lean: number; leg: number }
> = {
  bed: { y: 0.45, z: 6, lean: -0.4, leg: -1.2 },
  couch: { y: 9.2, z: 3.5, lean: -0.28, leg: -0.95 },
  bench: { y: 6.8, z: 1.5, lean: -0.28, leg: -0.95 },
};

/**
 * Hair kits include a wide flat fringe pad across the forehead that reads as a
 * hair-colored slug above the brows. Hide that pad; keep caps/volume/tails.
 */
function stripForeheadFringe(hair: THREE.Object3D) {
  const size = new THREE.Vector3();
  hair.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    // Authored fringe pieces sit forward on the face with a short, wide bound.
    if (obj.position.z < 3.8) return;
    const box = new THREE.Box3().setFromObject(obj);
    box.getSize(size);
    if (size.x > 5 && size.y < 2.8 && size.z < 3.5) {
      obj.visible = false;
    }
  });
}

/** Body GLB ships a flat foot disc that doubles every contact shadow. */
function stripAuthoredShadowDisc(body: THREE.Object3D) {
  const size = new THREE.Vector3();
  body.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.min.y > 2) return;
    box.getSize(size);
    if (size.y < 0.5 && size.x > 6 && size.z > 6 && Math.abs(size.x - size.z) < 2) {
      obj.visible = false;
    }
  });
}

function shadeColor(hex: number, mul: number): number {
  return new THREE.Color(hex).multiplyScalar(mul).getHex();
}

function liftColor(hex: number, amount: number): number {
  return new THREE.Color(hex).offsetHSL(0, 0, amount).getHex();
}

/**
 * Procedural shirt accents so each ClothingStyle reads clearly
 * (GLB torsos are mostly silhouette + Shirt tint).
 */
function applyOutfitDetails(body: THREE.Object3D, look: PlayerLook) {
  const torso = AssetLibrary.findNamed(body, "Torso");
  if (!torso) return;
  torso.getObjectByName("OutfitAccent")?.removeFromParent();

  const accent = new THREE.Group();
  accent.name = "OutfitAccent";

  const shirt = look.shirt;
  const pants = look.pants;
  const dark = shadeColor(shirt, 0.62);
  const light = liftColor(shirt, 0.1);
  const trim = pants;

  const box = (
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    slot: "Primary" | "Secondary" | "Shirt" = "Secondary",
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat(color, { name: slot, flat: true }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.noOutline = true;
    accent.add(mesh);
    return mesh;
  };

  const button = (x: number, y: number, z: number, color: number) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.32, 8),
      mat(color, { name: "Primary", flat: true }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.noOutline = true;
    accent.add(mesh);
  };

  const style: ClothingStyle = look.clothing;
  if (style === "casual") {
    // Button placket + breast pocket
    box(1.15, 10.5, 0.35, dark, 0, 20.2, 5.05);
    for (const y of [23.6, 21.2, 18.8, 16.4]) button(0, y, 5.35, light);
    box(2.9, 2.5, 0.55, dark, 2.85, 21.0, 5.0);
    box(2.7, 0.4, 0.6, light, 2.85, 22.15, 5.15);
  } else if (style === "cozy") {
    // Hoodie: collar band, drawstrings, kangaroo pocket
    box(6.2, 1.5, 0.7, dark, 0, 25.0, 4.55);
    box(6.8, 3.6, 0.75, dark, 0, 17.2, 5.0);
    box(0.35, 4.2, 0.35, trim, -1.15, 22.4, 5.25);
    box(0.35, 4.2, 0.35, trim, 1.15, 22.4, 5.25);
    const tipL = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 6),
      mat(trim, { name: "Primary", flat: true }),
    );
    tipL.position.set(-1.15, 20.1, 5.35);
    tipL.userData.noOutline = true;
    accent.add(tipL);
    const tipR = tipL.clone();
    tipR.position.x = 1.15;
    accent.add(tipR);
  } else if (style === "sporty") {
    // Chest stripe + center zipper + pull
    box(7.6, 1.15, 0.4, trim, 0, 21.6, 5.05);
    box(0.5, 11.5, 0.38, light, 0, 20.0, 5.15);
    box(1.0, 1.0, 0.55, dark, 0, 24.8, 5.4);
    // Small sleeve-side shoulder ticks (read as jersey trim)
    box(1.4, 0.55, 0.35, trim, -4.6, 24.2, 3.2);
    box(1.4, 0.55, 0.35, trim, 4.6, 24.2, 3.2);
  } else {
    // Fancy: collar points, necktie, dress buttons
    const collarL = box(2.4, 0.55, 0.5, light, -1.7, 25.1, 4.85, "Shirt");
    collarL.rotation.z = 0.4;
    const collarR = box(2.4, 0.55, 0.5, light, 1.7, 25.1, 4.85, "Shirt");
    collarR.rotation.z = -0.4;
    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 8, 6),
      mat(trim, { name: "Primary", flat: true }),
    );
    knot.position.set(0, 24.15, 5.2);
    knot.scale.set(1.15, 0.7, 0.75);
    knot.castShadow = true;
    knot.userData.noOutline = true;
    accent.add(knot);
    box(1.55, 7.2, 0.45, trim, 0, 19.6, 5.15, "Primary");
    box(1.9, 1.3, 0.5, shadeColor(trim, 0.75), 0, 16.0, 5.25, "Primary");
    for (const y of [22.4, 19.6]) button(-2.15, y, 5.2, light);
  }

  torso.add(accent);
}

function assembleActor(look: PlayerLook): { group: THREE.Group; limbs: Limbs } {
  const group = new THREE.Group();
  group.name = "actorBody";

  const body = AssetLibrary.cloneBody();
  stripAuthoredShadowDisc(body);
  const torso = AssetLibrary.cloneTorso(look.clothing);
  const hair = AssetLibrary.cloneHair(look.hairStyle);
  stripForeheadFringe(hair);

  // Hair is authored in Head-local space - attach at identity under Head.
  const head = AssetLibrary.findNamed(body, "Head");
  hair.position.set(0, 0, 0);
  hair.rotation.set(0, 0, 0);
  if (head) head.add(hair);
  else {
    // Fallback: body-space approx if Head missing
    hair.position.set(0, 31.5, 0);
    body.add(hair);
  }
  torso.position.set(0, 0, 0);
  body.add(torso);

  const armL = AssetLibrary.findNamed(body, "Arm_L") ?? new THREE.Group();
  const armR = AssetLibrary.findNamed(body, "Arm_R") ?? new THREE.Group();
  const legL = AssetLibrary.findNamed(body, "Leg_L") ?? new THREE.Group();
  const legR = AssetLibrary.findNamed(body, "Leg_R") ?? new THREE.Group();

  // Short sleeves parented to arms so skin doesn't poke through the solid shirt.
  const sleeveMat = mat(look.shirt, { name: "Shirt" });
  for (const arm of [armL, armR]) {
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), sleeveMat);
    sleeve.name = "Sleeve";
    sleeve.position.set(0, -1.35, 0.05);
    sleeve.scale.set(1.0, 1.05, 1.0);
    sleeve.castShadow = true;
    sleeve.receiveShadow = true;
    arm.add(sleeve);
  }

  applyTints(body, {
    Skin: look.skin,
    Hair: look.hair,
    Shirt: look.shirt,
    Pants: look.pants,
    // Accent (shoes) and Ink (eyes/mouth) keep authored colors - never hair-tint.
  });

  applySexStyle(body, look.sex, look.hair);
  applyFaceStyle(body, look.face);
  applyHeightStyle(body, look.height);
  applyBuildStyle(body, look.build);
  applyOutfitDetails(body, look);

  // Look scale is applied by createActor each frame (reactions need a clean base).
  body.scale.set(1, 1, 1);

  addOutline(body, 1.055);

  armL.userData.restX = (armL.userData.restX as number) ?? -0.32;
  armL.userData.restZ = (armL.userData.restZ as number) ?? 0.12;
  armR.userData.restX = (armR.userData.restX as number) ?? -0.32;
  armR.userData.restZ = (armR.userData.restZ as number) ?? -0.12;

  group.add(body);
  return { group, limbs: { armL, armR, legL, legR } };
}

export function createActor(look: PlayerLook): ActorHandle {
  const root = new THREE.Group();
  root.name = "actor";
  root.scale.setScalar(1.2);

  let built = assembleActor(look);
  let body = built.group;
  let limbs = built.limbs;
  root.add(body);

  let lookScale = scaleForLook(look);
  let dir: Dir = "down";
  let walking = false;
  let bob = 0;
  let yaw = yawFor(dir);
  let yawTarget = yaw;
  let walkHold = 0;
  const headTop = new THREE.Vector3();
  const headBox = new THREE.Box3();
  let x = 0;
  let z = 0;
  let reaction: { kind: ActorReaction; t: number; dur: number } | null = null;
  let pose: ActorPose = "stand";
  let sitStyle: SitStyle = "bed";
  let poseMotion: PoseMotion | null = null;
  let stretchT = 0;
  let stretchDur = 0;
  let yawnT = 0;
  let yawnDur = 0;
  let waveT = 0;
  let waveDur = 0;
  let smileT = 0;
  let smileDur = 0;
  let blushT = 0;
  let blushDur = 0;
  let chopT = 0;
  let chopDur = 0;
  let chopCast = false;
  let heldTool: THREE.Object3D | null = null;

  type FaceRest = {
    mouth: THREE.Vector3 | null;
    blushL: THREE.Vector3 | null;
    blushR: THREE.Vector3 | null;
  };

  const readScale = (name: string): THREE.Vector3 | null => {
    const obj = AssetLibrary.findNamed(body, name);
    return obj ? obj.scale.clone() : null;
  };

  const captureFaceRest = (): FaceRest => ({
    mouth: readScale("Mouth"),
    blushL: readScale("Blush_L"),
    blushR: readScale("Blush_R"),
  });

  let faceRest = captureFaceRest();
  let smileFx = ensureSmileOverlays(body);

  const clearHeldTool = () => {
    if (heldTool) {
      heldTool.removeFromParent();
      heldTool = null;
    }
  };

  const attachHeldTool = (tool: HeldTool) => {
    clearHeldTool();
    const mesh = createInventoryItemMesh(`tool:${tool}`);
    mesh.name = "HeldTool";
    // Inventory meshes are large; shrink and seat in the right hand.
    if (tool === "fishing_rod") {
      mesh.scale.setScalar(0.38);
      mesh.position.set(1.0, -5.5, 2.2);
      mesh.rotation.set(-0.4, 0.15, 0.35);
    } else {
      mesh.scale.setScalar(0.42);
      mesh.position.set(1.2, -6.5, 1.8);
      mesh.rotation.set(0.15, 0.4, 0.85);
    }
    limbs.armR.add(mesh);
    heldTool = mesh;
  };

  const armRest = (arm: THREE.Object3D) => ({
    x: (arm.userData.restX as number) ?? -0.1,
    z: (arm.userData.restZ as number) ?? 0,
  });

  const easeToward = (cur: number, target: number, dt: number, speed = 10) =>
    cur + (target - cur) * Math.min(1, dt * speed);

  const applyBodyScale = (sx: number, sy: number, sz: number) => {
    body.scale.set(lookScale.xz * sx, lookScale.y * sy, lookScale.xz * sz);
  };

  const headNode = () => AssetLibrary.findNamed(body, "Head");

  const setFacePartVisible = (name: string, visible: boolean) => {
    const obj = AssetLibrary.findNamed(body, name);
    if (obj) obj.visible = visible;
  };

  const applyFaceRest = () => {
    const mouth = AssetLibrary.findNamed(body, "Mouth");
    const blushL = AssetLibrary.findNamed(body, "Blush_L");
    const blushR = AssetLibrary.findNamed(body, "Blush_R");
    if (mouth && faceRest.mouth) mouth.scale.copy(faceRest.mouth);
    if (blushL && faceRest.blushL) {
      blushL.scale.copy(faceRest.blushL);
      if (blushL.userData.restY != null) {
        blushL.position.y = blushL.userData.restY as number;
      }
    }
    if (blushR && faceRest.blushR) {
      blushR.scale.copy(faceRest.blushR);
      if (blushR.userData.restY != null) {
        blushR.position.y = blushR.userData.restY as number;
      }
    }
    for (const n of ["Eye_L", "Eye_R", "Highlight_L", "Highlight_R", "Mouth"]) {
      setFacePartVisible(n, true);
    }
    const head = headNode();
    if (head && pose === "stand") {
      if (head.userData.restScaleX != null) {
        head.scale.x = head.userData.restScaleX as number;
      }
      if (head.userData.restScaleY != null) {
        head.scale.y = head.userData.restScaleY as number;
      }
    }
    if (smileFx) {
      smileFx.eyeL.visible = false;
      smileFx.eyeR.visible = false;
      smileFx.mouth.visible = false;
      smileFx.eyeL.scale.set(1, 1, 1);
      smileFx.eyeR.scale.set(1, 1, 1);
      smileFx.mouth.scale.set(1, 1, 1);
      smileFx.eyeL.position.y = smileFx.eyeLY;
      smileFx.eyeR.position.y = smileFx.eyeRY;
      smileFx.mouth.position.y = smileFx.mouthY;
    }
  };

  const applyEmbarrassedBlush = (u: number) => {
    const blushL = AssetLibrary.findNamed(body, "Blush_L");
    const blushR = AssetLibrary.findNamed(body, "Blush_R");
    const ease = u * u * (3 - 2 * u);
    if (blushL && faceRest.blushL) {
      if (blushL.userData.restY == null) blushL.userData.restY = blushL.position.y;
      blushL.scale.set(
        faceRest.blushL.x * (1 + ease * 2.1),
        faceRest.blushL.y * (1 + ease * 1.6),
        faceRest.blushL.z,
      );
      blushL.position.y = (blushL.userData.restY as number) + ease * 0.2;
    }
    if (blushR && faceRest.blushR) {
      if (blushR.userData.restY == null) blushR.userData.restY = blushR.position.y;
      blushR.scale.set(
        faceRest.blushR.x * (1 + ease * 2.1),
        faceRest.blushR.y * (1 + ease * 1.6),
        faceRest.blushR.z,
      );
      blushR.position.y = (blushR.userData.restY as number) + ease * 0.2;
    }
  };

  const applySmile = (u: number) => {
    if (!smileFx) smileFx = ensureSmileOverlays(body);
    // Ease the visible window so it doesn't hard-pop at the edges.
    const showHappy = u > 0.04;
    const ease = u * u * (3 - 2 * u); // smoothstep

    for (const n of ["Eye_L", "Eye_R", "Highlight_L", "Highlight_R", "Mouth"]) {
      setFacePartVisible(n, !showHappy);
    }
    if (smileFx) {
      smileFx.eyeL.visible = showHappy;
      smileFx.eyeR.visible = showHappy;
      smileFx.mouth.visible = showHappy;
      // Grow in from a tiny squash so the expression blooms
      const eyeS = 0.35 + ease * 0.75;
      smileFx.eyeL.scale.set(eyeS * 1.05, eyeS, 1);
      smileFx.eyeR.scale.set(eyeS * 1.05, eyeS, 1);
      smileFx.eyeL.position.y = smileFx.eyeLY + ease * 0.12;
      smileFx.eyeR.position.y = smileFx.eyeRY + ease * 0.12;
      // Mouth widens and drops a touch into a fuller grin
      smileFx.mouth.scale.set(0.55 + ease * 0.6, 0.7 + ease * 0.45, 1);
      smileFx.mouth.position.y = smileFx.mouthY - ease * 0.1;
    }
    // Keep head / blush at rest - growing cheeks read as a goofy inflate.
  };

  const tickFlourish = (dt: number) => {
    const waving = waveDur > 0 && waveT < waveDur;
    const smiling = smileDur > 0 && smileT < smileDur;
    const blushing = blushDur > 0 && blushT < blushDur;
    const chopping = chopDur > 0 && chopT < chopDur;
    if (waving) waveT += dt;
    if (smiling) smileT += dt;
    if (blushing) blushT += dt;
    if (chopping) chopT += dt;

    if (blushing) {
      applyEmbarrassedBlush(Math.sin(Math.min(1, blushT / blushDur) * Math.PI));
    } else if (blushDur > 0) {
      blushDur = 0;
      blushT = 0;
      applyFaceRest();
      const head = headNode();
      if (head) head.rotation.x = easeToward(head.rotation.x, 0, dt, 10);
    } else if (smiling) {
      applySmile(Math.sin(Math.min(1, smileT / smileDur) * Math.PI));
    } else if (smileDur > 0) {
      smileDur = 0;
      smileT = 0;
      applyFaceRest();
    }

    if (!waving && waveDur > 0) {
      waveDur = 0;
      waveT = 0;
    }
    if (!chopping && chopDur > 0) {
      chopDur = 0;
      chopT = 0;
      chopCast = false;
      clearHeldTool();
    }

    return {
      waving,
      waveU: waving ? Math.sin(Math.min(1, waveT / waveDur) * Math.PI) : 0,
      waveSwing: waving ? Math.sin(waveT * 14) : 0,
      blushU: blushing
        ? Math.sin(Math.min(1, blushT / blushDur) * Math.PI)
        : 0,
      chopping,
      chopSwing: chopping ? Math.sin(chopT * Math.PI * (chopCast ? 1.6 : 2.6)) : 0,
      casting: chopping && chopCast,
    };
  };

  const applyPoseTransforms = (dt: number) => {
    const stretching = stretchDur > 0 && stretchT < stretchDur;
    const yawning = yawnDur > 0 && yawnT < yawnDur;
    if (stretching) stretchT += dt;
    if (yawning) yawnT += dt;

    const stretchU = stretching
      ? Math.sin(Math.min(1, stretchT / stretchDur) * Math.PI)
      : 0;
    const yawnU = yawning
      ? Math.sin(Math.min(1, yawnT / yawnDur) * Math.PI)
      : 0;

    if (pose === "lie") {
      // Flat on back, head toward -Z (headboard / north of bed).
      body.rotation.x = easeToward(body.rotation.x, -Math.PI / 2, dt, 8);
      body.position.y = easeToward(body.position.y, LIE_Y, dt, 8);
      body.position.z = easeToward(body.position.z, LIE_Z, dt, 8);
      body.position.x = easeToward(body.position.x, 0, dt, 8);
      body.rotation.z = easeToward(body.rotation.z, 0, dt, 8);
      applyBodyScale(1, 1, 1);
      // Knees up - shortens the on-bed footprint so feet stay on the mattress.
      limbs.legL.rotation.x = easeToward(limbs.legL.rotation.x, 1.05, dt, 8);
      limbs.legR.rotation.x = easeToward(limbs.legR.rotation.x, 1.0, dt, 8);
      const l = armRest(limbs.armL);
      const r = armRest(limbs.armR);
      limbs.armL.rotation.x = easeToward(limbs.armL.rotation.x, l.x + 0.2, dt, 6);
      limbs.armR.rotation.x = easeToward(limbs.armR.rotation.x, r.x + 0.2, dt, 6);
      limbs.armL.rotation.z = easeToward(limbs.armL.rotation.z, l.z + 0.35, dt, 6);
      limbs.armR.rotation.z = easeToward(limbs.armR.rotation.z, r.z - 0.35, dt, 6);
    } else if (pose === "sit") {
      const seat = SIT_BY_STYLE[sitStyle];
      const sway = poseMotion?.swayZ ?? 0;
      const leanExtra = poseMotion?.leanX ?? 0;
      const hop = poseMotion?.hopY ?? 0;
      // Soft sit-up; stretch leans back a little instead of warping limbs.
      const lean = seat.lean - stretchU * 0.12 + leanExtra;
      body.rotation.x = easeToward(body.rotation.x, lean, dt, 7);
      body.position.y = easeToward(body.position.y, seat.y + hop, dt, 7);
      body.position.z = easeToward(body.position.z, seat.z, dt, 7);
      body.position.x = easeToward(body.position.x, sway * 2.5, dt, 8);
      body.rotation.z = easeToward(body.rotation.z, sway * 0.45, dt, 8);
      applyBodyScale(1, 1, 1);
      limbs.legL.rotation.x = easeToward(limbs.legL.rotation.x, seat.leg, dt, 8);
      limbs.legR.rotation.x = easeToward(limbs.legR.rotation.x, seat.leg, dt, 8);

      const l = armRest(limbs.armL);
      const r = armRest(limbs.armR);
      // Swing: arms up on the chains. Stretch: gentle reach-up.
      const swingHold = Math.min(1, Math.abs(sway) * 1.4);
      const reach = stretchU * 0.55 + swingHold * 0.35;
      const lift = stretchU * 0.7 + swingHold * 0.85;
      limbs.armL.rotation.x = easeToward(
        limbs.armL.rotation.x,
        l.x - 0.25 - lift,
        dt,
        9,
      );
      limbs.armR.rotation.x = easeToward(
        limbs.armR.rotation.x,
        r.x - 0.25 - lift,
        dt,
        9,
      );
      limbs.armL.rotation.z = easeToward(
        limbs.armL.rotation.z,
        l.z + 0.35 + reach,
        dt,
        9,
      );
      limbs.armR.rotation.z = easeToward(
        limbs.armR.rotation.z,
        r.z - 0.35 - reach,
        dt,
        9,
      );

      const head = headNode();
      if (head) {
        // Tip back slightly for the yawn - never scale the head (reads as a warp).
        head.rotation.x = easeToward(
          head.rotation.x,
          -0.08 - yawnU * 0.28 + sway * 0.08,
          dt,
          9,
        );
        head.scale.y = 1;
      }
      const mouth = AssetLibrary.findNamed(body, "Mouth");
      if (mouth && faceRest.mouth) {
        // Soft O-mouth for the yawn instead of stretching the whole head.
        const open = yawnU;
        mouth.scale.set(
          faceRest.mouth.x * (1 - open * 0.25),
          faceRest.mouth.y * (1 + open * 0.85),
          faceRest.mouth.z,
        );
      }
    }

    if (!stretching && stretchDur > 0) {
      stretchDur = 0;
      stretchT = 0;
    }
    if (!yawning && yawnDur > 0) {
      yawnDur = 0;
      yawnT = 0;
      const mouth = AssetLibrary.findNamed(body, "Mouth");
      if (mouth && faceRest.mouth) mouth.scale.copy(faceRest.mouth);
    }
  };

  return {
    root,
    setPosition(nx, nz) {
      x = nx;
      z = nz;
      root.position.set(nx, 0, nz);
    },
    getPosition() {
      return { x, z };
    },
    getHeadWorldPos() {
      const head = headNode();
      if (head) {
        // Ensure matrices reflect the latest pose / hop before reading bounds.
        root.updateWorldMatrix(true, true);
        headBox.setFromObject(head);
        if (!headBox.isEmpty()) {
          headTop.set(
            (headBox.min.x + headBox.max.x) * 0.5,
            headBox.max.y,
            (headBox.min.z + headBox.max.z) * 0.5,
          );
          return { x: headTop.x, y: headTop.y, z: headTop.z };
        }
      }
      // Standing fallback if Head mesh is missing.
      return { x, y: 40 * root.scale.y, z };
    },
    setFacing(d) {
      dir = d;
      yawTarget = yawFor(d);
    },
    setWalking(w) {
      walking = w;
      if (w) walkHold = 0.18;
    },
    playReaction(kind) {
      const dur = kind === "jump" ? 0.58 : kind === "pop" ? 0.42 : 0.5;
      reaction = { kind, t: 0, dur };
    },
    setPose(next, opts) {
      pose = next;
      poseMotion = null;
      if (next === "lie") {
        // Snap onto the mattress - easing from stand would clip through the bed.
        body.rotation.x = -Math.PI / 2;
        body.rotation.z = 0;
        body.position.set(0, LIE_Y, LIE_Z);
        limbs.legL.rotation.x = 1.05;
        limbs.legR.rotation.x = 1.0;
      } else if (next === "sit") {
        sitStyle = opts?.sitStyle ?? "bed";
        const seat = SIT_BY_STYLE[sitStyle];
        // Keep Z on the seat. Snap Y when rising from stand; ease down from lie
        // so the wake sit-up settles onto the mattress instead of teleporting.
        body.position.z = seat.z;
        if (body.position.y < seat.y + 1) {
          body.position.y = seat.y;
        }
      } else if (next === "stand") {
        stretchDur = 0;
        stretchT = 0;
        yawnDur = 0;
        yawnT = 0;
        waveDur = 0;
        waveT = 0;
        smileDur = 0;
        smileT = 0;
        blushDur = 0;
        blushT = 0;
        chopDur = 0;
        chopT = 0;
        chopCast = false;
        clearHeldTool();
        applyFaceRest();
        body.position.z = 0;
        limbs.legL.rotation.x = 0;
        limbs.legR.rotation.x = 0;
        const head = headNode();
        if (head) {
          head.rotation.x = 0;
          head.scale.y = 1;
        }
      }
    },
    setPoseMotion(motion) {
      poseMotion = motion;
    },
    playStretch() {
      stretchT = 0;
      stretchDur = 0.75;
    },
    playYawn() {
      yawnT = 0;
      yawnDur = 0.65;
    },
    playWave() {
      if (pose !== "stand") return;
      waveT = 0;
      waveDur = 1.15;
    },
    playToolSwing(tool, durationSec) {
      if (pose !== "stand") return;
      // Don't wave while swinging a tool.
      waveDur = 0;
      waveT = 0;
      chopT = 0;
      chopDur = Math.max(0.4, durationSec);
      chopCast = tool === "fishing_rod";
      attachHeldTool(tool);
    },
    playSmile() {
      smileT = 0;
      smileDur = 1.15;
      blushDur = 0;
      blushT = 0;
    },
    playBlush() {
      blushT = 0;
      blushDur = 2.4;
      smileDur = 0;
      smileT = 0;
      applyFaceRest();
    },
    update(dt) {
      yaw = dampAngle(yaw, yawTarget, 14, dt);
      body.rotation.y = yaw;

      if (pose !== "stand") {
        applyPoseTransforms(dt);
        return;
      }

      const flourish = tickFlourish(dt);
      const sway = poseMotion?.swayZ ?? 0;
      const lean = poseMotion?.leanX ?? 0;
      const hop = poseMotion?.hopY ?? 0;

      // Ease out of sit/lie residual tilt / bed offset when returning to stand.
      body.rotation.x = easeToward(body.rotation.x, lean, dt, 10);
      body.position.y = easeToward(body.position.y, hop, dt, 10);
      body.position.z = easeToward(body.position.z, 0, dt, 10);
      body.position.x = easeToward(body.position.x, sway * 2, dt, 10);
      if (!flourish.chopping) {
        body.rotation.z = easeToward(body.rotation.z, sway * 0.35, dt, 10);
      }
      const head = headNode();
      if (head) {
        const duck = flourish.blushU * 0.28 + flourish.waveU * -0.08;
        head.rotation.x = easeToward(head.rotation.x, duck, dt, 10);
        head.scale.y = easeToward(head.scale.y, 1, dt, 10);
      }

      if (walking) walkHold = 0.18;
      else walkHold = Math.max(0, walkHold - dt);
      const stride = walking || walkHold > 0;

      if (reaction) {
        reaction.t += dt;
        const u = Math.min(1, reaction.t / reaction.dur);
        const fade = 1 - u;
        if (reaction.kind === "vibrate") {
          body.position.x = Math.sin(reaction.t * 58) * 0.1 * fade;
          body.position.y = 0;
          body.rotation.z = Math.sin(reaction.t * 50) * 0.2 * fade;
          applyBodyScale(1, 1, 1);
        } else if (reaction.kind === "pop") {
          const pulse = Math.sin(u * Math.PI);
          body.position.x = 0;
          body.position.y = pulse * 0.1;
          body.rotation.z = 0;
          const s = 1 + pulse * 0.3;
          applyBodyScale(s, s, s);
        } else {
          const hop = Math.sin(u * Math.PI);
          body.position.x = 0;
          body.position.y = hop * 0.42;
          body.rotation.z = Math.sin(u * Math.PI * 2) * 0.04;
          // Light hop squash - keep it subtle so the face doesn't warp.
          const squash = u < 0.18 ? 1 - u * 0.25 : 1 + hop * 0.04;
          const stretchAmt = u < 0.18 ? 1 + u * 0.18 : 1 - hop * 0.03;
          applyBodyScale(squash, stretchAmt, squash);
        }
        if (u >= 1) {
          reaction = null;
          body.position.x = 0;
          body.position.y = 0;
          body.rotation.z = 0;
          applyBodyScale(1, 1, 1);
        }
        // Keep a light limb idle so they don't freeze mid-banter
        bob += dt * 2.2;
        const idle = Math.sin(bob);
        const l = armRest(limbs.armL);
        const r = armRest(limbs.armR);
        limbs.armL.rotation.x = l.x + idle * 0.05;
        limbs.armR.rotation.x = r.x - idle * 0.05;
        limbs.armL.rotation.z = l.z;
        limbs.armR.rotation.z = r.z;
        limbs.armR.rotation.y = 0;
        return;
      }

      if (stride) {
        bob += dt * 8;
        const swing = Math.sin(bob);
        body.position.x = easeToward(body.position.x, sway * 2, dt, 14);
        body.position.y = easeToward(body.position.y, hop, dt, 14);
        body.rotation.z = easeToward(body.rotation.z, sway * 0.35, dt, 14);
        applyBodyScale(1, 1, 1);
        limbs.legL.rotation.x = swing * 0.45;
        limbs.legR.rotation.x = -swing * 0.45;

        const l = armRest(limbs.armL);
        const r = armRest(limbs.armR);
        limbs.armL.rotation.x = l.x - swing * 0.28;
        limbs.armR.rotation.x = r.x + swing * 0.28;
        limbs.armL.rotation.z = l.z;
        limbs.armR.rotation.z = r.z;
        limbs.armR.rotation.y = easeToward(limbs.armR.rotation.y, 0, dt, 10);
      } else {
        bob += dt * 1.6;
        const idle = Math.sin(bob);
        body.position.x = easeToward(body.position.x, sway * 2, dt, 8);
        if (!flourish.chopping) {
          body.position.y = easeToward(body.position.y, hop, dt, 8);
          body.rotation.z = easeToward(body.rotation.z, sway * 0.35, dt, 8);
        }
        applyBodyScale(1, 1 + idle * 0.006, 1);

        limbs.legL.rotation.x = easeToward(limbs.legL.rotation.x, 0, dt, 8);
        limbs.legR.rotation.x = easeToward(limbs.legR.rotation.x, 0, dt, 8);

        const l = armRest(limbs.armL);
        const r = armRest(limbs.armR);
        limbs.armL.rotation.x = easeToward(
          limbs.armL.rotation.x,
          l.x + idle * 0.04,
          dt,
          6,
        );
        limbs.armL.rotation.z = easeToward(limbs.armL.rotation.z, l.z, dt, 6);

        if (flourish.chopping) {
          // Raise → slam chop cycle; fishing rod uses a forward cast flick.
          const swing = flourish.chopSwing;
          const raised = (swing + 1) * 0.5; // 0 = down, 1 = up
          if (flourish.casting) {
            limbs.armR.rotation.x = easeToward(
              limbs.armR.rotation.x,
              r.x - 0.35 - 1.1 * raised,
              dt,
              14,
            );
            limbs.armR.rotation.y = easeToward(
              limbs.armR.rotation.y,
              -0.15 * raised,
              dt,
              12,
            );
            limbs.armR.rotation.z = easeToward(
              limbs.armR.rotation.z,
              r.z - 0.1 + 0.55 * raised,
              dt,
              12,
            );
            body.rotation.x = easeToward(
              body.rotation.x,
              lean - 0.12 * raised,
              dt,
              10,
            );
          } else {
            limbs.armR.rotation.x = easeToward(
              limbs.armR.rotation.x,
              r.x - 1.55 * raised + 0.35 * (1 - raised),
              dt,
              18,
            );
            limbs.armR.rotation.y = easeToward(
              limbs.armR.rotation.y,
              -0.2 * raised,
              dt,
              14,
            );
            limbs.armR.rotation.z = easeToward(
              limbs.armR.rotation.z,
              r.z - 0.25 + 0.2 * raised,
              dt,
              14,
            );
            body.rotation.z = easeToward(
              body.rotation.z,
              sway * 0.35 + (1 - raised) * 0.08,
              dt,
              12,
            );
            body.position.y = easeToward(
              body.position.y,
              hop + raised * 0.04,
              dt,
              12,
            );
          }
        } else if (flourish.waving) {
          // Side-raise away from torso (positive Z on Arm_R = out).
          const raise = flourish.waveU;
          const flap = flourish.waveSwing * raise;
          limbs.armR.rotation.x = easeToward(
            limbs.armR.rotation.x,
            r.x - 0.4 * raise + flap * 0.1,
            dt,
            12,
          );
          limbs.armR.rotation.y = easeToward(
            limbs.armR.rotation.y,
            -0.25 * raise,
            dt,
            12,
          );
          limbs.armR.rotation.z = easeToward(
            limbs.armR.rotation.z,
            r.z + 1.5 * raise + flap * 0.28,
            dt,
            14,
          );
        } else {
          limbs.armR.rotation.x = easeToward(
            limbs.armR.rotation.x,
            r.x - idle * 0.04,
            dt,
            6,
          );
          limbs.armR.rotation.y = easeToward(limbs.armR.rotation.y, 0, dt, 8);
          limbs.armR.rotation.z = easeToward(limbs.armR.rotation.z, r.z, dt, 6);
        }
      }
    },
    rebuild(newLook) {
      clearHeldTool();
      root.remove(body);
      built = assembleActor(newLook);
      body = built.group;
      limbs = built.limbs;
      lookScale = scaleForLook(newLook);
      faceRest = captureFaceRest();
      smileFx = ensureSmileOverlays(body);
      body.rotation.y = yaw;
      reaction = null;
      pose = "stand";
      poseMotion = null;
      sitStyle = "bed";
      stretchDur = 0;
      yawnDur = 0;
      waveDur = 0;
      waveT = 0;
      smileDur = 0;
      smileT = 0;
      blushDur = 0;
      blushT = 0;
      chopDur = 0;
      chopT = 0;
      chopCast = false;
      root.add(body);
    },
    dispose() {
      clearHeldTool();
      root.clear();
    },
  };
}

export function createNpcActor(shirtColor: number, skin = Palette.skin): ActorHandle {
  return createActor({
    sex: "enby",
    height: "average",
    build: "average",
    face: "soft",
    clothing: "casual",
    hairStyle: "short",
    skin,
    hair: 0x5a3a28,
    shirt: shirtColor,
    pants: 0x5b6b8c,
  });
}
