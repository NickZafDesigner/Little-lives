import * as THREE from "three";
import { Palette } from "../game/palette";
import type { WeatherId } from "../data/types";
import { isNight, MORNING_TIME, EVENING_START } from "../systems/dayCycle";

const MAX_LEAVES = 14;
const MAX_MOTES = 28;
const MAX_FIREFLIES = 18;
const MAX_RAIN = 220;
const MAX_SPLASH = 36;
const GROUND_Y = 1.6;
/** Steady diagonal slant for rain streaks (world units along X/Z per unit of length). */
const RAIN_SLANT_X = 0.55;
const RAIN_SLANT_Z = 0.18;

type Leaf = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  life: number;
  maxLife: number;
};

type Mote = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
};

type Firefly = {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  bob: number;
  life: number;
  maxLife: number;
  size: number;
};

type RainDrop = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  len: number;
  life: number;
  maxLife: number;
};

type Splash = {
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  size: number;
};

/**
 * Soft outdoor atmosphere: gusting leaves, sparse pollen,
 * evening fireflies, and rainy-day diagonal streaks.
 */
export class AmbientAtmosphere {
  private readonly root = new THREE.Group();
  private readonly addToScene: (obj: THREE.Object3D) => void;
  private readonly removeFromScene: (obj: THREE.Object3D) => void;
  private attached = false;

  private readonly leaves: Leaf[] = [];
  private readonly leafGeo: THREE.PlaneGeometry;
  private readonly leafMats: THREE.MeshBasicMaterial[];

  private readonly motes: Mote[] = [];
  private moteSpawnAcc = 0;
  private readonly motePos: Float32Array;
  private readonly moteAttr: Float32Array;
  private readonly moteGeo: THREE.BufferGeometry;
  private readonly moteMat: THREE.ShaderMaterial;
  private readonly motePoints: THREE.Points;

  private readonly flies: Firefly[] = [];
  private flySpawnAcc = 0;
  private readonly flyPos: Float32Array;
  private readonly flyAttr: Float32Array;
  private readonly flyGeo: THREE.BufferGeometry;
  private readonly flyMat: THREE.ShaderMaterial;
  private readonly flyPoints: THREE.Points;

  private readonly rain: RainDrop[] = [];
  private rainSpawnAcc = 0;
  private readonly rainPos: Float32Array;
  private readonly rainGeo: THREE.BufferGeometry;
  private readonly rainMat: THREE.LineBasicMaterial;
  private readonly rainLines: THREE.LineSegments;

  private readonly splashes: Splash[] = [];
  private readonly splashPos: Float32Array;
  private readonly splashAttr: Float32Array;
  private readonly splashGeo: THREE.BufferGeometry;
  private readonly splashMat: THREE.ShaderMaterial;
  private readonly splashPoints: THREE.Points;

  private gustIn = 0;
  private windX = 18;
  private windZ = 6;

