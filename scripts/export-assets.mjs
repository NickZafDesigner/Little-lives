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

  // Hip / pelvis — keep narrow so it stays under the shirt hem
  root.add(mesh(new THREE.SphereGeometry(3.4, 12, 10), pants, 0, 11.2, 0, 1.05, 0.62, 0.78));

  // Arms pivot at shoulders — hang slightly forward so hands don't
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

  // Neck + Head
  root.add(mesh(new THREE.CylinderGeometry(1.6, 2, 2.4, 10), skin, 0, 26.2, 0));
  const Head = new THREE.Group();
  Head.name = "Head";
  Head.position.set(0, 31.5, 0);
  // Head ball is Hair-tinted — sides/back can never flash skin through style seams.
  Head.add(
    mesh(
      new THREE.SphereGeometry(6.2, 16, 14),
      namedMat("Hair", 0x8d5a3b),
      0,
      0,
      0,
      1,
      1.05,
      0.95,
    ),
  );
  // Skin face pad on +Z — tight to the face plate so temples stay hair-brown.
  Head.add(
    mesh(
      new THREE.SphereGeometry(3.6, 16, 12),
      skin,
      0,
      0.25,
      4.7,
      0.5,
      0.78,
      0.4,
    ),
  );
  // Eyes
  Head.add(mesh(new THREE.SphereGeometry(0.85, 8, 8), namedMat("Accent", 0x2a2018), -2.1, 0.6, 5.2));
  Head.add(mesh(new THREE.SphereGeometry(0.85, 8, 8), namedMat("Accent", 0x2a2018), 2.1, 0.6, 5.2));
  Head.add(mesh(new THREE.SphereGeometry(0.28, 6, 6), namedMat("Primary", 0xffffff), -1.85, 0.95, 5.7));
  Head.add(mesh(new THREE.SphereGeometry(0.28, 6, 6), namedMat("Primary", 0xffffff), 2.35, 0.95, 5.7));
  // Cheeks on the face pad
  Head.add(
    mesh(
      new THREE.SphereGeometry(0.85, 8, 8),
      namedMat("Secondary", 0xf49ab6),
      -2.35,
      -1.0,
      5.05,
      1,
      0.75,
      0.55,
    ),
  );
  Head.add(
    mesh(
      new THREE.SphereGeometry(0.85, 8, 8),
      namedMat("Secondary", 0xf49ab6),
      2.35,
      -1.0,
      5.05,
      1,
      0.75,
      0.55,
    ),
  );
  Head.add(mesh(new THREE.BoxGeometry(2.2, 0.35, 0.4), namedMat("Accent", 0xc07060), 0, -2.2, 5.4));
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
 * Base coverage is one oversized sphere pulled back/up so the face
 * protrudes through the front while sides/temples stay fully wrapped.
 */
