import * as THREE from "three";
import type { PlayerLook } from "../data/character";
import type { Dir } from "../data/types";
import { Palette } from "../game/palette";
import { matSmooth } from "./materials";
import { mix, tint } from "./colors";

export interface ActorHandle {
  root: THREE.Group;
  setPosition(x: number, z: number): void;
  getPosition(): { x: number; z: number };
  setFacing(dir: Dir): void;
  setWalking(walking: boolean): void;
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

/** Shortest-path exponential angle smooth (avoids spin the long way). */
function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function addPart(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, matSmooth(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Capsule standing on its y axis, spanning from `top` down by `len`. */
function limb(
  parent: THREE.Object3D,
  radius: number,
  len: number,
  color: number,
  x: number,
  top: number,
  z: number,
): THREE.Mesh {
  const straight = Math.max(0.1, len - radius * 2);
  return addPart(
    parent,
    new THREE.CapsuleGeometry(radius, straight, 6, 12),
    color,
    x,
    top - len / 2,
    z,
  );
}

/**
 * Body proportions derived from the look. Height stretches legs/torso and
 * shrinks the head slightly (so short reads chibi and tall reads lanky), while
 * build only affects girth — the two options stay visually independent.
 */
interface Rig {
  shoeH: number;
  legLen: number;
  hipY: number;
  torsoH: number;
  shoulderY: number;
  headR: number;
  headCY: number;
  headSY: number;
  headSZ: number;
  shoulderR: number;
  hipR: number;
  limbR: number;
  legR: number;
  stance: number;
  armLen: number;
}

function rigFor(look: PlayerLook): Rig {
  const h = look.height === "short" ? 0.78 : look.height === "tall" ? 1.24 : 1;
  const b = look.build === "slim" ? 0.8 : look.build === "stocky" ? 1.3 : 1;
  const headMul =
    (look.height === "short" ? 1.1 : look.height === "tall" ? 0.92 : 1) *
    (look.face === "round" ? 1.1 : look.face === "sharp" ? 0.95 : 1);
  const sexShoulder = look.sex === "boy" ? 1.14 : look.sex === "girl" ? 0.93 : 1;
  const sexHip = look.sex === "girl" ? 1.16 : look.sex === "boy" ? 0.94 : 1;

  const shoeH = 2.4;
  const legLen = 10.5 * h;
  const hipY = shoeH + legLen;
  const torsoH = 9 * (0.55 + h * 0.45);
  const shoulderY = hipY + torsoH;
  const headR = 4.9 * headMul;
  const neck = 1.5;
  const limbR = 1.5 * (0.7 + b * 0.3);
  const hipR = 3.9 * b * sexHip;

  return {
    shoeH,
    legLen,
    hipY,
    torsoH,
    shoulderY,
    headR,
    headCY: shoulderY + neck + headR * 0.85,
    headSY: look.face === "sharp" ? 1.12 : look.face === "round" ? 0.92 : 1,
    headSZ: look.face === "sharp" ? 0.94 : 1,
    shoulderR: 3.9 * b * sexShoulder,
    hipR,
    limbR,
    legR: limbR * 1.18,
    // Wide enough that the two shoes never merge into one slab
    stance: Math.max(hipR * 0.56, limbR * 1.9),
    armLen: 7 * (0.6 + h * 0.4),
  };
}

/**
 * A point on the head's surface from unit-sphere coordinates, so features stay
 * planted whatever the face shape stretches the skull to. `out` < 1 sinks the
 * feature in, > 1 lifts it off.
 */
function onHead(r: Rig, u: number, v: number, out = 1): THREE.Vector3 {
  const w = Math.sqrt(Math.max(0.05, 1 - u * u - v * v));
  return new THREE.Vector3(
    u * r.headR,
    r.headCY + v * r.headR * r.headSY,
    w * r.headR * r.headSZ * out,
  );
}

interface Limbs {
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

function buildLeg(look: PlayerLook, r: Rig, side: -1 | 1): THREE.Group {
  const g = new THREE.Group();
  g.position.set(side * r.stance, r.hipY, 0);

  const legR = r.legR;
  const sporty = look.clothing === "sporty";
  const bare = sporty || look.clothing === "fancy";
  const pantLen = sporty ? r.legLen * 0.34 : bare ? 0 : r.legLen * 0.94;
  const clothed = pantLen > 0;

  // Hip joint — matches clothing so no skin peeks under pants
  addPart(
    g,
    new THREE.SphereGeometry(legR * 1.22, 12, 10),
    clothed ? look.pants : look.skin,
    0,
    0,
    0,
  );

  // Leg volume: pants ARE the mesh when clothed (no skin underneath)
  if (clothed) {
    limb(g, legR * 0.98, pantLen, look.pants, 0, 0, 0);
    addPart(
      g,
      new THREE.CylinderGeometry(legR * 1.08, legR * 1.04, 1.1, 12),
      tint(look.pants, 0.86),
      0,
      -pantLen,
      0,
    );
    // Bare shin below shorts / above shoe
    const exposed = r.legLen - pantLen;
    if (exposed > legR * 2) {
      limb(g, legR * 0.88, exposed, look.skin, 0, -pantLen, 0);
    }
  } else {
    limb(g, legR * 0.92, r.legLen, look.skin, 0, 0, 0);
  }

  if (sporty) {
    addPart(
      g,
      new THREE.CylinderGeometry(legR * 1.04, legR * 1.02, 2.6, 12),
      Palette.white,
      0,
      -r.legLen + r.shoeH + 1.3,
      0,
    );
  }

  // Rounded shoe with a lighter sole
  const shoeCol = sporty ? Palette.white : mix(Palette.ink, look.pants, 0.3);
  const soleCol = sporty ? mix(Palette.sky, Palette.white, 0.35) : tint(shoeCol, 2.3);
  const shoeR = r.shoeH * 0.62;
  const shoeD = legR * 2.9;
  const shoe = addPart(
    g,
    new THREE.CapsuleGeometry(shoeR, Math.max(0.4, shoeD - shoeR * 2), 6, 12),
    shoeCol,
    0,
    -r.legLen + shoeR * 0.92,
    legR * 0.45,
  );
  shoe.rotation.x = Math.PI / 2;
  shoe.scale.set((legR * 1.78) / (shoeR * 2), 1, 0.92);
  addPart(
    g,
    new THREE.BoxGeometry(legR * 1.62, 0.6, shoeD * 0.78),
    soleCol,
    0,
    -r.legLen + 0.3,
    legR * 0.45,
  );
  return g;
}

function buildArm(look: PlayerLook, r: Rig, side: -1 | 1): THREE.Group {
  const g = new THREE.Group();
  const rad = r.limbR * 0.95;
  // Pivot just outside the torso wall — never inside it (that caused melting).
  const pivotX = r.shoulderR + rad * 0.55;
  // Negative restX = hands forward. Positive |restZ| = A-pose OUTWARD (not into body).
  const restX = -0.12;
  const restZ = side * 0.28;
  g.position.set(side * pivotX, r.shoulderY - 0.6, 0.15);
  g.rotation.set(restX, 0, restZ);
  g.userData.restX = restX;
  g.userData.restZ = restZ;

  const longSleeve = look.clothing === "cozy" || look.clothing === "fancy";
  const shortSleeve = look.clothing === "casual";
  const upperCol =
    longSleeve || shortSleeve ? look.shirt : look.skin;
  const lowerCol = longSleeve ? look.shirt : look.skin;

  const upperLen = r.armLen * 0.52;
  const lowerLen = r.armLen * 0.5;
  const shoulderR = rad * 1.15;

  // Shoulder ball only — the joint, not a stack of spheres
  addPart(
    g,
    new THREE.SphereGeometry(shoulderR, 12, 10),
    upperCol,
    0,
    0,
    0,
  );

  // Upper-arm sausage (one capsule)
  const upperTop = -shoulderR * 0.35;
  limb(g, rad, upperLen, upperCol, 0, upperTop, 0);

  // Forearm sausage — slight elbow bend, hinged at the upper tip
  const forearm = new THREE.Group();
  forearm.position.set(0, upperTop - upperLen + rad * 0.15, 0);
  forearm.rotation.x = -0.28;
  g.add(forearm);
  limb(forearm, rad * 0.9, lowerLen, lowerCol, 0, 0, 0);

  // Tiny hand nub so the sleeve/skin doesn't end in a flat tip
  const hand = addPart(
    forearm,
    new THREE.SphereGeometry(rad * 0.95, 10, 8),
    look.skin,
    0,
    -lowerLen + rad * 0.35,
    0,
  );
  hand.scale.set(1.05, 0.85, 0.9);
  return g;
}

function buildTorso(body: THREE.Group, look: PlayerLook, r: Rig) {
  const torso = addPart(
    body,
    new THREE.CylinderGeometry(r.shoulderR, r.hipR, r.torsoH, 14),
    look.shirt,
    0,
    r.hipY + r.torsoH / 2,
    0,
  );
  torso.scale.z = 0.78;
  torso.receiveShadow = true;

  const frontZ = r.shoulderR * 0.74;

  switch (look.clothing) {
    case "cozy": {
      // Chunky sweater: turtleneck + ribbed hem below the hips
      const neck = addPart(
        body,
        new THREE.CylinderGeometry(r.shoulderR * 0.5, r.shoulderR * 0.56, 3.2, 10),
        look.shirt,
        0,
        r.shoulderY + 0.9,
        0,
      );
      neck.scale.z = 0.85;
      const hem = addPart(
        body,
        new THREE.CylinderGeometry(r.hipR * 1.09, r.hipR * 1.05, 3, 10),
        tint(look.shirt, 0.86),
        0,
        r.hipY + 0.6,
        0,
      );
      hem.scale.z = 0.76;
      break;
    }
    case "sporty": {
      // Tank top: straps over the shoulders and a racing stripe
      for (const side of [-1, 1] as const) {
        const strap = addPart(
          body,
          new THREE.BoxGeometry(r.shoulderR * 0.34, 2.4, r.shoulderR * 0.5),
          look.shirt,
          side * r.shoulderR * 0.55,
          r.shoulderY + 0.6,
          0,
        );
        strap.scale.z = 0.8;
      }
      addPart(
        body,
        new THREE.BoxGeometry(1.5, r.torsoH * 0.82, 0.6),
        Palette.white,
        r.shoulderR * 0.4,
        r.hipY + r.torsoH / 2,
        frontZ * 0.76,
      );
      break;
    }
    case "fancy": {
      // Collar, buttons and a flared skirt
      for (const side of [-1, 1] as const) {
        const collar = addPart(
          body,
          new THREE.BoxGeometry(1.6, 1.7, 0.6),
          Palette.white,
          side * 1.3,
          r.shoulderY - 1.1,
          frontZ * 0.78,
        );
        collar.rotation.z = side * -0.42;
      }
      addPart(
        body,
        new THREE.SphereGeometry(0.7, 8, 6),
        Palette.rose,
        0,
        r.shoulderY - 1.6,
        frontZ * 0.96,
      );
      for (let i = 0; i < 3; i++) {
        addPart(
          body,
          new THREE.SphereGeometry(0.42, 6, 6),
          Palette.sunflowerDark,
          0,
          r.shoulderY - 4.2 - i * 2.1,
          frontZ * 0.94,
        );
      }
      const skirt = addPart(
        body,
        new THREE.CylinderGeometry(r.hipR * 0.98, r.hipR * 1.55, r.legLen * 0.38, 14),
        look.pants,
        0,
        r.hipY - r.legLen * 0.13,
        0,
      );
      skirt.scale.z = 0.86;
      skirt.receiveShadow = true;
      break;
    }
    case "casual": {
      // Waistband so shirt and trousers read as separate pieces
      const belt = addPart(
        body,
        new THREE.CylinderGeometry(r.hipR * 1.07, r.hipR * 1.07, 1.7, 10),
        tint(look.pants, 0.72),
        0,
        r.hipY + 0.9,
        0,
      );
      belt.scale.z = 0.76;
      addPart(
        body,
        new THREE.BoxGeometry(1.3, 1.3, 0.5),
        Palette.creamDark,
        0,
        r.hipY + 0.9,
        r.hipR * 0.78,
      );
      // Collar seam
      const collar = addPart(
        body,
        new THREE.CylinderGeometry(r.shoulderR * 0.52, r.shoulderR * 0.58, 1.2, 10),
        tint(look.shirt, 0.88),
        0,
        r.shoulderY + 0.2,
        0,
      );
      collar.scale.z = 0.85;
      break;
    }
  }
}

function buildFace(body: THREE.Group, look: PlayerLook, r: Rig) {
  const skinShade = tint(look.skin, 0.88);
  const R = r.headR;

  for (const side of [-1, 1] as const) {
    const eye = onHead(r, side * 0.34, 0.07, 0.92);
    // Poles rotated toward the viewer so the silhouette stays round
    const white = addPart(
      body,
      new THREE.SphereGeometry(R * 0.23, 12, 8),
      Palette.white,
      eye.x,
      eye.y,
      eye.z,
    );
    white.rotation.x = Math.PI / 2;
    white.scale.set(0.92, 0.42, 1.12);
    const pupilP = onHead(r, side * 0.34, 0.06, 1.0);
    const pupil = addPart(
      body,
      new THREE.SphereGeometry(R * 0.115, 10, 8),
      Palette.ink,
      pupilP.x,
      pupilP.y,
      pupilP.z,
    );
    pupil.rotation.x = Math.PI / 2;
    pupil.scale.y = 0.55;
    const glintP = onHead(r, side * 0.38, 0.12, 1.02);
    addPart(
      body,
      new THREE.SphereGeometry(R * 0.045, 5, 5),
      Palette.white,
      glintP.x,
      glintP.y,
      glintP.z,
    );

    // Brow: angle carries most of the expression per face style
    const browP = onHead(r, side * 0.34, 0.33, 0.96);
    const brow = addPart(
      body,
      new THREE.BoxGeometry(R * 0.38, 0.45, 0.5),
      tint(look.hair, 0.7),
      browP.x,
      browP.y,
      browP.z,
    );
    brow.rotation.z =
      side *
      (look.face === "sharp" ? 0.34 : look.face === "round" ? -0.12 : 0.08);

    if (look.sex === "girl") {
      const lashP = onHead(r, side * 0.34, 0.22, 0.98);
      const lash = addPart(
        body,
        new THREE.BoxGeometry(R * 0.3, 0.35, 0.4),
        Palette.ink,
        lashP.x,
        lashP.y,
        lashP.z,
      );
      lash.rotation.z = side * 0.2;
    }

    const blushP = onHead(r, side * 0.55, -0.2, 0.94);
    const blush = addPart(
      body,
      new THREE.SphereGeometry(R * (look.face === "round" ? 0.17 : 0.14), 8, 6),
      mix(look.skin, Palette.rose, 0.55),
      blushP.x,
      blushP.y,
      blushP.z,
    );
    blush.scale.set(1.2, 0.7, 0.25);

    // Ear, tucked flat and low so the hairline reads above it
    const ear = addPart(
      body,
      new THREE.SphereGeometry(R * 0.19, 8, 6),
      skinShade,
      side * R * 0.88,
      r.headCY - R * 0.12 * r.headSY,
      R * 0.05,
    );
    ear.scale.set(0.48, 1, 0.8);

    if (look.face === "sharp") {
      const cheekP = onHead(r, side * 0.62, -0.08, 0.9);
      const cheek = addPart(
        body,
        new THREE.SphereGeometry(R * 0.2, 8, 6),
        look.skin,
        cheekP.x,
        cheekP.y,
        cheekP.z,
      );
      cheek.scale.set(0.7, 0.6, 0.6);
    }
  }

  const noseP = onHead(r, 0, -0.08, 0.97);
  const nose = addPart(
    body,
    new THREE.SphereGeometry(R * 0.115, 8, 6),
    skinShade,
    noseP.x,
    noseP.y,
    noseP.z,
  );
  nose.scale.set(0.9, 0.9, 1.5);

  // Mouth: a small upturned line rather than a blob
  const mouthP = onHead(r, 0, -0.34, 0.97);
  const mouth = addPart(
    body,
    new THREE.TorusGeometry(R * 0.17, R * 0.04, 5, 12, Math.PI * 0.72),
    mix(look.skin, tint(Palette.roseDark, 0.5), 0.85),
    mouthP.x,
    mouthP.y,
    mouthP.z,
  );
  mouth.rotation.z = Math.PI + Math.PI * 0.14;
  mouth.scale.z = 0.5;

  if (look.face === "sharp") {
    const chinP = onHead(r, 0, -0.62, 0.9);
    const chin = addPart(
      body,
      new THREE.SphereGeometry(R * 0.26, 10, 8),
      look.skin,
      chinP.x,
      chinP.y,
      chinP.z,
    );
    chin.scale.set(0.95, 0.75, 0.8);
  }
  if (look.face === "freckled") {
    for (const [fu, fv] of [
      [-0.6, -0.14],
      [-0.4, -0.28],
      [0.44, -0.16],
      [0.62, -0.28],
      [0.2, -0.32],
    ] as const) {
      const p = onHead(r, fu, fv, 0.99);
      addPart(
        body,
        new THREE.SphereGeometry(R * 0.055, 5, 5),
        tint(look.skin, 0.66),
        p.x,
        p.y,
        p.z,
      );
    }
  }
}

function buildHair(body: THREE.Group, look: PlayerLook, r: Rig) {
  const y = r.headCY;
  const R = r.headR;

  /**
   * Hair volume sits above the brow line: the cap is raised so its rim clears
   * the eyes, then a swooped fringe breaks up the straight hairline.
   */
  const cap = (scale = 1.05, lift = 0.32, theta = 0.56) => {
    const c = addPart(
      body,
      new THREE.SphereGeometry(R * scale, 14, 10, 0, Math.PI * 2, 0, Math.PI * theta),
      look.hair,
      0,
      y + R * lift * r.headSY,
      -R * 0.05,
    );
    c.scale.y = r.headSY * 0.95;
    return c;
  };

  /**
   * Occiput mass: a sphere just under head size, nudged back so only the rear
   * pokes out. Rounds off the hairline without any boxy edges.
   */
  const nape = (drop = 0, squash = 1) => {
    const m = addPart(
      body,
      new THREE.SphereGeometry(R * 0.99, 14, 12),
      look.hair,
      0,
      y - R * drop,
      -R * 0.2,
    );
    m.scale.set(0.99, 1.02 * r.headSY * squash, 0.92);
    return m;
  };

  /**
   * Soft blobs hugging the hairline rather than boxes — boxes poked out past
   * the cap and read as a beak in profile.
   */
  const fringe = (w = 1, h = 0.26) => {
    for (const [du, tilt, size] of [
      [-0.4, 0.34, 0.3],
      [0, 0.06, 0.34],
      [0.4, -0.34, 0.3],
    ] as const) {
      const p = onHead(r, du * 0.8 * w, 0.26, 0.88);
      const piece = addPart(
        body,
        new THREE.SphereGeometry(R * size, 10, 8),
        look.hair,
        p.x,
        p.y + R * 0.04,
        p.z,
      );
      piece.scale.set(1.35 * w, (h / 0.26) * 0.62, 0.82);
      piece.rotation.z = tilt;
    }
  };

  switch (look.hairStyle) {
    case "short":
      cap(1.06, 0.28, 0.62);
      nape(0.06);
      fringe(1, 0.26);
      break;
    case "bun":
      cap(1.04, 0.3, 0.54);
      nape(0.02, 0.88);
      fringe(0.86, 0.22);
      addPart(
        body,
        new THREE.SphereGeometry(R * 0.6, 12, 10),
        look.hair,
        0,
        y + R * 1.12 * r.headSY,
        -R * 0.5,
      );
      addPart(
        body,
        new THREE.TorusGeometry(R * 0.33, R * 0.08, 6, 14),
        Palette.rose,
        0,
        y + R * 0.82 * r.headSY,
        -R * 0.55,
      );
      break;
    case "long": {
      cap(1.06, 0.27, 0.62);
      nape(0.08);
      fringe(1.04, 0.28);
      // Tapering fall of hair down the back, blobs overlapping so it reads
      // as one mass rather than stacked beads
      for (let i = 0; i < 4; i++) {
        const s = addPart(
          body,
          new THREE.SphereGeometry(R * (0.88 - i * 0.11), 12, 10),
          look.hair,
          0,
          y - R * (0.56 + i * 0.52),
          -R * (0.5 + i * 0.03),
        );
        s.scale.set(1.06 - i * 0.05, 1.15, 0.6);
      }
      // Strands framing the face
      for (const side of [-1, 1] as const) {
        const strand = addPart(
          body,
          new THREE.CapsuleGeometry(R * 0.25, R * 1.15, 4, 8),
          look.hair,
          side * R * 0.84,
          y - R * 0.72,
          R * 0.2,
        );
        strand.scale.set(1.05, 1, 0.85);
        strand.rotation.z = side * 0.06;
      }
      break;
    }
    case "wavy":
      cap(1.08, 0.29, 0.58);
      nape(0.06);
      fringe(1.06, 0.32);
      for (const side of [-1, 1] as const) {
        for (let i = 0; i < 3; i++) {
          const curl = addPart(
            body,
            new THREE.SphereGeometry(R * (0.42 - i * 0.05), 10, 8),
            look.hair,
            side * R * (0.78 + i * 0.04),
            y - R * (0.12 + i * 0.4),
            R * (0.2 - i * 0.14),
          );
          curl.scale.set(0.9, 1, 0.78);
        }
      }
      break;
    case "cap": {
      // The hat is the silhouette; hair only shows at the nape and temples
      const back = addPart(
        body,
        new THREE.SphereGeometry(R * 0.92, 12, 10),
        look.hair,
        0,
        y - R * 0.16,
        -R * 0.26,
      );
      back.scale.set(1, 0.95, 0.9);
      for (const side of [-1, 1] as const) {
        const tuft = addPart(
          body,
          new THREE.SphereGeometry(R * 0.24, 8, 8),
          look.hair,
          side * R * 0.82,
          y - R * 0.14,
          R * 0.12,
        );
        tuft.scale.set(0.7, 1, 0.9);
      }
      // Crown stops at the hairline: any lower and the oblique camera loses
      // the face behind the hat
      const dome = addPart(
        body,
        new THREE.SphereGeometry(R * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4),
        look.shirt,
        0,
        y + R * 0.04 * r.headSY,
        0,
      );
      dome.scale.y = 1.02 * r.headSY;
      const band = addPart(
        body,
        new THREE.CylinderGeometry(R * 1.06, R * 1.06, R * 0.14, 18),
        tint(look.shirt, 0.88),
        0,
        y + R * 0.37 * r.headSY,
        0,
      );
      band.scale.z = 0.98;
      // Visor: a short tongue, angled up so the camera still sees the face
      const brim = addPart(
        body,
        new THREE.SphereGeometry(R * 0.55, 14, 8),
        tint(look.shirt, 0.82),
        0,
        y + R * 0.38 * r.headSY,
        R * 0.5,
      );
      brim.scale.set(1.2, 0.22, 1.2);
      brim.rotation.x = 0.3;
      addPart(
        body,
        new THREE.SphereGeometry(R * 0.11, 8, 6),
        tint(look.shirt, 0.8),
        0,
        y + R * 1.19 * r.headSY,
        0,
      );
      break;
    }
  }
}

function buildBody(look: PlayerLook): { group: THREE.Group; limbs: Limbs } {
  const g = new THREE.Group();
  const r = rigFor(look);

  const body = new THREE.Group();
  g.add(body);

  const legL = buildLeg(look, r, -1);
  const legR = buildLeg(look, r, 1);
  body.add(legL, legR);

  buildTorso(body, look, r);

  const armL = buildArm(look, r, -1);
  const armR = buildArm(look, r, 1);
  body.add(armL, armR);

  // Neck
  addPart(
    body,
    new THREE.CylinderGeometry(r.headR * 0.33, r.headR * 0.4, 2.6, 10),
    tint(look.skin, 0.92),
    0,
    r.shoulderY + 0.7,
    0,
  );

  const head = addPart(
    body,
    new THREE.SphereGeometry(r.headR, 16, 14),
    look.skin,
    0,
    r.headCY,
    0,
  );
  head.scale.set(1, r.headSY, r.headSZ);

  buildFace(body, look, r);
  buildHair(body, look, r);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(r.hipR * 1.55, 18),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.15;
  shadow.scale.z = 0.85;
  g.add(shadow);

  return { group: g, limbs: { armL, armR, legL, legR } };
}

export function createActor(look: PlayerLook): ActorHandle {
  const root = new THREE.Group();
  root.name = "actor";
  root.scale.setScalar(1.25);
  let built = buildBody(look);
  let body = built.group;
  let limbs = built.limbs;
  root.add(body);

  let dir: Dir = "down";
  let walking = false;
  let bob = 0;
  let yaw = yawFor(dir);
  let yawTarget = yaw;
  let walkHold = 0;

  const armRest = (arm: THREE.Group) => ({
    x: (arm.userData.restX as number) ?? -0.1,
    z: (arm.userData.restZ as number) ?? 0,
  });

  const easeToward = (cur: number, target: number, dt: number, speed = 10) =>
    cur + (target - cur) * Math.min(1, dt * speed);

  let x = 0;
  let z = 0;

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
    setFacing(d) {
      dir = d;
      yawTarget = yawFor(d);
    },
    setWalking(w) {
      walking = w;
      if (w) walkHold = 0.18;
    },
    update(dt) {
      // Turn in place smoothly — hard yaw snaps mid-stride read as camera shake.
      yaw = dampAngle(yaw, yawTarget, 14, dt);
      body.rotation.y = yaw;

      // Brief key gaps while turning shouldn't drop into idle (that reset the stride).
      if (walking) walkHold = 0.18;
      else walkHold = Math.max(0, walkHold - dt);
      const stride = walking || walkHold > 0;

      if (stride) {
        bob += dt * 8;
        const swing = Math.sin(bob);
        // No body bounce / lean — those read as the whole world shaking on turns.
        body.position.y = easeToward(body.position.y, 0, dt, 14);
        body.rotation.z = easeToward(body.rotation.z, 0, dt, 14);
        body.scale.y = easeToward(body.scale.y, 1, dt, 10);
        limbs.legL.rotation.x = swing * 0.45;
        limbs.legR.rotation.x = -swing * 0.45;

        const l = armRest(limbs.armL);
        const r = armRest(limbs.armR);
        limbs.armL.rotation.x = l.x - swing * 0.28;
        limbs.armR.rotation.x = r.x + swing * 0.28;
        limbs.armL.rotation.z = l.z;
        limbs.armR.rotation.z = r.z;
      } else {
        bob += dt * 1.6;
        const idle = Math.sin(bob);
        body.position.y = easeToward(body.position.y, 0, dt, 8);
        body.rotation.z = easeToward(body.rotation.z, 0, dt, 8);
        body.scale.y = 1 + idle * 0.006;

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
        limbs.armR.rotation.x = easeToward(
          limbs.armR.rotation.x,
          r.x - idle * 0.04,
          dt,
          6,
        );
        limbs.armL.rotation.z = easeToward(limbs.armL.rotation.z, l.z, dt, 6);
        limbs.armR.rotation.z = easeToward(limbs.armR.rotation.z, r.z, dt, 6);
      }
    },
    rebuild(newLook) {
      root.remove(body);
      body.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      built = buildBody(newLook);
      body = built.group;
      limbs = built.limbs;
      body.rotation.y = yaw;
      root.add(body);
    },
    dispose() {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    },
  };
}

/** NPC from a shirt color (uses a default look with that shirt). */
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
