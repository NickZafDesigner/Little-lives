/**
 * Skill-based work mini-games: timing combo, memory sequence, steady hold.
 */

export type MiniKind = "timing" | "sequence" | "hold";
export type MiniGrade = "perfect" | "ok" | "miss";

export function gradeScore(grade: MiniGrade): number {
  if (grade === "perfect") return 1;
  if (grade === "ok") return 0.55;
  return 0.15;
}

export class WorkMinigame {
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private stage: HTMLElement;
  private hintEl: HTMLElement;
  private open = false;
  private kind: MiniKind = "timing";
  private onDone: ((grade: MiniGrade) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private pointerDown: ((e: PointerEvent) => void) | null = null;
  private pointerUp: ((e: PointerEvent) => void) | null = null;
  private raf = 0;
  private lastMs = 0;
  private bornMs = 0;
  private resolved = false;

  // timing
  private marker = 0;
  private dir = 1;
  private speed = 1.8;
  private zoneCenter = 0.5;
  private zoneHalf = 0.055;
  private hitsNeeded = 3;
  private hitsLanded = 0;
  private missHits = 0;
  private timingSum = 0;
  private cooldownUntil = 0;

  // sequence (Simon memory)
  private pattern: number[] = [];
  private inputIdx = 0;
  private seqPhase: "watch" | "play" = "watch";
  private seqMistakes = 0;
  private flashTimer = 0;
  private flashStep = 0;
  private flashOn = false;

  // hold (steady in moving zone)
  private needle = 0.2;
  private holding = false;
  private zonePos = 0.55;
  private zoneVel = 0.35;
  private inZoneAcc = 0;
  private outZoneAcc = 0;
  private needSteady = 1.65;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "ll-work-mini";
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="ll-work-mini-card">
        <p class="ll-work-mini-title"></p>
        <div class="ll-work-mini-stage"></div>
        <p class="ll-work-mini-hint"></p>
      </div>
    `;
    this.titleEl = this.root.querySelector(".ll-work-mini-title") as HTMLElement;
    this.stage = this.root.querySelector(".ll-work-mini-stage") as HTMLElement;
    this.hintEl = this.root.querySelector(".ll-work-mini-hint") as HTMLElement;
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  play(kind: MiniKind, label: string, onDone: (grade: MiniGrade) => void) {
    this.close();
    this.kind = kind;
    this.onDone = onDone;
    this.open = true;
    this.resolved = false;
    this.lastMs = performance.now();
    this.bornMs = this.lastMs;
    this.marker = Math.random() < 0.5 ? 0.05 : 0.95;
    this.dir = this.marker < 0.5 ? 1 : -1;
    this.speed = 1.2 + Math.random() * 0.2;
    this.zoneCenter = 0.32 + Math.random() * 0.36;
    this.zoneHalf = 0.09;
    this.hitsNeeded = 2;
    this.hitsLanded = 0;
    this.missHits = 0;
    this.timingSum = 0;
    this.cooldownUntil = 0;
    this.pattern = this.makePattern(4);
    this.inputIdx = 0;
    this.seqPhase = "watch";
    this.seqMistakes = 0;
    this.flashTimer = 0.55;
    this.flashStep = 0;
    this.flashOn = false;
    this.needle = 0.2 + Math.random() * 0.15;
    this.holding = false;
    this.zonePos = 0.45 + Math.random() * 0.2;
    this.zoneVel = (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.1);
    this.inZoneAcc = 0;
    this.outZoneAcc = 0;
    this.needSteady = 1.35;
    this.titleEl.textContent = label;
    this.root.hidden = false;
    this.root.classList.remove("is-out", "is-perfect", "is-ok", "is-miss");
    void this.root.offsetWidth;
    this.root.classList.add("is-in");
    this.buildStage();
    this.bindInput();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.close();
    this.root.remove();
  }

  private makePattern(len: number): number[] {
    const out: number[] = [];
    let last = -1;
    for (let i = 0; i < len; i++) {
      let n = Math.floor(Math.random() * 4);
      if (n === last) n = (n + 1 + Math.floor(Math.random() * 3)) % 4;
      out.push(n);
      last = n;
    }
    return out;
  }

  private buildStage() {
    if (this.kind === "timing") {
      this.hintEl.textContent = `Hit the green ${this.hitsNeeded} times — Space / click`;
      this.stage.innerHTML = `
        <div class="ll-mini-timing">
          <div class="ll-mini-combo"><span class="ll-mini-combo-n">0</span>/${this.hitsNeeded}</div>
          <div class="ll-mini-track">
            <span class="ll-mini-zone"></span>
            <span class="ll-mini-marker"></span>
          </div>
        </div>
      `;
      this.layoutTimingZone();
    } else if (this.kind === "sequence") {
      this.hintEl.textContent = "Watch the pattern, then repeat it";
      this.stage.innerHTML = `
        <div class="ll-mini-seq">
          <button type="button" class="ll-mini-pip" data-i="0"></button>
          <button type="button" class="ll-mini-pip" data-i="1"></button>
          <button type="button" class="ll-mini-pip" data-i="2"></button>
          <button type="button" class="ll-mini-pip" data-i="3"></button>
        </div>
      `;
      this.stage.querySelectorAll(".ll-mini-pip").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const i = Number((btn as HTMLElement).dataset.i);
          this.onSeqTap(i);
        });
      });
      this.setSeqInteractive(false);
    } else {
      this.hintEl.textContent = "Hold / release to keep the needle in the band";
      this.stage.innerHTML = `
        <div class="ll-mini-hold">
          <div class="ll-mini-steady">
            <span class="ll-mini-steady-zone"></span>
            <span class="ll-mini-steady-needle"></span>
          </div>
          <div class="ll-mini-steady-meter"><i></i></div>
        </div>
      `;
      this.layoutSteady();
    }
  }

  private layoutTimingZone() {
    const zone = this.stage.querySelector(".ll-mini-zone") as HTMLElement | null;
    if (!zone) return;
    const left = (this.zoneCenter - this.zoneHalf) * 100;
    const width = this.zoneHalf * 2 * 100;
    zone.style.left = `${left}%`;
    zone.style.width = `${width}%`;
  }

  private layoutSteady() {
    const zone = this.stage.querySelector(
      ".ll-mini-steady-zone",
    ) as HTMLElement | null;
    const needle = this.stage.querySelector(
      ".ll-mini-steady-needle",
    ) as HTMLElement | null;
    const fill = this.stage.querySelector(
      ".ll-mini-steady-meter i",
    ) as HTMLElement | null;
    if (zone) {
      const half = 0.14;
      zone.style.bottom = `${(this.zonePos - half) * 100}%`;
      zone.style.height = `${half * 2 * 100}%`;
    }
    if (needle) needle.style.bottom = `${this.needle * 100}%`;
    if (fill) {
      const u = Math.min(1, this.inZoneAcc / this.needSteady);
      fill.style.width = `${u * 100}%`;
    }
  }

  private setSeqInteractive(on: boolean) {
    this.stage.querySelectorAll(".ll-mini-pip").forEach((el) => {
      (el as HTMLButtonElement).disabled = !on;
      el.classList.toggle("is-locked", !on);
    });
  }

  private clearSeqFlash() {
    this.stage.querySelectorAll(".ll-mini-pip").forEach((el) => {
      el.classList.remove("is-on", "is-flash");
    });
  }

  private flashPip(i: number, on: boolean) {
    const el = this.stage.querySelector(`[data-i="${i}"]`);
    el?.classList.toggle("is-flash", on);
    el?.classList.toggle("is-on", on);
  }

  private onSeqTap(i: number) {
    if (this.resolved || this.kind !== "sequence") return;
    if (this.seqPhase !== "play") return;
    const want = this.pattern[this.inputIdx];
    if (i === want) {
      this.inputIdx += 1;
      const el = this.stage.querySelector(`[data-i="${i}"]`);
      el?.classList.add("is-done");
      window.setTimeout(() => el?.classList.remove("is-done"), 160);
      if (this.inputIdx >= this.pattern.length) {
        const grade: MiniGrade =
          this.seqMistakes === 0
            ? "perfect"
            : this.seqMistakes <= 2
              ? "ok"
              : "miss";
        this.resolve(grade);
      }
    } else {
      this.seqMistakes += 1;
      (this.stage.querySelector(`[data-i="${i}"]`) as HTMLElement)?.classList.add(
        "is-miss",
      );
      window.setTimeout(() => {
        this.stage
          .querySelector(`[data-i="${i}"]`)
          ?.classList.remove("is-miss");
      }, 180);
      this.inputIdx = 0;
      this.hintEl.textContent =
        this.seqMistakes >= 3
          ? "One more miss and it's a wash…"
          : "Wrong — start the pattern again!";
      if (this.seqMistakes >= 4) {
        this.resolve("miss");
      }
    }
  }

  private bindInput() {
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.open || this.resolved) return;
      if (e.code !== "Space" && e.code !== "Enter") return;
      e.preventDefault();
      if (e.repeat) return;
      if (this.kind === "timing") this.hitTiming();
      if (this.kind === "hold") this.holding = true;
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") this.holding = false;
    };
    this.pointerDown = (e: PointerEvent) => {
      if (this.kind === "sequence") return;
      e.preventDefault();
      if (this.kind === "timing") this.hitTiming();
      if (this.kind === "hold") this.holding = true;
    };
    this.pointerUp = () => {
      this.holding = false;
    };
    window.addEventListener("keydown", this.keyHandler);
    window.addEventListener("keyup", this.keyUpHandler);
    this.stage.addEventListener("pointerdown", this.pointerDown);
    window.addEventListener("pointerup", this.pointerUp);
  }

  private unbindInput() {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    if (this.keyUpHandler)
      window.removeEventListener("keyup", this.keyUpHandler);
    if (this.pointerDown)
      this.stage.removeEventListener("pointerdown", this.pointerDown);
    if (this.pointerUp) window.removeEventListener("pointerup", this.pointerUp);
    this.keyHandler = null;
    this.keyUpHandler = null;
    this.pointerDown = null;
    this.pointerUp = null;
  }

  private hitTiming() {
    if (this.resolved || this.kind !== "timing") return;
    const now = performance.now();
    if (now < this.cooldownUntil) return;
    const dist = Math.abs(this.marker - this.zoneCenter);
    if (dist <= this.zoneHalf * 0.75) {
      this.hitsLanded += 1;
      this.timingSum += 1;
      this.speed = Math.min(1.85, this.speed + 0.1);
      this.zoneCenter = 0.28 + Math.random() * 0.44;
      this.zoneHalf = Math.max(0.065, this.zoneHalf - 0.008);
      this.layoutTimingZone();
      this.cooldownUntil = now + 180;
      const n = this.stage.querySelector(".ll-mini-combo-n");
      if (n) n.textContent = String(this.hitsLanded);
      this.hintEl.textContent =
        this.hitsLanded >= this.hitsNeeded
          ? "Nailed it!"
          : `Nice! ${this.hitsNeeded - this.hitsLanded} more`;
      if (this.hitsLanded >= this.hitsNeeded) {
        const avg = this.timingSum / this.hitsNeeded;
        const grade: MiniGrade =
          this.missHits === 0 && avg >= 0.9
            ? "perfect"
            : this.missHits <= 2
              ? "ok"
              : "miss";
        this.resolve(grade);
      }
    } else if (dist <= this.zoneHalf * 1.45) {
      this.hitsLanded += 1;
      this.timingSum += 0.55;
      this.speed = Math.min(1.75, this.speed + 0.06);
      this.zoneCenter = 0.28 + Math.random() * 0.44;
      this.layoutTimingZone();
      this.cooldownUntil = now + 180;
      const n = this.stage.querySelector(".ll-mini-combo-n");
      if (n) n.textContent = String(this.hitsLanded);
      this.hintEl.textContent = "OK hit — tighten up!";
      if (this.hitsLanded >= this.hitsNeeded) {
        this.resolve("ok");
      }
    } else {
      this.missHits += 1;
      this.cooldownUntil = now + 220;
      this.hintEl.textContent = "Miss! Wait for the green";
      this.root.classList.add("is-shake");
      window.setTimeout(() => this.root.classList.remove("is-shake"), 180);
      if (this.missHits >= 4) this.resolve("miss");
    }
  }

  private frame = (now: number) => {
    if (!this.open || this.resolved) return;
    const dt = Math.min(0.05, (now - this.lastMs) / 1000);
    this.lastMs = now;

    if (this.kind === "timing") {
      this.marker += this.dir * dt * this.speed;
      if (this.marker >= 1) {
        this.marker = 1;
        this.dir = -1;
      } else if (this.marker <= 0) {
        this.marker = 0;
        this.dir = 1;
      }
      const m = this.stage.querySelector(".ll-mini-marker") as HTMLElement | null;
      if (m) m.style.left = `${this.marker * 100}%`;
      if (now - this.bornMs > 12000) {
        this.resolve(this.hitsLanded >= 1 ? "ok" : "miss");
        return;
      }
    } else if (this.kind === "sequence") {
      if (this.seqPhase === "watch") {
        this.flashTimer -= dt;
        if (this.flashTimer <= 0) {
          if (this.flashOn) {
            this.clearSeqFlash();
            this.flashOn = false;
            this.flashStep += 1;
            if (this.flashStep >= this.pattern.length) {
              this.seqPhase = "play";
              this.setSeqInteractive(true);
              this.hintEl.textContent = "Your turn — tap the pattern";
            } else {
              this.flashTimer = 0.22;
            }
          } else if (this.flashStep >= this.pattern.length) {
            this.seqPhase = "play";
            this.setSeqInteractive(true);
            this.hintEl.textContent = "Your turn — tap the pattern";
          } else {
            this.flashPip(this.pattern[this.flashStep]!, true);
            this.flashOn = true;
            this.flashTimer = 0.5;
          }
        }
      }
      if (now - this.bornMs > 16000) {
        this.resolve(this.inputIdx >= 2 ? "ok" : "miss");
        return;
      }
    } else if (this.kind === "hold") {
      // Needle rises while held, drifts down otherwise; zone wanders.
      this.zonePos += this.zoneVel * dt;
      if (this.zonePos > 0.8) {
        this.zonePos = 0.8;
        this.zoneVel = -Math.abs(this.zoneVel);
      } else if (this.zonePos < 0.24) {
        this.zonePos = 0.24;
        this.zoneVel = Math.abs(this.zoneVel);
      }
      if (Math.random() < dt * 0.2) {
        this.zoneVel += (Math.random() - 0.5) * 0.12;
        this.zoneVel = Math.max(-0.38, Math.min(0.38, this.zoneVel));
      }
      if (this.holding) this.needle += dt * 0.48;
      else this.needle -= dt * 0.36;
      this.needle = Math.max(0.02, Math.min(0.98, this.needle));
      const half = 0.14;
      const inZone =
        this.needle >= this.zonePos - half && this.needle <= this.zonePos + half;
      if (inZone) this.inZoneAcc += dt;
      else this.outZoneAcc += dt;
      this.layoutSteady();
      const u = Math.min(1, this.inZoneAcc / this.needSteady);
      this.hintEl.textContent =
        u >= 1
          ? "Steady hands!"
          : this.holding
            ? "Holding… ease off if you overshoot"
            : "Hold to rise · release to drop";
      if (this.inZoneAcc >= this.needSteady) {
        const ratio = this.inZoneAcc / (this.inZoneAcc + this.outZoneAcc);
        const grade: MiniGrade =
          ratio >= 0.62 && this.outZoneAcc < 1.6
            ? "perfect"
            : ratio >= 0.4
              ? "ok"
              : "miss";
        this.resolve(grade);
        return;
      }
      if (now - this.bornMs > 10000) {
        this.resolve(this.inZoneAcc >= this.needSteady * 0.45 ? "ok" : "miss");
        return;
      }
    }

    this.raf = requestAnimationFrame(this.frame);
  };

  private resolve(grade: MiniGrade) {
    if (this.resolved) return;
    this.resolved = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbindInput();
    this.hintEl.textContent =
      grade === "perfect"
        ? "Perfect!"
        : grade === "ok"
          ? "Good enough!"
          : "Rough shift…";
    this.root.classList.add(`is-${grade}`);
    const done = this.onDone;
    window.setTimeout(() => {
      this.close();
      done?.(grade);
    }, 420);
  }

  private close() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbindInput();
    this.open = false;
    this.onDone = null;
    this.holding = false;
    this.root.classList.remove("is-in", "is-shake");
    this.root.classList.add("is-out");
    this.root.hidden = true;
  }
}
