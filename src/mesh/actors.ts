import * as THREE from "three";
import type { PlayerLook } from "../data/character";
import type { Dir } from "../data/types";
import { Palette } from "../game/palette";
import { AssetLibrary } from "../render/AssetLibrary";
import { applyTints } from "../render/tint";
import { addOutline } from "../render/outline";
import { mat } from "./materials";

/** Short chat-outcome flourishes for ambient (and other) talk. */
export type ActorReaction = "vibrate" | "pop" | "jump";

/** Bed / wake poses for the new-game intro (and reusable elsewhere). */
export type ActorPose = "lie" | "sit" | "stand";

export interface ActorHandle {
  root: THREE.Group;
  setPosition(x: number, z: number): void;
  getPosition(): { x: number; z: number };
  setFacing(dir: Dir): void;
  setWalking(walking: boolean): void;
  /** One-shot silly body reaction (shake / squash-pop / hop). */
  playReaction(kind: ActorReaction): void;
  /** Snap body into a bed/stand pose (overrides walk/idle until stand). */
  setPose(pose: ActorPose): void;
  /** Arms-out stretch, ~0.9s. */
  playStretch(): void;
  /** Brief head tilt / mouth yawn, ~0.7s. */
  playYawn(): void;
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

function scaleForLook(look: PlayerLook): { y: number; xz: number } {
  const y = look.height === "short" ? 0.86 : look.height === "tall" ? 1.14 : 1;
  const xz = look.build === "slim" ? 0.9 : look.build === "stocky" ? 1.14 : 1;
  return { y, xz };
}

/**
 * Bed pose targets (actorBody-local, before root scale 1.2).
 * Mattress top is ~9; after Rx(-90°) the back hangs ~6 below the
 * feet-pivot, so Y must clear that. Z slides toward the foot so the head
 * rests on the pillow instead of clipping through the headboard.
 */
const LIE_Y = 14.2;
const LIE_Z = 18;
const SIT_Y = 11.5;
const SIT_Z = 6;

function assembleActor(look: PlayerLook): { group: THREE.Group; limbs: Limbs } {
  const group = new THREE.Group();
  group.name = "actorBody";

  const body = AssetLibrary.cloneBody();
  const torso = AssetLibrary.cloneTorso(look.clothing);
  const hair = AssetLibrary.cloneHair(look.hairStyle);

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
    sleeve.userData.noOutline = true;
    arm.add(sleeve);
  }

