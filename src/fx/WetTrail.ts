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
const TRAIL_HALF_W = 2.4;
/** Just above outdoor path/grass tops (~1.2). */
export const WET_TRAIL_OUTDOOR_Y = 1.4;
/** Just above building floor plinth (PLINTH_H = 2 → top at y=2). */
export const WET_TRAIL_INDOOR_Y = 2.2;
const MAX_POINTS = 220;

type TrailPoint = {
  x: number;
  y: number;
  z: number;
  age: number;
};

type Puddle = {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  peak: number;
  growing: boolean;
  radius: number;
};

export type WetTrailGroundY = (x: number, z: number) => number;

/**
 * Cartoon pee trail: a continuous ground ribbon while walking, a growing
 * puddle while still. Ink fades out over ~10s; depositing stops after a shower.
 * Ground height is sampled per point so the trail rides outdoor turf and
 * indoor building floors alike.
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

  constructor(
    addToScene: (obj: THREE.Object3D) => void,
    removeFromScene: (obj: THREE.Object3D) => void,
    groundYAt: WetTrailGroundY = () => WET_TRAIL_OUTDOOR_Y,
  ) {
    this.addToScene = addToScene;
    this.removeFromScene = removeFromScene;
    this.groundYAt = groundYAt;
    this.root.name = "wet_trail";
    this.puddleGeo = new THREE.CircleGeometry(1, 22);
    const ink = new THREE.Color(Palette.sunflower);
    this.ribbonMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uColor: { value: ink },
      },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          if (vAlpha < 0.02) discard;
          gl_FragColor = vec4(uColor, vAlpha);
        }
      `,
    });
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
            this.puddle.radius = Math.min(
              PUDDLE_MAX_SCALE,
              this.puddle.radius + PUDDLE_GROW_PER_SEC * dt,
            );
            this.puddle.mesh.scale.set(
              this.puddle.radius * 1.2,
              this.puddle.radius,
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
    if (this.dirty) this.rebuildRibbon();
  }

  dispose() {
    this.releasePuddle();
    if (this.puddle) this.destroyPuddle(this.puddle);
    this.puddle = null;
    this.clearRibbon();
    this.points.length = 0;
    this.removeFromScene(this.root);
    this.puddleGeo.dispose();
    this.ribbonMat.dispose();
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
      this.puddle.mat.opacity = this.puddle.peak * (1 - u) * (1 - u * 0.35);
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
      // Perpendicular on XZ for a flat ground ribbon.
      const px = -dz * TRAIL_HALF_W;
      const pz = dx * TRAIL_HALF_W;

      const fade = Math.max(0, 1 - p.age / FADE_SEC);
      const alpha = 0.58 * fade * fade;

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
    this.ribbonGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    this.ribbonGeo.attributes.position!.needsUpdate = true;
    this.ribbonGeo.attributes.aAlpha!.needsUpdate = true;
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

  private startPuddle(x: number, z: number, radius: number) {
    if (this.puddle) this.destroyPuddle(this.puddle);
    const mat = new THREE.MeshBasicMaterial({
      color: Palette.sunflower,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(this.puddleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, this.groundYAt(x, z), z);
    mesh.scale.set(radius * 1.2, radius, 1);
    mesh.renderOrder = 12;
    this.root.add(mesh);
    this.puddle = {
      mesh,
      mat,
      age: 0,
      peak: 0.58,
      growing: true,
      radius,
    };
  }

  private releasePuddle() {
    if (this.puddle) this.puddle.growing = false;
  }

  private destroyPuddle(p: Puddle) {
    this.root.remove(p.mesh);
    p.mat.dispose();
  }
}
