import * as THREE from "three";
import type { WeatherId } from "../data/types";
import { isNight, EVENING_START } from "../systems/dayCycle";

const MAX_FIREFLIES = 18;
/** Cap for line-streak rain; density scales with camera view size. */
const MAX_RAIN = 520;
const MAX_SPLASH = 48;
const GROUND_Y = 1.6;
/** Steady diagonal slant for rain streaks (world units along X/Z per unit of length). */
const RAIN_SLANT_X = 0.55;
const RAIN_SLANT_Z = 0.18;
/** Reference frustum — rain count is scaled from this. */
const RAIN_REF_FRUSTUM = 560;

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
 * Outdoor atmosphere: evening fireflies and rainy-day diagonal streaks.
 */
export class AmbientAtmosphere {
  private readonly root = new THREE.Group();
  private readonly addToScene: (obj: THREE.Object3D) => void;
  private readonly removeFromScene: (obj: THREE.Object3D) => void;
  private attached = false;

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

  /** Live camera ground coverage for rain (world units from follow centre). */
  private rainHalfX = 420;
  private rainHalfZ = 280;

  constructor(
    addToScene: (obj: THREE.Object3D) => void,
    removeFromScene: (obj: THREE.Object3D) => void,
  ) {
    this.addToScene = addToScene;
    this.removeFromScene = removeFromScene;
    this.root.name = "ambientAtmosphere";

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
    viewFrustum = RAIN_REF_FRUSTUM,
    viewAspect = 16 / 9,
  ) {
    if (!outdoors) {
      this.flies.length = 0;
      this.rain.length = 0;
      this.splashes.length = 0;
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

    if (raining) {
      // Rain replaces fireflies.
      this.flies.length = 0;
      this.flySpawnAcc = 0;
      this.syncFlies();

      // Cover the whole visible town — expand with zoom-out, not a player bubble.
      const span = Math.max(240, viewFrustum);
      this.rainHalfX = span * Math.max(1.1, viewAspect) * 0.62;
      this.rainHalfZ = span * 0.58;
      const areaScale = Math.min(
        2.4,
        Math.max(0.7, (span / RAIN_REF_FRUSTUM) ** 2),
      );
      const rainCap = Math.min(MAX_RAIN, Math.floor(220 * areaScale));
      const spawnRate = (night ? 110 : 150) * areaScale;

      // Fill the sky quickly when rain starts / zoom jumps.
      while (this.rain.length < rainCap * 0.85) {
        this.spawnRain(playerX, playerZ);
      }
      this.rainSpawnAcc += dt * spawnRate;
      while (this.rainSpawnAcc >= 1 && this.rain.length < rainCap) {
        this.rainSpawnAcc -= 1;
        this.spawnRain(playerX, playerZ);
      }
      // Trim if the player zoomed in a lot.
      while (this.rain.length > rainCap) this.rain.pop();

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

    this.tickFlies(dt, playerX, playerZ);
  }

  dispose() {
    if (this.attached) {
      this.removeFromScene(this.root);
      this.attached = false;
    }
    this.flyGeo.dispose();
    this.flyMat.dispose();
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.splashGeo.dispose();
    this.splashMat.dispose();
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

  private spawnRain(cx: number, cz: number) {
    const len = 5.5 + Math.random() * 5.5;
    const speed = 72 + Math.random() * 38;
    this.rain.push({
      x: cx + (Math.random() * 2 - 1) * this.rainHalfX,
      y: GROUND_Y + 22 + Math.random() * 40,
      z: cz + (Math.random() * 2 - 1) * this.rainHalfZ,
      vx: -speed * RAIN_SLANT_X,
      vy: -speed,
      vz: -speed * RAIN_SLANT_Z,
      len,
      life: 0,
      maxLife: 1.0 + Math.random() * 0.55,
    });
  }

  /** Recycle a drop at the top of the current camera ground coverage. */
  private recycleRain(d: RainDrop, cx: number, cz: number) {
    const speed = 72 + Math.random() * 38;
    d.x = cx + (Math.random() * 2 - 1) * this.rainHalfX;
    d.y = GROUND_Y + 28 + Math.random() * 36;
    d.z = cz + (Math.random() * 2 - 1) * this.rainHalfZ;
    d.vx = -speed * RAIN_SLANT_X;
    d.vy = -speed;
    d.vz = -speed * RAIN_SLANT_Z;
    d.len = 5.5 + Math.random() * 5.5;
    d.life = 0;
    d.maxLife = 1.0 + Math.random() * 0.55;
  }

  private tickRain(dt: number, cx: number, cz: number) {
    for (let i = this.rain.length - 1; i >= 0; i--) {
      const d = this.rain[i]!;
      d.life += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      if (d.y <= GROUND_Y + 0.4 || d.life >= d.maxLife) {
        if (d.y <= GROUND_Y + 1.2 && this.splashes.length < MAX_SPLASH) {
          // Only splash inside the current view — avoids offscreen work.
          if (
            Math.abs(d.x - cx) < this.rainHalfX &&
            Math.abs(d.z - cz) < this.rainHalfZ
          ) {
            this.splashes.push({
              x: d.x,
              y: GROUND_Y + 0.35,
              z: d.z,
              life: 0,
              maxLife: 0.28 + Math.random() * 0.22,
              size: 5 + Math.random() * 6,
            });
          }
        }
        this.recycleRain(d, cx, cz);
      }
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
