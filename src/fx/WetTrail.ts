import * as THREE from "three";
import { Palette } from "../game/palette";

/** How long trail ink stays before fully fading. */
const FADE_SEC = 10;
/** World units between samples along the walking trail. */
const SAMPLE_SPACING = 3.5;
/** Speed below this (units/sec) counts as standing still. */
const STILL_SPEED = 12;
/** Must stay put this long (while wet) before a puddle starts growing. */
const PUDDLE_STILL_SEC = 2;
/** Leave this radius and the "stationary" timer resets. */
const STILL_RADIUS = 10;
const PUDDLE_GROW_PER_SEC = 0.7;
const PUDDLE_MAX_SCALE = 4.2;
const PUDDLE_START_RADIUS = 0.7;
/** Half-width of the continuous trail ribbon. */
const TRAIL_HALF_W = 2.6;
/** Just above outdoor path/grass tops (~1.2). */
export const WET_TRAIL_OUTDOOR_Y = 1.4;
/** Just above building floor plinth (PLINTH_H = 2 → top at y=2). */
export const WET_TRAIL_INDOOR_Y = 2.2;
const MAX_POINTS = 220;
const MAX_SPARKS = 64;
const MAX_FLIES = 14;

type TrailPoint = {
  x: number;
  y: number;
  z: number;
  age: number;
};

type Puddle = {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  glowMat: THREE.ShaderMaterial;
  age: number;
  peak: number;
  growing: boolean;
  radius: number;
};

