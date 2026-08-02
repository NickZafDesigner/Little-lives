/**
 * Build Stardew-proportion GLB kits into public/assets/.
 * Run: node scripts/export-assets.mjs
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** GLTFExporter expects browser FileReader (onloadend). */
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result = null;
    onload = null;
    onloadend = null;
    onerror = null;
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((ab) => {
          this.result = ab;
          const ev = { target: this };
          this.onload?.(ev);
          this.onloadend?.(ev);
        })
        .catch((err) => this.onerror?.(err));
    }
    readAsDataURL(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((ab) => {
          const b64 = Buffer.from(ab).toString("base64");
          this.result = `data:application/octet-stream;base64,${b64}`;
          const ev = { target: this };
          this.onload?.(ev);
          this.onloadend?.(ev);
        })
        .catch((err) => this.onerror?.(err));
    }
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/assets");

const matCache = new Map();
function namedMat(name, color, flat = false) {
  const key = `${name}_${color}_${flat}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      name,
      flatShading: flat,
      roughness: 0.85,
      metalness: 0,
    });
    matCache.set(key, m);
  }
  return m;
}

function mesh(geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

async function writeGLB(object, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const exporter = new GLTFExporter();
  const scene = new THREE.Scene();
  scene.add(object);
  const ab = await exporter.parseAsync(scene, { binary: true });
  fs.writeFileSync(filePath, Buffer.from(ab));
  console.log("wrote", path.relative(OUT, filePath));
}

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

function buildBody() {
  const root = new THREE.Group();
  root.name = "Root";

  const skin = namedMat("Skin", 0xffcfa2);
  const pants = namedMat("Pants", 0x5b6b8c);

  // Chibi: short legs, big head clearance
  const Leg_L = new THREE.Group();
  Leg_L.name = "Leg_L";
  Leg_L.position.set(-2.4, 10, 0);
  Leg_L.userData.restX = 0;
  Leg_L.add(mesh(new THREE.CapsuleGeometry(1.7, 5.5, 4, 10), pants, 0, -4, 0));
  Leg_L.add(mesh(new THREE.BoxGeometry(3.2, 1.4, 4.2), namedMat("Accent", 0x3a3428), 0, -8.2, 0.4));
  root.add(Leg_L);

  const Leg_R = new THREE.Group();
  Leg_R.name = "Leg_R";
  Leg_R.position.set(2.4, 10, 0);
  Leg_R.add(mesh(new THREE.CapsuleGeometry(1.7, 5.5, 4, 10), pants, 0, -4, 0));
  Leg_R.add(mesh(new THREE.BoxGeometry(3.2, 1.4, 4.2), namedMat("Accent", 0x3a3428), 0, -8.2, 0.4));
  root.add(Leg_R);

  // Hip / pelvis - keep narrow so it stays under the shirt hem
  const hips = mesh(new THREE.SphereGeometry(3.4, 12, 10), pants, 0, 11.2, 0, 1.05, 0.62, 0.78);
  hips.name = "Hips";
  root.add(hips);

  // Arms pivot at shoulders - hang slightly forward so hands don't
  // read as skin "blocks" poking out of the shirt waist in front view.
  const Arm_L = new THREE.Group();
  Arm_L.name = "Arm_L";
  Arm_L.position.set(-5.6, 22.2, 0.4);
  Arm_L.userData.restX = -0.32;
  Arm_L.userData.restZ = 0.12;
  Arm_L.rotation.z = 0.12;
  Arm_L.rotation.x = -0.32;
  Arm_L.add(mesh(new THREE.CapsuleGeometry(1.45, 6.2, 6, 16), skin, 0, -4.3, 0.15));
  Arm_L.add(mesh(new THREE.SphereGeometry(1.55, 12, 10), skin, 0, -8.4, 0.35));
  root.add(Arm_L);

  const Arm_R = new THREE.Group();
  Arm_R.name = "Arm_R";
  Arm_R.position.set(5.6, 22.2, 0.4);
  Arm_R.userData.restX = -0.32;
  Arm_R.userData.restZ = -0.12;
  Arm_R.rotation.z = -0.12;
  Arm_R.rotation.x = -0.32;
  Arm_R.add(mesh(new THREE.CapsuleGeometry(1.45, 6.2, 6, 16), skin, 0, -4.3, 0.15));
  Arm_R.add(mesh(new THREE.SphereGeometry(1.55, 12, 10), skin, 0, -8.4, 0.35));
  root.add(Arm_R);

  // Neck + Head - skin ball with simple ink features (hair overlays separately).
  const neck = mesh(new THREE.CylinderGeometry(1.6, 2, 2.4, 10), skin, 0, 26.2, 0);
  neck.name = "Neck";
  root.add(neck);
  const Head = new THREE.Group();
  Head.name = "Head";
  Head.position.set(0, 31.5, 0);
  const ink = namedMat("Ink", 0x2a2018);
  const blush = namedMat("Secondary", 0xf49ab6);
  const highlight = namedMat("Primary", 0xffffff);

  const headBall = mesh(new THREE.SphereGeometry(6.2, 16, 14), skin, 0, 0, 0, 1, 1.05, 0.95);
  headBall.name = "HeadBall";
  Head.add(headBall);
  const eyeL = mesh(new THREE.SphereGeometry(1.05, 8, 8), ink, -1.85, 0.55, 5.55);
  eyeL.name = "Eye_L";
  Head.add(eyeL);
  const eyeR = mesh(new THREE.SphereGeometry(1.05, 8, 8), ink, 1.85, 0.55, 5.55);
  eyeR.name = "Eye_R";
  Head.add(eyeR);
  const hlL = mesh(new THREE.SphereGeometry(0.32, 6, 6), highlight, -1.6, 0.9, 6.15);
  hlL.name = "Highlight_L";
  Head.add(hlL);
  const hlR = mesh(new THREE.SphereGeometry(0.32, 6, 6), highlight, 2.1, 0.9, 6.15);
  hlR.name = "Highlight_R";
  Head.add(hlR);
  const blushL = mesh(new THREE.SphereGeometry(0.9, 8, 8), blush, -2.4, -1.15, 5.35, 1, 0.7, 0.5);
  blushL.name = "Blush_L";
  Head.add(blushL);
  const blushR = mesh(new THREE.SphereGeometry(0.9, 8, 8), blush, 2.4, -1.15, 5.35, 1, 0.7, 0.5);
  blushR.name = "Blush_R";
  Head.add(blushR);
  const mouth = mesh(new THREE.BoxGeometry(2.0, 0.38, 0.35), ink, 0, -2.15, 5.7);
  mouth.name = "Mouth";
  Head.add(mouth);
  root.add(Head);

  const shadow = mesh(
    new THREE.CircleGeometry(5.5, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      name: "Shadow",
    }),
    0,
    0.12,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.z = 0.85;
  shadow.userData.noOutline = true;
  shadow.castShadow = false;
  root.add(shadow);

  return root;
}

function buildTorso(style) {
  const g = new THREE.Group();
  g.name = "Torso";
  const shirt = namedMat("Shirt", 0x7ec8e3);

  // Single wide capsule per style. Multi-mesh outfits (belts, skirts, sleeves)
  // fought the arm meshes + inverted-hull outlines and read as "blocks".
  // Styles differ by proportion; color comes from Shirt tint.
  // Longer capsules so the hem covers the hip sphere
  const specs = {
    casual: { r: 5.45, h: 7.2, y: 17.8, sx: 1.18, sy: 1, sz: 1.0 },
    cozy: { r: 5.65, h: 6.8, y: 17.7, sx: 1.24, sy: 1, sz: 1.08 },
    sporty: { r: 5.4, h: 7.4, y: 17.9, sx: 1.16, sy: 1.02, sz: 0.98 },
    fancy: { r: 5.5, h: 7.3, y: 17.6, sx: 1.2, sy: 1.04, sz: 1.02 },
  };
  const s = specs[style] ?? specs.casual;
  g.add(
    mesh(
      new THREE.CapsuleGeometry(s.r, s.h, 8, 18),
      shirt,
      0,
      s.y,
      0,
      s.sx,
      s.sy,
      s.sz,
    ),
  );
  return g;
}

/**
 * Hair is authored in Head-local space (Head origin = 0,0,0).
 * Simple crown + fringe overlay on the skin head - keep shapes chunky and few.
 */
function buildHair(style) {
  const g = new THREE.Group();
  g.name = "Hair";
  g.position.set(0, 0, 0);
  const hair = namedMat("Hair", 0x8d5a3b);
  const R = 6.2;

  /** Crown wraps top/back so the front face stays visible. */
  const skull = (lift = 0.55, back = 0.55, scaleY = 0.72) => {
    g.add(
      mesh(
        new THREE.SphereGeometry(R * 1.08, 16, 12),
        hair,
        0,
        R * lift,
        -R * back,
        1.05,
        scaleY,
        1.0,
      ),
    );
  };

  /** Single soft fringe across the brow. */
  const fringe = (w = 1) => {
    g.add(
      mesh(
        new THREE.SphereGeometry(R * 0.42, 12, 10),
        hair,
        0,
        R * 0.55,
        R * 0.72,
        1.35 * w,
        0.38,
        0.45,
      ),
    );
  };

  if (style === "bun") {
    skull(0.5, 0.55, 0.7);
    fringe(0.9);
    g.add(mesh(new THREE.SphereGeometry(R * 0.55, 12, 10), hair, 0, R * 1.15, -R * 0.55));
  } else if (style === "long") {
    skull(0.5, 0.5, 0.72);
    fringe(1);
    g.add(
      mesh(
        new THREE.SphereGeometry(R * 0.95, 12, 10),
        hair,
        0,
        -R * 0.85,
        -R * 0.55,
        1.0,
        1.35,
        0.65,
      ),
    );
    for (const side of [-1, 1]) {
      g.add(
        mesh(
          new THREE.CapsuleGeometry(R * 0.28, R * 1.0, 4, 8),
          hair,
          side * R * 0.8,
          -R * 0.65,
          R * 0.15,
          1,
          1,
          0.85,
        ),
      );
    }
  } else if (style === "wavy") {
    skull(0.52, 0.52, 0.75);
    fringe(1.05);
    for (const side of [-1, 1]) {
      g.add(
        mesh(
          new THREE.SphereGeometry(R * 0.48, 10, 8),
          hair,
          side * R * 0.85,
          -R * 0.2,
          R * 0.1,
          0.95,
          1.15,
          0.8,
        ),
      );
      g.add(
        mesh(
          new THREE.SphereGeometry(R * 0.38, 10, 8),
          hair,
          side * R * 0.9,
          -R * 0.7,
          -R * 0.05,
          0.9,
          1.1,
          0.75,
        ),
      );
    }
  } else if (style === "cap") {
    skull(0.45, 0.55, 0.65);
    g.add(
      mesh(
        new THREE.SphereGeometry(R * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
        hair,
        0,
        R * 0.08,
        0,
        1,
        1.0,
        1,
      ),
    );
    g.add(mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, R * 0.14, 18), hair, 0, R * 0.4, 0));
    const brim = mesh(
      new THREE.SphereGeometry(R * 0.55, 14, 8),
      hair,
      0,
      R * 0.4,
      R * 0.55,
      1.25,
      0.2,
      1.15,
    );
    brim.rotation.x = 0.28;
    g.add(brim);
  } else {
    // short
    skull(0.55, 0.55, 0.7);
    fringe(1);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Pets                                                                */
/* ------------------------------------------------------------------ */

function buildPet(species) {
  const root = new THREE.Group();
  root.name = "Root";
  const primary = namedMat("Primary", 0xd4a574);
  const accent = namedMat("Accent", 0xf5e6d3);
  const ink = namedMat("Secondary", 0x2a2018);

  const legs = [];
  const addLeg = (x, z) => {
    const Leg = new THREE.Group();
    Leg.name = `Leg_${legs.length}`;
    Leg.position.set(x, 5.5, z);
    Leg.add(mesh(new THREE.CapsuleGeometry(1.3, 3.5, 4, 8), primary, 0, -2.2, 0));
    Leg.add(mesh(new THREE.SphereGeometry(1.5, 8, 8), accent, 0, -4.5, 0.3));
    root.add(Leg);
    legs.push(Leg);
  };

  if (species === "bunny") {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addLeg(sx * 2.2, sz * 2.8);
    root.add(mesh(new THREE.SphereGeometry(5, 12, 10), primary, 0, 8, 0, 1.1, 0.95, 1.2));
    const Head = new THREE.Group();
    Head.name = "Head";
    Head.position.set(0, 12, 4.5);
    Head.add(mesh(new THREE.SphereGeometry(3.8, 12, 10), primary));
    Head.add(mesh(new THREE.SphereGeometry(0.55, 6, 6), ink, -1.3, 0.5, 3.2));
    Head.add(mesh(new THREE.SphereGeometry(0.55, 6, 6), ink, 1.3, 0.5, 3.2));
    Head.add(mesh(new THREE.SphereGeometry(0.7, 6, 6), namedMat("Secondary", 0xf49ab6), 0, -0.5, 3.5));
    // Ears
    Head.add(mesh(new THREE.CapsuleGeometry(0.9, 6, 4, 8), primary, -1.6, 5.5, -0.5));
    Head.add(mesh(new THREE.CapsuleGeometry(0.9, 6, 4, 8), primary, 1.6, 5.5, -0.5));
    Head.add(mesh(new THREE.CapsuleGeometry(0.45, 4, 3, 6), accent, -1.6, 5.2, 0.1));
    Head.add(mesh(new THREE.CapsuleGeometry(0.45, 4, 3, 6), accent, 1.6, 5.2, 0.1));
    root.add(Head);
    const Tail = new THREE.Group();
    Tail.name = "Tail";
    Tail.position.set(0, 8, -5);
    Tail.add(mesh(new THREE.SphereGeometry(2.2, 10, 8), accent));
    root.add(Tail);
  } else if (species === "dog") {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addLeg(sx * 2.8, sz * 4);
    root.add(mesh(new THREE.CapsuleGeometry(4, 6, 4, 10), primary, 0, 9, 0, 1, 1, 1.3));
    const Head = new THREE.Group();
    Head.name = "Head";
    Head.position.set(0, 11, 7);
    Head.add(mesh(new THREE.SphereGeometry(4, 12, 10), primary));
    Head.add(mesh(new THREE.BoxGeometry(3.5, 2.5, 4), primary, 0, -0.8, 3));
    Head.add(mesh(new THREE.SphereGeometry(0.6, 6, 6), ink, -1.5, 0.8, 3.5));
    Head.add(mesh(new THREE.SphereGeometry(0.6, 6, 6), ink, 1.5, 0.8, 3.5));
    Head.add(mesh(new THREE.SphereGeometry(0.7, 6, 6), ink, 0, -0.4, 5));
    Head.add(mesh(new THREE.SphereGeometry(1.6, 8, 6), primary, -3.2, 2.5, -0.5, 0.6, 1.2, 0.5));
    Head.add(mesh(new THREE.SphereGeometry(1.6, 8, 6), primary, 3.2, 2.5, -0.5, 0.6, 1.2, 0.5));
    root.add(Head);
    const Tail = new THREE.Group();
    Tail.name = "Tail";
    Tail.position.set(0, 10, -7);
    Tail.add(mesh(new THREE.CapsuleGeometry(1, 5, 4, 8), primary, 0, 2, -1));
    Tail.children[0].rotation.x = -0.6;
    root.add(Tail);
  } else if (species === "fox") {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addLeg(sx * 2.4, sz * 3.6);
    root.add(mesh(new THREE.CapsuleGeometry(3.4, 5.5, 4, 10), primary, 0, 8.5, 0, 1, 1, 1.35));
    const Head = new THREE.Group();
    Head.name = "Head";
    Head.position.set(0, 11, 6.8);
    Head.add(mesh(new THREE.SphereGeometry(3.5, 12, 10), primary));
    Head.add(mesh(new THREE.ConeGeometry(1.6, 3.8, 6), primary, 0, -0.6, 3.2));
    Head.children[1].rotation.x = Math.PI / 2;
    Head.add(mesh(new THREE.SphereGeometry(0.5, 6, 6), ink, -1.2, 0.6, 3));
    Head.add(mesh(new THREE.SphereGeometry(0.5, 6, 6), ink, 1.2, 0.6, 3));
    Head.add(mesh(new THREE.SphereGeometry(0.45, 6, 6), ink, 0, -0.2, 4.2));
    // Pointy ears
    Head.add(mesh(new THREE.ConeGeometry(1.2, 3.4, 4), primary, -1.8, 3.4, 0.2));
    Head.add(mesh(new THREE.ConeGeometry(1.2, 3.4, 4), primary, 1.8, 3.4, 0.2));
    Head.add(mesh(new THREE.ConeGeometry(0.55, 1.8, 4), accent, -1.8, 3.1, 0.55));
    Head.add(mesh(new THREE.ConeGeometry(0.55, 1.8, 4), accent, 1.8, 3.1, 0.55));
    // Cheek fluff
    Head.add(mesh(new THREE.SphereGeometry(1.2, 8, 6), accent, -2.4, -0.4, 1.2, 1.1, 0.8, 0.7));
    Head.add(mesh(new THREE.SphereGeometry(1.2, 8, 6), accent, 2.4, -0.4, 1.2, 1.1, 0.8, 0.7));
    root.add(Head);
    const Tail = new THREE.Group();
    Tail.name = "Tail";
    Tail.position.set(0, 9, -6);
    Tail.add(mesh(new THREE.CapsuleGeometry(1.6, 8, 4, 8), primary, 0, 2, -2));
    Tail.children[0].rotation.x = -0.55;
    Tail.add(mesh(new THREE.SphereGeometry(2.2, 10, 8), accent, 0, 4.5, -4.5));
    root.add(Tail);
  } else if (species === "bird") {
    // Tiny legs for hop / flutter
    for (const sx of [-1, 1]) addLeg(sx * 1.6, 1.2);
    root.add(mesh(new THREE.SphereGeometry(4.2, 12, 10), primary, 0, 10, 0, 1.15, 0.95, 1.25));
    const Head = new THREE.Group();
    Head.name = "Head";
    Head.position.set(0, 14.5, 3.2);
    Head.add(mesh(new THREE.SphereGeometry(2.8, 12, 10), primary));
    Head.add(mesh(new THREE.SphereGeometry(0.45, 6, 6), ink, -0.9, 0.4, 2.3));
    Head.add(mesh(new THREE.SphereGeometry(0.45, 6, 6), ink, 0.9, 0.4, 2.3));
    // Beak
    Head.add(mesh(new THREE.ConeGeometry(0.9, 2.4, 5), namedMat("Secondary", 0xf4a261), 0, -0.2, 3.2));
    Head.children[3].rotation.x = Math.PI / 2;
    // Crest
    Head.add(mesh(new THREE.ConeGeometry(0.7, 2.2, 4), accent, 0, 2.6, 0));
    root.add(Head);
    // Wings as Leg-like groups so hop anim can flutter them
    for (const side of [-1, 1]) {
      const Wing = new THREE.Group();
      Wing.name = `Leg_${legs.length}`;
      Wing.position.set(side * 4.2, 10.5, 0);
      Wing.add(mesh(new THREE.SphereGeometry(2.2, 10, 8), primary, 0, 0, 0, 0.55, 1.1, 1.6));
      root.add(Wing);
      legs.push(Wing);
    }
    const Tail = new THREE.Group();
    Tail.name = "Tail";
    Tail.position.set(0, 9.5, -4.5);
    Tail.add(mesh(new THREE.ConeGeometry(1.6, 4.5, 5), accent, 0, 0, -1.5));
    Tail.children[0].rotation.x = Math.PI / 2;
    root.add(Tail);
  } else {
    // cat
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addLeg(sx * 2.6, sz * 4);
    root.add(mesh(new THREE.CapsuleGeometry(3.8, 5, 4, 10), primary, 0, 8.5, 0, 1, 1, 1.25));
    const Head = new THREE.Group();
    Head.name = "Head";
    Head.position.set(0, 11.5, 6.5);
    Head.add(mesh(new THREE.SphereGeometry(3.8, 12, 10), primary));
    Head.add(mesh(new THREE.SphereGeometry(0.55, 6, 6), ink, -1.4, 0.5, 3.2));
    Head.add(mesh(new THREE.SphereGeometry(0.55, 6, 6), ink, 1.4, 0.5, 3.2));
    Head.add(mesh(new THREE.SphereGeometry(0.55, 6, 6), namedMat("Secondary", 0xf49ab6), 0, -0.3, 3.6));
    Head.add(mesh(new THREE.ConeGeometry(1.4, 3.2, 4), primary, -2, 3.5, 0.5));
    Head.add(mesh(new THREE.ConeGeometry(1.4, 3.2, 4), primary, 2, 3.5, 0.5));
    Head.add(mesh(new THREE.ConeGeometry(0.7, 1.8, 4), accent, -2, 3.2, 0.9));
    Head.add(mesh(new THREE.ConeGeometry(0.7, 1.8, 4), accent, 2, 3.2, 0.9));
    root.add(Head);
    const Tail = new THREE.Group();
    Tail.name = "Tail";
    Tail.position.set(0, 9, -6.5);
    Tail.add(mesh(new THREE.CapsuleGeometry(1.1, 7, 4, 8), primary, 0, 2.5, -1.5));
    Tail.children[0].rotation.x = -0.7;
    root.add(Tail);
  }

  const shadow = mesh(
    new THREE.CircleGeometry(5, 14),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      name: "Shadow",
    }),
    0,
    0.1,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.castShadow = false;
  root.add(shadow);
  return root;
}

/* ------------------------------------------------------------------ */
/* Furniture                                                           */
/* ------------------------------------------------------------------ */

function boxM(parent, w, h, d, material, x, y, z) {
  parent.add(mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z));
}

/** Box with Euler rotation (radians) - for A-frames, chutes, etc. */
function rbox(parent, w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function buildFurniture(id) {
  const g = new THREE.Group();
  g.name = id;
  const P = namedMat("Primary", 0xc79a63, true);
  const S = namedMat("Secondary", 0x9a6f43, true);
  const A = namedMat("Accent", 0xf4a261, true);

  switch (id) {
    case "bed":
      // Sized to fill most of a 2×2 tile (64u). Headboard / pillow on -Z.
      boxM(g, 52, 5, 54, P, 0, 2.5, 0);
      boxM(g, 50, 4, 52, namedMat("Secondary", 0x7ec8e3, true), 0, 7, 0);
      boxM(g, 52, 14, 3, S, 0, 11, -26.5);
      boxM(g, 20, 3.5, 12, namedMat("Accent", 0xfff6e5, true), 0, 10.2, -16);
      break;
    case "fridge":
      boxM(g, 22, 40, 18, namedMat("Primary", 0xe8f0f5, true), 0, 20, 0);
      boxM(g, 20, 1.5, 16, S, 0, 28, 0.5);
      boxM(g, 1.5, 8, 1.5, A, 8, 22, 9);
      break;
    case "toilet":
      boxM(g, 14, 10, 16, namedMat("Primary", 0xf5f5f5, true), 0, 5, 0);
      boxM(g, 16, 14, 8, namedMat("Primary", 0xf5f5f5, true), 0, 17, -4);
      g.add(mesh(new THREE.CylinderGeometry(5, 5.5, 4, 12), namedMat("Accent", 0xd6f2fb, true), 0, 10, 2));
      break;
    case "shower":
      // Pan sits above the home plinth (y=0..2) so the blue floor doesn't z-fight.
      boxM(g, 28, 1.5, 28, namedMat("Primary", 0xb2dfdb, true), 0, 2.85, 0);
      boxM(g, 2, 36, 28, S, -13, 18, 0);
      boxM(g, 28, 36, 2, S, 0, 18, -13);
      g.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 8), A, 0, 30, -10));
      g.add(mesh(new THREE.SphereGeometry(3, 10, 8), A, 0, 24, -8));
      break;
    case "sofa":
      boxM(g, 48, 10, 22, namedMat("Primary", 0xf4a261, true), 0, 5, 0);
      boxM(g, 48, 14, 6, S, 0, 14, -8);
      boxM(g, 6, 12, 20, S, -21, 12, 0);
      boxM(g, 6, 12, 20, S, 21, 12, 0);
      break;
    case "tv":
      boxM(g, 8, 18, 8, S, 0, 9, 0);
      boxM(g, 36, 24, 4, namedMat("Primary", 0x2a3040, true), 0, 28, 0);
      boxM(g, 30, 18, 1, namedMat("Accent", 0x5fc6e8, true), 0, 28, 2.2);
      break;
    case "table":
      boxM(g, 36, 3, 24, P, 0, 14, 0);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) boxM(g, 3, 13, 3, S, sx * 14, 6.5, sz * 8);
      break;
    case "plant":
      g.add(mesh(new THREE.CylinderGeometry(5, 4, 10, 10), namedMat("Primary", 0xc07050, true), 0, 5, 0));
      g.add(mesh(new THREE.SphereGeometry(7, 12, 10), namedMat("Accent", 0x4e9b3a), 0, 14, 0));
      g.add(mesh(new THREE.SphereGeometry(5, 10, 8), namedMat("Secondary", 0x76c153), 3, 16, 2));
      break;
    case "bookshelf":
      boxM(g, 28, 40, 12, P, 0, 20, 0);
      for (const y of [8, 18, 28]) boxM(g, 26, 1.5, 10, S, 0, y, 0);
      boxM(g, 8, 5, 8, A, -6, 11, 1);
      boxM(g, 8, 5, 8, namedMat("Accent", 0x7fcfc0, true), 5, 21, 1);
      boxM(g, 8, 5, 8, namedMat("Accent", 0xf49ab6, true), -4, 31, 1);
      break;
    case "pet_bed":
      g.add(mesh(new THREE.TorusGeometry(10, 3.5, 8, 20), namedMat("Primary", 0xf49ab6, true), 0, 3.5, 0));
      g.children[0].rotation.x = Math.PI / 2;
      boxM(g, 16, 2, 16, namedMat("Secondary", 0xfff6e5, true), 0, 2, 0);
      break;
    case "pet_bowl":
      g.add(mesh(new THREE.CylinderGeometry(6, 5, 4, 14), namedMat("Primary", 0xe8f0f5, true), 0, 2, 0));
      g.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 1, 14), namedMat("Accent", 0xd4a574, true), 0, 3.5, 0));
      break;
    case "toy_ball":
      g.add(mesh(new THREE.SphereGeometry(7, 14, 12), namedMat("Primary", 0xffd166)));
      g.add(mesh(new THREE.TorusGeometry(5, 1.2, 8, 16), namedMat("Accent", 0xf4a261), 0, 0, 0));
      break;
    case "counter":
      boxM(g, 48, 16, 24, P, 0, 8, 0);
      boxM(g, 50, 2, 26, namedMat("Secondary", 0xe3c092, true), 0, 17, 0);
      boxM(g, 10, 6, 10, A, 12, 21, 0);
      break;
    case "kitchen_counter":
      // Clean home worksurface - no baked clutter so appliances can sit on top.
      boxM(g, 48, 16, 24, P, 0, 8, 0);
      boxM(g, 50, 2, 26, namedMat("Secondary", 0xe3c092, true), 0, 17, 0);
      boxM(g, 4, 14, 22, S, -22, 8, 0);
      boxM(g, 4, 14, 22, S, 22, 8, 0);
      break;
    case "kettle": {
      // Chubby electric kettle.
      g.add(mesh(new THREE.CylinderGeometry(5.5, 6.5, 12, 12), P, 0, 7, 0));
      g.add(mesh(new THREE.CylinderGeometry(3.5, 4, 3, 10), S, 0, 14.5, 0));
      boxM(g, 2, 8, 6, A, 7, 9, 0);
      boxM(g, 3, 2, 2, namedMat("Accent", 0x2a3040, true), 0, 16.5, 0);
      break;
    }
    case "toaster": {
      boxM(g, 16, 10, 10, P, 0, 5, 0);
      boxM(g, 12, 1.5, 1.5, S, 0, 10.5, -2);
      boxM(g, 12, 1.5, 1.5, S, 0, 10.5, 2);
      boxM(g, 2, 3, 2, A, 7, 7, 5.5);
      break;
    }
    case "park_bench":
      boxM(g, 44, 3, 14, P, 0, 10, 0);
      boxM(g, 44, 10, 3, S, 0, 16, -5);
      boxM(g, 3, 10, 12, S, -18, 5, 0);
      boxM(g, 3, 10, 12, S, 18, 5, 0);
      break;
    case "swing_set": {
      // Proper A-frame + hanging seats (3×2 footprint).
      // Primary = wood frame; Secondary/Accent = painted metal + seats.
      const wood = namedMat("Primary", 0x8d6e63, true);
      const metal = namedMat("Secondary", 0x6d4c41, true);
      const seat = namedMat("Accent", 0x5fc6e8, true);
      const lean = 0.48;

      // Twin A-frames - legs splay along Z and meet under the crossbar.
      for (const sx of [-1, 1]) {
        rbox(g, 4, 42, 4, wood, sx * 28, 18.5, -11, lean, 0, 0);
        rbox(g, 4, 42, 4, wood, sx * 28, 18.5, 11, -lean, 0, 0);
        // Ground feet
        boxM(g, 9, 2.5, 9, wood, sx * 28, 1.25, -21);
        boxM(g, 9, 2.5, 9, wood, sx * 28, 1.25, 21);
        // Apex caps
        boxM(g, 7, 5, 7, wood, sx * 28, 38, 0);
      }
      // Top crossbar + mid brace
      boxM(g, 64, 4, 4, wood, 0, 36.5, 0);
      boxM(g, 58, 2.5, 2.5, metal, 0, 34.5, 0);

      // Two swings: rope/chain pairs + bucket seats
      for (const sx of [-1, 1]) {
        const cx = sx * 14;
        for (const hx of [-4.5, 4.5]) {
          g.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 2, 6), metal, cx + hx, 35.2, 0));
          g.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 20, 6), metal, cx + hx, 24.5, 0));
        }
        // Seat board + raised lips (reads as a little bucket seat)
        boxM(g, 12, 1.8, 9, seat, cx, 13, 0);
        boxM(g, 12, 2.4, 1.6, seat, cx, 14.2, -4.2);
        boxM(g, 12, 2.4, 1.6, seat, cx, 14.2, 4.2);
        boxM(g, 1.5, 2.2, 9, seat, cx - 5.5, 14, 0);
        boxM(g, 1.5, 2.2, 9, seat, cx + 5.5, 14, 0);
      }
      break;
    }
    case "slide": {
      // Open tower + ladder + sloping chute (2×3 footprint).
      // Primary = cyan frame/rails; Accent = yellow chute (Secondary tints same).
      const frame = namedMat("Primary", 0x5fc6e8, true);
      const rail = namedMat("Secondary", 0x3d8fb5, true);
      const chute = namedMat("Accent", 0xffd166, true);
      const towerZ = -26;
      // Positive rx drops the +Z end toward the ground.
      const chuteAngle = 0.52;

      // Four tower posts + platform deck
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          boxM(g, 3.5, 30, 3.5, frame, sx * 9, 15, towerZ + sz * 9);
        }
      }
      boxM(g, 22, 2.5, 22, frame, 0, 28, towerZ);
      // Safety rails - open toward the chute (+Z)
      boxM(g, 22, 5, 2.2, rail, 0, 31.5, towerZ - 10);
      boxM(g, 2.2, 5, 18, rail, -10, 31.5, towerZ + 1);
      boxM(g, 2.2, 5, 18, rail, 10, 31.5, towerZ + 1);
      // Little roof peak so the tower reads from afar
      rbox(g, 24, 2, 14, frame, 0, 34, towerZ, 0, 0, 0.35);
      rbox(g, 24, 2, 14, frame, 0, 34, towerZ, 0, 0, -0.35);

      // Ladder on the back (-Z) - uprights stay on Primary (cyan at runtime)
      boxM(g, 2.2, 28, 2.2, frame, -5.5, 14, towerZ - 12);
      boxM(g, 2.2, 28, 2.2, frame, 5.5, 14, towerZ - 12);
      for (let i = 0; i < 5; i++) {
        boxM(g, 11, 1.6, 2.2, chute, 0, 5 + i * 5, towerZ - 12);
      }

      // Sloping chute from platform down toward +Z
      rbox(g, 14, 2.2, 50, chute, 0, 15.5, 4, chuteAngle, 0, 0);
      // Raised side walls following the slope
      rbox(g, 2, 5.5, 48, frame, -7.5, 17.5, 4, chuteAngle, 0, 0);
      rbox(g, 2, 5.5, 48, frame, 7.5, 17.5, 4, chuteAngle, 0, 0);
      // Exit lip / landing flare
      boxM(g, 16, 2, 10, chute, 0, 2.5, 30);
      boxM(g, 2.5, 4, 8, frame, -8, 4, 30);
      boxM(g, 2.5, 4, 8, frame, 8, 4, 30);
      break;
    }
    case "shelter_desk":
    case "library_desk":
    case "clinic_desk":
      boxM(g, 48, 3, 28, P, 0, 16, 0);
      boxM(g, 44, 14, 24, S, 0, 7, 0);
      boxM(g, 12, 4, 10, A, -10, 19, 4);
      break;

    /* ---- Unique catalog meshes (were tint aliases) ---- */
    case "fern": {
      // Wide hanging fronds in a squat pot.
      g.add(mesh(new THREE.CylinderGeometry(6, 5, 8, 10), P, 0, 4, 0));
      g.add(mesh(new THREE.SphereGeometry(4, 10, 8), S, 0, 9, 0));
      for (const [x, z, sy] of [
        [-7, 0, 1],
        [7, 0, 1],
        [0, -7, 1],
        [0, 7, 1],
        [-5, 5, 0.85],
        [5, -5, 0.85],
      ]) {
        const frond = mesh(new THREE.SphereGeometry(5.5, 10, 8), A, x, 11, z, 1.1, sy, 0.55);
        g.add(frond);
      }
      break;
    }
    case "storybook": {
      // Stack of three chunky books.
      boxM(g, 18, 4, 14, P, 0, 2, 0);
      boxM(g, 16, 3.5, 13, S, 1, 5.8, 0.5);
      boxM(g, 17, 4, 12, A, -0.5, 9.5, -0.5);
      boxM(g, 2, 3, 12, namedMat("Secondary", 0xfff6e5, true), -8, 2, 0);
      break;
    }
    case "yarn_ball": {
      // Soft yarn ball with loose strand loops.
      g.add(mesh(new THREE.SphereGeometry(8, 14, 12), P, 0, 8, 0));
      g.add(mesh(new THREE.TorusGeometry(6.5, 1.1, 8, 18), A, 0, 8, 0));
      g.children[g.children.length - 1].rotation.x = Math.PI / 2.4;
      g.add(mesh(new THREE.TorusGeometry(5.5, 0.9, 8, 16), S, 0, 8, 0));
      g.children[g.children.length - 1].rotation.y = Math.PI / 3;
      boxM(g, 10, 1.2, 2, A, 8, 2, 4);
      break;
    }
    case "coffee_machine": {
      // Countertop brewer + carafe.
      boxM(g, 18, 22, 14, P, 0, 11, 0);
      boxM(g, 14, 4, 12, S, 0, 24, 0);
      g.add(mesh(new THREE.CylinderGeometry(4, 4.5, 10, 12), A, 0, 10, 5));
      boxM(g, 3, 2, 2, namedMat("Accent", 0x2a3040, true), 6, 18, 7);
      break;
    }
    case "microwave": {
      boxM(g, 28, 16, 18, P, 0, 8, 0);
      boxM(g, 16, 10, 1, namedMat("Secondary", 0x2a3040, true), -3, 8, 9.2);
      boxM(g, 4, 10, 1, A, 10, 8, 9.2);
      for (const y of [5, 8, 11]) boxM(g, 2.5, 1.2, 1.2, S, 10, y, 9.5);
      break;
    }
    case "lounge_chair": {
      // Single deep armchair.
      boxM(g, 26, 8, 26, P, 0, 4, 0);
      boxM(g, 26, 16, 6, S, 0, 14, -10);
      boxM(g, 5, 12, 22, S, -10.5, 12, 0);
      boxM(g, 5, 12, 22, S, 10.5, 12, 0);
      boxM(g, 20, 3, 16, A, 0, 9, 2);
      break;
    }
    case "bean_bag": {
      g.add(mesh(new THREE.SphereGeometry(14, 14, 12), P, 0, 10, 0, 1.15, 0.72, 1.1));
      g.add(mesh(new THREE.SphereGeometry(8, 12, 10), S, 0, 16, -2, 1.1, 0.7, 0.9));
      break;
    }
    case "reading_lamp": {
      boxM(g, 12, 2, 12, S, 0, 1, 0);
      g.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 22, 8), P, 0, 12, 0));
      g.add(mesh(new THREE.CylinderGeometry(7, 9, 10, 12), A, 0, 26, 0));
      g.add(mesh(new THREE.SphereGeometry(2, 8, 6), namedMat("Accent", 0xfff6e5, true), 0, 22, 0));
      break;
    }
    case "radio": {
      boxM(g, 22, 12, 10, P, 0, 6, 0);
      g.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 1.5, 12), A, -5, 7, 5.2));
      boxM(g, 8, 5, 1, S, 5, 7, 5.2);
      boxM(g, 2, 6, 2, namedMat("Secondary", 0x2a3040, true), 0, 15, 0);
      break;
    }
    case "dresser": {
      boxM(g, 44, 28, 18, P, 0, 14, 0);
      for (const y of [8, 16, 24]) {
        boxM(g, 40, 1.2, 1, S, 0, y, 9.2);
        boxM(g, 4, 2, 1.5, A, 0, y + 2.5, 9.4);
      }
      break;
    }
    case "nightstand": {
      boxM(g, 18, 16, 16, P, 0, 8, 0);
      boxM(g, 20, 2, 18, S, 0, 17, 0);
      boxM(g, 14, 5, 1, A, 0, 10, 8.2);
      boxM(g, 3, 2, 1.5, namedMat("Accent", 0xfff6e5, true), 0, 10, 9);
      break;
    }
    case "kitchen_cart": {
      boxM(g, 22, 2, 18, P, 0, 18, 0);
      boxM(g, 20, 2, 16, S, 0, 10, 0);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          boxM(g, 2.5, 18, 2.5, S, sx * 8, 9, sz * 6);
          g.add(mesh(new THREE.CylinderGeometry(2, 2, 2, 10), A, sx * 8, 1, sz * 6));
        }
      boxM(g, 8, 4, 8, A, 0, 21, 0);
      break;
    }
    case "wall_art": {
      // Framed canvas on a short stand (readable as art in 3D).
      boxM(g, 4, 18, 4, S, 0, 9, 0);
      boxM(g, 22, 18, 2, P, 0, 24, 0);
      boxM(g, 16, 12, 1, A, 0, 24, 1.2);
      boxM(g, 14, 2, 14, S, 0, 1, 0);
      break;
    }
    case "jukebox": {
      boxM(g, 20, 32, 16, P, 0, 16, 0);
      g.add(mesh(new THREE.SphereGeometry(9, 12, 10), A, 0, 34, 0, 1, 0.7, 0.85));
      boxM(g, 14, 10, 1, namedMat("Secondary", 0x5fc6e8, true), 0, 18, 8.2);
      for (const x of [-5, 0, 5]) boxM(g, 2.5, 2.5, 1.5, S, x, 8, 8.4);
      break;
    }
    case "aquarium": {
      boxM(g, 40, 4, 18, S, 0, 2, 0);
      boxM(g, 38, 22, 16, namedMat("Primary", 0x7ec8e3, true), 0, 15, 0);
      boxM(g, 36, 2, 14, P, 0, 27, 0);
      g.add(mesh(new THREE.SphereGeometry(3, 8, 6), A, -8, 12, 2));
      g.add(mesh(new THREE.SphereGeometry(2.5, 8, 6), A, 6, 16, -2));
      boxM(g, 4, 6, 3, namedMat("Secondary", 0x4e9b3a, true), 10, 8, 0);
      break;
    }
    case "cat_tree": {
      boxM(g, 20, 3, 20, S, 0, 1.5, 0);
      g.add(mesh(new THREE.CylinderGeometry(3, 3, 28, 10), P, 0, 16, 0));
      boxM(g, 16, 2, 16, A, 0, 14, 0);
      boxM(g, 12, 2, 12, A, 4, 24, 2);
      g.add(mesh(new THREE.SphereGeometry(5, 10, 8), namedMat("Accent", 0xf49ab6, true), -2, 30, 0));
      break;
    }
    case "nest_basket": {
      g.add(mesh(new THREE.CylinderGeometry(11, 9, 8, 14), P, 0, 4, 0));
      g.add(mesh(new THREE.CylinderGeometry(9, 9, 2, 14), S, 0, 2, 0));
      g.add(mesh(new THREE.TorusGeometry(10, 1.5, 8, 16), A, 0, 8, 0));
      g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      break;
    }
    case "picnic_set": {
      // Blanket + basket + plate.
      boxM(g, 48, 1.5, 28, P, 0, 0.8, 0);
      boxM(g, 20, 1.2, 12, A, 8, 1.6, 4);
      boxM(g, 12, 8, 10, S, -12, 5, -4);
      boxM(g, 10, 2, 8, namedMat("Accent", 0xfff6e5, true), -12, 10, -4);
      g.add(mesh(new THREE.CylinderGeometry(4, 4, 1.5, 12), A, 10, 2.5, -6));
      break;
    }
    case "footstool": {
      boxM(g, 18, 6, 18, P, 0, 7, 0);
      boxM(g, 16, 2, 16, A, 0, 11, 0);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) boxM(g, 3, 6, 3, S, sx * 6, 3, sz * 6);
      break;
    }
    case "floor_cushion": {
      g.add(mesh(new THREE.CylinderGeometry(14, 14, 6, 16), P, 0, 3, 0));
      g.add(mesh(new THREE.CylinderGeometry(12, 12, 2, 16), A, 0, 6.5, 0));
      break;
    }
    case "side_table": {
      g.add(mesh(new THREE.CylinderGeometry(12, 12, 2.5, 14), P, 0, 14, 0));
      g.add(mesh(new THREE.CylinderGeometry(2, 2.5, 13, 8), S, 0, 6.5, 0));
      g.add(mesh(new THREE.CylinderGeometry(8, 8, 2, 12), S, 0, 1, 0));
      boxM(g, 5, 3, 5, A, 4, 16.5, 2);
      break;
    }
    case "spice_rack": {
      boxM(g, 24, 3, 10, P, 0, 8, 0);
      boxM(g, 24, 3, 10, P, 0, 18, 0);
      boxM(g, 2, 22, 10, S, -11, 12, 0);
      boxM(g, 2, 22, 10, S, 11, 12, 0);
      for (const [x, y] of [
        [-6, 11],
        [0, 11],
        [6, 11],
        [-6, 21],
        [0, 21],
        [6, 21],
      ]) {
        g.add(mesh(new THREE.CylinderGeometry(2.2, 2.2, 5, 10), A, x, y, 2));
      }
      break;
    }
    case "welcome_mat": {
      boxM(g, 28, 1.5, 18, P, 0, 0.8, 0);
      boxM(g, 22, 1.2, 12, A, 0, 1.6, 0);
      boxM(g, 28, 1.5, 2, S, 0, 0.8, -8);
      boxM(g, 28, 1.5, 2, S, 0, 0.8, 8);
      break;
    }
    case "smoothie_blender": {
      boxM(g, 14, 10, 14, P, 0, 5, 0);
      g.add(mesh(new THREE.CylinderGeometry(5, 6, 14, 12), A, 0, 17, 0));
      boxM(g, 8, 3, 8, S, 0, 25, 0);
      boxM(g, 3, 2, 2, namedMat("Accent", 0x2a3040, true), 5, 6, 7);
      break;
    }
    case "mini_fridge": {
      boxM(g, 18, 24, 16, P, 0, 12, 0);
      boxM(g, 16, 1.2, 14, S, 0, 16, 0.5);
      boxM(g, 1.5, 6, 1.5, A, 6, 14, 8);
      boxM(g, 10, 2, 1, namedMat("Accent", 0x5fc6e8, true), 0, 20, 8.2);
      break;
    }
    case "plush_sofa": {
      // Extra-chunky sofa with thick cushions.
      boxM(g, 52, 12, 26, P, 0, 6, 0);
      boxM(g, 52, 16, 8, S, 0, 16, -9);
      boxM(g, 8, 14, 24, S, -22, 13, 0);
      boxM(g, 8, 14, 24, S, 22, 13, 0);
      boxM(g, 20, 4, 18, A, -10, 13, 2);
      boxM(g, 20, 4, 18, A, 10, 13, 2);
      break;
    }
    case "love_seat": {
      boxM(g, 40, 10, 22, P, 0, 5, 0);
      boxM(g, 40, 14, 6, S, 0, 14, -8);
      boxM(g, 6, 12, 20, S, -17, 12, 0);
      boxM(g, 6, 12, 20, S, 17, 12, 0);
      boxM(g, 14, 3, 14, A, -7, 11, 2);
      boxM(g, 14, 3, 14, A, 7, 11, 2);
      break;
    }
    case "writing_desk": {
      boxM(g, 48, 3, 24, P, 0, 16, 0);
      boxM(g, 3, 15, 3, S, -20, 7.5, -8);
      boxM(g, 3, 15, 3, S, 20, 7.5, -8);
      boxM(g, 3, 15, 3, S, -20, 7.5, 8);
      boxM(g, 3, 15, 3, S, 20, 7.5, 8);
      boxM(g, 14, 8, 18, S, -14, 8, 0);
      boxM(g, 8, 1, 10, A, 8, 17.5, 2);
      g.add(mesh(new THREE.CylinderGeometry(1, 1, 8, 6), A, 16, 21, -6));
      g.add(mesh(new THREE.SphereGeometry(3, 8, 6), namedMat("Accent", 0xffd166, true), 16, 26, -6));
      break;
    }
    case "grand_bookshelf": {
      boxM(g, 48, 44, 14, P, 0, 22, 0);
      for (const y of [8, 18, 28, 38]) boxM(g, 46, 1.5, 12, S, 0, y, 0);
      boxM(g, 10, 6, 8, A, -14, 12, 1);
      boxM(g, 10, 6, 8, namedMat("Accent", 0x7fcfc0, true), 2, 22, 1);
      boxM(g, 10, 6, 8, namedMat("Accent", 0xf49ab6, true), 14, 32, 1);
      boxM(g, 10, 6, 8, namedMat("Accent", 0xffd166, true), -10, 32, 1);
      break;
    }
    case "market_crate": {
      boxM(g, 22, 12, 18, P, 0, 6, 0);
      boxM(g, 20, 1.5, 16, S, 0, 12.5, 0);
      // Open slats
      for (const z of [-6, 0, 6]) boxM(g, 1.5, 10, 16, S, z > 0 ? 10 : -10, 6, 0);
      g.add(mesh(new THREE.SphereGeometry(3.5, 8, 6), A, -4, 15, 2));
      g.add(mesh(new THREE.SphereGeometry(3, 8, 6), A, 3, 14.5, -2));
      g.add(mesh(new THREE.SphereGeometry(2.5, 8, 6), namedMat("Accent", 0xffd166, true), 5, 15, 3));
      break;
    }
    case "jam_shelf": {
      boxM(g, 26, 3, 12, P, 0, 10, 0);
      boxM(g, 26, 3, 12, P, 0, 22, 0);
      boxM(g, 2, 24, 12, S, -12, 14, 0);
      boxM(g, 2, 24, 12, S, 12, 14, 0);
      for (const [x, y, c] of [
        [-6, 14, 0xf49ab6],
        [0, 14, 0xffd166],
        [6, 14, 0x7fcfc0],
        [-6, 26, 0xf4a261],
        [0, 26, 0xf49ab6],
        [6, 26, 0x5fc6e8],
      ]) {
        g.add(mesh(new THREE.CylinderGeometry(2.8, 2.8, 6, 10), namedMat("Accent", c, true), x, y, 1));
        boxM(g, 3, 1.5, 3, namedMat("Secondary", 0xfff6e5, true), x, y + 3.5, 1);
      }
      break;
    }
    case "medicine_cabinet": {
      boxM(g, 20, 28, 10, P, 0, 14, 0);
      boxM(g, 16, 22, 1, namedMat("Secondary", 0xe8f0f5, true), 0, 14, 5.2);
      boxM(g, 8, 2.5, 1.5, A, 0, 16, 5.8);
      boxM(g, 2.5, 8, 1.5, A, 0, 16, 5.8);
      boxM(g, 2, 4, 1.5, S, 6, 14, 5.6);
      break;
    }
    case "healing_plant": {
      // Aloe-like upright leaves in a ceramic pot.
      g.add(mesh(new THREE.CylinderGeometry(6, 5, 9, 10), P, 0, 4.5, 0));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const leaf = mesh(new THREE.BoxGeometry(3, 16, 1.5), A, Math.cos(a) * 3, 14, Math.sin(a) * 3);
        leaf.rotation.z = Math.cos(a) * 0.35;
        leaf.rotation.x = Math.sin(a) * 0.35;
        g.add(leaf);
      }
      g.add(mesh(new THREE.SphereGeometry(2.5, 8, 6), S, 0, 10, 0));
      break;
    }
    case "canopy_bed": {
      boxM(g, 52, 5, 54, P, 0, 2.5, 0);
      boxM(g, 50, 4, 52, namedMat("Secondary", 0xe8d5f0, true), 0, 7, 0);
      boxM(g, 20, 3.5, 12, A, 0, 10.2, -16);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) boxM(g, 3, 36, 3, S, sx * 24, 20, sz * 24);
      boxM(g, 52, 2, 52, A, 0, 38, 0);
      boxM(g, 48, 10, 1, namedMat("Accent", 0xfff6e5, true), 0, 32, -24);
      break;
    }
    case "vanity": {
      boxM(g, 28, 14, 14, P, 0, 7, 0);
      boxM(g, 26, 2, 12, S, 0, 15, 0);
      boxM(g, 18, 20, 2, namedMat("Secondary", 0xe8f0f5, true), 0, 26, -4);
      boxM(g, 20, 22, 1.5, A, 0, 26, -5);
      boxM(g, 6, 3, 4, namedMat("Accent", 0xf49ab6, true), 8, 17, 2);
      break;
    }
    case "dog_house": {
      boxM(g, 28, 18, 24, P, 0, 9, 0);
      // Roof peak
      boxM(g, 32, 4, 28, S, 0, 20, 0);
      boxM(g, 24, 4, 24, S, 0, 23, 0);
      boxM(g, 10, 12, 1, namedMat("Secondary", 0x2a3040, true), 0, 8, 12.2);
      boxM(g, 6, 2, 6, A, 0, 22, 0);
      break;
    }
    case "scratching_post": {
      boxM(g, 16, 2, 16, S, 0, 1, 0);
      g.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 26, 10), P, 0, 14, 0));
      // Rope bands
      for (const y of [6, 12, 18]) {
        g.add(mesh(new THREE.TorusGeometry(4, 1, 6, 12), A, 0, y, 0));
        g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      }
      boxM(g, 12, 2, 12, S, 0, 28, 0);
      break;
    }
    case "telescope": {
      // Tripod + tube.
      for (const [x, z] of [
        [-8, 6],
        [8, 6],
        [0, -8],
      ]) {
        boxM(g, 2, 18, 2, S, x, 9, z);
      }
      boxM(g, 6, 3, 6, P, 0, 18, 0);
      g.add(mesh(new THREE.CylinderGeometry(3, 4, 22, 10), P, 4, 24, -2));
      g.children[g.children.length - 1].rotation.z = Math.PI / 5;
      g.children[g.children.length - 1].rotation.x = -Math.PI / 8;
      g.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 2, 10), A, 10, 28, -5));
      break;
    }
    case "party_lights": {
      // Two poles with a sagging light string.
      boxM(g, 2.5, 28, 2.5, S, -16, 14, 0);
      boxM(g, 2.5, 28, 2.5, S, 16, 14, 0);
      boxM(g, 34, 1.2, 1.2, P, 0, 26, 0);
      for (const [x, y, c] of [
        [-12, 24, 0xf49ab6],
        [-6, 22, 0xffd166],
        [0, 21, 0x5fc6e8],
        [6, 22, 0x7fcfc0],
        [12, 24, 0xf4a261],
      ]) {
        g.add(mesh(new THREE.SphereGeometry(2.2, 8, 6), namedMat("Accent", c, true), x, y, 0));
      }
      break;
    }
    case "arcade_cabinet": {
      boxM(g, 22, 36, 18, P, 0, 18, 0);
      boxM(g, 18, 12, 1, namedMat("Secondary", 0x5fc6e8, true), 0, 26, 9.2);
      boxM(g, 18, 6, 8, S, 0, 16, 6);
      boxM(g, 4, 2, 2, A, -4, 17, 10);
      boxM(g, 4, 2, 2, A, 4, 17, 10);
      boxM(g, 14, 4, 14, namedMat("Secondary", 0x2a3040, true), 0, 2, 0);
      break;
    }
    case "hammock": {
      // Posts + draped fabric.
      boxM(g, 3, 28, 3, S, -26, 14, 0);
      boxM(g, 3, 28, 3, S, 26, 14, 0);
      boxM(g, 52, 2, 16, P, 0, 14, 0);
      boxM(g, 40, 3, 14, A, 0, 12, 0);
      boxM(g, 28, 2, 12, A, 0, 10.5, 0);
      break;
    }
    default:
      boxM(g, 24, 14, 24, P, 0, 7, 0);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* World props pack                                                    */
/* ------------------------------------------------------------------ */

function buildWorldProps() {
  const pack = new THREE.Group();
  pack.name = "Props";

  const Bush = new THREE.Group();
  Bush.name = "Bush";
  Bush.add(mesh(new THREE.SphereGeometry(8, 12, 10), namedMat("Primary", 0x4e9b3a), 0, 7, 0));
  Bush.add(mesh(new THREE.SphereGeometry(6, 10, 8), namedMat("Secondary", 0x76c153), 4, 8, 2));
  Bush.add(mesh(new THREE.SphereGeometry(5.5, 10, 8), namedMat("Secondary", 0x76c153), -3, 9, -2));
  pack.add(Bush);

  const Flower = new THREE.Group();
  Flower.name = "Flower";
  Flower.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, 8, 6), namedMat("Primary", 0x4e9b3a), 0, 4, 0));
  Flower.add(mesh(new THREE.SphereGeometry(2.4, 10, 8), namedMat("Accent", 0xf49ab6), 0, 9, 0));
  Flower.add(mesh(new THREE.SphereGeometry(1.1, 8, 6), namedMat("Secondary", 0xffd166), 0, 9, 0));
  pack.add(Flower);

  const Rock = new THREE.Group();
  Rock.name = "Rock";
  Rock.add(mesh(new THREE.DodecahedronGeometry(5, 0), namedMat("Primary", 0x9a8b78, true), 0, 3.5, 0, 1.3, 0.8, 1));
  pack.add(Rock);

  const FencePost = new THREE.Group();
  FencePost.name = "FencePost";
  FencePost.add(mesh(new THREE.BoxGeometry(3, 16, 3), namedMat("Primary", 0xc79a63, true), 0, 8, 0));
  pack.add(FencePost);

  return pack;
}

async function main() {
  matCache.clear();

  await writeGLB(buildBody(), path.join(OUT, "characters/body.glb"));
  for (const style of ["short", "bun", "long", "wavy", "cap"]) {
    matCache.clear();
    await writeGLB(buildHair(style), path.join(OUT, `characters/hair_${style}.glb`));
  }
  for (const style of ["casual", "cozy", "sporty", "fancy"]) {
    matCache.clear();
    await writeGLB(buildTorso(style), path.join(OUT, `characters/torso_${style}.glb`));
  }
  for (const species of ["cat", "dog", "bunny", "fox", "bird"]) {
    matCache.clear();
    await writeGLB(buildPet(species), path.join(OUT, `pets/${species}.glb`));
  }
  const furniture = [
    "bed",
    "fridge",
    "toilet",
    "shower",
    "sofa",
    "tv",
    "table",
    "plant",
    "bookshelf",
    "pet_bed",
    "pet_bowl",
    "toy_ball",
    "counter",
    "kitchen_counter",
    "park_bench",
    "swing_set",
    "slide",
    "shelter_desk",
    "library_desk",
    "clinic_desk",
    // Unique catalog meshes
    "fern",
    "storybook",
    "yarn_ball",
    "coffee_machine",
    "microwave",
    "kettle",
    "toaster",
    "lounge_chair",
    "bean_bag",
    "reading_lamp",
    "radio",
    "dresser",
    "nightstand",
    "kitchen_cart",
    "wall_art",
    "jukebox",
    "aquarium",
    "cat_tree",
    "nest_basket",
    "picnic_set",
    "footstool",
    "floor_cushion",
    "side_table",
    "spice_rack",
    "welcome_mat",
    "smoothie_blender",
    "mini_fridge",
    "plush_sofa",
    "love_seat",
    "writing_desk",
    "grand_bookshelf",
    "market_crate",
    "jam_shelf",
    "medicine_cabinet",
    "healing_plant",
    "canopy_bed",
    "vanity",
    "dog_house",
    "scratching_post",
    "telescope",
    "party_lights",
    "arcade_cabinet",
    "hammock",
  ];
  for (const id of furniture) {
    matCache.clear();
    await writeGLB(buildFurniture(id), path.join(OUT, `furniture/${id}.glb`));
  }
  matCache.clear();
  await writeGLB(buildWorldProps(), path.join(OUT, "world/props.glb"));
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