  applyTints(body, {
    Skin: look.skin,
    Hair: look.hair,
    Shirt: look.shirt,
    Pants: look.pants,
    Accent: look.hair,
  });

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
  let x = 0;
  let z = 0;
  let reaction: { kind: ActorReaction; t: number; dur: number } | null = null;
  let pose: ActorPose = "stand";
  let stretchT = 0;
  let stretchDur = 0;
  let yawnT = 0;
  let yawnDur = 0;

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
      // Knees up — shortens the on-bed footprint so feet stay on the mattress.
      limbs.legL.rotation.x = easeToward(limbs.legL.rotation.x, 1.05, dt, 8);
      limbs.legR.rotation.x = easeToward(limbs.legR.rotation.x, 1.0, dt, 8);
      const l = armRest(limbs.armL);
      const r = armRest(limbs.armR);
      limbs.armL.rotation.x = easeToward(limbs.armL.rotation.x, l.x + 0.2, dt, 6);
      limbs.armR.rotation.x = easeToward(limbs.armR.rotation.x, r.x + 0.2, dt, 6);
      limbs.armL.rotation.z = easeToward(limbs.armL.rotation.z, l.z + 0.35, dt, 6);
      limbs.armR.rotation.z = easeToward(limbs.armR.rotation.z, r.z - 0.35, dt, 6);
    } else if (pose === "sit") {
      body.rotation.x = easeToward(body.rotation.x, -0.28, dt, 7);
      body.position.y = easeToward(body.position.y, SIT_Y, dt, 7);
      body.position.z = easeToward(body.position.z, SIT_Z, dt, 7);
      body.position.x = easeToward(body.position.x, 0, dt, 8);
      body.rotation.z = easeToward(body.rotation.z, 0, dt, 8);
      applyBodyScale(1, 1, 1);
      limbs.legL.rotation.x = easeToward(limbs.legL.rotation.x, -0.95, dt, 8);
      limbs.legR.rotation.x = easeToward(limbs.legR.rotation.x, -0.95, dt, 8);

      const l = armRest(limbs.armL);
      const r = armRest(limbs.armR);
      const armOut = stretchU * 1.1;
      limbs.armL.rotation.x = easeToward(
        limbs.armL.rotation.x,
        l.x - 0.4 - stretchU * 0.6,
        dt,
        10,
      );
      limbs.armR.rotation.x = easeToward(
        limbs.armR.rotation.x,
        r.x - 0.4 - stretchU * 0.6,
        dt,
        10,
      );
      limbs.armL.rotation.z = easeToward(
        limbs.armL.rotation.z,
        l.z + 0.55 + armOut,
        dt,
        10,
      );
      limbs.armR.rotation.z = easeToward(
        limbs.armR.rotation.z,
        r.z - 0.55 - armOut,
        dt,
        10,
      );

      const head = headNode();
      if (head) {
        head.rotation.x = easeToward(head.rotation.x, -0.15 - yawnU * 0.55, dt, 10);
        head.scale.y = easeToward(head.scale.y, 1 + yawnU * 0.08, dt, 10);
      }
    }

    if (!stretching && stretchDur > 0) {
      stretchDur = 0;
      stretchT = 0;
    }
    if (!yawning && yawnDur > 0) {
      yawnDur = 0;
      yawnT = 0;
      const head = headNode();
      if (head) {
        head.rotation.x = easeToward(head.rotation.x, 0, dt, 8);
        head.scale.y = easeToward(head.scale.y, 1, dt, 8);
      }
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
    setPose(next) {
      pose = next;
      if (next === "lie") {
        // Snap onto the mattress — easing from stand would clip through the bed.
        body.rotation.x = -Math.PI / 2;
        body.rotation.z = 0;
        body.position.set(0, LIE_Y, LIE_Z);
        limbs.legL.rotation.x = 1.05;
        limbs.legR.rotation.x = 1.0;
      } else if (next === "sit") {
        // Soft settle from lie is fine; keep Z on the mattress.
        body.position.z = SIT_Z;
      } else if (next === "stand") {
        stretchDur = 0;
        stretchT = 0;
        yawnDur = 0;
        yawnT = 0;
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
    playStretch() {
      stretchT = 0;
      stretchDur = 0.9;
    },
    playYawn() {
      yawnT = 0;
      yawnDur = 0.7;
    },
    update(dt) {
      yaw = dampAngle(yaw, yawTarget, 14, dt);
      body.rotation.y = yaw;

      if (pose !== "stand") {
        applyPoseTransforms(dt);
        return;
      }

      // Ease out of sit/lie residual tilt / bed offset when returning to stand.
      body.rotation.x = easeToward(body.rotation.x, 0, dt, 10);
      body.position.y = easeToward(body.position.y, 0, dt, 10);
      body.position.z = easeToward(body.position.z, 0, dt, 10);
      const head = headNode();
      if (head) {
        head.rotation.x = easeToward(head.rotation.x, 0, dt, 10);
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
          body.position.y = hop * 0.48;
          body.rotation.z = Math.sin(u * Math.PI * 2) * 0.06;
          // Squash on launch, stretch in air
          const squash = u < 0.2 ? 1 - u * 0.6 : 1 + hop * 0.12;
          const stretchAmt = u < 0.2 ? 1 + u * 0.5 : 1 - hop * 0.08;
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
        return;
      }

      if (stride) {
        bob += dt * 8;
        const swing = Math.sin(bob);
        body.position.x = easeToward(body.position.x, 0, dt, 14);
        body.position.y = easeToward(body.position.y, 0, dt, 14);
        body.rotation.z = easeToward(body.rotation.z, 0, dt, 14);
        applyBodyScale(1, 1, 1);
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
        body.position.x = easeToward(body.position.x, 0, dt, 8);
        body.position.y = easeToward(body.position.y, 0, dt, 8);
        body.rotation.z = easeToward(body.rotation.z, 0, dt, 8);
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
      built = assembleActor(newLook);
      body = built.group;
      limbs = built.limbs;
      lookScale = scaleForLook(newLook);
      body.rotation.y = yaw;
      reaction = null;
      pose = "stand";
      stretchDur = 0;
      yawnDur = 0;
      root.add(body);
    },
    dispose() {
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