type Spark = {
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

type Fly = {
  /** Orbit center (puddle / trail). */
  cx: number;
  cy: number;
  cz: number;
  /** Local orbit offsets. */
  ox: number;
  oz: number;
  phase: number;
  speed: number;
  bob: number;
  radius: number;
  life: number;
  maxLife: number;
};

export type WetTrailGroundY = (x: number, z: number) => number;

const INK = new THREE.Color(Palette.sunflower);
const INK_DEEP = new THREE.Color(Palette.sunflowerDark);
const INK_GLOW = new THREE.Color(0xffe9a0);

/**
 * Cartoon pee trail: soft gradient ribbon + glowing puddle, mist sparkles,
 * and tiny flies drawn to the mess. Fades ~10s after you shower / move on.
 */
export class WetTrail {
  private readonly root = new THREE.Group();
  private readonly puddleGeo: THREE.CircleGeometry;
  private readonly points: TrailPoint[] = [];
  private ribbon: THREE.Mesh | null = null;
  private ribbonGeo: THREE.BufferGeometry | null = null;
  private ribbonMat: THREE.ShaderMaterial;
  private puddle: Puddle | null = null;
  private lastX = 0;
  private lastZ = 0;
  private lastSampleX = 0;
  private lastSampleZ = 0;
  private primed = false;
  private dirty = false;
  /** Seconds spent standing still while wet (resets when you move). */
  private stillSec = 0;
  private stillOriginX = 0;
  private stillOriginZ = 0;
  private readonly addToScene: (obj: THREE.Object3D) => void;
  private readonly removeFromScene: (obj: THREE.Object3D) => void;
  private readonly groundYAt: WetTrailGroundY;

  private readonly sparks: Spark[] = [];
  private sparkSpawnAcc = 0;
  private readonly sparkGeo: THREE.BufferGeometry;
  private readonly sparkMat: THREE.ShaderMaterial;
  private readonly sparkPoints: THREE.Points;
  private readonly sparkPos: Float32Array;
  private readonly sparkAttr: Float32Array;

  private readonly flies: Fly[] = [];
  private flySpawnAcc = 0;
  private readonly flyGeo: THREE.BufferGeometry;
  private readonly flyMat: THREE.ShaderMaterial;
  private readonly flyPoints: THREE.Points;
  private readonly flyPos: Float32Array;
  private readonly flyAttr: Float32Array;

  constructor(
    addToScene: (obj: THREE.Object3D) => void,
    removeFromScene: (obj: THREE.Object3D) => void,
    groundYAt: WetTrailGroundY = () => WET_TRAIL_OUTDOOR_Y,
  ) {
    this.addToScene = addToScene;
    this.removeFromScene = removeFromScene;
    this.groundYAt = groundYAt;
    this.root.name = "wet_trail";
    this.puddleGeo = new THREE.CircleGeometry(1, 36);

    this.ribbonMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uColor: { value: INK },
        uColorDeep: { value: INK_DEEP },
        uGlow: { value: INK_GLOW },
      },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        attribute float aSide;
        varying float vAlpha;
        varying float vSide;
        void main() {
          vAlpha = aAlpha;
          vSide = aSide;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uColorDeep;
        uniform vec3 uGlow;
        varying float vAlpha;
        varying float vSide;
        void main() {
          float edge = 1.0 - abs(vSide);
          // Soft feathered edges + brighter wet core
          float soft = smoothstep(0.0, 0.55, edge);
          float core = smoothstep(0.35, 1.0, edge);
          vec3 col = mix(uColorDeep, uColor, soft);
          col = mix(col, uGlow, core * 0.45);
          float a = vAlpha * soft * soft;
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
    });

    this.sparkPos = new Float32Array(MAX_SPARKS * 3);
    this.sparkAttr = new Float32Array(MAX_SPARKS * 2); // life01, size
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.sparkPos, 3),
    );
    this.sparkGeo.setAttribute(
      "aData",
      new THREE.BufferAttribute(this.sparkAttr, 2),
    );
    this.sparkGeo.setDrawRange(0, 0);
    this.sparkMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: INK_GLOW },
      },
      vertexShader: /* glsl */ `
        attribute vec2 aData;
        varying float vLife;
        void main() {
          vLife = aData.x;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aData.y * (180.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = length(p);
          float soft = smoothstep(1.0, 0.15, d);
          float a = soft * vLife * 0.85;
          if (a < 0.02) discard;
          vec3 col = mix(uColor, vec3(1.0), soft * 0.55);
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
    this.sparkPoints.renderOrder = 14;
    this.sparkPoints.frustumCulled = false;
    this.root.add(this.sparkPoints);

    this.flyPos = new Float32Array(MAX_FLIES * 3);
    this.flyAttr = new Float32Array(MAX_FLIES * 2); // life01, size
    this.flyGeo = new THREE.BufferGeometry();
    this.flyGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.flyPos, 3),
    );
    this.flyGeo.setAttribute(
      "aData",
      new THREE.BufferAttribute(this.flyAttr, 2),
    );
    this.flyGeo.setDrawRange(0, 0);
    this.flyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uColor: { value: new THREE.Color(0x2a2418) },
      },
      vertexShader: /* glsl */ `
        attribute vec2 aData;
        varying float vLife;
        void main() {
          vLife = aData.x;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aData.y * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          // Tiny elongated body + soft wing blur
          float body = 1.0 - smoothstep(0.15, 0.55, length(p * vec2(1.8, 1.0)));
          float wing = 1.0 - smoothstep(0.2, 0.85, length(p * vec2(0.7, 1.6)));
          float a = max(body, wing * 0.35) * vLife * 0.9;
          if (a < 0.03) discard;
          gl_FragColor = vec4(mix(uColor, vec3(0.15), wing * 0.3), a);
        }
      `,
    });
    this.flyPoints = new THREE.Points(this.flyGeo, this.flyMat);
    this.flyPoints.renderOrder = 15;
    this.flyPoints.frustumCulled = false;
    this.root.add(this.flyPoints);

    this.addToScene(this.root);
  }

  /** Instant puddle burst when the accident first happens. */
  splash(x: number, z: number) {
    this.releasePuddle();
    if (this.puddle) this.destroyPuddle(this.puddle);
    this.puddle = null;
    this.startPuddle(x, z, 1.15);
    this.stillSec = PUDDLE_STILL_SEC;
    this.stillOriginX = x;
    this.stillOriginZ = z;
    this.points.length = 0;
    this.pushPoint(x, z);
    this.lastSampleX = x;
    this.lastSampleZ = z;
    this.lastX = x;
    this.lastZ = z;
    this.primed = true;
    this.dirty = true;
    // Burst of mist + a few flies on the accident.
    for (let i = 0; i < 18; i++) this.spawnSpark(x, z, true);
    for (let i = 0; i < 5; i++) this.spawnFly(x, z);
  }

  update(dt: number, x: number, z: number, wet: boolean) {
    if (!this.primed) {
      this.lastX = x;
      this.lastZ = z;
      this.lastSampleX = x;
      this.lastSampleZ = z;
      this.stillOriginX = x;
      this.stillOriginZ = z;
      this.primed = true;
    }

    const moved = Math.hypot(x - this.lastX, z - this.lastZ);
    const speed = moved / Math.max(dt, 1e-4);
    const drift = Math.hypot(x - this.stillOriginX, z - this.stillOriginZ);
    const stationary = speed < STILL_SPEED && drift <= STILL_RADIUS;
    const gy = this.groundYAt(x, z);

    if (wet) {
      if (stationary) {
        this.stillSec += dt;
        this.extendTo(x, z);
        if (this.stillSec >= PUDDLE_STILL_SEC) {
          if (!this.puddle?.growing) {
            if (this.puddle) this.destroyPuddle(this.puddle);
            this.puddle = null;
            this.startPuddle(x, z, PUDDLE_START_RADIUS);
          } else {
            this.puddle.mesh.position.set(x, gy, z);
            this.puddle.glow.position.set(x, gy - 0.02, z);
            this.puddle.radius = Math.min(
              PUDDLE_MAX_SCALE,
              this.puddle.radius + PUDDLE_GROW_PER_SEC * dt,
            );
            this.puddle.mesh.scale.set(
              this.puddle.radius * 1.25,
              this.puddle.radius,
              1,
            );
            this.puddle.glow.scale.set(
              this.puddle.radius * 2.1,
              this.puddle.radius * 1.7,
              1,
            );
            this.puddle.age = 0;
          }
        }
      } else {
        this.stillSec = 0;
        this.stillOriginX = x;
        this.stillOriginZ = z;
        this.releasePuddle();
        this.extendTo(x, z);
      }
    } else {
      this.stillSec = 0;
      this.stillOriginX = x;
      this.stillOriginZ = z;
      this.releasePuddle();
    }

    this.lastX = x;
    this.lastZ = z;
    this.ageTrail(dt);
    this.updateParticles(dt, wet);
    if (this.dirty) this.rebuildRibbon();
  }

  dispose() {
    this.releasePuddle();
    if (this.puddle) this.destroyPuddle(this.puddle);
    this.puddle = null;
    this.clearRibbon();
    this.points.length = 0;
    this.sparks.length = 0;
    this.flies.length = 0;
    this.removeFromScene(this.root);
    this.puddleGeo.dispose();
    this.ribbonMat.dispose();
    this.sparkGeo.dispose();
    this.sparkMat.dispose();
    this.flyGeo.dispose();
    this.flyMat.dispose();
  }

  private extendTo(x: number, z: number) {
    const dist = Math.hypot(x - this.lastSampleX, z - this.lastSampleZ);
    if (this.points.length === 0) {
      this.pushPoint(x, z);
      this.lastSampleX = x;
      this.lastSampleZ = z;
      return;
    }
    if (dist < SAMPLE_SPACING) {
      // Keep the live tip glued to the player so the line never gaps.
      const tip = this.points[this.points.length - 1]!;
      tip.x = x;
      tip.z = z;
      tip.y = this.groundYAt(x, z);
      tip.age = 0;
      this.dirty = true;
      return;
    }
    const steps = Math.min(8, Math.floor(dist / SAMPLE_SPACING));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.pushPoint(
        this.lastSampleX + (x - this.lastSampleX) * t,
        this.lastSampleZ + (z - this.lastSampleZ) * t,
      );
    }
    this.lastSampleX = x;
    this.lastSampleZ = z;
  }

  private pushPoint(x: number, z: number) {
    while (this.points.length >= MAX_POINTS) this.points.shift();
    this.points.push({ x, y: this.groundYAt(x, z), z, age: 0 });
    this.dirty = true;
  }

  private ageTrail(dt: number) {
    if (this.puddle) {
      if (!this.puddle.growing) this.puddle.age += dt;
      const u = Math.min(1, this.puddle.age / FADE_SEC);
      const fade = this.puddle.peak * (1 - u) * (1 - u * 0.35);
      this.puddle.mat.uniforms.uOpacity!.value = fade;
      this.puddle.glowMat.uniforms.uOpacity!.value = fade * 0.55;
      if (u >= 1) {
        this.destroyPuddle(this.puddle);
        this.puddle = null;
      }
    }

    if (this.points.length === 0) return;

    let removed = false;
    for (let i = this.points.length - 1; i >= 0; i--) {
      const p = this.points[i]!;
      p.age += dt;
      if (p.age >= FADE_SEC) {
        this.points.splice(i, 1);
        removed = true;
      }
    }
    // Rebuild so per-point fade stays smooth.
    if (removed || this.points.length > 0) this.dirty = true;
  }

  private updateParticles(dt: number, wet: boolean) {
    const attract = this.attractionPoint();
    const smell = this.smellStrength();

    // Mist / glow droplets along fresh trail + puddle.
    this.sparkSpawnAcc += dt * (wet ? 14 + smell * 18 : smell * 10);
    while (this.sparkSpawnAcc >= 1 && this.sparks.length < MAX_SPARKS) {
      this.sparkSpawnAcc -= 1;
      if (attract) this.spawnSpark(attract.x, attract.z, false);
      else break;
    }
    if (!wet && smell < 0.05) this.sparkSpawnAcc = 0;

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]!;
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.vy += 2.5 * dt;
      s.vx *= 1 - 1.2 * dt;
      s.vz *= 1 - 1.2 * dt;
      if (s.life >= s.maxLife) this.sparks.splice(i, 1);
    }

    // Flies gather when there's something to smell.
    const wantFlies = Math.min(MAX_FLIES, Math.floor(2 + smell * 12));
    this.flySpawnAcc += dt * (smell > 0.08 ? 1.8 + smell * 2.5 : 0);
    while (
      this.flySpawnAcc >= 1 &&
      this.flies.length < wantFlies &&
      attract
    ) {
      this.flySpawnAcc -= 1;
      this.spawnFly(attract.x, attract.z);
    }
    if (smell < 0.05) this.flySpawnAcc = 0;

    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i]!;
      f.life += dt;
      // Drift orbit center toward current attraction (puddle moves with player).
      if (attract) {
        f.cx += (attract.x - f.cx) * Math.min(1, dt * 1.4);
        f.cy += (attract.y + 4.5 - f.cy) * Math.min(1, dt * 2);
        f.cz += (attract.z - f.cz) * Math.min(1, dt * 1.4);
      }
      f.phase += f.speed * dt;
      f.bob += dt * (6 + f.speed * 0.3);
      // Erratic figure-ish orbit
      f.ox = Math.cos(f.phase) * f.radius + Math.sin(f.phase * 2.3) * f.radius * 0.35;
      f.oz = Math.sin(f.phase * 1.15) * f.radius * 0.85;
      if (f.life >= f.maxLife || smell < 0.02) this.flies.splice(i, 1);
    }

    this.writeSparkBuffers();
    this.writeFlyBuffers();
  }

  private attractionPoint(): { x: number; y: number; z: number } | null {
    if (this.puddle) {
      const p = this.puddle.mesh.position;
      return { x: p.x, y: p.y, z: p.z };
    }
    if (this.points.length === 0) return null;
    // Prefer freshest trail segment.
    let best = this.points[this.points.length - 1]!;
    let bestScore = -1;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]!;
      const score = 1 - p.age / FADE_SEC;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return { x: best.x, y: best.y, z: best.z };
  }

  /** 0..1 how “smelly” the current mess is (drives flies / mist). */
  private smellStrength(): number {
    let s = 0;
    if (this.puddle) {
      const u = Math.min(1, this.puddle.age / FADE_SEC);
      const size = this.puddle.radius / PUDDLE_MAX_SCALE;
      s = Math.max(s, (1 - u) * (0.45 + size * 0.55));
    }
    for (const p of this.points) {
      const fade = Math.max(0, 1 - p.age / FADE_SEC);
      s = Math.max(s, fade * 0.55);
    }
    return Math.min(1, s);
  }

  private spawnSpark(x: number, z: number, burst: boolean) {
    if (this.sparks.length >= MAX_SPARKS) return;
    const gy = this.groundYAt(x, z);
    const spread = burst ? 6 : 3.2;
    this.sparks.push({
      x: x + (Math.random() - 0.5) * spread,
      y: gy + 0.4 + Math.random() * (burst ? 3 : 1.6),
      z: z + (Math.random() - 0.5) * spread,
      vx: (Math.random() - 0.5) * (burst ? 8 : 3),
      vy: 1.5 + Math.random() * (burst ? 6 : 3.5),
      vz: (Math.random() - 0.5) * (burst ? 8 : 3),
      life: 0,
      maxLife: 0.55 + Math.random() * 0.9,
      size: 4 + Math.random() * (burst ? 10 : 6),
    });
  }

  private spawnFly(x: number, z: number) {
    if (this.flies.length >= MAX_FLIES) return;
    const gy = this.groundYAt(x, z);
    this.flies.push({
      cx: x + (Math.random() - 0.5) * 4,
      cy: gy + 3.5 + Math.random() * 4,
      cz: z + (Math.random() - 0.5) * 4,
      ox: 0,
      oz: 0,
      phase: Math.random() * Math.PI * 2,
      speed: 3.5 + Math.random() * 5,
      bob: Math.random() * Math.PI * 2,
      radius: 2.5 + Math.random() * 4.5,
      life: 0,
      maxLife: 4 + Math.random() * 6,
    });
  }

  private writeSparkBuffers() {
    const n = this.sparks.length;
    for (let i = 0; i < n; i++) {
      const s = this.sparks[i]!;
      const life01 = 1 - s.life / s.maxLife;
      const pulse = 0.65 + 0.35 * Math.sin(s.life * 14);
      this.sparkPos[i * 3] = s.x;
      this.sparkPos[i * 3 + 1] = s.y;
      this.sparkPos[i * 3 + 2] = s.z;
      this.sparkAttr[i * 2] = life01 * pulse;
      this.sparkAttr[i * 2 + 1] = s.size * (0.7 + life01 * 0.5);
    }
    this.sparkGeo.setDrawRange(0, n);
    const pos = this.sparkGeo.getAttribute("position") as THREE.BufferAttribute;
    const data = this.sparkGeo.getAttribute("aData") as THREE.BufferAttribute;
    pos.needsUpdate = true;
    data.needsUpdate = true;
  }

  private writeFlyBuffers() {
    const n = this.flies.length;
    for (let i = 0; i < n; i++) {
      const f = this.flies[i]!;
      const life01 = Math.min(1, f.life / 0.35) * (1 - Math.max(0, (f.life - (f.maxLife - 0.6)) / 0.6));
      const y = f.cy + Math.sin(f.bob) * 1.1;
      this.flyPos[i * 3] = f.cx + f.ox;
      this.flyPos[i * 3 + 1] = y;
      this.flyPos[i * 3 + 2] = f.cz + f.oz;
      this.flyAttr[i * 2] = Math.max(0, life01);
      this.flyAttr[i * 2 + 1] = 5.5 + Math.sin(f.bob * 2.2) * 1.2;
    }
    this.flyGeo.setDrawRange(0, n);
    const pos = this.flyGeo.getAttribute("position") as THREE.BufferAttribute;
    const data = this.flyGeo.getAttribute("aData") as THREE.BufferAttribute;
    pos.needsUpdate = true;
    data.needsUpdate = true;
  }

  private rebuildRibbon() {
    this.dirty = false;
    if (this.points.length < 2) {
      this.clearRibbon();
      return;
    }

    const n = this.points.length;
    const vertCount = n * 2;
    const positions = new Float32Array(vertCount * 3);
    const alphas = new Float32Array(vertCount);
    const sides = new Float32Array(vertCount);
    const indices = new Uint32Array((n - 1) * 6);

    for (let i = 0; i < n; i++) {
      const p = this.points[i]!;
      const prev = this.points[Math.max(0, i - 1)]!;
      const next = this.points[Math.min(n - 1, i + 1)]!;
      let dx = next.x - prev.x;
      let dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      // Wider near the tip (fresher), taper as it ages.
      const fade = Math.max(0, 1 - p.age / FADE_SEC);
      const halfW = TRAIL_HALF_W * (0.55 + fade * 0.55);
      const px = -dz * halfW;
      const pz = dx * halfW;

      const alpha = 0.72 * fade * fade;

      const iL = i * 2;
      const iR = iL + 1;
      positions[iL * 3] = p.x + px;
      positions[iL * 3 + 1] = p.y;
      positions[iL * 3 + 2] = p.z + pz;
      positions[iR * 3] = p.x - px;
      positions[iR * 3 + 1] = p.y;
      positions[iR * 3 + 2] = p.z - pz;
      alphas[iL] = alpha;
      alphas[iR] = alpha;
      sides[iL] = -1;
      sides[iR] = 1;
    }

    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      const o = i * 6;
      indices[o] = a;
      indices[o + 1] = b;
      indices[o + 2] = c;
      indices[o + 3] = b;
      indices[o + 4] = d;
      indices[o + 5] = c;
    }

    if (!this.ribbonGeo) {
      this.ribbonGeo = new THREE.BufferGeometry();
      this.ribbon = new THREE.Mesh(this.ribbonGeo, this.ribbonMat);
      this.ribbon.renderOrder = 7;
      this.ribbon.frustumCulled = false;
      this.root.add(this.ribbon);
    }

    this.ribbonGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    this.ribbonGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    this.ribbonGeo.setAttribute("aSide", new THREE.BufferAttribute(sides, 1));
    this.ribbonGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    this.ribbonGeo.attributes.position!.needsUpdate = true;
    this.ribbonGeo.attributes.aAlpha!.needsUpdate = true;
    this.ribbonGeo.attributes.aSide!.needsUpdate = true;
    this.ribbonGeo.computeBoundingSphere();
  }

  private clearRibbon() {
    if (this.ribbon) {
      this.root.remove(this.ribbon);
      this.ribbon = null;
    }
    if (this.ribbonGeo) {
      this.ribbonGeo.dispose();
      this.ribbonGeo = null;
    }
  }

  private makePuddleMat(glow: boolean): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      polygonOffset: true,
      polygonOffsetFactor: glow ? -3 : -4,
      polygonOffsetUnits: glow ? -3 : -4,
      uniforms: {
        uColor: { value: glow ? INK_GLOW : INK },
        uColorDeep: { value: INK_DEEP },
        uOpacity: { value: glow ? 0.35 : 0.62 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uColorDeep;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float d = length(p) * 2.0;
          float soft = 1.0 - smoothstep(0.35, 1.0, d);
          float core = 1.0 - smoothstep(0.0, 0.55, d);
          vec3 col = mix(uColorDeep, uColor, core);
          col = mix(col, vec3(1.0, 0.95, 0.75), core * core * 0.35);
          float a = soft * soft * uOpacity;
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
  }

  private startPuddle(x: number, z: number, radius: number) {
    if (this.puddle) this.destroyPuddle(this.puddle);
    const gy = this.groundYAt(x, z);
    const mat = this.makePuddleMat(false);
    const glowMat = this.makePuddleMat(true);
    glowMat.uniforms.uOpacity!.value = 0.34;

    const mesh = new THREE.Mesh(this.puddleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, gy, z);
    mesh.scale.set(radius * 1.25, radius, 1);
    mesh.renderOrder = 12;

    const glow = new THREE.Mesh(this.puddleGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, gy - 0.02, z);
    glow.scale.set(radius * 2.1, radius * 1.7, 1);
    glow.renderOrder = 11;

    this.root.add(glow);
    this.root.add(mesh);
    this.puddle = {
      mesh,
      glow,
      mat,
      glowMat,
      age: 0,
      peak: 0.62,
      growing: true,
      radius,
    };
  }

  private releasePuddle() {
    if (this.puddle) this.puddle.growing = false;
  }

  private destroyPuddle(p: Puddle) {
    this.root.remove(p.mesh);
    this.root.remove(p.glow);
    p.mat.dispose();
    p.glowMat.dispose();
  }
}