  constructor(
    addToScene: (obj: THREE.Object3D) => void,
    removeFromScene: (obj: THREE.Object3D) => void,
  ) {
    this.addToScene = addToScene;
    this.removeFromScene = removeFromScene;
    this.root.name = "ambientAtmosphere";

    this.leafGeo = new THREE.PlaneGeometry(2.4, 1.5);
    this.leafMats = [
      new THREE.MeshBasicMaterial({
        color: Palette.leaf,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: Palette.leafLight,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: Palette.orange,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: Palette.sunflower,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ];

    this.motePos = new Float32Array(MAX_MOTES * 3);
    this.moteAttr = new Float32Array(MAX_MOTES * 2);
    this.moteGeo = new THREE.BufferGeometry();
    this.moteGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.motePos, 3),
    );
    this.moteGeo.setAttribute(
      "aData",
      new THREE.BufferAttribute(this.moteAttr, 2),
    );
    this.moteMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xfff2c4) },
      },
      vertexShader: `
        attribute vec2 aData;
        varying float vLife;
        varying float vSize;
        void main() {
          vLife = aData.x;
          vSize = aData.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = vSize * (180.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vLife;
        varying float vSize;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = dot(p, p);
          if (d > 1.0) discard;
          float a = smoothstep(1.0, 0.15, d) * vLife * 0.45;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.motePoints = new THREE.Points(this.moteGeo, this.moteMat);
    this.motePoints.frustumCulled = false;
    this.root.add(this.motePoints);

    this.flyPos = new Float32Array(MAX_FIREFLIES * 3);
    this.flyAttr = new Float32Array(MAX_FIREFLIES * 2);
    this.flyGeo = new THREE.BufferGeometry();
    this.flyGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.flyPos, 3),
    );
    this.flyGeo.setAttribute(
      "aData",
      new THREE.BufferAttribute(this.flyAttr, 2),
    );
    this.flyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xd7ff8a) },
      },
      vertexShader: `
        attribute vec2 aData;
        varying float vLife;
        void main() {
          vLife = aData.x;
          float size = aData.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (220.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = dot(p, p);
          if (d > 1.0) discard;
          float glow = exp(-d * 3.2);
          float a = glow * vLife;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.flyPoints = new THREE.Points(this.flyGeo, this.flyMat);
    this.flyPoints.frustumCulled = false;
    this.root.add(this.flyPoints);

    // Two verts per drop → diagonal line streaks.
    this.rainPos = new Float32Array(MAX_RAIN * 2 * 3);
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.rainPos, 3),
    );
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xd0e0f0,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.renderOrder = 3;
    this.root.add(this.rainLines);

    this.splashPos = new Float32Array(MAX_SPLASH * 3);
    this.splashAttr = new Float32Array(MAX_SPLASH * 2);
    this.splashGeo = new THREE.BufferGeometry();
    this.splashGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.splashPos, 3),
    );
    this.splashGeo.setAttribute(
      "aData",
      new THREE.BufferAttribute(this.splashAttr, 2),
    );
    this.splashMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xd8e6f2) },
      },
      vertexShader: `
        attribute vec2 aData;
        varying float vLife;
        void main() {
          vLife = aData.x;
          float size = aData.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = length(p);
          float ring = smoothstep(0.95, 0.35, d) * smoothstep(0.05, 0.4, d);
          float a = ring * vLife * 0.55;
          if (a < 0.02) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.splashPoints = new THREE.Points(this.splashGeo, this.splashMat);
    this.splashPoints.frustumCulled = false;
    this.root.add(this.splashPoints);
  }

  update(
    dt: number,
    dayTime: number,
    playerX: number,
    playerZ: number,
    outdoors: boolean,
    weather: WeatherId = "clear",
  ) {
    if (!outdoors) {
      this.clearLeaves();
      this.motes.length = 0;
      this.flies.length = 0;
      this.rain.length = 0;
      this.splashes.length = 0;
      this.syncMotes();
      this.syncFlies();
      this.syncRain();
      this.syncSplashes();
      this.root.visible = false;
      return;
    }
    this.root.visible = true;
    if (!this.attached) {
      this.addToScene(this.root);
      this.attached = true;
    }

    const raining = weather === "rain";
    const night = isNight(dayTime);
    const evening = dayTime >= EVENING_START;
    const morning = dayTime >= MORNING_TIME && dayTime < 0.45;

    if (raining) {
      // Rain replaces leaf gusts / pollen / fireflies.
      this.clearLeaves();
      this.motes.length = 0;
      this.flies.length = 0;
      this.moteSpawnAcc = 0;
      this.flySpawnAcc = 0;
      this.syncMotes();
      this.syncFlies();

      this.rainSpawnAcc += dt * (night ? 70 : 95);
      while (this.rainSpawnAcc >= 1 && this.rain.length < MAX_RAIN) {
        this.rainSpawnAcc -= 1;
        this.spawnRain(playerX, playerZ);
      }
      this.tickRain(dt, playerX, playerZ);
      this.tickSplashes(dt);
      return;
    }

    // Clear weather — no rain streaks.
    this.rain.length = 0;
    this.splashes.length = 0;
    this.rainSpawnAcc = 0;
    this.syncRain();
    this.syncSplashes();

    this.gustIn -= dt;
    if (this.gustIn <= 0 && !night) {
      this.gustIn = 7 + Math.random() * 14;
      this.windX = (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 22);
      this.windZ = (Math.random() - 0.5) * 18;
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) this.spawnLeaf(playerX, playerZ);
    }

    // Sparse warm pollen inland (daytime only).
    if (!night && !evening) {
      (this.moteMat.uniforms.uColor!.value as THREE.Color).set(0xfff0b8);
      this.moteSpawnAcc += dt * (morning ? 2.2 : 1.2);
      while (
        this.moteSpawnAcc >= 1 &&
        this.motes.length < Math.min(18, MAX_MOTES)
      ) {
        this.moteSpawnAcc -= 1;
        this.spawnMote(playerX, playerZ);
      }
    } else {
      this.moteSpawnAcc = 0;
    }

    // Fireflies after golden hour into night.
    if (evening || night) {
      this.flySpawnAcc += dt * (night ? 3.5 : 2.2);
      while (this.flySpawnAcc >= 1 && this.flies.length < MAX_FIREFLIES) {
        this.flySpawnAcc -= 1;
        this.spawnFirefly(playerX, playerZ);
      }
    } else {
      this.flySpawnAcc = 0;
    }

    this.tickLeaves(dt);
    this.tickMotes(dt);
    this.tickFlies(dt, playerX, playerZ);
  }

  dispose() {
    this.clearLeaves();
    if (this.attached) {
      this.removeFromScene(this.root);
      this.attached = false;
    }
    this.leafGeo.dispose();
    for (const m of this.leafMats) m.dispose();
    this.moteGeo.dispose();
    this.moteMat.dispose();
    this.flyGeo.dispose();
    this.flyMat.dispose();
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.splashGeo.dispose();
    this.splashMat.dispose();
  }

  private spawnLeaf(px: number, pz: number) {
    if (this.leaves.length >= MAX_LEAVES) return;
    const base =
      this.leafMats[Math.floor(Math.random() * this.leafMats.length)]!;
    const mat = base.clone();
    const mesh = new THREE.Mesh(this.leafGeo, mat);
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = px + side * (28 + Math.random() * 40);
    const z = pz + (Math.random() - 0.5) * 55;
    const y = GROUND_Y + 6 + Math.random() * 18;
    mesh.position.set(x, y, z);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    mesh.renderOrder = 2;
    this.root.add(mesh);
    this.leaves.push({
      mesh,
      vx: this.windX * (0.7 + Math.random() * 0.6),
      vy: -2 - Math.random() * 5,
      vz: this.windZ * (0.5 + Math.random() * 0.8),
      spinX: (Math.random() - 0.5) * 6,
      spinY: (Math.random() - 0.5) * 8,
      spinZ: (Math.random() - 0.5) * 6,
      life: 0,
      maxLife: 4.5 + Math.random() * 3.5,
    });
  }

  private tickLeaves(dt: number) {
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i]!;
      leaf.life += dt;
      const t = leaf.life / leaf.maxLife;
      const flutter = Math.sin(leaf.life * 9 + i) * 10;
      leaf.mesh.position.x += (leaf.vx + flutter) * dt;
      leaf.mesh.position.y += leaf.vy * dt;
      leaf.mesh.position.z += (leaf.vz + Math.cos(leaf.life * 7) * 6) * dt;
      leaf.mesh.rotation.x += leaf.spinX * dt;
      leaf.mesh.rotation.y += leaf.spinY * dt;
      leaf.mesh.rotation.z += leaf.spinZ * dt;
      const mat = leaf.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.85;
      if (leaf.life >= leaf.maxLife || leaf.mesh.position.y < GROUND_Y - 1) {
        this.root.remove(leaf.mesh);
        (leaf.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.leaves.splice(i, 1);
      }
    }
  }

  private clearLeaves() {
    for (const leaf of this.leaves) {
      this.root.remove(leaf.mesh);
      (leaf.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.leaves.length = 0;
  }

  private spawnMote(px: number, pz: number) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 6 + Math.random() * 28;
    this.motes.push({
      x: px + Math.cos(ang) * rad,
      y: GROUND_Y + 4 + Math.random() * 14,
      z: pz + Math.sin(ang) * rad,
      vx: (Math.random() - 0.5) * 4,
      vy: 0.4 + Math.random() * 1.6,
      vz: (Math.random() - 0.5) * 4,
      life: 0,
      maxLife: 5 + Math.random() * 5,
      size: 1.6 + Math.random() * 1.8,
    });
  }

  private tickMotes(dt: number) {
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]!;
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      if (m.life >= m.maxLife) this.motes.splice(i, 1);
    }
    this.syncMotes();
  }

  private syncMotes() {
    for (let i = 0; i < MAX_MOTES; i++) {
      const m = this.motes[i];
      if (!m) {
        this.motePos[i * 3] = 0;
        this.motePos[i * 3 + 1] = -999;
        this.motePos[i * 3 + 2] = 0;
        this.moteAttr[i * 2] = 0;
        this.moteAttr[i * 2 + 1] = 0;
        continue;
      }
      const u = 1 - m.life / m.maxLife;
      this.motePos[i * 3] = m.x;
      this.motePos[i * 3 + 1] = m.y;
      this.motePos[i * 3 + 2] = m.z;
      this.moteAttr[i * 2] = Math.sin(u * Math.PI);
      this.moteAttr[i * 2 + 1] = m.size;
    }
    (
      this.moteGeo.getAttribute("position") as THREE.BufferAttribute
    ).needsUpdate = true;
    (this.moteGeo.getAttribute("aData") as THREE.BufferAttribute).needsUpdate =
      true;
  }

  private spawnFirefly(px: number, pz: number) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 6 + Math.random() * 28;
    this.flies.push({
      x: px + Math.cos(ang) * rad,
      y: GROUND_Y + 3 + Math.random() * 10,
      z: pz + Math.sin(ang) * rad,
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 1.8,
      bob: 0.8 + Math.random() * 1.4,
      life: 0,
      maxLife: 8 + Math.random() * 8,
      size: 3.5 + Math.random() * 3,
    });
  }

  private tickFlies(dt: number, px: number, pz: number) {
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i]!;
      f.life += dt;
      f.phase += dt * f.speed;
      f.x += Math.cos(f.phase) * 3.5 * dt;
      f.z += Math.sin(f.phase * 0.9) * 3.5 * dt;
      f.y += Math.sin(f.phase * 1.4) * f.bob * dt;
      // Soft leash so they stay near the player.
      f.x += (px - f.x) * 0.015 * dt;
      f.z += (pz - f.z) * 0.015 * dt;
      if (f.life >= f.maxLife) this.flies.splice(i, 1);
    }
    this.syncFlies();
  }

  private syncFlies() {
    for (let i = 0; i < MAX_FIREFLIES; i++) {
      const f = this.flies[i];
      if (!f) {
        this.flyPos[i * 3] = 0;
        this.flyPos[i * 3 + 1] = -999;
        this.flyPos[i * 3 + 2] = 0;
        this.flyAttr[i * 2] = 0;
        this.flyAttr[i * 2 + 1] = 0;
        continue;
      }
      const u = 1 - f.life / f.maxLife;
      const blink = 0.35 + 0.65 * Math.max(0, Math.sin(f.phase * 2.2));
      this.flyPos[i * 3] = f.x;
      this.flyPos[i * 3 + 1] = f.y;
      this.flyPos[i * 3 + 2] = f.z;
      this.flyAttr[i * 2] = Math.sin(u * Math.PI) * blink;
      this.flyAttr[i * 2 + 1] = f.size;
    }
    (
      this.flyGeo.getAttribute("position") as THREE.BufferAttribute
    ).needsUpdate = true;
    (this.flyGeo.getAttribute("aData") as THREE.BufferAttribute).needsUpdate =
      true;
  }

  private spawnRain(px: number, pz: number) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * 58;
    const len = 5.5 + Math.random() * 5.5;
    const speed = 72 + Math.random() * 38;
    this.rain.push({
      x: px + Math.cos(ang) * rad,
      y: GROUND_Y + 26 + Math.random() * 34,
      z: pz + Math.sin(ang) * rad,
      vx: -speed * RAIN_SLANT_X,
      vy: -speed,
      vz: -speed * RAIN_SLANT_Z,
      len,
      life: 0,
      maxLife: 1.0 + Math.random() * 0.55,
    });
  }

  private tickRain(dt: number, px: number, pz: number) {
    for (let i = this.rain.length - 1; i >= 0; i--) {
      const d = this.rain[i]!;
      d.life += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      if (d.y <= GROUND_Y + 0.4 || d.life >= d.maxLife) {
        if (d.y <= GROUND_Y + 1.2 && this.splashes.length < MAX_SPLASH) {
          this.splashes.push({
            x: d.x,
            y: GROUND_Y + 0.35,
            z: d.z,
            life: 0,
            maxLife: 0.28 + Math.random() * 0.22,
            size: 5 + Math.random() * 6,
          });
        }
        this.rain.splice(i, 1);
        continue;
      }
      // Soft leash so rain stays around the player as they walk.
      d.x += (px - d.x) * 0.03 * dt;
      d.z += (pz - d.z) * 0.03 * dt;
    }
    this.syncRain();
  }

  private syncRain() {
    for (let i = 0; i < MAX_RAIN; i++) {
      const d = this.rain[i];
      const i6 = i * 6;
      if (!d) {
        this.rainPos[i6] = 0;
        this.rainPos[i6 + 1] = -999;
        this.rainPos[i6 + 2] = 0;
        this.rainPos[i6 + 3] = 0;
        this.rainPos[i6 + 4] = -999;
        this.rainPos[i6 + 5] = 0;
        continue;
      }
      // Head → tail along the fall direction for a clear diagonal slash.
      this.rainPos[i6] = d.x;
      this.rainPos[i6 + 1] = d.y;
      this.rainPos[i6 + 2] = d.z;
      this.rainPos[i6 + 3] = d.x - RAIN_SLANT_X * d.len;
      this.rainPos[i6 + 4] = d.y - d.len;
      this.rainPos[i6 + 5] = d.z - RAIN_SLANT_Z * d.len;
    }
    (
      this.rainGeo.getAttribute("position") as THREE.BufferAttribute
    ).needsUpdate = true;
    // Draw only active segments.
    this.rainGeo.setDrawRange(0, this.rain.length * 2);
  }

  private tickSplashes(dt: number) {
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]!;
      s.life += dt;
      s.size += 14 * dt;
      if (s.life >= s.maxLife) this.splashes.splice(i, 1);
    }
    this.syncSplashes();
  }

  private syncSplashes() {
    for (let i = 0; i < MAX_SPLASH; i++) {
      const s = this.splashes[i];
      if (!s) {
        this.splashPos[i * 3] = 0;
        this.splashPos[i * 3 + 1] = -999;
        this.splashPos[i * 3 + 2] = 0;
        this.splashAttr[i * 2] = 0;
        this.splashAttr[i * 2 + 1] = 0;
        continue;
      }
      const u = 1 - s.life / s.maxLife;
      this.splashPos[i * 3] = s.x;
      this.splashPos[i * 3 + 1] = s.y;
      this.splashPos[i * 3 + 2] = s.z;
      this.splashAttr[i * 2] = Math.sin(u * Math.PI);
      this.splashAttr[i * 2 + 1] = s.size;
    }
    (
      this.splashGeo.getAttribute("position") as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.splashGeo.getAttribute("aData") as THREE.BufferAttribute
    ).needsUpdate = true;
  }
}
