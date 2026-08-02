/**
 * Playground mini-games: swing pump rhythm + slide chute timing.
 */

import { Audio } from "../audio/AudioManager";

export type PlayMiniKind = "swing" | "slide";
export type PlayMiniGrade = "perfect" | "ok" | "miss";

const RESULT_HOLD_MS = 950;
const GRADE_LABEL: Record<PlayMiniGrade, string> = {
  perfect: "PERFECT!",
  ok: "WHEE!",
  miss: "OOF…",
};

export class PlayMinigame {
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private stage: HTMLElement;
  private hintEl: HTMLElement;
  private resultEl: HTMLElement;
  private resultGradeEl: HTMLElement;
  private open = false;
  private kind: PlayMiniKind = "swing";
  private onDone: ((grade: PlayMiniGrade) => void) | null = null;
  /** Fires as soon as the grade is known (during the result flash). */
  private onGrade: ((grade: PlayMiniGrade) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private pointerDown: ((e: PointerEvent) => void) | null = null;
  private raf = 0;
  private lastMs = 0;
  private bornMs = 0;
  private resolved = false;

  // swing - pendulum pump rhythm
  private angle = 0;
  private angVel = 1.85;
  private height = 0.12;
  private pumpsNeeded = 5;
  private pumpsLanded = 0;
  private pumpScores: number[] = [];
  private cooldownUntil = 0;
  private beatHalf = 0.14;

  // slide - one-shot chute timing
  private marker = 0;
  private dir = 1;
  private speed = 1.35;
  private zoneCenter = 0.72;
  private zoneHalf = 0.08;
  private slideDone = false;
  private enterTimer = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-play-mini";
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="ll-play-mini-card">
        <p class="ll-play-mini-kicker">Playtime</p>
        <p class="ll-play-mini-title"></p>
        <div class="ll-play-mini-stage"></div>
        <p class="ll-play-mini-hint"></p>
        <div class="ll-mini-result" hidden>
          <span class="ll-mini-result-burst" aria-hidden="true"></span>
          <span class="ll-mini-result-grade"></span>
        </div>
      </div>
    `;
    this.titleEl = this.root.querySelector(".ll-play-mini-title") as HTMLElement;
    this.stage = this.root.querySelector(".ll-play-mini-stage") as HTMLElement;
    this.hintEl = this.root.querySelector(".ll-play-mini-hint") as HTMLElement;
    this.resultEl = this.root.querySelector(".ll-mini-result") as HTMLElement;
    this.resultGradeEl = this.root.querySelector(
      ".ll-mini-result-grade",
    ) as HTMLElement;
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  play(
    kind: PlayMiniKind,
    label: string,
    onDone: (grade: PlayMiniGrade) => void,
    onGrade?: (grade: PlayMiniGrade) => void,
  ) {
    this.close();
    this.kind = kind;
    this.onDone = onDone;
    this.onGrade = onGrade ?? null;
    this.open = true;
    this.resolved = false;
    this.lastMs = performance.now();
    this.bornMs = this.lastMs;
    this.angle = 0;
    this.angVel = 1.7 + Math.random() * 0.25;
    this.height = 0.12;
    this.pumpsNeeded = 5;
    this.pumpsLanded = 0;
    this.pumpScores = [];
    this.cooldownUntil = 0;
    this.beatHalf = 0.14;
    this.marker = Math.random() < 0.5 ? 0.05 : 0.12;
    this.dir = 1;
    this.speed = 1.25 + Math.random() * 0.25;
    this.zoneCenter = 0.62 + Math.random() * 0.18;
    this.zoneHalf = 0.075;
    this.slideDone = false;
    this.titleEl.textContent = label;
    this.resultEl.hidden = true;
    this.resultEl.classList.remove("is-perfect", "is-ok", "is-miss");
    this.root.hidden = false;
    this.root.classList.remove(
      "is-out",
      "is-open",
      "is-in",
      "is-enter",
      "is-perfect",
      "is-ok",
      "is-miss",
      "is-hit",
      "is-perfect-hit",
    );
    void this.root.offsetWidth;
    this.root.classList.add("is-open", "is-in", "is-enter");
    if (this.enterTimer) window.clearTimeout(this.enterTimer);
    this.enterTimer = window.setTimeout(() => {
      this.enterTimer = 0;
      this.root.classList.remove("is-in", "is-enter");
    }, 450);
    this.buildStage();
    this.bindInput();
    Audio.sfx("mini_start");
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.close();
    this.root.remove();
  }

  private buildStage() {
    if (this.kind === "swing") {
      this.hintEl.textContent = "Tap on the beat to pump higher · Space / click";
      this.stage.innerHTML = `
        <div class="ll-play-swing">
          <div class="ll-play-swing-meter">
            <i style="height: ${this.height * 100}%"></i>
          </div>
          <div class="ll-play-swing-frame">
            <div class="ll-play-swing-arc">
              <span class="ll-play-swing-zone is-left"></span>
              <span class="ll-play-swing-zone is-right"></span>
              <span class="ll-play-swing-bob"></span>
              <span class="ll-mini-hit-ring" aria-hidden="true"></span>
            </div>
          </div>
          <div class="ll-play-swing-count">
            <span class="ll-play-swing-n">0</span>
            <span class="ll-play-swing-slash">/</span>
            ${this.pumpsNeeded}
          </div>
        </div>
      `;
      this.layoutSwing();
    } else {
      this.hintEl.textContent = "Hit the green whoosh zone · Space / click";
      this.stage.innerHTML = `
        <div class="ll-play-slide">
          <div class="ll-play-slide-chute">
            <span class="ll-play-slide-zone"></span>
            <span class="ll-play-slide-marker"></span>
            <span class="ll-mini-hit-ring" aria-hidden="true"></span>
          </div>
          <div class="ll-play-slide-label">WHOOSH</div>
        </div>
      `;
      this.layoutSlide();
    }
  }

  private layoutSwing() {
    const bob = this.stage.querySelector(".ll-play-swing-bob") as HTMLElement | null;
    const leftZ = this.stage.querySelector(
      ".ll-play-swing-zone.is-left",
    ) as HTMLElement | null;
    const rightZ = this.stage.querySelector(
      ".ll-play-swing-zone.is-right",
    ) as HTMLElement | null;
    const fill = this.stage.querySelector(
      ".ll-play-swing-meter i",
    ) as HTMLElement | null;
    // angle in [-1, 1] mapped across the arc
    const u = (this.angle + 1) / 2;
    if (bob) bob.style.left = `${u * 100}%`;
    const w = this.beatHalf * 100;
    if (leftZ) {
      leftZ.style.left = `0%`;
      leftZ.style.width = `${w}%`;
    }
    if (rightZ) {
      rightZ.style.left = `${100 - w}%`;
      rightZ.style.width = `${w}%`;
    }
    if (fill) fill.style.height = `${Math.min(100, this.height * 100)}%`;
  }

  private layoutSlide() {
    const zone = this.stage.querySelector(
      ".ll-play-slide-zone",
    ) as HTMLElement | null;
    const marker = this.stage.querySelector(
      ".ll-play-slide-marker",
    ) as HTMLElement | null;
    if (zone) {
      zone.style.left = `${(this.zoneCenter - this.zoneHalf) * 100}%`;
      zone.style.width = `${this.zoneHalf * 2 * 100}%`;
    }
    if (marker) marker.style.left = `${this.marker * 100}%`;
  }

  private pulseHit(perfect: boolean) {
    this.root.classList.remove("is-hit", "is-perfect-hit");
    void this.root.offsetWidth;
    this.root.classList.add(perfect ? "is-perfect-hit" : "is-hit");
    const ring = this.stage.querySelector(".ll-mini-hit-ring");
    if (ring) {
      ring.classList.remove("is-pop");
      void (ring as HTMLElement).offsetWidth;
      ring.classList.add("is-pop");
    }
    window.setTimeout(() => {
      this.root.classList.remove("is-hit", "is-perfect-hit");
    }, 280);
  }

  private bindInput() {
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.open || this.resolved) return;
      if (e.code !== "Space" && e.code !== "Enter") return;
      e.preventDefault();
      if (e.repeat) return;
      this.tap();
    };
    this.pointerDown = (e: PointerEvent) => {
      e.preventDefault();
      this.tap();
    };
    window.addEventListener("keydown", this.keyHandler);
    this.stage.addEventListener("pointerdown", this.pointerDown);
  }

  private unbindInput() {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    if (this.pointerDown)
      this.stage.removeEventListener("pointerdown", this.pointerDown);
    this.keyHandler = null;
    this.pointerDown = null;
  }

  private tap() {
    if (this.resolved) return;
    if (this.kind === "swing") this.pumpSwing();
    else this.hitSlide();
  }

  private pumpSwing() {
    const now = performance.now();
    if (now < this.cooldownUntil) return;
    // Score by how close to peak (|angle| near 1)
    const peakness = Math.abs(this.angle);
    let score = 0;
    if (peakness >= 1 - this.beatHalf * 0.55) score = 1;
    else if (peakness >= 1 - this.beatHalf * 1.35) score = 0.55;
    else score = 0.1;

    this.pumpsLanded += 1;
    this.pumpScores.push(score);
    this.cooldownUntil = now + 220;

    if (score >= 0.9) {
      this.height = Math.min(1, this.height + 0.18);
      this.angVel = Math.min(2.6, this.angVel + 0.12);
      this.hintEl.textContent = "Whoosh - higher!";
      Audio.sfx("mini_perfect");
      this.pulseHit(true);
    } else if (score >= 0.5) {
      this.height = Math.min(1, this.height + 0.1);
      this.angVel = Math.min(2.4, this.angVel + 0.06);
      this.hintEl.textContent = "Nice pump!";
      Audio.sfx("mini_hit");
      this.pulseHit(false);
    } else {
      this.height = Math.max(0.08, this.height - 0.04);
      this.hintEl.textContent = "Off-beat - wait for the ends!";
      Audio.sfx("mini_miss");
      this.root.classList.add("is-shake");
      window.setTimeout(() => this.root.classList.remove("is-shake"), 220);
    }

    const n = this.stage.querySelector(".ll-play-swing-n");
    if (n) n.textContent = String(this.pumpsLanded);
    this.layoutSwing();

    if (this.pumpsLanded >= this.pumpsNeeded) {
      const avg =
        this.pumpScores.reduce((a, b) => a + b, 0) / this.pumpScores.length;
      const grade: PlayMiniGrade =
        avg >= 0.85 && this.height >= 0.7
          ? "perfect"
          : avg >= 0.45
            ? "ok"
            : "miss";
      this.resolve(grade);
    }
  }

  private hitSlide() {
    if (this.slideDone) return;
    this.slideDone = true;
    const dist = Math.abs(this.marker - this.zoneCenter);
    let grade: PlayMiniGrade;
    if (dist <= this.zoneHalf * 0.7) grade = "perfect";
    else if (dist <= this.zoneHalf * 1.55) grade = "ok";
    else grade = "miss";
    if (grade === "perfect") this.pulseHit(true);
    else if (grade === "ok") this.pulseHit(false);
    else {
      this.root.classList.add("is-shake");
      window.setTimeout(() => this.root.classList.remove("is-shake"), 220);
    }
    this.resolve(grade);
  }

  private frame = (now: number) => {
    if (!this.open || this.resolved) return;
    const dt = Math.min(0.05, (now - this.lastMs) / 1000);
    this.lastMs = now;

    if (this.kind === "swing") {
      this.angle += this.angVel * dt * (0.85 + this.height * 0.5);
      if (this.angle >= 1) {
        this.angle = 1;
        this.angVel = -Math.abs(this.angVel);
      } else if (this.angle <= -1) {
        this.angle = -1;
        this.angVel = Math.abs(this.angVel);
      }
      this.layoutSwing();
      if (now - this.bornMs > 14000) {
        const avg =
          this.pumpScores.length > 0
            ? this.pumpScores.reduce((a, b) => a + b, 0) /
              this.pumpScores.length
            : 0;
        this.resolve(avg >= 0.5 ? "ok" : "miss");
        return;
      }
    } else {
      this.marker += this.dir * dt * this.speed;
      if (this.marker >= 1) {
        this.marker = 1;
        this.dir = -1;
      } else if (this.marker <= 0) {
        this.marker = 0;
        this.dir = 1;
      }
      this.layoutSlide();
      if (now - this.bornMs > 8000) {
        this.resolve("miss");
        return;
      }
    }

    this.raf = requestAnimationFrame(this.frame);
  };

  private resolve(grade: PlayMiniGrade) {
    if (this.resolved) return;
    this.resolved = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbindInput();
    this.hintEl.textContent =
      grade === "perfect"
        ? this.kind === "swing"
          ? "Highest swing!"
          : "Perfect whoosh!"
        : grade === "ok"
          ? this.kind === "swing"
            ? "Good height!"
            : "Whee!"
          : "Oof - dusty knees.";
    this.root.classList.add(`is-${grade}`);
    this.resultGradeEl.textContent = GRADE_LABEL[grade];
    this.resultEl.classList.add(`is-${grade}`);
    this.resultEl.hidden = false;
    if (grade === "perfect") Audio.sfx("mini_win");
    else if (grade === "ok") Audio.sfx("mini_ok");
    else Audio.sfx("mini_miss");
    this.onGrade?.(grade);
    const done = this.onDone;
    window.setTimeout(() => {
      this.close();
      done?.(grade);
    }, RESULT_HOLD_MS);
  }

  private close() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.enterTimer) {
      window.clearTimeout(this.enterTimer);
      this.enterTimer = 0;
    }
    this.unbindInput();
    this.open = false;
    this.onDone = null;
    this.onGrade = null;
    this.root.classList.remove(
      "is-open",
      "is-in",
      "is-enter",
      "is-shake",
      "is-hit",
      "is-perfect-hit",
    );
    this.root.classList.add("is-out");
    this.root.hidden = true;
  }
}