function buildHair(style) {
  const g = new THREE.Group();
  g.name = "Hair";
  g.position.set(0, 0, 0);
  const hair = namedMat("Hair", 0x8d5a3b);
  const accent = namedMat("Accent", 0x5a3a28);
  const R = 6.2;

  /** Soft crown volume — sits snug on the hair-colored head (low lift). */
  const skull = (scale = 1.06, lift = 0.08, back = 0.08) => {
    g.add(
      mesh(
        new THREE.SphereGeometry(R * scale, 18, 14),
        hair,
        0,
        R * lift,
        -R * back,
        1.03,
        0.98,
        1.03,
      ),
    );
  };

  /** Soft fringe along the brow. */
  const fringe = (w = 1, h = 0.26) => {
    g.add(
      mesh(
        new THREE.SphereGeometry(R * 0.36, 12, 10),
        hair,
        0,
        R * 0.5,
        R * 0.7,
        1.3 * w,
        (h / 0.26) * 0.4,
        0.5,
      ),
    );
    for (const [du, tilt, size] of [
      [-0.38, 0.28, 0.28],
      [0.38, -0.28, 0.28],
    ]) {
      const m = mesh(
        new THREE.SphereGeometry(R * size, 10, 8),
        hair,
        du * 0.7 * w * R,
        R * 0.42,
        R * 0.62,
        1.0 * w,
        (h / 0.26) * 0.5,
        0.65,
      );
      m.rotation.z = tilt;
      g.add(m);
    }
  };

  if (style === "bun") {
    skull(1.05, 0.1, 0.1);
    fringe(0.9, 0.22);
    g.add(mesh(new THREE.SphereGeometry(R * 0.6, 12, 10), hair, 0, R * 1.12, -R * 0.5));
    g.add(mesh(new THREE.TorusGeometry(R * 0.33, R * 0.08, 6, 14), accent, 0, R * 0.82, -R * 0.55));
  } else if (style === "long") {
    skull(1.06, 0.08, 0.08);
    fringe(1.04, 0.28);
    // Fall down the back + side strands framing the face (below cheek line)
    for (let i = 0; i < 4; i++) {
      g.add(
        mesh(
          new THREE.SphereGeometry(R * (0.88 - i * 0.11), 12, 10),
          hair,
          0,
          -R * (0.56 + i * 0.52),
          -R * (0.5 + i * 0.03),
          1.06 - i * 0.05,
          1.15,
          0.6,
        ),
      );
    }
    for (const side of [-1, 1]) {
      const strand = mesh(
        new THREE.CapsuleGeometry(R * 0.25, R * 1.15, 4, 8),
        hair,
        side * R * 0.84,
        -R * 0.72,
        R * 0.2,
        1.05,
        1,
        0.85,
      );
      strand.rotation.z = side * 0.06;
      g.add(strand);
    }
  } else if (style === "wavy") {
    skull(1.07, 0.08, 0.08);
    fringe(1.06, 0.32);
    // Side curls fall from the wrap — not separate temple blobs
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.add(
          mesh(
            new THREE.SphereGeometry(R * (0.42 - i * 0.05), 10, 8),
            hair,
            side * R * (0.78 + i * 0.04),
            -R * (0.12 + i * 0.4),
            R * (0.2 - i * 0.14),
            0.9,
            1,
            0.78,
          ),
        );
      }
    }
  } else if (style === "cap") {
    skull(1.04, 0.06, 0.1);
    // Crown stops at the hairline — any lower and the face vanishes under the hat
    g.add(
      mesh(
        new THREE.SphereGeometry(R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
        accent,
        0,
        R * 0.04,
        0,
        1,
        1.02,
        1,
      ),
    );
    g.add(mesh(new THREE.CylinderGeometry(R * 1.06, R * 1.06, R * 0.14, 18), accent, 0, R * 0.37, 0, 1, 1, 0.98));
    const brim = mesh(
      new THREE.SphereGeometry(R * 0.55, 14, 8),
      accent,
      0,
      R * 0.38,
      R * 0.5,
      1.2,
      0.22,
      1.2,
    );
    brim.rotation.x = 0.3;
    g.add(brim);
  } else {
    // short
    skull(1.06, 0.08, 0.08);
    fringe(1, 0.26);
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
      boxM(g, 28, 2, 28, namedMat("Primary", 0xb2dfdb, true), 0, 1, 0);
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
    case "park_bench":
      boxM(g, 44, 3, 14, P, 0, 10, 0);
      boxM(g, 44, 10, 3, S, 0, 16, -5);
      boxM(g, 3, 10, 12, S, -18, 5, 0);
      boxM(g, 3, 10, 12, S, 18, 5, 0);
      break;
    case "shelter_desk":
    case "library_desk":
    case "clinic_desk":
      boxM(g, 48, 3, 28, P, 0, 16, 0);
      boxM(g, 44, 14, 24, S, 0, 7, 0);
      boxM(g, 12, 4, 10, A, -10, 19, 4);
      break;
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
    "park_bench",
    "shelter_desk",
    "library_desk",
    "clinic_desk",
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
